import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysBetween, monthCells, validDay } from '../src/domain/dates.ts';
import {
  cycleDay,
  emptyJournal,
  history,
  parseJournal,
  toCSV,
  updateEntry,
} from '../src/domain/journal.ts';

test('date arithmetic handles month boundaries, leap days, and DST dates', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-02-29', 1), '2024-03-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(daysBetween('2026-03-07', '2026-03-09'), 2);
  assert.equal(daysBetween('2026-10-31', '2026-11-02'), 2);
  assert.equal(validDay('2026-02-29'), false);
  assert.equal(validDay('2024-02-29'), true);
  assert.equal(monthCells('2026-02-01').filter(Boolean).length, 28);
  assert.equal(monthCells('2026-10-01').length % 7, 0);
});

test('spotting and flow alone never create a cycle', () => {
  let journal = emptyJournal('2026-10-08');
  journal = updateEntry(journal, '2026-09-20', { flow: 'medium' });
  journal = updateEntry(journal, '2026-10-01', { flow: 'spotting', periodStart: true });
  assert.equal(cycleDay(journal, '2026-10-08'), null);
  journal = updateEntry(journal, '2026-09-20', { periodStart: true });
  assert.equal(cycleDay(journal, '2026-10-08'), 19);
  assert.equal(cycleDay(journal, '2026-09-19'), null);
});

test('cycles and bleeding duration use explicit starts and ends across months', () => {
  let journal = emptyJournal('2026-10-08');
  for (const date of ['2026-08-30', '2026-09-29'])
    journal = updateEntry(journal, date, { flow: 'light', periodStart: true });
  journal = updateEntry(journal, '2026-09-03', { flow: 'light', periodEnd: true });
  assert.deepEqual(history(journal, '2026-10-08'), [
    { start: '2026-08-30', end: '2026-09-03', length: 30, duration: 5 },
    { start: '2026-09-29', end: null, length: null, duration: null },
  ]);
  journal = updateEntry(journal, '2026-09-29', { periodEnd: true });
  assert.equal(history(journal, '2026-10-08')[1]?.duration, 1);
});

test('clearing a start recalculates history; clearing cramps removes severity', () => {
  let journal = emptyJournal('2026-10-08');
  journal = updateEntry(journal, '2026-10-01', {
    flow: 'heavy',
    periodStart: true,
    symptoms: ['Cramps'],
    cramps: 7,
  });
  journal = updateEntry(journal, '2026-10-01', { flow: 'none', flowRecorded: false, symptoms: [] });
  assert.equal(cycleDay(journal, '2026-10-08'), null);
  assert.deepEqual(journal.entries, {});
});

test('backup validation rejects malformed data and reconstructs only known fields', () => {
  const valid = emptyJournal('2026-10-08');
  assert.deepEqual(parseJournal({ ...valid, unexpected: 'discard me' }), valid);
  for (const malformed of [
    null,
    {},
    { ...valid, version: 5 },
    { ...valid, selectedDate: 'tomorrow' },
    { ...valid, entries: { '2026-10-01': { note: true } } },
    { ...valid, customSymptoms: ['Repeated', 'Repeated'] },
  ]) {
    assert.throws(() => parseJournal(malformed));
  }
  const invalid = updateEntry(valid, '2026-10-01', { symptoms: ['Cramps'], cramps: 11 });
  assert.throws(() => parseJournal(invalid));
});

test('CSV preserves commas and newlines without spreadsheet formula execution', () => {
  const journal = updateEntry(emptyJournal('2026-10-08'), '2026-10-08', {
    note: '=HYPERLINK("example")\nA, B',
    symptoms: ['Custom symptom'],
  });
  const csv = toCSV(journal);
  assert.ok(csv.includes('"\'=HYPERLINK(""example"")\nA, B"'));
  assert.ok(csv.includes('"Custom symptom"'));
  assert.ok(csv.startsWith('"Date","Flow"'));
});
