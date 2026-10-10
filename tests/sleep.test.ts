import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { addDays } from '../src/domain/dates.ts';
import {
  emptyEntry,
  emptyJournal,
  parseJournal,
  toCSV,
  updateEntry,
  type Journal,
} from '../src/domain/journal.ts';
import {
  emptySleep,
  parseSleep,
  hasSleep,
  sleepFromInput,
  sleepToInput,
  sleepHistory,
  describeSleep,
  type SleepInput,
} from '../src/domain/sleep.ts';
import { deleteEntry, undoEntryDeletion } from '../src/domain/deletion.ts';
import { openVaultWithKey, seal } from '../src/domain/vault.ts';
import {
  createDoctorReport,
  defaultReportOptions,
  REPORT_SECTIONS,
  type ReportSectionKey,
} from '../src/domain/report.ts';
import { demoJournal } from '../src/data/demo.ts';

const today = '2026-10-10';
const recorded = { durationMinutes: 450, quality: 'good', wakings: 0 } as const;
test('formats 1–5 gain unknown sleep, preserve prior records, and do not infer sleep from symptom labels', () => {
  const sample = demoJournal(today);
  for (const version of [1, 2, 3, 4, 5]) {
    const entries = Object.fromEntries(
      Object.entries(sample.entries).map(([date, entry]) => {
        const { sleep: _sleep, ...old } = entry;
        return [date, old];
      }),
    );
    const legacy = { ...sample, version, entries };
    const before = JSON.stringify(legacy);
    const migrated = parseJournal(legacy);
    assert.equal(migrated.version, 6);
    assert.equal(JSON.stringify(legacy), before);
    for (const [date, entry] of Object.entries(migrated.entries)) {
      assert.deepEqual(entry.sleep, emptySleep());
      assert.deepEqual(entry.symptoms, sample.entries[date]!.symptoms);
      assert.equal(entry.cramps, sample.entries[date]!.cramps);
      assert.equal(entry.note, sample.entries[date]!.note);
      assert.deepEqual(
        entry.symptomRatings,
        version >= 5 ? sample.entries[date]!.symptomRatings : [],
      );
      assert.deepEqual(entry.doseRecords, version >= 4 ? sample.entries[date]!.doseRecords : []);
      if (version >= 3) assert.deepEqual(entry.sexualHealth, sample.entries[date]!.sexualHealth);
      if (version >= 2)
        assert.deepEqual(entry.productRecords, sample.entries[date]!.productRecords);
    }
    assert.deepEqual(migrated.medications, version >= 4 ? sample.medications : []);
  }
});

test('sleep schema rejects malformed, missing or coerced values and bounds each field independently', () => {
  assert.deepEqual(parseSleep({ ...recorded, ignored: 'discard' }), recorded);
  assert.deepEqual(parseSleep(emptySleep()), emptySleep());
  assert.deepEqual(parseSleep({ durationMinutes: 0, quality: null, wakings: 0 }), {
    durationMinutes: 0,
    quality: null,
    wakings: 0,
  });
  assert.doesNotThrow(() =>
    parseSleep({ durationMinutes: 1440, quality: 'very-poor', wakings: 100 }),
  );
  const invalid: unknown[] = [
    null,
    undefined,
    [],
    '',
    {},
    { ...recorded, quality: 5 },
    { ...recorded, quality: 'Good' },
    ...[-1, 1441, 1.5, '450', true, NaN, Infinity, undefined].map((durationMinutes) => ({
      ...recorded,
      durationMinutes,
    })),
    ...[-1, 101, 0.5, '0', false, NaN, undefined].map((wakings) => ({ ...recorded, wakings })),
  ];
  for (const sleep of invalid) {
    assert.throws(() => parseSleep(sleep));
    assert.throws(() =>
      parseJournal({ ...emptyJournal(today), entries: { [today]: { ...emptyEntry(), sleep } } }),
    );
  }
  assert.throws(() => parseJournal({ ...emptyJournal(today), version: 7 }));
});

