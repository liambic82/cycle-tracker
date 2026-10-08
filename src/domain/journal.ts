import { daysBetween, validDay, type Day } from './dates.ts';

export const FLOWS = ['none', 'spotting', 'light', 'medium', 'heavy'] as const;
export type Flow = (typeof FLOWS)[number];
export const SYMPTOM_GROUPS = {
  'Body & cycle': [
    'Cramps',
    'Bloating',
    'Headache',
    'Breast tenderness',
    'Fatigue',
    'Back pain',
    'Nausea',
    'Migraine',
    'Pelvic pressure',
  ],
  'Mood & mind': [
    'Mood swings',
    'Irritability',
    'Anxiety',
    'Low mood',
    'Brain fog',
    'Trouble concentrating',
    'Overwhelm',
  ],
  Perimenopause: [
    'Hot flashes',
    'Night sweats',
    'Sleep disruption',
    'Joint aches',
    'Vaginal dryness',
    'Heart palpitations',
  ],
  'More symptoms': [
    'Itchy skin',
    'Dry eyes',
    'Tingling',
    'Restless legs',
    'Dizziness',
    'Acid reflux',
    'Ringing in ears',
    'Hair changes',
  ],
} as const;

export interface Entry {
  flow: Flow;
  periodStart: boolean;
  periodEnd: boolean;
  symptoms: string[];
  cramps: number | null;
  note: string;
}

export interface Journal {
  version: 1;
  entries: Record<Day, Entry>;
  customSymptoms: string[];
  selectedDate: Day;
}

export function emptyEntry(): Entry {
  return {
    flow: 'none',
    periodStart: false,
    periodEnd: false,
    symptoms: [],
    cramps: null,
    note: '',
  };
}

export function emptyJournal(today: Day): Journal {
  return { version: 1, entries: {}, customSymptoms: [], selectedDate: today };
}

export function hasEntry(entry: Entry | undefined): boolean {
  return (
    !!entry &&
    (entry.flow !== 'none' ||
      entry.periodStart ||
      entry.periodEnd ||
      entry.symptoms.length > 0 ||
      entry.note.length > 0)
  );
}

export function updateEntry(journal: Journal, date: Day, patch: Partial<Entry>): Journal {
  const entry = { ...(journal.entries[date] ?? emptyEntry()), ...patch };
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

export function cycleDay(journal: Journal, day: Day): number | null {
  const start = starts(journal, day).at(-1);
  return start ? daysBetween(start, day) + 1 : null;
}

export function history(journal: Journal, through: Day) {
  const dates = starts(journal, through);
  const allDays = Object.keys(journal.entries).sort();
  return dates.map((start, index) => {
    const next = dates[index + 1];
    const end = allDays.find(
      (day) =>
        day >= start && day <= through && (!next || day < next) && journal.entries[day]?.periodEnd,
    );
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
    value.length <= 200 &&
    value.every((s) => typeof s === 'string' && s.trim().length > 0 && s.length <= 60) &&
    new Set(value).size === value.length
  );
}

export function parseJournal(value: unknown): Journal {
  assert(record(value) && value.version === 1 && validDay(value.selectedDate));
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
    entries[day] = {
      flow: entry.flow as Flow,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
      symptoms: [...entry.symptoms],
      cramps: entry.cramps as number | null,
      note: entry.note,
    };
  }
  return {
    version: 1,
    entries,
    customSymptoms: [...value.customSymptoms],
    selectedDate: value.selectedDate,
  };
}

export function toCSV(journal: Journal): string {
  // Prefix formula-like values before quoting to prevent spreadsheet formula execution.
  const cell = (value: string) =>
    `"${(/^[\s]*[=+@\-\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  const rows = [
    ['Date', 'Flow', 'Period start', 'Period end', 'Symptoms', 'Cramp severity (0-10)', 'Note'],
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
    ]);
  }
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
