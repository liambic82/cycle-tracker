import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { applyPeriodRange } from '../src/domain/periodRange.ts';
import { emptyJournal, parseJournal, updateEntry, history, toCSV } from '../src/domain/journal.ts';
import { flowTimeline } from '../src/domain/history.ts';
import { createDoctorReport, defaultReportOptions } from '../src/domain/report.ts';
import { demoJournal } from '../src/data/demo.ts';
import { seal, openVaultWithKey } from '../src/domain/vault.ts';
const today = '2026-10-12';
const range = { start: '2024-02-28', end: '2024-03-02', flow: 'unspecified' as const };

test('one period records an inclusive range across leap day without inventing intensity', () => {
  const source = emptyJournal(today),
    before = JSON.stringify(source);
  const next = applyPeriodRange(source, range, today);
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(Object.keys(next.entries), [
    '2024-02-28',
    '2024-02-29',
    '2024-03-01',
    '2024-03-02',
  ]);
  assert.ok(Object.values(next.entries).every((e) => e.flow === 'unspecified' && e.flowRecorded));
  assert.deepEqual(history(next, today), [
    { start: range.start, end: range.end, length: null, duration: 4 },
  ]);
  assert.equal(flowTimeline(next, range.start, range.end).counts.bleeding, 4);
  assert.equal(applyPeriodRange(next, range, today), next);
});
test('period range preserves known flow, manual sleep, notes, ratings and unrelated records', () => {
  let source = updateEntry(emptyJournal(today), '2024-02-29', {
    flow: 'heavy',
    note: 'Keep',
    symptoms: ['Cramps'],
    cramps: 6,
    sleep: { durationMinutes: 420, quality: 'good', wakings: 2 },
  });
  source = updateEntry(source, today, { note: 'Outside' });
  const next = applyPeriodRange(source, range, today);
  assert.deepEqual(next.entries['2024-02-29'], source.entries['2024-02-29']);
  assert.equal(next.entries[today], source.entries[today]);
  const detailed = updateEntry(next, range.start, { flow: 'light' });
  assert.equal(detailed.entries[range.start]!.periodStart, true);
  assert.equal(detailed.entries[range.start]!.flow, 'light');
});
test('start-only and single-day periods are distinct and can be entered out of order', () => {
  let j = applyPeriodRange(
    emptyJournal(today),
    { start: '2026-09-01', end: null, flow: 'unspecified' },
    today,
  );
  assert.equal(history(j, today)[0]!.duration, null);
  j = applyPeriodRange(j, { start: '2026-08-01', end: '2026-08-01', flow: 'light' }, today);
  assert.equal(history(j, today)[0]!.duration, 1);
  j = applyPeriodRange(j, { start: '2026-09-01', end: '2026-09-05', flow: 'unspecified' }, today);
  assert.equal(history(j, today)[1]!.duration, 5);
});
test('invalid, future and conflicting ranges fail atomically without clearing existing details', () => {
  for (const invalid of [
    { ...range, start: '2024-02-30' },
    { ...range, end: '2024-02-27' },
    { ...range, end: '2027-01-01' },
    { ...range, flow: 'spotting' as const },
    { ...range, end: '2026-01-01' },
  ])
    assert.throws(() => applyPeriodRange(emptyJournal(today), invalid, today));
  for (const patch of [
    { flow: 'none' as const },
    { flow: 'spotting' as const },
    { flow: 'light' as const, periodStart: true },
    { flow: 'light' as const, periodEnd: true },
  ]) {
    const j = updateEntry(emptyJournal(today), '2024-02-29', patch),
      before = JSON.stringify(j);
    assert.throws(() => applyPeriodRange(j, range, today), /conflict/);
    assert.equal(JSON.stringify(j), before);
  }
  const existing = applyPeriodRange(emptyJournal(today), range, today);
  assert.throws(
    () => applyPeriodRange(existing, { ...range, start: '2024-03-01', end: '2024-03-05' }, today),
    /overlaps/,
  );
  assert.throws(
    () => applyPeriodRange(existing, { ...range, end: '2024-03-04' }, today),
    /overlaps/,
  );
});
test('format 9 preserves format 8 journals exactly and round trips unspecified bleeding in encrypted backups', () => {
  const old = { ...demoJournal(today), version: 8 };
  assert.deepEqual(parseJournal(old), { ...old, version: 10 });
  const j = applyPeriodRange(emptyJournal(today), range, today);
  assert.deepEqual(parseJournal(j), j);
  assert.throws(() => parseJournal({ ...j, version: 8 }));
  assert.throws(() => parseJournal({ ...j, version: 11 }));
  const key = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  assert.deepEqual(openVaultWithKey(seal(j, key, randomBytes), key), j);
});
test('exports distinguish bleeding with unspecified flow from unlogged and heavy flow', () => {
  const j = applyPeriodRange(
    emptyJournal(today),
    { start: '2026-10-01', end: '2026-10-03', flow: 'unspecified' },
    today,
  );
  assert.match(toCSV(j), /unspecified/);
  const report = JSON.stringify(
    createDoctorReport(j, { ...defaultReportOptions(today), from: '2026-10-01' }, today),
  );
  assert.match(report, /Bleeding · flow not specified/);
  assert.match(report, /Heavy flow recorded: 0/);
});
