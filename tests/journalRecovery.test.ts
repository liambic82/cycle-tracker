import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  JournalRecovery,
  JournalRecoveryRequired,
  JOURNAL_OPERATION_KEY,
} from '../src/data/journalRecovery.ts';
import { FileJournalStorage } from '../src/data/fileJournalStorage.ts';
import { STORAGE_KEY, type Storage } from '../src/data/repository.ts';
import { emptyJournal } from '../src/domain/journal.ts';
import { seal } from '../src/domain/vault.ts';

function fixture() {
  const records = new Map<string, string>();
  let raw: string | null = 'old encrypted journal';
  const settings = new Set(['reminders', 'biometrics', 'photo']);
  let fault = '';
  let readFailed = false;
  const storage: Storage = {
    async getItem(key) {
      if (fault === 'marker-read') throw new Error('read failed');
      return records.get(key) ?? null;
    },
    async setItem(key, value) {
      if (fault === 'marker-write-before') throw new Error('write failed');
      records.set(key, value);
      if (fault === 'marker-write-after') throw new Error('bridge failed');
    },
    async removeItem(key) {
      if (fault === 'marker-remove-before') throw new Error('remove failed');
      records.delete(key);
      if (fault === 'marker-remove-after') throw new Error('bridge failed');
    },
  };
  const read = async () => {
    if (readFailed) throw new Error('journal unreadable');
    return raw;
  };
  const cleanup = async () => {
    for (const item of ['reminders', 'biometrics', 'photo']) {
      if (fault === `${item}-before`) throw new Error('cleanup failed');
      settings.delete(item);
      if (fault === `${item}-after`) throw new Error('bridge failed');
    }
  };
  const restart = () => new JournalRecovery(storage, read, cleanup);
  const change = (target: string | null) =>
    restart().change(target, async () => {
      if (fault === 'journal-before') throw new Error('write failed');
      raw = target;
      if (fault === 'journal-read') readFailed = true;
      if (fault === 'journal-after') throw new Error('bridge failed');
    });
  return {
    records,
    settings,
    restart,
    change,
    raw: () => raw,
    fail: (value: string) => {
      fault = value;
      readFailed = false;
    },
  };
}

for (const target of ['new encrypted journal', null]) {
  const kind = target === null ? 'delete' : 'restore';
  test(`${kind}: rejected commit preserves the old journal and every convenience`, async () => {
    const f = fixture();
    f.fail('journal-before');
    await assert.rejects(f.change(target), /write failed/);
    assert.equal(f.raw(), 'old encrypted journal');
    assert.equal(f.settings.size, 3);
    assert.equal(await f.restart().pending(), false);
  });
  test(`${kind}: a committed write with a rejected bridge reply still finishes safely`, async () => {
    const f = fixture();
    f.fail('journal-after');
    await f.change(target);
    assert.equal(f.raw(), target);
    assert.equal(f.settings.size, 0);
    assert.equal(await f.restart().pending(), false);
  });
  for (const stage of [
    'journal-read',
    'reminders-before',
    'reminders-after',
    'biometrics-before',
    'biometrics-after',
    'photo-before',
    'photo-after',
    'marker-remove-before',
    'marker-remove-after',
  ]) {
    test(`${kind}: restart completes cleanup after ${stage}`, async () => {
      const f = fixture();
      f.fail(stage);
      await assert.rejects(f.change(target), JournalRecoveryRequired);
      assert.equal(f.raw(), target);
      if (stage === 'journal-read') assert.equal(f.settings.size, 3);
      f.fail('');
      await f.restart().resume();
      assert.equal(f.raw(), target);
      assert.equal(f.settings.size, 0);
      assert.equal(await f.restart().pending(), false);
    });
  }
}

for (const stage of ['marker-read', 'marker-write-before', 'marker-write-after']) {
  test(`no journal mutation or cleanup when recovery intent fails at ${stage}`, async () => {
    const f = fixture();
    f.fail(stage);
    await assert.rejects(f.change('new encrypted journal'), JournalRecoveryRequired);
    assert.equal(f.raw(), 'old encrypted journal');
    assert.equal(f.settings.size, 3);
    f.fail('');
    await f.restart().resume();
    assert.equal(f.settings.size, 3);
    assert.equal(await f.restart().pending(), false);
  });
}

test('interruption before commit leaves only a non-sensitive intent; restart retains old settings', async () => {
  const f = fixture();
  f.fail('marker-write-after');
  await assert.rejects(f.change('new encrypted journal'), JournalRecoveryRequired);
  const raw = f.records.get(JOURNAL_OPERATION_KEY)!;
  assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), ['digest', 'kind', 'version']);
  assert.equal(raw.includes('encrypted journal'), false);
  f.fail('');
  assert.equal(await f.restart().resume(), 'unchanged');
  assert.equal(f.settings.size, 3);
});

