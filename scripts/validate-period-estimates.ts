// Deterministic synthetic stress cases, not a clinical dataset or population accuracy estimate.
import { backtestIntervals } from '../src/domain/periodEstimate.ts';

const cases: Record<string, number[]> = {
  'Stable 28-day example': Array(12).fill(28),
  'Alternating 29/30': Array.from({ length: 12 }, (_, i) => 29 + (i % 2)),
  'Gradual drift': Array.from({ length: 12 }, (_, i) => 24 + i),
  'Abrupt change': [28, 28, 28, 28, 28, 42, 42, 42, 42, 42, 42, 42],
  'Possible missing start (not inferred)': [28, 28, 28, 56, 28, 28, 28, 28, 28, 28, 28, 28],
  'Repeated variable intervals': [20, 45, 25, 60, 22, 48, 24, 55, 21, 49, 23, 52],
  'Duplicate-like short interval': [28, 28, 28, 1, 28, 28, 28, 28, 28, 28, 28, 28],
  'Long interval': [28, 28, 28, 95, 28, 28, 28, 28, 28, 28, 28, 28],
};

console.log('SYNTHETIC ENGINE CHECKS — not clinical validation or future accuracy');
console.log(
  'Candidate median evaluated from 3–6 preceding intervals; identical eligible folds for comparisons.',
);
console.log(
  'The user-facing view requires six completed intervals and three usable checks before offering dates.',
);
console.log(
  '| Scenario | Offered / possible | Median MAE | Mean MAE | Last MAE | Fixed-28 MAE | Inside prior min–max | Largest median error |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [name, lengths] of Object.entries(cases)) {
  const result = backtestIntervals(lengths);
  const values = result.meanError;
  console.log(
    `| ${name} | ${result.offered}/${result.available} | ${values?.median.toFixed(2) ?? '—'} | ${values?.mean.toFixed(2) ?? '—'} | ${values?.last.toFixed(2) ?? '—'} | ${values?.fixed28.toFixed(2) ?? '—'} | ${result.insideSpread}/${result.offered} | ${result.largestError ?? '—'} |`,
  );
}
