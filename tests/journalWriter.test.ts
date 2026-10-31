import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { JournalWriter } from '../src/data/repository.ts';
import { emptyJournal, updateEntry } from '../src/domain/journal.ts';
import { openVaultWithKey } from '../src/domain/vault.ts';

const day = '2026-10-30';
const journal = (note: string) => updateEntry(emptyJournal(day), day, { note });
function fixture(write: (raw: string) => Promise<void>) {
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
