import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  comparePeriodDataset,
  BOOTSTRAP,
  COMPARISON_VERSION,
} from '../research/controlled-comparison.ts';
import {
  loadDevelopmentComparison,
  requireDevelopment,
  hash,
  lf,
  PREPARATION_MANIFEST_SHA256_LF,
} from '../research/controlled-input.mjs';
import { writeResearchBundle } from '../research/research-files.mjs';
import { ESTIMATE_RULES } from '../src/domain/periodEstimate.ts';

try {
  const [split = 'development', extra] = process.argv.slice(2);
  if (extra) throw new Error('Usage: pnpm research:compare-zenodo [development]');
  requireDevelopment(split);
  const root = fileURLToPath(new URL('../', import.meta.url));
  const input = await loadDevelopmentComparison(root, split);
  if (
    input.plan.uncertainty.seed !== BOOTSTRAP.seed ||
    input.plan.uncertainty.replicates !== BOOTSTRAP.replicates
  )
    throw new Error('Bootstrap settings differ from the fixed plan.');
  const codeHashesLf = {};
  const paths = [
    'research/controlled-comparison.ts',
    'research/controlled-input.mjs',
    'research/period-policy.ts',
    'research/period-dataset.ts',
    'research/research-files.mjs',
    'scripts/compare-zenodo-periods.mjs',
    'package.json',
    'pnpm-lock.yaml',
    ...(await readdir(resolve(root, 'src/domain')))
      .filter((p) => p.endsWith('.ts'))
      .sort()
      .map((p) => `src/domain/${p}`),
  ];
  for (const path of paths)
    codeHashesLf[path] = hash(lf(await readFile(resolve(root, path), 'utf8')));
  const result = comparePeriodDataset(input.dataset, input.strata, 'development');
  const report = {
    warning:
      'Conditional dates-only development research; unknown source eligibility is assumed solely for this analysis. Not prospective or clinical validation. Final-test and calibration forecasts remain unscored.',
    provenance: {
      planId: input.plan.id,
      planSha256Lf: input.manifest.planSha256Lf,
      preparationManifestSha256Lf: PREPARATION_MANIFEST_SHA256_LF,
      source: input.manifest.source,
      attribution: input.manifest.attribution,
      licenseUrl: input.manifest.licenseUrl,
      datasetSha256: input.manifest.files['development.json'].sha256,
      auditSha256: input.manifest.files['development-audit.json'].sha256,
      codeHashesLf,
      nodeVersion: process.version,
      productionRules: ESTIMATE_RULES,
    },
    ...result,
  };
  const reportBytes = JSON.stringify(report, null, 2) + '\n';
  const manifest = {
    version: COMPARISON_VERSION,
    split: 'development',
    reportSha256: hash(reportBytes),
  };
  const status = await writeResearchBundle(input.privateRoot, 'zenodo-development-comparison-v1', {
    'report.json': reportBytes,
    'manifest.json': JSON.stringify(manifest, null, 2) + '\n',
  });
  console.log(
    JSON.stringify(
      {
        status,
        ...manifest,
        warning: report.warning,
        participants: result.overall.participants,
        scored: result.overall.scored,
        availability: result.overall.availability,
        methods: result.overall.methods,
        weightedMinusMedian: result.overall.weightedMinusMedian,
        primaryContrastInterval: result.uncertainty.weightedMinusMedian,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    error?.code
      ? 'Unable to read or write comparison files. Source values are omitted.'
      : error.message,
  );
  process.exitCode = 1;
}
