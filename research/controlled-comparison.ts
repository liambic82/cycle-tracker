import { addDays, daysBetween } from '../src/domain/dates.ts';
import { evaluatePeriodPolicy, type PolicyRow } from './period-policy.ts';
import {
  parsePeriodDataset,
  participantSplit,
  recencyWeightedMedian,
  type PeriodDataset,
  type ResearchSplit,
} from './period-dataset.ts';

export const COMPARISON_VERSION = 'conditional-period-comparison-v1';
export const METHODS = ['median', 'mean', 'last', 'fixed28', 'weighted'] as const;
export type Method = (typeof METHODS)[number];
export type SourceStratum = 'old-only' | 'new-only' | 'mixed';
export const BOOTSTRAP = { replicates: 2000, seed: 20261011 } as const;
type Errors = Record<Method, number>;
type Fold = { errors: Errors; insideSpread: boolean };
export type ClusterTotals = {
  scored: number;
  absoluteErrors: Errors;
  opportunities: number;
  offered: number;
  insideSpread: number;
};
type Person = {
  stratum: SourceStratum;
  rows: PolicyRow[];
  folds: Fold[];
  totals: ClusterTotals;
};
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const mean = (values: number[]) => (values.length ? sum(values) / values.length : null);
const ratio = (count: number, denominator: number) => ({
  count,
  denominator,
  fraction: denominator ? count / denominator : null,
});
const methodValues = (value: (method: Method) => number): Errors =>
  Object.fromEntries(METHODS.map((m) => [m, value(m)])) as Errors;

// R type-7 linear quantile, used for ordinary medians and bootstrap endpoints.
// p90 absolute error deliberately uses the separately specified nearest-rank rule.
export function linearQuantile(values: readonly number[], probability: number): number | null {
  if (!(probability >= 0 && probability <= 1) || values.some((n) => !Number.isFinite(n)))
    throw new Error('Invalid quantile inputs.');
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  return sorted[lower]! + (position - lower) * (sorted[Math.ceil(position)]! - sorted[lower]!);
}

export function summarizeErrors(signed: readonly number[]) {
  const errors = signed.map(Math.abs).sort((a, b) => a - b);
  return {
    scored: signed.length,
    meanAbsoluteError: mean(errors),
    medianAbsoluteError: linearQuantile(errors, 0.5),
    p90AbsoluteError: errors.length ? errors[Math.ceil(0.9 * errors.length) - 1]! : null,
    meanSignedError: mean([...signed]),
    largestError: errors.at(-1) ?? null,
    within1: ratio(errors.filter((n) => n <= 1).length, errors.length),
    within3: ratio(errors.filter((n) => n <= 3).length, errors.length),
    within7: ratio(errors.filter((n) => n <= 7).length, errors.length),
  };
}

export function xorshift32(seed: number) {
  if (!Number.isInteger(seed) || seed <= 0 || seed > 0xffffffff)
    throw new Error('Invalid bootstrap seed.');
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 2 ** 32;
  };
}

export function bootstrapParticipants(
  clusters: readonly ClusterTotals[],
  replicates = 2000,
  seed = 20261011,
) {
  if (!Number.isInteger(replicates) || replicates < 1 || replicates > 10000)
    throw new Error('Invalid bootstrap replicate count.');
  const random = xorshift32(seed);
  const samples = Object.fromEntries(METHODS.map((m) => [m, [] as number[]])) as Record<
    Method,
    number[]
  >;
  const differences: number[] = [],
    availability: number[] = [],
    spreadCoverage: number[] = [];
  for (let replicate = 0; replicate < replicates; replicate++) {
    const errors = methodValues(() => 0);
    let scored = 0,
      opportunities = 0,
      offered = 0,
      inside = 0;
    // Sample people, including people with no forecasts, and preserve every one's rows.
    // Sufficient sums reproduce pooled-cycle MAE; there is no cycle-level resampling.
    for (let draw = 0; draw < clusters.length; draw++) {
      const person = clusters[Math.floor(random() * clusters.length)]!;
      scored += person.scored;
      opportunities += person.opportunities;
      offered += person.offered;
      inside += person.insideSpread;
      for (const m of METHODS) errors[m] += person.absoluteErrors[m];
    }
    if (scored) {
      for (const m of METHODS) samples[m].push(errors[m] / scored);
      differences.push((errors.weighted - errors.median) / scored);
      spreadCoverage.push(inside / scored);
    }
    if (opportunities) availability.push(offered / opportunities);
  }
  const interval = (values: number[]) => ({
    lower: linearQuantile(values, 0.025),
    upper: linearQuantile(values, 0.975),
    definedReplicates: values.length,
    undefinedReplicates: replicates - values.length,
  });
  return {
    method: 'paired participant-cluster percentile bootstrap',
    replicates,
    seed,
    rng: 'xorshift32',
    intervalLevel: 0.95,
    endpointQuantile: 'linear type 7',
    sampledParticipantsPerReplicate: clusters.length,
    meanAbsoluteError: Object.fromEntries(METHODS.map((m) => [m, interval(samples[m])])),
    weightedMinusMedian: interval(differences),
    availability: interval(availability),
    historicalSpreadCoverage: interval(spreadCoverage),
  };
}

