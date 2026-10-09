import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { enableAppSwitcherProtectionAsync, preventScreenCaptureAsync } from 'expo-screen-capture';

// Protect the entire native app, including passphrases and modal editors, before showing it.
// Keep protection for the app's lifetime. The browser has no equivalent capture prevention API.
export function useScreenPrivacy() {
  const [ready, setReady] = useState(Platform.OS === 'web');
  const [error, setError] = useState(false);
  const working = useRef(false);
  const protect = async () => {
    if (Platform.OS === 'web' || working.current) return;
    working.current = true;
    setError(false);
    try {
      await preventScreenCaptureAsync('cycle-journal');
      if (Platform.OS === 'ios') await enableAppSwitcherProtectionAsync(1);
      setReady(true);
    } catch {
      setError(true);
    } finally {
      working.current = false;
    }
  };
  useEffect(() => {
    void protect();
  }, []);
  return { ready, error, retry: protect };
}
