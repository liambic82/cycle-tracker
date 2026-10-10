import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Activity, Flower2 } from 'lucide-react-native';
import { addDays, formatDay, type Day } from '../domain/dates';
import { history, type Journal } from '../domain/journal';
import { flowTimeline, statistics, type FlowState } from '../domain/history';
import { Button } from './components';
import { useTheme } from './theme';
import { SymptomHistory } from './SymptomHistory';
import { SleepHistory } from './SleepHistory';

const FLOW_LABELS: Record<FlowState, string> = {
  bleeding: 'Bleeding',
  spotting: 'Spotting',
  none: 'No flow',
  unknown: 'Not logged',
};

function TrendChart({
  title,
  points,
  summary,
  color,
  explanation,
}: {
  title: string;
  points: Array<{ start: Day; value: number | null }>;
  summary: ReturnType<typeof statistics>;
  color: string;
  explanation: string;
}) {
  const { colors, common } = useTheme();
  const latest = points.slice(-12);
  const maximum = Math.max(1, ...latest.map((point) => point.value ?? 0));
  return (
    <View style={[common.card, { gap: 16 }]}>
      <Text style={common.heading}>{title}</Text>
      <Text style={common.small}>{explanation}</Text>
      <View style={[common.wrap, { justifyContent: 'space-between' }]}>
        {[
          [summary.average, 'Average'],
          [summary.shortest, 'Shortest'],
          [summary.longest, 'Longest'],
        ].map(([value, label]) => (
          <View key={label} style={{ minWidth: 70, gap: 4 }}>
            <Text style={[common.heading, { color }]}>{value ?? '—'}</Text>
            <Text style={common.small}>{label} · days</Text>
          </View>
        ))}
      </View>
      <Text style={common.small}>
        {summary.count} recorded {summary.count === 1 ? 'value' : 'values'} · Statistics use all
        recorded history
      </Text>
      {latest.length > 0 ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
          >
            {latest.map(({ start, value }) => (
              <View
                key={start}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${title}, cycle starting ${formatDay(start, { month: 'long', day: 'numeric', year: 'numeric' })}: ${value === null ? 'not yet recorded' : `${value} days`}`}
                style={{ width: 62, gap: 7, alignItems: 'center' }}
              >
                <Text style={[common.label, { color }]}>{value ?? '—'}</Text>
                <View style={{ height: 112, width: 36, justifyContent: 'flex-end' }}>
                  <View
                    style={{
                      width: 36,
                      height: value === null ? 8 : Math.max(3, (value / maximum) * 112),
                      backgroundColor: value === null ? colors.soft : color,
                      borderRadius: 5,
                      borderWidth: value === null ? 1 : 0,
                      borderStyle: 'dashed',
                      borderColor: colors.muted,
                    }}
                  />
                </View>
                <Text style={[common.small, { textAlign: 'center' }]}>
                  {formatDay(start, { month: 'short', day: 'numeric' })}
                </Text>
                <Text style={[common.small, { fontSize: 10 }]}>{start.slice(0, 4)}</Text>
              </View>
            ))}
          </ScrollView>
          <Text style={common.small}>
            Most recent {latest.length} cycles, oldest to newest. Scroll sideways for more. — means
            incomplete, not zero.
          </Text>
        </>
      ) : (
        <Text style={common.body}>Log a period start to begin your chart.</Text>
      )}
    </View>
  );
}

export function History({
  journal,
  today,
  openDay,
}: {
  journal: Journal;
  today: Day;
  openDay: (day: Day) => void;
}) {
  const { colors, common } = useTheme();
  const cycles = useMemo(() => history(journal, today), [journal, today]);
  const FLOW_COLORS: Record<FlowState, string> = {
    bleeding: colors.roseInk,
    spotting: colors.spotInk,
    none: colors.sageInk,
    unknown: colors.soft,
  };
  const [limit, setLimit] = useState(12);
  const [symptomsOpen, setSymptomsOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const lengths = statistics(cycles.map((cycle) => cycle.length));
  const durations = statistics(cycles.map((cycle) => cycle.duration));
  return (
    <View style={{ gap: 22 }}>
      <View style={[common.card, { backgroundColor: colors.sage, gap: 14 }]}>
        <Activity color={colors.sageInk} size={24} strokeWidth={1.5} />
        <Text style={common.heading}>Your history, in your own time.</Text>
        <Text style={common.body}>
          See how your recorded cycles and bleeding durations vary. Missing logs stay visible as
          gaps.
        </Text>
      </View>
      <View style={[common.card, { gap: 16 }]}>
        <Text style={common.heading}>Symptom severity</Text>
        <Button
          secondary
          label={symptomsOpen ? 'Close symptom history' : 'Explore symptom history'}
          onPress={() => setSymptomsOpen(!symptomsOpen)}
        />
        {symptomsOpen && <SymptomHistory journal={journal} today={today} openDay={openDay} />}
      </View>
      <View style={[common.card, { gap: 16 }]}>
        <Text style={common.heading}>Sleep</Text>
        <Button
          secondary
          label={sleepOpen ? 'Close sleep history' : 'Explore sleep history'}
          onPress={() => setSleepOpen(!sleepOpen)}
        />
        {sleepOpen && <SleepHistory journal={journal} today={today} openDay={openDay} />}
      </View>
      <TrendChart
        title="Cycle length"
        points={cycles.map((cycle) => ({ start: cycle.start, value: cycle.length }))}
        summary={lengths}
        color={colors.plum}
        explanation="Days from one recorded period start to the next. The latest cycle stays incomplete until another start is logged."
      />
      <TrendChart
        title="Bleeding duration"
        points={cycles.map((cycle) => ({ start: cycle.start, value: cycle.duration }))}
        summary={durations}
        color={colors.roseInk}
        explanation="Days from a recorded period start through its first recorded last bleeding day, inclusive. This is a span between markers; it doesn’t fill in missing daily flow logs."
      />
      <View style={[common.card, { gap: 20 }]}>
        <Text style={common.heading}>Inside each cycle</Text>
        <View style={common.wrap}>
          {(Object.keys(FLOW_LABELS) as FlowState[]).map((state) => (
            <View key={state} style={[common.row, { gap: 6 }]}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: FLOW_COLORS[state],
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              />
              <Text style={common.small}>{FLOW_LABELS[state]}</Text>
            </View>
          ))}
        </View>
        <Text style={common.small}>
          Each strip runs from the cycle’s start to the day before the next start, or through today
          for the latest cycle. A note or symptom alone does not record flow.
        </Text>
        {!cycles.length ? (
          <View style={{ paddingVertical: 20, gap: 12, alignItems: 'center' }}>
            <Flower2 color={colors.plum} size={36} />
            <Text style={common.body}>
              Log a period start in your daily journal to see its history.
            </Text>
          </View>
        ) : (
          cycles
            .slice(-limit)
            .reverse()
            .map((cycle) => {
              const end = cycle.length === null ? today : addDays(cycle.start, cycle.length - 1);
              const timeline = flowTimeline(journal, cycle.start, end);
              return (
                <View
                  key={cycle.start}
                  style={{ paddingTop: 18, borderTopWidth: 1, borderColor: colors.line, gap: 12 }}
                >
                  <Text style={common.label}>
                    {formatDay(cycle.start, { month: 'short', day: 'numeric', year: 'numeric' })} –{' '}
                    {formatDay(end, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Text style={common.small}>
                    {cycle.length === null
                      ? `Latest cycle · ${timeline.total} days so far`
                      : `${cycle.length}-day cycle`}{' '}
                    ·{' '}
                    {cycle.duration === null
                      ? 'Last bleeding day not recorded'
                      : `${cycle.duration}-day bleeding span`}
                  </Text>
                  <View
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={`Flow timeline: ${timeline.counts.bleeding} bleeding days, ${timeline.counts.spotting} spotting days, ${timeline.counts.none} days recorded without flow, ${timeline.counts.unknown} days not logged`}
                    style={{
                      height: 18,
                      flexDirection: 'row',
                      borderRadius: 5,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: colors.line,
                    }}
                  >
                    {timeline.runs.map((run, index) => (
                      <View
                        key={index}
                        style={{ flex: run.days, backgroundColor: FLOW_COLORS[run.state] }}
                      />
                    ))}
                  </View>
                  <Text style={common.small}>
                    {timeline.counts.bleeding} bleeding · {timeline.counts.spotting} spotting ·{' '}
                    {timeline.counts.none} no flow · {timeline.counts.unknown} not logged
                  </Text>
                  <Button
                    secondary
                    label={`Open cycle starting ${formatDay(cycle.start, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    onPress={() => openDay(cycle.start)}
                  />
                </View>
              );
            })
        )}
        {cycles.length > limit && (
          <Button
            secondary
            label="Show older cycles"
            onPress={() => setLimit((value) => value + 12)}
          />
        )}
      </View>
      <Text style={[common.small, common.readable]}>
        Your journal records observations. These charts do not diagnose a condition or predict
        ovulation.
      </Text>
    </View>
  );
}
