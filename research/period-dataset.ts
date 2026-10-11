import { sha256 } from '@noble/hashes/sha2.js';
import { addDays, daysBetween } from '../src/domain/dates.ts';
import { type EstimateContext } from '../src/domain/periodEstimate.ts';
import { evaluatePeriodPolicy, summarizePeriodPolicy, type PolicyRow } from './period-policy.ts';

export const DATASET_PROTOCOL = 'period-history-v1';
export const SPLIT_PROTOCOL = 'sha256-participant-v1-60-20-20';
export type ResearchSplit = 'development' | 'calibration' | 'test';
export type ResearchSegment = {
  startDays: number[];
  observedThrough: number;
  context: EstimateContext;
  complete: boolean;
};
export type PeriodDataset = {
  protocol: typeof DATASET_PROTOCOL;
  provenance: {
    datasetId: string;
    kind: 'synthetic' | 'external';
    sourceUrl: string;
    sourceSha256: string | null;
    rightsReference: string;
    loggingAssumption: 'same-day-assumed';
  };
  participants: { id: string; segments: ResearchSegment[] }[];
};

// Excludes raw source fields, names, notes, demographics and post-cycle features.
// Errors identify schema locations but never echo values or participant identifiers.
function fail(location: string): never {
  throw new Error(`Invalid research dataset at ${location}. See the period-history-v1 contract.`);
}
function object(value: unknown, keys: string[], location: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(location);
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !keys.includes(key))) return fail(location);
  return result;
}
const isId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
const isDay = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 36500;
const isReference = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 1000) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search;
  } catch {
    return false;
  }
};

export function parsePeriodDataset(value: unknown): PeriodDataset {
  const root = object(value, ['protocol', 'provenance', 'participants'], 'root');
  if (root.protocol !== DATASET_PROTOCOL) fail('protocol');
  const p = object(
    root.provenance,
    ['datasetId', 'kind', 'sourceUrl', 'sourceSha256', 'rightsReference', 'loggingAssumption'],
    'provenance',
  );
  if (
    !isId(p.datasetId) ||
    !['synthetic', 'external'].includes(p.kind as string) ||
    !isReference(p.sourceUrl) ||
    !isReference(p.rightsReference) ||
    !(
      (p.kind === 'synthetic' && p.sourceSha256 === null) ||
      (typeof p.sourceSha256 === 'string' && /^[a-f0-9]{64}$/.test(p.sourceSha256))
    ) ||
    p.loggingAssumption !== 'same-day-assumed'
  )
    fail('provenance');
  if (
    !Array.isArray(root.participants) ||
    !root.participants.length ||
    root.participants.length > 10000
  )
    fail('participants');
  const ids = new Set<string>();
  let totalStarts = 0;
  const participants = root.participants.map((value, index) => {
    const location = `participants[${index}]`;
    const participant = object(value, ['id', 'segments'], location);
    if (!isId(participant.id) || ids.has(participant.id)) fail(location);
    ids.add(participant.id);
    if (
      !Array.isArray(participant.segments) ||
      !participant.segments.length ||
      participant.segments.length > 100
    )
      fail(`${location}.segments`);
    let previousEnd = -1;
    const segments = participant.segments.map((value, segmentIndex): ResearchSegment => {
      const at = `${location}.segments[${segmentIndex}]`;
      const s = object(value, ['startDays', 'observedThrough', 'context', 'complete'], at);
      if (
        !Array.isArray(s.startDays) ||
        !s.startDays.length ||
        s.startDays.length > 1024 ||
        !s.startDays.every(isDay) ||
        !isDay(s.observedThrough) ||
        typeof s.complete !== 'boolean' ||
        !['unknown', 'comparable', 'hormonal', 'pregnancy', 'changing'].includes(
          s.context as string,
        )
      )
        fail(at);
      const startDays = s.startDays as number[];
      if (
        startDays[0]! <= previousEnd ||
        startDays.at(-1)! > s.observedThrough ||
        startDays.some((day, i) => i > 0 && day <= startDays[i - 1]!)
      )
        fail(at);
      totalStarts += startDays.length;
      if (totalStarts > 100000) fail('participant start limit');
      previousEnd = s.observedThrough;
      return {
        startDays: [...startDays],
        observedThrough: s.observedThrough,
        context: s.context as EstimateContext,
        complete: s.complete,
      };
    });
    return { id: participant.id, segments };
  });
  return {
    protocol: DATASET_PROTOCOL,
    provenance: {
      datasetId: p.datasetId,
      kind: p.kind as 'synthetic' | 'external',
      sourceUrl: p.sourceUrl,
      sourceSha256: p.sourceSha256 as string | null,
      rightsReference: p.rightsReference,
      loggingAssumption: 'same-day-assumed',
    },
    participants,
  };
}

