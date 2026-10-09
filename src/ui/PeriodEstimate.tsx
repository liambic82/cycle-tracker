import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { formatDay, type Day } from '../domain/dates';
import type { Journal } from '../domain/journal';
import {
  emptyEstimateReview,
  periodEstimate,
  type EstimateContext,
  type EstimateStatus,
} from '../domain/periodEstimate';
import { Button, Chip } from './components';
import { useTheme } from './theme';

const CONTEXTS: Array<{ id: EstimateContext; label: string }> = [
  { id: 'unknown', label: 'Not sure / prefer not to say' },
  { id: 'comparable', label: 'Same pattern; none of the situations below' },
  { id: 'hormonal', label: 'Hormonal treatment or a recent change to it' },
  { id: 'pregnancy', label: 'Pregnancy, recent birth, or breastfeeding' },
  { id: 'changing', label: 'Changing cycles, including perimenopause' },
];
const MESSAGES: Record<Exclude<EstimateStatus, 'ready'>, string> = {
  off: 'Estimates are off. Your recorded history is available below.',
  context:
    'No estimate for this context. This simple method needs a comparable pattern and does not model treatment or life changes.',
  unconfirmed:
    'Review the start dates below. Confirm only if they are complete and belong to your current pattern.',
  'future-start':
    'A period start is recorded in the future. Review it in your journal before using an estimate; nothing has been changed.',
  insufficient:
    'Not enough recent history. This preview needs seven recorded starts within the last 365 days, giving six completed intervals.',
  stale:
    'The last recorded start is over 90 days ago. This preview cannot offer a current estimate from it.',
  unsupported:
    'At least one recent interval is outside this preview’s 14–90 day calculation limits. All records are kept; no estimate is shown.',
  variable:
    'Recent intervals differ by more than 14 days. This simple method does not offer an estimate for that history.',
  'poor-fit':
    'The earlier-entry check did not meet this preview’s calculation limits. No current estimate is shown.',
  expired:
    'The dates suggested by this history have passed. No new estimate is made until another start is recorded. This does not mean a period is late or missed.',
  'date-limit': 'The resulting dates are outside the app’s supported calendar.',
};
const displayDate = (date: Day) =>
  formatDay(date, { month: 'short', day: 'numeric', year: 'numeric' });

