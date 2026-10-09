import { addDays, daysBetween, type Day } from './dates.ts';
import { starts, type Entry, type Journal } from './journal.ts';

export type FlowState = 'bleeding' | 'spotting' | 'none' | 'unknown';
export function flowState(entry: Entry | undefined): FlowState {
  if (!entry?.flowRecorded) return 'unknown';
  if (entry.flow === 'none' || entry.flow === 'spotting') return entry.flow;
  return 'bleeding';
}
export function statistics(values: Array<number | null>) {
  const known = values.filter((value): value is number => value !== null);
  if (!known.length) return { count: 0, average: null, shortest: null, longest: null };
  return {
    count: known.length,
    average: Math.round((known.reduce((sum, value) => sum + value, 0) / known.length) * 10) / 10,
    shortest: Math.min(...known),
    longest: Math.max(...known),
  };
}
// Run lengths retain chronology without allocating one element for every unlogged day.
export function flowTimeline(journal: Journal, start: Day, end: Day) {
  const runs: Array<{ state: FlowState; days: number }> = [];
  const counts: Record<FlowState, number> = { bleeding: 0, spotting: 0, none: 0, unknown: 0 };
  const append = (state: FlowState, days: number) => {
    if (days <= 0) return;
    counts[state] += days;
    const previous = runs.at(-1);
    if (previous?.state === state) previous.days += days;
    else runs.push({ state, days });
  };
  let cursor = start;
  for (const day of Object.keys(journal.entries)
    .filter((day) => day >= start && day <= end)
    .sort()) {
    append('unknown', daysBetween(cursor, day));
    append(flowState(journal.entries[day]), 1);
    cursor = addDays(day, 1);
  }
  append('unknown', daysBetween(cursor, end) + 1);
  return { runs, counts, total: Math.max(0, daysBetween(start, end) + 1) };
}
export function cycleDayLookup(journal: Journal, through: Day) {
  const dates = starts(journal, through);
  return (day: Day): number | null => {
    if (day > through) return null;
    let left = 0;
    let right = dates.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (dates[mid]! <= day) left = mid + 1;
      else right = mid;
    }
    const start = dates[left - 1];
    return start ? daysBetween(start, day) + 1 : null;
  };
}
