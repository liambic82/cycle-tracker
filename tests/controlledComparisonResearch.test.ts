import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  comparePeriodDataset,
  bootstrapParticipants,
  linearQuantile,
  summarizeErrors,
  xorshift32,
  sourceStrataFromAudit,
  type ClusterTotals,
} from '../research/controlled-comparison.ts';
import { participantSplit, parsePeriodDataset } from '../research/period-dataset.ts';
import { checkedJson, hash, loadDevelopmentComparison } from '../research/controlled-input.mjs';

const fixture = JSON.parse(
  readFileSync(
    new URL('../research/fixtures/period-history.synthetic.json', import.meta.url),
    'utf8',
  ),
);
function dataset(histories: number[][]) {
  let nextId = 0;
  return parsePeriodDataset({
    ...fixture,
    participants: histories.map((lengths) => {
      let id;
      do {
        id = `fictional-controlled-${nextId++}`;
      } while (participantSplit(fixture.provenance.datasetId, id) !== 'development');
      const startDays = [0];
      for (const length of lengths) startDays.push(startDays.at(-1)! + length);
      return {
        id,
        segments: [
          { startDays, observedThrough: startDays.at(-1), context: 'unknown', complete: false },
        ],
      };
    }),
  });
}
const strata = (d) => new Map(d.participants.map((p) => [p.id, 'new-only']));
const run = (d) => comparePeriodDataset(d, strata(d), 'development');
const totals = (
  scored: number,
  median: number,
  weighted: number,
  opportunities = 5,
  offered = scored,
): ClusterTotals => ({
  scored,
  absoluteErrors: { median, weighted, mean: median, last: median, fixed28: median },
  opportunities,
  offered,
  insideSpread: 0,
});

test('controlled stable replay counts cold starts and censored forecasts without changing source context', () => {
  const input = dataset([Array(12).fill(28)]),
    before = JSON.stringify(input);
  const report = run(input),
    r = report.overall;
  assert.equal(r.opportunities, 13);
  assert.equal(r.observed, 12);
  assert.equal(r.censored, 1);
  assert.deepEqual(r.availability, { count: 7, denominator: 13, fraction: 7 / 13 });
  assert.equal(r.scored, 6);
  assert.equal(r.offeredCensored, 1);
  assert.deepEqual(r.statuses, { insufficient: 6, ready: 7 });
  for (const m of Object.values(r.methods)) {
    assert.equal(m.meanAbsoluteError, 0);
    assert.equal(m.scored, 6);
    assert.equal(m.within1.denominator, 6);
  }
  assert.equal(r.historicalSpread.widthDenominator, 7);
  assert.equal(r.historicalSpread.coverage.fraction, 1);
  assert.equal(JSON.stringify(input), before);
  assert.equal(report.assumptions.sourceContext, 'unknown');
  assert.equal(JSON.stringify(report).includes(input.participants[0]!.id), false);
});

test('hand-calculated drift gives matched median/weighted/last errors of 3/2/1 days', () => {
  const report = run(dataset([Array.from({ length: 12 }, (_, i) => 24 + i)]));
  const r = report.overall;
  assert.equal(r.scored, 6);
  assert.equal(r.methods.median.meanAbsoluteError, 3);
  assert.equal(r.methods.weighted.meanAbsoluteError, 2);
  assert.equal(r.methods.last.meanAbsoluteError, 1);
  assert.equal(r.methods.fixed28.meanAbsoluteError, 4.5);
  assert.equal(r.methods.median.meanSignedError, -3);
  assert.equal(r.weightedMinusMedian, -1);
  assert.equal(r.historicalSpread.coverage.count, 0);
  assert.equal(r.historicalSpread.meanWidthDays, 5);
  assert.deepEqual(report.uncertainty.weightedMinusMedian, {
    lower: -1,
    upper: -1,
    definedReplicates: 2000,
    undefinedReplicates: 0,
  });
});

test('unexpected target lengths remain scored and never retrospectively disqualify the issued forecast', () => {
  for (const length of [95, 120]) {
    const r = run(dataset([[28, 28, 28, 28, 28, 28, length]])).overall;
    assert.equal(r.scored, 1);
    assert.equal(r.availability.count, 1);
    assert.equal(r.methods.median.largestError, length - 28);
    assert.equal(r.methods.median.meanSignedError, 28 - length);
  }
});

test('error quantiles, signed errors and missing denominators have explicit definitions', () => {
  const values = [-1, 2, -3, 4, -5, 6, -7, 8, -9, 100];
  const result = summarizeErrors(values);
  assert.equal(result.meanAbsoluteError, 14.5);
  assert.equal(result.medianAbsoluteError, 5.5);
  assert.equal(result.p90AbsoluteError, 9);
  assert.equal(result.meanSignedError, 9.5);
  assert.equal(linearQuantile([0, 10], 0.025), 0.25);
  assert.equal(linearQuantile([0, 10], 0.975), 9.75);
  assert.equal(summarizeErrors([]).within7.fraction, null);
  assert.equal(summarizeErrors([]).p90AbsoluteError, null);
  assert.throws(() => linearQuantile([NaN], 0.5));
});

