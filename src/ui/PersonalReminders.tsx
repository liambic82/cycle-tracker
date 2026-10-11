import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import {
  PERSONAL_REMINDER_KINDS,
  savePersonalReminder,
  reminderOccurs,
  type PersonalReminder,
} from '../domain/personalReminders';
import type { Journal } from '../domain/journal';
import type { Day } from '../domain/dates';
import type { ReminderControls } from './ReminderSettings';
import { Button, Chip } from './components';
import { useTheme } from './theme';
export function PersonalReminders({
  journal,
  today,
  update,
  reminders,
}: {
  journal: Journal;
  today: Day;
  update: (f: (j: Journal) => Journal) => void;
  reminders: ReminderControls;
}) {
  const { common, colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PersonalReminder | null>(null);
  const [interval, setInterval] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const run = (action: () => void) => {
    try {
      action();
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save reminder.');
    }
  };
  const field = (label: string, value: string, change: (v: string) => void, max: number) => (
    <View style={{ gap: 8 }}>
      <Text style={common.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={common.input}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={change}
        maxLength={max}
      />
    </View>
  );
  return (
    <View style={[common.card, { gap: 14 }]}>
      <Text style={common.heading}>Journal & care reminders</Text>
      <Text style={common.body}>
        Daily logging, patch/ring changes, injections, refills and appointments. You set the dates
        and intervals from your own plan. These reminders do not record a medication dose or
        recommend a schedule.
      </Text>
      <Button
        secondary
        label={open ? 'Hide care reminders' : 'Manage care reminders'}
        onPress={() => {
          setOpen(!open);
          setDraft(null);
          setError('');
        }}
      />
      {open && (
        <>
          {!!error && (
            <Text accessibilityRole="alert" style={common.error}>
              {error}
            </Text>
          )}
          {draft ? (
            <>
              <Button
                secondary
                label="Cancel care reminder changes"
                onPress={() => setDraft(null)}
              />
              <View style={common.wrap}>
                {PERSONAL_REMINDER_KINDS.map((kind) => (
                  <Chip
                    key={kind}
                    label={kind}
                    selected={draft.kind === kind}
                    onPress={() => setDraft({ ...draft, kind })}
                  />
                ))}
              </View>
              {field('Reminder title', draft.title, (title) => setDraft({ ...draft, title }), 100)}
              {field(
                'Reminder start date (YYYY-MM-DD)',
                draft.startsOn,
                (startsOn) => setDraft({ ...draft, startsOn }),
                10,
              )}
              {field(
                'Reminder end date · optional',
                draft.endsOn ?? '',
                (endsOn) => setDraft({ ...draft, endsOn: endsOn || null }),
                10,
              )}
              {field(
                'Reminder local time (HH:MM)',
                draft.time,
                (time) => setDraft({ ...draft, time }),
                5,
              )}
              {field('Repeat every N days · blank for once', interval, setInterval, 3)}
              <Text style={common.small}>
                Use 1 for daily. Changing dates or repeat interval clears this plan's
                completed-occurrence marks only when saved. Changing title/time retains them. A
                journal reminder stops for a date as soon as any daily entry exists.
              </Text>
              <Button
                label="Save care reminder plan"
                onPress={() =>
                  run(() => {
                    if (interval.trim() && !/^\d+$/.test(interval.trim()))
                      throw new Error('Enter a whole number of days or leave blank.');
                    const everyDays = interval.trim() ? Number(interval) : null;
                    const old = journal.personalReminders.find((x) => x.id === draft.id);
                    const completed =
                      old &&
                      (old.startsOn !== draft.startsOn ||
                        old.endsOn !== draft.endsOn ||
                        old.everyDays !== everyDays)
                        ? []
                        : draft.completed;
                    update((j) => savePersonalReminder(j, { ...draft, everyDays, completed }));
                    setDraft(null);
                  })
                }
              />
            </>
          ) : (
            <>
              <Button
                label="Add care reminder"
                onPress={() => {
                  setDraft({
                    id: `personal-${randomUUID()}`,
                    kind: 'journal',
                    title: 'Daily journal',
                    startsOn: today,
                    endsOn: null,
                    time: '20:00',
                    everyDays: 1,
                    paused: false,
                    completed: [],
                  });
                  setInterval('1');
                  setError('');
                }}
              />
              <Text style={common.small}>
                Saving a plan does not enable notifications. Enable each one on this phone. Plans
                travel in encrypted backups; permission and enabled choices do not. Discreet text
                and the shared 30-day / 60-time queue apply to all reminders.
              </Text>
              {journal.personalReminders.map((plan) => (
                <View
                  key={plan.id}
                  style={{ gap: 10, borderTopWidth: 1, borderColor: colors.line, paddingTop: 12 }}
                >
                  <Text style={common.label}>
                    {plan.title} · {plan.kind}
                  </Text>
                  <Text style={common.body}>
                    {plan.startsOn}
                    {plan.endsOn ? ` through ${plan.endsOn}` : ''} · {plan.time} ·{' '}
                    {plan.everyDays === null ? 'once' : `every ${plan.everyDays} day(s)`}
                    {plan.paused ? ' · paused' : ''}
                  </Text>
                  <Button
                    secondary
                    label={`Edit reminder: ${plan.title}`}
                    disabled={reminders.busy}
                    onPress={() => {
                      setDraft({ ...plan, completed: [...plan.completed] });
                      setInterval(plan.everyDays === null ? '' : String(plan.everyDays));
                    }}
                  />
                  <Button
                    secondary
                    label={`${plan.paused ? 'Resume' : 'Pause'} reminder: ${plan.title}`}
                    disabled={reminders.busy}
                    onPress={() =>
                      run(() =>
                        update((j) => savePersonalReminder(j, { ...plan, paused: !plan.paused })),
                      )
                    }
                  />
                  {!reminders.demo && reminders.available && (
                    <Button
                      secondary
                      disabled={reminders.busy}
                      label={`${reminders.state.enabled.includes(plan.id) ? 'Turn off' : 'Enable'} phone alerts: ${plan.title}`}
                      onPress={() => {
                        setError('');
                        void reminders
                          .setEnabled(plan.id, !reminders.state.enabled.includes(plan.id))
                          .catch((e) =>
                            setError(e instanceof Error ? e.message : 'Could not change alerts.'),
                          );
                      }}
                    />
                  )}
                  {reminderOccurs(plan, today) && (
                    <Button
                      secondary
                      label={`Mark today's reminder done: ${plan.title}`}
                      onPress={() =>
                        run(() =>
                          update((j) =>
                            savePersonalReminder(j, {
                              ...plan,
                              completed: [...plan.completed, today],
                            }),
                          ),
                        )
                      }
                    />
                  )}
                  {plan.completed.includes(today) && (
                    <Button
                      secondary
                      label={`Undo today's completion: ${plan.title}`}
                      onPress={() =>
                        run(() =>
                          update((j) =>
                            savePersonalReminder(j, {
                              ...plan,
                              completed: plan.completed.filter((x) => x !== today),
                            }),
                          ),
                        )
                      }
                    />
                  )}
                  {confirm === plan.id ? (
                    <>
                      <Text style={common.body}>
                        Delete this reminder plan and cancel its future alerts? Medication doses are
                        unchanged.
                      </Text>
                      <Button
                        secondary
                        label="Keep reminder plan"
                        onPress={() => setConfirm(null)}
                      />
                      <Button
                        danger
                        label="Delete reminder plan"
                        onPress={() => {
                          update((j) => ({
                            ...j,
                            personalReminders: j.personalReminders.filter((x) => x.id !== plan.id),
                          }));
                          setConfirm(null);
                        }}
                      />
                    </>
                  ) : (
                    <Button
                      secondary
                      label={`Delete options for reminder: ${plan.title}`}
                      onPress={() => setConfirm(plan.id)}
                    />
                  )}
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}
