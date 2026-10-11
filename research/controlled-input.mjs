import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { parsePeriodDataset } from './period-dataset.ts';
import { sourceStrataFromAudit } from './controlled-comparison.ts';

export const PREPARATION_MANIFEST_SHA256_LF =
  'e0e28e2ee6f09286b45fea6879edc138dd6e79ed2b77522084c22b50197e3a8b';
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const lf = (text) => text.replace(/\r\n/g, '\n');
export function requireDevelopment(split) {
  if (split !== 'development')
    throw new Error(
      'Only development comparisons are enabled. Freeze and review this implementation before scoring held-out groups.',
    );
}
export function checkedJson(bytes, expectedSha256, normalizeLf = false) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (hash(normalizeLf ? lf(text) : bytes) !== expectedSha256)
    throw new Error('Comparison input checksum mismatch. No forecasts were scored.');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid comparison JSON. Source values are omitted.');
  }
}
async function boundedRead(path) {
  if ((await stat(path)).size > 8 * 1024 * 1024) throw new Error('Comparison input exceeds 8 MiB.');
  return readFile(path);
}

export async function loadDevelopmentComparison(root, split = 'development') {
  // Reject held-out selection before any filesystem read, including annotations.
  requireDevelopment(split);
  const manifestBytes = await boundedRead(
    resolve(root, 'research/manifests/zenodo-preparation-v1.json'),
  );
  const manifest = checkedJson(manifestBytes, PREPARATION_MANIFEST_SHA256_LF, true);
  const planBytes = await boundedRead(
    resolve(root, 'research/protocols/zenodo-period-comparison-v1.json'),
  );
  const plan = checkedJson(planBytes, manifest.planSha256Lf, true);
  // The preparation receipt freezes source processing and the production policy.
  for (const [path, expected] of Object.entries(manifest.codeHashesLf)) {
    const bytes = await boundedRead(resolve(root, path));
    if (hash(lf(bytes.toString('utf8'))) !== expected)
      throw new Error('Prepared policy or source-processing code differs from its manifest.');
  }
  const privateRoot = await realpath(resolve(root, 'research/private-data'));
  const readPrivate = async (name) => {
    const path = await realpath(resolve(privateRoot, 'zenodo-15598359-prepared-v1', name));
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
  checkedJson(await readPrivate('manifest.json'), PREPARATION_MANIFEST_SHA256_LF);
  const dataset = parsePeriodDataset(
    checkedJson(await readPrivate('development.json'), manifest.files['development.json'].sha256),
  );
  const audit = checkedJson(
    await readPrivate('development-audit.json'),
    manifest.files['development-audit.json'].sha256,
  );
  if (
    dataset.provenance.kind !== 'external' ||
    dataset.provenance.datasetId !== plan.datasetId ||
    dataset.provenance.sourceSha256 !== plan.sourceSha256 ||
    dataset.participants.length !== manifest.summary.splitCounts.development.participants
  )
    throw new Error('Prepared dataset provenance differs from the fixed plan.');
  return {
    dataset,
    strata: sourceStrataFromAudit(dataset, 'development', audit),
    manifest,
    plan,
    privateRoot,
  };
}
