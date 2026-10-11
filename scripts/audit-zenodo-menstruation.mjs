import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { ZENODO_SOURCE, auditZenodoMenstruation } from '../research/zenodo-intake.mjs';

try {
  const root = fileURLToPath(new URL('../research/private-data/', import.meta.url));
  const [path = resolve(root, 'zenodo-15598359-menstruationdata.csv'), extra] =
    process.argv.slice(2);
  if (extra) throw new Error('Usage: pnpm research:audit-zenodo [local-source.csv]');
  const privateRoot = await realpath(root);
  const inputPath = await realpath(resolve(path));
  const within = relative(privateRoot, inputPath);
  if (
    isAbsolute(within) ||
    within === '..' ||
    within.startsWith('../') ||
    within.startsWith('..\\')
  )
    throw new Error('Keep external inputs under the ignored research/private-data directory.');
  if ((await stat(inputPath)).size !== ZENODO_SOURCE.bytes)
    throw new Error('Source size differs from the reviewed deposit.');
  const bytes = await readFile(inputPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const md5 = createHash('md5').update(bytes).digest('hex');
  if (sha256 !== ZENODO_SOURCE.sha256 || md5 !== ZENODO_SOURCE.md5)
    throw new Error('Source checksum differs from the reviewed deposit.');
  const audit = auditZenodoMenstruation(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  console.log(
    JSON.stringify(
      {
        warning:
          'Structural intake only. No forecast was scored, no duplicate was removed, and context/completeness were not inferred.',
        source: ZENODO_SOURCE,
        audit,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    error?.code ? 'Unable to read or decode the local research source.' : error.message,
  );
  process.exitCode = 1;
}
