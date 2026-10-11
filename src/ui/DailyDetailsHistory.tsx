import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { dailyDetailsHistory, describeDailyDetails } from '../domain/dailyDetails';
import type { Journal } from '../domain/journal';
import type { Day } from '../domain/dates';
import { Button, Chip } from './components';
import { useTheme } from './theme';
export function DailyDetailsHistory({
  journal,
  today,
  openDay,
}: {
  journal: Journal;
  today: Day;
  openDay: (day: Day) => void;
}) {
  const { common } = useTheme();
  const [days, setDays] = useState<30 | 90 | 365>(30);
  const [limit, setLimit] = useState(20);
  const rows = dailyDetailsHistory(journal, today, days);
  return (
    <View style={{ gap: 16 }}>
      <Text style={common.heading}>Daily observation history</Text>
      <View style={common.wrap}>
        {([30, 90, 365] as const).map((n) => (
          <Chip
            key={n}
            label={`${n} days`}
            selected={n === days}
            onPress={() => {
              setDays(n);
              setLimit(20);
            }}
          />
        ))}
      </View>
      <Text style={common.small}>
        {rows.length} recorded days. Missing values stay unknown. Measurements retain their original
        units; no values are averaged across units.
      </Text>
      {rows.slice(0, limit).map((row) => (
        <View key={row.date} style={{ gap: 9 }}>
          <Button
            secondary
            label={`Open observations for ${row.date}`}
            onPress={() => openDay(row.date)}
          />
          {describeDailyDetails(row.details).map((text, i) => (
            <Text key={i} style={common.body}>
              {text}
            </Text>
          ))}
        </View>
      ))}
      {rows.length > limit && (
        <Button secondary label="Show older observations" onPress={() => setLimit(limit + 20)} />
      )}
    </View>
  );
}
