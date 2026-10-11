import { ESTIMATE_RULES, type EstimateReview } from '../src/domain/periodEstimate.ts';
import {
  evaluatePeriodPolicy,
  summarizePeriodPolicy,
  type PeriodPolicySeries,
} from '../research/period-policy.ts';

const review: EstimateReview = { enabled: true, context: 'comparable', complete: true };
const stable = Array<number>(12).fill(28);
const cases: (Omit<PeriodPolicySeries, 'review' | 'finalFollowUpDays'> & {
  review?: EstimateReview;
})[] = [
  { name: 'Stable 28', lengths: stable },
  { name: 'Alternating 29/30', lengths: Array.from({ length: 12 }, (_, i) => 29 + (i % 2)) },
  { name: 'Gradual drift', lengths: Array.from({ length: 12 }, (_, i) => 24 + i) },
  { name: 'Abrupt change', lengths: [28, 28, 28, 28, 28, 42, 42, 42, 42, 42, 42, 42] },
  { name: 'Unexpected long target', lengths: [...stable.slice(0, 6), 95] },
  { name: 'Variable history', lengths: [20, 45, 25, 60, 22, 48, 24, 55, 21, 49, 23, 52] },
  { name: 'Changing context', lengths: stable, review: { ...review, context: 'changing' } },
  { name: 'History unconfirmed', lengths: stable, review: { ...review, complete: false } },
  { name: 'No opt-in', lengths: stable, review: { ...review, enabled: false } },
  {
    name: 'Missed observation',
    lengths: stable,
    observations: [{ afterDays: 168, details: { cycleObservation: 'missed' } }],
  },
  {
    name: 'Positive test',
    lengths: stable.slice(0, 6),
    observations: [{ afterDays: 168, details: { pregnancyTest: 'positive' } }],
  },
  { name: 'Expired long cycle', lengths: [...stable.slice(0, 6), 40] },
];
const scenarios: PeriodPolicySeries[] = cases.map((scenario) => ({
  review,
  finalFollowUpDays: 40,
  ...scenario,
}));

console.log('# Synthetic full-policy evaluation');
console.log(
  '\nResearch only. No participant data, clinical accuracy, or calibrated probabilities.',
);
console.log(`\nProduction rules: \`${JSON.stringify(ESTIMATE_RULES)}\``);
for (const offset of [0, 14, 35]) {
  console.log(`\n## Issued ${offset} days after the recorded start (cycle day ${offset + 1})`);
  console.log('\nStarts/observations assumed logged the same day; fixed context per scenario.');
  console.log(
    'Offered/opportunities includes censored forecasts. Scored/observed excludes unknown outcomes.',
  );
  console.log(
    'MAE and spread inclusion use scored forecasts only; width uses all offered forecasts.',
  );
  console.log('Ended cycles and dates after follow-up are outside this landmark denominator.');
  console.log(
    '\n| Scenario | Offered / opportunities | Scored / observed | Offered censored | MAE median / mean / last / 28 | Signed error | Within 3 days | Inside spread | Width | Ended / after follow-up | Status counts |',
  );
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const scenario of scenarios) {
    const result = summarizePeriodPolicy(evaluatePeriodPolicy(scenario, offset));
    const format = (n: number | null) => (n === null ? '—' : n.toFixed(2));
    const errors = Object.values(result.meanError).map(format).join(' / ');
    const statuses = Object.entries(result.statuses)
      .map(([key, count]) => `${key}: ${count}`)
      .join(', ');
    console.log(
      `| ${scenario.name} | ${result.offered}/${result.opportunities} | ${result.scored}/${result.observed} | ${result.offeredCensored} | ${errors} | ${format(result.meanSignedError)} | ${result.within3}/${result.scored} | ${result.insideSpread}/${result.scored} | ${format(result.meanSpreadWidth)} | ${result.alreadyEnded}/${result.outsideFollowUp} | ${statuses || '—'} |`,
    );
  }
}
