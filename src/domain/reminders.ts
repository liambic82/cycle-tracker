import { addDays, fromDay, toDay } from './dates.ts';
import type { Journal } from './journal.ts';
import { plannedDoses } from './medications.ts';

// Leave room for a refresh notice and a user-requested test on both platforms.
export const REMINDER_LIMIT = 60;
export const REMINDER_DAYS = 30;
export const REMINDER_PREFIX = 'cycle-reminder-';
export const TEST_REMINDER_ID = 'cycle-test-reminder';
export type ReminderKind = 'dose' | 'refresh' | 'test';
export type Reminder = { id: string; at: number; kind: ReminderKind };
export type ReminderPlan = { notifications: Reminder[]; count: number; refreshAt: number | null };

export function reminderContent(kind: ReminderKind) {
  return {
    title: kind === 'refresh' ? 'Open your journal' : 'A moment for you',
    body:
      kind === 'refresh'
        ? 'Unlock your journal to refresh your reminders.'
        : kind === 'test'
          ? 'Your test reminder is here.'
          : 'You have a reminder. Open your journal to review it.',
  };
}

// Only generic timestamps leave the encrypted journal. Same-time doses share one alert.
export function planReminders(journal: Journal, enabled: string[], now: Date): ReminderPlan {
  const medications = journal.medications.filter((medication) => enabled.includes(medication.id));
  const today = toDay(now);
  const end = fromDay(addDays(today, REMINDER_DAYS));
  end.setHours(0, 0, 0, 0);
  const times = new Set<number>();
  // Generate one extra unique timestamp to know exactly where coverage stops.
  for (let offset = 0; offset < REMINDER_DAYS && times.size <= REMINDER_LIMIT; offset++) {
    const date = addDays(today, offset);
    const recorded = journal.entries[date]?.doseRecords ?? [];
    const dailyTimes = new Set<number>();
    for (const dose of plannedDoses(medications, date)) {
      if (!dose.scheduledTime) continue; // No invented schedule for as-needed medication.
      if (
        recorded.some(
          (record) =>
            record.medicationId === dose.medicationId &&
            record.scheduledTime === dose.scheduledTime,
        )
      )
        continue;
      const [hour, minute] = dose.scheduledTime.split(':').map(Number);
      const local = fromDay(date);
      // Local calendar times, not 24-hour increments. Spring gaps roll forward; fall overlaps fire once.
      local.setHours(hour!, minute!, 0, 0);
      if (local.getTime() > now.getTime()) dailyTimes.add(local.getTime());
    }
    for (const time of [...dailyTimes].sort((a, b) => a - b)) {
      times.add(time);
      if (times.size > REMINDER_LIMIT) break;
    }
  }
  const sorted = [...times].sort((a, b) => a - b);
  const notifications: Reminder[] = sorted.slice(0, REMINDER_LIMIT).map((at) => ({
    id: `${REMINDER_PREFIX}${at}`,
    at,
    kind: 'dose',
  }));
  // Paused / PRN-only plans need no refresh alert. A later scheduled start does.
  const hasScheduledPlan = medications.some((medication) =>
    medication.plans.some(
      (plan, index) =>
        plan.times.length > 0 && (medication.plans[index + 1]?.startsOn ?? '9999') > today,
    ),
  );
  const refreshAt = hasScheduledPlan
    ? Math.max(now.getTime() + 1000, (sorted[REMINDER_LIMIT] ?? end.getTime()) - 60000)
    : null;
  if (refreshAt !== null) {
    notifications.push({
      id: `${REMINDER_PREFIX}refresh-${refreshAt}`,
      at: refreshAt,
      kind: 'refresh',
    });
  }
  return { notifications, count: Math.min(sorted.length, REMINDER_LIMIT), refreshAt };
}
