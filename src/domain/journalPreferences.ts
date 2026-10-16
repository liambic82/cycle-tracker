import type { Journal } from './journal.ts';
import { QUICK_SYMPTOMS, symptomIdentity } from './symptoms.ts';
import { sleepImportKey } from './sleepImport.ts';

export const DAY_SECTIONS = [
  'symptoms',
  'observations',
  'medications',
  'sleep',
  'flow',
  'sexualHealth',
  'notes',
] as const;
export type DaySection = (typeof DAY_SECTIONS)[number];
export const DAY_SECTION_LABELS: Record<DaySection, string> = {
  symptoms: 'How are you feeling?',
  observations: 'Daily observations',
  medications: 'Medications',
  sleep: 'Sleep',
  flow: 'Flow',
  sexualHealth: 'Sexual health',
  notes: 'Notes',
};
export interface SleepAutomation {
  enabled: boolean;
  source: string | null;
  sourceName: string | null;
  suppressed: string[];
  lastCheck: { at: string; added: number; review: number; sourceSeen: boolean } | null;
}
export interface JournalPreferences {
  showPerimenopause: boolean;
  sectionOrder: DaySection[];
  pinnedSymptoms: string[];
  sleepAutomation: SleepAutomation;
}
export function defaultPreferences(): JournalPreferences {
  return {
    showPerimenopause: true,
    sectionOrder: [...DAY_SECTIONS],
    pinnedSymptoms: [...QUICK_SYMPTOMS],
    sleepAutomation: {
      enabled: false,
      source: null,
      sourceName: null,
      suppressed: [],
      lastCheck: null,
    },
  };
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
// Cosmetic preferences recover safely. Invalid automation must never imply consent.
export function parsePreferences(value: unknown, version: number): JournalPreferences {
  const defaults = defaultPreferences();
  if (!object(value)) return defaults;
  const base = { ...defaults, showPerimenopause: value.showPerimenopause as boolean };
  if (version < 10) return base;
  const order = value.sectionOrder;
  if (
    Array.isArray(order) &&
    order.length === DAY_SECTIONS.length &&
    new Set(order).size === order.length &&
    order.every((s) => DAY_SECTIONS.includes(s))
  )
    base.sectionOrder = [...order];
  const pins = value.pinnedSymptoms;
  if (
    Array.isArray(pins) &&
    pins.length <= 200 &&
    pins.every((s) => typeof s === 'string' && s.trim().length > 0 && s.length <= 80)
  )
    base.pinnedSymptoms = [
      ...new Map(pins.map((s: string) => [symptomIdentity(s), s.trim()])).values(),
    ];
  const auto = value.sleepAutomation;
  if (
    !object(auto) ||
    typeof auto.enabled !== 'boolean' ||
    !(
      auto.source === null ||
      (typeof auto.source === 'string' && auto.source.length > 0 && auto.source.length <= 256)
    ) ||
    !(
      auto.sourceName === null ||
      (typeof auto.sourceName === 'string' &&
        auto.sourceName.length > 0 &&
        auto.sourceName.length <= 256)
    ) ||
    (auto.enabled && (!auto.source || !auto.sourceName)) ||
    !Array.isArray(auto.suppressed) ||
    auto.suppressed.length > 40000 ||
    !auto.suppressed.every((s) => typeof s === 'string' && s.length > 0 && s.length <= 2048)
  )
    throw new Error('Invalid sleep import preferences.');
  const last = auto.lastCheck;
  if (
    last !== null &&
    (!object(last) ||
      typeof last.at !== 'string' ||
      !Number.isFinite(Date.parse(last.at)) ||
      !Number.isInteger(last.added) ||
      (last.added as number) < 0 ||
      (last.added as number) > 500 ||
      !Number.isInteger(last.review) ||
      (last.review as number) < 0 ||
      (last.review as number) > 500 ||
      typeof last.sourceSeen !== 'boolean')
  )
    throw new Error('Invalid last sleep check.');
  base.sleepAutomation = {
    ...auto,
    suppressed: [...new Set(auto.suppressed)],
  } as unknown as SleepAutomation;
  return base;
}
export function moveDaySection(
  order: DaySection[],
  section: DaySection,
  direction: -1 | 1,
): DaySection[] {
  const index = order.indexOf(section),
    target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
// Explicit removal suppresses automatic resurrection. Manual reimport or Undo clears suppression.
export function rememberRemovedSleep(before: Journal, after: Journal): Journal {
  if (before === after || before.entries === after.entries) return after;
  const oldKeys = new Set(
    Object.values(before.entries).flatMap((e) => e.sleepImports.map(sleepImportKey)),
  );
  const keys = new Set(
    Object.values(after.entries).flatMap((e) => e.sleepImports.map(sleepImportKey)),
  );
  const suppressed = new Set(after.preferences.sleepAutomation.suppressed);
  for (const key of oldKeys) if (!keys.has(key)) suppressed.add(key);
  for (const key of keys) suppressed.delete(key);
  if (suppressed.size > 40000)
    throw new Error(
      'The removed sleep history limit has been reached. Export a backup before continuing.',
    );
  return {
    ...after,
    preferences: {
      ...after.preferences,
      sleepAutomation: { ...after.preferences.sleepAutomation, suppressed: [...suppressed] },
    },
  };
}
export function resetRestoredAutomation(journal: Journal): Journal {
  return {
    ...journal,
    preferences: {
      ...journal.preferences,
      sleepAutomation: {
        ...journal.preferences.sleepAutomation,
        enabled: false,
        lastCheck: null,
      },
    },
  };
}
