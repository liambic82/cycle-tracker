export type HealthSleepStatus =
  'unsupported' | 'unavailable' | 'update-required' | 'not-granted' | 'granted';
export const healthSleep = {
  status: async (): Promise<HealthSleepStatus> => 'unsupported',
  historyStatus: async (): Promise<'unsupported' | 'not-granted' | 'granted'> => 'unsupported',
  requestPermission: async (_history = false) => false,
  readRecent: async (_days: 7 | 30 | 90 | 365): Promise<unknown[]> => {
    throw new Error('Sleep imports are available in the installed Android app.');
  },
  disconnect: async () => {},
  openSettings: async () => {},
  openPrivacy: async () => {},
};
