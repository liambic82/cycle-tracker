// Compare an encrypted copy pulled from the disposable AVD with a fictional fixture.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { openVault } from '../src/domain/vault.ts';

const [snapshot, fixture, note] = process.argv.slice(2);
if (!snapshot || !fixture)
  throw new Error(
    'Usage: verify-native-journal.mjs <snapshot stem> <fixture stem> [expected note]',
  );
for (const value of [snapshot, fixture])
  if (!/^[a-z0-9-]+$/.test(value)) throw new Error('Use a fixture stem, not an arbitrary path');
const directory = 'artifacts/qa/native-recovery';
const expected = JSON.parse(await readFile(`${directory}/${fixture}.json`, 'utf8'));
if (note !== undefined) expected.entries[expected.selectedDate].note = note;
const raw = await readFile(`${directory}/${snapshot}.cyclevault`, 'utf8');
const session = await openVault(raw, 'Fictional native QA 2026');
try {
  assert.deepEqual(session.journal, expected);
  const attachments = session.journal.medicalRecords.flatMap((record) => record.attachments);
  console.log(
    JSON.stringify({
      snapshot,
      fixture,
      equality: 'pass',
      entries: Object.keys(session.journal.entries).length,
      medicalRecords: session.journal.medicalRecords.length,
      attachments: attachments.map((a) => ({
        bytes: a.hex.length / 2,
        sha256: createHash('sha256').update(Buffer.from(a.hex, 'hex')).digest('hex'),
      })),
    }),
  );
} finally {
  session.vault.key.fill(0);
}
