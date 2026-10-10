import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { gcm } from '@noble/ciphers/aes.js';
import { hexToBytes } from '@noble/hashes/utils.js';
import {
  PersonalBackgroundStore,
  PERSONAL_BACKGROUND_KEY,
} from '../src/data/personalBackgroundStore.ts';
import { prepareEncodedPhoto, photoDataUri } from '../src/domain/personalImage.ts';
import { emptyJournal } from '../src/domain/journal.ts';
import { seal } from '../src/domain/vault.ts';
import { STORAGE_KEY } from '../src/data/repository.ts';
import { png } from './fixtures/personal-photo.ts';

const vault = () => ({ key: randomBytes(32), salt: randomBytes(16).toString('hex') });
const photo = () => prepareEncodedPhoto(png());
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function fixture() {
  const values = new Map<string, string>([[STORAGE_KEY, 'journal sentinel']]);
  const calls: string[] = [];
  let failRead = false,
    failWrite = false,
    failRemove = false;
  let waitWrite: Promise<void> | null = null,
    waitRead: Promise<void> | null = null;
  const storage = {
    getItem: async (key: string) => {
      calls.push(`read:${key}`);
      if (waitRead) await waitRead;
      if (failRead) throw Error('read');
      return values.get(key) ?? null;
    },
    setItem: async (key: string, value: string) => {
      calls.push(`write:${key}`);
      if (waitWrite) await waitWrite;
      if (failWrite) throw Error('quota');
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      calls.push(`remove:${key}`);
      if (failRemove) throw Error('remove');
      values.delete(key);
    },
  };
  return {
    store: new PersonalBackgroundStore(storage, randomBytes),
    values,
    calls,
    failRead: (value: boolean) => {
      failRead = value;
    },
    failWrite: (value: boolean) => {
      failWrite = value;
    },
    failRemove: (value: boolean) => {
      failRemove = value;
    },
    waitWrite: (value: Promise<void> | null) => {
      waitWrite = value;
    },
    waitRead: (value: Promise<void> | null) => {
      waitRead = value;
    },
  };
}

test('personal photos round-trip encrypted under a separate key with fresh nonces; vault/export unchanged', async () => {
  const f = fixture(),
    key = vault(),
    chosen = photo();
  await f.store.open(key);
  assert.equal(await f.store.apply(chosen), true);
  const first = f.values.get(PERSONAL_BACKGROUND_KEY)!;
  assert.equal(f.store.getSnapshot().uri, photoDataUri(chosen));
  assert.ok(
    !first.includes('data:image') && !first.includes(Buffer.from(chosen.bytes).toString('hex')),
  );
  const envelope = JSON.parse(first);
  assert.throws(
    () =>
      gcm(
        key.key,
        hexToBytes(envelope.nonce),
        new TextEncoder().encode('cycle-tracker:personal-background:v1'),
      ).decrypt(hexToBytes(envelope.ciphertext)),
    'journal key cannot directly open photo',
  );
  await f.store.apply(chosen);
  assert.notEqual(f.values.get(PERSONAL_BACKGROUND_KEY), first);
  f.store.close();
  assert.equal(f.store.getSnapshot().uri, null);
  assert.equal(f.store.getSnapshot().ready, false);
  assert.equal(await f.store.apply(chosen), false);
  await f.store.open(key);
  assert.equal(f.store.getSnapshot().uri, photoDataUri(chosen));
  assert.equal(f.values.get(STORAGE_KEY), 'journal sentinel');
  const exportEnvelope = JSON.parse(seal(emptyJournal('2026-10-10'), key, randomBytes));
  assert.deepEqual(Object.keys(exportEnvelope).sort(), [
    'ciphertext',
    'format',
    'iterations',
    'kdf',
    'nonce',
    'salt',
    'version',
  ]);
  assert.ok(
    key.key.some((byte) => byte !== 0),
    'closing a photo session must not erase the journal key',
  );
});

test('tampering, wrong keys, foreign salts and malformed slots do not block the journal or show photos', async () => {
  const f = fixture(),
    key = vault();
  await f.store.open(key);
  await f.store.apply(photo());
  const original = f.values.get(PERSONAL_BACKGROUND_KEY)!;
  const encrypted = JSON.parse(original);
  const changedCiphertext =
    (encrypted.ciphertext[0] === 'a' ? 'b' : 'a') + encrypted.ciphertext.slice(1);
  for (const invalid of [
    'null',
    '{broken',
    JSON.stringify({ ...encrypted, version: 9 }),
    JSON.stringify({ ...encrypted, nonce: '../x' }),
    JSON.stringify({ ...encrypted, ciphertext: changedCiphertext }),
    ' '.repeat(1_050_000),
  ]) {
    f.values.set(PERSONAL_BACKGROUND_KEY, invalid);
    await f.store.open(key);
    assert.equal(f.store.getSnapshot().ready, true);
    assert.equal(f.store.getSnapshot().uri, null);
    assert.ok(f.store.getSnapshot().error);
  }
  f.values.set(PERSONAL_BACKGROUND_KEY, original);
  for (const wrong of [{ ...key, key: randomBytes(32) }, vault()]) {
    await f.store.open(wrong);
    assert.equal(f.store.getSnapshot().uri, null);
    assert.ok(f.store.getSnapshot().error);
  }
  await f.store.open(key);
  assert.ok(f.store.getSnapshot().uri);
});

