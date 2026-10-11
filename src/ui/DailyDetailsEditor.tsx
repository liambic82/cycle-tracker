import React, { useEffect, useState } from 'react';
import { BackHandler, Keyboard, Text, TextInput, View } from 'react-native';
import {
  DAILY_NUMBERS,
  DAILY_CHOICES,
  DAILY_CHOICE_LABELS,
  dailyFromInput,
  emptyDailyDetails,
  type DailyDetails,
  type DailyNumber,
  type DailyChoice,
} from '../domain/dailyDetails';
import { Button, Chip } from './components';
import { useTheme } from './theme';

export function DailyDetailsEditor({
  date,
  value,
  save,
  cancel,
}: {
  date: string;
  value: DailyDetails;
  save: (v: DailyDetails) => void;
  cancel: () => void;
}) {
  const { common, colors, dark } = useTheme();
  const inputValues = (v: DailyDetails) =>
    Object.fromEntries(
      Object.keys(DAILY_NUMBERS).map((k) => [
        k,
        v[k as DailyNumber] === null ? '' : String(v[k as DailyNumber]),
      ]),
    ) as Record<DailyNumber, string>;
  const [draft, setDraft] = useState(() => ({ ...value, painLocations: [...value.painLocations] }));
  const [numbers, setNumbers] = useState(() => inputValues(value));
  const [locations, setLocations] = useState(value.painLocations.join(', '));
  const [error, setError] = useState('');
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      cancel();
      return true;
    });
    return () => sub.remove();
  }, [cancel]);
  const field = (
    label: string,
    text: string,
    change: (x: string) => void,
    numeric = false,
    maxLength = 2000,
  ) => (
    <View style={{ gap: 8 }}>
      <Text style={common.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={common.input}
        value={text}
        onChangeText={change}
        placeholder="Not logged"
        placeholderTextColor={colors.muted}
        selectionColor={colors.plum}
        keyboardAppearance={dark ? 'dark' : 'light'}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        maxLength={maxLength}
      />
    </View>
  );
  return (
    <View style={{ gap: 20 }}>
      <Button
        secondary
        label="Cancel observation changes"
        onPress={() => {
          Keyboard.dismiss();
          cancel();
        }}
      />
      <Text style={common.heading}>Daily observations · {date}</Text>
      <Text style={common.body}>
        Optional details about this day. Blank means not logged; 0 is an explicit value where
        allowed. Save applies the whole form. These records do not diagnose a condition or determine
        fertility.
      </Text>
      <Button
        secondary
        label="Clear observation form"
        onPress={() => {
          const next = emptyDailyDetails();
          setDraft(next);
          setNumbers(inputValues(next));
          setLocations('');
          setError('');
        }}
      />
      {field('Pain locations · separate with commas', locations, setLocations, false, 609)}
      <Text style={common.small}>
        For example: lower abdomen, lower back, head. Keep severity ratings in the symptom section.
      </Text>
      {(Object.keys(DAILY_NUMBERS) as DailyNumber[]).map((key) => (
        <View key={key} style={{ gap: 8 }}>
          {key === 'weight' && (
            <View style={common.wrap}>
              {(['kg', 'lb'] as const).map((unit) => (
                <Chip
                  key={unit}
                  label={unit}
                  accessibilityLabel={`Weight unit ${unit}`}
                  selected={draft.weightUnit === unit}
                  onPress={() => {
                    setDraft({ ...draft, weightUnit: unit });
                    setNumbers({ ...numbers, weight: '' });
                  }}
                />
              ))}
            </View>
          )}
          {key === 'temperature' && (
            <View style={common.wrap}>
              {(['C', 'F'] as const).map((unit) => (
                <Chip
                  key={unit}
                  label={`°${unit}`}
                  accessibilityLabel={`Temperature unit ${unit}`}
                  selected={draft.temperatureUnit === unit}
                  onPress={() => {
                    setDraft({ ...draft, temperatureUnit: unit });
                    setNumbers({ ...numbers, temperature: '' });
                  }}
                />
              ))}
            </View>
          )}
          {field(
            `${DAILY_NUMBERS[key].label}${key === 'weight' ? ` (${draft.weightUnit})` : key === 'temperature' ? ` (°${draft.temperatureUnit})` : ''}`,
            numbers[key],
            (text) => {
              setNumbers({ ...numbers, [key]: text });
              setError('');
            },
            true,
            12,
          )}
          <Text style={common.small}>
            {key === 'weight' || key === 'temperature'
              ? 'Changing the unit clears this unsaved measurement; enter it in the selected unit.'
              : DAILY_NUMBERS[key].unit}{' '}
            {key === 'temperature'
              ? 'Record a measured basal temperature; no ovulation inference is made.'
              : ''}
          </Text>
        </View>
      ))}
      {(Object.keys(DAILY_CHOICES) as DailyChoice[]).map((key) => (
        <View key={key} style={{ gap: 10 }}>
          <Text style={common.label}>{DAILY_CHOICE_LABELS[key]}</Text>
          <View style={common.wrap}>
            {[null, ...DAILY_CHOICES[key]].map((choice) => (
              <Chip
                key={choice ?? 'blank'}
                label={choice ?? 'Not logged'}
                accessibilityLabel={`${DAILY_CHOICE_LABELS[key]}: ${choice ?? 'Not logged'}`}
                selected={draft[key] === choice}
                onPress={() => setDraft({ ...draft, [key]: choice })}
              />
            ))}
          </View>
          {key === 'cycleObservation' && (
            <Text style={common.small}>
              Your description of an expected or intentionally skipped period, recorded on this
              date. It does not create a period boundary or a cycle length. A recent marker
              withholds the experimental period estimate.
            </Text>
          )}
        </View>
      ))}
      {field('Observation context · optional', draft.context, (text) =>
        setDraft({ ...draft, context: text }),
      )}
      <Text style={common.small}>
        Input limits are storage limits, not normal ranges. Test observations require a separate CSV
        choice. Context is included in CSV; doctor summaries let you exclude context notes.
        Encrypted backups contain everything.
      </Text>
      {!!error && (
        <Text accessibilityRole="alert" style={common.error}>
          {error}
        </Text>
      )}
      <Button
        label="Save daily observations"
        onPress={() => {
          try {
            save(
              dailyFromInput(numbers, {
                ...draft,
                painLocations: locations.trim() ? locations.split(',').map((s) => s.trim()) : [],
              }),
            );
            Keyboard.dismiss();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save observations.');
          }
        }}
      />
    </View>
  );
}
