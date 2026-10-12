// Aggregate-only statistical consistency review. Never opens participant files
// or invokes the prediction/held-out evaluation pipeline.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sources = {
  development: 'a3e04dcba11e28d9378757a6a9bd920930d33726e3bee0b7a827a69de4d0929d',
  calibration: 'b5bf68c84878b97766c4e6f7ea456f10183d19925cbe0109a5feb873e1392976',
  test: '1f64cb0b90daba66566810d57adfe47f20f41924f5f5b1668293035f38ad61b5',
};
const methods = ['median', 'mean', 'last', 'fixed28', 'weighted'];
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, 'Aggregate arithmetic mismatch.');
function checkSummary(s) {
  assert.equal(s.observed + s.censored, s.opportunities);
  assert.equal(s.scored + s.offeredCensored, s.availability.count);
  assert.equal(s.availability.denominator, s.opportunities);
  assert.equal(
    Object.values(s.statuses).reduce((a, b) => a + b, 0),
    s.opportunities,
  );
  assert.equal(s.peopleWithForecast + s.peopleWithoutForecast, s.participants);
  assert.ok(s.peopleWithScoredForecast <= s.peopleWithForecast);
  assert.ok(s.scored <= s.observed && s.offeredCensored <= s.censored);
  if (s.opportunities) close(s.availability.fraction, s.availability.count / s.opportunities);
  else assert.equal(s.availability.fraction, null);
  assert.equal(s.historicalSpread.coverage.denominator, s.scored);
  assert.equal(s.historicalSpread.widthDenominator, s.availability.count);
  for (const method of methods) {
    const m = s.methods[method];
    assert.equal(m.scored, s.scored);
    for (const key of ['within1', 'within3', 'within7']) {
      assert.equal(m[key].denominator, s.scored);
      assert.ok(Number.isInteger(m[key].count) && m[key].count >= 0 && m[key].count <= s.scored);
      if (s.scored) close(m[key].fraction, m[key].count / s.scored);
      else assert.equal(m[key].fraction, null);
    }
    assert.ok(m.within1.count <= m.within3.count && m.within3.count <= m.within7.count);
    if (s.scored) {
      assert.ok(Math.abs(m.meanSignedError) <= m.meanAbsoluteError + 1e-9);
      assert.ok(m.meanAbsoluteError >= 0 && m.meanAbsoluteError <= m.largestError);
      assert.ok(
        m.medianAbsoluteError <= m.p90AbsoluteError && m.p90AbsoluteError <= m.largestError,
      );
      // Every forecast and target is a whole calendar day; the error sum is integral.
      close(m.meanAbsoluteError * s.scored, Math.round(m.meanAbsoluteError * s.scored));
    } else {
      for (const key of [
        'meanAbsoluteError',
        'meanSignedError',
        'medianAbsoluteError',
        'p90AbsoluteError',
        'largestError',
      ])
        assert.equal(m[key], null);
    }
  }
  if (s.scored) {
    close(
      s.weightedMinusMedian,
      s.methods.weighted.meanAbsoluteError - s.methods.median.meanAbsoluteError,
    );
    close(s.historicalSpread.coverage.fraction, s.historicalSpread.coverage.count / s.scored);
  } else assert.equal(s.weightedMinusMedian, null);
}

const groups = {};
for (const [split, expectedHash] of Object.entries(sources)) {
  const text = (
    await readFile(
      new URL(`../research/results/zenodo-${split}-comparison-v1.json`, import.meta.url),
      'utf8',
    )
  ).replace(/\r\n/g, '\n');
  assert.equal(
    createHash('sha256').update(text).digest('hex'),
    expectedHash,
    'Report hash mismatch.',
  );
  const report = JSON.parse(text);
  assert.equal(report.split, split);
  assert.equal(report.issueOffsetDays, 0);
  assert.equal(report.analysis, 'conditional-calendar-policy');
  assert.equal(report.assumptions.sourceContext, 'unknown');
  const s = report.overall;
  const strata = Object.values(report.sourceStrata);
  [s, ...strata].forEach(checkSummary);
  for (const key of [
    'participants',
    'opportunities',
    'observed',
    'censored',
    'scored',
    'offeredCensored',
    'peopleWithoutForecast',
  ])
    assert.equal(
      strata.reduce((n, stratum) => n + stratum[key], 0),
      s[key],
    );
  for (const method of methods)
    close(
      strata.reduce(
        (n, stratum) => n + (stratum.methods[method].meanAbsoluteError ?? 0) * stratum.scored,
        0,
      ) / s.scored,
      s.methods[method].meanAbsoluteError,
    );
  assert.equal(report.uncertainty.sampledParticipantsPerReplicate, s.participants);
  assert.equal(report.uncertainty.replicates, 2000);
  assert.equal(report.uncertainty.seed, 20261011);
  for (const interval of [
    ...Object.values(report.uncertainty.meanAbsoluteError),
    report.uncertainty.weightedMinusMedian,
    report.uncertainty.availability,
    report.uncertainty.historicalSpreadCoverage,
  ]) {
    assert.equal(interval.definedReplicates + interval.undefinedReplicates, 2000);
    assert.ok(interval.lower <= interval.upper);
  }
  if (split !== 'development') {
    assert.equal(report.execution.split, split);
    assert.equal(
      report.execution.freezeId,
      'eb0218a3c9f6b51431cb9003a90d4f9772b3d3ff22941e4117718fc1fb42c25e',
    );
    assert.equal(
      report.execution.prerequisiteReportSha256,
      split === 'test' ? sources.calibration : null,
    );
  }
  const totalAbsoluteError = Math.round(s.methods.median.meanAbsoluteError * s.scored);
  groups[split] = {
    reportSha256Lf: expectedHash,
    arithmeticChecks: 'passed',
    participants: s.participants,
    scored: s.scored,
    medianMAE: s.methods.median.meanAbsoluteError,
    weightedMAE: s.methods.weighted.meanAbsoluteError,
    weightedMinusMedian: s.weightedMinusMedian,
    primaryInterval: report.uncertainty.weightedMinusMedian,
    descriptiveAfterResults: {
      medianTotalAbsoluteErrorDays: totalAbsoluteError,
      largestSingleAbsoluteErrorDays: s.methods.median.largestError,
      largestSingleErrorFractionOfTotal: s.methods.median.largestError / totalAbsoluteError,
    },
  };
}
console.log(
  JSON.stringify(
    {
      review: 'aggregate-statistical-consistency-v1',
      scope:
        'Saved aggregate arithmetic and provenance checks; no participant replay, refitting or new confidence intervals.',
      disclaimer: 'Assistant-led internal review, not independent or clinical validation.',
      groups,
    },
    null,
    2,
  ),
);
