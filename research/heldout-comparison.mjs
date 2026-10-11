import { readFile, realpath, stat, lstat, readdir, open } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { checkedJson, hash, lf, PREPARATION_MANIFEST_SHA256_LF } from './controlled-input.mjs';
import { parsePeriodDataset } from './period-dataset.ts';
import {
  sourceStrataFromAudit,
  comparePeriodDataset,
  COMPARISON_VERSION,
  BOOTSTRAP,
} from './controlled-comparison.ts';
import { writeResearchBundle } from './research-files.mjs';

export const DEVELOPMENT_REPORT_SHA256_LF =
  'a3e04dcba11e28d9378757a6a9bd920930d33726e3bee0b7a827a69de4d0929d';
const EXECUTION_VERSION = 'zenodo-heldout-execution-v1';
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function requireHeldout(split) {
  if (split !== 'calibration' && split !== 'test')
    throw new Error('Select exactly calibration or test.');
}

async function boundedRead(path) {
  if ((await stat(path)).size > 8 * 1024 * 1024) throw new Error('Research file exceeds 8 MiB.');
  return readFile(path);
}

export async function verifyFrozenHashes(root, hashes) {
  for (const [path, expected] of Object.entries(hashes)) {
    if (hash(lf((await boundedRead(resolve(root, path))).toString('utf8'))) !== expected)
      throw new Error('Frozen implementation differs from the reviewed development receipt.');
  }
}

// This review reads public receipts and code only, never participant records.
export async function reviewHeldoutFreeze(root) {
  const development = checkedJson(
    await boundedRead(resolve(root, 'research/results/zenodo-development-comparison-v1.json')),
    DEVELOPMENT_REPORT_SHA256_LF,
    true,
  );
  const manifest = checkedJson(
    await boundedRead(resolve(root, 'research/manifests/zenodo-preparation-v1.json')),
    PREPARATION_MANIFEST_SHA256_LF,
    true,
  );
  const plan = checkedJson(
    await boundedRead(resolve(root, 'research/protocols/zenodo-period-comparison-v1.json')),
    manifest.planSha256Lf,
    true,
  );
  await verifyFrozenHashes(root, manifest.codeHashesLf);
  await verifyFrozenHashes(root, development.provenance.codeHashesLf);
  if (
    process.version !== development.provenance.nodeVersion ||
    BOOTSTRAP.seed !== plan.uncertainty.seed ||
    BOOTSTRAP.replicates !== plan.uncertainty.replicates
  )
    throw new Error('Runtime or uncertainty settings differ from the frozen development run.');
  const wrapperHashesLf = {};
  for (const path of ['research/heldout-comparison.mjs', 'scripts/compare-zenodo-heldout.mjs'])
    wrapperHashesLf[path] = hash(lf((await boundedRead(resolve(root, path))).toString('utf8')));
  const freeze = {
    version: EXECUTION_VERSION,
    developmentReportSha256Lf: DEVELOPMENT_REPORT_SHA256_LF,
    preparationManifestSha256Lf: PREPARATION_MANIFEST_SHA256_LF,
    planSha256Lf: manifest.planSha256Lf,
    frozenCodeHashesLf: development.provenance.codeHashesLf,
    wrapperHashesLf,
    nodeVersion: process.version,
  };
  return { development, manifest, plan, freeze, freezeId: hash(json(freeze)) };
}

async function loadSelectedRecords(privateRoot, review, split) {
  const readPrivate = async (name) => {
    const path = await realpath(join(privateRoot, 'zenodo-15598359-prepared-v1', name));
    const within = relative(privateRoot, path);
    if (
      isAbsolute(within) ||
      within === '..' ||
      within.startsWith('../') ||
      within.startsWith('..\\')
    )
      throw new Error('Comparison records must remain inside the private research directory.');
    return boundedRead(path);
  };
  const { manifest, plan } = review;
  checkedJson(await readPrivate('manifest.json'), PREPARATION_MANIFEST_SHA256_LF);
  const dataset = parsePeriodDataset(
    checkedJson(await readPrivate(`${split}.json`), manifest.files[`${split}.json`].sha256),
  );
  const audit = checkedJson(
    await readPrivate(`${split}-audit.json`),
    manifest.files[`${split}-audit.json`].sha256,
  );
  if (
    dataset.provenance.kind !== 'external' ||
    dataset.provenance.datasetId !== plan.datasetId ||
    dataset.provenance.sourceSha256 !== plan.sourceSha256 ||
    dataset.participants.length !== manifest.summary.splitCounts[split].participants
  )
    throw new Error('Prepared dataset provenance differs from the fixed plan.');
  return { dataset, strata: sourceStrataFromAudit(dataset, split, audit) };
}

