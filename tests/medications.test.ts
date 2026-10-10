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
import {
  dosesFor,
  medicationCSV,
  parseDoseRecords,
  parseMedications,
  parsePlan,
  plannedDoses,
  MAX_DOSE_RECORDS,
  type DoseInput,
  type MedicationPlan,
} from '../src/domain/medications.ts';
import {
  editDose,
  recordDose,
  removeDose,
  restoreDose,
  saveMedicationPlan,
} from '../src/domain/medicationActions.ts';
import { openVaultWithKey, seal } from '../src/domain/vault.ts';

const date = '2026-10-09';
const plan: MedicationPlan = {
  id: 'plan1',
  startsOn: '2026-10-01',
  name: 'Fictional medicine',
  kind: 'medication',
  dose: '1 test tablet',
  instructions: 'Example only',
  mode: 'daily',
  times: ['08:00', '20:00'],
  weekdays: [],
  onDays: null,
  offDays: null,
  offDose: null,
};
const medication = { id: 'medicine1', plans: [plan] };
const taken: DoseInput = {
  status: 'taken',
  actualDose: '1 test tablet',
  takenOn: date,
  actualTime: null,
  note: '',
};
function withPlan() {
  return saveMedicationPlan(emptyJournal(date), medication.id, plan, date);
}
function withDose() {
  const journal = withPlan();
  return recordDose(
    journal,
    date,
    date,
    plannedDoses(journal.medications, date)[0]!,
    'dose1',
    taken,
  );
}

test('versions 1–3 gain empty medication definitions and dose records without changing prior observations', () => {
  for (const version of [1, 2, 3]) {
    const { doseRecords: _doses, ...oldEntry } = { ...emptyEntry(), note: 'Older record' };
    const { medications: _medications, ...oldJournal } = emptyJournal(date);
    const raw = { ...oldJournal, version, entries: { [date]: oldEntry } };
    const original = JSON.stringify(raw);
    const migrated = parseJournal(raw);
    assert.equal(migrated.version, 6);
    assert.deepEqual(migrated.medications, []);
    assert.deepEqual(migrated.entries[date]?.doseRecords, []);
    assert.equal(migrated.entries[date]?.note, 'Older record');
    assert.equal(JSON.stringify(raw), original);
  }
  assert.throws(() => parseJournal({ ...emptyJournal(date), version: 7 }));
  assert.throws(() => parseJournal({ ...emptyJournal(date), medications: undefined }));
  assert.throws(() =>
    parseJournal({
      ...emptyJournal(date),
      entries: { [date]: { ...emptyEntry(), doseRecords: undefined } },
    }),
  );
});

test('medication imports validate bounded schedules, identities, times, and dates without coercion', () => {
  for (const patch of [
    { id: '' },
    { startsOn: '2026-02-29' },
    { name: ' ' },
    { dose: '' },
    { kind: 'drug' },
    { mode: 'sometimes' },
    { times: [] },
    { times: ['24:00'] },
    { times: ['08:00', '08:00'] },
    { times: Array.from({ length: 9 }, (_, i) => `0${i}:00`) },
    { mode: 'weekdays', weekdays: [] },
    { mode: 'weekdays', weekdays: [7] },
    { mode: 'weekdays', weekdays: [1, 1] },
    { mode: 'cycle', onDays: 0, offDays: 7 },
    { mode: 'cycle', onDays: '21', offDays: 7 },
    { mode: 'cycle', onDays: 21, offDays: 0 },
    { mode: 'as-needed' },
    { mode: 'paused' },
    { offDose: 'Unexpected' },
    { instructions: 'x'.repeat(501) },
  ])
    assert.throws(() => parsePlan({ ...plan, ...patch }), JSON.stringify(patch));
  assert.throws(() => parseMedications([medication, medication]));
  assert.throws(() =>
    parseMedications([{ ...medication, plans: [plan, { ...plan, id: 'next' }] }]),
  );
  assert.throws(() => parseMedications([{ ...medication, plans: [] }]));
  const parsed = parseMedications([
    { ...medication, unknown: true, plans: [{ ...plan, times: ['20:00', '08:00'], extra: true }] },
  ]);
  assert.deepEqual(parsed, [medication]);
  assert.notEqual(parsed[0]!.plans[0]!.times, plan.times);
});

test('daily and weekday schedules honor start dates, local dates, and explicit pause boundaries', () => {
  assert.deepEqual(dosesFor(medication, '2026-09-30'), []);
  assert.deepEqual(
    dosesFor(medication, date).map((dose) => dose.scheduledTime),
    ['08:00', '20:00'],
  );
  const weekly = { ...medication, plans: [{ ...plan, mode: 'weekdays' as const, weekdays: [5] }] };
  assert.equal(dosesFor(weekly, date).length, 2); // Friday
  assert.equal(dosesFor(weekly, '2026-10-10').length, 0);
  const paused = {
    ...medication,
    plans: [plan, { ...plan, id: 'pause', startsOn: date, mode: 'paused' as const, times: [] }],
  };
  assert.equal(dosesFor(paused, '2026-10-08').length, 2);
  assert.equal(dosesFor(paused, date).length, 0);
});

