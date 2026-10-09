import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { emptyJournal, updateEntry } from '../src/domain/journal.ts';
import { newKey, openVault, parseEnvelope, seal } from '../src/domain/vault.ts';
import { JournalWriter } from '../src/data/repository.ts';

const password = 'test-only sample passphrase';

test('encrypted backups round trip; wrong passphrases and tampering fail', async () => {
  const key = await newKey(password, randomBytes);
  const journal = updateEntry(emptyJournal('2026-10-08'), '2026-10-08', {
    note: 'Private note 🌿',
    flow: 'spotting',
  });
  const encrypted = seal(journal, key, randomBytes);
  assert.ok(!encrypted.includes('Private note'));
  assert.notEqual(encrypted, seal(journal, key, randomBytes));
  const recovered = await openVault(encrypted, password);
  assert.deepEqual(recovered.journal, journal);
  await assert.rejects(openVault(encrypted, 'incorrect passphrase'), /incorrect/);
  const envelope = parseEnvelope(encrypted);
  envelope.ciphertext = (envelope.ciphertext[0] === 'a' ? 'b' : 'a') + envelope.ciphertext.slice(1);
  await assert.rejects(openVault(JSON.stringify(envelope), password), /damaged/);
  key.key.fill(0);
  recovered.vault.key.fill(0);
});

test('reject unsupported formats, unbounded KDF parameters, and short passphrases', async () => {
  await assert.rejects(newKey('short', randomBytes), /12 characters/);
  assert.throws(() => parseEnvelope('{broken'), /valid/);
  assert.throws(
    () =>
      parseEnvelope(
        JSON.stringify({ format: 'cycle-tracker-vault', version: 1, iterations: 9999999999 }),
      ),
    /supported/,
  );
});

test('writes stay ordered and a failed write can be retried without discarding edits', async () => {
  const key = await newKey(password, randomBytes);
  let stored = '';
  let fail = false;
  const store = {
    getItem: async () => stored,
    removeItem: async () => {
      stored = '';
    },
    setItem: async (_: string, value: string) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (fail) {
        fail = false;
        throw new Error('Storage unavailable');
      }
      stored = value;
    },
  };
  const writer = new JournalWriter(store, key, randomBytes);
  const old = updateEntry(emptyJournal('2026-10-08'), '2026-10-08', { note: 'first edit' });
  const next = updateEntry(old, '2026-10-08', { note: 'latest edit' });
  await Promise.all([writer.save(old), writer.save(next)]);
  assert.equal(
    (await openVault(stored, password)).journal.entries['2026-10-08']?.note,
    'latest edit',
  );
  fail = true;
  await assert.rejects(writer.save(old), /Storage unavailable/);
  await writer.save(next);
  await writer.flush();
  assert.equal(
    (await openVault(stored, password)).journal.entries['2026-10-08']?.note,
    'latest edit',
  );
  key.key.fill(0);
});
