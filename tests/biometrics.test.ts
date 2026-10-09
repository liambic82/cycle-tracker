import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { bytesToHex } from '@noble/hashes/utils.js';
import {
  BiometricVault,
  BIOMETRIC_REFERENCE_KEY,
  type ProtectedKeyStore,
} from '../src/data/biometricVault.ts';
import { STORAGE_KEY, type Storage } from '../src/data/repository.ts';
import { emptyJournal, updateEntry } from '../src/domain/journal.ts';
import { newKey, openVault, openVaultWithKey, seal, type VaultKey } from '../src/domain/vault.ts';

function fixture() {
  const values = new Map<string, string>();
  let secret: string | null = null;
  let available = true;
  let failRead = false;
  let failWrite = false;
  let failRemove = false;
  let failReference = false;
  let reads = 0;
  const storage: Storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      if (failReference && key === BIOMETRIC_REFERENCE_KEY) throw new Error('Storage unavailable');
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };
  const protectedKey: ProtectedKeyStore = {
    available: () => available,
    read: async () => {
      reads++;
      if (failRead) throw new Error('Authentication canceled');
      return secret;
    },
    write: async (value) => {
      if (failWrite) throw new Error('Authentication canceled');
      secret = value;
    },
    remove: async () => {
      if (failRemove) throw new Error('OS storage unavailable');
      secret = null;
    },
  };
  return {
    service: new BiometricVault(storage, protectedKey, randomBytes),
    storage,
    values,
    get secret() {
      return secret;
    },
    set secret(value: string | null) {
      secret = value;
    },
    get reads() {
      return reads;
    },
    set available(value: boolean) {
      available = value;
    },
    set failRead(value: boolean) {
      failRead = value;
    },
    set failWrite(value: boolean) {
      failWrite = value;
    },
    set failRemove(value: boolean) {
      failRemove = value;
    },
    set failReference(value: boolean) {
      failReference = value;
    },
  };
}
const testKey = (): VaultKey => ({ key: randomBytes(32), salt: bytesToHex(randomBytes(16)) });
const journal = updateEntry(emptyJournal('2026-10-09'), '2026-10-09', {
  note: 'Fictional biometric test',
});

test('biometric opt-in keeps key material out of ordinary storage and unlocks the same encrypted journal', async () => {
  const f = fixture();
  const vault = testKey();
  const encrypted = seal(journal, vault, randomBytes);
  await f.storage.setItem(STORAGE_KEY, encrypted);
  assert.equal(await f.service.enabled(vault.salt), false);
  await f.service.enable(vault);
  assert.equal(await f.service.enabled(vault.salt), true);
  const reference = JSON.parse(f.values.get(BIOMETRIC_REFERENCE_KEY)!);
  assert.deepEqual(Object.keys(reference).sort(), ['salt', 'token', 'version']);
  assert.ok(!JSON.stringify([...f.values]).includes(bytesToHex(vault.key)));
  assert.ok(!JSON.stringify([...f.values]).includes('Fictional biometric test'));
  const opened = await f.service.unlock(encrypted);
  assert.deepEqual(opened.journal, journal);
  assert.notEqual(opened.vault.key, vault.key);
  assert.deepEqual(opened.vault.key, new Uint8Array(vault.key));
  opened.vault.key.fill(0);
  assert.deepEqual(openVaultWithKey(encrypted, vault), journal);
  assert.equal(f.values.get(STORAGE_KEY), encrypted);
  vault.key.fill(0);
});

test('canceling authentication leaves the vault locked without disabling later biometric attempts', async () => {
  const f = fixture();
  const vault = testKey();
  await f.service.enable(vault);
  const encrypted = seal(journal, vault, randomBytes);
  f.failRead = true;
  await assert.rejects(f.service.unlock(encrypted), /not completed/);
  assert.equal(await f.service.enabled(vault.salt), true);
  f.failRead = false;
  const opened = await f.service.unlock(encrypted);
  assert.deepEqual(opened.journal, journal);
  opened.vault.key.fill(0);
  vault.key.fill(0);
});

test('changed enrollment or a missing OS key disables convenience unlock but preserves passphrase recovery', async () => {
  const f = fixture();
  const vault = await newKey('fictional biometric fallback passphrase', randomBytes);
  const encrypted = seal(journal, vault, randomBytes);
  await f.storage.setItem(STORAGE_KEY, encrypted);
  await f.service.enable(vault);
  f.secret = null; // The platform returns null for an invalidated credential.
  await assert.rejects(f.service.unlock(encrypted), /set up again/);
  assert.equal(await f.service.enabled(vault.salt), false);
  assert.equal(f.values.get(STORAGE_KEY), encrypted);
  const opened = await openVault(encrypted, 'fictional biometric fallback passphrase');
  assert.deepEqual(opened.journal, journal);
  opened.vault.key.fill(0);
  await f.service.enable(vault);
  assert.equal(await f.service.enabled(vault.salt), true);
  vault.key.fill(0);
});