// Stable dataset and participant identifiers determine assignment, never outcomes or row order.
// Keep these identifiers fixed across exports. Hashing here is not deidentification.
export function participantSplit(datasetId: string, participantId: string): ResearchSplit {
  const bytes = sha256(
    new TextEncoder().encode(JSON.stringify([SPLIT_PROTOCOL, datasetId, participantId])),
  );
  const fraction = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0) / 2 ** 32;
  return fraction < 0.6 ? 'development' : fraction < 0.8 ? 'calibration' : 'test';
}

// Candidate v1: latest six intervals, chronological weights 1..n; smallest value
// whose cumulative weight is >= half of all weights. No fitted parameters.
export function recencyWeightedMedian(lengths: readonly number[]): number {
  if (!lengths.length || lengths.length > 6 || lengths.some((n) => !Number.isInteger(n) || n <= 0))
    throw new Error('Weighted median requires one to six positive whole-day intervals.');
  const values = lengths
    .map((days, i) => ({ days, weight: i + 1 }))
    .sort((a, b) => a.days - b.days);
  const half = (lengths.length * (lengths.length + 1)) / 4;
  let weight = 0;
  for (const item of values) {
    weight += item.weight;
    if (weight >= half) return item.days;
  }
  throw new Error('Unreachable weighted median.');
}

export function benchmarkPeriodDataset(
  dataset: PeriodDataset,
  split: ResearchSplit,
  issueOffsetDays = 0,
) {
  if (!['development', 'calibration', 'test'].includes(split))
    throw new Error('Choose a research split.');
  const rows: PolicyRow[] = [];
  const cohorts = { development: 0, calibration: 0, test: 0 };
  let peopleWithForecast = 0;
  let segments = 0;
  for (const participant of dataset.participants) {
    const assigned = participantSplit(dataset.provenance.datasetId, participant.id);
    cohorts[assigned]++;
    if (assigned !== split) continue;
    const personRows: PolicyRow[] = [];
    for (const segment of participant.segments) {
      segments++;
      personRows.push(
        ...evaluatePeriodPolicy(
          {
            name: 'Research segment',
            firstStart: addDays('2000-01-01', segment.startDays[0]!),
            lengths: segment.startDays.slice(1).map((day, i) => day - segment.startDays[i]!),
            review: { enabled: true, context: segment.context, complete: segment.complete },
            finalFollowUpDays: segment.observedThrough - segment.startDays.at(-1)!,
          },
          issueOffsetDays,
        ),
      );
    }
    if (personRows.some((row) => row.result?.estimate)) peopleWithForecast++;
    rows.push(...personRows);
  }
  const scored = rows.filter((row) => row.outcome === 'observed' && row.result?.estimate);
  const weightedErrors = scored.map((row) =>
    Math.abs(
      recencyWeightedMedian(row.result!.intervals.map((interval) => interval.days)) -
        daysBetween(row.anchor, row.target!),
    ),
  );
  return {
    protocol: DATASET_PROTOCOL,
    splitProtocol: SPLIT_PROTOCOL,
    kind: dataset.provenance.kind,
    split,
    issueOffsetDays,
    cohorts,
    participants: cohorts[split],
    peopleWithForecast,
    peopleWithoutForecast: cohorts[split] - peopleWithForecast,
    segments,
    policy: summarizePeriodPolicy(rows),
    recencyWeightedMedian: {
      version: 'linear-weights-1-to-6-v1',
      scored: weightedErrors.length,
      meanAbsoluteError: weightedErrors.length
        ? weightedErrors.reduce((a, b) => a + b, 0) / weightedErrors.length
        : null,
    },
  };
}
