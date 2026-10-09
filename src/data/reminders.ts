import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { reminderContent, REMINDER_PREFIX, TEST_REMINDER_ID } from '../domain/reminders';
import { ReminderService, type ReminderBackend } from './reminderService';

const CHANNEL = 'private-reminders';
const owned = (id: string) => id.startsWith(REMINDER_PREFIX) || id === TEST_REMINDER_ID;
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const reminderBackend: ReminderBackend = {
  available: true,
  async permission(request) {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Private reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      });
    }
    let status = await Notifications.getPermissionsAsync();
    if (request && !status.granted && status.canAskAgain) {
      status = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
    }
    if (Platform.OS === 'android') {
      const channel = await Notifications.getNotificationChannelAsync(CHANNEL);
      if (channel?.importance === Notifications.AndroidImportance.NONE) return 'denied';
    }
    if (status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)
      return 'granted';
    return status.status === 'undetermined' ? 'undetermined' : 'denied';
  },
  async list() {
    return (await Notifications.getAllScheduledNotificationsAsync()).map(
      (request) => request.identifier,
    );
  },
  async schedule(reminder) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { ...reminderContent(reminder.kind), sound: 'default', data: {} },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminder.at),
        channelId: CHANNEL,
      },
    });
  },
  cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  async dismissObsolete(ids) {
    for (const notification of await Notifications.getPresentedNotificationsAsync()) {
      const id = notification.request.identifier;
      if (owned(id) && !ids.includes(id)) await Notifications.dismissNotificationAsync(id);
    }
  },
  async clear() {
    for (const request of await Notifications.getAllScheduledNotificationsAsync()) {
      if (owned(request.identifier))
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
    await reminderBackend.dismissObsolete([]);
  },
};
export const reminders = new ReminderService(AsyncStorage, reminderBackend);
