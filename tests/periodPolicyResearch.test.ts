import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePeriodPolicy,
  summarizePeriodPolicy,
  type PeriodPolicySeries,
} from '../research/period-policy.ts';

const fixture: PeriodPolicySeries = {
  name: 'Fictional stable history',
  lengths: Array<number>(12).fill(28),
  review: { enabled: true, context: 'comparable', complete: true },
  finalFollowUpDays: 0,
};

test('full-policy availability includes cold start and separates unobserved outcomes', () => {
  const before = structuredClone(fixture);
  const result = summarizePeriodPolicy(evaluatePeriodPolicy(fixture));
  assert.equal(result.opportunities, 13);
  assert.equal(result.observed, 12);
  assert.equal(result.offered, 7);
  assert.equal(result.scored, 6);
  assert.equal(result.offeredCensored, 1);
  assert.deepEqual(result.statuses, { insufficient: 6, ready: 7 });
  assert.equal(result.meanError.median, 0);
  assert.deepEqual(fixture, before);
});

test('changing the withheld target or future observations cannot change the issued forecast', () => {
  const original = evaluatePeriodPolicy(fixture)[6]!;
  const changed = evaluatePeriodPolicy({
    ...fixture,
    lengths: [...fixture.lengths.slice(0, 6), 95, 35],
    observations: [{ afterDays: 169, details: { pregnancyTest: 'positive' } }],
  })[6]!;
  assert.deepEqual(original.result, changed.result);
  const summary = summarizePeriodPolicy([changed]);
  assert.equal(summary.meanError.median, 67);
  assert.equal(summary.meanSignedError, -67);
  assert.equal(summary.within7, 0);
  assert.equal(summary.insideSpread, 0);
});

test('withholding is unavailable accuracy, never a zero-error success', () => {
  const result = summarizePeriodPolicy(
    evaluatePeriodPolicy({
      ...fixture,
      review: { ...fixture.review, context: 'changing' },
    }),
  );
  assert.equal(result.opportunities, 13);
  assert.equal(result.offered, 0);
  assert.equal(result.meanError.median, null);
  assert.equal(result.meanSignedError, null);
  assert.equal(result.largestError, null);
  assert.equal(result.meanSpreadWidth, null);
  assert.deepEqual(result.statuses, { context: 13 });
});

test('a forecast with no known outcome contributes availability but no accuracy', () => {
  const final = evaluatePeriodPolicy({ ...fixture, lengths: fixture.lengths.slice(0, 6) }).at(-1)!;
  const summary = summarizePeriodPolicy([final]);
  assert.equal(summary.offered, 1);
  assert.equal(summary.censored, 1);
  assert.equal(summary.scored, 0);
  assert.equal(summary.meanError.median, null);
  assert.equal(summary.insideSpread, 0);
});

test('later landmarks exclude ended cycles and unavailable follow-up, and retain expiry', () => {
  const series = { ...fixture, lengths: [...fixture.lengths.slice(0, 6), 40] };
  const result = summarizePeriodPolicy(evaluatePeriodPolicy(series, 35));
  assert.equal(result.alreadyEnded, 6);
  assert.equal(result.outsideFollowUp, 1);
  assert.equal(result.opportunities, 1);
  assert.deepEqual(result.statuses, { expired: 1 });
  assert.equal(result.offered, 0);
  assert.equal(summarizePeriodPolicy(evaluatePeriodPolicy(fixture, 28)).alreadyEnded, 12);
});

test('only observations already present at issuance affect policy', () => {
  const series = {
    ...fixture,
    observations: [{ afterDays: 169, details: { pregnancyTest: 'positive' as const } }],
  };
  assert.equal(evaluatePeriodPolicy(series)[6]!.result!.status, 'ready');
  assert.equal(evaluatePeriodPolicy(series, 1)[6]!.result!.status, 'cycle-observation');
});

test('invalid synthetic intervals and follow-up are rejected', () => {
  for (const value of [0, -1, 1.5, NaN, Infinity])
    assert.throws(() => evaluatePeriodPolicy({ ...fixture, lengths: [value] }));
  assert.throws(() => evaluatePeriodPolicy({ ...fixture, finalFollowUpDays: -1 }));
  assert.throws(() => evaluatePeriodPolicy(fixture, -1));
});
