import React from 'react';
import { Text, View } from 'react-native';
import type { Journal } from '../domain/journal';
import type { AutoSleepState } from '../data/foregroundSleepImporter';
import { Button } from './components';
import { useTheme } from './theme';
export function AutomaticSleepSettings({
  journal,
  update,
  source,
  sourceName,
  available,
  busy,
  demo,
  autoSleep,
  checkSleep,
  review,
}: {
  journal: Journal;
  update: (transform: (journal: Journal) => Journal) => void;
  source: string | null;
  sourceName: string | null;
  available: boolean;
  busy: boolean;
  demo: boolean;
  autoSleep: AutoSleepState;
  checkSleep: () => Promise<void>;
  review: () => void;
}) {
  const { common } = useTheme();
  const auto = journal.preferences.sleepAutomation;
  return (
    <View style={{ gap: 10 }}>
      <Text style={common.label}>Import when I unlock · {auto.enabled ? 'On' : 'Off'}</Text>
      <Text style={common.body}>
        Save new nights from one source after unlock. Changed or overlapping nights need review.
        Manual sleep stays separate. Nothing runs while locked or in the background.
      </Text>
      {auto.enabled ? (
        <>
          <Text style={common.small}>Source: {auto.sourceName} · last 30 days</Text>
          <Button
            secondary
            label="Turn off automatic sleep import"
            onPress={() =>
              update((j) => ({
                ...j,
                preferences: {
                  ...j.preferences,
                  sleepAutomation: { ...j.preferences.sleepAutomation, enabled: false },
                },
              }))
            }
          />
          <Button
            label="Check sleep now"
            busy={autoSleep.state === 'checking'}
            disabled={busy || !available || demo}
            onPress={() => void checkSleep()}
          />
        </>
      ) : (
        <>
          {source && sourceName && available ? (
            <Button
              label={`Enable import on unlock from ${sourceName}`}
              disabled={busy}
              onPress={() =>
                update((j) => ({
                  ...j,
                  preferences: {
                    ...j.preferences,
                    sleepAutomation: {
                      ...j.preferences.sleepAutomation,
                      enabled: true,
                      source,
                      sourceName,
                      lastCheck: null,
                    },
                  },
                }))
              }
            />
          ) : (
            <Text style={common.small}>
              Connect sleep and load nights below to choose a source.
            </Text>
          )}
          {source && <Text style={common.small}>Chosen source: {sourceName}</Text>}
        </>
      )}
      {auto.lastCheck && (
        <Text style={common.small}>
          Last check: {new Date(auto.lastCheck.at).toLocaleString()} · {auto.lastCheck.added} added
          · {auto.lastCheck.review} to review
          {auto.lastCheck.sourceSeen ? '' : ' · source has no shared sessions in this window'}
        </Text>
      )}
      {!!autoSleep.message && (
        <Text
          accessibilityLiveRegion="polite"
          style={autoSleep.state === 'error' ? common.error : common.body}
        >
          {autoSleep.message}
        </Text>
      )}
      {!!auto.lastCheck?.review && (
        <Button
          secondary
          label="Load nights to review"
          disabled={busy || !available}
          onPress={review}
        />
      )}
      {demo && (
        <Text style={common.small}>Demo only: no automatic reads or phone permissions.</Text>
      )}
    </View>
  );
}
