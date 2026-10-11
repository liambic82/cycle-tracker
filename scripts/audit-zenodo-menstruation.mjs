import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZENODO_SOURCE, auditZenodoMenstruation } from '../research/zenodo-intake.mjs';
import { readVerifiedZenodoSource } from '../research/research-files.mjs';

try {
  const root = fileURLToPath(new URL('../research/private-data/', import.meta.url));
  const [path = resolve(root, 'zenodo-15598359-menstruationdata.csv'), extra] =
    process.argv.slice(2);
  if (extra) throw new Error('Usage: pnpm research:audit-zenodo [local-source.csv]');
  const audit = auditZenodoMenstruation(await readVerifiedZenodoSource(root, path));
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
