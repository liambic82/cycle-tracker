import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatDay, type Day } from '../domain/dates';
import type { Journal } from '../domain/journal';
import {
  sleepHistory,
  sleepDurationLabel,
  SLEEP_QUALITY_LABELS,
  SLEEP_WINDOWS,
  type SleepWindow,
} from '../domain/sleep';
import { Button, Chip } from './components';
import { useTheme } from './theme';

export function SleepHistory({
  journal,
  today,
  openDay,
}: {
  journal: Journal;
  today: Day;
  openDay: (date: Day) => void;
}) {
  const { colors, common } = useTheme();
  const [window, setWindow] = useState<SleepWindow>(30);
  const [limit, setLimit] = useState(30);
  const history = useMemo(() => sleepHistory(journal, today, window), [journal, today, window]);
  return (
    <View style={{ gap: 16 }}>
      <Text style={common.body}>
        Main sleep, recorded on the day you woke up. Duration, quality and wakings can each be left
        unlogged. Sleep disruption symptom ratings stay in symptom history.
      </Text>
      <Text style={common.label}>History range · ending today</Text>
      <View style={common.wrap}>
        {SLEEP_WINDOWS.map((days) => (
          <Chip
            key={days}
            label={`${days} days`}
            accessibilityLabel={`Sleep history, last ${days} days`}
            selected={window === days}
            onPress={() => {
              setWindow(days);
              setLimit(30);
            }}
          />
        ))}
      </View>
      <Text style={common.small}>
        {formatDay(history.from, { month: 'short', day: 'numeric', year: 'numeric' })} –{' '}
        {formatDay(today, { month: 'short', day: 'numeric', year: 'numeric' })}
      </Text>
      <Text style={common.body}>
        {history.records.length} days with sleep details · {history.durations} with a duration ·{' '}
        {history.notLogged} days without sleep details
      </Text>
      <Text style={common.small}>
        Bars use the same 0–24-hour scale. Rows show logged waking dates, newest first. Missing
        values stay unknown. Tap a row to open that day.
      </Text>
      {!history.records.length && (
        <Text style={common.body}>
          No sleep details in this range. Add them in your daily journal or try a longer range.
        </Text>
      )}
      {history.records
        .slice(-limit)
        .reverse()
        .map(({ date, sleep }) => {
          const duration = sleepDurationLabel(sleep.durationMinutes);
          const quality =
            sleep.quality === null ? 'Not logged' : SLEEP_QUALITY_LABELS[sleep.quality];
          const wakings = sleep.wakings === null ? 'Not logged' : String(sleep.wakings);
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={`Open ${formatDay(date, { month: 'long', day: 'numeric', year: 'numeric' })}, sleep duration ${duration}, quality ${quality}, night wakings ${wakings}`}
              onPress={() => openDay(date)}
              style={({ pressed }) => ({
                gap: 10,
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: 12,
                padding: 14,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={common.label}>
                {formatDay(date, { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              <Text style={common.body}>Time asleep · {duration}</Text>
              {sleep.durationMinutes !== null && (
                <View
                  accessible={false}
                  style={{
                    height: 10,
                    borderRadius: 5,
                    overflow: 'hidden',
                    backgroundColor: colors.soft,
                  }}
                >
                  <View
                    style={{
                      height: 10,
                      width: `${(sleep.durationMinutes / 1440) * 100}%`,
                      backgroundColor: colors.plum,
                    }}
                  />
                </View>
              )}
              <Text style={common.body}>Quality · {quality}</Text>
              <Text style={common.body}>Night wakings · {wakings}</Text>
            </Pressable>
          );
        })}
      {history.records.length > limit && (
        <Button
          secondary
          label="Show older sleep records"
          onPress={() => setLimit((old) => old + 30)}
        />
      )}
    </View>
  );
}
