import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { formatDay, monthCells, monthKey, validDay, type Day } from '../domain/dates';
import { hasEntry, FLOW_LABELS, type Journal } from '../domain/journal';
import { cycleDayLookup, flowState } from '../domain/history';
import { Button, Chip } from './components';
import { useTheme } from './theme';
import { CalendarWeeks } from './CalendarWeeks';

export type CalendarView = 'year' | 'month';
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
              { flex: 1, minWidth: 0, textAlign: 'center', fontSize: mini ? 9 : 11 },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
      <CalendarWeeks month={month}>
        {(day, index) => {
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
                flex: 1,
                minWidth: 0,
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
        }}
      </CalendarWeeks>
    </>
  );
}
export interface CalendarHandle {
  top(): void;
  rememberPosition(open: () => void): void;
  restorePosition(): void;
}
type ScrollTarget = 'top' | 'controls' | 'months' | 'return';
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
    addPeriod: () => void;
    explore: React.ReactNode;
  }
>(function Calendar(
  { journal, today, onSelect, onOpenDay, compact, view, changeView, header, addPeriod, explore },
  ref,
) {
  const { colors, common, dark } = useTheme();
  const { fontScale } = useWindowDimensions();
  const scale = Math.max(1, fontScale);
  const cellHeight = Math.ceil(48 * scale);
  // Reserve wrapping space for long month names at enlarged Android text sizes.
  const monthHeadingHeight = 28 * scale * (scale > 1.2 ? Math.ceil(scale * 1.5) : 1) + 8;
  // Exact row heights keep continuous month scrolling anchored through prepends.
  const monthHeight = (month: Day) =>
    (monthCells(month).length / 7) * cellHeight + monthHeadingHeight + 19 * scale + 31;
  const selected = journal.selectedDate;
  const [first, setFirst] = useState(monthKey(selected));
  const [count, setCount] = useState(3);
  const [year, setYear] = useState(Number(selected.slice(0, 4)));
  const [jump, setJump] = useState(false);
  const [dateInput, setDateInput] = useState(selected);
  const [error, setError] = useState('');
  const list = useRef<FlatList<string>>(null);
  const viewportNode = useRef<View>(null);
  const headerNode = useRef<View>(null);
  const controlsNode = useRef<View>(null);
  const headerHeight = useRef(0);
  const y = useRef(0);
  const savedMonthOffset = useRef(0);
  const pendingOffset = useRef<number | null>(null);
  const lastPrepend = useRef(0);
  const navigation = useRef<{ id: number; target: ScrollTarget } | null>(null);
  const navigationId = useRef(0);
  const navigationFrame = useRef<number | null>(null);
  const [navigationRevision, setNavigationRevision] = useState(0);
  const scrollTo = (offset: number) => {
    y.current = Math.max(0, offset);
    list.current?.scrollToOffset({ offset: y.current, animated: false });
  };
  const navigate = (target: ScrollTarget) => {
    pendingOffset.current = null;
    navigation.current = { id: ++navigationId.current, target };
    lastPrepend.current = Date.now();
    setNavigationRevision((n) => n + 1);
  };
  const settleNavigation = () => {
    if (!navigation.current) return;
    if (navigationFrame.current !== null) cancelAnimationFrame(navigationFrame.current);
    // Measure committed native layout, not the previous view's cached header height.
    // Content-size/onLayout events can reschedule this while the view is settling.
    navigationFrame.current = requestAnimationFrame(() => {
      navigationFrame.current = requestAnimationFrame(() => {
        navigationFrame.current = null;
        const request = navigation.current;
        const header = headerNode.current;
        if (!request || !header) return;
        const finish = (offset: number) => {
          if (navigation.current?.id !== request.id) return;
          scrollTo(offset);
          navigation.current = null;
          lastPrepend.current = Date.now();
        };
        if (request.target === 'top') finish(0);
        else if (request.target === 'months' || request.target === 'return') {
          header.measure((_x, _y, _width, height) =>
            finish(height + (request.target === 'return' ? savedMonthOffset.current : 0)),
          );
        } else {
          const node = controlsNode.current;
          node?.measureLayout(
            header,
            (_x, offset) => finish(offset),
            () => {},
          );
        }
      });
    });
  };
  useLayoutEffect(settleNavigation, [navigationRevision, view, first, count]);
  useEffect(
    () => () => {
      navigation.current = null;
      if (navigationFrame.current !== null) cancelAnimationFrame(navigationFrame.current);
    },
    [],
  );
  useImperativeHandle(ref, () => ({
    top: () => navigate('top'),
    rememberPosition: (open) => {
      const id = ++navigationId.current;
      navigation.current = null;
      savedMonthOffset.current = y.current - headerHeight.current;
      const header = headerNode.current;
      const viewport = viewportNode.current;
      if (!header || !viewport) {
        open();
        return;
      }
      // Native scroll events are throttled; measure the visible position before opening.
      header.measureInWindow((_x, headerY, _width, height) => {
        viewport.measureInWindow((_vx, viewportY) => {
          if (id !== navigationId.current || viewportNode.current !== viewport) return;
          if (height > 0) savedMonthOffset.current = viewportY - headerY - height;
          open();
        });
      });
    },
    restorePosition: () => navigate('return'),
  }));
  const dayNumber = useMemo(() => cycleDayLookup(journal, today), [journal, today]);
  const months =
    view === 'month'
      ? Array.from({ length: count }, (_, i) => monthKey(first, i)).filter(validDay)
      : [];
  const prepend = (showEarlier = false) => {
    if (first <= '1900-01-01' || pendingOffset.current !== null || navigation.current) return;
    const earlier = monthKey(first, -3) < '1900-01-01' ? '1900-01-01' : monthKey(first, -3);
    const extra =
      (Number(first.slice(0, 4)) - Number(earlier.slice(0, 4))) * 12 +
      Number(first.slice(5, 7)) -
      Number(earlier.slice(5, 7));
    pendingOffset.current = showEarlier
      ? headerHeight.current
      : y.current +
        Array.from({ length: extra }, (_, i) => monthHeight(monthKey(earlier, i))).reduce(
          (a, b) => a + b,
          0,
        );
    lastPrepend.current = Date.now();
    setFirst(earlier);
    setCount((n) => n + extra);
  };
  useEffect(() => {
    if (pendingOffset.current === null) return;
    const offset = pendingOffset.current;
    const frame = requestAnimationFrame(() => {
      if (pendingOffset.current === null) return;
      scrollTo(offset);
      pendingOffset.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [first, count]);
  const go = (date: Day) => {
    if (!validDay(date)) {
      setError('Use a real date from 1900 to 2199, like 2026-10-09.');
      return;
    }
    navigate(view === 'year' ? 'controls' : 'months');
    setFirst(monthKey(date));
    setCount(3);
    setYear(Number(date.slice(0, 4)));
    onSelect(date);
    setJump(false);
    setError('');
  };
  const chooseView = (next: CalendarView) => {
    navigate('controls');
    changeView(next);
    setYear(Number(selected.slice(0, 4)));
  };
  return (
    <View ref={viewportNode} collapsable={false} style={{ flex: 1 }}>
      <FlatList
        ref={list}
        style={{ flex: 1, ...(Platform.OS === 'web' ? { overflowAnchor: 'none' } : {}) }}
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
          length: monthHeight(months[index]!),
          offset:
            headerHeight.current +
            months.slice(0, index).reduce((sum, month) => sum + monthHeight(month), 0),
          index,
        })}
        onScroll={(event) => {
          const offset = event.nativeEvent.contentOffset.y,
            previous = y.current;
          y.current = offset;
          if (
            view === 'month' &&
            !navigation.current &&
            offset < previous - 1 &&
            offset > headerHeight.current - 40 &&
            offset < headerHeight.current + monthHeight(first) * 0.7 &&
            Date.now() - lastPrepend.current > 800
          )
            prepend();
        }}
        scrollEventThrottle={32}
        onContentSizeChange={settleNavigation}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (
            view === 'month' &&
            !navigation.current &&
            y.current > headerHeight.current &&
            validDay(monthKey(first, count))
          )
            setCount((n) => n + 3);
        }}
        ListHeaderComponent={
          <View
            ref={headerNode}
            collapsable={false}
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;
              const previous = headerHeight.current;
              headerHeight.current = height;
              if (
                previous > 0 &&
                height !== previous &&
                // Scroll offsets may be rounded to whole pixels while layout is fractional.
                y.current >= previous - 1 &&
                !navigation.current &&
                pendingOffset.current === null
              ) {
                const offset = y.current + height - previous;
                scrollTo(offset);
              }
              settleNavigation();
            }}
            style={{ gap: 12, paddingTop: 12 }}
          >
            {header}
            <View ref={controlsNode} collapsable={false} style={{ gap: 6, paddingBottom: 8 }}>
              <View style={common.between}>
                <Text style={[common.heading, { flexShrink: 1 }]}>Your calendar</Text>
                <Button label="Add period" onPress={addPeriod} />
              </View>
              <View style={common.wrap}>
                {(['month', 'year'] as CalendarView[]).map((mode) => (
                  <Chip
                    key={mode}
                    label={`${mode[0]!.toUpperCase()}${mode.slice(1)}`}
                    selected={mode === view}
                    onPress={() => chooseView(mode)}
                  />
                ))}
                <Button quiet label="Today" onPress={() => go(today)} />
                <Button
                  quiet
                  label="Find date"
                  onPress={() => {
                    setJump(!jump);
                    setDateInput(selected);
                    setError('');
                  }}
                />
              </View>
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
                <Text style={common.small}>Tap a date to open its journal.</Text>
              </>
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
                          navigate('months');
                          setFirst(month);
                          setCount(3);
                          changeView('month');
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
              height: monthHeight(month),
              padding: 12,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.paper,
              borderRadius: 12,
            }}
          >
            <View style={[common.between, { height: monthHeadingHeight, marginBottom: 0 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Month before ${formatDay(month, { month: 'long', year: 'numeric' })}`}
                disabled={!validDay(monthKey(month, -1))}
                onPress={() => go(monthKey(month, -1))}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft color={colors.plum} size={20} />
              </Pressable>
              <Text
                style={[
                  common.label,
                  { flexShrink: 1, textAlign: 'center', fontSize: 17, lineHeight: 28 },
                ]}
              >
                {formatDay(month, { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Month after ${formatDay(month, { month: 'long', year: 'numeric' })}`}
                disabled={!validDay(monthKey(month, 1))}
                onPress={() => go(monthKey(month, 1))}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ChevronRight color={colors.plum} size={20} />
              </Pressable>
            </View>
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
      <View style={{ paddingHorizontal: compact ? 16 : 28, backgroundColor: colors.paper }}>
        {explore}
      </View>
    </View>
  );
});
