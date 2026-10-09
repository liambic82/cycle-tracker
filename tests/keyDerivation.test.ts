import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { boundedKeyDerivation, portableKeyDeriver } from '../src/domain/keyDerivation.ts';
import { derivePassphraseKey as webKeyDeriver } from '../src/data/passphraseKey.web.ts';
import { deriveKey, newKey, openVault, seal } from '../src/domain/vault.ts';
import { emptyJournal } from '../src/domain/journal.ts';

test('portable and Web Crypto implementations match fixed UTF-8 PBKDF2-SHA256 vectors', async () => {
  const vectors = JSON.parse(
    await readFile(new URL('./fixtures/kdf-vectors.json', import.meta.url), 'utf8'),
  );
  for (const vector of vectors) {
    const password = Uint8Array.from(Buffer.from(vector.passwordHex, 'hex'));
    const salt = Uint8Array.from(Buffer.from(vector.saltHex, 'hex'));
    for (const derive of [portableKeyDeriver, webKeyDeriver]) {
      const key = await derive(password, salt);
      assert.equal(Buffer.from(key).toString('hex'), vector.expectedHex, vector.name);
      key.fill(0);
    }
  }
});

test('old and new passphrase paths open each other’s unchanged vault format', async () => {
  const phrase = 'Fictional café 🌿 passphrase';
  const journal = emptyJournal('2026-10-09');
  for (const [create, open] of [
    [portableKeyDeriver, webKeyDeriver],
    [webKeyDeriver, portableKeyDeriver],
  ]) {
    const vault = await newKey(phrase, randomBytes, create);
    const raw = seal(journal, vault, randomBytes);
    const restored = await openVault(raw, phrase, open);
    assert.deepEqual(restored.journal, journal);
    await assert.rejects(openVault(raw, 'wrong fictional phrase', open), /incorrect/);
    vault.key.fill(0);
    restored.vault.key.fill(0);
  }
});

test('stalled key calculation times out and a late key is wiped instead of accepted', async () => {
  let complete!: (key: Uint8Array) => void;
  const pending = new Promise<Uint8Array>((resolve) => {
    complete = resolve;
  });
  await assert.rejects(
    boundedKeyDerivation(() => pending, 10),
    /took too long/,
  );
  const late = new Uint8Array(32).fill(7);
  complete(late);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.ok(late.every((byte) => byte === 0));
});

test('failed or malformed derivation is rejected without exposing native errors', async () => {
  const invalid = new Uint8Array(3).fill(9);
  await assert.rejects(
    boundedKeyDerivation(async () => invalid),
    /could not prepare/,
  );
  assert.ok(invalid.every((byte) => byte === 0));
  await assert.rejects(
    boundedKeyDerivation(async () => {
      throw new Error('fictional sensitive input');
    }),
    (error: Error) =>
      !error.message.includes('sensitive') && error.message.includes('could not prepare'),
  );
});

test('derivation receives exact UTF-8 bytes and wipes temporary inputs after completion', async () => {
  let input!: Uint8Array;
  let saltInput!: Uint8Array;
  const vault = await deriveKey(
    '  café\0🌿\ud800  ',
    '000102030405060708090a0b0c0d0e0f',
    async (password, salt) => {
      assert.deepEqual(password, new TextEncoder().encode('  café\0🌿\ud800  '));
      input = password;
      saltInput = salt;
      return new Uint8Array(32).fill(5);
    },
  );
  assert.ok(input.every((byte) => byte === 0));
  assert.ok(saltInput.every((byte) => byte === 0));
  assert.ok(vault.key.every((byte) => byte === 5));
  vault.key.fill(0);
});
