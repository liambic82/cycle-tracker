import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  emptyJournal,
  emptyEntry,
  parseJournal,
  updateEntry,
  toCSV,
} from '../src/domain/journal.ts';
import {
  emptyDailyDetails,
  parseDailyDetails,
  dailyFromInput,
  DAILY_NUMBERS,
  dailyDetailsHistory,
  type DailyNumber,
} from '../src/domain/dailyDetails.ts';
import {
  emptyMedicalRecord,
  parseMedicalRecord,
  parseAttachment,
  saveMedicalRecord,
  medicalCSV,
  MAX_ATTACHMENT_BYTES,
} from '../src/domain/medicalRecords.ts';
import {
  parsePersonalReminder,
  savePersonalReminder,
  reminderOccurs,
  type PersonalReminder,
} from '../src/domain/personalReminders.ts';
import {
  parseJournalCSV,
  parseCSV,
  historicalPeriodRows,
  importRowState,
  applyImportRows,
  CSV_TEMPLATE,
} from '../src/domain/journalImport.ts';
import { planReminders } from '../src/domain/reminders.ts';
import {
  ReminderService,
  type ReminderBackend,
  type ReminderPermission,
} from '../src/data/reminderService.ts';
import { deleteEntry, undoEntryDeletion } from '../src/domain/deletion.ts';
import {
  defaultReportOptions,
  createDoctorReport,
  REPORT_SECTIONS,
  type ReportSectionKey,
} from '../src/domain/report.ts';
import { periodEstimate } from '../src/domain/periodEstimate.ts';
import { seal, openVaultWithKey } from '../src/domain/vault.ts';
import { demoJournal } from '../src/data/demo.ts';
import {
  reviewPastMedicationPlan,
  applyPastMedicationPlan,
} from '../src/domain/medicationActions.ts';
import { addDays } from '../src/domain/dates.ts';
const today = '2026-10-11';

test('reviewed past medication correction preserves dose snapshots and later plan boundaries', () => {
  const journal = demoJournal(today),
    med = journal.medications[0]!,
    original = med.plans[0]!;
  const later = { ...original, id: 'later-plan', startsOn: addDays(today, 5), dose: 'Future dose' };
  med.plans.push(later);
  const draft = {
    ...original,
    id: 'correction',
    startsOn: addDays(today, -2),
    dose: 'Corrected plan',
  };
  const before = JSON.stringify(journal.entries),
    review = reviewPastMedicationPlan(journal, med.id, draft, today);
  assert.equal(review.affectedCount, 1);
  assert.equal(review.nextStart, later.startsOn);
  const result = applyPastMedicationPlan(journal, review, today);
  assert.equal(JSON.stringify(result.entries), before);
  assert.equal(result.medications[0]!.plans.at(-1)!.dose, 'Future dose');
  assert.equal(result.medications[0]!.plans.length, 3);
  assert.equal(journal.medications[0]!.plans.length, 2);
  const stale = {
    ...journal,
    entries: { ...journal.entries, [today]: { ...journal.entries[today]!, doseRecords: [] } },
  };
  assert.throws(() => applyPastMedicationPlan(stale, review, today), /changed/);
  assert.throws(() =>
    reviewPastMedicationPlan(journal, med.id, { ...draft, startsOn: addDays(today, 1) }, today),
  );
});
test('same-date past correction replaces a plan once and rejects a stale schedule review', () => {
  const journal = demoJournal(today),
    med = journal.medications[0]!;
  const review = reviewPastMedicationPlan(
    journal,
    med.id,
    { ...med.plans[0]!, id: 'replacement', dose: 'Corrected' },
    today,
  );
  const next = applyPastMedicationPlan(journal, review, today);
  assert.equal(next.medications[0]!.plans.length, 1);
  assert.equal(next.medications[0]!.plans[0]!.dose, 'Corrected');
  assert.throws(() => applyPastMedicationPlan(next, review, today), /changed/);
});
const observed = {
  ...emptyDailyDetails(),
  painLocations: ['Lower back'],
  hotFlashes: 0,
  energy: 6,
  weight: 130.25,
  weightUnit: 'lb' as const,
  temperature: 97.25,
  temperatureUnit: 'F' as const,
  lhTest: 'positive' as const,
  context: 'Private context',
};
const lab = () => ({
  ...emptyMedicalRecord('lab1', 'lab', today),
  title: 'Fictional test',
  value: '<5',
  unit: 'example units',
  reference: 'Lab-provided text',
});
const reminder = (): PersonalReminder => ({
  id: 'personal-test',
  kind: 'patch',
  title: 'Private care plan',
  startsOn: today,
  endsOn: null,
  time: '20:00',
  everyDays: 7,
  paused: false,
  completed: [],
});

