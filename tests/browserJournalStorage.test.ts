import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { BrowserJournalStorage, BROWSER_JOURNAL_GUARD } from '../src/data/browserJournalStorage.ts';
import { JournalRecovery, JournalRecoveryRequired } from '../src/data/journalRecovery.ts';
import { STORAGE_KEY, type Storage } from '../src/data/repository.ts';
import { emptyJournal, updateEntry } from '../src/domain/journal.ts';
import { seal, openVaultWithKey } from '../src/domain/vault.ts';
import { fictionalJournal } from '../scripts/fictional-journal.ts';

const key = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
const first = seal(emptyJournal('2026-10-31'), key, randomBytes);
const second = seal(
  updateEntry(emptyJournal('2026-10-31'), '2026-10-31', { note: 'Fictional latest edit' }),
  key,
  randomBytes,
);
function fixture(initial: string | null = first) {
  const records = new Map<string, string>();
  if (initial !== null) records.set(STORAGE_KEY, initial);
  let database: string | null = null;
  let fault = '';
  const events: string[] = [];
  const legacy: Storage = {
    async getItem(k) {
      if (fault === 'legacy-read') throw new Error('legacy read failed');
      return records.get(k) ?? null;
    },
    async setItem(k, v) {
      events.push('legacy-write');
      if (fault === 'guard-before') throw new Error('legacy write failed');
      records.set(k, v);
      if (fault === 'guard-after') throw new Error('reply failed');
    },
    async removeItem(k) {
      records.delete(k);
    },
  };
  const db = {
    async read() {
      events.push('database-read');
      if (fault === 'database-read' || (fault === 'readback' && database !== null))
        throw new Error('database read failed');
      return database;
    },
    async write(raw: string) {
      events.push('database-write');
      if (fault === 'write-before') throw new Error('transaction aborted');
      database = fault === 'altered-readback' ? raw + ' ' : raw;
      if (fault === 'write-after') throw new Error('reply failed after commit');
    },
  };
  const restart = () => new BrowserJournalStorage(legacy, db);
  return {
    records,
    legacy,
    events,
    restart,
    raw: () => database,
    setRaw: (raw: string | null) => {
      database = raw;
    },
    fail: (v: string) => {
      fault = v;
    },
  };
}

test('startup reads legacy ciphertext without migrating, clearing or repairing it', async () => {
  const f = fixture();
  assert.equal(await f.restart().getItem(STORAGE_KEY), first);
  assert.equal(f.raw(), null);
  assert.equal(f.records.get(STORAGE_KEY), first);
  assert.deepEqual(f.events, ['database-read']);
});

test('migration preserves exact ciphertext and verifies a committed read before replacing legacy data', async () => {
  const f = fixture();
  await f.restart().prepare();
  assert.deepEqual(f.events, ['database-read', 'database-write', 'database-read', 'legacy-write']);
  assert.equal(f.records.get(STORAGE_KEY), BROWSER_JOURNAL_GUARD);
  assert.equal(await f.restart().getItem(STORAGE_KEY), first);
  assert.deepEqual(
    openVaultWithKey((await f.restart().getItem(STORAGE_KEY))!, key),
    emptyJournal('2026-10-31'),
  );
});

for (const stage of [
  'database-read',
  'write-before',
  'write-after',
  'readback',
  'altered-readback',
  'guard-before',
]) {
  test(`migration at ${stage} never removes the legacy ciphertext before verification`, async () => {
    const f = fixture();
    f.fail(stage);
    await assert.rejects(f.restart().prepare());
    assert.equal(f.records.get(STORAGE_KEY), first);
    f.fail('');
    await f.restart().prepare();
    assert.equal(await f.restart().getItem(STORAGE_KEY), first);
    assert.equal(f.records.get(STORAGE_KEY), BROWSER_JOURNAL_GUARD);
  });
}

test('an interrupted guard write is recoverable and never produces an empty journal', async () => {
  const f = fixture();
  f.fail('guard-after');
  await assert.rejects(f.restart().prepare());
  f.fail('');
  await f.restart().prepare();
  assert.equal(await f.restart().getItem(STORAGE_KEY), first);
});

test('pending migration cannot fall back to a stale legacy journal before repair', async () => {
  const f = fixture();
  f.fail('guard-before');
  await assert.rejects(f.restart().replace(second));
  assert.equal(f.records.get(STORAGE_KEY), first);
  f.fail('');
  await assert.rejects(f.restart().getItem(STORAGE_KEY), /migration/);
  await f.restart().prepare();
  assert.equal(await f.restart().getItem(STORAGE_KEY), second);
});

test('a failed database read never falls back to the legacy copy or returns empty', async () => {
  for (const initial of [first, null]) {
    const f = fixture(initial);
    f.fail('database-read');
    await assert.rejects(f.restart().getItem(STORAGE_KEY), /database read failed/);
    assert.equal(f.records.get(STORAGE_KEY) ?? null, initial);
  }
});

