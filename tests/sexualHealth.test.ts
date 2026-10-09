import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  emptyEntry,
  emptyJournal,
  hasEntry,
  history,
  parseJournal,
  toCSV,
  updateEntry,
  type Journal,
} from '../src/domain/journal.ts';
import { deleteEntry, undoEntryDeletion } from '../src/domain/deletion.ts';
import { flowState } from '../src/domain/history.ts';
import {
  emptySexualHealth,
  emptySexualHealthExport,
  parseSexualHealth,
  SEXUAL_HEALTH_FIELDS,
  SEXUAL_HEALTH_LABELS,
  type SexualHealth,
} from '../src/domain/sexualHealth.ts';
import { openVaultWithKey, seal } from '../src/domain/vault.ts';

const day = '2026-10-09';
const observed: SexualHealth = {
  activity: true,
  intensity: 'gentle',
  orgasm: false,
  libido: 'high',
};
const withSexualHealth = (sexualHealth: unknown) => ({
  ...emptyJournal(day),
  entries: { [day]: { ...emptyEntry(), sexualHealth } },
});

test('version 1 and 2 migration leaves sexual-health observations unlogged while retaining existing data', () => {
  const { sexualHealth: _sexual, ...v2Entry } = {
    ...emptyEntry(),
    note: 'Legacy note',
    flooding: false,
    productRecords: [
      {
        id: 'legacy-pad',
        type: 'pad',
        action: 'changed',
        quantity: 1,
        time: '08:30',
        detail: 'Regular',
        collectedMl: null,
      },
    ],
  };
  const { productRecords: _products, clots: _clots, flooding: _flooding, ...v1Entry } = v2Entry;
  for (const version of [1, 2]) {
    const entry = version === 1 ? v1Entry : v2Entry;
    const legacy = { ...emptyJournal(day), version, entries: { [day]: entry } };
    const snapshot = JSON.stringify(legacy);
    const parsed = parseJournal(legacy);
    assert.equal(parsed.version, 3);
    assert.deepEqual(parsed.entries[day]?.sexualHealth, emptySexualHealth());
    assert.equal(parsed.entries[day]?.note, 'Legacy note');
    assert.equal(parsed.entries[day]?.flooding, version === 1 ? null : false);
    assert.equal(parsed.entries[day]?.productRecords.length, version === 1 ? 0 : 1);
    assert.equal(JSON.stringify(legacy), snapshot);
  }
  assert.throws(() => parseJournal({ ...emptyJournal(day), version: 4 }));
  assert.throws(() => parseJournal({ ...emptyJournal(day), entries: { [day]: v2Entry } }));
});

test('current sexual-health data requires known nullable values and discards unknown keys', () => {
  assert.deepEqual(parseSexualHealth({ ...observed, unknown: 'discard' }), observed);
  for (const bad of [undefined, null, [], '', false])
    assert.throws(() => parseJournal(withSexualHealth(bad)));
  for (const field of SEXUAL_HEALTH_FIELDS) {
    for (const bad of [undefined, 0, 1, 'YES', '', {}, []])
      assert.throws(() => parseJournal(withSexualHealth({ ...observed, [field]: bad })));
  }
  assert.throws(() => parseSexualHealth({ ...observed, intensity: 'high' }));
  assert.throws(() => parseSexualHealth({ ...observed, libido: 'gentle' }));
  assert.deepEqual(parseSexualHealth(emptySexualHealth()), emptySexualHealth());
});

test('No and None retain a logged day without inferring activity, flow, or cycle boundaries', () => {
  for (const patch of [
    { activity: false },
    { orgasm: false },
    { libido: 'none' as const },
    { intensity: 'moderate' as const },
  ]) {
    const journal = updateEntry(emptyJournal(day), day, {
      sexualHealth: { ...emptySexualHealth(), ...patch },
    });
    assert.equal(hasEntry(journal.entries[day]), true);
    assert.equal(flowState(journal.entries[day]), 'unknown');
    assert.deepEqual(history(journal, day), []);
    assert.deepEqual(journal.entries[day]?.sexualHealth, { ...emptySexualHealth(), ...patch });
  }
  let journal = updateEntry(emptyJournal(day), day, {
    sexualHealth: observed,
    note: 'Retain me',
    flow: 'heavy',
    periodStart: true,
  });
  journal = updateEntry(journal, day, { sexualHealth: { ...observed, activity: null } });
  assert.deepEqual(journal.entries[day]?.sexualHealth, { ...observed, activity: null });
  journal = updateEntry(journal, day, { flow: 'none', flowRecorded: false });
  assert.equal(journal.entries[day]?.sexualHealth.orgasm, false);
  journal = updateEntry(journal, day, { sexualHealth: emptySexualHealth() });
  assert.equal(journal.entries[day]?.note, 'Retain me');
  journal = updateEntry(journal, day, { note: '' });
  assert.equal(journal.entries[day], undefined);
});