test('duration entry uses whole hours/minutes, permits partial and zero records, and rejects ambiguous input', () => {
  const empty: SleepInput = { hours: '', minutes: '', quality: null, wakings: '' };
  assert.deepEqual(sleepFromInput(empty), emptySleep());
  assert.equal(sleepFromInput({ ...empty, hours: ' 7 ', minutes: '30' }).durationMinutes, 450);
  assert.equal(sleepFromInput({ ...empty, hours: '', minutes: '30' }).durationMinutes, 30);
  assert.equal(sleepFromInput({ ...empty, hours: '8' }).durationMinutes, 480);
  assert.equal(sleepFromInput({ ...empty, hours: '0' }).durationMinutes, 0);
  assert.deepEqual(sleepFromInput({ ...empty, quality: 'okay', wakings: '0' }), {
    durationMinutes: null,
    quality: 'okay',
    wakings: 0,
  });
  assert.equal(sleepFromInput({ ...empty, hours: '24', minutes: '0' }).durationMinutes, 1440);
  for (const patch of [
    { hours: '25' },
    { hours: '24', minutes: '1' },
    { minutes: '60' },
    { hours: '-1' },
    { hours: '7.5' },
    { hours: '7,5' },
    { hours: '0x8' },
    { hours: '1e1' },
    { minutes: '+1' },
    { wakings: '101' },
    { wakings: '2.5' },
    { wakings: 'NaN' },
    { wakings: '1 0' },
  ])
    assert.throws(() => sleepFromInput({ ...empty, ...patch }));
  for (const durationMinutes of [null, 0, 1, 59, 60, 450, 1439, 1440])
    assert.deepEqual(sleepFromInput(sleepToInput({ ...recorded, durationMinutes })), {
      ...recorded,
      durationMinutes,
    });
});

test('sleep-only and zero records keep a day logged without inventing flow, symptoms or other sleep values', () => {
  for (const sleep of [
    recorded,
    { ...emptySleep(), wakings: 0 },
    { ...emptySleep(), durationMinutes: 0 },
    { ...emptySleep(), quality: 'poor' as const },
  ]) {
    assert.equal(hasSleep(sleep), true);
    const journal = updateEntry(emptyJournal(today), today, { sleep });
    assert.deepEqual(journal.entries[today], { ...emptyEntry(), sleep });
    assert.ok(toCSV(journal).includes(today));
    assert.deepEqual(updateEntry(journal, today, { sleep: emptySleep() }).entries, {});
  }
  const original = updateEntry(demoJournal(today), today, { sleep: recorded });
  const cleared = updateEntry(original, today, { sleep: emptySleep() });
  assert.deepEqual(cleared.entries[today], { ...original.entries[today], sleep: emptySleep() });
  assert.deepEqual(original.entries[today]!.sleep, recorded);
  const invalid = { ...recorded, wakings: -1 };
  assert.throws(() => updateEntry(original, today, { sleep: invalid }));
  assert.deepEqual(original.entries[today]!.sleep, recorded);
});

test('deletion and Undo retain an independent sleep snapshot alongside existing daily details', () => {
  const original = updateEntry(demoJournal(today), today, { sleep: recorded });
  const { journal, deleted } = deleteEntry(original, today)!;
  assert.equal(journal.entries[today], undefined);
  assert.deepEqual(undoEntryDeletion(journal, deleted), original);
  original.entries[today]!.sleep.wakings = 5;
  assert.equal(deleted.entry.sleep.wakings, 0);
});

test('encrypted backups round-trip sleep and migrate a format-5 encrypted backup without changing its key', () => {
  const journal = demoJournal(today);
  const vault = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  assert.deepEqual(openVaultWithKey(seal(journal, vault, randomBytes), vault), journal);
  const legacy = {
    ...journal,
    version: 5,
    entries: Object.fromEntries(
      Object.entries(journal.entries).map(([date, entry]) => {
        const { sleep: _sleep, ...old } = entry;
        return [date, old];
      }),
    ),
  };
  assert.deepEqual(
    openVaultWithKey(seal(legacy as unknown as Journal, vault, randomBytes), vault),
    parseJournal(legacy),
  );
  vault.key.fill(0);
});

