import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { FileJournalStorage, type VaultFiles } from '../src/data/fileJournalStorage.ts';
import { JournalWriter, STORAGE_KEY, type Storage } from '../src/data/repository.ts';
import { emptyEntry, emptyJournal, updateEntry } from '../src/domain/journal.ts';
import { MAX_BACKUP_BYTES, openVaultWithKey, seal } from '../src/domain/vault.ts';
import { addDays } from '../src/domain/dates.ts';

const vault = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
const first = seal(emptyJournal('2026-10-30'), vault, randomBytes);
const changed = updateEntry(emptyJournal('2026-10-30'), '2026-10-30', { note: 'Fictional edit' });
const second = seal(changed, vault, randomBytes);

function fixture() {
  const records = new Map<string, string>();
  const slots = new Map<string, string>();
  const faults = {
    write: false,
    truncate: false,
    read: false,
    metadataRead: false,
    commit: false,
    commitAfter: false,
    remove: false,
    removeMetadata: false,
  };
  const metadata: Storage = {
    async getItem(key) {
      if (faults.metadataRead) throw new Error('database read failed');
      const value = records.get(key) ?? null;
      if (value && value.length > 2 * 1024 * 1024) throw new Error('CursorWindow limit');
      return value;
    },
    async setItem(key, value) {
      if (faults.commit) throw new Error('database commit failed');
      if (value.length > 2 * 1024 * 1024) throw new Error('database value too large');
      records.set(key, value);
      if (faults.commitAfter) throw new Error('bridge failed after commit');
    },
    async removeItem(key) {
      if (faults.removeMetadata) throw new Error('metadata removal failed');
      records.delete(key);
    },
  };
  const files: VaultFiles = {
    async read(slot) {
      if (faults.read) throw new Error('file read failed');
      return slots.get(slot) ?? null;
    },
    async write(slot, value) {
      slots.set(slot, faults.write || faults.truncate ? value.slice(0, 40) : value);
      if (faults.write) throw new Error('interrupted file write');
    },
    async remove(slot) {
      if (faults.remove) throw new Error('file removal failed');
      slots.delete(slot);
    },
  };
  const restart = () => new FileJournalStorage(metadata, files);
  return { records, slots, faults, metadata, files, restart, store: restart() };
}

test('a real encrypted journal larger than Android database limits remains readable and portable', async () => {
  const f = fixture();
  const journal = emptyJournal('2026-10-30');
  for (let index = 0; index < 400; index++)
    journal.entries[addDays('2020-01-01', index)] = {
      ...emptyEntry(),
      note: 'Fictional '.repeat(800),
    };
  const raw = seal(journal, vault, randomBytes);
  assert.ok(raw.length > 6 * 1024 * 1024 && raw.length <= MAX_BACKUP_BYTES);
  await f.store.setItem(STORAGE_KEY, raw);
  assert.ok(f.records.get(STORAGE_KEY)!.length < 512);
  const recovered = await f.restart().getItem(STORAGE_KEY);
  assert.equal(recovered, raw, 'backup envelope is unchanged by storage');
  assert.deepEqual(
    openVaultWithKey(recovered!, vault),
    journal,
    'the existing biometric key still unlocks it',
  );
  assert.ok([...f.slots.values()].every((value) => !value.includes('Fictional')));
  assert.equal(f.slots.size, 1);
});

test('legacy data is read without mutation and migrates only after a verified save', async () => {
  const f = fixture();
  f.records.set(STORAGE_KEY, first);
  f.records.set('other-setting', 'untouched');
  assert.equal(await f.store.getItem(STORAGE_KEY), first);
  assert.equal(f.records.get(STORAGE_KEY), first);
  f.faults.write = true;
  await assert.rejects(f.store.setItem(STORAGE_KEY, second), /interrupted/);
  assert.equal(await f.restart().getItem(STORAGE_KEY), first);
  f.faults.write = false;
  await f.store.setItem(STORAGE_KEY, second);
  assert.equal(await f.restart().getItem(STORAGE_KEY), second);
  assert.equal(f.records.get('other-setting'), 'untouched');
  assert.ok(!f.records.get(STORAGE_KEY)!.includes('ciphertext'));
});

