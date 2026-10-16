import type { AutoSleepState } from '../data/foregroundSleepImporter';
import { AutomaticSleepSettings } from './AutomaticSleepSettings';
import { ActionRow } from './ActionRow';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Text, View } from 'react-native';
import { toDay, formatDay, type Day } from '../domain/dates';
import type { Journal } from '../domain/journal';
import { hasSleep } from '../domain/sleep';
import {
  applySleepImport,
  applySleepImports,
  sleepStageSummary,
  sleepLocalTime,
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
import { SleepHistory } from './SleepHistory';

const duration = (minutes: number) => {
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)} h ${rounded % 60} min`;
};
const friendlyDate = (day: Day) =>
  formatDay(day, { month: 'short', day: 'numeric', year: 'numeric' });
const savedCandidate = (journal: Journal, incoming: ImportedSleep) => {
  const old = existingSleepImport(journal, incoming);
  return old ? { ...incoming, fallbackOffset: old.fallbackOffset } : incoming;
};
function SleepSummary({ record }: { record: ImportedSleep }) {
  const { common } = useTheme();
  const summary = sleepStageSummary(record);
  return (
    <View style={{ gap: 6 }}>
      <Text style={common.label}>
        {friendlyDate(sleepWakingDay(record))} · {record.sourceName}
      </Text>
      <Text style={common.body}>
        {summary.complete ? 'Time asleep' : 'Recorded sleep stages'} ·{' '}
        {duration(summary.asleepMinutes)}
      </Text>
      {!summary.complete && (
        <Text style={common.small}>
          Some sleep stages are missing; total time asleep is unknown.
        </Text>
      )}
      <Text style={common.small}>
        {sleepLocalTime(record.start, record.startOffset ?? record.fallbackOffset)} →{' '}
        {sleepLocalTime(record.end, record.endOffset ?? record.fallbackOffset)}
      </Text>
    </View>
  );
}

export function SleepImportSettings({
  autoSleep,
  checkSleep,
  journal,
  demo,
  update,
  close,
  onViewChange,
  saveStatus,
  openDay,
}: {
  autoSleep: AutoSleepState;
  checkSleep: () => Promise<void>;
  journal: Journal;
  demo: boolean;
  update: (transform: (journal: Journal) => Journal) => void;
  close: () => void;
  onViewChange: () => void;
  saveStatus: React.ReactNode;
  openDay: (day: Day) => void;
}) {
  const { common } = useTheme();
  const [status, setStatus] = useState<HealthSleepStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [days, setDays] = useState<7 | 30 | 90 | 365>(7);
  const [historyStatus, setHistoryStatus] = useState<'unsupported' | 'not-granted' | 'granted'>(
    'unsupported',
  );
  const [records, setRecords] = useState<ImportedSleep[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [batchReview, setBatchReview] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const clear = () => {
    setRecords([]);
    setSelected(null);
    setSource(null);
    setLimit(20);
    setChosen([]);
    setBatchReview(false);
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
    const history = await healthSleep.historyStatus();
    if (valid()) {
      setStatus(next);
      setHistoryStatus(history);
      if (history !== 'granted') setDays((d) => (d > 30 ? 30 : d));
    }
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
  const batch = records
    .filter((x) => chosen.includes(sleepImportKey(x)))
    .map((x) => savedCandidate(journal, x))
    .sort((a, b) => b.end.localeCompare(a.end));
  const updatedCount = batch.filter((x) => sleepImportState(journal, x) === 'updated').length;
  const hasOverlaps = batch.some(
    (x) =>
      overlappingSleepImports(journal, x).length ||
      batch.some(
        (y) => sleepImportKey(x) !== sleepImportKey(y) && x.start < y.end && x.end > y.start,
      ),
  );
  const selectable = (record: ImportedSleep) =>
    ['new', 'updated'].includes(sleepImportState(journal, record)) &&
    sleepWakingDay(savedCandidate(journal, record)) <= today;
  const load = (window = days) =>
    void run(async (valid) => {
      clear();
      const raw = demo ? demoSleepImports(today) : await healthSleep.readRecent(window);
      if (!valid()) return;
      if (!Array.isArray(raw) || raw.length > 500)
        throw new Error('Too many sleep sessions. Choose 7 days and retry.');
      const parsed = raw.map(parseSleepImport);
      if (new Set(parsed.map(sleepImportKey)).size !== parsed.length)
        throw new Error(
          'The source returned duplicate record identifiers. Refresh before importing.',
        );
      setRecords(parsed);
      const packages = [...new Set(parsed.map((x) => x.sourcePackage))];
      if (packages.length === 1) setSource(packages[0]!);
      setMessage(
        parsed.length
          ? packages.length === 1
            ? 'Select the nights you want, then review and import them together.'
            : 'Choose your sleep source, then select nights to import together.'
          : 'No shared sleep sessions found. Sync your Inspire 3 in Fitbit/Google Health, allow that app to write Sleep to Health Connect, then retry.',
      );
    });
  return (
    <View style={{ gap: 20 }}>
      <Button
        secondary
        label={
          candidate || batchReview || historyOpen ? 'Back to sleep import' : 'Back to Your data'
        }
        onPress={() => {
          if (candidate || batchReview || historyOpen) {
            setSelected(null);
            setBatchReview(false);
            setHistoryOpen(false);
            onViewChange();
          } else close();
        }}
      />
      {saveStatus}
      {historyOpen && (
        <>
          <Text style={common.heading}>Saved sleep nights</Text>
          <SleepHistory journal={journal} today={today} openDay={openDay} />
        </>
      )}
      {!candidate && !batchReview && !historyOpen && (
        <>
          <Text style={common.heading}>Wearable sleep</Text>
          <AutomaticSleepSettings
            journal={journal}
            update={update}
            source={source}
            sourceName={sources.find(([id]) => id === source)?.[1] ?? null}
            available={demo || status === 'granted'}
            busy={busy}
            demo={demo}
            autoSleep={autoSleep}
            checkSleep={checkSleep}
            review={() => {
              setDays(30);
              load(30);
            }}
          />

          <Button
            secondary
            label="View saved sleep nights"
            onPress={() => {
              setHistoryOpen(true);
              onViewChange();
            }}
          />
          <ActionRow
            label="Connection steps & privacy"
            expanded={help}
            onPress={() => setHelp(!help)}
          />
          {help && (
            <View style={{ gap: 10 }}>
              <Text style={common.body}>
                Sync your Inspire 3 in Fitbit / Google Health. Allow it to share Sleep with Health
                Connect, then allow this app to read Sleep.
              </Text>
              <Text style={common.small}>
                We read sessions and stages when you load them, or after unlock if enabled. Copies
                stay encrypted on this device. No Fitbit password, heart rate, cycle records,
                write-back or background access. Source apps have their own data practices. Backups
                include copies; CSV and PDF exports with Sleep are readable.
              </Text>
            </View>
          )}
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
              <Text style={common.label}>Sleep sessions</Text>
              {!demo && historyStatus === 'not-granted' && (
                <>
                  <Text style={common.small}>
                    Optional: permit reading older sleep history to load 90 or 365 days. Sleep
                    remains the only record type we read. No background access is requested.
                  </Text>
                  <Button
                    secondary
                    label="Allow older sleep history"
                    disabled={busy}
                    onPress={() =>
                      void run(async (valid) => {
                        await healthSleep.requestPermission(true);
                        if (valid()) await refresh(valid);
                      })
                    }
                  />
                </>
              )}
              {!demo && historyStatus === 'unsupported' && (
                <Text style={common.small}>
                  Older-history access is unavailable on this phone. Recent sleep still works when
                  permitted.
                </Text>
              )}
              <View style={common.wrap}>
                {(
                  (demo || historyStatus === 'granted' ? [7, 30, 90, 365] : [7, 30]) as (
                    7 | 30 | 90 | 365
                  )[]
                ).map((n) => (
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
                onPress={() => load()}
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
              <Text style={common.label}>
                {sources.length === 1 ? 'Sleep source' : 'Choose a sleep source'} · {records.length}{' '}
                sessions found
              </Text>
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
                      setChosen([]);
                      setLimit(20);
                    }}
                  />
                ))}
              </View>
              {source && (
                <>
                  <Text style={common.small}>
                    {source} · Source names may differ from the tracker name. Verify the source in
                    Health Connect; importing from two apps can create overlapping copies.
                  </Text>
                  <View style={common.wrap}>
                    <Button
                      secondary
                      label="Select all new nights"
                      disabled={
                        !visible.some(
                          (x) => sleepImportState(journal, x) === 'new' && selectable(x),
                        )
                      }
                      onPress={() =>
                        setChosen(
                          visible
                            .filter((x) => sleepImportState(journal, x) === 'new' && selectable(x))
                            .map(sleepImportKey),
                        )
                      }
                    />
                    <Button
                      secondary
                      label="Clear selection"
                      disabled={!chosen.length}
                      onPress={() => setChosen([])}
                    />
                  </View>
                  <Text accessibilityLiveRegion="polite" style={common.label}>
                    {chosen.length} sleep sessions selected
                  </Text>
                  <Button
                    label={`Review ${chosen.length} selected sessions`}
                    disabled={!chosen.length}
                    onPress={() => {
                      setBatchReview(true);
                      setError('');
                      onViewChange();
                    }}
                  />
                </>
              )}
              {visible.slice(0, limit).map((record) => (
                <View key={sleepImportKey(record)} style={[common.card, { gap: 10 }]}>
                  <SleepSummary record={savedCandidate(journal, record)} />
                  <Chip
                    label={
                      sleepImportState(journal, record) === 'unchanged'
                        ? 'Already imported'
                        : sleepImportState(journal, record) === 'older'
                          ? 'Newer copy already saved'
                          : sleepWakingDay(savedCandidate(journal, record)) > today
                            ? 'Future waking date'
                            : sleepImportState(journal, record) === 'updated'
                              ? 'Select changed session'
                              : 'Select night'
                    }
                    accessibilityLabel={`Select sleep ending ${sleepLocalTime(record.end, record.endOffset ?? savedCandidate(journal, record).fallbackOffset)}`}
                    disabled={!selectable(record)}
                    selected={chosen.includes(sleepImportKey(record))}
                    onPress={() =>
                      setChosen((current) =>
                        current.includes(sleepImportKey(record))
                          ? current.filter((key) => key !== sleepImportKey(record))
                          : [...current, sleepImportKey(record)],
                      )
                    }
                  />
                  <Button
                    secondary
                    label={`View details · ${friendlyDate(sleepWakingDay(savedCandidate(journal, record)))}`}
                    onPress={() => {
                      setSelected(sleepImportKey(record));
                      setMessage('');
                      setError('');
                      onViewChange();
                    }}
                  />
                </View>
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
      {batchReview && (
        <View style={{ gap: 16 }}>
          <Text style={common.heading}>Import {batch.length} selected sleep sessions</Text>
          <Text style={common.body}>
            These copies will be added to the days you woke up. Manual sleep, symptoms and other
            journal details stay unchanged. Sleep sessions and naps stay separate; their durations
            are never added together.
          </Text>
          {updatedCount > 0 && (
            <Text style={common.label}>
              {updatedCount} changed session(s) will replace earlier imported copies, including
              moving to the source's corrected waking date if needed.
            </Text>
          )}
          {hasOverlaps && (
            <Text style={common.label}>
              Some sessions overlap each other or saved copies and may describe the same sleep. Go
              back to deselect unwanted duplicates, or keep them as separate records.
            </Text>
          )}
          {batch.map((record) => (
            <View key={sleepImportKey(record)} style={[common.card, { gap: 8 }]}>
              <SleepSummary record={record} />
              <Text style={common.small}>
                {sleepImportState(journal, record) === 'updated'
                  ? 'Updates an existing copy'
                  : 'New imported copy'}
              </Text>
            </View>
          ))}
          <Button
            label={`Import ${batch.length} selected sessions`}
            disabled={busy || !batch.length}
            onPress={() => {
              try {
                update((current) => applySleepImports(current, batch, today));
                setMessage(
                  `${batch.length} sleep sessions added to your journal. Check the save status, or choose View saved sleep nights to see them.`,
                );
                setChosen([]);
                setBatchReview(false);
                setError('');
                onViewChange();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Could not import. Nothing was added.',
                );
                onViewChange();
              }
            }}
          />
          <Button
            secondary
            label="Back to selection"
            onPress={() => {
              setBatchReview(false);
              setError('');
              onViewChange();
            }}
          />
        </View>
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
                  setChosen((keys) => keys.filter((key) => key !== sleepImportKey(candidate)));
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
                  update((j) => ({
                    ...j,
                    preferences: {
                      ...j.preferences,
                      sleepAutomation: {
                        ...j.preferences.sleepAutomation,
                        enabled: false,
                        lastCheck: null,
                      },
                    },
                  }));
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
