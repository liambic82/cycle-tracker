import React from 'react';
import { View } from 'react-native';
import { monthCells, type Day } from '../domain/dates';

/** Keep each week intact: fractional percentage widths can wrap the seventh cell on Android. */
export function CalendarWeeks({
  month,
  children,
}: {
  month: Day;
  children: (day: Day | null, index: number) => React.ReactNode;
}) {
  const cells = monthCells(month);
  return (
    <View>
      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <View key={week} style={{ flexDirection: 'row' }}>
          {cells
            .slice(week * 7, week * 7 + 7)
            .map((day, column) => children(day, week * 7 + column))}
        </View>
      ))}
    </View>
  );
}