test('on/off cycles repeat across leap days and DST without inventing doses on off days', () => {
  const cycle = {
    ...medication,
    plans: [{ ...plan, startsOn: '2024-02-28', mode: 'cycle' as const, onDays: 2, offDays: 2 }],
  };
  assert.equal(dosesFor(cycle, '2024-02-29')[0]?.phase, 'on');
  assert.equal(dosesFor(cycle, '2024-03-01').length, 0);
  assert.equal(dosesFor(cycle, '2024-03-02').length, 0);
  assert.equal(dosesFor(cycle, '2024-03-03')[0]?.phase, 'on');
  cycle.plans[0]!.startsOn = '2026-10-31';
  assert.equal(dosesFor(cycle, '2026-11-01')[0]?.phase, 'on');
  assert.equal(dosesFor(cycle, '2026-11-02').length, 0);
  const pack = { ...cycle, plans: [{ ...cycle.plans[0]!, offDose: '1 fictional placebo' }] };
  assert.equal(dosesFor(pack, '2026-11-02')[0]?.dose, '1 fictional placebo');
  assert.equal(dosesFor(pack, '2026-11-02')[0]?.phase, 'off');
});

test('dated changes preserve past schedules and dose snapshots, with safe draft correction and pause/resume', () => {
  const before = withDose();
  const snapshot = JSON.stringify(before);
  const changed = saveMedicationPlan(
    before,
    medication.id,
    {
      ...plan,
      id: 'plan2',
      startsOn: '2026-10-10',
      name: 'Renamed example',
      dose: 'Changed label',
    },
    date,
  );
  assert.equal(dosesFor(changed.medications[0]!, date)[0]?.dose, '1 test tablet');
  assert.equal(dosesFor(changed.medications[0]!, '2026-10-10')[0]?.dose, 'Changed label');
  assert.deepEqual(changed.entries, before.entries);
  assert.equal(JSON.stringify(before), snapshot);
  assert.throws(
    () => saveMedicationPlan(before, medication.id, { ...plan, id: 'bad', startsOn: date }, date),
    /after 2026-10-09/,
  );
  assert.throws(
    () =>
      saveMedicationPlan(
        before,
        medication.id,
        { ...plan, id: 'bad', startsOn: '2026-10-08' },
        date,
      ),
    /today or later/,
  );
  const corrected = saveMedicationPlan(
    changed,
    medication.id,
    { ...plan, id: 'corrected', startsOn: '2026-10-10', dose: 'Corrected future label' },
    date,
  );
  assert.equal(corrected.medications[0]!.plans.length, 2);
  const paused = saveMedicationPlan(
    corrected,
    medication.id,
    { ...plan, id: 'pause', startsOn: '2026-10-11', mode: 'paused', times: [] },
    date,
  );
  const resumed = saveMedicationPlan(
    paused,
    medication.id,
    { ...plan, id: 'resume', startsOn: '2026-10-12' },
    date,
  );
  assert.equal(dosesFor(resumed.medications[0]!, '2026-10-11').length, 0);
  assert.equal(dosesFor(resumed.medications[0]!, '2026-10-12').length, 2);
});

test('scheduled dose logs prevent duplicates and future entries; unrecorded is never inferred skipped', () => {
  const original = withPlan();
  assert.deepEqual(original.entries, {});
  const target = plannedDoses(original.medications, date)[0]!;
  const logged = recordDose(original, date, date, target, 'dose', taken);
  assert.equal(hasEntry(logged.entries[date]), true);
  assert.deepEqual(history(logged, date), []);
  assert.equal(logged.entries[date]?.flowRecorded, false);
  assert.throws(
    () => recordDose(logged, date, date, target, 'duplicate', taken),
    /already has a record/,
  );
  assert.throws(
    () => recordDose(original, '2026-10-10', date, target, 'future', taken),
    /today or a past/,
  );
  assert.throws(
    () => recordDose(original, date, date, { ...target, planId: 'missing' }, 'stale', taken),
    /schedule changed/,
  );
  assert.throws(
    () =>
      recordDose(original, date, date, target, 'future-taken', { ...taken, takenOn: '2026-10-10' }),
    /date taken/,
  );
  const late = editDose(logged, date, '2026-10-10', 'dose', {
    ...taken,
    status: 'late',
    takenOn: '2026-10-10',
    actualTime: '00:05',
    actualDose: 'User-corrected amount',
  });
  assert.equal(late.entries[date]?.doseRecords[0]?.takenOn, '2026-10-10');
  assert.equal(late.entries[date]?.doseRecords[0]?.plannedDose, plan.dose);
  assert.equal(late.entries['2026-10-10'], undefined);
  const skipped = editDose(late, date, '2026-10-10', 'dose', {
    status: 'skipped',
    actualDose: '',
    takenOn: null,
    actualTime: null,
    note: 'Fictional reason',
  });
  assert.equal(skipped.entries[date]?.doseRecords[0]?.status, 'skipped');
  assert.throws(() => editDose(skipped, date, date, 'missing', taken), /no longer/);
});

