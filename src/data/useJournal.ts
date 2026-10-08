import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomValues } from 'expo-crypto';
import { toDay } from '../domain/dates';
import { emptyJournal, type Journal } from '../domain/journal';
import { newKey, openVault, seal, type VaultKey } from '../domain/vault';
import { JournalWriter, STORAGE_KEY } from './repository';
import { demoJournal } from './demo';
import { acquireEditLease } from './lease';

// Unlike the development helper getRandomBytes, getRandomValues has no Math.random fallback.
const secureRandomBytes = (length: number) => getRandomValues(new Uint8Array(length));

export function useJournal() {
  const [journal, setJournal] = useState<Journal | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const [status, setStatus] = useState('Saved on this device');
  const [error, setError] = useState('');
  const [obscured, setObscured] = useState(false);
  const current = useRef<Journal | null>(null);
  const key = useRef<VaultKey | null>(null);
  const writer = useRef<JournalWriter | null>(null);
  const revision = useRef(0);
  const demoRef = useRef(false);
  const working = useRef(false);
  const releaseLease = useRef<(() => void) | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => setExists(value !== null))
      .catch(() => setError('Local storage could not be read. Reload the app to try again.'))
      .finally(() => setLoading(false));
    return () => {
      key.current?.key.fill(0);
      releaseLease.current?.();
    };
  }, []);

  const setCurrent = (value: Journal | null) => {
    current.current = value;
    setJournal(value);
  };

  const start = async (passphrase: string, create: boolean) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    let release: (() => void) | null = null;
    try {
      release = await acquireEditLease();
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      // Never replace an existing vault when a second tab created it during onboarding.
      if (create && raw !== null) {
        setExists(true);
        throw new Error('A journal already exists on this device. Unlock it to continue.');
      }
      if (!create && raw === null) throw new Error('No saved journal was found on this device.');
      const session = create
        ? {
            vault: await newKey(passphrase, secureRandomBytes),
            journal: emptyJournal(toDay(new Date())),
          }
        : await openVault(raw!, passphrase);
      const nextWriter = new JournalWriter(AsyncStorage, session.vault, secureRandomBytes);
      try {
        if (create) await nextWriter.save(session.journal);
      } catch (err) {
        session.vault.key.fill(0);
        throw err;
      }
      key.current = session.vault;
      writer.current = nextWriter;
      releaseLease.current = release;
      demoRef.current = false;
      setDemo(false);
      setExists(true);
      setCurrent(session.journal);
      setStatus('Saved on this device');
    } catch (err) {
      release?.();
      setError(err instanceof Error ? err.message : 'Unable to open your journal.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  const explore = () => {
    demoRef.current = true;
    setDemo(true);
    setError('');
    setCurrent(demoJournal(toDay(new Date())));
    setStatus('Demo changes stay in this session');
  };

  const update = (transform: (value: Journal) => Journal) => {
    if (!current.current || working.current) return;
    const next = transform(current.current);
    setCurrent(next);
    if (demoRef.current) return;
    const change = ++revision.current;
    setStatus('Saving…');
    setError('');
    try {
      writer
        .current!.save(next)
        .then(() => {
          if (revision.current === change) setStatus('Saved on this device');
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

  const lock = useCallback(async () => {
    if (!current.current || working.current) return;
    working.current = true;
    setBusy(true);
    try {
      if (!demoRef.current) await writer.current!.save(current.current);
      revision.current++;
      key.current?.key.fill(0);
      key.current = null;
      writer.current = null;
      releaseLease.current?.();
      releaseLease.current = null;
      current.current = null;
      setJournal(null);
      setDemo(false);
      demoRef.current = false;
      setError('');
    } catch {
      setError('Your latest changes could not be saved. Please retry before locking.');
      setStatus('Not saved');
    } finally {
      working.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let hiddenAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const visibility = (hidden: boolean) => {
      setObscured(hidden);
      if (hidden) {
        if (!hiddenAt) hiddenAt = Date.now();
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          void lock();
        }, 60000);
      } else {
        if (timer) clearTimeout(timer);
        if (hiddenAt && Date.now() - hiddenAt >= 60000) void lock();
        hiddenAt = 0;
      }
    };
    const subscription = AppState.addEventListener('change', (state) =>
      visibility(state !== 'active'),
    );
    const onVisibility = () => visibility(document.hidden);
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', onVisibility);
    return () => {
      subscription.remove();
      if (timer) clearTimeout(timer);
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [lock]);

  const backup = () => {
    if (!current.current || !key.current)
      throw new Error('Open your own journal to export a backup.');
    return seal(current.current, key.current, secureRandomBytes);
  };

  const restore = async (raw: string, passphrase: string) => {
    if (working.current) return;
    if (current.current) throw new Error('Lock your journal before restoring a backup.');
    working.current = true;
    setBusy(true);
    setError('');
    let restoredKey: VaultKey | null = null;
    let release: (() => void) | null = null;
    try {
      release = await acquireEditLease();
      const restored = await openVault(raw, passphrase);
      restoredKey = restored.vault;
      // Replacement is allowed only in the explicit restore-confirmation flow.
      await AsyncStorage.setItem(
        STORAGE_KEY,
        seal(restored.journal, restored.vault, secureRandomBytes),
      );
      setExists(true);
      key.current = restored.vault;
      releaseLease.current = release;
      writer.current = new JournalWriter(AsyncStorage, restored.vault, secureRandomBytes);
      setCurrent(restored.journal);
      setDemo(false);
      demoRef.current = false;
      setStatus('Backup restored');
    } catch (err) {
      restoredKey?.key.fill(0);
      release?.();
      setError(err instanceof Error ? err.message : 'Could not restore this backup.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  return {
    journal,
    exists,
    loading,
    busy,
    demo,
    status,
    error,
    obscured,
    start,
    explore,
    update,
    lock,
    backup,
    restore,
    retry: () => update((value) => value),
  };
}
