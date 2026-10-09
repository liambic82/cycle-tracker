import { daysBetween, validDay, type Day } from './dates.ts';
import {
  describeProduct,
  orderedProducts,
  parseProductRecords,
  type ProductRecord,
} from './flowDetails.ts';
import {
  MAX_DAILY_SYMPTOMS,
  symptomSelected,
  toggleSymptom,
  validateCustomSymptom,
} from './symptoms.ts';

export const FLOWS = ['none', 'spotting', 'light', 'medium', 'heavy'] as const;
export type Flow = (typeof FLOWS)[number];

export interface Entry {
  flow: Flow;
  flowRecorded: boolean;
  periodStart: boolean;
  periodEnd: boolean;
  symptoms: string[];
  cramps: number | null;
  note: string;
  productRecords: ProductRecord[];
  clots: boolean | null;
  flooding: boolean | null;
}

export interface Journal {
  version: 2;
  entries: Record<Day, Entry>;
  customSymptoms: string[];
  selectedDate: Day;
  preferences: { showPerimenopause: boolean };
}

export function emptyEntry(): Entry {
  return {
    flow: 'none',
    flowRecorded: false,
    periodStart: false,
    periodEnd: false,
    symptoms: [],
    cramps: null,
    note: '',
    productRecords: [],
    clots: null,
    flooding: null,
  };
}

export function emptyJournal(today: Day): Journal {
  return {
    version: 2,
    entries: {},
    customSymptoms: [],
    selectedDate: today,
    preferences: { showPerimenopause: true },
  };
}

export function hasEntry(entry: Entry | undefined): boolean {
  return (
    !!entry &&
    (entry.flowRecorded ||
      entry.flow !== 'none' ||
      entry.periodStart ||
      entry.periodEnd ||
      entry.symptoms.length > 0 ||
      entry.productRecords.length > 0 ||
      entry.clots !== null ||
      entry.flooding !== null ||
      entry.note.length > 0)
  );
}

export function updateEntry(journal: Journal, date: Day, patch: Partial<Entry>): Journal {
  const entry = { ...(journal.entries[date] ?? emptyEntry()), ...patch };
  if (patch.productRecords !== undefined)
    entry.productRecords = parseProductRecords(patch.productRecords);
  if (![null, true, false].includes(entry.clots) || ![null, true, false].includes(entry.flooding))
    throw new Error('Choose Yes, No, or Not logged for bleeding observations.');
  if (patch.flow !== undefined) entry.flowRecorded = patch.flowRecorded ?? true;
  if (!entry.flowRecorded) entry.flow = 'none';
  if (entry.flow === 'none' || entry.flow === 'spotting') {
    entry.periodStart = false;
    entry.periodEnd = false;
  }
  if (!entry.symptoms.includes('Cramps')) entry.cramps = null;
  const entries = { ...journal.entries };
  if (hasEntry(entry)) entries[date] = entry;
  else delete entries[date];
  return { ...journal, entries };
}

export function starts(journal: Journal, through: Day): Day[] {
  return Object.keys(journal.entries)
    .filter((day) => day <= through && journal.entries[day]?.periodStart)
    .sort();
}

export function addCustomSymptom(journal: Journal, input: string): Journal {
  const label = validateCustomSymptom(input, journal.customSymptoms);
  const selected = journal.entries[journal.selectedDate]?.symptoms ?? [];
  // Guard the daily limit before adding the definition so a failed log changes neither.
  const symptoms = symptomSelected(selected, label)
    ? [...selected]
    : toggleSymptom(selected, label);
  return updateEntry(
    { ...journal, customSymptoms: [...journal.customSymptoms, label] },
    journal.selectedDate,
    { symptoms },
  );
}

export function cycleDay(journal: Journal, day: Day): number | null {
  const start = starts(journal, day).at(-1);
  return start ? daysBetween(start, day) + 1 : null;
}

export function history(journal: Journal, through: Day) {
  const dates = starts(journal, through);
  const allDays = Object.keys(journal.entries)
    .filter((day) => day <= through)
    .sort();
  let cursor = 0;
  return dates.map((start, index) => {
    const next = dates[index + 1];
    while (cursor < allDays.length && allDays[cursor]! < start) cursor++;
    let end: Day | null = null;
    while (cursor < allDays.length && (!next || allDays[cursor]! < next)) {
      const day = allDays[cursor++]!;
      if (!end && journal.entries[day]?.periodEnd) end = day;
    }
    return {
      start,
      end: end ?? null,
      length: next ? daysBetween(start, next) : null,
      duration: end ? daysBetween(start, end) + 1 : null,
    };
  });
}

