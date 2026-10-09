import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppearanceStore } from '../data/appearanceStore';
import { createTheme, ThemeContext } from './theme';

const StoreContext = createContext<AppearanceStore | null>(null);

export function useAppearance() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('AppearanceProvider is missing');
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return {
    ...snapshot,
    update: store.update,
    reset: store.reset,
    retry: store.retry,
    setDemo: store.setDemo,
  };
}

function AppearanceTheme({ children }: { children: React.ReactNode }) {
  const { settings } = useAppearance();
  const system = useColorScheme();
  const dark = settings.mode === 'dark' || (settings.mode === 'system' && system === 'dark');
  const theme = useMemo(() => createTheme(settings.palette, dark), [settings.palette, dark]);
  useEffect(() => {
    if (Platform.OS !== 'web')
      Appearance.setColorScheme(settings.mode === 'system' ? 'unspecified' : settings.mode);
  }, [settings.mode]);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    }
  }, [dark]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => new AppearanceStore(AsyncStorage));
  useEffect(() => {
    void store.load();
  }, [store]);
  return (
    <StoreContext.Provider value={store}>
      <AppearanceTheme>{children}</AppearanceTheme>
    </StoreContext.Provider>
  );
}
