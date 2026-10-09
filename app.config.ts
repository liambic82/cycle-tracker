import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const preview = process.env.APP_VARIANT === 'preview';
  return {
    ...config,
    name: preview ? 'Cycle Tracker Preview' : 'Cycle Tracker',
    slug: 'cycle-tracker',
    scheme: preview ? 'cycletracker-preview' : 'cycletracker',
    extra: { ...config.extra, allowPreviewScreenshots: preview },
    android: {
      ...config.android,
      package: preview ? 'com.liambic.cycletracker.preview' : 'com.liambic.cycletracker',
      versionCode: 10,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: preview ? 'com.liambic.cycletracker.preview' : 'com.liambic.cycletracker',
    },
  };
};