test('sleep history has inclusive dated boundaries, separate missing fields, zero, and no inferred durations', () => {
  let journal = emptyJournal(today);
  for (const [offset, sleep] of [
    [0, { ...emptySleep(), durationMinutes: 0 }],
    [-2, { ...emptySleep(), quality: 'poor' }],
    [-29, recorded],
    [-30, recorded],
    [1, recorded],
  ] as const)
    journal = updateEntry(journal, addDays(today, offset), { sleep });
  journal = updateEntry(journal, addDays(today, -1), {
    symptoms: ['Sleep disruption'],
    note: 'No structured sleep',
  });
  const history = sleepHistory(journal, today, 30);
  assert.deepEqual(
    history.records.map(({ date }) => date),
    [addDays(today, -29), addDays(today, -2), today],
  );
  assert.equal(history.durations, 2);
  assert.equal(history.notLogged, 27);
  assert.equal(history.records[1]!.sleep.durationMinutes, null);
  assert.equal(history.records[2]!.sleep.durationMinutes, 0);
  assert.equal(sleepHistory(journal, today, 90).records.length, 4);
  assert.equal(sleepHistory(journal, today, 365).notLogged, 361);
  history.records[0]!.sleep.durationMinutes = 3;
  assert.equal(journal.entries[addDays(today, -29)]!.sleep.durationMinutes, 450);
  assert.equal(sleepHistory(emptyJournal('2024-03-01'), '2024-03-01', 30).from, '2024-02-01');
  assert.equal(sleepHistory(emptyJournal('1900-01-01'), '1900-01-01', 365).notLogged, 1);
});

test('CSV keeps numeric units, zero versus unknown, and the existing sexual-field choices', () => {
  let journal = updateEntry(emptyJournal(today), today, { sleep: recorded });
  journal = updateEntry(journal, addDays(today, -1), {
    sleep: { ...emptySleep(), durationMinutes: 0 },
  });
  journal = updateEntry(journal, addDays(today, -2), {
    sexualHealth: { activity: true, intensity: 'gentle', orgasm: null, libido: null },
  });
  const rows = toCSV(journal)
    .split('\r\n')
    .map((row) => row.split(',').map((cell) => cell.slice(1, -1)));
  assert.deepEqual(rows[0]!.slice(13), [
    'Sleep duration (minutes)',
    'Sleep quality',
    'Night wakings',
  ]);
  assert.deepEqual(rows[1]!.slice(13), ['0', '', '']);
  assert.deepEqual(rows[2]!.slice(13), ['450', 'Good', '0']);
  assert.equal(rows.length, 3);
  assert.ok(!toCSV(journal).includes('gentle'));
  assert.ok(toCSV(journal, { activity: true }).includes(addDays(today, -2)));
});

test('doctor summaries include sleep only in its selected section and date range, retaining partial/zero values', () => {
  let journal = updateEntry(emptyJournal(today), today, {
    sleep: { durationMinutes: 0, quality: null, wakings: 0 },
  });
  journal = updateEntry(journal, addDays(today, -1), {
    sleep: { ...emptySleep(), quality: 'poor' },
    symptoms: ['Sleep disruption'],
  });
  journal = updateEntry(journal, addDays(today, -5), { sleep: recorded });
  journal = updateEntry(journal, addDays(today, 1), { sleep: recorded });
  const options = defaultReportOptions(today);
  options.from = addDays(today, -1);
  for (const key of Object.keys(REPORT_SECTIONS) as ReportSectionKey[])
    options.sections[key] = key === 'sleep';
  const report = createDoctorReport(journal, options, today);
  assert.deepEqual(report.sections[0]!.blocks, [
    { heading: addDays(today, -1), paragraphs: ['Sleep quality: Poor.'] },
    { heading: today, paragraphs: ['Sleep duration: 0 h 0 min.', 'Night wakings: 0.'] },
  ]);
  journal.entries[today]!.sleep.wakings = 5;
  assert.ok(JSON.stringify(report).includes('Night wakings: 0.'));
  options.sections.sleep = false;
  options.sections.symptoms = true;
  const excluded = JSON.stringify(createDoctorReport(journal, options, today));
  assert.ok(excluded.includes('Sleep disruption'));
  assert.ok(!excluded.includes('Night wakings:'));
  assert.ok(!excluded.includes('Sleep duration:'));
  assert.ok(
    createDoctorReport(journal, options, today).sections.every((section) =>
      section.blocks.every((block) => block.heading !== today),
    ),
  );
  assert.deepEqual(describeSleep(emptySleep()), []);
});
