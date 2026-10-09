import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  allowScreenCaptureAsync,
  enableAppSwitcherProtectionAsync,
  preventScreenCaptureAsync,
} from 'expo-screen-capture';
import { allowPreviewScreenshots } from './buildSettings';

// Configure capture before displaying native content. Preview builds allow testing screenshots;
// store builds keep protection on. The browser has no equivalent capture prevention API.
export function useScreenPrivacy() {
  const [ready, setReady] = useState(Platform.OS === 'web');
  const [error, setError] = useState(false);
  const working = useRef(false);
  const protect = async () => {
    if (Platform.OS === 'web' || working.current) return;
    working.current = true;
    setError(false);
    try {
      if (allowPreviewScreenshots) await allowScreenCaptureAsync('cycle-journal');
      else await preventScreenCaptureAsync('cycle-journal');
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
