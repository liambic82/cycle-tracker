import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReminderService, type ReminderBackend } from './reminderService';

// No browser permission prompt, background worker, or server is needed for the journal.
export const reminderBackend: ReminderBackend = {
  available: false,
  permission: async () => 'unavailable',
  list: async () => [],
  schedule: async () => {},
  cancel: async () => {},
  dismissObsolete: async () => {},
  clear: async () => {},
};
export const reminders = new ReminderService(AsyncStorage, reminderBackend);