test('a missing database after migration is an error, not new-journal onboarding', async () => {
  const f = fixture();
  await f.restart().prepare();
  f.setRaw(null);
  await assert.rejects(f.restart().getItem(STORAGE_KEY));
  await assert.rejects(f.restart().prepare());
  assert.equal(f.records.get(STORAGE_KEY), BROWSER_JOURNAL_GUARD);
  await f.restart().replace(second);
  assert.equal(await f.restart().getItem(STORAGE_KEY), second);
});

test('damage never silently rolls back to legacy data; confirmed restore can repair it', async () => {
  for (const damaged of [
    '{',
    '{"version":2}',
    JSON.stringify({
      format: 'trifelle-browser-journal',
      version: 1,
      state: 'active',
      vault: second,
      digest: '0'.repeat(64),
    }),
  ]) {
    const f = fixture();
    f.setRaw(damaged);
    await assert.rejects(f.restart().getItem(STORAGE_KEY), /could not be read/);
    await assert.rejects(f.restart().setItem(STORAGE_KEY, second));
    assert.equal(f.records.get(STORAGE_KEY), first);
    await f.restart().replace(second);
    assert.equal(await f.restart().getItem(STORAGE_KEY), second);
  }
});

test('a rejected normal write preserves the committed database journal', async () => {
  const f = fixture();
  await f.restart().prepare();
  f.fail('write-before');
  await assert.rejects(f.restart().setItem(STORAGE_KEY, second));
  assert.equal(await f.restart().getItem(STORAGE_KEY), first);
  f.fail('');
  await f.restart().setItem(STORAGE_KEY, second);
  assert.equal(await f.restart().getItem(STORAGE_KEY), second);
});

test('deletion retains a tombstone and cannot resurrect a leftover legacy copy', async () => {
  const f = fixture();
  await f.restart().prepare();
  await f.restart().removeItem(STORAGE_KEY);
  assert.equal(await f.restart().getItem(STORAGE_KEY), null);
  f.records.set(STORAGE_KEY, first); // Interrupted legacy cleanup / stale old app.
  await assert.rejects(f.restart().getItem(STORAGE_KEY), /migration/);
  await f.restart().prepare();
  assert.equal(await f.restart().getItem(STORAGE_KEY), null);
  assert.equal(f.records.get(STORAGE_KEY), BROWSER_JOURNAL_GUARD);
  assert.equal(f.raw()!.includes('ciphertext'), false);
  await f.restart().setItem(STORAGE_KEY, second);
  assert.equal(await f.restart().getItem(STORAGE_KEY), second);
});

test('restore cleanup waits for database commit and migration cleanup across restart', async () => {
  const f = fixture();
  let cleaned = false;
  let journal = f.restart();
  const recovery = () =>
    new JournalRecovery(
      f.legacy,
      () => journal.getItem(STORAGE_KEY),
      async () => {
        cleaned = true;
      },
    );
  // Fail the guard specifically, after the operation marker has already saved.
  await assert.rejects(
    recovery().change(second, async () => {
      f.fail('guard-before');
      await journal.replace(second);
    }),
    JournalRecoveryRequired,
  );
  assert.equal(cleaned, false);
  assert.equal(f.records.get(STORAGE_KEY), first);
  f.fail('');
  journal = f.restart();
  await journal.prepare();
  await recovery().resume();
  assert.equal(await journal.getItem(STORAGE_KEY), second);
  assert.equal(cleaned, true);
});

test('a near-limit fictional history round-trips without putting the ciphertext in localStorage', async () => {
  const f = fixture();
  const journal = fictionalJournal(4900);
  const encrypted = seal(journal, key, randomBytes);
  assert.ok(encrypted.length > 7.5 * 1024 * 1024);
  await f.restart().replace(encrypted);
  assert.deepEqual(openVaultWithKey((await f.restart().getItem(STORAGE_KEY))!, key), journal);
  assert.equal(f.records.get(STORAGE_KEY), BROWSER_JOURNAL_GUARD);
  assert.ok(BROWSER_JOURNAL_GUARD.length < 100);
});

test('operations serialize so an earlier save cannot reappear after deletion', async () => {
  const f = fixture();
  const store = f.restart();
  await Promise.all([store.setItem(STORAGE_KEY, second), store.removeItem(STORAGE_KEY)]);
  assert.equal(await store.getItem(STORAGE_KEY), null);
});

test('unrelated preferences and unsupported keys are never touched', async () => {
  const f = fixture(null);
  f.records.set('appearance', 'keep');
  await f.restart().prepare();
  assert.equal(await f.restart().getItem(STORAGE_KEY), null);
  assert.throws(() => f.restart().getItem('appearance'));
  assert.throws(() => f.restart().setItem('appearance', second));
  assert.throws(() => f.restart().removeItem('appearance'));
  await f.restart().setItem(STORAGE_KEY, first);
  await f.restart().removeItem(STORAGE_KEY);
  assert.equal(f.records.get('appearance'), 'keep');
});
