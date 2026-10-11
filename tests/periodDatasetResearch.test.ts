import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  parsePeriodDataset,
  participantSplit,
  benchmarkPeriodDataset,
  recencyWeightedMedian,
} from '../research/period-dataset.ts';

const fixturePath = new URL('../research/fixtures/period-history.synthetic.json', import.meta.url);
const fixture = () => parsePeriodDataset(JSON.parse(readFileSync(fixturePath, 'utf8')));

test('dataset contract preserves unknown context and isolates its parsed input', () => {
  const input = fixture();
  const result = parsePeriodDataset(input);
  result.participants[0]!.segments[0]!.startDays.push(999);
  assert.notDeepEqual(result, input);
  const person = input.participants.find((p) => p.segments[0]!.context === 'unknown')!;
  const group = participantSplit(input.provenance.datasetId, person.id);
  const report = benchmarkPeriodDataset({ ...input, participants: [person] }, group);
  assert.equal(report.policy.offered, 0);
  assert.equal(report.policy.meanError.median, null);
  assert.equal(report.peopleWithoutForecast, 1);
});

test('malformed chronology, duplicate identities, missing context and extra source fields fail closed', () => {
  const changes = [
    (d) => {
      d.participants[0].segments[0].startDays[1] = '28';
    },
    (d) => {
      d.participants[0].segments[0].startDays[1] = 0;
    },
    (d) => {
      d.participants[0].segments[0].startDays.reverse();
    },
    (d) => {
      d.participants[0].segments[0].observedThrough = 1;
    },
    (d) => {
      d.participants.push(d.participants[0]);
    },
    (d) => {
      d.participants[0].segments.push(d.participants[0].segments[0]);
    },
    (d) => {
      delete d.participants[0].segments[0].context;
    },
    (d) => {
      delete d.participants[0].segments[0].complete;
    },
    (d) => {
      d.participants[0].wholeHistoryMean = 28;
    },
    (d) => {
      d.provenance.kind = 'external';
    },
    (d) => {
      d.provenance.loggingAssumption = 'prospective';
    },
  ];
  for (const change of changes) {
    const input = fixture();
    change(input);
    assert.throws(() => parsePeriodDataset(input), /Invalid research dataset/);
  }
});

test('participant split is stable under reordering, new people, and changed outcomes', () => {
  const input = fixture();
  const split = participantSplit(input.provenance.datasetId, input.participants[0]!.id);
  const before = benchmarkPeriodDataset(input, split);
  const reversed = { ...input, participants: [...input.participants].reverse() };
  assert.deepEqual(benchmarkPeriodDataset(reversed, split), before);
  for (const person of input.participants) {
    const assigned = participantSplit(input.provenance.datasetId, person.id);
    person.segments[0]!.startDays = [0, 95, 200];
    assert.equal(participantSplit(input.provenance.datasetId, person.id), assigned);
  }
  const id = input.participants[0]!.id;
  input.participants.push({ id: 'new-fictional-person', segments: [] });
  assert.equal(participantSplit(input.provenance.datasetId, id), split);
});

test('unselected participants never contribute to a split error or availability', () => {
  const input = fixture();
  const before = benchmarkPeriodDataset(input, 'development');
  for (const person of input.participants) {
    if (participantSplit(input.provenance.datasetId, person.id) === 'development') continue;
    person.segments = [
      { startDays: [0, 100, 200], observedThrough: 300, context: 'unknown', complete: false },
    ];
  }
  assert.deepEqual(benchmarkPeriodDataset(input, 'development'), before);
});

test('separate observation segments restart history without manufacturing intervals across gaps', () => {
  const input = fixture();
  const person = input.participants.find((p) => p.segments.length === 2)!;
  const split = participantSplit(input.provenance.datasetId, person.id);
  const report = benchmarkPeriodDataset({ ...input, participants: [person] }, split);
  assert.equal(report.segments, 2);
  assert.equal(report.policy.opportunities, 8);
  assert.equal(report.policy.censored, 2);
  assert.deepEqual(report.policy.statuses, { insufficient: 8 });
  assert.equal(report.recencyWeightedMedian.meanAbsoluteError, null);
});

test('weighted comparator is fixed, robust to a single extreme last interval, and uses no target', () => {
  assert.equal(recencyWeightedMedian([24, 25, 26, 27, 28, 29]), 28);
  assert.equal(recencyWeightedMedian([28, 28, 28, 28, 28, 95]), 28);
  assert.equal(recencyWeightedMedian([28, 42, 42]), 42);
  assert.equal(recencyWeightedMedian([20, 40, 20]), 20);
  assert.throws(() => recencyWeightedMedian([]));
  assert.throws(() => recencyWeightedMedian([0]));
  const input = fixture();
  for (const split of ['development', 'calibration', 'test'] as const) {
    const result = benchmarkPeriodDataset(input, split);
    assert.equal(result.recencyWeightedMedian.scored, result.policy.scored);
  }
});

test('empty held-out groups have unavailable metrics instead of apparent perfect accuracy', () => {
  const input = fixture();
  input.participants = input.participants.filter(
    (p) => participantSplit(input.provenance.datasetId, p.id) === 'development',
  );
  const result = benchmarkPeriodDataset(input, 'test');
  assert.equal(result.participants, 0);
  assert.equal(result.policy.meanError.median, null);
  assert.equal(result.recencyWeightedMedian.meanAbsoluteError, null);
});

test('long histories retain every target and still use only the recent policy window', () => {
  const input = fixture();
  const person = input.participants[0]!;
  person.segments = [
    {
      startDays: Array.from({ length: 500 }, (_, i) => i * 28),
      observedThrough: 499 * 28 + 40,
      context: 'comparable',
      complete: true,
    },
  ];
  input.participants = [person];
  const parsed = parsePeriodDataset(input);
  const report = benchmarkPeriodDataset(
    parsed,
    participantSplit(input.provenance.datasetId, person.id),
  );
  assert.equal(report.policy.opportunities, 500);
  assert.equal(report.policy.scored, 493);
  assert.equal(report.policy.offeredCensored, 1);
  assert.equal(report.policy.meanError.median, 0);
});

test('benchmark command emits aggregate results and reproducible hashes without participant IDs', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      'scripts/benchmark-period-dataset.mjs',
      'research/fixtures/period-history.synthetic.json',
    ],
    { encoding: 'utf8', cwd: new URL('../', import.meta.url) },
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.kind, 'synthetic');
  assert.equal(report.split, 'development');
  assert.match(report.normalizedInputSha256, /^[a-f0-9]{64}$/);
  assert.match(report.productionPolicySha256Lf, /^[a-f0-9]{64}$/);
  for (const person of fixture().participants)
    assert.equal(result.stdout.includes(person.id), false);
});
