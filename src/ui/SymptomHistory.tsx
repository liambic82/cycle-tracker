import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { formatDay, type Day } from '../domain/dates';
import type { Journal } from '../domain/journal';
import {
  recordedSymptoms,
  severityHistory,
  SEVERITY_WINDOWS,
  type SeverityWindow,
} from '../domain/symptomSeverity';
import { Button, Chip } from './components';
import { useTheme } from './theme';

export function SymptomHistory({
  journal,
  today,
  openDay,
}: {
  journal: Journal;
  today: Day;
  openDay: (day: Day) => void;
}) {
  const { common, colors, dark } = useTheme();
  const labels = useMemo(() => recordedSymptoms(journal, today), [journal, today]);
  const [chosen, setChosen] = useState('Cramps');
  const [window, setWindow] = useState<SeverityWindow>(90);
  const [search, setSearch] = useState('');
  const [labelLimit, setLabelLimit] = useState(12);
  const [limit, setLimit] = useState(30);
  const symptom = labels.includes(chosen) ? chosen : (labels[0] ?? '');
  const history = useMemo(
    () => severityHistory(journal, symptom, today, window),
    [journal, symptom, today, window],
  );
  const matches = labels.filter((label) =>
    label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <View style={{ gap: 16 }}>
      <Text style={common.body}>
        Explore your own 0–10 ratings over time, including cramps. Unrated symptoms and days without
        a symptom log stay unknown.
      </Text>
      {!labels.length ? (
        <Text style={common.body}>Log a symptom in your daily journal to see its history.</Text>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Search recorded symptoms"
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setLabelLimit(12);
            }}
            placeholder="Search recorded symptoms"
            placeholderTextColor={colors.muted}
            keyboardAppearance={dark ? 'dark' : 'light'}
            selectionColor={colors.plum}
            style={common.input}
          />
          <View style={common.wrap}>
            {matches.slice(0, labelLimit).map((label) => (
              <Chip
                key={label}
                label={label}
                accessibilityLabel={`Show ${label} history`}
                selected={symptom === label}
                onPress={() => {
                  setChosen(label);
                  setLimit(30);
                }}
              />
            ))}
          </View>
          {!matches.length && (
            <Text style={common.small}>
              No matching recorded symptoms. The selected history remains below.
            </Text>
          )}
          {matches.length > labelLimit && (
            <Button
              secondary
              label="Show more recorded symptoms"
              onPress={() => setLabelLimit((value) => value + 12)}
            />
          )}
          <Text style={common.label}>History range · ending today</Text>
          <View style={common.wrap}>
            {SEVERITY_WINDOWS.map((days) => (
              <Chip
                key={days}
                label={`${days} days`}
                accessibilityLabel={`Symptom history, last ${days} days`}
                selected={window === days}
                onPress={() => {
                  setWindow(days);
                  setLimit(30);
                }}
              />
            ))}
          </View>
          <Text style={common.label}>{symptom} · dated severity</Text>
          <Text style={common.small}>
            {formatDay(history.from, { month: 'short', day: 'numeric', year: 'numeric' })} –{' '}
            {formatDay(today, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
          <Text style={common.body}>
            {history.rated} rated · {history.unrated} logged without a rating · {history.notLogged}{' '}
            days without this symptom logged
          </Text>
          <Text style={common.small}>
            Each bar uses the same 0–10 scale. Rows show logged dates, newest first; omitted dates
            do not mean the symptom was absent. Tap a row to open that day.
          </Text>
          {!history.records.length && (
            <Text style={common.body}>
              No {symptom} records in this range. Try a longer range or another symptom.
            </Text>
          )}
          {history.records
            .slice(-limit)
            .reverse()
            .map(({ date, value }) => (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`Open ${formatDay(date, { month: 'long', day: 'numeric', year: 'numeric' })}, ${symptom}, ${value === null ? 'logged without a rating' : `severity ${value} of 10`}`}
                onPress={() => openDay(date)}
                style={({ pressed }) => ({
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: 12,
                  padding: 14,
                  gap: 10,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={[common.wrap, { justifyContent: 'space-between' }]}>
                  <Text style={common.label}>
                    {formatDay(date, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Text style={common.body}>
                    {value === null ? 'Not rated' : `${value}/10${value === 0 ? ' · None' : ''}`}
                  </Text>
                </View>
                {value !== null && (
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
                      style={{ height: 10, width: `${value * 10}%`, backgroundColor: colors.plum }}
                    />
                  </View>
                )}
              </Pressable>
            ))}
          {history.records.length > limit && (
            <Button
              secondary
              label="Show older symptom records"
              onPress={() => setLimit((value) => value + 30)}
            />
          )}
        </>
      )}
    </View>
  );
}
