import { addDays, daysBetween, validDay, type Day } from './dates.ts';
import { starts, type Journal } from './journal.ts';

// Preview product limits, not clinical definitions of a normal cycle.
export const ESTIMATE_RULES = {
  historyDays: 365,
  intervals: 6,
  trainingMinimum: 3,
  shortest: 14,
  longest: 90,
  maximumSpread: 14,
  maximumMeanError: 7,
} as const;

export type EstimateContext = 'unknown' | 'comparable' | 'hormonal' | 'pregnancy' | 'changing';
export type EstimateReview = { enabled: boolean; context: EstimateContext; complete: boolean };
export const emptyEstimateReview = (): EstimateReview => ({
  enabled: false,
  context: 'unknown',
  complete: false,
});

export type Interval = { from: Day; through: Day; days: number };
export type Comparison = 'median' | 'mean' | 'last' | 'fixed28';
export type Holdout = {
  index: number;
  actual: number;
  prediction: Record<Comparison, number> | null;
  spread: { from: number; to: number } | null;
};
export type Backtest = {
  rows: Holdout[];
  available: number;
  offered: number;
  insideSpread: number;
  meanError: Record<Comparison, number> | null;
  largestError: number | null;
};

function profile(lengths: readonly number[]) {
  const sorted = [...lengths].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return {
    median: Math.round(median),
    mean: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
    from: sorted[0]!,
    to: sorted.at(-1)!,
  };
}

function historyIssue(lengths: readonly number[]): 'unsupported' | 'variable' | null {
  if (lengths.some((n) => n < ESTIMATE_RULES.shortest || n > ESTIMATE_RULES.longest))
    return 'unsupported';
  if (Math.max(...lengths) - Math.min(...lengths) > ESTIMATE_RULES.maximumSpread) return 'variable';
  return null;
}

// Each target is held out: neither its value nor a later interval can affect its prediction
// or abstention. All comparisons use identical folds, including unexpected target values.
export function backtestIntervals(lengths: readonly number[]): Backtest {
  if (lengths.some((n) => !Number.isInteger(n) || n <= 0))
    throw new Error('Invalid cycle intervals.');
  const rows: Holdout[] = [];
  for (let index = ESTIMATE_RULES.trainingMinimum; index < lengths.length; index++) {
    const training = lengths.slice(Math.max(0, index - ESTIMATE_RULES.intervals), index);
    const p = profile(training);
    const allowed = !historyIssue(training);
    rows.push({
      index,
      actual: lengths[index]!,
      prediction: allowed
        ? { median: p.median, mean: p.mean, last: training.at(-1)!, fixed28: 28 }
        : null,
      spread: allowed ? { from: p.from, to: p.to } : null,
    });
  }
  const offered = rows.filter((row) => row.prediction !== null);
  const error = (key: Comparison) =>
    offered.reduce((sum, row) => sum + Math.abs(row.actual - row.prediction![key]), 0) /
    offered.length;
  return {
    rows,
    available: rows.length,
    offered: offered.length,
    insideSpread: offered.filter(
      (row) => row.actual >= row.spread!.from && row.actual <= row.spread!.to,
    ).length,
    meanError: offered.length
      ? {
          median: error('median'),
          mean: error('mean'),
          last: error('last'),
          fixed28: error('fixed28'),
        }
      : null,
    largestError: offered.length
      ? Math.max(...offered.map((row) => Math.abs(row.actual - row.prediction!.median)))
      : null,
  };
}

export type EstimateStatus =
  | 'off'
  | 'context'
  | 'unconfirmed'
  | 'future-start'
  | 'insufficient'
  | 'stale'
  | 'unsupported'
  | 'variable'
  | 'poor-fit'
  | 'expired'
  | 'date-limit'
  | 'ready';
export type PeriodEstimateResult = {
  status: EstimateStatus;
  asOf: Day;
  intervals: Interval[];
  backtest: Backtest;
  estimate: { anchor: Day; center: Day; from: Day; to: Day; days: number } | null;
};

export function periodEstimate(
  journal: Journal,
  today: Day,
  review: EstimateReview,
): PeriodEstimateResult {
  if (!validDay(today)) throw new Error('Invalid estimate date.');
  const recorded = starts(journal, today);
  const recent = recorded
    .filter((day) => daysBetween(day, today) <= ESTIMATE_RULES.historyDays)
    .slice(-ESTIMATE_RULES.intervals - 1);
  const intervals = recent.slice(1).map((through, index) => ({
    from: recent[index]!,
    through,
    days: daysBetween(recent[index]!, through),
  }));
  const lengths = intervals.map((interval) => interval.days);
  const backtest = backtestIntervals(lengths);
  const unavailable = (status: EstimateStatus): PeriodEstimateResult => ({
    status,
    asOf: today,
    intervals,
    backtest,
    estimate: null,
  });
  if (!review.enabled) return unavailable('off');
  if (review.context !== 'comparable') return unavailable('context');
  if (!review.complete) return unavailable('unconfirmed');
  if (Object.entries(journal.entries).some(([date, entry]) => date > today && entry.periodStart))
    return unavailable('future-start');
  const anchor = recorded.at(-1);
  if (anchor && daysBetween(anchor, today) > ESTIMATE_RULES.longest) return unavailable('stale');
  if (lengths.length < ESTIMATE_RULES.intervals) return unavailable('insufficient');
  const issue = historyIssue(lengths);
  if (issue) return unavailable(issue);
  if (
    backtest.offered < 3 ||
    !backtest.meanError ||
    backtest.meanError.median > ESTIMATE_RULES.maximumMeanError
  )
    return unavailable('poor-fit');
  const p = profile(lengths);
  const estimate = {
    anchor: anchor!,
    center: addDays(anchor!, p.median),
    from: addDays(anchor!, p.from),
    to: addDays(anchor!, p.to),
    days: p.median,
  };
  if (![estimate.from, estimate.center, estimate.to].every(validDay))
    return unavailable('date-limit');
  if (today > estimate.to) return unavailable('expired');
  return { status: 'ready', asOf: today, intervals, backtest, estimate };
}
