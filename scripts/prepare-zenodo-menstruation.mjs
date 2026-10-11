import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZENODO_SOURCE } from '../research/zenodo-intake.mjs';
import {
  prepareZenodoRecords,
  PREPARATION_VERSION,
  RESEARCH_SPLITS,
  jsonBytes,
  sha256,
} from '../research/prepare-zenodo.mjs';
import { readVerifiedZenodoSource, writeResearchBundle } from '../research/research-files.mjs';

try {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const privateRoot = resolve(root, 'research/private-data');
  const [input = resolve(privateRoot, 'zenodo-15598359-menstruationdata.csv'), extra] =
    process.argv.slice(2);
  if (extra) throw new Error('Usage: pnpm research:prepare-zenodo [local-source.csv]');
  const text = await readVerifiedZenodoSource(privateRoot, input);
  const planText = (
    await readFile(resolve(root, 'research/protocols/zenodo-period-comparison-v1.json'), 'utf8')
  ).replace(/\r\n/g, '\n');
  const plan = JSON.parse(planText);
  if (plan.preparationVersion !== PREPARATION_VERSION || plan.sourceSha256 !== ZENODO_SOURCE.sha256)
    throw new Error('Analysis plan and source adapter versions do not match.');
  const prepared = prepareZenodoRecords(text);
  const files = {};
  for (const split of RESEARCH_SPLITS) {
    if (!prepared.datasets[split]) continue;
    files[`${split}.json`] = jsonBytes(prepared.datasets[split]);
    files[`${split}-audit.json`] = jsonBytes(prepared.auditAnnotations[split]);
  }
  const codeHashesLf = {};
  for (const path of [
    'research/zenodo-intake.mjs',
    'research/prepare-zenodo.mjs',
    'research/research-files.mjs',
    'research/period-dataset.ts',
    'scripts/prepare-zenodo-menstruation.mjs',
    'src/domain/periodEstimate.ts',
  ])
    codeHashesLf[path] = sha256(
      (await readFile(resolve(root, path), 'utf8')).replace(/\r\n/g, '\n'),
    );
  const manifest = {
    preparationVersion: PREPARATION_VERSION,
    source: ZENODO_SOURCE,
    attribution:
      'Förster, Charlotte, and Mitesser, Oliver (2025), Zenodo dataset v1, DOI 10.5281/zenodo.15598359, CC BY 4.0.',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    planId: plan.id,
    planSha256Lf: sha256(planText),
    codeHashesLf,
    semantics: {
      dates: 'relative to each participant first retained start; no absolute dates or birthdays',
      context: 'unknown; complete=false means not established, not verified incomplete',
      observedThrough: 'last recorded start only; not proof of continuous observation',
      history:
        'one unsegmented recorded sequence per person; no invented periods or gap classifications',
      annotations: 'retrospective audit only, excluded from predictor inputs',
      identifiers: 'deterministic source-ID hashes; not a claim of anonymity',
      transformations:
        'sort dates, collapse exact source duplicates, omit Birth=1 from starts and birth-only identifier from cohort',
    },
    summary: prepared.summary,
    files: Object.fromEntries(
      Object.entries(files).map(([name, bytes]) => [
        name,
        { sha256: sha256(bytes), bytes: Buffer.byteLength(bytes) },
      ]),
    ),
  };
  files['manifest.json'] = jsonBytes(manifest);
  const status = await writeResearchBundle(privateRoot, 'zenodo-15598359-prepared-v1', files);
  console.log(
    JSON.stringify(
      {
        status,
        warning:
          'Preparation only. No external forecasts scored; context stays unknown. Participant files remain local and ignored.',
        planId: manifest.planId,
        planSha256Lf: manifest.planSha256Lf,
        manifestSha256: sha256(files['manifest.json']),
        ...prepared.summary,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    error?.code
      ? 'Unable to read or write local research files. No source values are shown.'
      : error.message,
  );
  process.exitCode = 1;
}
