import { addDays, daysBetween, type Day } from './dates.ts';
import type { Entry, Journal } from './journal.ts';
import { MAX_DAILY_SYMPTOMS } from './symptoms.ts';

export type SymptomRating = { symptom: string; value: number };
export const SEVERITY_WINDOWS = [30, 90, 365] as const;
export type SeverityWindow = (typeof SEVERITY_WINDOWS)[number];

function validRating(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 10;
}

// Exact saved labels identify ratings. Never merge or rename historical labels on import.
// Cramps keep their existing field so there is only one source for that rating.
export function parseSymptomRatings(value: unknown, symptoms: string[]): SymptomRating[] {
  if (!Array.isArray(value) || value.length > MAX_DAILY_SYMPTOMS)
    throw new Error('This journal contains invalid symptom ratings.');
  const seen = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new Error('This journal contains invalid symptom ratings.');
    const rating = item as Record<string, unknown>;
    if (
      typeof rating.symptom !== 'string' ||
      !rating.symptom.trim() ||
      rating.symptom.length > 60 ||
      rating.symptom === 'Cramps' ||
      !symptoms.includes(rating.symptom) ||
      seen.has(rating.symptom) ||
      !validRating(rating.value)
    )
      throw new Error('This journal contains invalid symptom ratings.');
    seen.add(rating.symptom);
    return { symptom: rating.symptom, value: rating.value };
  });
}

export function symptomSeverity(entry: Entry, symptom: string): number | null {
  if (!entry.symptoms.includes(symptom)) return null;
  return symptom === 'Cramps'
    ? entry.cramps
    : (entry.symptomRatings.find((rating) => rating.symptom === symptom)?.value ?? null);
}

export function rateSymptom(entry: Entry, symptom: string, value: number | null): Partial<Entry> {
  if (!entry.symptoms.includes(symptom) || (value !== null && !validRating(value)))
    throw new Error('Choose a logged symptom and a whole-number rating from 0 to 10.');
  if (symptom === 'Cramps') return { cramps: value };
  const ratings = entry.symptomRatings.filter((rating) => rating.symptom !== symptom);
  if (value !== null) ratings.push({ symptom, value });
  return { symptomRatings: parseSymptomRatings(ratings, entry.symptoms) };
}

export function recordedSymptoms(journal: Journal, through: Day): string[] {
  return [
    ...new Set(
      Object.entries(journal.entries)
        .filter(([date]) => date <= through)
        .flatMap(([, entry]) => entry.symptoms),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function severityHistory(
  journal: Journal,
  symptom: string,
  through: Day,
  window: SeverityWindow,
) {
  const from =
    addDays(through, 1 - window) < '1900-01-01' ? '1900-01-01' : addDays(through, 1 - window);
  const records = Object.entries(journal.entries)
    .filter(([date, entry]) => date >= from && date <= through && entry.symptoms.includes(symptom))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => ({ date, value: symptomSeverity(entry, symptom) }));
  const rated = records.filter((record) => record.value !== null).length;
  return {
    from,
    through,
    records,
    rated,
    unrated: records.length - rated,
    notLogged: daysBetween(from, through) + 1 - records.length,
  };
}
