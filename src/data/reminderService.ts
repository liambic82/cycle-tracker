import type { Journal } from '../domain/journal.ts';
import {
  planReminders,
  REMINDER_PREFIX,
  TEST_REMINDER_ID,
  type Reminder,
} from '../domain/reminders.ts';
import type { Storage } from './repository.ts';

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';
export type ReminderState = {
  enabled: string[];
  permission: ReminderPermission;
  count: number;
  refreshAt: number | null;
};
export interface ReminderBackend {
  available: boolean;
  permission(request: boolean): Promise<ReminderPermission>;
  list(): Promise<string[]>;
  schedule(reminder: Reminder): Promise<void>;
  cancel(id: string): Promise<void>;
  dismissObsolete(ids: string[]): Promise<void>;
  clear(): Promise<void>;
}
export const REMINDER_SETTINGS_KEY = 'cycle-tracker.reminder-opt-ins.v1';
type Settings = { vault: string; enabled: string[] };
export const emptyReminderState = (available: boolean): ReminderState => ({
  enabled: [],
  permission: available ? 'undetermined' : 'unavailable',
  count: 0,
  refreshAt: null,
});

// Serializes native work: a slow schedule can never run after an off/erase/restore operation.
// This object never retains a journal or a decryption key between operations.
export class ReminderService {
  private queue: Promise<unknown> = Promise.resolve();
  private storage: Storage;
  private backend: ReminderBackend;
  private now: () => Date;
  constructor(storage: Storage, backend: ReminderBackend, now = () => new Date()) {
    this.storage = storage;
    this.backend = backend;
    this.now = now;
  }
  private run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.catch(() => undefined).then(operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  private async settings(vault: string): Promise<Settings> {
    const raw = await this.storage.getItem(REMINDER_SETTINGS_KEY);
    if (raw) {
      try {
        const value = JSON.parse(raw);
        if (
          value.vault === vault &&
          Array.isArray(value.enabled) &&
          value.enabled.length <= 100 &&
          value.enabled.every(
            (id: unknown) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id),
          )
        ) {
          return { vault, enabled: [...new Set<string>(value.enabled)] };
        }
      } catch {
        /* Invalid or another vault's opt-ins are reset, never applied. */
      }
    }
    await this.backend.clear();
    const settings = { vault, enabled: [] };
    await this.storage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
    return settings;
  }
  private async apply(journal: Journal, settings: Settings, rearm = false): Promise<ReminderState> {
    const permission = await this.backend.permission(false);
    const plan =
      permission === 'granted'
        ? planReminders(journal, settings.enabled, this.now())
        : { notifications: [], count: 0, refreshAt: null };
    const desired = new Set(plan.notifications.map((reminder) => reminder.id));
    const pending = await this.backend.list();
    try {
      for (const id of pending) {
        if (id.startsWith(REMINDER_PREFIX) && !desired.has(id)) await this.backend.cancel(id);
        if (id === TEST_REMINDER_ID && permission !== 'granted') await this.backend.cancel(id);
      }
      for (const reminder of plan.notifications) {
        if (rearm || !pending.includes(reminder.id)) await this.backend.schedule(reminder);
      }
      await this.backend.dismissObsolete([...desired, TEST_REMINDER_ID]);
    } catch {
      // Never report a partial schedule as complete. Keep opt-ins for an explicit retry.
      await this.backend.clear();
      throw new Error('Reminders could not be refreshed. Please retry in Medications.');
    }
    return { enabled: settings.enabled, permission, count: plan.count, refreshAt: plan.refreshAt };
  }
  sync(vault: string, journal: Journal, rearm = false): Promise<ReminderState> {
    if (!this.backend.available) return Promise.resolve(emptyReminderState(false));
    return this.run(async () => this.apply(journal, await this.settings(vault), rearm));
  }
  setEnabled(
    vault: string,
    journal: Journal,
    medicationId: string,
    enabled: boolean,
  ): Promise<ReminderState> {
    return this.run(async () => {
      if (!this.backend.available)
        throw new Error('Reminders are available in the installed mobile app.');
      if (!journal.medications.some((medication) => medication.id === medicationId)) {
        throw new Error('This medication is no longer available.');
      }
      const settings = await this.settings(vault);
      if (enabled && (await this.backend.permission(true)) !== 'granted') {
        throw new Error(
          'Notifications are not allowed. Enable them in your phone’s app settings, then try again.',
        );
      }
      settings.enabled = settings.enabled.filter((id) => id !== medicationId);
      if (enabled) settings.enabled.push(medicationId);
      await this.storage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
      return this.apply(journal, settings);
    });
  }
  test(): Promise<void> {
    return this.run(async () => {
      if (!this.backend.available || (await this.backend.permission(true)) !== 'granted') {
        throw new Error(
          'Allow notifications in your phone’s app settings to send a test reminder.',
        );
      }
      await this.backend.cancel(TEST_REMINDER_ID);
      await this.backend.schedule({
        id: TEST_REMINDER_ID,
        at: this.now().getTime() + 60000,
        kind: 'test',
      });
    });
  }
  clear(): Promise<void> {
    return this.run(async () => {
      // Persist off before cancelling; a failed native cancellation remains retryable.
      await this.storage.removeItem(REMINDER_SETTINGS_KEY);
      await this.backend.clear();
    });
  }
}
