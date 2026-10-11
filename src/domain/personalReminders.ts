import { daysBetween, validDay, type Day } from './dates.ts';
import type { Journal } from './journal.ts';
export const PERSONAL_REMINDER_KINDS = [
  'journal',
  'patch',
  'ring',
  'injection',
  'refill',
  'appointment',
  'custom',
] as const;
export type PersonalReminder = {
  id: string;
  kind: (typeof PERSONAL_REMINDER_KINDS)[number];
  title: string;
  startsOn: Day;
  endsOn: Day | null;
  time: string;
  everyDays: number | null;
  paused: boolean;
  completed: Day[];
};
export function parsePersonalReminder(v: unknown): PersonalReminder {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid reminder.');
  const x = v as Record<string, unknown>;
  if (
    typeof x.id !== 'string' ||
    !/^personal-[A-Za-z0-9_-]{1,60}$/.test(x.id) ||
    !(PERSONAL_REMINDER_KINDS as readonly unknown[]).includes(x.kind) ||
    typeof x.title !== 'string' ||
    !x.title.trim() ||
    x.title.length > 100 ||
    /[\u0000-\u001f]/.test(x.title) ||
    !validDay(x.startsOn) ||
    !(x.endsOn === null || (validDay(x.endsOn) && x.endsOn >= x.startsOn)) ||
    typeof x.time !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time) ||
    !(
      x.everyDays === null ||
      (typeof x.everyDays === 'number' &&
        Number.isInteger(x.everyDays) &&
        x.everyDays >= 1 &&
        x.everyDays <= 366)
    ) ||
    typeof x.paused !== 'boolean' ||
    !Array.isArray(x.completed) ||
    x.completed.length > 1000 ||
    x.completed.some((d) => !validDay(d))
  )
    throw new Error('Check the reminder title, dates, time and repeat interval (1–366 days).');
  const result = {
    id: x.id,
    kind: x.kind as PersonalReminder['kind'],
    title: x.title.trim(),
    startsOn: x.startsOn,
    endsOn: x.endsOn as Day | null,
    time: x.time,
    everyDays: x.everyDays as number | null,
    paused: x.paused,
    completed: [...new Set(x.completed as Day[])],
  };
  if (
    result.completed.some(
      (day) => !reminderOccurs({ ...result, paused: false, completed: [] }, day),
    )
  )
    throw new Error('Completion dates must belong to the reminder schedule.');
  return result;
}
export function parsePersonalReminders(v: unknown): PersonalReminder[] {
  if (!Array.isArray(v) || v.length > 100)
    throw new Error('Keep up to 100 personal reminder plans.');
  const list = v.map(parsePersonalReminder);
  if (new Set(list.map((x) => x.id)).size !== list.length)
    throw new Error('Reminder identities must be unique.');
  return list;
}
export function reminderOccurs(plan: PersonalReminder, date: Day): boolean {
  if (
    plan.paused ||
    date < plan.startsOn ||
    (plan.endsOn && date > plan.endsOn) ||
    plan.completed.includes(date)
  )
    return false;
  const offset = daysBetween(plan.startsOn, date);
  return plan.everyDays === null ? offset === 0 : offset % plan.everyDays === 0;
}
export function savePersonalReminder(journal: Journal, value: PersonalReminder): Journal {
  const p = parsePersonalReminder(value);
  if (journal.medications.some((x) => x.id === p.id))
    throw new Error('Choose a new reminder identity.');
  return {
    ...journal,
    personalReminders: parsePersonalReminders([
      ...journal.personalReminders.filter((x) => x.id !== p.id),
      p,
    ]),
  };
}
