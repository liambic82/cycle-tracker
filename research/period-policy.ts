// Research-only synthetic evaluation. No app imports this module and no personal data is read.
import { addDays, daysBetween, validDay, type Day } from '../src/domain/dates.ts';
import { emptyDailyDetails, type DailyDetails } from '../src/domain/dailyDetails.ts';
import { emptyJournal, updateEntry } from '../src/domain/journal.ts';
import {
  periodEstimate,
  type Comparison,
  type EstimateReview,
  type EstimateStatus,
  type PeriodEstimateResult,
} from '../src/domain/periodEstimate.ts';

export type SyntheticSeries = {
  name: string;
  lengths: readonly number[];
  review: EstimateReview;
  firstStart?: Day;
  // Observation dates are relative to the first start, with same-day logging assumed.
  observations?: readonly { afterDays: number; details: Partial<DailyDetails> }[];
  // Days observed after the final start, without a known next start. Not a cycle length.
  finalFollowUpDays: number;
};

export type PolicyRow = {
  index: number;
  anchor: Day;
  issuedOn: Day;
  target: Day | null;
  outcome: 'observed' | 'censored' | 'already-ended' | 'outside-follow-up';
  result: PeriodEstimateResult | null;
};

// This idealized replay assumes explicit starts and observations were logged on their dates.
// The target and all later starts are withheld. Real retrospective exports cannot prove this
// assumption: entry dates alone do not establish when a user entered or corrected a record.
export function evaluatePeriodPolicy(series: SyntheticSeries, issueOffsetDays = 0): PolicyRow[] {
  const first = series.firstStart ?? '2025-01-01';
  if (
    !validDay(first) ||
    !Number.isInteger(issueOffsetDays) ||
    issueOffsetDays < 0 ||
    !Number.isInteger(series.finalFollowUpDays) ||
    series.finalFollowUpDays < 0 ||
    series.lengths.some((length) => !Number.isInteger(length) || length <= 0) ||
    series.observations?.some((o) => !Number.isInteger(o.afterDays) || o.afterDays < 0)
  )
    throw new Error('Invalid synthetic series.');

  const starts = [first];
  for (const length of series.lengths) starts.push(addDays(starts.at(-1)!, length));
  const observedThrough = addDays(starts.at(-1)!, series.finalFollowUpDays);
  if (![...starts, observedThrough].every(validDay)) throw new Error('Unsupported study dates.');

  return starts.map((anchor, index): PolicyRow => {
    const issuedOn = addDays(anchor, issueOffsetDays);
    if (!validDay(issuedOn)) throw new Error('Unsupported issue date.');
    const target = starts[index + 1] ?? null;
    if (target !== null && target <= issuedOn)
      return { index, anchor, issuedOn, target, outcome: 'already-ended', result: null };
    if (issuedOn > observedThrough)
      return { index, anchor, issuedOn, target, outcome: 'outside-follow-up', result: null };

    let journal = emptyJournal(issuedOn);
    for (const start of starts.slice(0, index + 1))
      journal = updateEntry(journal, start, { flow: 'medium', periodStart: true });
    for (const observation of series.observations ?? []) {
      const day = addDays(first, observation.afterDays);
      if (day > issuedOn) continue;
      journal = updateEntry(journal, day, {
        dailyDetails: {
          ...(journal.entries[day]?.dailyDetails ?? emptyDailyDetails()),
          ...observation.details,
        },
      });
    }
    const result = periodEstimate(journal, issuedOn, series.review);
    return { index, anchor, issuedOn, target, outcome: target ? 'observed' : 'censored', result };
  });
}

const average = (values: number[]) =>
  values.length ? values.reduce((total, n) => total + n, 0) / values.length : null;

export function summarizePeriodPolicy(rows: readonly PolicyRow[]) {
  const opportunities = rows.filter((row) => row.result !== null);
  const offered = opportunities.filter((row) => row.result!.estimate !== null);
  const scored = offered.filter((row) => row.outcome === 'observed');
  const signedErrors = scored.map((row) => daysBetween(row.target!, row.result!.estimate!.center));
  const absoluteErrors = signedErrors.map(Math.abs);
  const statuses: Partial<Record<EstimateStatus, number>> = {};
  for (const row of opportunities) {
    const status = row.result!.status;
    statuses[status] = (statuses[status] ?? 0) + 1;
  }
  // Baselines use the production policy's offered, observed folds. This does not evaluate
  // a different model's own eligibility policy or choose a winner from synthetic examples.
  const meanError: Record<Comparison, number | null> = {
    median: average(absoluteErrors),
    mean: average(
      scored.map((row) => {
        const lengths = row.result!.intervals.map((interval) => interval.days);
        return Math.abs(Math.round(average(lengths)!) - daysBetween(row.anchor, row.target!));
      }),
    ),
    last: average(
      scored.map((row) =>
        Math.abs(row.result!.intervals.at(-1)!.days - daysBetween(row.anchor, row.target!)),
      ),
    ),
    fixed28: average(scored.map((row) => Math.abs(28 - daysBetween(row.anchor, row.target!)))),
  };
  return {
    opportunities: opportunities.length,
    observed: opportunities.filter((row) => row.outcome === 'observed').length,
    censored: opportunities.filter((row) => row.outcome === 'censored').length,
    offered: offered.length,
    scored: scored.length,
    offeredCensored: offered.length - scored.length,
    alreadyEnded: rows.filter((row) => row.outcome === 'already-ended').length,
    outsideFollowUp: rows.filter((row) => row.outcome === 'outside-follow-up').length,
    statuses,
    meanError,
    meanSignedError: average(signedErrors),
    largestError: absoluteErrors.length ? Math.max(...absoluteErrors) : null,
    within1: absoluteErrors.filter((error) => error <= 1).length,
    within3: absoluteErrors.filter((error) => error <= 3).length,
    within7: absoluteErrors.filter((error) => error <= 7).length,
    insideSpread: scored.filter(
      (row) => row.target! >= row.result!.estimate!.from && row.target! <= row.result!.estimate!.to,
    ).length,
    meanSpreadWidth: average(
      offered.map((row) => daysBetween(row.result!.estimate!.from, row.result!.estimate!.to)),
    ),
  };
}
