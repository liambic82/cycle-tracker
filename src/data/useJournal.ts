import { checkJournalSize } from '../domain/sleepImport';
import { rememberRemovedSleep, resetRestoredAutomation } from '../domain/journalPreferences';
import { healthSleep } from './healthSleep';
import { ForegroundSleepImporter, type AutoSleepState } from './foregroundSleepImporter';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { journalStorage, replaceJournal, prepareJournalStorage } from './journalStorage';
import { getRandomValues } from 'expo-crypto';
import { toDay, type Day } from '../domain/dates';
import { deleteEntry, undoEntryDeletion, type DeletedEntry } from '../domain/deletion';
import { emptyJournal, type Journal } from '../domain/journal';
import { newKey, openVault, parseEnvelope, seal, type VaultKey } from '../domain/vault';
import { JournalWriter, STORAGE_KEY } from './repository';
import { JournalRecovery, JournalRecoveryRequired } from './journalRecovery';
import { demoJournal } from './demo';
import { acquireEditLease } from './lease';
import { biometrics } from './biometrics';
import { derivePassphraseKey } from './passphraseKey';
import { reminders, reminderBackend } from './reminders';
import { emptyReminderState } from './reminderService';
import { PersonalBackgroundStore, type PhotoControls } from './personalBackgroundStore';

// Unlike the development helper getRandomBytes, getRandomValues has no Math.random fallback.
const secureRandomBytes = (length: number) => getRandomValues(new Uint8Array(length));