test('backup reminder identifiers cannot collide with medication identifiers', () => {
  const journal = demoJournal(today);
  journal.medications[0]!.id = 'personal-test';
  journal.personalReminders = [reminder()];
  assert.throws(() => parseJournal(journal));
});
test('all seven prior journal formats migrate without inventing daily, medical or reminder records', () => {
  const source = demoJournal(today);
  for (const version of [1, 2, 3, 4, 5, 6, 7]) {
    const { medicalRecords: _m, personalReminders: _p, ...rest } = source;
    const legacy = {
      ...rest,
      version,
      entries: Object.fromEntries(
        Object.entries(source.entries).map(([date, e]) => {
          const { dailyDetails: _d, ...entry } = e;
          return [date, entry];
        }),
      ),
    };
    const before = JSON.stringify(legacy),
      parsed = parseJournal(legacy);
    assert.equal(parsed.version, 9);
    assert.equal(JSON.stringify(legacy), before);
    assert.deepEqual(parsed.medicalRecords, []);
    assert.deepEqual(parsed.personalReminders, []);
    for (const [date, e] of Object.entries(parsed.entries)) {
      assert.deepEqual(e.dailyDetails, emptyDailyDetails());
      assert.equal(e.note, source.entries[date]!.note);
      if (version >= 6) assert.deepEqual(e.sleep, source.entries[date]!.sleep);
      if (version >= 7) assert.deepEqual(e.sleepImports, source.entries[date]!.sleepImports);
    }
  }
});
test('daily schema rejects malformed units, numeric coercion, duplicate locations and unknown choices', () => {
  assert.deepEqual(parseDailyDetails(observed), observed);
  for (const patch of [
    { hotFlashes: -1 },
    { hotFlashes: 0.5 },
    { energy: 11 },
    { energy: '5' },
    { weight: 0 },
    { weight: 12.345 },
    { systolic: NaN },
    { temperature: Infinity },
    { weightUnit: ['lb'] },
    { mucus: 'unrecognized' },
    { painLocations: ['Head', ' head'] },
    { painLocations: [''] },
    { context: 'x'.repeat(2001) },
  ])
    assert.throws(() => parseDailyDetails({ ...observed, ...patch }));
  assert.throws(() =>
    parseJournal({
      ...emptyJournal(today),
      entries: { [today]: { ...emptyEntry(), dailyDetails: null } },
    }),
  );
});
test('form input keeps blanks and zero distinct and requires unambiguous decimal input', () => {
  const input = Object.fromEntries(Object.keys(DAILY_NUMBERS).map((k) => [k, ''])) as Record<
    DailyNumber,
    string
  >;
  assert.deepEqual(dailyFromInput(input, emptyDailyDetails()), emptyDailyDetails());
  assert.equal(
    dailyFromInput({ ...input, hotFlashes: '0', temperature: '36.55' }, emptyDailyDetails())
      .temperature,
    36.55,
  );
  for (const n of ['1e2', '0x10', '1,5', '+5', '5 0'])
    assert.throws(() => dailyFromInput({ ...input, weight: n }, emptyDailyDetails()));
});
test('daily-only entries survive, clearing removes empty dates, and delete Undo owns its arrays', () => {
  const journal = updateEntry(emptyJournal(today), today, { dailyDetails: observed });
  assert.ok(journal.entries[today]);
  assert.equal(journal.entries[today]!.flowRecorded, false);
  const removed = deleteEntry(journal, today)!;
  journal.entries[today]!.dailyDetails.painLocations.push('Head');
  assert.deepEqual(removed.deleted.entry.dailyDetails.painLocations, ['Lower back']);
  assert.deepEqual(
    undoEntryDeletion(removed.journal, removed.deleted).entries[today]!.dailyDetails.painLocations,
    ['Lower back'],
  );
  assert.equal(
    updateEntry(journal, today, { dailyDetails: emptyDailyDetails() }).entries[today],
    undefined,
  );
});
test('daily history has inclusive dates, excludes future entries, and retains units without averaging', () => {
  let j = emptyJournal(today);
  for (const offset of [-30, -29, 0, 1])
    j = updateEntry(j, addDays(today, offset), { dailyDetails: observed });
  const rows = dailyDetailsHistory(j, today, 30);
  assert.deepEqual(
    rows.map((x) => x.date),
    [today, addDays(today, -29)],
  );
  assert.equal(rows[0]!.details.weightUnit, 'lb');
  rows[0]!.details.painLocations.push('other');
  assert.equal(j.entries[today]!.dailyDetails.painLocations.length, 1);
});
test('readable CSV opts test observations in separately and omits test-only dates when excluded', () => {
  const date = addDays(today, -1);
  let j = updateEntry(emptyJournal(today), date, {
    dailyDetails: { ...emptyDailyDetails(), pregnancyTest: 'positive' },
  });
  j = updateEntry(j, today, { dailyDetails: { ...emptyDailyDetails(), hotFlashes: 0 } });
  const hidden = toCSV(j);
  assert.ok(!hidden.includes(date));
  assert.ok(!hidden.includes('Pregnancy test'));
  assert.ok(hidden.includes('Hot flashes: 0'));
  const shown = toCSV(j, {}, true);
  assert.ok(shown.includes(date));
  assert.ok(shown.includes('Pregnancy test: positive'));
  assert.ok(!shown.includes('Sexual activity'));
});
test('medical records validate kinds, dates, attachment signatures and storage bounds', () => {
  assert.deepEqual(parseMedicalRecord(lab()), lab());
  for (const patch of [
    { date: null },
    { value: '' },
    { time: '24:30' },
    { kind: 'unknown' },
    { title: '' },
    { attachments: [{}] },
    { resolved: 'yes' },
  ])
    assert.throws(() => parseMedicalRecord({ ...lab(), ...patch }));
  const pdf = {
    id: 'file1',
    name: 'fictional.pdf',
    mime: 'application/pdf',
    hex: Buffer.from('%PDF-1.7\n%%EOF').toString('hex'),
  };
  assert.equal(parseAttachment(pdf).mime, 'application/pdf');
  for (const patch of [
    { id: '../file' },
    { mime: 'text/html' },
    { hex: '00'.repeat(30) },
    { hex: '25'.repeat(MAX_ATTACHMENT_BYTES + 1) },
  ])
    assert.throws(() => parseAttachment({ ...pdf, ...patch }));
  assert.throws(() =>
    saveMedicalRecord(emptyJournal(today), { ...lab(), date: addDays(today, 1) }, today),
  );
  assert.doesNotThrow(() =>
    saveMedicalRecord(
      emptyJournal(today),
      { ...emptyMedicalRecord('visit', 'appointment', addDays(today, 2)), title: 'Upcoming' },
      today,
    ),
  );
});
test('medical edits preserve unrelated journal data and encrypted backups retain exact attachment bytes', () => {
  const key = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  const base = updateEntry(emptyJournal(today), today, { dailyDetails: observed, note: 'Keep' });
  const attachment = parseAttachment({
    id: 'file1',
    name: 'fictional.pdf',
    mime: 'application/pdf',
    hex: Buffer.from('%PDF-1.7\n%%EOF').toString('hex'),
  });
  let j = saveMedicalRecord(base, { ...lab(), attachments: [attachment] }, today);
  j = savePersonalReminder(j, reminder());
  const restored = openVaultWithKey(seal(j, key, randomBytes), key);
  assert.deepEqual(restored, j);
  const changed = saveMedicalRecord(j, { ...j.medicalRecords[0]!, value: '6' }, today);
  assert.equal(changed.medicalRecords.length, 1);
  assert.equal(j.medicalRecords[0]!.value, '<5');
  assert.deepEqual(changed.entries, base.entries);
  assert.ok(!medicalCSV(changed.medicalRecords).includes(attachment.hex));
});
test('oversized medical attachment additions fail before mutating the journal', () => {
  const j = emptyJournal(today);
  for (let i = 0; i < 400; i++)
    j.entries[addDays(today, -i)] = { ...emptyEntry(), note: 'x'.repeat(10000) };
  const before = JSON.stringify(j);
  const attachment = parseAttachment({
    id: 'large',
    name: 'sample.pdf',
    mime: 'application/pdf',
    hex: '255044462d' + '00'.repeat(200000),
  });
  assert.throws(
    () => saveMedicalRecord(j, { ...lab(), attachments: [attachment] }, today),
    /size limit/,
  );
  assert.equal(JSON.stringify(j), before);
});
test('doctor summaries separately filter observations, tests, medical records, dates and notes', () => {
  let j = updateEntry(emptyJournal(today), today, { dailyDetails: observed });
  j = saveMedicalRecord(j, { ...lab(), detail: 'SECRET NOTE' }, today);
  j = saveMedicalRecord(
    j,
    { ...lab(), id: 'old', date: addDays(today, -5), title: 'OLD LAB' },
    today,
  );
  j = saveMedicalRecord(
    j,
    { ...emptyMedicalRecord('undated', 'allergy', null), title: 'UNDATED ALLERGY' },
    today,
  );
  const options = defaultReportOptions(today);
  options.from = today;
  for (const key of Object.keys(REPORT_SECTIONS) as ReportSectionKey[])
    options.sections[key] = key === 'observations';
  let text = JSON.stringify(createDoctorReport(j, options, today));
  assert.ok(text.includes('Hot flashes: 0'));
  assert.ok(!text.includes('LH test: positive'));
  assert.ok(!text.includes('Private context'));
  assert.ok(!text.includes('Fictional test'));
  options.sections.tests = true;
  options.sections.medical = true;
  text = JSON.stringify(createDoctorReport(j, options, today));
  assert.ok(text.includes('LH test: positive'));
  assert.ok(text.includes('Fictional test'));
  assert.ok(text.includes('UNDATED ALLERGY'));
  assert.ok(!text.includes('OLD LAB'));
  assert.ok(!text.includes('SECRET NOTE'));
  options.sections.notes = true;
  assert.ok(JSON.stringify(createDoctorReport(j, options, today)).includes('SECRET NOTE'));
});
test('care reminder recurrence, end dates, pause and completed occurrences are independent', () => {
  const p = parsePersonalReminder(reminder());
  assert.ok(reminderOccurs(p, today));
  assert.equal(reminderOccurs(p, addDays(today, 1)), false);
  assert.ok(reminderOccurs(p, addDays(today, 7)));
  assert.equal(reminderOccurs({ ...p, endsOn: today }, addDays(today, 7)), false);
  assert.equal(reminderOccurs({ ...p, paused: true }, today), false);
  assert.equal(reminderOccurs({ ...p, completed: [today] }, today), false);
  assert.throws(() => parsePersonalReminder({ ...p, everyDays: 0 }));
  assert.throws(() => parsePersonalReminder({ ...p, completed: [addDays(today, 1)] }));
  assert.throws(() => parsePersonalReminder({ ...p, time: '25:00' }));
  assert.equal(reminderOccurs({ ...p, everyDays: null }, addDays(today, 7)), false);
});
test('care reminders share bounded generic queue, suppress completed and logged journal occurrences', () => {
  let j = savePersonalReminder(emptyJournal(today), {
    ...reminder(),
    kind: 'journal',
    everyDays: 1,
  });
  const now = new Date(2026, 9, 11, 8);
  assert.equal(planReminders(j, [], now).count, 0);
  const all = planReminders(j, ['personal-test'], now);
  assert.equal(all.count, 30);
  assert.ok(!JSON.stringify(all).includes('Private care plan'));
  j = updateEntry(j, today, { dailyDetails: observed });
  assert.equal(planReminders(j, ['personal-test'], now).count, 29);
  j = savePersonalReminder(j, { ...reminder(), completed: [today] });
  assert.ok(
    planReminders(j, ['personal-test'], now).notifications.every(
      (x) => x.kind === 'refresh' || new Date(x.at).getDate() !== 11,
    ),
  );
});
test('personal and medication notifications at one time coalesce and never exceed the shared cap', () => {
  let j = demoJournal(today);
  j = savePersonalReminder(j, { ...reminder(), time: '08:00', everyDays: 1 });
  const p = j.medications[0]!.plans[0]!;
  p.times = ['08:00', '09:00', '10:00'];
  j.entries = {};
  const result = planReminders(
    j,
    [j.medications[0]!.id, 'personal-test'],
    new Date(2026, 9, 11, 7),
  );
  assert.equal(result.count, 60);
  assert.equal(new Set(result.notifications.map((x) => x.at)).size, result.notifications.length);
  assert.ok(result.refreshAt !== null);
});
test('care reminder opt-ins require permission and reset on restore/clear; removing plans cancels alerts', async () => {
  const data = new Map<string, string>();
  const pending = new Map();
  let permission: ReminderPermission = 'denied';
  const backend: ReminderBackend = {
    available: true,
    permission: async () => permission,
    list: async () => [...pending.keys()],
    schedule: async (r) => {
      pending.set(r.id, r);
    },
    cancel: async (id) => {
      pending.delete(id);
    },
    dismissObsolete: async () => {},
    clear: async () => {
      pending.clear();
    },
  };
  const service = new ReminderService(
    {
      getItem: async (k) => data.get(k) ?? null,
      setItem: async (k, v) => {
        data.set(k, v);
      },
      removeItem: async (k) => {
        data.delete(k);
      },
    },
    backend,
    () => new Date(2026, 9, 11, 8),
  );
  const j = savePersonalReminder(emptyJournal(today), reminder());
  await assert.rejects(service.setEnabled('vault', j, 'personal-test', true));
  permission = 'granted';
  assert.equal(
    (await service.setEnabled('vault', j, 'personal-test', true)).enabled[0],
    'personal-test',
  );
  assert.ok(pending.size > 0);
  await service.sync('vault', { ...j, personalReminders: [] });
  assert.equal(pending.size, 0);
  await service.clear();
  assert.equal((await service.sync('vault', j)).enabled.length, 0);
});
test('CSV import accepts exact quoted template, rejects malformed headers, future and duplicate dates', () => {
  const text =
    'Format,Date,Flow,Period start,Period end,Symptoms,Note\r\ncycle-simple-v1,2026-10-10,medium,true,false,Cramps,"line one\nline two, with ""quotes"""';
  const rows = parseJournalCSV(text, today);
  assert.equal(rows[0]!.note, 'line one\nline two, with "quotes"');
  assert.equal(rows[0]!.start, true);
  for (const bad of [
    text.replace('Format', 'Other'),
    text.replace('2026-10-10', '2027-10-10'),
    text + '\n' + text.split('\r\n')[1],
    text.replace(',medium,', ',spotting,'),
    text + '"',
  ])
    assert.throws(() => parseJournalCSV(bad, today));
  assert.throws(() => parseCSV('"a"x,b'));
  assert.throws(() => parseCSV('"unfinished'));
  assert.ok(parseJournalCSV(CSV_TEMPLATE, today).length);
});
test('imports merge only supplied observations, skip duplicates, reject conflicts and preserve all other fields', () => {
  let j = updateEntry(emptyJournal(today), today, {
    dailyDetails: observed,
    sleep: { durationMinutes: 450, quality: 'good', wakings: 1 },
    symptoms: ['Fatigue'],
  });
  const row = {
    date: today,
    flow: 'medium' as const,
    start: true,
    end: false,
    symptoms: ['Cramps'],
    note: 'Imported note',
  };
  assert.equal(importRowState(j, row), 'merge');
  const next = applyImportRows(j, [row], today);
  assert.deepEqual(next.entries[today]!.dailyDetails, observed);
  assert.deepEqual(next.entries[today]!.symptoms, ['Fatigue', 'Cramps']);
  assert.deepEqual(next.entries[today]!.sleep, j.entries[today]!.sleep);
  assert.equal(importRowState(next, row), 'unchanged');
  assert.deepEqual(applyImportRows(next, [row], today), next);
  const before = JSON.stringify(next);
  assert.throws(() => applyImportRows(next, [{ ...row, note: 'conflict' }], today));
  assert.equal(JSON.stringify(next), before);
});
test('historical period helper supplies boundaries only without inventing intermediate daily flow', () => {
  const rows = historicalPeriodRows(addDays(today, -6), addDays(today, -2), 'light', today);
  assert.equal(rows.length, 2);
  const j = applyImportRows(emptyJournal(today), rows, today);
  assert.equal(Object.keys(j.entries).length, 2);
  assert.equal(j.entries[addDays(today, -5)], undefined);
  assert.equal(historicalPeriodRows(today, today, 'heavy', today)[0]!.end, true);
  assert.throws(() => historicalPeriodRows(today, addDays(today, -1), 'medium', today));
  assert.throws(() => historicalPeriodRows(today, null, 'spotting', today));
});
test('explicit skipped-cycle observation withholds estimates without altering recorded starts', () => {
  const base = demoJournal(today),
    review = { enabled: true, complete: true, context: 'comparable' as const };
  assert.equal(periodEstimate(base, today, review).status, 'ready');
  const changed = updateEntry(base, today, {
    dailyDetails: { ...emptyDailyDetails(), cycleObservation: 'skipped' },
  });
  assert.equal(periodEstimate(changed, today, review).status, 'cycle-observation');
  assert.deepEqual(Object.keys(changed.entries), Object.keys(base.entries));
  const positive = updateEntry(base, today, {
    dailyDetails: { ...emptyDailyDetails(), pregnancyTest: 'positive' },
  });
  assert.equal(periodEstimate(positive, today, review).status, 'cycle-observation');
  const negative = updateEntry(base, today, {
    dailyDetails: { ...emptyDailyDetails(), pregnancyTest: 'negative', lhTest: 'positive' },
  });
  assert.equal(periodEstimate(negative, today, review).status, 'ready');
  const earlier = updateEntry(base, addDays(today, -30), {
    dailyDetails: { ...emptyDailyDetails(), pregnancyTest: 'positive' },
  });
  assert.equal(periodEstimate(earlier, today, review).status, 'ready');
});
