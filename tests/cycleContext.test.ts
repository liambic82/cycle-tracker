import test from 'node:test';
import assert from 'node:assert/strict';
import { dayContext, educationCards, EDUCATION_SOURCES } from '../src/domain/cycleContext.ts';
import { addDays } from '../src/domain/dates.ts';
import { emptyJournal, updateEntry, type Flow } from '../src/domain/journal.ts';

const today = '2026-10-09';

test('an empty day has no invented start, flow, or phase', () => {
  const context = dayContext(emptyJournal(today), today, today);
  assert.equal(context.lastStart, null);
  assert.equal(context.cycleDay, null);
  assert.equal(context.daysSinceStart, null);
  assert.equal(context.flow, 'unknown');
  assert.equal(context.phase, 'unknown');
});

test('recorded day counts use only starts on or before the selected day', () => {
  let journal = emptyJournal(today);
  for (const date of ['2026-09-01', '2026-09-30', '2026-10-20'])
    journal = updateEntry(journal, date, { flow: 'light', periodStart: true });
  const atStart = dayContext(journal, '2026-09-30', today);
  assert.equal(atStart.cycleDay, 1);
  assert.equal(atStart.daysSinceStart, 0);
  assert.equal(dayContext(journal, '2026-09-29', today).cycleDay, 29);
  assert.equal(dayContext(journal, today, today).cycleDay, 10);
  assert.equal(dayContext(journal, '2026-08-31', today).lastStart, null);
});

test('counts survive leap day and daylight-saving boundaries without assigning a phase', () => {
  for (const start of ['2024-02-28', '2026-03-07', '2026-10-31']) {
    const journal = updateEntry(emptyJournal(start), start, { flow: 'medium', periodStart: true });
    const day = addDays(start, 3);
    assert.equal(dayContext(journal, day, day).cycleDay, 4);
    assert.equal(dayContext(journal, day, day).phase, 'unknown');
  }
});

test('mid-cycle, long gaps, and symptoms never establish ovulation, menopause, or hormones', () => {
  let journal = updateEntry(emptyJournal(today), '2025-01-01', {
    flow: 'medium',
    periodStart: true,
  });
  journal = updateEntry(journal, today, {
    symptoms: ['Hot flashes', 'Cramps'],
    cramps: 6,
    note: 'PRIVATE NOTE',
    sexualHealth: { activity: true, intensity: 'intense', orgasm: true, libido: 'high' },
  });
  const before = structuredClone(journal);
  assert.equal(dayContext(journal, '2025-01-14', today).phase, 'unknown');
  const context = dayContext(journal, today, today);
  assert.ok(context.cycleDay! > 365);
  assert.equal(context.phase, 'unknown');
  assert.equal(context.flow, 'unknown');
  const output = JSON.stringify(context);
  for (const privateText of ['PRIVATE NOTE', 'Hot flashes', 'libido', 'cramps'])
    assert.ok(!output.includes(privateText));
  assert.deepEqual(journal, before);
});

test('a future date never projects a cycle day or exposes imported future flow', () => {
  let journal = updateEntry(emptyJournal(today), today, { flow: 'medium', periodStart: true });
  journal = updateEntry(journal, addDays(today, 1), { flow: 'heavy', periodStart: true });
  const future = dayContext(journal, addDays(today, 1), today);
  assert.equal(future.future, true);
  assert.equal(future.cycleDay, null);
  assert.equal(future.daysSinceStart, null);
  assert.equal(future.lastStart, null);
  assert.equal(future.flow, 'unknown');
});

test('flow distinguishes all explicit choices from note-only days and cleared observations', () => {
  for (const flow of ['none', 'spotting', 'light', 'medium', 'heavy'] as Flow[]) {
    const journal = updateEntry(emptyJournal(today), today, { flow });
    assert.equal(dayContext(journal, today, today).flow, flow);
    assert.equal(dayContext(journal, today, today).cycleDay, null);
    const cleared = updateEntry(journal, today, {
      flow: 'none',
      flowRecorded: false,
      note: 'Retained',
    });
    assert.equal(dayContext(cleared, today, today).flow, 'unknown');
    assert.equal(cleared.entries[today]!.note, 'Retained');
  }
});

test('clearing a period-start marker immediately removes derived context without altering other records', () => {
  const journal = updateEntry(emptyJournal(today), today, {
    flow: 'medium',
    periodStart: true,
    note: 'Keep',
  });
  assert.equal(dayContext(journal, today, today).cycleDay, 1);
  const cleared = updateEntry(journal, today, { periodStart: false });
  assert.equal(dayContext(cleared, today, today).cycleDay, null);
  assert.equal(dayContext(cleared, today, today).flow, 'medium');
  assert.equal(cleared.entries[today]!.note, 'Keep');
});

test('perimenopause visibility only filters its education topic, preserving all general topics', () => {
  const all = educationCards(true);
  const hidden = educationCards(false);
  assert.ok(all.some((card) => card.id === 'perimenopause'));
  assert.ok(!hidden.some((card) => card.id === 'perimenopause'));
  assert.deepEqual(
    hidden,
    all.filter((card) => !card.perimenopause),
  );
  assert.ok(hidden.some((card) => card.id === 'medications'));
  assert.ok(hidden.some((card) => card.id === 'cycle'));
  assert.deepEqual(educationCards(true), all);
});

test('every education topic has distinct identity and static public sources without journal parameters', () => {
  const cards = educationCards(true);
  assert.equal(new Set(cards.map((card) => card.id)).size, cards.length);
  for (const card of cards) {
    assert.ok(card.sources.length);
    for (const key of card.sources) {
      const source = EDUCATION_SOURCES[key];
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:');
      assert.ok(['www.nhs.uk', 'womenshealth.gov', 'www.nichd.nih.gov'].includes(url.hostname));
      assert.equal(url.search, '');
      assert.equal(url.hash, '');
      assert.ok(source.title && source.publisher);
    }
  }
});