function assert(condition: unknown): asserts condition {
  if (!condition) throw new Error('This backup contains unsupported or invalid journal data.');
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function symptomList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_DAILY_SYMPTOMS &&
    value.every((s) => typeof s === 'string' && s.trim().length > 0 && s.length <= 60) &&
    new Set(value).size === value.length
  );
}

export function parseJournal(value: unknown): Journal {
  assert(
    record(value) && (value.version === 1 || value.version === 2) && validDay(value.selectedDate),
  );
  // Pre-0.4 backups have no preferences. Their entries and labels stay unchanged.
  assert(
    value.preferences === undefined ||
      (record(value.preferences) && typeof value.preferences.showPerimenopause === 'boolean'),
  );
  assert(
    record(value.entries) &&
      Object.keys(value.entries).length <= 40000 &&
      symptomList(value.customSymptoms),
  );
  const entries: Record<Day, Entry> = {};
  for (const [day, entry] of Object.entries(value.entries)) {
    assert(validDay(day) && record(entry));
    assert(
      FLOWS.includes(entry.flow as Flow) &&
        typeof entry.periodStart === 'boolean' &&
        typeof entry.periodEnd === 'boolean',
    );
    // Older 'none' values also mean an untouched default; never infer an explicit no-flow log.
    const flowRecorded =
      entry.flowRecorded === undefined ? entry.flow !== 'none' : entry.flowRecorded;
    assert(typeof flowRecorded === 'boolean' && (flowRecorded || entry.flow === 'none'));
    assert(
      symptomList(entry.symptoms) && typeof entry.note === 'string' && entry.note.length <= 10000,
    );
    assert(
      entry.cramps === null ||
        (Number.isInteger(entry.cramps) &&
          Number(entry.cramps) >= 0 &&
          Number(entry.cramps) <= 10 &&
          entry.symptoms.includes('Cramps')),
    );
    assert(
      !(
        (entry.flow === 'none' || entry.flow === 'spotting') &&
        (entry.periodStart || entry.periodEnd)
      ),
    );
    const productRecords = value.version === 1 ? [] : parseProductRecords(entry.productRecords);
    const clots = value.version === 1 ? null : entry.clots;
    const flooding = value.version === 1 ? null : entry.flooding;
    assert(
      (clots === null || typeof clots === 'boolean') &&
        (flooding === null || typeof flooding === 'boolean'),
    );
    entries[day] = {
      flow: entry.flow as Flow,
      flowRecorded,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
      symptoms: [...entry.symptoms],
      cramps: entry.cramps as number | null,
      note: entry.note,
      productRecords,
      clots,
      flooding,
    };
  }
  return {
    version: 2,
    entries,
    customSymptoms: [...value.customSymptoms],
    selectedDate: value.selectedDate,
    preferences: {
      showPerimenopause:
        value.preferences === undefined
          ? true
          : (value.preferences as { showPerimenopause: boolean }).showPerimenopause,
    },
  };
}

export function toCSV(journal: Journal): string {
  // Prefix formula-like values before quoting to prevent spreadsheet formula execution.
  const cell = (value: string) =>
    `"${(/^[\s]*[=+@\-\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  const rows = [
    [
      'Date',
      'Flow',
      'Period start',
      'Period end',
      'Symptoms',
      'Cramp severity (0-10)',
      'Note',
      'Flow recorded',
      'Clots noticed',
      'Flooding noticed',
      'Product records',
    ],
  ];
  for (const day of Object.keys(journal.entries).sort()) {
    const e = journal.entries[day]!;
    rows.push([
      day,
      e.flow,
      String(e.periodStart),
      String(e.periodEnd),
      e.symptoms.join('; '),
      e.cramps === null ? '' : String(e.cramps),
      e.note,
      String(e.flowRecorded),
      e.clots === null ? '' : e.clots ? 'Yes' : 'No',
      e.flooding === null ? '' : e.flooding ? 'Yes' : 'No',
      orderedProducts(e.productRecords).map(describeProduct).join('\n'),
    ]);
  }
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
