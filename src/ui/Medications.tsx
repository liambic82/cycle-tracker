import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Plus } from 'lucide-react-native';
import { addDays, type Day } from '../domain/dates';
import type { Journal } from '../domain/journal';
import { describeSchedule, planOn, type Medication } from '../domain/medications';
import { saveMedicationPlan } from '../domain/medicationActions';
import { MedicationForm } from './MedicationForm';
import { Button } from './components';
import { common, colors } from './theme';
import { ReminderSettings, type ReminderControls } from './ReminderSettings';

export function Medications({
  journal,
  today,
  update,
  openToday,
  onViewChange,
  saveStatus,
  reminders,
}: {
  journal: Journal;
  today: Day;
  update: (transform: (journal: Journal) => Journal) => void;
  openToday: () => void;
  onViewChange: () => void;
  saveStatus: React.ReactNode;
  reminders: ReminderControls;
}) {
  const [form, setForm] = useState<Medication | 'new' | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const changeForm = (next: Medication | 'new' | null) => {
    setForm(next);
    onViewChange();
  };
  if (form) {
    const existing = form === 'new' ? null : form;
    const lastRecord = existing
      ? Object.keys(journal.entries)
          .filter((date) =>
            journal.entries[date]!.doseRecords.some((dose) => dose.medicationId === existing.id),
          )
          .sort()
          .at(-1)
      : undefined;
    const initialDate = existing
      ? [today, existing.plans.at(-1)!.startsOn, ...(lastRecord ? [addDays(lastRecord, 1)] : [])]
          .sort()
          .at(-1)!
      : today;
    return (
      <MedicationForm
        key={existing?.id ?? 'new'}
        existing={existing?.plans.at(-1) ?? null}
        initialDate={initialDate}
        cancel={() => changeForm(null)}
        save={(plan) => {
          const id = existing?.id ?? randomUUID();
          update((value) => saveMedicationPlan(value, id, plan, today));
          changeForm(null);
        }}
      />
    );
  }
  return (
    <View style={{ gap: 20, maxWidth: 850, width: '100%', alignSelf: 'center' }}>
      <View style={[common.card, { gap: 14, backgroundColor: colors.sage }]}>
        <Text style={common.heading}>Your routine, in one place.</Text>
        <Text style={common.body}>
          Keep medications and supplements with your journal. Plans do not count as taken doses.
          Record what happened in each day’s dose log.
        </Text>
        <Button label="Open today's journal" onPress={openToday} />
      </View>
      <ReminderSettings reminders={reminders} />
      <Button
        label="Add medication or supplement"
        icon={Plus}
        disabled={reminders.busy}
        onPress={() => changeForm('new')}
      />
      {!journal.medications.length && (
        <Text style={common.body}>
          Nothing added yet. Start with a name and the schedule you already use.
        </Text>
      )}
      {journal.medications.map((medication) => {
        const current = planOn(medication, today);
        const latest = medication.plans.at(-1)!;
        const display = current ?? latest;
        const upcoming = medication.plans.filter((plan) => plan.startsOn > today);
        return (
          <View key={medication.id} style={[common.card, { gap: 12 }]}>
            <Text style={common.heading}>{display.name}</Text>
            <Text style={common.label}>
              {display.kind === 'supplement' ? 'Supplement' : 'Medication'} · {display.dose}
            </Text>
            <Text style={common.body}>{describeSchedule(display)}</Text>
            <Text style={common.small}>
              {current ? 'Effective from' : 'Starts'} {display.startsOn}
            </Text>
            {!!display.instructions && <Text style={common.body}>{display.instructions}</Text>}
            {current &&
              upcoming.map((plan) => (
                <Text key={plan.id} style={common.small}>
                  From {plan.startsOn}: {plan.name} · {plan.dose} · {describeSchedule(plan)}
                </Text>
              ))}
            <View style={[common.row, { justifyContent: 'space-between' }]}>
              <Text style={[common.label, { flex: 1 }]}>Remind me at scheduled times</Text>
              <Switch
                accessibilityLabel={`Reminders for ${display.name}`}
                value={reminders.state.enabled.includes(medication.id)}
                disabled={!reminders.available || reminders.demo || reminders.busy}
                trackColor={{ false: colors.line, true: colors.plum }}
                onValueChange={(enabled) => void reminders.setEnabled(medication.id, enabled)}
              />
            </View>
            {(display.mode === 'as-needed' || display.mode === 'paused') && (
              <Text style={common.small}>
                No alerts while this plan is {display.mode === 'paused' ? 'paused' : 'as needed'}.
                Reminders can resume with a future scheduled plan.
              </Text>
            )}
            <Button
              secondary
              label={`Change schedule for ${display.name}`}
              disabled={reminders.busy}
              onPress={() => changeForm(medication)}
            />
            <Button
              secondary
              label={`${expanded === medication.id ? 'Hide' : 'Show'} schedule history for ${display.name}`}
              onPress={() => setExpanded(expanded === medication.id ? null : medication.id)}
            />
            {expanded === medication.id && (
              <View style={{ gap: 12 }}>
                {medication.plans.map((plan) => (
                  <View
                    key={plan.id}
                    style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 12, gap: 4 }}
                  >
                    <Text style={common.label}>
                      From {plan.startsOn} · {plan.name}
                    </Text>
                    <Text style={common.body}>
                      {plan.dose} · {describeSchedule(plan)}
                    </Text>
                    {!!plan.instructions && <Text style={common.small}>{plan.instructions}</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      {saveStatus}
    </View>
  );
}