test('an interrupted inactive-slot write preserves the committed journal and remains retryable', async () => {
  const f = fixture();
  await f.store.setItem(STORAGE_KEY, first);
  const pointer = f.records.get(STORAGE_KEY);
  f.faults.write = true;
  await assert.rejects(f.store.setItem(STORAGE_KEY, second), /interrupted/);
  assert.equal(f.records.get(STORAGE_KEY), pointer);
  assert.equal(await f.restart().getItem(STORAGE_KEY), first);
  f.faults.write = false;
  await f.store.setItem(STORAGE_KEY, second);
  assert.equal(await f.restart().getItem(STORAGE_KEY), second);
});

test('failed first creation never exposes a partial journal after restart', async () => {
  const f = fixture();
  f.faults.write = true;
  await assert.rejects(f.store.setItem(STORAGE_KEY, first));
  assert.equal(await f.restart().getItem(STORAGE_KEY), null);
  f.faults.write = false;
  await f.store.setItem(STORAGE_KEY, first);
  assert.equal(await f.restart().getItem(STORAGE_KEY), first);
});

test('truncated writes and readback errors cannot advance the pointer', async () => {
  for (const failure of ['truncate', 'read'] as const) {
    const f = fixture();
    await f.store.setItem(STORAGE_KEY, first);
    const pointer = f.records.get(STORAGE_KEY);
    f.faults[failure] = true;
    await assert.rejects(f.store.setItem(STORAGE_KEY, second));
    assert.equal(f.records.get(STORAGE_KEY), pointer);
    f.faults[failure] = false;
    assert.equal(await f.restart().getItem(STORAGE_KEY), first);
  }
});

test('commit failures before and after persistence both leave a complete readable journal', async () => {
  for (const failure of ['commit', 'commitAfter'] as const) {
    const f = fixture();
    await f.store.setItem(STORAGE_KEY, first);
    f.faults[failure] = true;
    await assert.rejects(f.store.setItem(STORAGE_KEY, second));
    f.faults[failure] = false;
    assert.equal(await f.restart().getItem(STORAGE_KEY), failure === 'commit' ? first : second);
    await f.store.setItem(STORAGE_KEY, second);
    assert.equal(await f.store.getItem(STORAGE_KEY), second);
  }
});

test('old-file cleanup failures do not report a completed save as failed', async () => {
  const f = fixture();
  await f.store.setItem(STORAGE_KEY, first);
  f.faults.remove = true;
  await f.store.setItem(STORAGE_KEY, second);
  assert.equal(f.slots.size, 2);
  assert.equal(await f.restart().getItem(STORAGE_KEY), second);
  f.faults.remove = false;
  assert.equal(await f.restart().getItem(STORAGE_KEY), second);
  assert.equal(f.slots.size, 1);
});

test('missing or corrupted active files fail visibly instead of rolling back to older records', async () => {
  for (const missing of [false, true]) {
    const f = fixture();
    await f.store.setItem(STORAGE_KEY, first);
    f.faults.remove = true;
    await f.store.setItem(STORAGE_KEY, second);
    f.faults.remove = false;
    const active = JSON.parse(f.records.get(STORAGE_KEY)!).slot;
    if (missing) f.slots.delete(active);
    else f.slots.set(active, second.slice(0, -1) + 'x');
    await assert.rejects(f.restart().getItem(STORAGE_KEY), /could not be read/);
    await f.store.replace(first);
    assert.equal(await f.restart().getItem(STORAGE_KEY), first);
  }
});

