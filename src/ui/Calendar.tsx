import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react-native';
import { formatDay, monthCells, monthKey, validDay, type Day } from '../domain/dates';
import { hasEntry, type Journal } from '../domain/journal';
import { Button } from './components';
import { colors, common, serif } from './theme';

export function Calendar({
  journal,
  today,
  onSelect,
  compact,
}: {
  journal: Journal;
  today: Day;
  onSelect: (date: Day) => void;
  compact: boolean;
}) {
  const selected = journal.selectedDate;
  const [first, setFirst] = useState(monthKey(selected));
  const [count, setCount] = useState(3);
  const [jump, setJump] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [error, setError] = useState('');
  const scroll = useRef<ScrollView>(null);
  const months = Array.from({ length: count }, (_, i) => monthKey(first, i));
  const go = (day: Day) => {
    if (!validDay(day)) {
      setError('Use a date like 2026-10-08.');
      return;
    }
    setError('');
    setFirst(monthKey(day));
    setCount(3);
    onSelect(day);
    setJump(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  return (
    <View
      style={{
        backgroundColor: colors.paper,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.line,
        overflow: 'hidden',
      }}
    >
      <View
        style={[
          common.between,
          { padding: compact ? 17 : 24, borderBottomWidth: 1, borderColor: colors.line },
        ]}
      >
        <View style={{ gap: 3 }}>
          <Text style={common.heading}>Your calendar</Text>
          <Text style={common.small}>A little context for every day.</Text>
        </View>
        <Button
          secondary
          label="Today"
          onPress={() => go(today)}
          style={{ paddingHorizontal: 13 }}
        />
      </View>
      <View style={{ paddingHorizontal: compact ? 16 : 24, paddingTop: 14, gap: 12 }}>
        <View style={[common.between, { flexWrap: 'wrap' }]}>
          <View style={common.wrap}>
            {[
              [colors.rose, 'Period'],
              ['#E9DDD0', 'Spotting'],
              [colors.sageInk, 'Symptoms'],
            ].map(([color, label]) => (
              <View key={label} style={[common.row, { gap: 6, marginRight: 6 }]}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                <Text style={common.small}>{label}</Text>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setJump(!jump)}
            style={{ minHeight: 40, justifyContent: 'center' }}
          >
            <Text style={[common.small, { color: colors.plum, fontWeight: '600' }]}>
              Jump to date
            </Text>
          </Pressable>
        </View>
        {jump && (
          <View style={{ gap: 7 }}>
            <View style={common.row}>
              <TextInput
                accessibilityLabel="Jump to date"
                placeholder="YYYY-MM-DD"
                value={dateInput}
                onChangeText={setDateInput}
                style={[common.input, { flex: 1 }]}
                onSubmitEditing={() => go(dateInput)}
                maxLength={10}
              />
              <Button label="Go" icon={ChevronRight} onPress={() => go(dateInput)} />
            </View>
            {!!error && <Text style={common.error}>{error}</Text>}
          </View>
        )}
        <View style={{ flexDirection: 'row' }}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
            <Text
              key={day}
              style={[
                common.eyebrow,
                {
                  width: `${100 / 7}%`,
                  textAlign: 'center',
                  fontSize: 9,
                  letterSpacing: 1,
                  paddingVertical: 8,
                },
              ]}
            >
              {day}
            </Text>
          ))}
        </View>
      </View>
      <ScrollView
        ref={scroll}
        style={{ height: compact ? 440 : 510 }}
        contentContainerStyle={{ paddingHorizontal: compact ? 14 : 24, paddingBottom: 22 }}
        nestedScrollEnabled
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Load earlier months"
          onPress={() => {
            setFirst(monthKey(first, -3));
            setCount(count + 3);
            scroll.current?.scrollTo({ y: 0, animated: false });
          }}
          style={[common.row, { justifyContent: 'center', minHeight: 45 }]}
        >
          <ArrowUp size={13} color={colors.muted} />
          <Text style={common.small}>Earlier months</Text>
        </Pressable>
        {months.map((month) => (
          <View key={month} style={{ paddingBottom: 14 }}>
            <View style={[common.between, { paddingTop: 15, paddingBottom: 15 }]}>
              <Text style={{ fontFamily: serif, color: colors.ink, fontSize: 23 }}>
                {formatDay(month, { month: 'long' })}{' '}
                <Text style={{ color: colors.muted, fontSize: 16 }}>
                  {formatDay(month, { year: 'numeric' })}
                </Text>
              </Text>
              <View style={{ height: 1, backgroundColor: colors.line, flex: 1, marginLeft: 12 }} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {monthCells(month).map((day, index) => {
                const entry = day ? journal.entries[day] : undefined;
                const bleeding = entry && entry.flow !== 'none' && entry.flow !== 'spotting';
                const chosen = day === selected;
                return (
                  <View
                    key={day ?? `empty-${index}`}
                    style={{ width: `${100 / 7}%`, height: compact ? 59 : 67, padding: 3 }}
                  >
                    {day && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${formatDay(day, { month: 'long', day: 'numeric', year: 'numeric' })}${day === today ? ', today' : ''}${entry?.flow && entry.flow !== 'none' ? `, ${entry.flow}` : ''}${hasEntry(entry) ? ', logged' : ''}`}
                        accessibilityState={{ selected: chosen }}
                        onPress={() => onSelect(day)}
                        style={({ pressed }) => ({
                          flex: 1,
                          borderRadius: 13,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          borderWidth: chosen || day === today ? 1.5 : 0,
                          borderColor: chosen ? colors.plumDark : colors.plum,
                          backgroundColor: chosen
                            ? colors.plumDark
                            : bleeding
                              ? colors.rose
                              : entry?.flow === 'spotting'
                                ? colors.sand
                                : 'transparent',
                          opacity: pressed ? 0.6 : day > today ? 0.45 : 1,
                        })}
                      >
                        <Text
                          style={{
                            fontSize: compact ? 14 : 16,
                            fontWeight: chosen || day === today ? '700' : '400',
                            color: chosen ? '#fff' : bleeding ? colors.roseInk : colors.ink,
                          }}
                        >
                          {Number(day.slice(-2))}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 3, height: 4 }}>
                          {entry?.symptoms.length ? (
                            <View
                              style={{
                                height: 4,
                                width: 4,
                                borderRadius: 2,
                                backgroundColor: chosen ? '#E3D9C9' : colors.sageInk,
                              }}
                            />
                          ) : null}
                          {entry?.note ? (
                            <View
                              style={{
                                height: 4,
                                width: 4,
                                borderRadius: 2,
                                backgroundColor: chosen ? '#fff' : colors.plum,
                              }}
                            />
                          ) : null}
                          {entry?.periodStart ? (
                            <View
                              style={{
                                height: 4,
                                width: 8,
                                borderRadius: 2,
                                backgroundColor: chosen ? '#fff' : colors.roseInk,
                              }}
                            />
                          ) : null}
                        </View>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <Button
          secondary
          label="Later months"
          icon={ArrowDown}
          onPress={() => setCount(count + 3)}
        />
      </ScrollView>
      <View
        style={{
          padding: 13,
          backgroundColor: '#FCFBF9',
          borderTopWidth: 1,
          borderColor: colors.line,
        }}
      >
        <Text style={[common.small, { textAlign: 'center', fontSize: 11 }]}>
          Scroll through months · Tap a day to make it yours
        </Text>
      </View>
    </View>
  );
}
