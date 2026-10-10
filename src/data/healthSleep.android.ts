import { requireOptionalNativeModule } from 'expo';
import type { HealthSleepStatus } from './healthSleep';
export type { HealthSleepStatus } from './healthSleep';
interface NativeSleep {
  status(): Promise<HealthSleepStatus>;
  requestPermission(): Promise<boolean>;
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
  requestPermission: () => required().requestPermission(),
  readRecent: (days: 7 | 30) => required().readRecent(days),
  disconnect: () => required().disconnect(),
  openSettings: () => required().openSettings(),
  openPrivacy: () => required().openPrivacy(),
};