async function infoOrMissing(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function readOrdinary(path) {
  const info = await lstat(path);
  if (info.isSymbolicLink() || !info.isFile())
    throw new Error('Execution receipts must be ordinary files.');
  return boundedRead(path);
}

function parseReceipt(bytes) {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('Invalid execution receipt; no automatic rescore is allowed.');
  }
}

const bundleName = (split) => `zenodo-${split}-comparison-v1`;
const claimPath = (root, split) => join(root, `${bundleName(split)}.started.json`);
const execution = (split, freezeId, prerequisiteReportSha256) => ({
  version: EXECUTION_VERSION,
  split,
  freezeId,
  prerequisiteReportSha256,
});

async function readSaved(root, expected) {
  const output = join(root, bundleName(expected.split));
  const info = await infoOrMissing(output);
  if (!info) return null;
  if (info.isSymbolicLink() || !info.isDirectory())
    throw new Error('Saved comparison must be an ordinary directory.');
  if (!same((await readdir(output)).sort(), ['manifest.json', 'report.json']))
    throw new Error('Saved comparison is incomplete or changed.');
  const claim = parseReceipt(await readOrdinary(claimPath(root, expected.split)));
  const receipt = parseReceipt(await readOrdinary(join(output, 'manifest.json')));
  if (!same(claim, expected) || !same(receipt.execution, expected))
    throw new Error('Saved comparison uses a different execution freeze or prerequisite.');
  const report = checkedJson(await readOrdinary(join(output, 'report.json')), receipt.reportSha256);
  if (!same(report.execution, expected)) throw new Error('Saved report execution does not match.');
  return { status: 'replayed-saved', report, receipt };
}

// The exclusive, synced claim precedes every record read and evaluation. A crash
// leaves the claim in place: recovery requires review, never an automatic rescore.
export async function executeHeldoutOnce(privateRoot, split, freezeId, evaluate) {
  requireHeldout(split);
  if (!/^[a-f0-9]{64}$/.test(freezeId)) throw new Error('Invalid execution freeze.');
  const root = await realpath(privateRoot);
  let prerequisiteReportSha256 = null;
  if (split === 'test') {
    const calibration = await readSaved(root, execution('calibration', freezeId, null));
    if (!calibration) throw new Error('Complete and verify calibration before final-test scoring.');
    prerequisiteReportSha256 = calibration.receipt.reportSha256;
  }
  const expected = execution(split, freezeId, prerequisiteReportSha256);
  const saved = await readSaved(root, expected);
  if (saved) return saved;
  let handle;
  try {
    handle = await open(claimPath(root, split), 'wx');
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        'An execution already started without a complete result. Review it; do not rescore.',
      );
    throw error;
  }
  try {
    await handle.writeFile(json(expected));
    await handle.sync();
  } finally {
    await handle.close();
  }
  const report = { ...(await evaluate()), execution: expected };
  const reportBytes = json(report);
  const receipt = { execution: expected, reportSha256: hash(reportBytes) };
  await writeResearchBundle(root, bundleName(split), {
    'report.json': reportBytes,
    'manifest.json': json(receipt),
  });
  return { status: 'created', report, receipt };
}

export async function runHeldoutComparison(root, split) {
  requireHeldout(split);
  const review = await reviewHeldoutFreeze(root);
  const privateRoot = await realpath(resolve(root, 'research/private-data'));
  return executeHeldoutOnce(privateRoot, split, review.freezeId, async () => {
    const { dataset, strata } = await loadSelectedRecords(privateRoot, review, split);
    const result = comparePeriodDataset(dataset, strata, split);
    const { manifest, plan, development, freeze } = review;
    return {
      warning:
        'Conditional dates-only held-out research; unknown source eligibility is assumed solely for this analysis. No model fitting or tuning. Not prospective or clinical validation.',
      provenance: {
        planId: plan.id,
        ...freeze,
        source: manifest.source,
        attribution: manifest.attribution,
        licenseUrl: manifest.licenseUrl,
        datasetSha256: manifest.files[`${split}.json`].sha256,
        auditSha256: manifest.files[`${split}-audit.json`].sha256,
        productionRules: development.provenance.productionRules,
      },
      ...result,
      version: COMPARISON_VERSION,
    };
  });
}
