import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { addDays, daysBetween, monthCells } from '../src/domain/dates.ts';
import {
  emptyEntry,
  emptyJournal,
  history,
  parseJournal,
  toCSV,
  updateEntry,
} from '../src/domain/journal.ts';
import { cycleDayLookup, flowState, flowTimeline, statistics } from '../src/domain/history.ts';
import { newKey, openVault, seal } from '../src/domain/vault.ts';

test('explicit no-flow is a saved entry, while clearing flow preserves unrelated observations', () => {
  let journal = updateEntry(emptyJournal('2026-10-09'), '2026-10-09', { flow: 'none' });
  assert.equal(journal.entries['2026-10-09']?.flowRecorded, true);
  assert.equal(flowState(journal.entries['2026-10-09']), 'none');
  journal = updateEntry(journal, '2026-10-09', {
    symptoms: ['Cramps'],
    cramps: 4,
    note: 'Fictional',
  });
  journal = updateEntry(journal, '2026-10-09', {
    flow: 'heavy',
    periodStart: true,
    periodEnd: true,
  });
  journal = updateEntry(journal, '2026-10-09', { flow: 'none', flowRecorded: false });
  assert.deepEqual(journal.entries['2026-10-09'], {
    ...emptyEntry(),
    symptoms: ['Cramps'],
    cramps: 4,
    note: 'Fictional',
  });
  assert.equal(flowState(journal.entries['2026-10-09']), 'unknown');
  assert.equal(history(journal, '2026-10-09').length, 0);
  const blank = updateEntry(emptyJournal('2026-10-09'), '2026-10-09', {
    flow: 'none',
    flowRecorded: false,
  });
  assert.deepEqual(blank.entries, {});
});

test('old backups preserve observed bleeding but never turn default none into a confirmed no-flow day', () => {
  const { flowRecorded: _flag, ...oldEntry } = emptyEntry();
  const legacy = {
    ...emptyJournal('2026-10-09'),
    entries: {
      '2026-10-01': { ...oldEntry, flow: 'heavy', periodStart: true },
      '2026-10-02': { ...oldEntry, note: 'No flow choice was recorded in this old note' },
      '2026-10-03': { ...oldEntry, flow: 'spotting' },
    },
  };
  const parsed = parseJournal(legacy);
  assert.equal(parsed.entries['2026-10-01']?.flowRecorded, true);
  assert.equal(parsed.entries['2026-10-02']?.flowRecorded, false);
  assert.equal(parsed.entries['2026-10-03']?.flowRecorded, true);
  assert.deepEqual(flowTimeline(parsed, '2026-10-01', '2026-10-04').counts, {
    bleeding: 1,
    spotting: 1,
    none: 0,
    unknown: 2,
  });
  for (const bad of [null, 0, 'true'])
    assert.throws(() =>
      parseJournal({
        ...legacy,
        entries: {
          '2026-10-01': { ...oldEntry, flowRecorded: bad },
        },
      }),
    );
  assert.throws(() =>
    parseJournal({
      ...legacy,
      entries: { '2026-10-01': { ...oldEntry, flow: 'light', flowRecorded: false } },
    }),
  );
});

test('timeline boundaries exclude the next cycle and keep note-only days unknown in chronological runs', () => {
  let journal = emptyJournal('2026-03-09');
  journal = updateEntry(journal, '2026-03-06', { flow: 'heavy', periodStart: true });
  journal = updateEntry(journal, '2026-03-07', { note: 'Fictional note' });
  journal = updateEntry(journal, '2026-03-08', { flow: 'none' });
  journal = updateEntry(journal, '2026-03-09', { flow: 'spotting' });
  journal = updateEntry(journal, '2026-03-10', { flow: 'light', periodStart: true });
  const timeline = flowTimeline(journal, '2026-03-06', '2026-03-09');
  assert.deepEqual(timeline, {
    total: 4,
    counts: { bleeding: 1, spotting: 1, none: 1, unknown: 1 },
    runs: [
      { state: 'bleeding', days: 1 },
      { state: 'unknown', days: 1 },
      { state: 'none', days: 1 },
      { state: 'spotting', days: 1 },
    ],
  });
  assert.deepEqual(history(journal, '2026-03-09'), [
    { start: '2026-03-06', end: null, length: null, duration: null },
  ]);
});

test('long gaps stay compact and leap-day endpoints count inclusively', () => {
  const journal = emptyJournal('2026-10-09');
  const long = flowTimeline(journal, '1900-01-01', '2199-12-31');
  assert.equal(long.runs.length, 1);
  assert.equal(long.total, daysBetween('1900-01-01', '2199-12-31') + 1);
  assert.equal(flowTimeline(journal, '2024-02-28', '2024-03-01').total, 3);
  assert.equal(flowTimeline(journal, '2024-03-02', '2024-03-01').total, 0);
  assert.equal(monthCells('2024-02-01').filter(Boolean).length, 29);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('cycle lookup uses actual starts, preserves long cycles, and excludes future estimates', () => {
  let journal = emptyJournal('2026-10-09');
  journal = updateEntry(journal, '2026-08-01', { flow: 'light', periodStart: true });
  journal = updateEntry(journal, '2026-10-01', { flow: 'light', periodStart: true });
  const lookup = cycleDayLookup(journal, '2026-10-09');
  assert.equal(lookup('2026-07-31'), null);
  assert.equal(lookup('2026-08-01'), 1);
  assert.equal(lookup('2026-09-30'), 61);
  assert.equal(lookup('2026-10-01'), 1);
  assert.equal(lookup('2026-10-09'), 9);
  assert.equal(lookup('2026-10-10'), null);
});

test('statistics exclude incomplete values and bleeding ends never cross the next start', () => {
  assert.deepEqual(statistics([30, null, 29]), {
    count: 2,
    average: 29.5,
    shortest: 29,
    longest: 30,
  });
  assert.deepEqual(statistics([null]), { count: 0, average: null, shortest: null, longest: null });
  let journal = emptyJournal('2026-10-09');
  for (const day of ['2026-08-30', '2026-09-29'])
    journal = updateEntry(journal, day, { flow: 'light', periodStart: true });
  journal = updateEntry(journal, '2026-10-02', { flow: 'light', periodEnd: true });
  journal = updateEntry(journal, '2026-10-03', { flow: 'light', periodEnd: true });
  const cycles = history(journal, '2026-10-09');
  assert.equal(cycles[0]?.duration, null);
  assert.equal(cycles[1]?.duration, 4);
  assert.deepEqual(statistics(cycles.map((cycle) => cycle.duration)), {
    count: 1,
    average: 4,
    shortest: 4,
    longest: 4,
  });
});

test('explicit no-flow survives encrypted restore and appears distinctly in CSV', async () => {
  let journal = updateEntry(emptyJournal('2026-10-09'), '2026-10-08', { flow: 'none' });
  journal = updateEntry(journal, '2026-10-09', { note: 'Fictional unknown-flow day' });
  const vault = await newKey('fictional flow history test', randomBytes);
  const restored = await openVault(
    seal(journal, vault, randomBytes),
    'fictional flow history test',
  );
  assert.deepEqual(restored.journal, journal);
  const rows = toCSV(restored.journal).split('\r\n');
  assert.equal(rows[0]?.split(',')[7], '"Flow recorded"');
  assert.equal(rows[1]?.split(',')[7], '"true"');
  assert.equal(rows[2]?.split(',')[7], '"false"');
  vault.key.fill(0);
  restored.vault.key.fill(0);
});
