import React, { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Text, View } from 'react-native';
import { toDay } from '../domain/dates';
import type { Journal } from '../domain/journal';
import { hasSleep } from '../domain/sleep';
import {
  applySleepImport,
  describeImportedSleep,
  existingSleepImport,
  overlappingSleepImports,
  parseSleepImport,
  sleepImportKey,
  sleepImportState,
  sleepWakingDay,
  type ImportedSleep,
} from '../domain/sleepImport';
import { healthSleep, type HealthSleepStatus } from '../data/healthSleep';
import { demoSleepImports } from '../data/sleepImportDemo';
import { Button, Chip } from './components';
import { useTheme } from './theme';

export function SleepImportSettings({
  journal,
  demo,
  update,
  close,
  onViewChange,
  saveStatus,
}: {
  journal: Journal;
  demo: boolean;
  update: (transform: (journal: Journal) => Journal) => void;
  close: () => void;
  onViewChange: () => void;
  saveStatus: React.ReactNode;
}) {
  const { common } = useTheme();
  const [status, setStatus] = useState<HealthSleepStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [days, setDays] = useState<7 | 30>(7);
  const [records, setRecords] = useState<ImportedSleep[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const clear = () => {
    setRecords([]);
    setSelected(null);
    setSource(null);
    setLimit(20);
  };
  async function run(action: (valid: () => boolean) => Promise<void>) {
    const token = ++epoch.current;
    const valid = () => mounted.current && token === epoch.current;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action(valid);
    } catch (err) {
      if (valid()) {
        clear();
        setError(
          err instanceof Error
            ? err.message
            : 'Could not read sleep. Check Health Connect and retry.',
        );
      }
    } finally {
      if (valid()) setBusy(false);
    }
  }
  async function refresh(valid: () => boolean) {
    const next = await healthSleep.status();
    if (valid()) setStatus(next);
  }
  useEffect(() => {
    mounted.current = true;
    if (!demo) void run(refresh);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        epoch.current++;
        clear();
        setBusy(false);
        setMessage('Unimported previews were cleared. Load sessions again when ready.');
      } else if (!demo) void run(refresh);
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => {
      mounted.current = false;
      epoch.current++;
      subscription.remove();
      back.remove();
    };
  }, []);
  const today = toDay(new Date());
  const incoming = records.find((x) => sleepImportKey(x) === selected);
  const old = incoming ? existingSleepImport(journal, incoming) : undefined;
  const candidate =
    incoming && old ? { ...incoming, fallbackOffset: old.fallbackOffset } : incoming;
  const waking = candidate ? sleepWakingDay(candidate) : null;
  const state = candidate ? sleepImportState(journal, candidate) : null;
  const sources = [...new Map(records.map((x) => [x.sourcePackage, x.sourceName])).entries()];
  const visible = records
    .filter((x) => x.sourcePackage === source)
    .sort((a, b) => b.end.localeCompare(a.end));
  const load = () =>
    void run(async (valid) => {
      clear();
      const raw = demo ? demoSleepImports(today) : await healthSleep.readRecent(days);
      if (!valid()) return;
      if (!Array.isArray(raw) || raw.length > 500)
        throw new Error('Too many sleep sessions. Choose 7 days and retry.');
      const parsed = raw.map(parseSleepImport);
      if (new Set(parsed.map(sleepImportKey)).size !== parsed.length)
        throw new Error(
          'The source returned duplicate record identifiers. Refresh before importing.',
        );
      setRecords(parsed);
      setMessage(
        parsed.length
          ? 'Choose the source that receives your Inspire 3 sleep, then review a session.'
          : 'No shared sleep sessions found. Sync your Inspire 3 in Fitbit/Google Health, allow that app to write Sleep to Health Connect, then retry.',
      );
    });
  return (
    <View style={{ gap: 20 }}>
      <Button
        secondary
        label={candidate ? 'Back to sleep sessions' : 'Back to Your data'}
        onPress={() => {
          if (candidate) {
            setSelected(null);
            onViewChange();
          } else close();
        }}
      />
      {saveStatus}
      {!candidate && (
        <>
          <Text style={common.heading}>Import wearable sleep</Text>
          <Text style={common.body}>
            Fitbit Inspire 3 → Fitbit / Google Health → Health Connect → this journal. First sync
            your tracker in its phone app and allow that app to share Sleep with Health Connect.
          </Text>
          <Text style={common.body}>
            Optional read-only access to sleep sessions and stages. We read only when you load
            sessions. Review before importing; copies stay encrypted on this device. Your manual
            sleep values are never replaced.
          </Text>
          <Text style={common.small}>
            Imports include source/device labels and times. No heart rate, cycle records, Fitbit
            password, write-back or background access is requested. Source apps have their own data
            practices. Backups include copies; CSV and a PDF with Sleep selected are readable
            exports.
          </Text>
          {demo ? (
            <Text style={common.label}>
              Fictional demonstration · no wearable connection or permission request
            </Text>
          ) : (
            <>
              <Text style={common.label}>
                {status === null
                  ? 'Checking Health Connect…'
                  : status === 'granted'
                    ? 'Sleep read permission granted'
                    : status === 'not-granted'
                      ? 'Sleep permission is off'
                      : status === 'update-required'
                        ? 'Install or update Health Connect'
                        : status === 'unavailable'
                          ? 'Health Connect is unavailable on this device'
                          : 'Connect from the installed Android app. Computer and iPhone imports are not available yet.'}
              </Text>
              <Text style={common.small}>
                On Android 14 or later, search phone Settings for Health Connect. On supported older
                Android phones, install or update Google’s Health Connect app. Existing imported
                copies can be viewed on a computer using an encrypted journal backup.
              </Text>
              {status === 'not-granted' && (
                <Button
                  label="Allow reading sleep"
                  busy={busy}
                  onPress={() =>
                    void run(async (valid) => {
                      await healthSleep.requestPermission();
                      if (valid()) await refresh(valid);
                    })
                  }
                />
              )}
              {status !== 'unsupported' && (
                <>
                  <Button
                    secondary
                    label="Check connection"
                    disabled={busy}
                    onPress={() => void run(refresh)}
                  />
                  <Button
                    secondary
                    label="Open Health Connect settings"
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        clear();
                        await healthSleep.openSettings();
                      })
                    }
                  />
                  <Button
                    secondary
                    label="Sleep privacy information"
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        await healthSleep.openPrivacy();
                      })
                    }
                  />
                </>
              )}
            </>
          )}
          {(demo || status === 'granted') && (
            <>
              <Text style={common.label}>Recent sessions</Text>
              <View style={common.wrap}>
                {([7, 30] as const).map((n) => (
                  <Chip
                    key={n}
                    label={`${n} days`}
                    selected={days === n}
                    disabled={busy}
                    onPress={() => {
                      setDays(n);
                      clear();
                    }}
                  />
                ))}
              </View>
              <Text style={common.small}>
                Up to the last {days} days, subject to what the source shares and Health Connect
                permits. Sync delays are possible. Missing records do not mean no sleep.
              </Text>
              <Button
                label={demo ? 'Load fictional sessions' : 'Load recent sleep sessions'}
                busy={busy}
                onPress={load}
              />
            </>
          )}
          {!!message && (
            <Text accessibilityLiveRegion="polite" style={common.body}>
              {message}
            </Text>
          )}
          {!!records.length && (
            <>
              <Text style={common.label}>Select a source · {records.length} sessions found</Text>
              <View style={common.wrap}>
                {sources.map(([id, name]) => (
                  <Chip
                    key={id}
                    label={name}
                    accessibilityLabel={`Sleep source ${name}, ${id}`}
                    selected={source === id}
                    onPress={() => {
                      setSource(id);
                      setSelected(null);
                      setLimit(20);
                    }}
                  />
                ))}
              </View>
              {source && (
                <Text style={common.small}>
                  {source} · Source names may differ from the tracker name. Verify the source in
                  Health Connect; importing from two apps can create overlapping copies.
                </Text>
              )}
              {visible.slice(0, limit).map((record) => (
                <Button
                  key={sleepImportKey(record)}
                  secondary
                  label={`Review sleep ending ${sleepWakingDay(record)} · ${record.end.slice(11, 16)} UTC · ${sleepImportState(journal, record)}`}
                  onPress={() => {
                    setSelected(sleepImportKey(record));
                    setMessage('');
                    setError('');
                    onViewChange();
                  }}
                />
              ))}
              {visible.length > limit && (
                <Button
                  secondary
                  label="Show more sleep sessions"
                  onPress={() => setLimit(limit + 20)}
                />
              )}
            </>
          )}
        </>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={common.error}>
          {error}
        </Text>
      )}
      {candidate && (
        <View style={[common.card, { gap: 14 }]}>
          <Text style={common.heading}>Review imported copy</Text>
          <Text style={common.label}>Waking day · {waking}</Text>
          {describeImportedSleep(candidate)
            .slice(0, -1)
            .map((line, i) => (
              <Text key={i} style={common.body}>
                {line}
              </Text>
            ))}
          <Text style={common.small}>
            These are source estimates. Quality and number of wakings remain user-entered. Sessions
            and naps stay separate; their durations are not added together.
          </Text>
          {waking &&
            hasSleep(
              journal.entries[waking]?.sleep ?? {
                durationMinutes: null,
                quality: null,
                wakings: null,
              },
            ) && (
              <Text style={common.label}>
                This day has manual sleep details. They will stay unchanged alongside this copy.
              </Text>
            )}
          {!!overlappingSleepImports(journal, candidate).length && (
            <Text style={common.label}>
              This overlaps another imported session. Check the sources before keeping both; they
              may describe the same sleep.
            </Text>
          )}
          {state === 'updated' && (
            <Text style={common.label}>
              The source changed this session. Importing will replace its previous imported copy,
              including moving it to the new waking day if needed. Manual details stay unchanged.
            </Text>
          )}
          {state === 'unchanged' || state === 'older' ? (
            <Text style={common.label}>
              {state === 'unchanged'
                ? 'Already imported · no duplicate will be added.'
                : 'A newer copy is already saved. Load recent sessions again.'}
            </Text>
          ) : (
            <Button
              label={state === 'updated' ? 'Update imported copy' : 'Import this session'}
              disabled={busy || waking! > today}
              onPress={() => {
                try {
                  update((current) => applySleepImport(current, candidate, today));
                  setMessage(
                    'Copy added to your journal. Check the save status before leaving. Manual sleep is unchanged.',
                  );
                  setSelected(null);
                  setError('');
                  onViewChange();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not import the session.');
                }
              }}
            />
          )}
          {waking! > today && (
            <Text style={common.error}>
              The source places this on a future waking date. Check the source times before
              importing.
            </Text>
          )}
          <Button
            secondary
            label="Cancel session review"
            onPress={() => {
              setSelected(null);
              onViewChange();
            }}
          />
        </View>
      )}
      <Text style={common.small}>
        A later source correction needs another review. Deleting a session in Fitbit or Health
        Connect does not erase this journal’s copy. Remove a copy under that waking day’s Review
        imported sleep; Undo is available there. Disconnect stops future reads but keeps imported
        copies.
      </Text>
      {!demo &&
        status === 'granted' &&
        (confirmDisconnect ? (
          <>
            <Text style={common.body}>
              Revoke Cycle Tracker’s sleep access? Existing imported copies remain in your journal
              and exports.
            </Text>
            <Button
              secondary
              label="Keep sleep connection"
              onPress={() => setConfirmDisconnect(false)}
            />
            <Button
              label="Disconnect sleep access"
              busy={busy}
              onPress={() =>
                void run(async (valid) => {
                  clear();
                  await healthSleep.disconnect();
                  if (valid()) {
                    setConfirmDisconnect(false);
                    await refresh(valid);
                    setMessage(
                      'Sleep access disconnected. Imported copies remain in your journal.',
                    );
                  }
                })
              }
            />
          </>
        ) : (
          <Button
            secondary
            label="Disconnect Health Connect"
            disabled={busy}
            onPress={() => setConfirmDisconnect(true)}
          />
        ))}
    </View>
  );
}
