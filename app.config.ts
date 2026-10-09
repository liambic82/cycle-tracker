import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const preview = process.env.APP_VARIANT === 'preview';
  return {
    ...config,
    name: preview ? 'Cycle Tracker Preview' : 'Cycle Tracker',
    slug: 'cycle-tracker',
    scheme: preview ? 'cycletracker-preview' : 'cycletracker',
    android: {
      ...config.android,
      package: preview ? 'com.liambic.cycletracker.preview' : 'com.liambic.cycletracker',
      versionCode: 3,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: preview ? 'com.liambic.cycletracker.preview' : 'com.liambic.cycletracker',
    },
  };
};
