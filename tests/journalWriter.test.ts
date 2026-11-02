import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { JournalWriter, type JournalSealer } from '../src/data/repository.ts';
import { emptyJournal, updateEntry } from '../src/domain/journal.ts';
import { openVaultWithKey, sealSerializedJournal } from '../src/domain/vault.ts';

const day = '2026-10-30';
const journal = (note: string) => updateEntry(emptyJournal(day), day, { note });
function fixture(write: (raw: string) => Promise<void>, sealer?: JournalSealer) {
  const key = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  let seals = 0;
  return {
    key,
    seals: () => seals,
    writer: new JournalWriter(
      {
        async getItem() {
          return null;
        },
        async removeItem() {},
        async setItem(_key, raw) {
          await write(raw);
        },
      },
      key,
      (n) => {
        seals++;
        return randomBytes(n);
      },
      sealer,
    ),
  };
}
const gate = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

test('a synchronous burst saves the latest snapshot once, without caller mutation leaking in', async () => {
  let stored = '';
  const f = fixture(async (raw) => {
    stored = raw;
  });
  const last = journal('latest');
  const saves = [f.writer.save(journal('older')), f.writer.save(last)];
  last.entries[day]!.note = 'mutated after save request';
  await Promise.all(saves);
  assert.equal(f.seals(), 1);
  assert.equal(openVaultWithKey(stored, f.key).entries[day]!.note, 'latest');
});

test('async encryption retains an accepted key, coalesces waiting edits, and wipes both batch keys', async () => {
  const entered = gate(),
    release = gate();
  const keys: Uint8Array[] = [],
    stored: string[] = [];
  const f = fixture(
    async (raw) => {
      stored.push(raw);
    },
    async (serialized, key, random) => {
      keys.push(key.key);
      entered.resolve();
      await release.promise;
      return sealSerializedJournal(serialized, key, random);
    },
  );
  const original = { key: new Uint8Array(f.key.key), salt: f.key.salt };
  const first = f.writer.save(journal('first'));
  await entered.promise;
  const middle = f.writer.save(journal('middle'));
  const latest = f.writer.save(journal('latest'));
  f.key.key.fill(0);
  assert.equal(stored.length, 0);
  assert.ok(keys[0].some(Boolean));
  release.resolve();
  await Promise.all([first, middle, latest, f.writer.flush()]);
  assert.deepEqual(
    stored.map((raw) => openVaultWithKey(raw, original).entries[day]!.note),
    ['first', 'latest'],
  );
  assert.equal(keys.length, 2);
  assert.ok(keys.every((key) => key.every((byte) => byte === 0)));
  original.key.fill(0);
});

test('async encryption rejection does not write, wipes the key and allows retry', async () => {
  let fail = true,
    writes = 0;
  let copied: Uint8Array | undefined;
  const f = fixture(
    async () => {
      writes++;
    },
    async (serialized, key, random) => {
      copied = key.key;
      await Promise.resolve();
      if (fail) throw new Error('native encryption failed');
      return sealSerializedJournal(serialized, key, random);
    },
  );
  await assert.rejects(f.writer.save(journal('retry me')), /native encryption failed/);
  await assert.rejects(f.writer.flush(), /native encryption failed/);
  assert.equal(writes, 0);
  assert.ok(copied!.every((byte) => byte === 0));
  fail = false;
  await f.writer.save(journal('retry me'));
  assert.equal(writes, 1);
});

test('in-flight writes finish before the newest waiting snapshot; flush waits for it', async () => {
  const entered = gate(),
    release = gate();
  const values: string[] = [];
  const f = fixture(async (raw) => {
    entered.resolve();
    await release.promise;
    values.push(raw);
  });
  const first = f.writer.save(journal('first'));
  await entered.promise;
  const second = f.writer.save(journal('intermediate'));
  const third = f.writer.save(journal('latest'));
  let flushed = false;
  const flush = f.writer.flush().then(() => {
    flushed = true;
  });
  await Promise.resolve();
  assert.equal(flushed, false);
  release.resolve();
  await Promise.all([first, second, third, flush]);
  assert.deepEqual(
    values.map((raw) => openVaultWithKey(raw, f.key).entries[day]!.note),
    ['first', 'latest'],
  );
  assert.equal(f.seals(), 2);
});

test('a failed batch rejects every represented save and flush; retry can succeed', async () => {
  let fail = true,
    stored = '';
  const f = fixture(async (raw) => {
    if (fail) throw new Error('disk full');
    stored = raw;
  });
  const a = f.writer.save(journal('first')),
    b = f.writer.save(journal('latest'));
  await Promise.all([
    assert.rejects(a, /disk full/),
    assert.rejects(b, /disk full/),
    assert.rejects(f.writer.flush(), /disk full/),
  ]);
  fail = false;
  await f.writer.save(journal('retry'));
  assert.equal(openVaultWithKey(stored, f.key).entries[day]!.note, 'retry');
});

test('a failed in-flight write cannot discard a newer queued snapshot', async () => {
  const entered = gate(),
    release = gate();
  let first = true,
    stored = '';
  const f = fixture(async (raw) => {
    if (first) {
      first = false;
      entered.resolve();
      await release.promise;
      throw new Error('first failed');
    }
    stored = raw;
  });
  const old = assert.rejects(f.writer.save(journal('old')), /first failed/);
  await entered.promise;
  const latest = f.writer.save(journal('latest'));
  release.resolve();
  await Promise.all([old, latest]);
  assert.equal(openVaultWithKey(stored, f.key).entries[day]!.note, 'latest');
});

test('accepted waiting saves remain decryptable after caller session-key cleanup', async () => {
  const entered = gate(),
    release = gate();
  let stored = '';
  const f = fixture(async (raw) => {
    entered.resolve();
    await release.promise;
    stored = raw;
  });
  const originalKey = { key: new Uint8Array(f.key.key), salt: f.key.salt };
  const first = f.writer.save(journal('first'));
  await entered.promise;
  const latest = f.writer.save(journal('latest before closing'));
  f.key.key.fill(0);
  release.resolve();
  await Promise.all([first, latest]);
  assert.equal(openVaultWithKey(stored, originalKey).entries[day]!.note, 'latest before closing');
  originalKey.key.fill(0);
});