test('corrupt or future metadata blocks normal saves; explicit restore can recover it', async () => {
  for (const raw of [
    '{broken',
    '{"format":"trifelle-vault-files","version":99}',
    '{"format":"trifelle-vault-files","version":1,"state":"active","slot":"../escape","bytes":1,"digest":"a"}',
  ]) {
    const f = fixture();
    f.records.set(STORAGE_KEY, raw);
    await assert.rejects(f.store.getItem(STORAGE_KEY));
    await assert.rejects(f.store.setItem(STORAGE_KEY, first));
    assert.equal(f.records.get(STORAGE_KEY), raw);
    assert.equal(f.slots.size, 0);
    await f.store.replace(first);
    assert.equal(await f.restart().getItem(STORAGE_KEY), first);
  }
});

test('confirmed backup restore can replace an unreadable oversized legacy database row', async () => {
  const f = fixture();
  f.records.set(STORAGE_KEY, 'x'.repeat(3 * 1024 * 1024));
  await assert.rejects(f.store.getItem(STORAGE_KEY), /CursorWindow/);
  await f.store.replace(second);
  assert.equal(await f.restart().getItem(STORAGE_KEY), second);
});

test('queued save/read/delete operations cannot expose a half-written file or resurrect a deleted journal', async () => {
  const f = fixture();
  let resume!: () => void;
  const gate = new Promise<void>((resolve) => {
    resume = resolve;
  });
  const write = f.files.write;
  f.files.write = async (slot, raw) => {
    await gate;
    await write(slot, raw);
  };
  const save = f.store.setItem(STORAGE_KEY, first);
  const read = f.store.getItem(STORAGE_KEY);
  const erase = f.store.removeItem(STORAGE_KEY);
  const readAfter = f.store.getItem(STORAGE_KEY);
  resume();
  await save;
  assert.equal(await read, first);
  await erase;
  assert.equal(await readAfter, null);
  assert.equal(f.slots.size, 0);
});

test('interrupted deletion persists a tombstone and completes cleanup after restart', async () => {
  for (const failure of ['remove', 'removeMetadata'] as const) {
    const f = fixture();
    await f.store.setItem(STORAGE_KEY, first);
    f.faults[failure] = true;
    await assert.rejects(f.store.removeItem(STORAGE_KEY));
    assert.equal(JSON.parse(f.records.get(STORAGE_KEY)!).state, 'deleted');
    await assert.rejects(f.restart().getItem(STORAGE_KEY));
    f.faults[failure] = false;
    assert.equal(await f.restart().getItem(STORAGE_KEY), null);
    assert.equal(f.slots.size, 0);
    assert.equal(f.records.has(STORAGE_KEY), false);
  }
});

test('a deletion commit failure leaves the original journal intact', async () => {
  const f = fixture();
  await f.store.setItem(STORAGE_KEY, first);
  f.faults.commit = true;
  await assert.rejects(f.store.removeItem(STORAGE_KEY));
  f.faults.commit = false;
  assert.equal(await f.restart().getItem(STORAGE_KEY), first);
});

test('invalid and oversized replacements leave existing data untouched', async () => {
  const f = fixture();
  await f.store.setItem(STORAGE_KEY, first);
  for (const raw of ['not encrypted', first + ' '.repeat(MAX_BACKUP_BYTES)])
    await assert.rejects(f.store.replace(raw));
  assert.equal(await f.restart().getItem(STORAGE_KEY), first);
  await assert.rejects(f.store.removeItem('other-setting'), /Unsupported/);
  assert.equal(await f.store.getItem(STORAGE_KEY), first);
});

test('JournalWriter uses the file backend for ordered saves, failure retry and complete deletion', async () => {
  const f = fixture();
  const writer = new JournalWriter(f.store, vault, randomBytes);
  await writer.save(emptyJournal('2026-10-30'));
  f.faults.commit = true;
  await assert.rejects(writer.save(changed));
  f.faults.commit = false;
  await writer.save(changed);
  await writer.flush();
  assert.deepEqual(openVaultWithKey((await f.restart().getItem(STORAGE_KEY))!, vault), changed);
  await writer.erase();
  assert.throws(() => writer.save(changed), /ended/);
  assert.equal(await f.restart().getItem(STORAGE_KEY), null);
  assert.equal(f.slots.size, 0);
});
