import React from 'react';
import { Text, View } from 'react-native';
import { Activity, Flower2 } from 'lucide-react-native';
import { formatDay, type Day } from '../domain/dates';
import { history, type Journal } from '../domain/journal';
import { colors, common } from './theme';

export function History({ journal, today }: { journal: Journal; today: Day }) {
  const cycles = history(journal, today);
  const lengths = cycles.flatMap((c) => (c.length === null ? [] : [c.length]));
  const average = lengths.length
    ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
    : null;
  return (
    <View style={{ gap: 22 }}>
      <View style={[common.card, { backgroundColor: colors.sage, gap: 14 }]}>
        <Activity color={colors.sageInk} size={24} strokeWidth={1.5} />
        <Text style={common.heading}>Your history, in your own time.</Text>
        <Text style={common.body}>
          These are your recorded cycles. As you log more, your history becomes a clearer picture to
          bring to a conversation with your doctor.
        </Text>
      </View>
      <View style={[common.wrap, { gap: 14 }]}>
        {[
          [average === null ? '—' : `${average} days`, 'Average cycle'],
          [
            lengths.length ? `${Math.min(...lengths)}–${Math.max(...lengths)}` : '—',
            'Shortest to longest',
          ],
          [String(lengths.length), 'Completed intervals'],
        ].map(([value, label]) => (
          <View key={label} style={[common.card, { flex: 1, minWidth: 135, gap: 8 }]}>
            <Text style={common.heading}>{value}</Text>
            <Text style={common.small}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={[common.card, { gap: 20 }]}>
        <Text style={common.heading}>Cycle journal</Text>
        <Text style={common.small}>
          Cycle length runs from one recorded period start to the next. Bleeding duration needs a
          recorded last day.
        </Text>
        {cycles.length === 0 ? (
          <View style={{ paddingVertical: 30, alignItems: 'center', gap: 14 }}>
            <Flower2 color={colors.plum} size={38} strokeWidth={1} />
            <Text style={common.label}>Your story starts with a day.</Text>
            <Text style={[common.body, { textAlign: 'center' }]}>
              Select a date in your calendar, log your flow, and mark the first day of a period to
              begin.
            </Text>
          </View>
        ) : (
          [...cycles].reverse().map((cycle) => (
            <View
              key={cycle.start}
              style={{ gap: 12, paddingVertical: 14, borderTopWidth: 1, borderColor: colors.line }}
            >
              <View style={common.between}>
                <Text style={common.label}>
                  {formatDay(cycle.start, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <Text style={[common.label, { color: colors.plum }]}>
                  {cycle.length ? `${cycle.length} days` : 'Latest cycle'}
                </Text>
              </View>
              {cycle.length !== null && (
                <View style={{ height: 8, backgroundColor: colors.soft, borderRadius: 4 }}>
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      width: `${Math.min(100, (cycle.length / Math.max(...lengths, 1)) * 100)}%`,
                      backgroundColor: colors.rose,
                    }}
                  />
                </View>
              )}
              <Text style={common.small}>
                {cycle.duration === null
                  ? 'Last bleeding day not recorded'
                  : `${cycle.duration} day${cycle.duration === 1 ? '' : 's'} of bleeding`}
              </Text>
            </View>
          ))
        )}
      </View>
      <Text style={common.small}>
        Your journal records observations. It does not diagnose a condition or confirm ovulation.
      </Text>
    </View>
  );
}