test('as-needed use supports separate events and reasons without scheduled or missed-dose assumptions', () => {
  const journal = saveMedicationPlan(
    emptyJournal(date),
    'prn',
    { ...plan, id: 'prn-plan', mode: 'as-needed', times: [] },
    date,
  );
  const target = plannedDoses(journal.medications, date)[0]!;
  assert.equal(target.scheduledTime, null);
  const first = recordDose(journal, date, date, target, 'first', {
    ...taken,
    actualTime: '08:00',
    note: 'First fictional reason',
  });
  const second = recordDose(first, date, date, target, 'second', {
    ...taken,
    actualTime: '18:00',
    note: 'Second fictional reason',
  });
  assert.equal(second.entries[date]?.doseRecords.length, 2);
  assert.throws(() => recordDose(second, date, date, target, 'bad', { ...taken, status: 'late' }));
});

test('dose validation rejects malformed outcomes, duplicate IDs, and excessive logs', () => {
  const dose = withDose().entries[date]!.doseRecords[0]!;
  for (const patch of [
    { status: 'missed' },
    { actualTime: '25:00' },
    { takenOn: '2026-02-29' },
    { scheduledTime: null },
    { actualDose: '' },
    { phase: 'placebo' },
    { status: 'skipped' },
    { note: 'x'.repeat(501) },
  ])
    assert.throws(() => parseDoseRecords([{ ...dose, ...patch }]));
  assert.throws(() => parseDoseRecords([dose, { ...dose, scheduledTime: '20:00' }]));
  const many = Array.from({ length: MAX_DOSE_RECORDS + 1 }, (_, index) => ({
    ...dose,
    id: `dose${index}`,
    scheduledTime: null,
    phase: 'as-needed',
  }));
  assert.throws(() => parseDoseRecords(many));
  assert.deepEqual(parseDoseRecords([{ ...dose, unknown: true }]), [dose]);
});

test('dose and whole-entry removal/Undo preserve independent records and never overwrite newer data', () => {
  const journal = updateEntry(withDose(), date, { note: 'Keep me' });
  const record = journal.entries[date]!.doseRecords[0]!;
  const removed = removeDose(journal, date, record.id);
  assert.equal(removed.entries[date]?.note, 'Keep me');
  assert.deepEqual(restoreDose(removed, date, record), journal);
  assert.throws(() => restoreDose(journal, date, record));
  const whole = deleteEntry(journal, date)!;
  assert.deepEqual(undoEntryDeletion(whole.journal, whole.deleted), journal);
  assert.notEqual(whole.deleted.entry.doseRecords[0], record);
  record.note = 'Mutated original';
  assert.equal(whole.deleted.entry.doseRecords[0]?.note, '');
  assert.equal(whole.journal.medications.length, 1);
  const newer = updateEntry(whole.journal, date, { note: 'Newer entry' });
  assert.equal(undoEntryDeletion(newer, whole.deleted), newer);
});

test('encrypted backups keep full schedules and dose snapshots; legacy encrypted content still migrates', () => {
  const vault = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  const journal = withDose();
  const raw = seal(journal, vault, randomBytes);
  assert.deepEqual(openVaultWithKey(raw, vault), journal);
  assert.ok(!raw.includes('Fictional medicine'));
  const { medications: _meds, ...legacy } = emptyJournal(date);
  const migrated = openVaultWithKey(
    seal({ ...legacy, version: 3 } as unknown as Journal, vault, randomBytes),
    vault,
  );
  assert.equal(migrated.version, 6);
  assert.deepEqual(migrated.medications, []);
  vault.key.fill(0);
});

test('readable exports keep dose details and dated plans with formula-safe quoting and no inferred adherence', () => {
  const journal = editDose(withDose(), date, date, 'dose1', {
    ...taken,
    note: 'Reason, with "quotes"\nand a new line',
  });
  const csv = toCSV(journal);
  assert.ok(csv.includes('"Dose records"'));
  assert.ok(csv.includes('Planned: 1 test tablet · Scheduled 08:00 · Taken'));
  assert.ok(csv.includes('time not logged'));
  assert.ok(csv.includes('Reason, with ""quotes""\nand a new line'));
  assert.ok(!csv.includes('Skipped'));
  assert.ok(!csv.includes('20:00')); // unrecorded scheduled dose is not a dose record
  const schedules = medicationCSV([
    {
      ...medication,
      plans: [
        { ...plan, name: '=Fictional', instructions: '+Example' },
        { ...plan, id: 'paused', startsOn: date, mode: 'paused', times: [] },
      ],
    },
  ]);
  assert.ok(schedules.includes('"\'=Fictional"'));
  assert.ok(schedules.includes('"\'+Example"'));
  assert.ok(schedules.includes('Before 2026-10-09'));
  assert.ok(schedules.includes('Paused'));
});
