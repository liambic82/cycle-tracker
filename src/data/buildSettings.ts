import Constants from 'expo-constants';

// Opt in only through the preview build config. Missing flags keep capture protection on.
export const allowPreviewScreenshots =
  Constants.expoConfig?.extra?.allowPreviewScreenshots === true;
