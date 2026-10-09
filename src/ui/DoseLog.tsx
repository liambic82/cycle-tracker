import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { ArrowLeft, Ellipsis, Undo2 } from 'lucide-react-native';
import { formatDay, type Day } from '../domain/dates';
import type { Journal } from '../domain/journal';
import {
  STATUS_LABELS,
  plannedDoses,
  type DoseRecord,
  type PlannedDose,
} from '../domain/medications';
import { editDose, recordDose, removeDose, restoreDose } from '../domain/medicationActions';
import { DoseForm } from './DoseForm';
import { Button } from './components';
import { useTheme } from './theme';

export function DoseLog({
  journal,
  date,
  today,
  update,
  done,
  manage,
  onViewChange,
  saveStatus,
}: {
  journal: Journal;
  date: Day;
  today: Day;
  update: (transform: (journal: Journal) => Journal) => void;
  done: () => void;
  manage: () => void;
  onViewChange: () => void;
  saveStatus: React.ReactNode;
}) {
  const { colors, common } = useTheme();
  const [form, setForm] = useState<{
    target: PlannedDose | null;
    existing: DoseRecord | null;
  } | null>(null);
  const [options, setOptions] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [removed, setRemoved] = useState<DoseRecord | null>(null);
  const [error, setError] = useState('');
  const records = journal.entries[date]?.doseRecords ?? [];
  const planned = plannedDoses(journal.medications, date);
  const remaining = planned.filter(
    (dose) =>
      dose.phase !== 'as-needed' &&
      !records.some(
        (record) =>
          record.medicationId === dose.medicationId && record.scheduledTime === dose.scheduledTime,
      ),
  );
  const prn = planned.filter((dose) => dose.phase === 'as-needed');
  const changeForm = (next: typeof form) => {
    setForm(next);
    setOptions(null);
    setConfirm(false);
    setError('');
    onViewChange();
  };
  if (form)
    return (
      <DoseForm
        date={date}
        today={today}
        target={form.target}
        existing={form.existing}
        cancel={() => changeForm(null)}
        save={(input) => {
          if (form.existing)
            update((value) => editDose(value, date, today, form.existing!.id, input));
          else {
            const id = randomUUID();
            update((value) => recordDose(value, date, today, form.target!, id, input));
          }
          changeForm(null);
        }}
      />
    );
  return (
    <View style={{ gap: 22 }}>
      <Button secondary label="Back to daily journal" icon={ArrowLeft} onPress={done} />
      <View style={{ gap: 6 }}>
        <Text style={common.heading}>Medications & supplements</Text>
        <Text style={common.label}>
          {formatDay(date, { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
        <Text style={common.body}>
          A record of your routine. Scheduled doses stay unrecorded until you log what happened.
        </Text>
      </View>
      <Button secondary label="Manage medications & schedules" onPress={manage} />
      {!planned.length && (
        <Text style={common.body}>
          No doses are scheduled for this date. This may be an off day, a paused schedule, or a date
          before your routine starts.
        </Text>
      )}
      {remaining.length > 0 && <Text style={common.label}>Scheduled · not recorded</Text>}
      {remaining.map((dose) => (
        <View
          key={`${dose.medicationId}-${dose.scheduledTime}`}
          style={{
            padding: 14,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 14,
            gap: 9,
          }}
        >
          <Text style={common.label}>{dose.plan.name}</Text>
          <Text style={common.body}>
            {dose.scheduledTime} · {dose.dose}
            {dose.phase === 'regular' ? '' : ` · ${dose.phase === 'on' ? 'On' : 'Off'} day`}
          </Text>
          {!!dose.plan.instructions && <Text style={common.small}>{dose.plan.instructions}</Text>}
          <Button
            secondary
            label={`Record ${dose.plan.name} at ${dose.scheduledTime}`}
            onPress={() => changeForm({ target: dose, existing: null })}
          />
        </View>
      ))}
      {prn.length > 0 && <Text style={common.label}>As needed</Text>}
      {prn.map((dose) => (
        <View key={dose.medicationId} style={{ gap: 8 }}>
          <Text style={common.body}>
            {dose.plan.name} · {dose.dose}
          </Text>
          <Button
            secondary
            label={`Log use of ${dose.plan.name}`}
            onPress={() => changeForm({ target: dose, existing: null })}
          />
        </View>
      ))}
      <View style={{ gap: 12, borderTopWidth: 1, borderColor: colors.line, paddingTop: 20 }}>
        <Text style={common.heading}>Recorded doses</Text>
        <Text style={common.small}>
          {records.length} {records.length === 1 ? 'record' : 'records'} for this day. Changes to
          schedules do not rewrite these records.
        </Text>
        {removed && (
          <View style={{ padding: 14, borderRadius: 12, backgroundColor: colors.sage, gap: 10 }}>
            <Text style={common.body}>
              Dose record removed. Undo lasts until you leave this section or remove another record.
            </Text>
            <Button
              secondary
              label="Undo dose removal"
              icon={Undo2}
              onPress={() => {
                try {
                  update((value) => restoreDose(value, date, removed));
                  setRemoved(null);
                  setError('');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not restore the record.');
                }
              }}
            />
          </View>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={common.error}>
            {error}
          </Text>
        )}
        {records.map((record, index) => (
          <View
            key={record.id}
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 14,
              gap: 10,
            }}
          >
            <View style={[common.between, { alignItems: 'flex-start' }]}>
              <Text style={[common.label, { flex: 1 }]}>{record.name}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dose record ${index + 1} options`}
                accessibilityState={{ expanded: options === record.id }}
                aria-expanded={options === record.id}
                onPress={() => {
                  setOptions(options === record.id ? null : record.id);
                  setConfirm(false);
                }}
                style={{
                  minWidth: 48,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.soft,
                  borderRadius: 12,
                }}
              >
                <Ellipsis size={20} color={colors.plum} />
              </Pressable>
            </View>
            <Text
              style={[
                common.label,
                { color: record.status === 'skipped' ? colors.muted : colors.sageInk },
              ]}
            >
              {STATUS_LABELS[record.status]}
            </Text>
            <Text style={common.small}>
              Planned: {record.plannedDose} · {record.scheduledTime ?? 'As needed'}
              {record.phase === 'on' || record.phase === 'off'
                ? ` · ${record.phase === 'on' ? 'On' : 'Off'} day`
                : ''}
            </Text>
            {record.status !== 'skipped' && (
              <View style={{ gap: 4 }}>
                <Text style={common.body}>Recorded amount: {record.actualDose}</Text>
                <Text style={common.small}>
                  Taken {record.takenOn} · {record.actualTime ?? 'Time not logged'}
                </Text>
              </View>
            )}
            {!!record.note && <Text style={common.body}>{record.note}</Text>}
            {options === record.id &&
              (confirm ? (
                <View style={{ gap: 10 }}>
                  <Text style={common.label}>Remove this dose record?</Text>
                  <Text style={common.body}>
                    The schedule remains. The dose returns to unrecorded. Other daily details stay
                    as they are.
                  </Text>
                  <Button
                    label="Keep dose record"
                    onPress={() => {
                      setConfirm(false);
                      setOptions(null);
                    }}
                  />
                  <Button
                    secondary
                    danger
                    label="Remove dose record"
                    onPress={() => {
                      update((value) => removeDose(value, date, record.id));
                      setRemoved({ ...record });
                      setConfirm(false);
                      setOptions(null);
                    }}
                  />
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Button
                    secondary
                    label="Edit dose record"
                    onPress={() => changeForm({ target: null, existing: record })}
                  />
                  <Button
                    secondary
                    danger
                    label="Remove this dose record"
                    onPress={() => setConfirm(true)}
                  />
                </View>
              ))}
          </View>
        ))}
      </View>
      {saveStatus}
    </View>
  );
}