// This function accepts only the audit stratum. Birth dates/flags cannot enter replay.
function evaluatePerson(
  participant: PeriodDataset['participants'][number],
  stratum: SourceStratum,
): Person {
  const rows = participant.segments.flatMap((segment) =>
    evaluatePeriodPolicy(
      {
        name: 'Conditional research history',
        firstStart: addDays('2000-01-01', segment.startDays[0]!),
        lengths: segment.startDays.slice(1).map((day, i) => day - segment.startDays[i]!),
        // Counterfactual analysis specified in the frozen plan, not a source-data correction.
        review: { enabled: true, context: 'comparable', complete: true },
        finalFollowUpDays: segment.observedThrough - segment.startDays.at(-1)!,
      },
      0,
    ),
  );
  const offered = rows.filter((row) => row.result?.estimate);
  const folds = offered
    .filter((row) => row.outcome === 'observed')
    .map((row): Fold => {
      const result = row.result!,
        estimate = result.estimate!;
      const lengths = result.intervals.map((i) => i.days);
      const actual = daysBetween(row.anchor, row.target!);
      return {
        errors: {
          median: estimate.days - actual,
          mean: Math.round(mean(lengths)!) - actual,
          last: lengths.at(-1)! - actual,
          fixed28: 28 - actual,
          weighted: recencyWeightedMedian(lengths) - actual,
        },
        insideSpread: row.target! >= estimate.from && row.target! <= estimate.to,
      };
    });
  return {
    stratum,
    rows,
    folds,
    totals: {
      scored: folds.length,
      absoluteErrors: methodValues((m) => sum(folds.map((f) => Math.abs(f.errors[m])))),
      opportunities: rows.filter((row) => row.result !== null).length,
      offered: offered.length,
      insideSpread: folds.filter((f) => f.insideSpread).length,
    },
  };
}

