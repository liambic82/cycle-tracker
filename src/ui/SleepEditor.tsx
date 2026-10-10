import React, { useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { formatDay, type Day } from '../domain/dates';
import {
  emptySleep,
  sleepFromInput,
  sleepToInput,
  SLEEP_QUALITIES,
  SLEEP_QUALITY_LABELS,
  type SleepInput,
  type SleepRecord,
} from '../domain/sleep';
import { Button, Chip } from './components';
import { useTheme } from './theme';

export function SleepEditor({
  date,
  value,
  save,
  cancel,
}: {
  date: Day;
  value: SleepRecord;
  save: (value: SleepRecord) => void;
  cancel: () => void;
}) {
  const { colors, common, dark } = useTheme();
  const [draft, setDraft] = useState<SleepInput>(() => sleepToInput(value));
  const [error, setError] = useState('');
  const change = (patch: Partial<SleepInput>) => {
    setDraft((old) => ({ ...old, ...patch }));
    setError('');
  };
  const input = (field: 'hours' | 'minutes' | 'wakings', label: string) => (
    <View style={{ gap: 8, flex: 1, minWidth: 90 }}>
      <Text style={common.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        keyboardAppearance={dark ? 'dark' : 'light'}
        selectionColor={colors.plum}
        placeholderTextColor={colors.muted}
        placeholder="Not logged"
        style={common.input}
        value={draft[field]}
        onChangeText={(text) => change({ [field]: text })}
        maxLength={8}
      />
    </View>
  );
  return (
    <View style={{ gap: 22 }}>
      <Button
        secondary
        label="Cancel sleep changes"
        onPress={() => {
          Keyboard.dismiss();
          cancel();
        }}
      />
      <View style={{ gap: 8 }}>
        <Text style={common.heading}>Sleep details</Text>
        <Text style={common.label}>
          Waking day · {formatDay(date, { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
        <Text style={common.body}>
          Record your main sleep on the day you wake up, including daytime sleep. These fields are
          optional and independent. Changes apply only when you choose Save sleep details.
        </Text>
      </View>
      <Button
        secondary
        label="Clear form fields"
        onPress={() => {
          setDraft(sleepToInput(emptySleep()));
          setError('');
        }}
      />
      <Text style={common.small}>
        Cleared fields stay unchanged in your journal until you save. Cancel leaves the saved record
        as it was.
      </Text>
      <View style={{ gap: 12 }}>
        <Text style={common.label}>Time asleep</Text>
        <Text style={common.small}>
          Your estimate of time asleep, excluding time awake. Use whole hours and minutes, up to 24
          hours in total. Entering either part treats the other blank part as 0; leave both blank
          for Not logged.
        </Text>
        <View style={common.wrap}>
          {input('hours', 'Sleep hours')}
          {input('minutes', 'Sleep minutes')}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Text style={common.label}>Sleep quality</Text>
        <Text style={common.small}>
          How that sleep felt to you. This does not set a symptom rating or calculate a sleep score.
        </Text>
        <View style={common.wrap}>
          {([null, ...SLEEP_QUALITIES] as const).map((quality) => {
            const label = quality === null ? 'Not logged' : SLEEP_QUALITY_LABELS[quality];
            return (
              <Chip
                key={label}
                label={label}
                accessibilityLabel={`Sleep quality: ${label}`}
                selected={draft.quality === quality}
                onPress={() => change({ quality })}
              />
            );
          })}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {input('wakings', 'Night wakings')}
        <Text style={common.small}>
          How many times you woke during that sleep, even if you slept in the daytime. Enter a whole
          number from 0 to 100. Zero means none; blank means Not logged.
        </Text>
      </View>
      <Text style={common.small}>
        Sleep disruption and other symptom labels remain separate. Sleep details are included in
        encrypted backups and journal CSV, and in doctor summaries when you select Sleep.
      </Text>
      {!!error && (
        <Text accessibilityRole="alert" style={common.error}>
          {error}
        </Text>
      )}
      <Button
        label="Save sleep details"
        onPress={() => {
          try {
            const next = sleepFromInput(draft);
            save(next);
            Keyboard.dismiss();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save sleep details.');
          }
        }}
      />
    </View>
  );
}
