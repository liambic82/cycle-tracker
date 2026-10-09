import React, { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { validDay, type Day } from '../domain/dates';
import { validTime } from '../domain/flowDetails';
import {
  STATUS_LABELS,
  type DoseInput,
  type DoseRecord,
  type PlannedDose,
} from '../domain/medications';
import { MedicationField } from './MedicationForm';
import { Button, Chip } from './components';
import { useTheme } from './theme';

export function DoseForm({
  date,
  today,
  target,
  existing,
  save,
  cancel,
}: {
  date: Day;
  today: Day;
  target: PlannedDose | null;
  existing: DoseRecord | null;
  save: (input: DoseInput) => void;
  cancel: () => void;
}) {
  const { common } = useTheme();
  const plannedDose = existing?.plannedDose ?? target!.dose;
  const name = existing?.name ?? target!.plan.name;
  const asNeeded = (existing?.phase ?? target!.phase) === 'as-needed';
  const scheduledTime = existing?.scheduledTime ?? target?.scheduledTime;
  const [status, setStatus] = useState<DoseRecord['status'] | null>(existing?.status ?? null);
  const [actualDose, setActualDose] = useState(existing?.actualDose || plannedDose);
  const [takenOn, setTakenOn] = useState(existing?.takenOn ?? date);
  const [time, setTime] = useState(existing?.actualTime ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState('');
  const submit = () => {
    try {
      if (!status) throw new Error('Choose what happened before saving.');
      if (
        status !== 'skipped' &&
        (!actualDose.trim() ||
          !validDay(takenOn) ||
          takenOn > today ||
          (!!time && !validTime(time)))
      )
        throw new Error(
          'Enter the amount taken, a date no later than today (YYYY-MM-DD), and an optional 24-hour time (HH:MM).',
        );
      save({
        status,
        actualDose: status === 'skipped' ? '' : actualDose.trim(),
        takenOn: status === 'skipped' ? null : takenOn,
        actualTime: status === 'skipped' ? null : time || null,
        note: note.trim(),
      });
      Keyboard.dismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this dose record.');
    }
  };
  return (
    <View style={{ gap: 22 }}>
      <Button
        secondary
        label="Cancel dose changes"
        icon={ArrowLeft}
        onPress={() => {
          Keyboard.dismiss();
          cancel();
        }}
      />
      <View style={{ gap: 6 }}>
        <Text style={common.heading}>{existing ? 'Edit dose record' : 'Record a dose'}</Text>
        <Text style={common.label}>{name}</Text>
        <Text style={common.body}>
          {date} · {scheduledTime ? `Scheduled ${scheduledTime}` : 'As needed'}
        </Text>
        <Text style={common.body}>Planned dose: {plannedDose}</Text>
        {!!target?.plan.instructions && (
          <Text style={common.small}>{target.plan.instructions}</Text>
        )}
      </View>
      <View style={{ gap: 10 }}>
        <Text style={common.label}>What happened?</Text>
        <View style={common.wrap}>
          {(['taken', 'skipped', 'late'] as const)
            .filter((value) => !asNeeded || value === 'taken')
            .map((value) => (
              <Chip
                key={value}
                label={STATUS_LABELS[value]}
                selected={status === value}
                onPress={() => setStatus(value)}
              />
            ))}
        </View>
        <Text style={common.small}>
          Choose the status yourself. An unrecorded dose is not counted as skipped or taken.
        </Text>
      </View>
      {status !== 'skipped' && (
        <>
          <MedicationField
            label="Amount taken"
            value={actualDose}
            change={setActualDose}
            hint="Starts with your planned dose label. Change it if the recorded amount was different."
          />
          <MedicationField
            label="Date taken (YYYY-MM-DD)"
            value={takenOn}
            change={setTakenOn}
            maxLength={10}
            hint="This record stays with the scheduled journal day, even if you took it on a different date."
          />
          <MedicationField
            label="Time taken (optional HH:MM)"
            value={time}
            change={setTime}
            maxLength={5}
            hint="Leave blank if you did not record the time. No current time is filled in automatically."
          />
        </>
      )}
      <MedicationField
        label="Dose note or reason (optional)"
        value={note}
        change={setNote}
        multiline
        maxLength={500}
        hint="For example, your reason for as-needed use or something you noticed. Included in readable exports."
      />
      {!!error && (
        <Text accessibilityRole="alert" style={common.error}>
          {error}
        </Text>
      )}
      <Text style={common.small}>Nothing changes until you save this record.</Text>
      <Button
        label={existing ? 'Save dose changes' : 'Save dose record'}
        icon={Check}
        onPress={submit}
      />
    </View>
  );
}
