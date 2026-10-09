import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { deleteEntry, undoEntryDeletion } from '../src/domain/deletion.ts';
import { emptyJournal, history, updateEntry } from '../src/domain/journal.ts';
import { JournalWriter, STORAGE_KEY, type Storage } from '../src/data/repository.ts';
import { newKey, openVault } from '../src/domain/vault.ts';

test('deleting a day removes its markers and Undo restores the complete entry without changing other days', () => {
  let journal = updateEntry(emptyJournal('2026-10-09'), '2026-10-01', {
    flow: 'heavy',
    periodStart: true,
    periodEnd: true,
    symptoms: ['Cramps', 'Custom'],
    cramps: 6,
    note: 'A fictional note',
  });
  journal = updateEntry(journal, '2026-10-02', { note: 'Keep this note' });
  journal = { ...journal, customSymptoms: ['Custom'] };
  const result = deleteEntry(journal, '2026-10-01')!;
  assert.equal(result.journal.entries['2026-10-01'], undefined);
  assert.deepEqual(history(result.journal, '2026-10-09'), []);
  assert.equal(result.journal.entries['2026-10-02']?.note, 'Keep this note');
  assert.deepEqual(result.journal.customSymptoms, ['Custom']);
  assert.deepEqual(undoEntryDeletion(result.journal, result.deleted), journal);
  assert.ok(journal.entries['2026-10-01'], 'the original snapshot was not mutated');
  assert.equal(deleteEntry(result.journal, '2026-10-01'), null);
});

test('Undo preserves newer entries and edits on other dates', () => {
  const original = updateEntry(emptyJournal('2026-10-09'), '2026-10-01', { note: 'Old' });
  const result = deleteEntry(original, '2026-10-01')!;
  const otherDay = updateEntry(result.journal, '2026-10-03', { note: 'New elsewhere' });
  assert.equal(
    undoEntryDeletion(otherDay, result.deleted).entries['2026-10-03']?.note,
    'New elsewhere',
  );
  const replaced = updateEntry(otherDay, '2026-10-01', { note: 'New on same day' });
  assert.equal(undoEntryDeletion(replaced, result.deleted), replaced);
});

test('whole-journal deletion waits for queued saves, removes only the vault, and rejects late writes', async () => {
  const vault = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  const values = new Map<string, string>([['unrelated-setting', 'preserve']]);
  const calls: string[] = [];
  let releaseWrite!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });
  const storage: Storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      await gate;
      values.set(key, value);
      calls.push('save');
    },
    removeItem: async (key) => {
      values.delete(key);
      calls.push('erase');
    },
  };
  const writer = new JournalWriter(storage, vault, randomBytes);
  const journal = emptyJournal('2026-10-09');
  const first = writer.save(journal);
  const last = writer.save(updateEntry(journal, '2026-10-09', { note: 'Queued' }));
  const erasing = writer.erase();
  assert.throws(() => writer.save(journal), /session/);
  releaseWrite();
  await Promise.all([first, last, erasing]);
  assert.deepEqual(calls, ['save', 'save', 'erase']);
  assert.equal(await storage.getItem(STORAGE_KEY), null);
  assert.equal(values.get('unrelated-setting'), 'preserve');
  assert.throws(() => writer.save(journal), /session/);
  await assert.rejects(writer.erase(), /session/);
  vault.key.fill(0);
});

test('deletion can follow a failed save; failed deletion keeps saving and retry available', async () => {
  const password = 'fictional deletion test passphrase';
  const vault = await newKey(password, randomBytes);
  let saved: string | null = null;
  let failWrite = true;
  let failErase = true;
  const storage: Storage = {
    getItem: async () => saved,
    setItem: async (_key, value) => {
      if (failWrite) throw new Error('write failed');
      saved = value;
    },
    removeItem: async () => {
      if (failErase) throw new Error('erase failed');
      saved = null;
    },
  };
  const writer = new JournalWriter(storage, vault, randomBytes);
  const journal = updateEntry(emptyJournal('2026-10-09'), '2026-10-09', {
    note: 'Retain on failure',
  });
  await assert.rejects(writer.save(journal), /write failed/);
  await assert.rejects(writer.erase(), /erase failed/);
  failWrite = false;
  await writer.save(journal);
  const reopened = await openVault(saved!, password);
  assert.deepEqual(reopened.journal, journal);
  reopened.vault.key.fill(0);
  failWrite = true;
  await assert.rejects(writer.save(journal), /write failed/);
  failErase = false;
  await writer.erase();
  assert.equal(saved, null);
  vault.key.fill(0);
});
