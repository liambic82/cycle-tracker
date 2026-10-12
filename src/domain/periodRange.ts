import { addDays, daysBetween, validDay, type Day } from './dates.ts';
import { emptyEntry, history, updateEntry, type Flow, type Journal } from './journal.ts';
import { checkedJournalSize } from './medicalRecords.ts';

export type PeriodRange = { start: Day; end: Day | null; flow: Flow };

// Explicitly recording a period span records bleeding, without inventing its intensity.
// Existing daily observations always win. Conflicts fail the entire operation.
export function applyPeriodRange(journal: Journal, range: PeriodRange, today: Day): Journal {
  const { start, end, flow } = range;
  const last = end ?? start;
  if (!validDay(start) || !validDay(last) || start > last || last > today)
    throw new Error(
      'Choose a start and finish on or before today, with the finish on or after the start.',
    );
  if (!['unspecified', 'light', 'medium', 'heavy'].includes(flow))
    throw new Error('Choose bleeding with an optional flow level.');
  const count = daysBetween(start, last) + 1;
  if (count > 366)
    throw new Error('Add up to 366 days at a time. Check the selected year and dates.');
  for (const period of history(journal, today)) {
    if (
      period.end &&
      period.start <= last &&
      period.end >= start &&
      (period.start !== start || (end !== null && period.end !== end))
    )
      throw new Error(
        `This overlaps the period starting ${period.start}. Review that period in the calendar first. Nothing was changed.`,
      );
  }
  let next = journal;
  for (let i = 0; i < count; i++) {
    const date = addDays(start, i);
    const old = journal.entries[date] ?? emptyEntry();
    if (
      (old.flowRecorded && ['none', 'spotting'].includes(old.flow)) ||
      (old.periodStart && date !== start) ||
      (old.periodEnd && date !== last)
    )
      throw new Error(
        `Existing flow or a period boundary conflicts on ${date}. Review that day first. Nothing was changed.`,
      );
    const nextFlow = old.flowRecorded && old.flow !== 'unspecified' ? old.flow : flow;
    const periodStart = old.periodStart || date === start;
    const periodEnd = old.periodEnd || (end !== null && date === end);
    if (
      old.flowRecorded &&
      old.flow === nextFlow &&
      old.periodStart === periodStart &&
      old.periodEnd === periodEnd
    )
      continue;
    next = updateEntry(next, date, { flow: nextFlow, flowRecorded: true, periodStart, periodEnd });
  }
  if (Object.keys(next.entries).length > 40000)
    throw new Error('This would exceed the journal entry limit. Nothing was changed.');
  return checkedJournalSize(next);
}
