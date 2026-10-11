import { addDays, type Day } from './dates.ts';
import type { Journal } from './journal.ts';

// Storage/input bounds, not medical reference ranges or alert thresholds.
export const DAILY_NUMBERS = {
  hotFlashes: { label: 'Hot flashes', min: 0, max: 1000, decimals: 0, unit: 'count' },
  mood: { label: 'Mood', min: 0, max: 10, decimals: 0, unit: '0 very low · 10 very good' },
  energy: { label: 'Energy', min: 0, max: 10, decimals: 0, unit: '0 none · 10 very high' },
  stress: { label: 'Stress', min: 0, max: 10, decimals: 0, unit: '0 none · 10 very high' },
  activityMinutes: { label: 'Activity', min: 0, max: 1440, decimals: 0, unit: 'minutes' },
  weight: { label: 'Weight', min: 0.01, max: 2000, decimals: 2, unit: 'selected unit' },
  systolic: { label: 'Blood pressure · systolic', min: 1, max: 500, decimals: 0, unit: 'mmHg' },
  diastolic: { label: 'Blood pressure · diastolic', min: 1, max: 500, decimals: 0, unit: 'mmHg' },
  temperature: {
    label: 'Basal temperature',
    min: -100,
    max: 250,
    decimals: 2,
    unit: 'selected unit',
  },
} as const;
export type DailyNumber = keyof typeof DAILY_NUMBERS;
export const DAILY_CHOICES = {
  lhTest: ['negative', 'positive', 'unclear'],
  pregnancyTest: ['negative', 'positive', 'unclear'],
  mucus: ['dry', 'sticky', 'creamy', 'watery', 'slippery/stretchy', 'other'],
  cycleObservation: ['missed', 'skipped'],
} as const;
export const DAILY_CHOICE_LABELS = {
  lhTest: 'LH test',
  pregnancyTest: 'Pregnancy test',
  mucus: 'Cervical mucus',
  cycleObservation: 'Your cycle observation',
};
export type DailyChoice = keyof typeof DAILY_CHOICES;
export type DailyDetails = Record<DailyNumber, number | null> & {
  painLocations: string[];
  weightUnit: 'kg' | 'lb';
  temperatureUnit: 'C' | 'F';
  lhTest: (typeof DAILY_CHOICES.lhTest)[number] | null;
  pregnancyTest: (typeof DAILY_CHOICES.pregnancyTest)[number] | null;
  mucus: (typeof DAILY_CHOICES.mucus)[number] | null;
  cycleObservation: (typeof DAILY_CHOICES.cycleObservation)[number] | null;
  context: string;
};
export function emptyDailyDetails(): DailyDetails {
  return {
    hotFlashes: null,
    mood: null,
    energy: null,
    stress: null,
    activityMinutes: null,
    weight: null,
    systolic: null,
    diastolic: null,
    temperature: null,
    painLocations: [],
    weightUnit: 'kg',
    temperatureUnit: 'C',
    lhTest: null,
    pregnancyTest: null,
    mucus: null,
    cycleObservation: null,
    context: '',
  };
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export function parseDailyDetails(value: unknown): DailyDetails {
  if (!object(value)) throw new Error('Daily observations are incomplete.');
  const result = emptyDailyDetails();
  for (const key of Object.keys(DAILY_NUMBERS) as DailyNumber[]) {
    const n = value[key],
      rule = DAILY_NUMBERS[key];
    if (
      n !== null &&
      (typeof n !== 'number' ||
        !Number.isFinite(n) ||
        n < rule.min ||
        n > rule.max ||
        Math.abs(n * 10 ** rule.decimals - Math.round(n * 10 ** rule.decimals)) > 1e-7)
    )
      throw new Error(
        `${rule.label}: use ${rule.min}–${rule.max}, up to ${rule.decimals} decimal places, or leave blank.`,
      );
    result[key] = n as number | null;
  }
  for (const key of Object.keys(DAILY_CHOICES) as DailyChoice[]) {
    if (value[key] !== null && !(DAILY_CHOICES[key] as readonly unknown[]).includes(value[key]))
      throw new Error(`Choose a supported ${DAILY_CHOICE_LABELS[key]} value.`);
    Object.assign(result, { [key]: value[key] });
  }
  if (
    typeof value.weightUnit !== 'string' ||
    !['kg', 'lb'].includes(value.weightUnit) ||
    typeof value.temperatureUnit !== 'string' ||
    !['C', 'F'].includes(value.temperatureUnit)
  )
    throw new Error('Choose measurement units.');
  if (
    !Array.isArray(value.painLocations) ||
    value.painLocations.length > 10 ||
    value.painLocations.some(
      (x) => typeof x !== 'string' || !x.trim() || x.length > 60 || /[\u0000-\u001f]/.test(x),
    )
  )
    throw new Error('Use up to ten pain locations, 60 characters each.');
  if (
    new Set(value.painLocations.map((x) => x.trim().toLowerCase())).size !==
    value.painLocations.length
  )
    throw new Error('Each pain location must be unique.');
  if (typeof value.context !== 'string' || value.context.length > 2000)
    throw new Error('Keep observation context within 2,000 characters.');
  return {
    ...result,
    painLocations: value.painLocations.map((x) => x.trim()),
    weightUnit: value.weightUnit as 'kg' | 'lb',
    temperatureUnit: value.temperatureUnit as 'C' | 'F',
    context: value.context,
  };
}
export function dailyFromInput(
  value: Record<DailyNumber, string>,
  rest: DailyDetails,
): DailyDetails {
  const result = { ...rest };
  for (const key of Object.keys(DAILY_NUMBERS) as DailyNumber[]) {
    const text = value[key].trim();
    if (text && !/^-?\d+(?:\.\d+)?$/.test(text))
      throw new Error(
        `${DAILY_NUMBERS[key].label}: enter a number using a decimal point, or leave blank.`,
      );
    result[key] = text ? Number(text) : null;
  }
  return parseDailyDetails(result);
}
export const hasDailyDetails = (x: DailyDetails) =>
  Object.keys(DAILY_NUMBERS).some((k) => x[k as DailyNumber] !== null) ||
  Object.keys(DAILY_CHOICES).some((k) => x[k as DailyChoice] !== null) ||
  x.painLocations.length > 0 ||
  !!x.context;
export function describeDailyDetails(
  x: DailyDetails,
  includeContext = true,
  includeTests = true,
): string[] {
  const lines: string[] = [];
  for (const key of Object.keys(DAILY_NUMBERS) as DailyNumber[]) {
    if (key === 'temperature' && !includeTests) continue;
    if (x[key] !== null)
      lines.push(
        `${DAILY_NUMBERS[key].label}: ${x[key]}${['mood', 'energy', 'stress'].includes(key) ? `/10 (${DAILY_NUMBERS[key].unit})` : ` ${key === 'weight' ? x.weightUnit : key === 'temperature' ? `°${x.temperatureUnit}` : DAILY_NUMBERS[key].unit}`}.`,
      );
  }
  if (x.painLocations.length) lines.push(`Pain locations: ${x.painLocations.join('; ')}.`);
  for (const key of Object.keys(DAILY_CHOICES) as DailyChoice[]) {
    if (!includeTests && key !== 'cycleObservation') continue;
    if (x[key] !== null) lines.push(`${DAILY_CHOICE_LABELS[key]}: ${x[key]} (self-reported).`);
  }
  if (includeContext && x.context) lines.push(`Observation context: ${x.context}`);
  return lines;
}
export function dailyDetailsHistory(journal: Journal, today: Day, days: 30 | 90 | 365) {
  const from = addDays(today, 1 - days);
  return Object.entries(journal.entries)
    .filter(([date, e]) => date >= from && date <= today && hasDailyDetails(e.dailyDetails))
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, e]) => ({ date, details: parseDailyDetails(e.dailyDetails) }));
}
