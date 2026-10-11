import { validDay, type Day } from './dates.ts';
import { emptyEntry, updateEntry, FLOWS, type Flow, type Journal } from './journal.ts';
import { checkedJournalSize } from './medicalRecords.ts';
export const SIMPLE_CSV_HEADERS = [
  'Format',
  'Date',
  'Flow',
  'Period start',
  'Period end',
  'Symptoms',
  'Note',
];
export const CSV_TEMPLATE =
  'Format,Date,Flow,Period start,Period end,Symptoms,Note\r\ncycle-simple-v1,2026-01-01,medium,true,false,Cramps; Fatigue,Fictional example - replace or remove this row\r\n';
export type ImportRow = {
  date: Day;
  flow: Flow | null;
  start: boolean;
  end: boolean;
  symptoms: string[];
  note: string;
};
export function parseCSV(text: string): string[][] {
  if (new TextEncoder().encode(text).length > 1024 * 1024)
    throw new Error('Choose a CSV up to 1 MiB.');
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
      continue;
    }
    if (c === '"') {
      if (cell || closed) throw new Error('Invalid CSV quoting.');
      quoted = true;
      continue;
    }
    if (c === ',' || c === '\n' || c === '\r') {
      row.push(cell);
      cell = '';
      closed = false;
      if (c !== ',') {
        rows.push(row);
        row = [];
        if (c === '\r' && input[i + 1] === '\n') i++;
      }
      continue;
    }
    if (closed) throw new Error('Unexpected text after a quoted CSV field.');
    cell += c;
  }
  if (quoted) throw new Error('An unfinished quoted CSV field was found.');
  if (cell || closed || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
export function parseJournalCSV(text: string, today: Day): ImportRow[] {
  const [headers, ...data] = parseCSV(text);
  if (!headers || JSON.stringify(headers) !== JSON.stringify(SIMPLE_CSV_HEADERS))
    throw new Error(
      'Use the Cycle simple import template headers, in order. Other apps need an explicit mapping; the readable journal export is not this import format.',
    );
  if (data.length > 1000) throw new Error('Import up to 1,000 rows at a time.');
  const rows = data
    .filter((r) => r.some(Boolean))
    .map((cells, i) => {
      if (cells.length !== 7) throw new Error(`Row ${i + 2}: expected seven columns.`);
      const [format, date, flow, start, end, symptomText, note] = cells as [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
      if (
        format !== 'cycle-simple-v1' ||
        !validDay(date) ||
        date > today ||
        !(flow === '' || (FLOWS as readonly string[]).includes(flow)) ||
        !['', 'true', 'false'].includes(start) ||
        !['', 'true', 'false'].includes(end) ||
        note.length > 10000
      )
        throw new Error(`Row ${i + 2}: check format, date, flow and true/false values.`);
      if ((start === 'true' || end === 'true') && (!flow || flow === 'none' || flow === 'spotting'))
        throw new Error(`Row ${i + 2}: period boundaries require recorded bleeding.`);
      const symptoms = symptomText ? symptomText.split(';').map((x) => x.trim()) : [];
      if (
        symptoms.length > 200 ||
        symptoms.some((x) => !x || x.length > 60 || /[\u0000-\u001f]/.test(x)) ||
        new Set(symptoms.map((x) => x.toLowerCase())).size !== symptoms.length
      )
        throw new Error(`Row ${i + 2}: check symptom labels (semicolon separated).`);
      if (!flow && !symptoms.length && !note)
        throw new Error(`Row ${i + 2} contains no observations.`);
      return {
        date,
        flow: flow ? (flow as Flow) : null,
        start: start === 'true',
        end: end === 'true',
        symptoms,
        note,
      };
    });
  if (new Set(rows.map((r) => r.date)).size !== rows.length)
    throw new Error('Use one combined row per date.');
  return rows;
}
export function importRowState(
  journal: Journal,
  row: ImportRow,
): 'new' | 'merge' | 'unchanged' | 'conflict' {
  const e = journal.entries[row.date];
  if (!e) return 'new';
  if (
    (row.flow !== null &&
      e.flowRecorded &&
      (e.flow !== row.flow || e.periodStart !== row.start || e.periodEnd !== row.end)) ||
    (row.note && e.note && row.note !== e.note)
  )
    return 'conflict';
  const extra = row.symptoms.some(
    (x) => !e.symptoms.some((y) => x.toLowerCase() === y.toLowerCase()),
  );
  return extra || (row.flow !== null && !e.flowRecorded) || (row.note && !e.note)
    ? 'merge'
    : 'unchanged';
}
export function applyImportRows(journal: Journal, rows: ImportRow[], today: Day): Journal {
  let next = journal;
  for (const row of rows) {
    if (!validDay(row.date) || row.date > today)
      throw new Error('Import dates must be today or earlier.');
    const state = importRowState(next, row);
    if (state === 'conflict')
      throw new Error(
        `Existing flow or notes conflict on ${row.date}. Nothing was applied. Review that day first.`,
      );
    if (state === 'unchanged') continue;
    const old = next.entries[row.date] ?? emptyEntry();
    next = updateEntry(next, row.date, {
      ...(row.flow === null
        ? {}
        : { flow: row.flow, flowRecorded: true, periodStart: row.start, periodEnd: row.end }),
      symptoms: [
        ...old.symptoms,
        ...row.symptoms.filter(
          (x) => !old.symptoms.some((y) => x.toLowerCase() === y.toLowerCase()),
        ),
      ],
      note: old.note || row.note,
    });
  }
  return checkedJournalSize(next);
}
export function historicalPeriodRows(
  start: Day,
  end: Day | null,
  flow: Flow,
  today: Day,
): ImportRow[] {
  if (
    !validDay(start) ||
    start > today ||
    (end !== null && (!validDay(end) || end < start || end > today)) ||
    flow === 'none' ||
    flow === 'spotting'
  )
    throw new Error('Choose recorded bleeding, a past start, and an optional end on or after it.');
  const first: ImportRow = {
    date: start,
    flow,
    start: true,
    end: end === start,
    symptoms: [],
    note: '',
  };
  return end && end !== start
    ? [first, { date: end, flow, start: false, end: true, symptoms: [], note: '' }]
    : [first];
}
