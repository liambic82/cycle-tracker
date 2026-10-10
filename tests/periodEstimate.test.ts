import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysBetween } from '../src/domain/dates.ts';
import { emptyJournal, updateEntry, parseJournal, toCSV } from '../src/domain/journal.ts';
import { demoJournal } from '../src/data/demo.ts';
import {
  backtestIntervals,
  emptyEstimateReview,
  periodEstimate,
  type EstimateContext,
} from '../src/domain/periodEstimate.ts';

const today = '2026-10-09';
const consent = { enabled: true, context: 'comparable' as const, complete: true };
function history(lengths: number[], last = addDays(today, -10)) {
  let cursor = addDays(last, -lengths.reduce((a, b) => a + b, 0));
  let journal = updateEntry(emptyJournal(today), cursor, { flow: 'medium', periodStart: true });
  for (const length of lengths) {
    cursor = addDays(cursor, length);
    journal = updateEntry(journal, cursor, { flow: 'medium', periodStart: true });
  }
  return journal;
}
const stable = [29, 30, 29, 30, 29, 30];

test('dates require explicit session opt-in, comparable context, and complete-history confirmation', () => {
  const journal = history(stable);
  assert.equal(periodEstimate(journal, today, emptyEstimateReview()).status, 'off');
  for (const context of ['unknown', 'hormonal', 'pregnancy', 'changing'] as EstimateContext[]) {
    const result = periodEstimate(journal, today, { ...consent, context });
    assert.equal(result.status, 'context');
    assert.equal(result.estimate, null);
  }
  assert.equal(
    periodEstimate(journal, today, { ...consent, complete: false }).status,
    'unconfirmed',
  );
  assert.deepEqual(emptyEstimateReview(), { enabled: false, context: 'unknown', complete: false });
});

test('median and historical spread use six exact start-to-start intervals with no inclusive-day error', () => {
  const journal = history(stable);
  const result = periodEstimate(journal, today, consent);
  assert.equal(result.status, 'ready');
  assert.deepEqual(
    result.intervals.map((interval) => interval.days),
    stable,
  );
  assert.deepEqual(result.estimate, {
    anchor: '2026-09-29',
    center: '2026-10-29',
    from: '2026-10-28',
    to: '2026-10-29',
    days: 30,
  });
  assert.equal(result.backtest.available, 3);
  assert.equal(result.backtest.offered, 3);
  assert.equal(result.backtest.insideSpread, 3);
  assert.equal(result.backtest.meanError!.median, 1);
  assert.equal(result.backtest.meanError!.mean, 1);
  assert.equal(result.backtest.meanError!.last, 1);
  assert.equal(result.backtest.meanError!.fixed28, 5 / 3);
});

test('seven starts are required; absent starts and notes never supply missing cycles', () => {
  for (let count = 0; count < 6; count++) {
    const journal = history(stable.slice(0, count));
    journal.entries[today] = {
      ...journal.entries[Object.keys(journal.entries)[0]!]!,
      periodStart: false,
      note: 'Period expected',
    };
    const result = periodEstimate(journal, today, consent);
    assert.equal(result.status, 'insufficient');
    assert.equal(result.estimate, null);
  }
});

test('uses the latest six complete intervals only and includes the exact 365-day boundary', () => {
  assert.deepEqual(
    periodEstimate(history([2, 120, ...stable]), today, consent).intervals.map((v) => v.days),
    stable,
  );
  const journal = history([60, 60, 60, 60, 60, 60], addDays(today, -5));
  assert.equal(periodEstimate(journal, today, consent).status, 'ready');
  assert.equal(periodEstimate(journal, addDays(today, 1), consent).status, 'insufficient');
});

test('short or long intervals are withheld without trimming or treating them as missing logs', () => {
  for (const unusual of [1, 13, 91, 120]) {
    const journal = history([28, 28, 28, 28, 28, unusual]);
    const before = structuredClone(journal);
    const result = periodEstimate(journal, today, consent);
    assert.equal(result.status, 'unsupported');
    assert.equal(result.intervals.at(-1)!.days, unusual);
    assert.equal(result.estimate, null);
    assert.deepEqual(journal, before);
  }
  assert.equal(periodEstimate(history([14, 14, 14, 14, 14, 14]), today, consent).status, 'ready');
});

test('variable history and a poor chronological fit withhold dates for distinct reasons', () => {
  assert.equal(
    periodEstimate(history([28, 28, 28, 28, 28, 56]), today, consent).status,
    'variable',
  );
  assert.equal(
    periodEstimate(history([20, 20, 20, 34, 34, 34]), today, consent).status,
    'poor-fit',
  );
});

test('a future start blocks estimates while future non-start entries and the selected date do not', () => {
  let journal = history(stable);
  const initial = periodEstimate(journal, today, consent);
  const future = addDays(today, 40);
  journal = updateEntry(journal, future, { flow: 'heavy', note: 'PRIVATE', periodEnd: true });
  journal.selectedDate = future;
  assert.deepEqual(periodEstimate(journal, today, consent), initial);
  journal = updateEntry(journal, future, { periodStart: true });
  assert.equal(periodEstimate(journal, today, consent).status, 'future-start');
});