test('whole-entry deletion and Undo preserve an independent complete sexual-health snapshot', () => {
  const journal = updateEntry(emptyJournal(day), day, { sexualHealth: observed });
  assert.notEqual(journal.entries[day]!.sexualHealth, observed);
  const removed = deleteEntry(journal, day)!;
  assert.deepEqual(undoEntryDeletion(removed.journal, removed.deleted), journal);
  assert.notEqual(removed.deleted.entry.sexualHealth, journal.entries[day]!.sexualHealth);
  journal.entries[day]!.sexualHealth.libido = 'low';
  assert.equal(removed.deleted.entry.sexualHealth.libido, 'high');
  const newer = updateEntry(removed.journal, day, {
    sexualHealth: { ...emptySexualHealth(), activity: false },
  });
  assert.equal(undoEntryDeletion(newer, removed.deleted), newer);
});

test('encrypted backups always preserve all observations regardless of readable export selections', () => {
  const vault = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  const journal = updateEntry(emptyJournal(day), day, { sexualHealth: observed });
  const before = JSON.stringify(journal);
  const csv = toCSV(journal);
  assert.equal(csv.split('\r\n').length, 1);
  assert.equal(JSON.stringify(journal), before);
  assert.deepEqual(openVaultWithKey(seal(journal, vault, randomBytes), vault), journal);
  const { sexualHealth: _value, ...legacyEntry } = journal.entries[day]!;
  const legacy = { ...journal, version: 2, entries: { [day]: legacyEntry } };
  const migrated = openVaultWithKey(seal(legacy as unknown as Journal, vault, randomBytes), vault);
  assert.deepEqual(migrated.entries[day]?.sexualHealth, emptySexualHealth());
  assert.equal(migrated.version, 3);
  vault.key.fill(0);
});

test('all 16 CSV field combinations export only selected columns and omit dates with only excluded data', () => {
  const values = { activity: false, intensity: 'gentle', orgasm: true, libido: 'none' } as const;
  const rendered = { activity: 'No', intensity: 'Gentle', orgasm: 'Yes', libido: 'None' };
  let journal = emptyJournal(day);
  SEXUAL_HEALTH_FIELDS.forEach((field, index) => {
    journal = updateEntry(journal, `2026-10-0${index + 1}`, {
      sexualHealth: { ...emptySexualHealth(), [field]: values[field] },
    });
  });
  journal = updateEntry(journal, '2026-10-05', {
    note: 'Keep common note',
    sexualHealth: observed,
  });
  journal = updateEntry(journal, '2026-10-06', { flow: 'none' });
  const unchanged = JSON.stringify(journal);
  for (let mask = 0; mask < 16; mask++) {
    const include = emptySexualHealthExport();
    SEXUAL_HEALTH_FIELDS.forEach((field, index) => {
      include[field] = !!(mask & (1 << index));
    });
    // This fixture has no commas/quotes/newlines in values, so simple splitting is sufficient here.
    const rows = toCSV(journal, include)
      .split('\r\n')
      .map((line) => line.split(',').map((cell) => cell.slice(1, -1)));
    const fields = SEXUAL_HEALTH_FIELDS.filter((field) => include[field]);
    assert.deepEqual(
      rows[0]!.slice(11),
      fields.map((field) => SEXUAL_HEALTH_LABELS[field]),
    );
    assert.equal(rows.length, fields.length + 3);
    SEXUAL_HEALTH_FIELDS.forEach((field, index) => {
      const row = rows.find((value) => value[0] === `2026-10-0${index + 1}`);
      if (!include[field]) assert.equal(row, undefined);
      else assert.equal(row![11 + fields.indexOf(field)], rendered[field]);
    });
    const flowOnly = rows.find((row) => row[0] === '2026-10-06')!;
    assert.deepEqual(
      flowOnly.slice(11),
      fields.map(() => ''),
    );
    assert.ok(rows.some((row) => row[0] === '2026-10-05'));
  }
  assert.equal(JSON.stringify(journal), unchanged);
  assert.equal(toCSV(journal), toCSV(journal, emptySexualHealthExport()));
  assert.equal(toCSV(journal, { libido: 'yes' } as never), toCSV(journal));
});

test('CSV controls do not silently redact free-text notes or symptom labels', () => {
  const journal = updateEntry(emptyJournal(day), day, {
    note: '=A fictional note about sexual health',
    symptoms: ['High libido'],
    sexualHealth: observed,
  });
  const csv = toCSV(journal);
  assert.ok(csv.includes('"\'=A fictional note about sexual health"'));
  assert.ok(csv.includes('"High libido"'));
  assert.ok(!csv.split('\r\n')[0]!.includes('Sexual activity'));
  const defaults = emptySexualHealthExport();
  defaults.libido = true;
  assert.deepEqual(emptySexualHealthExport(), {
    activity: false,
    intensity: false,
    orgasm: false,
    libido: false,
  });
});