test('malformed or oversized recovery records block access without clearing anything', async () => {
  for (const raw of [
    '{',
    'null',
    '{"version":2}',
    JSON.stringify({ version: 1, kind: 'delete', digest: 'wrong' }),
    'x'.repeat(257),
  ]) {
    const f = fixture();
    f.records.set(JOURNAL_OPERATION_KEY, raw);
    await assert.rejects(f.restart().resume(), JournalRecoveryRequired);
    assert.equal(f.records.get(JOURNAL_OPERATION_KEY), raw);
    assert.equal(f.settings.size, 3);
  }
});

test('a validated explicit restore can recover a damaged recovery record', async () => {
  const f = fixture();
  f.records.set(JOURNAL_OPERATION_KEY, '{');
  await f.change('validated replacement');
  assert.equal(f.raw(), 'validated replacement');
  assert.equal(f.settings.size, 0);
  assert.equal(await f.restart().pending(), false);
});

test('a new confirmed restore can supersede a failed cleanup, including the same vault', async () => {
  const f = fixture();
  f.fail('photo-before');
  await assert.rejects(f.change('same vault replacement'), JournalRecoveryRequired);
  f.fail('');
  await f.change('same vault replacement');
  assert.equal(f.settings.size, 0);
  assert.equal(await f.restart().pending(), false);
});

test('read-only pending inspection cannot abandon another tab’s in-flight change', async () => {
  const f = fixture();
  f.fail('marker-write-after');
  await assert.rejects(f.change('new encrypted journal'));
  f.fail('');
  const before = f.records.get(JOURNAL_OPERATION_KEY);
  assert.equal(await f.restart().pending(), true);
  assert.equal(f.records.get(JOURNAL_OPERATION_KEY), before);
  assert.equal(f.settings.size, 3);
});

test('a second restore cannot lose the first restore’s unfinished cleanup obligation', async () => {
  const f = fixture();
  f.fail('biometrics-before');
  await assert.rejects(f.change('first replacement'), JournalRecoveryRequired);
  const intent = f.records.get(JOURNAL_OPERATION_KEY);
  f.fail('journal-before');
  // Cleanup of the committed first replacement finishes before another intent.
  await assert.rejects(f.change('second replacement'), /write failed/);
  assert.equal(f.raw(), 'first replacement');
  assert.equal(f.settings.size, 0);
  assert.equal(await f.restart().pending(), false);
  assert.ok(intent);
});

test('a rejected repair of a damaged marker remains gated until a replacement commits', async () => {
  const f = fixture();
  f.records.set(JOURNAL_OPERATION_KEY, '{');
  f.fail('journal-before');
  await assert.rejects(f.change('repair'), JournalRecoveryRequired);
  f.fail('');
  await assert.rejects(f.restart().resume(), JournalRecoveryRequired);
  assert.equal(f.raw(), 'old encrypted journal');
  assert.equal(f.settings.size, 3);
  await f.change('repair');
  assert.equal(f.raw(), 'repair');
  assert.equal(f.settings.size, 0);
  assert.equal(await f.restart().pending(), false);
});

test('Android deletion tombstone and journal intent both finish after file removal fails', async () => {
  const records = new Map<string, string>();
  const slots = new Map<string, string>();
  let fail = false;
  let cleaned = false;
  const storage: Storage = {
    async getItem(key) {
      return records.get(key) ?? null;
    },
    async setItem(key, value) {
      records.set(key, value);
    },
    async removeItem(key) {
      records.delete(key);
    },
  };
  const files = {
    async read(slot: 'a' | 'b') {
      return slots.get(slot) ?? null;
    },
    async write(slot: 'a' | 'b', value: string) {
      slots.set(slot, value);
    },
    async remove(slot: 'a' | 'b') {
      if (fail) throw new Error('file busy');
      slots.delete(slot);
    },
  };
  let journal = new FileJournalStorage(storage, files);
  const vault = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  await journal.setItem(STORAGE_KEY, seal(emptyJournal('2026-10-30'), vault, randomBytes));
  const recovery = () =>
    new JournalRecovery(
      storage,
      () => journal.getItem(STORAGE_KEY),
      async () => {
        cleaned = true;
      },
    );
  fail = true;
  await assert.rejects(
    recovery().change(null, () => journal.removeItem(STORAGE_KEY)),
    JournalRecoveryRequired,
  );
  assert.equal(cleaned, false);
  fail = false;
  journal = new FileJournalStorage(storage, files);
  assert.equal(await recovery().resume(), 'delete');
  assert.equal(cleaned, true);
  assert.equal(slots.size, 0);
  assert.equal(records.size, 0);
});