export function useJournal() {
  const [photos] = useState(() => new PersonalBackgroundStore(AsyncStorage, secureRandomBytes));
  const [recovery] = useState(
    () =>
      new JournalRecovery(
        AsyncStorage,
        () => journalStorage.getItem(STORAGE_KEY),
        async () => {
          await reminders.clear();
          await biometrics.clear();
          await photos.clearPersistent();
        },
      ),
  );
  const [recoveryError, setRecoveryError] = useState('');
  const photoSnapshot = useSyncExternalStore(
    photos.subscribe,
    photos.getSnapshot,
    photos.getSnapshot,
  );
  const [journal, setJournal] = useState<Journal | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authProgress, setAuthProgress] = useState('');
  const [demo, setDemo] = useState(false);
  const [status, setStatus] = useState('Saved on this device');
  const [error, setError] = useState('');
  const [obscured, setObscured] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(() => biometrics.available());
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [reminderState, setReminderState] = useState(() =>
    emptyReminderState(reminderBackend.available),
  );
  const [reminderError, setReminderError] = useState('');
  const [deleted, setDeleted] = useState<DeletedEntry | null>(null);
  const deletedRef = useRef<DeletedEntry | null>(null);
  const current = useRef<Journal | null>(null);
  const key = useRef<VaultKey | null>(null);
  const writer = useRef<JournalWriter | null>(null);
  const revision = useRef(0);
  const savedRevision = useRef(-1);
  const demoRef = useRef(false);
  const working = useRef(false);
  const backgroundEpoch = useRef(0);
  const lockPending = useRef(false);
  const releaseLease = useRef<(() => void) | null>(null);
  const [autoSleep, setAutoSleep] = useState<AutoSleepState>({ state: 'idle', message: '' });
  const foreground = useRef(true);
  const autoRequested = useRef<string | null>(null);
  const [sleepImporter] = useState(
    () =>
      new ForegroundSleepImporter({
        current: () => current.current,
        active: () =>
          foreground.current &&
          !!current.current &&
          !demoRef.current &&
          !working.current &&
          !lockPending.current,
        status: () => healthSleep.status(),
        read: () => healthSleep.readRecent(30),
        now: () => new Date(),
        report: setAutoSleep,
        save: async (next) => {
          const change = ++revision.current;
          setCurrent(next);
          setStatus('Saving…');
          setError('');
          try {
            await writer.current!.save(next);
            if (revision.current === change && current.current && key.current) {
              savedRevision.current = change;
              setStatus('Saved on this device');
              await syncReminders(next, key.current.salt, change);
            }
          } catch {
            if (revision.current === change) {
              setStatus('Not saved');
              setError(
                'Sleep import could not be saved. Keep the app open and retry saving or export a backup.',
              );
            }
            throw new Error(
              'Sleep import could not be saved. Retry saving your journal before checking again.',
            );
          }
        },
      }),
  );
  useEffect(() => {
    if (!journal || !journal.preferences.sleepAutomation.enabled) autoRequested.current = null;
    else if (!busy && autoRequested.current !== journal.preferences.sleepAutomation.source) {
      autoRequested.current = journal.preferences.sleepAutomation.source;
      void sleepImporter.check();
    }
  }, [
    !!journal,
    busy,
    journal?.preferences.sleepAutomation.enabled,
    journal?.preferences.sleepAutomation.source,
  ]);

  useEffect(() => {
    recoverIfPending()
      .then(() => journalStorage.getItem(STORAGE_KEY))
      .then(async (value) => {
        setExists(value !== null);
        let salt: string | null = null;
        try {
          if (value) salt = parseEnvelope(value).salt;
        } catch {
          /* Passphrase/restore reports a damaged vault. */
        }
        await refreshBiometrics(salt);
      })
      .catch((err) => {
        if (err instanceof JournalRecoveryRequired) {
          setRecoveryError(err.message);
          return;
        }
        // A read error is not proof of an empty device. Offer unlock/restore, not setup.
        setExists(true);
        setError(
          'Local storage could not be read. Unlock to retry, or restore an encrypted backup.',
        );
      })
      .finally(() => setLoading(false));
    return () => {
      sleepImporter.cancel();
      photos.close();
      key.current?.key.fill(0);
      releaseLease.current?.();
    };
  }, []);

  async function recoverIfPending() {
    if (!(await recovery.pending())) return;
    let release: (() => void) | null = null;
    try {
      release = await acquireEditLease();
      await prepareJournalStorage();
      await recovery.resume();
    } catch (err) {
      if (err instanceof JournalRecoveryRequired) throw err;
      throw new JournalRecoveryRequired();
    } finally {
      release?.();
    }
  }

  async function retryRecovery() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      await recoverIfPending();
      const raw = await journalStorage.getItem(STORAGE_KEY);
      setExists(raw !== null);
      let salt: string | null = null;
      try {
        if (raw) salt = parseEnvelope(raw).salt;
      } catch {
        /* Unlock reports corruption. */
      }
      await refreshBiometrics(salt);
      setRecoveryError('');
      setError('');
    } catch (err) {
      setRecoveryError(
        err instanceof JournalRecoveryRequired
          ? err.message
          : 'Recovery could not finish. Close any other Trifelle tabs, then retry.',
      );
    } finally {
      finishWork();
    }
  }

  const setCurrent = (value: Journal | null) => {
    current.current = value;
    setJournal(value);
  };

  async function syncReminders(
    value: Journal,
    salt: string,
    change = revision.current,
    rearm = false,
  ) {
    try {
      const result = await reminders.sync(salt, value, rearm);
      if (current.current && revision.current === change && !demoRef.current) {
        setReminderState(result);
        setReminderError('');
      }
    } catch {
      if (current.current && revision.current === change && !demoRef.current) {
        setReminderError(
          'Reminders could not be verified. Open Medications to retry or turn them off.',
        );
      }
    }
  }

  async function refreshReminders(rearm = true) {
    if (!current.current || !key.current || demoRef.current || working.current) return;
    const change = revision.current;
    try {
      await writer.current!.flush();
      if (
        current.current &&
        key.current &&
        revision.current === change &&
        savedRevision.current === change &&
        !working.current
      ) {
        await syncReminders(current.current, key.current.salt, change, rearm);
      }
    } catch {
      /* Failed saves already have a visible retry/backup message. */
    }
  }

  async function setMedicationReminder(id: string, enabled: boolean) {
    if (!current.current || !key.current || demoRef.current || working.current) return;
    working.current = true;
    setBusy(true);
    setReminderError('');
    let saved = false;
    try {
      // Persist the schedule before giving the OS any reminder for it.
      await writer.current!.save(current.current);
      saved = true;
      savedRevision.current = revision.current;
      setReminderState(await reminders.setEnabled(key.current.salt, current.current, id, enabled));
    } catch (err) {
      if (saved) await syncReminders(current.current, key.current.salt);
      else {
        setStatus('Not saved');
        setError(
          'Your latest changes could not be saved. Please retry saving before changing medication reminders.',
        );
      }
      setReminderError(
        !saved
          ? 'Save your journal first, or use Turn off all reminders to cancel alerts.'
          : err instanceof Error
            ? err.message
            : 'Reminders could not be changed. Please retry.',
      );
    } finally {
      finishWork();
    }
  }

  async function stopReminders() {
    if (demoRef.current || working.current) return;
    working.current = true;
    setBusy(true);
    try {
      await reminders.clear();
      setReminderState(emptyReminderState(reminderBackend.available));
      setReminderError('');
    } catch {
      setReminderError(
        'Some reminders could not be cancelled. Retry turning them off, or disable notifications in your phone’s settings.',
      );
    } finally {
      finishWork();
    }
  }

  async function testReminder() {
    if (demoRef.current || working.current) return;
    working.current = true;
    setBusy(true);
    try {
      await reminders.test();
    } finally {
      finishWork();
    }
  }

  async function refreshBiometrics(salt: string | null) {
    setBiometricAvailable(biometrics.available());
    try {
      setBiometricEnabled(await biometrics.enabled(salt));
    } catch {
      setBiometricEnabled(false);
    } // Optional metadata must not block passphrase access.
  }

  function finishWork() {
    working.current = false;
    setBusy(false);
    setAuthProgress('');
    if (lockPending.current) {
      lockPending.current = false;
      void lock();
    }
  }

  const rememberDeletion = (value: DeletedEntry | null) => {
    deletedRef.current = value;
    setDeleted(value);
  };

  const endSession = useCallback(() => {
    sleepImporter.cancel();
    photos.close();
    revision.current++;
    key.current?.key.fill(0);
    key.current = null;
    writer.current = null;
    releaseLease.current?.();
    releaseLease.current = null;
    current.current = null;
    setJournal(null);
    deletedRef.current = null;
    setDeleted(null);
    demoRef.current = false;
    setDemo(false);
    setError('');
    setReminderState(emptyReminderState(reminderBackend.available));
    setReminderError('');
  }, []);

  const start = async (passphrase: string | null, create: boolean) => {
    if (working.current || current.current || recoveryError) return;
    working.current = true;
    setBusy(true);
    setError('');
    setAuthProgress('Checking this device…');
    let release: (() => void) | null = null;
    let openedKey: VaultKey | null = null;
    let salt: string | null = null;
    const openingEpoch = backgroundEpoch.current;
    try {
      release = await acquireEditLease();
      await prepareJournalStorage();
      await recovery.resume();
      const raw = await journalStorage.getItem(STORAGE_KEY);
      // Never replace an existing vault when a second tab created it during onboarding.
      if (create && raw !== null) {
        setExists(true);
        throw new Error('A journal already exists on this device. Unlock it to continue.');
      }
      if (!create && raw === null) {
        setExists(false);
        throw new Error('No saved journal was found. Create a new journal or restore a backup.');
      }
      if (raw) salt = parseEnvelope(raw).salt;
      if (create) {
        setAuthProgress('Preparing your private journal…');
        await photos.clearPersistent();
        await reminders.clear();
        await biometrics.clear();
        setBiometricEnabled(false);
      }
      setAuthProgress(
        passphrase === null ? 'Waiting for biometric unlock…' : 'Securing your journal…',
      );
      const session = create
        ? {
            vault: await newKey(passphrase!, secureRandomBytes, derivePassphraseKey),
            journal: emptyJournal(toDay(new Date())),
          }
        : passphrase === null
          ? await biometrics.unlock(raw!)
          : await openVault(raw!, passphrase, derivePassphraseKey);
      openedKey = session.vault;
      salt = session.vault.salt;
      const nextWriter = new JournalWriter(journalStorage, session.vault, secureRandomBytes);
      if (create) {
        setAuthProgress('Saving your encrypted journal…');
        await nextWriter.save(session.journal);
      }
      setExists(true);
      await photos.open(session.vault);
      if (openingEpoch !== backgroundEpoch.current || lockPending.current) {
        throw new Error('The app moved to the background. Unlock your journal again to continue.');
      }
      key.current = session.vault;
      openedKey = null;
      writer.current = nextWriter;
      releaseLease.current = release;
      demoRef.current = false;
      setDemo(false);
      setExists(true);
      setCurrent(session.journal);
      savedRevision.current = revision.current;
      setStatus('Saved on this device');
      await syncReminders(session.journal, session.vault.salt, revision.current, true);
    } catch (err) {
      photos.close();
      openedKey?.key.fill(0);
      release?.();
      if (err instanceof JournalRecoveryRequired) setRecoveryError(err.message);
      else setError(err instanceof Error ? err.message : 'Unable to open your journal.');
    } finally {
      setAuthProgress('Finishing up…');
      await refreshBiometrics(salt);
      finishWork();
    }
  };

  const setBiometricUnlock = async (enabled: boolean) => {
    if (!current.current || !key.current || demoRef.current || working.current) return;
    working.current = true;
    setBusy(true);
    try {
      if (enabled) await biometrics.enable(key.current);
      else await biometrics.clear();
    } catch (err) {
      throw new Error(
        enabled && err instanceof Error
          ? err.message
          : 'Biometric access could not be removed. Please try again.',
      );
    } finally {
      await refreshBiometrics(key.current?.salt ?? null);
      finishWork();
    }
  };

  const explore = () => {
    if (working.current || current.current || recoveryError) return;
    photos.openDemo();
    demoRef.current = true;
    setDemo(true);
    setError('');
    setCurrent(demoJournal(toDay(new Date())));
    setStatus('Demo changes stay in this session');
  };

  const update = (transform: (value: Journal) => Journal) => {
    if (!current.current || working.current) return;
    const next = checkJournalSize(
      rememberRemovedSleep(current.current, transform(current.current)),
    );
    if (
      next.preferences.sleepAutomation.enabled !==
        current.current.preferences.sleepAutomation.enabled ||
      next.preferences.sleepAutomation.source !== current.current.preferences.sleepAutomation.source
    )
      sleepImporter.cancel(true);
    if (deletedRef.current && next.entries[deletedRef.current.date]) rememberDeletion(null);
    setCurrent(next);
    if (demoRef.current) return;
    const change = ++revision.current;
    setStatus('Saving…');
    setError('');
    try {
      writer
        .current!.save(next)
        .then(async () => {
          if (revision.current === change && current.current && key.current) {
            savedRevision.current = change;
            setStatus('Saved on this device');
            await syncReminders(next, key.current.salt, change);
          }
        })
        .catch(() => {
          if (revision.current === change) {
            setStatus('Not saved');
            setError(
              'This device could not save your latest changes. Keep the app open, then retry or export a backup.',
            );
          }
        });
    } catch (err) {
      setStatus('Not saved');
      setError(err instanceof Error ? err.message : 'Your changes could not be saved.');
    }
  };

  const removeEntry = (date: Day) => {
    if (!current.current || working.current) return;
    const result = deleteEntry(current.current, date);
    if (!result) return;
    rememberDeletion(result.deleted);
    update(() => result.journal);
  };

  const undoDelete = () => {
    const removed = deletedRef.current;
    if (!removed || working.current || !current.current) return;
    update((value) => undoEntryDeletion(value, removed));
    rememberDeletion(null);
  };

  const erase = async (confirmation: string) => {
    if (confirmation !== 'DELETE') throw new Error('Type DELETE to confirm.');
    if (!current.current || demoRef.current || working.current) return;
    working.current = true;
    revision.current++;
    setBusy(true);
    setError('');
    try {
      await recovery.change(null, () => writer.current!.erase());
      setBiometricEnabled(false);
      endSession();
      setExists(false);
    } catch (err) {
      if (err instanceof JournalRecoveryRequired) {
        endSession();
        setRecoveryError(err.message);
        return;
      }
      // Retain the open journal and Undo on failure so retry or backup remains possible.
      setStatus('Not saved');
      throw new Error('Your journal could not be deleted. It is still open. Please try again.');
    } finally {
      finishWork();
    }
  };

  const lock = useCallback(async () => {
    sleepImporter.cancel();
    if (working.current) {
      lockPending.current = true;
      return;
    }
    if (!current.current) return;
    working.current = true;
    setBusy(true);
    try {
      if (!demoRef.current) {
        await writer.current!.save(current.current);
        await syncReminders(current.current, key.current!.salt);
      }
      endSession();
    } catch {
      setError('Your latest changes could not be saved. Please retry before locking.');
      setStatus('Not saved');
    } finally {
      finishWork();
    }
  }, [endSession]);

  useEffect(() => {
    let hiddenAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const visibility = (hidden: boolean) => {
      foreground.current = !hidden;
      if (hidden) sleepImporter.cancel();
      setObscured(hidden);
      if (hidden) {
        if (!hiddenAt) hiddenAt = Date.now();
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          void lock();
        }, 60000);
      } else {
        setBiometricAvailable(biometrics.available());
        if (timer) clearTimeout(timer);
        if (hiddenAt && Date.now() - hiddenAt >= 60000) void lock();
        hiddenAt = 0;
        void refreshReminders();
      }
    };
    // Refresh while actively using the unlocked journal, including a local time-zone change.
    const reminderTimer = setInterval(() => {
      if (AppState.currentState === 'active') void refreshReminders(false);
    }, 60000);
    const subscription = AppState.addEventListener('change', (state) => {
      // iOS's biometric prompt is briefly inactive; only a real background transition cancels opening.
      if (state === 'background') backgroundEpoch.current++;
      visibility(state !== 'active');
    });
    const onVisibility = () => {
      if (document.hidden) backgroundEpoch.current++;
      visibility(document.hidden);
    };
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', onVisibility);
    return () => {
      subscription.remove();
      clearInterval(reminderTimer);
      if (timer) clearTimeout(timer);
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [lock]);

  const backup = () => {
    if (!current.current || !key.current)
      throw new Error('Open your own journal to export a backup.');
    return seal(current.current, key.current, secureRandomBytes);
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const protectUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (!current.current || demoRef.current || revision.current === savedRevision.current) return;
      // The browser supplies the wording. This cannot protect against an OS kill;
      // it only warns about closing/reloading while a save is pending or failed.
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectUnsavedChanges);
    return () => window.removeEventListener('beforeunload', protectUnsavedChanges);
  }, []);

  const restore = async (raw: string, passphrase: string) => {
    if (working.current) return;
    if (current.current) throw new Error('Lock your journal before restoring a backup.');
    working.current = true;
    setBusy(true);
    setError('');
    setAuthProgress('Opening your encrypted backup…');
    let restoredKey: VaultKey | null = null;
    let release: (() => void) | null = null;
    const openingEpoch = backgroundEpoch.current;
    try {
      release = await acquireEditLease();
      const restored = await openVault(raw, passphrase, derivePassphraseKey);
      restored.journal = resetRestoredAutomation(restored.journal);
      restoredKey = restored.vault;
      setAuthProgress('Saving your restored journal…');
      // Commit first; a durable intent makes convenience cleanup resumable.
      const encrypted = seal(restored.journal, restored.vault, secureRandomBytes);
      await recovery.change(encrypted, () => replaceJournal(encrypted));
      setRecoveryError('');
      setReminderState(emptyReminderState(reminderBackend.available));
      setBiometricEnabled(false);
      setExists(true);
      await photos.open(restored.vault);
      if (openingEpoch !== backgroundEpoch.current || lockPending.current) {
        throw new Error('Backup restored. Unlock your journal again to continue.');
      }
      key.current = restored.vault;
      releaseLease.current = release;
      writer.current = new JournalWriter(journalStorage, restored.vault, secureRandomBytes);
      setCurrent(restored.journal);
      savedRevision.current = revision.current;
      setDemo(false);
      demoRef.current = false;
      setStatus('Backup restored');
      await syncReminders(restored.journal, restored.vault.salt);
    } catch (err) {
      photos.close();
      restoredKey?.key.fill(0);
      release?.();
      if (err instanceof JournalRecoveryRequired) setRecoveryError(err.message);
      else setError(err instanceof Error ? err.message : 'Could not restore this backup.');
    } finally {
      finishWork();
    }
  };

  return {
    autoSleep,
    checkSleep: () => sleepImporter.check(true),
    photo: { ...photoSnapshot, apply: photos.apply, remove: photos.remove } satisfies PhotoControls,
    journal,
    exists,
    loading,
    recoveryError,
    retryRecovery,
    busy,
    authProgress,
    demo,
    status,
    error,
    obscured,
    biometricAvailable,
    biometricEnabled,
    setBiometricUnlock,
    reminderState,
    reminderError,
    remindersAvailable: reminderBackend.available,
    setMedicationReminder,
    refreshReminders,
    stopReminders,
    testReminder,
    unlockBiometric: () => start(null, false),
    deleted,
    removeEntry,
    undoDelete,
    dismissUndo: () => rememberDeletion(null),
    erase,
    start,
    explore,
    update,
    lock,
    backup,
    restore,
    retry: () => update((value) => value),
  };
}
