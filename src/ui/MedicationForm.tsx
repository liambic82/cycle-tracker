import React, { useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { ArrowLeft, Check } from 'lucide-react-native';
import { validDay, type Day } from '../domain/dates';
import { validTime } from '../domain/flowDetails';
import {
  MODE_LABELS,
  WEEKDAYS,
  parsePlan,
  SCHEDULE_MODES,
  type MedicationPlan,
} from '../domain/medications';
import { Button, Chip } from './components';
import { common } from './theme';

export function MedicationField({
  label,
  value,
  change,
  hint,
  multiline = false,
  maxLength = 100,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  hint?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={common.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={change}
        style={[common.input, multiline && { minHeight: 86, textAlignVertical: 'top' }]}
        multiline={multiline}
        maxLength={maxLength}
        autoCorrect={false}
      />
      {!!hint && <Text style={common.small}>{hint}</Text>}
    </View>
  );
}
export function MedicationForm({
  existing,
  initialDate,
  save,
  cancel,
}: {
  existing: MedicationPlan | null;
  initialDate: Day;
  save: (plan: MedicationPlan) => void;
  cancel: () => void;
}) {
  const [id] = useState(randomUUID);
  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<MedicationPlan['kind']>(existing?.kind ?? 'medication');
  const [dose, setDose] = useState(existing?.dose ?? '');
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  const [startsOn, setStartsOn] = useState(initialDate);
  const [mode, setMode] = useState<MedicationPlan['mode']>(existing?.mode ?? 'daily');
  const [times, setTimes] = useState(existing?.times.join(', ') ?? '');
  const [weekdays, setWeekdays] = useState(existing?.weekdays ?? []);
  const [onDays, setOnDays] = useState(existing?.onDays?.toString() ?? '');
  const [offDays, setOffDays] = useState(existing?.offDays?.toString() ?? '');
  const [offDose, setOffDose] = useState(existing?.offDose ?? '');
  const [error, setError] = useState('');
  const submit = () => {
    try {
      if (!name.trim() || !dose.trim())
        throw new Error('Enter a name and the dose label from your own schedule.');
      if (!validDay(startsOn)) throw new Error('Enter a real date in YYYY-MM-DD format.');
      const scheduled = mode !== 'paused' && mode !== 'as-needed';
      const parsedTimes = times.trim() ? times.trim().split(/[,\s]+/) : [];
      if (
        scheduled &&
        (!parsedTimes.length ||
          parsedTimes.length > 8 ||
          !parsedTimes.every(validTime) ||
          new Set(parsedTimes).size !== parsedTimes.length)
      )
        throw new Error('Enter 1–8 different times in 24-hour HH:MM format, separated by commas.');
      if (mode === 'weekdays' && !weekdays.length) throw new Error('Choose at least one weekday.');
      if (
        mode === 'cycle' &&
        ![onDays, offDays].every(
          (value) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 366,
        )
      )
        throw new Error('Enter whole numbers from 1 to 366 for both on days and off days.');
      save(
        parsePlan({
          id,
          name: name.trim(),
          kind,
          dose: dose.trim(),
          instructions: instructions.trim(),
          startsOn,
          mode,
          times: scheduled ? parsedTimes : [],
          weekdays: mode === 'weekdays' ? weekdays : [],
          onDays: mode === 'cycle' ? Number(onDays) : null,
          offDays: mode === 'cycle' ? Number(offDays) : null,
          offDose: mode === 'cycle' ? offDose.trim() || null : null,
        }),
      );
      Keyboard.dismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this schedule.');
    }
  };
  return (
    <View style={[common.card, { gap: 22, maxWidth: 720, width: '100%', alignSelf: 'center' }]}>
      <Button
        secondary
        label="Cancel schedule changes"
        icon={ArrowLeft}
        onPress={() => {
          Keyboard.dismiss();
          cancel();
        }}
      />
      <Text style={common.heading}>{existing ? 'Change a schedule' : 'Add to your routine'}</Text>
      <Text style={common.body}>
        Enter the schedule you already use. Doses are recorded as you enter them; the app does not
        calculate dose changes.
      </Text>
      <MedicationField label="Name" value={name} change={setName} maxLength={80} />
      <View style={common.wrap}>
        {(['medication', 'supplement'] as const).map((value) => (
          <Chip
            key={value}
            label={value === 'medication' ? 'Medication' : 'Supplement'}
            selected={kind === value}
            onPress={() => setKind(value)}
          />
        ))}
      </View>
      <MedicationField
        label="Dose label"
        value={dose}
        change={setDose}
        hint="Include the amount and unit or form exactly as you want to record it."
      />
      <MedicationField
        label="Effective from (YYYY-MM-DD)"
        value={startsOn}
        change={setStartsOn}
        maxLength={10}
        hint={
          existing
            ? 'Earlier schedule history is kept. Choose a date after any recorded doses. You can correct an individual dose in its daily log.'
            : 'You can start in the past to record an existing routine.'
        }
      />
      <View style={{ gap: 10 }}>
        <Text style={common.label}>Schedule</Text>
        <View style={common.wrap}>
          {SCHEDULE_MODES.filter((value) => !!existing || value !== 'paused').map((value) => (
            <Chip
              key={value}
              label={MODE_LABELS[value]}
              selected={mode === value}
              onPress={() => setMode(value)}
            />
          ))}
        </View>
      </View>
      {mode === 'weekdays' && (
        <View style={common.wrap}>
          {WEEKDAYS.map((label, index) => (
            <Chip
              key={label}
              label={label}
              accessibilityLabel={`Schedule on ${label}`}
              selected={weekdays.includes(index)}
              onPress={() =>
                setWeekdays((current) =>
                  current.includes(index)
                    ? current.filter((day) => day !== index)
                    : [...current, index],
                )
              }
            />
          ))}
        </View>
      )}
      {mode === 'cycle' && (
        <View style={{ gap: 16 }}>
          <MedicationField label="On days" value={onDays} change={setOnDays} maxLength={3} />
          <MedicationField label="Off days" value={offDays} change={setOffDays} maxLength={3} />
          <MedicationField
            label="Off-day dose label (optional)"
            value={offDose}
            change={setOffDose}
            hint="Leave blank for no scheduled dose on off days. For a pack with placebo tablets, enter your own placebo dose label here."
          />
          <Text style={common.small}>
            The repeating cycle begins with on days on the effective date. A changed cycle starts
            again from its new effective date.
          </Text>
        </View>
      )}
      {mode !== 'paused' && mode !== 'as-needed' && (
        <MedicationField
          label="Times (24-hour HH:MM)"
          value={times}
          change={setTimes}
          maxLength={70}
          hint="Separate multiple times with commas, for example 08:00, 20:00. Times follow the local calendar; this preview does not send reminders."
        />
      )}
      {mode === 'as-needed' && (
        <Text style={common.small}>
          No scheduled dose or missed-dose status is created. Log each use separately in the daily
          journal.
        </Text>
      )}
      {mode === 'paused' && (
        <Text style={common.small}>
          No doses will be scheduled from this date. Earlier plans and dose records remain. Add
          another dated change to resume the schedule.
        </Text>
      )}
      <MedicationField
        label="Schedule notes (optional)"
        value={instructions}
        change={setInstructions}
        multiline
        maxLength={500}
        hint="Your own instructions or context. These are included in encrypted backups and schedule exports."
      />
      {!!error && (
        <Text accessibilityRole="alert" style={common.error}>
          {error}
        </Text>
      )}
      <Text style={common.small}>These changes are a draft until you save.</Text>
      <Button label="Save schedule" icon={Check} onPress={submit} />
    </View>
  );
}
