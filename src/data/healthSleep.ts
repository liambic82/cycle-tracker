export type HealthSleepStatus =
  'unsupported' | 'unavailable' | 'update-required' | 'not-granted' | 'granted';
export const healthSleep = {
  status: async (): Promise<HealthSleepStatus> => 'unsupported',
  requestPermission: async () => false,
  readRecent: async (_days: 7 | 30): Promise<unknown[]> => {
    throw new Error('Sleep imports are available in the installed Android app.');
  },
  disconnect: async () => {},
  openSettings: async () => {},
  openPrivacy: async () => {},
};
