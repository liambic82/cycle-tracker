import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { formatDay, monthCells, monthKey, daysBetween, type Day } from '../domain/dates';
import { FLOW_LABELS, type Flow, type Journal } from '../domain/journal';
import { applyPeriodRange } from '../domain/periodRange';
import { Button, Chip } from './components';
import { useTheme } from './theme';

const label = (date: Day) => formatDay(date, { month: 'short', day: 'numeric', year: 'numeric' });
export function PeriodRangeEditor({
  journal,
  today,
  update,
  close,
  closeLabel,
  saveStatus,
  onViewChange,
}: {
  journal: Journal;
  today: Day;
  update: (f: (j: Journal) => Journal) => void;
  close: () => void;
  closeLabel: string;
  saveStatus: React.ReactNode;
  onViewChange: () => void;
}) {
  const { common, colors } = useTheme();
  const [start, setStart] = useState<Day>('');
  const [end, setEnd] = useState<Day | null>(null);
  const [flow, setFlow] = useState<Flow>('unspecified');
  const [choosing, setChoosing] = useState<'start' | 'end' | null>('start');
  const [month, setMonth] = useState(
    monthKey(journal.selectedDate > today ? today : journal.selectedDate),
  );
  const [monthPicker, setMonthPicker] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);
  return (
    <View style={{ gap: 18 }}>
      <Button secondary label={closeLabel} onPress={close} />
      {saveStatus}
      <Text style={common.heading}>Add a period</Text>
      {result ? (
        <>
          <Text accessibilityLiveRegion="polite" style={common.body}>
            {result}
          </Text>
          <Text style={common.body}>
            You can add or change flow details later by opening any day in your calendar.
          </Text>
          <Button
            label="Add another period"
            onPress={() => {
              setStart('');
              setEnd(null);
              setFlow('unspecified');
              setResult('');
              setError('');
              setChoosing('start');
              onViewChange();
            }}
          />
          <Button secondary label={closeLabel} onPress={close} />
        </>
      ) : (
        <>
          <Text style={common.body}>
            Choose the first and last day together. Flow details are optional. If you only remember
            the start, leave the finish blank.
          </Text>
          <View style={common.wrap}>
            <Button
              secondary
              label={`Start: ${start ? label(start) : 'Choose date'}`}
              style={{ flexGrow: 1 }}
              onPress={() => {
                setChoosing('start');
                if (start) setMonth(monthKey(start));
              }}
            />
            <Button
              secondary
              label={`Finish: ${end ? label(end) : 'Not entered'}`}
              style={{ flexGrow: 1 }}
              onPress={() => {
                setChoosing('end');
                if (end || start) setMonth(monthKey(end ?? start));
              }}
            />
          </View>
          {choosing && (
            <View style={[common.card, { gap: 12 }]}>
              <Text accessibilityLiveRegion="polite" style={common.label}>
                {choosing === 'start' ? 'Choose the first day' : 'Choose the last day'}
              </Text>
              <Button
                secondary
                label={
                  formatDay(month, { month: 'long', year: 'numeric' }) + ' · choose month / year'
                }
                onPress={() => setMonthPicker(!monthPicker)}
              />
              {monthPicker ? (
                <>
                  <View style={common.wrap}>
                    <Button
                      secondary
                      label="Previous year"
                      disabled={month.slice(0, 4) === '1900'}
                      onPress={() => setMonth(monthKey(month, -12))}
                    />
                    <Button
                      secondary
                      label="Next year"
                      disabled={month.slice(0, 4) >= today.slice(0, 4)}
                      onPress={() => setMonth(monthKey(month, 12))}
                    />
                  </View>
                  <View style={common.wrap}>
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = `${month.slice(0, 4)}-${String(i + 1).padStart(2, '0')}-01`;
                      return (
                        <Chip
                          key={m}
                          label={formatDay(m, { month: 'short' })}
                          accessibilityLabel={formatDay(m, { month: 'long', year: 'numeric' })}
                          selected={m === month}
                          disabled={m > today}
                          onPress={() => {
                            setMonth(m);
                            setMonthPicker(false);
                          }}
                        />
                      );
                    })}
                  </View>
                </>
              ) : (
                <>
                  <View style={common.wrap}>
                    <Button
                      secondary
                      label="Previous month"
                      disabled={month === '1900-01-01'}
                      onPress={() => setMonth(monthKey(month, -1))}
                    />
                    <Button
                      secondary
                      label="Next month"
                      disabled={month >= monthKey(today)}
                      onPress={() => setMonth(monthKey(month, 1))}
                    />
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <Text
                        key={i}
                        style={[common.small, { width: `${100 / 7}%`, textAlign: 'center' }]}
                      >
                        {day}
                      </Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {monthCells(month).map((day, i) => {
                      const selected = !!day && (day === start || day === end);
                      const inRange = !!day && !!start && !!end && day >= start && day <= end;
                      return (
                        <View key={day ?? `blank${i}`} style={{ width: `${100 / 7}%`, padding: 1 }}>
                          {day && (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`${choosing === 'start' ? 'Start' : 'Finish'} ${label(day)}`}
                              accessibilityState={{
                                selected,
                                disabled:
                                  day > today || (choosing === 'end' && !!start && day < start),
                              }}
                              disabled={
                                day > today || (choosing === 'end' && !!start && day < start)
                              }
                              onPress={() => {
                                setError('');
                                if (choosing === 'start') {
                                  setStart(day);
                                  if (end && end < day) setEnd(null);
                                  setChoosing('end');
                                } else {
                                  setEnd(day);
                                  setChoosing(start ? null : 'start');
                                }
                              }}
                              style={{
                                minHeight: 44,
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: 8,
                                backgroundColor: selected
                                  ? colors.plumDark
                                  : inRange
                                    ? colors.accentSoft
                                    : colors.paper,
                                opacity:
                                  day > today || (choosing === 'end' && !!start && day < start)
                                    ? 0.35
                                    : 1,
                              }}
                            >
                              <Text
                                style={[
                                  common.body,
                                  { color: selected ? colors.onAccent : colors.ink },
                                ]}
                              >
                                {Number(day.slice(-2))}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
              {!!start && (
                <Button
                  secondary
                  label="Only record the start for now"
                  onPress={() => {
                    setEnd(null);
                    setChoosing(null);
                  }}
                />
              )}
            </View>
          )}
          <Text style={common.label}>Flow details · optional</Text>
          <View style={common.wrap}>
            {(['unspecified', 'light', 'medium', 'heavy'] as const).map((value) => (
              <Chip
                key={value}
                label={value === 'unspecified' ? 'Add details later' : FLOW_LABELS[value]}
                selected={flow === value}
                onPress={() => setFlow(value)}
              />
            ))}
          </View>
          <Text style={common.small}>
            Existing daily flow and other details are kept. New period days record bleeding; “Add
            details later” leaves its level unspecified.
          </Text>
          {!!start && (
            <Text style={common.label}>
              {end
                ? `${label(start)} – ${label(end)} · ${daysBetween(start, end) + 1} period days`
                : `${label(start)} · start only`}
            </Text>
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={common.error}>
              {error}
            </Text>
          )}
          <Button
            label="Save period"
            disabled={!start}
            onPress={() => {
              try {
                let changed = false;
                update((current) => {
                  const next = applyPeriodRange(current, { start, end, flow }, today);
                  changed = next !== current;
                  return changed ? { ...next, selectedDate: start } : next;
                });
                setResult(
                  changed
                    ? `Period added: ${label(start)}${end ? ` – ${label(end)}` : ' (start only)'}. Check the save status above.`
                    : 'This period is already recorded. No duplicate was added.',
                );
                setError('');
                onViewChange();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not add the period.');
              }
            }}
          />
          <Button secondary label="Cancel" onPress={close} />
        </>
      )}
    </View>
  );
}
