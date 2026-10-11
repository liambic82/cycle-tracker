import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { addDays } from '../src/domain/dates.ts';
import { emptyJournal, parseJournal, updateEntry, toCSV } from '../src/domain/journal.ts';
import {
  applySleepImport,
  parseSleepImport,
  parseSleepImports,
  sleepStageSummary,
  sleepWakingDay,
  sleepImportState,
  overlappingSleepImports,
  describeImportedSleep,
} from '../src/domain/sleepImport.ts';
import { demoSleepImports } from '../src/data/sleepImportDemo.ts';
import { demoJournal } from '../src/data/demo.ts';
import { sleepHistory } from '../src/domain/sleep.ts';
import { deleteEntry, undoEntryDeletion } from '../src/domain/deletion.ts';
import { seal, openVaultWithKey } from '../src/domain/vault.ts';
import {
  createDoctorReport,
  defaultReportOptions,
  REPORT_SECTIONS,
  type ReportSectionKey,
} from '../src/domain/report.ts';

const today = '2026-10-10';
const session = () => demoSleepImports(today)[0]!;
test('formats 1–6 migrate with no imports, preserving manual sleep and all earlier records', () => {
  const source = demoJournal(today);
  for (const version of [1, 2, 3, 4, 5, 6]) {
    const entries = Object.fromEntries(
      Object.entries(source.entries).map(([date, entry]) => {
        const { sleepImports: _imports, ...legacy } = entry;
        return [date, legacy];
      }),
    );
    const legacy = { ...source, version, entries };
    const before = JSON.stringify(legacy);
    const parsed = parseJournal(legacy);
    assert.equal(parsed.version, 8);
    assert.equal(JSON.stringify(legacy), before);
    for (const [date, entry] of Object.entries(parsed.entries)) {
      assert.deepEqual(entry.sleepImports, []);
      assert.deepEqual(entry.symptoms, source.entries[date]!.symptoms);
      if (version >= 6) assert.deepEqual(entry.sleep, source.entries[date]!.sleep);
      if (version >= 5)
        assert.deepEqual(entry.symptomRatings, source.entries[date]!.symptomRatings);
      if (version >= 4) assert.deepEqual(entry.doseRecords, source.entries[date]!.doseRecords);
    }
  }
});
test('imports reject corrupt metadata, timestamps, offsets, stages and mismatched waking days atomically', () => {
  const base = session();
  const invalid: unknown[] = [
    null,
    {},
    [],
    { ...base, id: '' },
    { ...base, sourcePackage: 'bad\nsource' },
    { ...base, device: 4 },
    { ...base, end: base.start },
    { ...base, end: '2026-02-30T07:00:00.000Z' },
    { ...base, modified: 'no' },
    { ...base, startOffset: 2000 },
    { ...base, endOffset: 1.5 },
    { ...base, fallbackOffset: null },
    { ...base, stages: undefined },
    { ...base, stages: [{ start: base.start, end: base.end, type: 8 }] },
    { ...base, stages: [{ start: base.end, end: base.start, type: 4 }] },
    {
      ...base,
      stages: [
        { start: base.start, end: base.end, type: 4 },
        { start: base.start, end: base.end, type: 6 },
      ],
    },
    { ...base, stages: [{ start: '2026-10-09T22:00:00.000Z', end: base.end, type: 4 }] },
    { ...base, stages: Array.from({ length: 3001 }, () => base.stages[0]) },
  ];
  for (const value of invalid) assert.throws(() => parseSleepImport(value));
  assert.throws(() => parseSleepImports([base, base]));
  assert.throws(() => parseSleepImports([base], '2026-10-09'));
  const journal = applySleepImport(emptyJournal(today), base, today);
  assert.throws(() =>
    parseJournal({
      ...journal,
      entries: { [today]: { ...journal.entries[today], sleepImports: undefined } },
    }),
  );
  assert.throws(() => parseJournal({ ...journal, version: 9 }));
  const parsed = parseSleepImport({ ...base, ignored: 'drop', stages: [...base.stages].reverse() });
  assert.deepEqual(parsed, base);
  parsed.stages[0]!.type = 0;
  assert.equal(base.stages[0]!.type, 4);
});
test('stage summaries distinguish session span, known sleep, gaps and explicit no asleep stages', () => {
  assert.deepEqual(sleepStageSummary(session()), {
    spanMinutes: 480,
    asleepMinutes: 450,
    awakeMinutes: 30,
    unknownMinutes: 0,
    complete: true,
  });
  const absent = { ...session(), stages: [] };
  assert.deepEqual(sleepStageSummary(absent), {
    spanMinutes: 480,
    asleepMinutes: 0,
    awakeMinutes: 0,
    unknownMinutes: 480,
    complete: false,
  });
  assert.ok(describeImportedSleep(absent).join(' ').includes('total time asleep unknown'));
  const partial = { ...session(), stages: [session().stages[0]!] };
  assert.equal(sleepStageSummary(partial).unknownMinutes, 240);
  for (const type of [1, 3, 7])
    assert.equal(
      sleepStageSummary({
        ...session(),
        stages: [{ start: session().start, end: session().end, type }],
      }).complete,
      true,
    );
  assert.equal(
    sleepStageSummary({
      ...session(),
      stages: [{ start: session().start, end: session().end, type: 0 }],
    }).unknownMinutes,
    480,
  );
  // Elapsed instants remain correct across a daylight-saving offset change.
  const dst = parseSleepImport({
    ...session(),
    start: '2026-11-01T05:00:00.000Z',
    end: '2026-11-01T07:00:00.000Z',
    startOffset: -240,
    endOffset: -300,
    stages: [],
  });
  assert.equal(sleepStageSummary(dst).spanMinutes, 120);
  assert.equal(sleepWakingDay(dst), '2026-11-01');
});
test('reimport deduplicates stable source and record identities while preserving manual details', () => {
  const manual = { durationMinutes: 400, quality: 'poor', wakings: 2 } as const;
  const original = updateEntry(emptyJournal(today), today, {
    sleep: manual,
    note: 'Keep this',
    symptoms: ['Sleep disruption'],
  });
  const before = JSON.stringify(original);
  const next = applySleepImport(original, session(), today);
  assert.equal(JSON.stringify(original), before);
  assert.deepEqual(next.entries[today]!.sleep, manual);
  assert.equal(next.entries[today]!.sleepImports.length, 1);
  assert.equal(sleepImportState(next, session()), 'unchanged');
  assert.equal(
    applySleepImport(next, { ...session(), imported: '2026-10-10T09:00:00.000Z' }, today),
    next,
  );
  assert.equal(next.entries[today]!.note, 'Keep this');
  assert.deepEqual(next.entries[today]!.symptoms, ['Sleep disruption']);
  assert.equal(next.entries[today]!.flowRecorded, false);
});
test('reviewed corrections replace only the imported copy, including a changed waking date', () => {
  let journal = applySleepImport(emptyJournal(today), session(), today);
  journal = updateEntry(journal, today, { note: 'Keep waking-day note' });
  const moved = { ...session(), endOffset: -720, modified: '2026-10-10T09:00:00.000Z' };
  assert.equal(sleepImportState(journal, moved), 'updated');
  const next = applySleepImport(journal, moved, today);
  assert.equal(next.entries[today]!.sleepImports.length, 0);
  assert.equal(next.entries[today]!.note, 'Keep waking-day note');
  assert.equal(next.entries['2026-10-09']!.sleepImports.length, 1);
  assert.equal(sleepImportState(next, session()), 'older');
  assert.throws(() => applySleepImport(next, session(), today), /older/);
  assert.throws(() => applySleepImport(emptyJournal(today), session(), '2026-10-09'), /future/);
});
test('missing source offsets are captured at import and retained after travel or a correction', () => {
  const first = { ...session(), startOffset: null, endOffset: null, fallbackOffset: -720 };
  const original = applySleepImport(emptyJournal(today), first, today);
  const changed = {
    ...first,
    fallbackOffset: 720,
    modified: '2026-10-10T09:00:00.000Z',
    stages: [],
  };
  const next = applySleepImport(original, changed, today);
  assert.equal(next.entries['2026-10-09']!.sleepImports[0]!.fallbackOffset, -720);
  assert.equal(next.entries[today], undefined);
  assert.ok(
    describeImportedSleep(next.entries['2026-10-09']!.sleepImports[0]!)
      .join(' ')
      .includes('Missing source time-zone offset'),
  );
  const supplied = parseSleepImport({ ...first, endOffset: 840 });
  assert.equal(sleepWakingDay(supplied), today);
});
test('naps and overlapping sources stay separate; empty source refresh does not delete imported copies', () => {
  let journal = applySleepImport(emptyJournal(today), session(), today);
  const second = { ...session(), sourcePackage: 'example.other', sourceName: 'Other source' };
  assert.equal(sleepImportState(journal, second), 'new');
  assert.equal(overlappingSleepImports(journal, second).length, 1);
  journal = applySleepImport(journal, second, today);
  journal = applySleepImport(journal, demoSleepImports(today)[1]!, today);
  const history = sleepHistory(journal, today, 30);
  assert.equal(history.records.length, 2);
  assert.equal(history.durations, 0);
  assert.equal(history.notLogged, 28);
  assert.equal(history.records[1]!.imports.length, 2);
  assert.equal(journal.entries[today]!.sleep.durationMinutes, null);
  history.records[1]!.imports[0]!.stages[0]!.type = 0;
  assert.equal(journal.entries[today]!.sleepImports[0]!.stages[0]!.type, 4);
  assert.deepEqual(parseSleepImports([]), []);
  assert.equal(journal.entries[today]!.sleepImports.length, 2);
});
test('import-only entry deletion, copy removal and Undo retain independent source data', () => {
  const journal = applySleepImport(emptyJournal(today), session(), today);
  const deleted = deleteEntry(journal, today)!;
  journal.entries[today]!.sleepImports[0]!.stages[0]!.type = 0;
  const undo = undoEntryDeletion(deleted.journal, deleted.deleted);
  assert.equal(undo.entries[today]!.sleepImports[0]!.stages[0]!.type, 4);
  assert.equal(updateEntry(undo, today, { sleepImports: [] }).entries[today], undefined);
  const withManual = updateEntry(undo, today, {
    sleep: { durationMinutes: null, quality: 'okay', wakings: null },
  });
  assert.equal(
    updateEntry(withManual, today, { sleepImports: [] }).entries[today]!.sleep.quality,
    'okay',
  );
});
test('encrypted backups round-trip sources and stages and migrate real format-6 content', () => {
  const key = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  const journal = applySleepImport(demoJournal(today), session(), today);
  assert.deepEqual(openVaultWithKey(seal(journal, key, randomBytes), key), journal);
  const legacy = {
    ...journal,
    version: 6,
    entries: Object.fromEntries(
      Object.entries(journal.entries).map(([d, e]) => {
        const { sleepImports: _x, ...rest } = e;
        return [d, rest];
      }),
    ),
  };
  const migrated = openVaultWithKey(seal(legacy as never, key, randomBytes), key);
  assert.deepEqual(migrated.entries[today]!.sleep, journal.entries[today]!.sleep);
  assert.deepEqual(migrated.entries[today]!.sleepImports, []);
});
test('CSV and PDF retain provenance and partial stages only in selected sleep dates and sections', () => {
  let journal = applySleepImport(emptyJournal(today), session(), today);
  journal = applySleepImport(journal, demoSleepImports(today)[1]!, today);
  journal = updateEntry(journal, today, {
    sleep: { durationMinutes: 0, quality: 'good', wakings: 0 },
    symptoms: ['Sleep disruption'],
  });
  const csv = toCSV(journal);
  assert.ok(csv.includes('Imported sleep sessions'));
  assert.ok(csv.includes('example.fictional.sleep'));
  assert.ok(csv.includes('record sample-main'));
  assert.ok(csv.includes('total time asleep unknown'));
  assert.ok(!csv.includes('Sexual activity'));
  const options = defaultReportOptions(today);
  options.from = today;
  for (const key of Object.keys(REPORT_SECTIONS) as ReportSectionKey[])
    options.sections[key] = key === 'sleep';
  const report = JSON.stringify(createDoctorReport(journal, options, today));
  assert.ok(report.includes('Sleep duration: 0 h 0 min.'));
  assert.ok(report.includes('record sample-main'));
  assert.ok(!report.includes('record sample-missing'));
  options.sections.sleep = false;
  options.sections.symptoms = true;
  const excluded = JSON.stringify(createDoctorReport(journal, options, today));
  assert.ok(excluded.includes('Sleep disruption'));
  assert.ok(!excluded.includes('example.fictional'));
  assert.ok(!excluded.includes('Session span'));
});
test('oversized import fails before replacing any journal state', () => {
  let journal = emptyJournal(today);
  // Existing notes consume the preview limit without generating a huge staged sleep payload.
  for (let i = 0; i < 420; i++)
    journal = updateEntry(journal, addDays(today, -i), { note: 'x'.repeat(10000) });
  const before = JSON.stringify(journal);
  assert.throws(() => applySleepImport(journal, session(), today), /limit/);
  assert.equal(JSON.stringify(journal), before);
});
