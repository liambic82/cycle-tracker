import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react-native';
import { addDays, formatDay, monthCells, monthKey, validDay, type Day } from '../domain/dates';
import { hasEntry, type Journal } from '../domain/journal';
import { cycleDayLookup, flowState } from '../domain/history';
import { Button, Chip } from './components';
import { colors, common, serif } from './theme';

export type CalendarView = 'year' | 'month' | 'day';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DayGrid({
  journal,
  month,
  today,
  mini,
  dayNumber,
  onOpenDay,
}: {
  journal: Journal;
  month: Day;
  today: Day;
  mini: boolean;
  dayNumber: (day: Day) => number | null;
  onOpenDay: (day: Day) => void;
}) {
  return (
    <>
      <View style={{ flexDirection: 'row', marginBottom: 5 }}>
        {WEEKDAYS.map((label, index) => (
          <Text
            key={index}
            style={[
              common.small,
              { width: `${100 / 7}%`, textAlign: 'center', fontSize: mini ? 9 : 11 },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {monthCells(month).map((day, index) => {
          const entry = day ? journal.entries[day] : undefined;
          const state = flowState(entry);
          const chosen = day === journal.selectedDate;
          const cycle = day ? dayNumber(day) : null;
          const shade = chosen
            ? colors.plumDark
            : state === 'bleeding'
              ? colors.rose
              : state === 'spotting'
                ? colors.sand
                : state === 'none'
                  ? colors.sage
                  : 'transparent';
          const textColor = chosen ? '#fff' : state === 'bleeding' ? colors.roseInk : colors.ink;
          const content = day && (
            <>
              {!mini && (
                <Text
                  style={{
                    fontSize: 9,
                    color: chosen ? '#E9DEE3' : colors.muted,
                    textAlign: 'center',
                  }}
                >
                  {cycle === null ? '·' : `C${cycle}`}
                </Text>
              )}
              <Text
                style={{
                  fontSize: mini ? 10 : 15,
                  color: textColor,
                  fontWeight: chosen || day === today ? '700' : '400',
                }}
              >
                {Number(day.slice(-2))}
              </Text>
              {!mini && (
                <View style={{ height: 4, flexDirection: 'row', gap: 3 }}>
                  {hasEntry(entry) && (
                    <View
                      style={{
                        width: entry?.periodStart ? 9 : 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: chosen ? '#fff' : colors.plum,
                      }}
                    />
                  )}
                </View>
              )}
            </>
          );
          return (
            <View
              key={day ?? `blank-${index}`}
              style={{ width: `${100 / 7}%`, minHeight: mini ? 21 : 70, padding: mini ? 1 : 2 }}
            >
              {day &&
                (mini ? (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: shade,
                      borderRadius: 4,
                      minHeight: 19,
                      opacity: day > today ? 0.4 : 1,
                    }}
                  >
                    {content}
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${formatDay(day, { month: 'long', day: 'numeric', year: 'numeric' })}${day === today ? ', today' : ''}${cycle === null ? '' : `, cycle day ${cycle}`}, ${state === 'unknown' ? 'flow not logged' : state === 'none' ? 'no flow' : entry?.flow}${hasEntry(entry) ? ', logged' : ''}`}
                    accessibilityState={{ selected: chosen }}
                    aria-pressed={chosen}
                    onPress={() => onOpenDay(day)}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 66,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                      backgroundColor: shade,
                      borderRadius: 10,
                      borderWidth: chosen || day === today ? 1.5 : 0,
                      borderColor: colors.plum,
                      opacity: pressed ? 0.65 : day > today ? 0.45 : 1,
                    })}
                  >
                    {content}
                  </Pressable>
                ))}
            </View>
          );
        })}
      </View>
    </>
  );
}

export function Calendar({
  journal,
  today,
  onSelect,
  onOpenDay,
  compact,
  view,
  changeView,
  dayContent,
}: {
  journal: Journal;
  today: Day;
  onSelect: (date: Day) => void;
  onOpenDay: (date: Day) => void;
  compact: boolean;
  view: CalendarView;
  changeView: (view: CalendarView) => void;
  dayContent: React.ReactNode;
}) {
  const selected = journal.selectedDate;
  const [first, setFirst] = useState(monthKey(selected));
  const [count, setCount] = useState(3);
  const [year, setYear] = useState(Number(selected.slice(0, 4)));
  const [jump, setJump] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [error, setError] = useState('');
  const scroll = useRef<ScrollView>(null);
  const dayNumber = useMemo(() => cycleDayLookup(journal, today), [journal, today]);
  const months = Array.from({ length: count }, (_, i) => monthKey(first, i)).filter(validDay);
  useEffect(() => {
    setFirst(monthKey(selected));
    setCount(3);
    setYear(Number(selected.slice(0, 4)));
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [selected]);
  const go = (day: Day) => {
    if (!validDay(day)) {
      setError('Use a real date from 1900 to 2199, like 2026-10-09.');
      return;
    }
    setError('');
    setFirst(monthKey(day));
    setCount(3);
    setYear(Number(day.slice(0, 4)));
    onSelect(day);
    setJump(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const chooseView = (next: CalendarView) => {
    setFirst(monthKey(selected));
    setCount(3);
    setYear(Number(selected.slice(0, 4)));
    changeView(next);
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
          {
            padding: compact ? 17 : 24,
            flexWrap: 'wrap',
            borderBottomWidth: 1,
            borderColor: colors.line,
          },
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
      <View style={{ padding: compact ? 16 : 24, paddingBottom: 14, gap: 14 }}>
        <View style={common.wrap}>
          {(['year', 'month', 'day'] as CalendarView[]).map((mode) => (
            <Chip
              key={mode}
              label={`${mode[0]!.toUpperCase()}${mode.slice(1)} view`}
              selected={view === mode}
              onPress={() => chooseView(mode)}
            />
          ))}
        </View>
        {view !== 'day' && (
          <View style={common.wrap}>
            {[
              [colors.rose, 'Bleeding'],
              [colors.sand, 'Spotting'],
              [colors.sage, 'No flow'],
              [colors.paper, 'Not logged'],
            ].map(([shade, label]) => (
              <View key={label} style={[common.row, { gap: 5 }]}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: shade,
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}
                />
                <Text style={common.small}>{label}</Text>
              </View>
            ))}
          </View>
        )}
        <Button
          secondary
          label="Jump to date"
          onPress={() => {
            setJump(!jump);
            setDateInput(selected);
            setError('');
          }}
        />
        {jump && (
          <View style={{ gap: 8 }}>
            <View style={common.row}>
              <TextInput
                accessibilityLabel="Jump to date"
                placeholder="YYYY-MM-DD"
                value={dateInput}
                onChangeText={setDateInput}
                style={[common.input, { flex: 1, minWidth: 0 }]}
                maxLength={10}
                onSubmitEditing={() => go(dateInput)}
              />
              <Button label="Go" icon={ChevronRight} onPress={() => go(dateInput)} />
            </View>
            {!!error && (
              <Text accessibilityRole="alert" style={common.error}>
                {error}
              </Text>
            )}
          </View>
        )}
      </View>
      {view === 'day' ? (
        <View
          style={{
            padding: compact ? 20 : 24,
            gap: 22,
            width: '100%',
            maxWidth: 760,
            alignSelf: 'center',
          }}
        >
          <View style={[common.between, { flexWrap: 'wrap' }]}>
            <Button
              secondary
              label="Previous day"
              disabled={!validDay(addDays(selected, -1))}
              onPress={() => go(addDays(selected, -1))}
            />
            <Button
              secondary
              label="Next day"
              disabled={!validDay(addDays(selected, 1))}
              onPress={() => go(addDays(selected, 1))}
            />
          </View>
          {dayContent}
        </View>
      ) : (
        <ScrollView
          ref={scroll}
          style={{ height: compact ? 460 : 540 }}
          nestedScrollEnabled
          contentContainerStyle={{
            paddingHorizontal: compact ? 14 : 24,
            paddingBottom: 22,
            gap: 14,
          }}
        >
          {view === 'year' ? (
            <>
              <View style={[common.between, { flexWrap: 'wrap' }]}>
                <Button
                  secondary
                  label="Previous year"
                  disabled={year <= 1900}
                  onPress={() => {
                    setYear(year - 1);
                    scroll.current?.scrollTo({ y: 0, animated: false });
                  }}
                />
                <Text style={common.heading}>{year}</Text>
                <Button
                  secondary
                  label="Next year"
                  disabled={year >= 2199}
                  onPress={() => {
                    setYear(year + 1);
                    scroll.current?.scrollTo({ y: 0, animated: false });
                  }}
                />
              </View>
              <Text style={common.small}>
                Tap a month to open its daily calendar. Your selected day stays the same until you
                choose another.
              </Text>
              <View style={[common.wrap, { gap: 12 }]}>
                {Array.from(
                  { length: 12 },
                  (_, index) => `${year}-${String(index + 1).padStart(2, '0')}-01`,
                ).map((month) => (
                  <Pressable
                    key={month}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${formatDay(month, { month: 'long', year: 'numeric' })}`}
                    onPress={() => {
                      setFirst(month);
                      setCount(3);
                      changeView('month');
                      scroll.current?.scrollTo({ y: 0, animated: false });
                    }}
                    style={({ pressed }) => ({
                      width: compact ? '47%' : '31%',
                      minWidth: 125,
                      flexGrow: 1,
                      padding: 9,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: month === monthKey(selected) ? colors.plum : colors.line,
                      opacity: pressed ? 0.65 : 1,
                    })}
                  >
                    <Text style={[common.label, { marginBottom: 9 }]}>
                      {formatDay(month, { month: 'short' })}
                    </Text>
                    <View
                      pointerEvents="none"
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      aria-hidden
                    >
                      <DayGrid
                        journal={journal}
                        month={month}
                        today={today}
                        mini
                        dayNumber={dayNumber}
                        onOpenDay={onOpenDay}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Button
                secondary
                label="Load earlier months"
                icon={ArrowUp}
                disabled={first <= '1900-01-01'}
                onPress={() => {
                  const earlier = monthKey(first, -3);
                  const bounded = earlier < '1900-01-01' ? '1900-01-01' : earlier;
                  const extra =
                    (Number(first.slice(0, 4)) - Number(bounded.slice(0, 4))) * 12 +
                    Number(first.slice(5, 7)) -
                    Number(bounded.slice(5, 7));
                  setFirst(bounded);
                  setCount(count + extra);
                  scroll.current?.scrollTo({ y: 0, animated: false });
                }}
              />
              {months.map((month) => (
                <View key={month} style={{ paddingBottom: 14 }}>
                  <Text
                    style={{
                      fontFamily: serif,
                      color: colors.ink,
                      fontSize: 23,
                      marginVertical: 18,
                    }}
                  >
                    {formatDay(month, { month: 'long', year: 'numeric' })}
                  </Text>
                  <DayGrid
                    journal={journal}
                    month={month}
                    today={today}
                    mini={false}
                    dayNumber={dayNumber}
                    onOpenDay={onOpenDay}
                  />
                </View>
              ))}
              <Button
                secondary
                label="Later months"
                icon={ArrowDown}
                disabled={!validDay(monthKey(first, count))}
                onPress={() => setCount(count + 3)}
              />
            </>
          )}
        </ScrollView>
      )}
      {view !== 'day' && (
        <Text
          style={[
            common.small,
            { textAlign: 'center', padding: 14, borderTopWidth: 1, borderColor: colors.line },
          ]}
        >
          {view === 'year'
            ? 'Recorded flow across the year · No predictions'
            : 'C = recorded cycle day · Tap a day to open your journal'}
        </Text>
      )}
    </View>
  );
}
