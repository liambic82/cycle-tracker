import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const preview = process.env.APP_VARIANT === 'preview';
  return {
    ...config,
    name: preview ? 'Trifelle Preview' : 'Trifelle',
    slug: 'cycle-tracker',
    scheme: preview ? 'cycletracker-preview' : 'cycletracker',
    extra: { ...config.extra, allowPreviewScreenshots: preview },
    android: {
      ...config.android,
      package: preview ? 'com.liambic.cycletracker.preview' : 'com.liambic.cycletracker',
      versionCode: 28,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: preview ? 'com.liambic.cycletracker.preview' : 'com.liambic.cycletracker',
      buildNumber: '28',
    },
  };
};
