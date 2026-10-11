import { requireOptionalNativeModule } from 'expo';
import type { HealthSleepStatus } from './healthSleep';
export type { HealthSleepStatus } from './healthSleep';
interface NativeSleep {
  status(): Promise<HealthSleepStatus>;
  historyStatus(): Promise<'unsupported' | 'not-granted' | 'granted'>;
  requestPermission(history: boolean): Promise<boolean>;
  readRecent(days: number): Promise<unknown[]>;
  disconnect(): Promise<void>;
  openSettings(): Promise<void>;
  openPrivacy(): Promise<void>;
}
const native = requireOptionalNativeModule<NativeSleep>('CycleHealthConnect');
const required = () => {
  if (!native) throw new Error('Install the current Android preview to connect sleep data.');
  return native;
};
export const healthSleep = {
  status: async (): Promise<HealthSleepStatus> => (native ? native.status() : 'unsupported'),
  historyStatus: async () => (native ? native.historyStatus() : ('unsupported' as const)),
  requestPermission: (history = false) => required().requestPermission(history),
  readRecent: (days: 7 | 30 | 90 | 365) => required().readRecent(days),
  disconnect: () => required().disconnect(),
  openSettings: () => required().openSettings(),
  openPrivacy: () => required().openPrivacy(),
};