export function PeriodEstimate({
  journal,
  today,
  done,
}: {
  journal: Journal;
  today: Day;
  done: () => void;
}) {
  const { colors, common } = useTheme();
  const [review, setReview] = useState(emptyEstimateReview);
  const [details, setDetails] = useState(false);
  const result = periodEstimate(journal, today, review);
  const estimate = result.estimate;
  const check = result.backtest;
  return (
    <View style={{ width: '100%', maxWidth: 850, alignSelf: 'center', gap: 20 }}>
      <Button secondary icon={ArrowLeft} label="Back to calendar" onPress={done} />
      <View style={[common.readable, { gap: 8 }]}>
        <Text style={common.eyebrow}>OPTIONAL · EXPERIMENTAL</Text>
        <Text accessibilityRole="header" style={common.heading}>
          A rough idea of the next start.
        </Text>
        <Text style={common.body}>
          A calculation from your recorded dates, as of {displayDate(today)}. It can be wrong. It
          does not identify ovulation, fertile days, or “safe” days and must not be used as
          contraception.
        </Text>
        <Text style={common.small}>
          This preview has not been independently clinically validated. These choices last only
          while this view is open; no answer or estimate is saved or added to your calendar.
        </Text>
      </View>
      <View style={[common.card, { gap: 16 }]}>
        <View style={common.between}>
          <Text style={[common.label, { flex: 1 }]}>Explore an estimate this time</Text>
          <Switch
            accessibilityLabel="Explore an estimate this time"
            value={review.enabled}
            onValueChange={(enabled) =>
              setReview(enabled ? { ...review, enabled } : emptyEstimateReview())
            }
            trackColor={{ false: colors.line, true: colors.plum }}
            thumbColor={colors.switchThumb}
          />
        </View>
        {review.enabled && (
          <>
            <Text style={common.label}>Does this history reflect your current situation?</Text>
            <Text style={common.body}>
              Choose a situation below. If more than one applies, either matching situation keeps
              estimates off. Medication names and symptoms are never used to answer for you.
            </Text>
            <View style={{ gap: 8 }}>
              {CONTEXTS.map(({ id, label }) => (
                <Chip
                  key={id}
                  label={label}
                  accessibilityLabel={`Estimate context: ${label}`}
                  selected={review.context === id}
                  onPress={() => setReview({ ...review, context: id, complete: false })}
                />
              ))}
            </View>
            {review.context === 'comparable' && (
              <View style={common.between}>
                <Text style={[common.label, { flex: 1 }]}>
                  I reviewed the starts below: none are missing, and all belong to this current
                  pattern.
                </Text>
                <Switch
                  accessibilityLabel="These period starts are complete and comparable"
                  value={review.complete}
                  onValueChange={(complete) => setReview({ ...review, complete })}
                  trackColor={{ false: colors.line, true: colors.plum }}
                  thumbColor={colors.switchThumb}
                />
              </View>
            )}
          </>
        )}
      </View>
      <View
        accessibilityLiveRegion="polite"
        style={[common.card, { backgroundColor: colors.sage, gap: 12 }]}
      >
        <Text style={[common.eyebrow, { color: colors.sageInk }]}>
          {estimate ? 'ROUGH NEXT-START ESTIMATE' : 'NO ESTIMATE'}
        </Text>
        {estimate ? (
          <>
            <Text style={common.heading}>{displayDate(estimate.center)}</Text>
            <Text style={common.body}>
              Last recorded start: {displayDate(estimate.anchor)}. Adding the middle (median)
              interval of {estimate.days} days gives this date. It stays anchored to that start.
            </Text>
            <Text style={common.label}>Dates from your recent shortest–longest intervals</Text>
            <Text style={common.body}>
              {displayDate(estimate.from)} – {displayDate(estimate.to)}
            </Text>
            <Text style={common.body}>
              This is past variation, not a confidence interval or a promise. The next start can
              fall outside these dates. A date that has passed is not a diagnosis of a late or
              missed period.
            </Text>
          </>
        ) : (
          <Text style={common.body}>
            {MESSAGES[result.status as Exclude<EstimateStatus, 'ready'>]}
          </Text>
        )}
      </View>
      <View style={[common.card, { gap: 12 }]}>
        <Text accessibilityRole="header" style={common.heading}>
          The history behind it
        </Text>
        <Text style={common.body}>
          Most recent {result.intervals.length} of up to six completed intervals, with both starts
          in the last 365 days. No unusual interval is silently removed. Missing or mistaken starts
          can make these numbers misleading.
        </Text>
        {result.intervals.length ? (
          result.intervals.map((interval) => (
            <View
              key={interval.from}
              style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 10, gap: 3 }}
            >
              <Text style={common.label}>{interval.days} days</Text>
              <Text style={common.small}>
                {displayDate(interval.from)} → {displayDate(interval.through)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={common.small}>No completed interval is available in this window.</Text>
        )}
        <Text style={common.small}>
          Review or correct starts in your calendar. Do not add a start just to match an estimate.
        </Text>
      </View>
      <View style={[common.card, { gap: 12 }]}>
        <Text accessibilityRole="header" style={common.heading}>
          Checking against earlier entries
        </Text>
        <Text style={common.body}>
          For each check, the method sees only the earlier intervals, then compares its result with
          the next recorded interval. This checks those entries, not future accuracy or whether the
          records are complete.
        </Text>
        <Text style={common.label}>
          Calculated for {check.offered} of {check.available} possible earlier-entry checks.
        </Text>
        {check.meanError && (
          <>
            <Text style={common.body}>
              Median method: average difference {check.meanError.median.toFixed(1)} days; largest
              difference {check.largestError} {check.largestError === 1 ? 'day' : 'days'}.
            </Text>
            <Text style={common.body}>
              {check.insideSpread} of {check.offered} recorded starts fell within the earlier
              shortest–longest spread.
            </Text>
          </>
        )}
        <Button
          secondary
          label={details ? 'Hide calculation details' : 'Show calculation details'}
          onPress={() => setDetails(!details)}
        />
        {details && (
          <View style={{ gap: 12 }}>
            <Text style={common.body}>
              Preview rules: six completed intervals; each 14–90 days; shortest to longest no more
              than 14 days apart; three earlier-entry checks using at least three preceding
              intervals; median average difference at most seven days. These are product limits, not
              medical definitions of normal cycles.
            </Text>
            {check.meanError && (
              <>
                <Text style={common.label}>Comparison on the same earlier entries</Text>
                <Text style={common.body}>
                  Average absolute difference in days: median {check.meanError.median.toFixed(1)} ·
                  mean {check.meanError.mean.toFixed(1)} · last interval{' '}
                  {check.meanError.last.toFixed(1)} · fixed 28-day example{' '}
                  {check.meanError.fixed28.toFixed(1)}.
                </Text>
                <Text style={common.small}>
                  The fixed example is only a comparison, never a fallback estimate. The method does
                  not switch to whichever comparison looks best on this small history.
                </Text>
              </>
            )}
            {check.rows.map((row) => (
              <Text key={row.index} style={common.small}>
                Interval {row.index + 1}: recorded {row.actual} days;{' '}
                {row.prediction
                  ? `median estimate ${row.prediction.median} days, earlier spread ${row.spread!.from}–${row.spread!.to} days.`
                  : 'calculation withheld because the earlier history exceeded the preview limits.'}
              </Text>
            ))}
          </View>
        )}
      </View>
      <Button secondary label="Back to calendar" onPress={done} />
    </View>
  );
}
