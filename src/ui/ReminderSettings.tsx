import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import type { ReminderState } from '../data/reminderService';
import { Button, SectionLabel } from './components';
import { common } from './theme';

export type ReminderControls = {
  state: ReminderState;
  available: boolean;
  demo: boolean;
  busy: boolean;
  error: string;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  stop: () => Promise<void>;
  test: () => Promise<void>;
};

export function ReminderSettings({ reminders }: { reminders: ReminderControls }) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const action = async (run: () => Promise<void>, success = '') => {
    setMessage('');
    setFailed(false);
    try {
      await run();
      setMessage(success);
    } catch (err) {
      setFailed(true);
      setMessage(err instanceof Error ? err.message : 'Please try again.');
    }
  };
  const { state, available, demo, busy, error } = reminders;
  return (
    <View style={[common.card, { gap: 12 }]}>
      <SectionLabel icon={Bell}>Private reminders</SectionLabel>
      <Text style={common.body}>
        Choose reminders for each medication below. They follow its saved times, including weekday
        and on/off schedules. Recording a dose cancels its upcoming reminder.
      </Text>
      {!available ? (
        <Text style={common.body}>
          Reminders are available in the installed Android or iPhone app. You can still manage
          schedules and record doses here.
        </Text>
      ) : demo ? (
        <Text style={common.body}>
          Sample mode does not send notifications. Open your own journal to enable reminders on this
          phone.
        </Text>
      ) : (
        <>
          {!!error ? (
            <Text accessibilityRole="alert" style={common.error}>
              {error}
            </Text>
          ) : (
            <Text style={common.label}>
              {state.permission === 'denied'
                ? 'Notifications are blocked in your phone’s settings.'
                : state.enabled.length === 0
                  ? 'Medication reminders are off.'
                  : state.permission !== 'granted'
                    ? 'Notification permission is needed. Turn a reminder on to allow it.'
                    : `${state.count} upcoming reminder${state.count === 1 ? '' : 's'} queued on this phone.`}
            </Text>
          )}
          {!error && state.permission === 'granted' && state.refreshAt !== null && (
            <Text style={common.body}>
              Unlock before{' '}
              {new Date(state.refreshAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              to keep reminders going. We’ll send a refresh notice then.
            </Text>
          )}
          <Button
            secondary
            label={expanded ? 'Hide reminder settings' : 'Reminder settings and test'}
            onPress={() => setExpanded(!expanded)}
          />
          {expanded && (
            <>
              <Text style={common.small}>
                Notifications say “A moment for you” and “You have a reminder. Open your journal to
                review it.” Names, amounts, and notes stay out of notifications. Your phone may
                still show the app’s name.
              </Text>
              <Text style={common.small}>
                Reminders are queued for up to 30 days or 60 notification times and refresh when you
                unlock. If you travel or change your phone’s time zone, unlock to update local
                times. A skipped clock hour moves forward; a repeated hour rings once. Phone
                settings and battery saving can delay or silence alerts.
              </Text>
              <Button
                secondary
                disabled={busy}
                label="Send test reminder in 1 minute"
                onPress={() =>
                  void action(
                    reminders.test,
                    'Test queued for about one minute from now. You can lock the app or your phone to check delivery.',
                  )
                }
              />
              <Button
                secondary
                disabled={busy}
                label="Refresh reminders"
                onPress={() => void action(reminders.refresh)}
              />
              <Button
                secondary
                disabled={busy}
                label="Open phone notification settings"
                onPress={() => void action(() => Linking.openSettings())}
              />
              <Button
                secondary
                disabled={busy}
                label="Turn off all reminders"
                onPress={() => void action(reminders.stop)}
              />
              {!!message && (
                <Text
                  accessibilityRole={failed ? 'alert' : undefined}
                  style={failed ? common.error : common.body}
                >
                  {message}
                </Text>
              )}
              <Text style={common.small}>
                These choices apply only to this phone. Restoring a backup turns reminders off until
                you choose them again. As-needed plans do not send dose reminders.
              </Text>
            </>
          )}
        </>
      )}
    </View>
  );
}