test('failed writes/removal keep the prior copy and can be retried; read failure permits recovery', async () => {
  const f = fixture(),
    key = vault();
  await f.store.open(key);
  await f.store.apply(photo());
  const before = f.values.get(PERSONAL_BACKGROUND_KEY),
    uri = f.store.getSnapshot().uri;
  f.failWrite(true);
  assert.equal(await f.store.apply(prepareEncodedPhoto(png({ blue: 64 }))), false);
  assert.equal(f.store.getSnapshot().uri, uri);
  assert.equal(f.values.get(PERSONAL_BACKGROUND_KEY), before);
  assert.equal(f.store.getSnapshot().busy, false);
  assert.ok(f.store.getSnapshot().error);
  f.failRemove(true);
  assert.equal(await f.store.remove(), false);
  assert.equal(f.store.getSnapshot().uri, uri);
  f.failRemove(false);
  assert.equal(await f.store.remove(), true);
  assert.equal(f.store.getSnapshot().uri, null);
  f.failRead(true);
  await f.store.open(key);
  assert.ok(f.store.getSnapshot().error);
  f.failWrite(false);
  assert.equal(await f.store.apply(photo()), true);
  assert.equal(f.store.getSnapshot().error, '');
});

test('sample apply/remove/reset never read or change the real photo slot', async () => {
  const f = fixture(),
    key = vault();
  await f.store.open(key);
  await f.store.apply(photo());
  const before = f.values.get(PERSONAL_BACKGROUND_KEY),
    calls = f.calls.length;
  f.store.openDemo();
  assert.equal(f.store.getSnapshot().uri, null);
  await f.store.apply(prepareEncodedPhoto(png({ blue: 64 })));
  assert.ok(f.store.getSnapshot().uri);
  await f.store.remove();
  await f.store.apply(photo());
  f.store.close();
  assert.equal(f.calls.length, calls);
  assert.equal(f.values.get(PERSONAL_BACKGROUND_KEY), before);
  await f.store.open(key);
  assert.equal(f.store.getSnapshot().uri, photoDataUri(photo()));
});

test('lock during save never repopulates memory; deletion drains the write before removing it', async () => {
  const f = fixture(),
    key = vault();
  await f.store.open(key);
  let release!: () => void;
  f.waitWrite(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const pending = f.store.apply(photo());
  await tick();
  assert.equal(await f.store.apply(photo()), false, 'duplicate tap is rejected');
  f.store.close();
  const deleted = f.store.clearPersistent();
  release();
  await deleted;
  assert.equal(await pending, false);
  assert.equal(f.store.getSnapshot().uri, null);
  assert.equal(f.values.has(PERSONAL_BACKGROUND_KEY), false);
  await f.store.open(vault());
  assert.equal(f.store.getSnapshot().uri, null);
});

test('lock during reading and a new sample session ignore stale decrypted results', async () => {
  const f = fixture(),
    key = vault();
  await f.store.open(key);
  await f.store.apply(photo());
  let release!: () => void;
  f.waitRead(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const opening = f.store.open(key);
  await tick();
  f.store.openDemo();
  release();
  await opening;
  assert.equal(f.store.getSnapshot().ready, true);
  assert.equal(f.store.getSnapshot().uri, null);
  assert.equal(f.store.getSnapshot().error, '');
});

test('replacement overwrites a single slot; clearing reports failures and clears visible photo on success', async () => {
  const f = fixture(),
    key = vault();
  await f.store.open(key);
  await f.store.apply(photo());
  const replacement = prepareEncodedPhoto(png({ blue: 64 }));
  await f.store.apply(replacement);
  f.store.close();
  await f.store.open(key);
  assert.equal(f.store.getSnapshot().uri, photoDataUri(replacement));
  assert.equal(f.values.size, 2);
  f.failRemove(true);
  await assert.rejects(f.store.clearPersistent());
  assert.ok(f.store.getSnapshot().uri);
  f.failRemove(false);
  await f.store.clearPersistent();
  assert.equal(f.store.getSnapshot().uri, null);
  assert.equal(f.values.get(STORAGE_KEY), 'journal sentinel');
});
