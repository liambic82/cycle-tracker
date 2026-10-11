import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsePeriodDataset, benchmarkPeriodDataset } from '../research/period-dataset.ts';
import { ESTIMATE_RULES } from '../src/domain/periodEstimate.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
try {
  const [path, split = 'development', offset = '0', extra] = process.argv.slice(2);
  if (
    !path ||
    extra ||
    !['development', 'calibration', 'test'].includes(split) ||
    !/^\d{1,3}$/.test(offset)
  )
    throw new Error(
      'Usage: pnpm research:benchmark <dataset.json> [development|calibration|test] [elapsed-days]',
    );
  const inputPath = await realpath(resolve(path));
  if ((await stat(inputPath)).size > 8 * 1024 * 1024)
    throw new Error('Dataset exceeds the 8 MiB research input limit.');
  const bytes = await readFile(inputPath);
  let json;
  try {
    json = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error('Dataset must contain valid JSON. Source values are omitted from this error.');
  }
  const dataset = parsePeriodDataset(json);
  if (dataset.provenance.kind === 'external') {
    const privateRoot = await realpath(resolve(root, 'research/private-data'));
    const pathWithin = relative(privateRoot, inputPath);
    if (
      isAbsolute(pathWithin) ||
      pathWithin === '..' ||
      pathWithin.startsWith('..\\') ||
      pathWithin.startsWith('../')
    )
      throw new Error('Keep external inputs under the ignored research/private-data directory.');
  }
  const source = await readFile(resolve(root, 'src/domain/periodEstimate.ts'), 'utf8');
  const result = benchmarkPeriodDataset(dataset, split, Number(offset));
  console.log(
    JSON.stringify(
      {
        warning:
          'Research only; not clinical validation. Same-day logging is assumed. Starts/context only; opt-in is assumed. Source eligibility and observation coverage require dataset-specific review. Comparator uses reference-policy folds.',
        normalizedInputSha256: hash(bytes),
        productionPolicySha256Lf: hash(source.replace(/\r\n/g, '\n')),
        rules: ESTIMATE_RULES,
        ...result,
      },
      null,
      2,
    ),
  );
} catch (error) {
  // Native filesystem errors can contain identifying paths; do not echo them.
  console.error(error?.code ? 'Unable to read the research input or policy files.' : error.message);
  process.exitCode = 1;
}
