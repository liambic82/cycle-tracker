import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';
import { clearReportExportCache } from './src/data/reportExport';

// Remove any readable PDF left by a process termination during native sharing.
try {
  clearReportExportCache();
} catch {
  /* Export retries cleanup before creating a new copy. */
}

registerRootComponent(App);

if (Platform.OS === 'web' && !__DEV__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      console.warn('Offline app installation did not complete. Retry while connected.');
    });
  });
}