test('absent, malformed, and mismatched references never request a protected key', async () => {
  const f = fixture();
  const vault = testKey();
  const encrypted = seal(journal, vault, randomBytes);
  await assert.rejects(f.service.unlock(encrypted), /passphrase/);
  f.values.set(BIOMETRIC_REFERENCE_KEY, '{bad');
  await assert.rejects(f.service.unlock(encrypted), /passphrase/);
  await f.service.enable(testKey());
  await assert.rejects(f.service.unlock(encrypted), /passphrase/);
  assert.equal(f.reads, 0);
  assert.equal(await f.service.enabled(vault.salt), false);
});

test('stale, malformed, or tampered protected credentials cannot open a journal', async () => {
  for (const corrupt of ['token', 'key', 'json', 'version'] as const) {
    const f = fixture();
    const vault = testKey();
    await f.service.enable(vault);
    const encrypted = seal(journal, vault, randomBytes);
    const stored = JSON.parse(f.secret!);
    if (corrupt === 'token') stored.token = bytesToHex(randomBytes(16));
    if (corrupt === 'key') stored.key = bytesToHex(randomBytes(32));
    if (corrupt === 'version') stored.version = 2;
    f.secret = corrupt === 'json' ? '{broken' : JSON.stringify(stored);
    await assert.rejects(f.service.unlock(encrypted), /set up again/);
    assert.equal(await f.service.enabled(vault.salt), false);
    assert.equal(f.secret, null);
    assert.deepEqual(openVaultWithKey(encrypted, vault), journal);
    vault.key.fill(0);
  }
});

test('unsupported devices and canceled setup never become opted in', async () => {
  const f = fixture();
  const vault = testKey();
  f.available = false;
  await assert.rejects(f.service.enable(vault), /supported/);
  assert.equal(f.secret, null);
  assert.equal(await f.service.enabled(vault.salt), false);
  f.available = true;
  f.failWrite = true;
  await assert.rejects(f.service.enable(vault), /not completed/);
  assert.equal(f.secret, null);
  assert.equal(await f.service.enabled(vault.salt), false);
});

test('failed metadata persistence rolls back the protected key; failed removal remains retryable', async () => {
  const f = fixture();
  const vault = testKey();
  f.failReference = true;
  await assert.rejects(f.service.enable(vault), /not completed/);
  assert.equal(f.secret, null);
  assert.equal(await f.service.enabled(vault.salt), false);
  f.failReference = false;
  await f.service.enable(vault);
  f.failRemove = true;
  await assert.rejects(f.service.clear(), /OS storage unavailable/);
  assert.equal(await f.service.enabled(vault.salt), true);
  f.failRemove = false;
  await f.service.clear();
  assert.equal(f.secret, null);
  assert.equal(await f.service.enabled(vault.salt), false);
});

test('clearing biometric access removes interrupted setup while preserving journal and unrelated data', async () => {
  const f = fixture();
  const vault = testKey();
  const encrypted = seal(journal, vault, randomBytes);
  f.values.set(STORAGE_KEY, encrypted);
  f.values.set('unrelated', 'keep');
  f.secret = 'protected orphan from interrupted setup or reinstall';
  await f.service.clear();
  assert.equal(f.secret, null);
  assert.deepEqual(
    [...f.values],
    [
      [STORAGE_KEY, encrypted],
      ['unrelated', 'keep'],
    ],
  );
  await f.service.enable(vault);
  await f.service.clear();
  await assert.rejects(f.service.unlock(encrypted), /passphrase/);
  assert.deepEqual(openVaultWithKey(encrypted, vault), journal);
});

test('key-based opening rejects another vault and modified ciphertext without changing the caller’s key', () => {
  const vault = testKey();
  const encrypted = seal(journal, vault, randomBytes);
  const original = new Uint8Array(vault.key);
  assert.throws(
    () => openVaultWithKey(encrypted, { ...vault, salt: bytesToHex(randomBytes(16)) }),
    /does not match/,
  );
  const tampered = JSON.parse(encrypted);
  tampered.ciphertext = (tampered.ciphertext[0] === 'a' ? 'b' : 'a') + tampered.ciphertext.slice(1);
  assert.throws(() => openVaultWithKey(JSON.stringify(tampered), vault), /damaged/);
  assert.deepEqual(new Uint8Array(vault.key), original);
});