test('elapsed time never moves an estimate forward or creates a late-period record', () => {
  const journal = history(stable);
  const before = structuredClone(journal);
  const first = periodEstimate(journal, today, consent);
  assert.deepEqual(periodEstimate(journal, first.estimate!.to, consent).estimate, first.estimate);
  assert.equal(periodEstimate(journal, addDays(first.estimate!.to, 1), consent).status, 'expired');
  assert.equal(
    periodEstimate(journal, addDays(first.estimate!.anchor, 91), consent).status,
    'stale',
  );
  assert.deepEqual(journal, before);
});

test('adding, correcting, and removing an actual start immediately recalculates from recorded history', () => {
  const journal = history(stable);
  const before = periodEstimate(journal, today, consent).estimate!;
  const nextDay = before.center;
  const next = updateEntry(journal, nextDay, { flow: 'medium', periodStart: true });
  assert.equal(periodEstimate(next, nextDay, consent).estimate!.anchor, nextDay);
  const cleared = updateEntry(next, nextDay, { periodStart: false });
  assert.deepEqual(periodEstimate(cleared, today, consent).estimate, before);
  assert.equal(cleared.entries[nextDay]!.flow, 'medium');
});

test('held-out targets and later intervals never affect their own training or abstention', () => {
  const prefix = [28, 29, 30];
  const first = backtestIntervals([...prefix, 28]).rows[0]!;
  const unexpected = backtestIntervals([...prefix, 120, 29, 28]).rows[0]!;
  assert.deepEqual(unexpected.prediction, first.prediction);
  assert.deepEqual(unexpected.spread, first.spread);
  const simple = backtestIntervals([...prefix, 120]);
  assert.equal(simple.meanError!.median, 91);
  assert.equal(simple.insideSpread, 0);
  const all = backtestIntervals([...prefix, 120, 29, 28]);
  assert.equal(all.available, 3);
  assert.equal(all.offered, 1);
  assert.equal(all.rows[1]!.prediction, null);
  assert.deepEqual(
    backtestIntervals([...prefix, 28, 29]).rows,
    backtestIntervals([...prefix, 28, 29, 60]).rows.slice(0, 2),
  );
});

test('comparison methods use matching folds; zero eligible folds and malformed input are explicit', () => {
  const result = backtestIntervals([28, 28, 28, 56, 28, 28]);
  assert.deepEqual(result.meanError, { median: 28, mean: 28, last: 28, fixed28: 28 });
  const none = backtestIntervals([20, 80, 20, 80]);
  assert.equal(none.available, 1);
  assert.equal(none.offered, 0);
  assert.equal(none.meanError, null);
  assert.equal(none.largestError, null);
  for (const invalid of [NaN, Infinity, 0, -1, 28.5])
    assert.throws(() => backtestIntervals([28, invalid]));
});

test('date arithmetic survives leap days and DST and rejects unsupported output dates', () => {
  for (const anchor of ['2024-02-28', '2026-03-07', '2026-10-31']) {
    const result = periodEstimate(history(stable, anchor), anchor, consent);
    assert.equal(result.status, 'ready');
    assert.equal(daysBetween(anchor, result.estimate!.center), 30);
  }
  assert.equal(
    periodEstimate(history(stable, '2199-12-20'), '2199-12-20', consent).status,
    'date-limit',
  );
  assert.throws(() => periodEstimate(history(stable), '2026-02-30', consent));
});

test('unrelated sensitive fields never influence estimates, mutate records, or enter backups/exports', () => {
  const journal = history(stable);
  const expected = periodEstimate(journal, today, consent);
  const changed = updateEntry(journal, today, {
    note: 'PRIVATE',
    symptoms: ['Hot flashes'],
    sexualHealth: { activity: true, intensity: 'intense', orgasm: true, libido: 'high' },
  });
  changed.medications = demoJournal(today).medications;
  changed.preferences.showPerimenopause = false;
  const serialized = JSON.stringify(changed);
  const csv = toCSV(changed);
  assert.deepEqual(periodEstimate(changed, today, consent), expected);
  assert.equal(JSON.stringify(changed), serialized);
  assert.equal(toCSV(changed), csv);
  assert.deepEqual(parseJournal(JSON.parse(serialized)), changed);
  assert.ok(!JSON.stringify(expected).includes('PRIVATE'));
  assert.equal(changed.version, 6);
});

test('the expanded fictional sample demonstrates an estimate while remaining a valid journal', () => {
  const journal = demoJournal(today);
  assert.deepEqual(parseJournal(journal), journal);
  const result = periodEstimate(journal, today, consent);
  assert.equal(result.status, 'ready');
  assert.equal(result.intervals.length, 6);
  assert.equal(result.estimate!.anchor, '2026-09-29');
  assert.equal(result.estimate!.center, '2026-10-29');
});
