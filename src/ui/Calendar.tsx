import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FlatList, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { addDays, formatDay, monthCells, monthKey, validDay, type Day } from '../domain/dates';
import { hasEntry, FLOW_LABELS, type Journal } from '../domain/journal';
import { cycleDayLookup, flowState } from '../domain/history';
import { Button, Chip } from './components';
import { useTheme, serif } from './theme';

export type CalendarView = 'year' | 'month' | 'day';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DayGrid({
  journal,
  month,
  today,
  mini,
  cellHeight = 70,
  dayNumber,
  onOpenDay,
}: {
  journal: Journal;
  month: Day;
  today: Day;
  mini: boolean;
  cellHeight?: number;
  dayNumber: (day: Day) => number | null;
  onOpenDay: (day: Day) => void;
}) {
  const { colors, common } = useTheme();
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
        {[...monthCells(month), ...Array(42 - monthCells(month).length).fill(null)].map(
          (day, index) => {
            const medicalCount = day
              ? journal.medicalRecords.filter((record) => record.date === day).length
              : 0;
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
            const textColor = chosen
              ? colors.onAccent
              : state === 'bleeding'
                ? colors.roseInk
                : colors.ink;
            const content = day && (
              <>
                {!mini && (
                  <Text
                    style={{
                      fontSize: 9,
                      color: chosen ? colors.onAccent : colors.muted,
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
                    {(hasEntry(entry) || medicalCount > 0) && (
                      <View
                        style={{
                          width: entry?.periodStart ? 9 : 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: chosen ? colors.onAccent : colors.plum,
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
                style={{
                  width: `${100 / 7}%`,
                  height: mini ? 26 : cellHeight,
                  padding: mini ? 1 : 2,
                }}
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
                      accessibilityLabel={`${formatDay(day, { month: 'long', day: 'numeric', year: 'numeric' })}${day === today ? ', today' : ''}${cycle === null ? '' : `, cycle day ${cycle}`}, ${state === 'unknown' ? 'flow not logged' : state === 'none' ? 'no flow' : entry && FLOW_LABELS[entry.flow]}${hasEntry(entry) ? ', logged' : ''}${medicalCount ? `, ${medicalCount} medical records` : ''}`}
                      accessibilityState={{ selected: chosen }}
                      aria-pressed={chosen}
                      onPress={() => onOpenDay(day)}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: cellHeight - 4,
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
          },
        )}
      </View>
    </>
  );
}
export interface CalendarHandle {
  top(): void;
}
export const Calendar = forwardRef<
  CalendarHandle,
  {
    journal: Journal;
    today: Day;
    onSelect: (date: Day) => void;
    onOpenDay: (date: Day) => void;
    compact: boolean;
    view: CalendarView;
    changeView: (view: CalendarView) => void;
    header: React.ReactNode;
    dayContent: React.ReactNode;
    explore: React.ReactNode;
  }
>(function Calendar(
  { journal, today, onSelect, onOpenDay, compact, view, changeView, header, dayContent, explore },
  ref,
) {
  const { colors, common, dark } = useTheme();
  const { fontScale } = useWindowDimensions();
  const scale = Math.max(1, fontScale);
  const cellHeight = Math.ceil(44 * scale + 26);
  const monthHeight = Math.ceil(6 * cellHeight + 100 * scale + 30);
  const selected = journal.selectedDate;
  const [first, setFirst] = useState(monthKey(selected));
  const [count, setCount] = useState(3);
  const [year, setYear] = useState(Number(selected.slice(0, 4)));
  const [jump, setJump] = useState(false);
  const [dateInput, setDateInput] = useState(selected);
  const [error, setError] = useState('');
  const list = useRef<FlatList<string>>(null);
  const headerHeight = useRef(0);
  const y = useRef(0);
  const pendingOffset = useRef<number | null>(null);
  const lastPrepend = useRef(0);
  useImperativeHandle(ref, () => ({
    top: () => list.current?.scrollToOffset({ offset: 0, animated: false }),
  }));
  const dayNumber = useMemo(() => cycleDayLookup(journal, today), [journal, today]);
  const months =
    view === 'month'
      ? Array.from({ length: count }, (_, i) => monthKey(first, i)).filter(validDay)
      : [];
  const prepend = (showEarlier = false) => {
    if (first <= '1900-01-01' || pendingOffset.current !== null) return;
    const earlier = monthKey(first, -3) < '1900-01-01' ? '1900-01-01' : monthKey(first, -3);
    const extra =
      (Number(first.slice(0, 4)) - Number(earlier.slice(0, 4))) * 12 +
      Number(first.slice(5, 7)) -
      Number(earlier.slice(5, 7));
    pendingOffset.current = showEarlier ? headerHeight.current : y.current + extra * monthHeight;
    lastPrepend.current = Date.now();
    setFirst(earlier);
    setCount((n) => n + extra);
  };
  useEffect(() => {
    if (pendingOffset.current === null) return;
    const offset = pendingOffset.current;
    const frame = requestAnimationFrame(() => {
      list.current?.scrollToOffset({ offset, animated: false });
      y.current = offset;
      pendingOffset.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [first, count]);
  const go = (date: Day) => {
    if (!validDay(date)) {
      setError('Use a real date from 1900 to 2199, like 2026-10-09.');
      return;
    }
    pendingOffset.current = null;
    setFirst(monthKey(date));
    setCount(3);
    setYear(Number(date.slice(0, 4)));
    onSelect(date);
    setJump(false);
    setError('');
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const chooseView = (next: CalendarView) => {
    changeView(next);
    setYear(Number(selected.slice(0, 4)));
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };
  return (
    <FlatList
      ref={list}
      style={{ flex: 1 }}
      data={months}
      keyExtractor={(m) => m}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={5}
      contentContainerStyle={{
        width: '100%',
        maxWidth: 900,
        alignSelf: 'center',
        paddingHorizontal: compact ? 16 : 28,
        paddingBottom: 32,
      }}
      getItemLayout={(_, index) => ({
        length: monthHeight,
        offset: headerHeight.current + monthHeight * index,
        index,
      })}
      onScroll={(event) => {
        const offset = event.nativeEvent.contentOffset.y,
          previous = y.current;
        y.current = offset;
        if (
          view === 'month' &&
          offset < previous - 1 &&
          offset > headerHeight.current - 40 &&
          offset < headerHeight.current + monthHeight * 0.7 &&
          Date.now() - lastPrepend.current > 800
        )
          prepend();
      }}
      scrollEventThrottle={32}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (
          view === 'month' &&
          y.current > headerHeight.current &&
          validDay(monthKey(first, count))
        )
          setCount((n) => n + 3);
      }}
      ListHeaderComponent={
        <View
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            const previous = headerHeight.current;
            headerHeight.current = height;
            if (
              previous > 0 &&
              height !== previous &&
              y.current >= previous &&
              pendingOffset.current === null
            ) {
              const offset = y.current + height - previous;
              y.current = offset;
              list.current?.scrollToOffset({ offset, animated: false });
            }
          }}
          style={{ gap: 18, paddingTop: 20 }}
        >
          {header}
          <View style={[common.card, { padding: compact ? 16 : 24 }]}>{dayContent}</View>
          {explore}
          <View style={{ gap: 12, paddingTop: 8, paddingBottom: 16 }}>
            <View style={common.between}>
              <Text style={common.heading}>Calendar</Text>
              <Button secondary label="Today" onPress={() => go(today)} />
            </View>
            <View style={common.wrap}>
              {(['month', 'year', 'day'] as CalendarView[]).map((mode) => (
                <Chip
                  key={mode}
                  label={`${mode[0]!.toUpperCase()}${mode.slice(1)} view`}
                  selected={mode === view}
                  onPress={() => chooseView(mode)}
                />
              ))}
            </View>
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
                <TextInput
                  style={common.input}
                  value={dateInput}
                  onChangeText={setDateInput}
                  accessibilityLabel="Jump to date"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.muted}
                  keyboardAppearance={dark ? 'dark' : 'light'}
                  maxLength={10}
                  onSubmitEditing={() => go(dateInput)}
                />
                <Button label="Go to date" onPress={() => go(dateInput)} />
                {!!error && (
                  <Text accessibilityRole="alert" style={common.error}>
                    {error}
                  </Text>
                )}
              </View>
            )}
            {view === 'day' ? (
              <View style={common.wrap}>
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
            ) : (
              <>
                <View style={common.wrap}>
                  {[
                    [colors.rose, 'Bleeding'],
                    [colors.sand, 'Spotting'],
                    [colors.sage, 'No flow'],
                    [colors.paper, 'Not logged'],
                  ].map(([color, label]) => (
                    <View key={label} style={common.row}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          backgroundColor: color,
                          borderWidth: 1,
                          borderColor: colors.line,
                        }}
                      />
                      <Text style={common.small}>{label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={common.small}>C = recorded cycle day · Tap a day to open it.</Text>
              </>
            )}
            {view === 'month' && (
              <Button
                secondary
                icon={ArrowUp}
                label="Earlier months"
                disabled={first <= '1900-01-01'}
                onPress={() => prepend(true)}
              />
            )}
            {view === 'year' && (
              <>
                <View style={common.wrap}>
                  <Button
                    secondary
                    label="Previous year"
                    disabled={year <= 1900}
                    onPress={() => setYear(year - 1)}
                  />
                  <Text style={common.heading}>{year}</Text>
                  <Button
                    secondary
                    label="Next year"
                    disabled={year >= 2199}
                    onPress={() => setYear(year + 1)}
                  />
                </View>
                <View style={common.wrap}>
                  {Array.from(
                    { length: 12 },
                    (_, i) => `${year}-${String(i + 1).padStart(2, '0')}-01`,
                  ).map((month) => (
                    <Pressable
                      key={month}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${formatDay(month, { month: 'long', year: 'numeric' })}`}
                      onPress={() => {
                        setFirst(month);
                        setCount(3);
                        changeView('month');
                        requestAnimationFrame(() =>
                          list.current?.scrollToOffset({
                            offset: headerHeight.current,
                            animated: false,
                          }),
                        );
                      }}
                      style={{
                        width: compact ? '47%' : '31%',
                        flexGrow: 1,
                        padding: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.line,
                      }}
                    >
                      <Text style={common.label}>{formatDay(month, { month: 'long' })}</Text>
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
            )}
          </View>
        </View>
      }
      renderItem={({ item: month }) => (
        <View
          style={{
            height: monthHeight,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.paper,
            borderRadius: 14,
          }}
        >
          <Text
            style={{
              fontFamily: serif,
              fontSize: 23,
              color: colors.ink,
              marginVertical: 12,
              minHeight: 34 * scale,
            }}
          >
            {formatDay(month, { month: 'long', year: 'numeric' })}
          </Text>
          <DayGrid
            journal={journal}
            month={month}
            today={today}
            mini={false}
            cellHeight={cellHeight}
            dayNumber={dayNumber}
            onOpenDay={onOpenDay}
          />
        </View>
      )}
      ListFooterComponent={
        view === 'month' ? (
          <View style={{ paddingTop: 16 }}>
            <Button
              secondary
              icon={ArrowDown}
              label="Later months"
              disabled={!validDay(monthKey(first, count))}
              onPress={() => setCount((n) => n + 3)}
            />
          </View>
        ) : null
      }
    />
  );
});