test('paired participant resampling matches the exhaustive two-cluster endpoint possibilities', () => {
  // AA: delta +2; AB/BA: (5-9)/4 = -1; BB: delta -2.
  // Pooling cycles, rather than averaging participant MAEs, is essential for AB/BA.
  const input = [totals(1, 0, 2), totals(3, 9, 3)];
  const report = bootstrapParticipants(input);
  assert.equal(report.weightedMinusMedian.lower, -2);
  assert.equal(report.weightedMinusMedian.upper, 2);
  assert.equal(report.meanAbsoluteError.median.lower, 0);
  assert.equal(report.meanAbsoluteError.median.upper, 3);
  assert.deepEqual(bootstrapParticipants(input), report);
  const paired = bootstrapParticipants([totals(1, 0, 1), totals(3, 9, 12)]);
  assert.equal(paired.weightedMinusMedian.lower, 1);
  assert.equal(paired.weightedMinusMedian.upper, 1);
});

test('people with no forecasts remain in bootstrap draws and undefined ratios are counted', () => {
  const result = bootstrapParticipants([totals(0, 0, 0), totals(1, 3, 1)]);
  assert.ok(result.weightedMinusMedian.undefinedReplicates > 0);
  assert.ok(result.weightedMinusMedian.definedReplicates > 0);
  assert.equal(result.weightedMinusMedian.lower, -2);
  assert.equal(result.weightedMinusMedian.upper, -2);
  assert.equal(result.availability.definedReplicates, 2000);
  assert.equal(result.availability.lower, 0);
  assert.equal(result.availability.upper, 0.2);
  const none = bootstrapParticipants([]);
  assert.equal(none.weightedMinusMedian.lower, null);
  assert.equal(none.weightedMinusMedian.undefinedReplicates, 2000);
  const noOffers = run(dataset([[20, 90, 20, 90, 20, 90, 20, 90]]));
  assert.equal(noOffers.overall.peopleWithoutForecast, 1);
  assert.equal(noOffers.overall.methods.median.meanAbsoluteError, null);
});

test('xorshift stream uses the fixed unsigned 32-bit sequence and rejects its zero state', () => {
  const next = xorshift32(1);
  assert.deepEqual(
    [next(), next(), next()].map((n) => n * 2 ** 32),
    [270369, 67634689, 2647435461],
  );
  assert.throws(() => xorshift32(0));
});

test('input order cannot change bootstrap output and mixed participant groups are rejected', () => {
  const input = dataset([Array(12).fill(28), Array.from({ length: 12 }, (_, i) => 24 + i)]);
  const original = run(input);
  input.participants.reverse();
  assert.deepEqual(run(input), original);
  let index = 0;
  while (participantSplit(input.provenance.datasetId, `held-out-${index}`) === 'development')
    index++;
  input.participants[0]!.id = `held-out-${index}`;
  assert.throws(() => run(input), /Comparison group/);
});

test('retrospective audit events cannot enter predictions and strata partition the selected people', () => {
  const input = dataset([Array(12).fill(28), Array.from({ length: 12 }, (_, i) => 24 + i)]);
  const audit = {
    split: 'development',
    preparationVersion: 'zenodo-recorded-starts-v1',
    role: 'retrospective-audit-only-not-predictor-input',
    participants: input.participants.map((p, i) => ({
      id: p.id,
      studySources: [i ? 'old' : 'new'],
      birthEventDays: [],
      onsetFlags: [],
    })),
  };
  const before = comparePeriodDataset(
    input,
    sourceStrataFromAudit(input, 'development', audit),
    'development',
  );
  audit.participants[0]!.birthEventDays = [1, 99];
  audit.participants[0]!.onsetFlags = [{ day: 3, beforeBirth: true }];
  const after = comparePeriodDataset(
    input,
    sourceStrataFromAudit(input, 'development', audit),
    'development',
  );
  assert.deepEqual(after, before);
  assert.equal(before.sourceStrata['old-only'].participants, 1);
  assert.equal(before.sourceStrata['new-only'].participants, 1);
  assert.equal(before.sourceStrata.mixed.methods.median.meanAbsoluteError, null);
  audit.participants.push(audit.participants[0]!);
  assert.throws(() => sourceStrataFromAudit(input, 'development', audit), /Audit source strata/);
});

test('checksummed JSON rejects even valid altered content; held-out selection fails before reading files', async () => {
  const bytes = Buffer.from('{"fictional":true}\n');
  assert.deepEqual(checkedJson(bytes, hash(bytes)), { fictional: true });
  assert.throws(
    () => checkedJson(Buffer.from('{"fictional":false}\n'), hash(bytes)),
    /checksum mismatch/,
  );
  await assert.rejects(loadDevelopmentComparison('nonexistent-root', 'test'), /Only development/);
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', 'scripts/compare-zenodo-periods.mjs', 'calibration'],
    { cwd: new URL('../', import.meta.url), encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Only development/);
  assert.equal(result.stdout, '');
});