function summarizePeople(people: readonly Person[]) {
  const rows = people.flatMap((p) => p.rows),
    folds = people.flatMap((p) => p.folds);
  const opportunities = rows.filter((row) => row.result !== null);
  const offered = opportunities.filter((row) => row.result!.estimate !== null);
  const statuses: Record<string, number> = {};
  for (const row of opportunities)
    statuses[row.result!.status] = (statuses[row.result!.status] ?? 0) + 1;
  const metrics = Object.fromEntries(
    METHODS.map((m) => [m, summarizeErrors(folds.map((f) => f.errors[m]))]),
  );
  return {
    participants: people.length,
    peopleWithForecast: people.filter((p) => p.totals.offered > 0).length,
    peopleWithoutForecast: people.filter((p) => p.totals.offered === 0).length,
    peopleWithScoredForecast: people.filter((p) => p.totals.scored > 0).length,
    opportunities: opportunities.length,
    observed: opportunities.filter((row) => row.outcome === 'observed').length,
    censored: opportunities.filter((row) => row.outcome === 'censored').length,
    availability: ratio(offered.length, opportunities.length),
    offeredCensored: offered.filter((row) => row.outcome === 'censored').length,
    scored: folds.length,
    alreadyEnded: rows.filter((row) => row.outcome === 'already-ended').length,
    outsideFollowUp: rows.filter((row) => row.outcome === 'outside-follow-up').length,
    statuses: Object.fromEntries(
      Object.entries(statuses).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
    methods: metrics,
    weightedMinusMedian: mean(
      folds.map((f) => Math.abs(f.errors.weighted) - Math.abs(f.errors.median)),
    ),
    historicalSpread: {
      coverage: ratio(folds.filter((f) => f.insideSpread).length, folds.length),
      meanWidthDays: mean(
        offered.map((row) => daysBetween(row.result!.estimate!.from, row.result!.estimate!.to)),
      ),
      widthDenominator: offered.length,
    },
  };
}

export function comparePeriodDataset(
  input: PeriodDataset,
  strata: ReadonlyMap<string, SourceStratum>,
  split: ResearchSplit,
) {
  const dataset = parsePeriodDataset(input);
  if (
    !['development', 'calibration', 'test'].includes(split) ||
    strata.size !== dataset.participants.length
  )
    throw new Error(
      'Comparison requires exactly one participant group and matching source strata.',
    );
  for (const person of dataset.participants) {
    if (
      participantSplit(dataset.provenance.datasetId, person.id) !== split ||
      !['old-only', 'new-only', 'mixed'].includes(strata.get(person.id) ?? '') ||
      person.segments.some((s) => s.context !== 'unknown' || s.complete)
    )
      throw new Error(
        'Comparison group, source stratum or unknown-context contract does not match.',
      );
  }
  // Stable ID order fixes bootstrap draws independently of input order and outcomes.
  const people = [...dataset.participants]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((p) => evaluatePerson(p, strata.get(p.id)!));
  return {
    version: COMPARISON_VERSION,
    split,
    issueOffsetDays: 0,
    analysis: 'conditional-calendar-policy',
    assumptions: {
      sourceContext: 'unknown',
      sourceCompleteness: 'not established',
      evaluationOnly: { enabled: true, context: 'comparable', complete: true },
      logging: 'same-day assumed',
      birthAnnotationsUsedForEligibility: false,
    },
    overall: summarizePeople(people),
    uncertainty: bootstrapParticipants(
      people.map((p) => p.totals),
      BOOTSTRAP.replicates,
      BOOTSTRAP.seed,
    ),
    sourceStrata: Object.fromEntries(
      (['old-only', 'new-only', 'mixed'] as const).map((s) => [
        s,
        summarizePeople(people.filter((p) => p.stratum === s)),
      ]),
    ),
  };
}

export function sourceStrataFromAudit(
  dataset: PeriodDataset,
  split: ResearchSplit,
  value: unknown,
): Map<string, SourceStratum> {
  const invalid = (): never => {
    throw new Error('Audit source strata do not match the prepared participant group.');
  };
  if (!value || typeof value !== 'object') return invalid();
  const audit = value as Record<string, unknown>;
  if (
    audit.split !== split ||
    audit.preparationVersion !== 'zenodo-recorded-starts-v1' ||
    audit.role !== 'retrospective-audit-only-not-predictor-input' ||
    !Array.isArray(audit.participants)
  )
    return invalid();
  const expected = new Set(dataset.participants.map((p) => p.id));
  const strata = new Map<string, SourceStratum>();
  for (const value of audit.participants) {
    if (!value || typeof value !== 'object') return invalid();
    const p = value as Record<string, unknown>;
    if (
      typeof p.id !== 'string' ||
      !expected.has(p.id) ||
      strata.has(p.id) ||
      !Array.isArray(p.studySources) ||
      !p.studySources.length ||
      p.studySources.length > 2 ||
      p.studySources.some((s) => s !== 'old' && s !== 'new') ||
      new Set(p.studySources).size !== p.studySources.length
    )
      return invalid();
    strata.set(
      p.id,
      p.studySources.length === 2 ? 'mixed' : p.studySources[0] === 'old' ? 'old-only' : 'new-only',
    );
  }
  if (strata.size !== expected.size) return invalid();
  return strata;
}
