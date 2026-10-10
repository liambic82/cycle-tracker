import { addDays, daysBetween, type Day } from './dates.ts';
import type { Journal } from './journal.ts';

export const SLEEP_QUALITIES = ['very-poor', 'poor', 'okay', 'good', 'very-good'] as const;
export type SleepQuality = (typeof SLEEP_QUALITIES)[number];
export const SLEEP_QUALITY_LABELS: Record<SleepQuality, string> = {
  'very-poor': 'Very poor',
  poor: 'Poor',
  okay: 'Okay',
  good: 'Good',
  'very-good': 'Very good',
};
export type SleepRecord = {
  durationMinutes: number | null;
  quality: SleepQuality | null;
  wakings: number | null;
};
export type SleepInput = {
  hours: string;
  minutes: string;
  quality: SleepQuality | null;
  wakings: string;
};
export const SLEEP_WINDOWS = [30, 90, 365] as const;
export type SleepWindow = (typeof SLEEP_WINDOWS)[number];

export function emptySleep(): SleepRecord {
  return { durationMinutes: null, quality: null, wakings: null };
}
export function hasSleep(value: SleepRecord): boolean {
  return value.durationMinutes !== null || value.quality !== null || value.wakings !== null;
}
const nullableWhole = (value: unknown, max: number) =>
  value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= max);
export function parseSleep(value: unknown): SleepRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('This journal contains invalid sleep details.');
  const record = value as Record<string, unknown>;
  if (
    !nullableWhole(record.durationMinutes, 1440) ||
    !nullableWhole(record.wakings, 100) ||
    !(record.quality === null || SLEEP_QUALITIES.includes(record.quality as SleepQuality))
  )
    throw new Error('This journal contains invalid sleep details.');
  return {
    durationMinutes: record.durationMinutes as number | null,
    quality: record.quality as SleepQuality | null,
    wakings: record.wakings as number | null,
  };
}
function wholeInput(value: string, max: number, label: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+$/.test(text) || Number(text) > max)
    throw new Error(`${label}: enter a whole number from 0 to ${max}, or leave it blank.`);
  return Number(text);
}
export function sleepFromInput(input: SleepInput): SleepRecord {
  const hours = wholeInput(input.hours, 24, 'Sleep hours');
  const minutes = wholeInput(input.minutes, 59, 'Sleep minutes');
  const durationMinutes =
    hours === null && minutes === null ? null : (hours ?? 0) * 60 + (minutes ?? 0);
  if (durationMinutes !== null && durationMinutes > 1440)
    throw new Error('Sleep duration cannot exceed 24 hours.');
  return parseSleep({
    durationMinutes,
    quality: input.quality,
    wakings: wholeInput(input.wakings, 100, 'Night wakings'),
  });
}
export function sleepToInput(value: SleepRecord): SleepInput {
  return {
    hours: value.durationMinutes === null ? '' : String(Math.floor(value.durationMinutes / 60)),
    minutes: value.durationMinutes === null ? '' : String(value.durationMinutes % 60),
    quality: value.quality,
    wakings: value.wakings === null ? '' : String(value.wakings),
  };
}
export function sleepDurationLabel(minutes: number | null): string {
  return minutes === null ? 'Not logged' : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
export function describeSleep(value: SleepRecord): string[] {
  return [
    ...(value.durationMinutes === null
      ? []
      : [`Sleep duration: ${sleepDurationLabel(value.durationMinutes)}.`]),
    ...(value.quality === null ? [] : [`Sleep quality: ${SLEEP_QUALITY_LABELS[value.quality]}.`]),
    ...(value.wakings === null ? [] : [`Night wakings: ${value.wakings}.`]),
  ];
}
export function sleepHistory(journal: Journal, through: Day, window: SleepWindow) {
  const start = addDays(through, 1 - window);
  const from = start < '1900-01-01' ? '1900-01-01' : start;
  const records = Object.entries(journal.entries)
    .filter(([date, entry]) => date >= from && date <= through && hasSleep(entry.sleep))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => ({ date, sleep: { ...entry.sleep } }));
  return {
    from,
    through,
    records,
    notLogged: daysBetween(from, through) + 1 - records.length,
    durations: records.filter(({ sleep }) => sleep.durationMinutes !== null).length,
  };
}
