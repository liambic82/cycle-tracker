import { validDay, type Day } from './dates.ts';
import { updateEntry, type Journal } from './journal.ts';

export type SleepStage = { start: string; end: string; type: number };
export type ImportedSleep = {
  id: string;
  sourcePackage: string;
  sourceName: string;
  device: string | null;
  start: string;
  end: string;
  startOffset: number | null;
  endOffset: number | null;
  fallbackOffset: number;
  modified: string;
  imported: string;
  stages: SleepStage[];
};
const invalid = () =>
  new Error('The sleep session is incomplete or unsupported. Nothing was changed.');
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const text = (x: unknown, max: number): x is string =>
  typeof x === 'string' && x.trim().length > 0 && x.length <= max && !/[\u0000-\u001f]/.test(x);
const instant = (x: unknown): x is string =>
  typeof x === 'string' &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x) &&
  Number.isFinite(Date.parse(x)) &&
  new Date(x).toISOString() === x &&
  x >= '1900' &&
  x < '2200';
const offset = (x: unknown): x is number =>
  Number.isInteger(x) && Number(x) >= -1080 && Number(x) <= 1080;
export const sleepImportKey = (x: ImportedSleep) => JSON.stringify([x.sourcePackage, x.id]);
export function sleepWakingDay(x: ImportedSleep): Day {
  return new Date(Date.parse(x.end) + (x.endOffset ?? x.fallbackOffset) * 60000)
    .toISOString()
    .slice(0, 10);
}
export function parseSleepImport(value: unknown): ImportedSleep {
  if (
    !object(value) ||
    !text(value.id, 256) ||
    !text(value.sourcePackage, 256) ||
    !text(value.sourceName, 256) ||
    !(value.device === null || text(value.device, 256)) ||
    !instant(value.start) ||
    !instant(value.end) ||
    !instant(value.modified) ||
    !instant(value.imported) ||
    !(value.startOffset === null || offset(value.startOffset)) ||
    !(value.endOffset === null || offset(value.endOffset)) ||
    !offset(value.fallbackOffset) ||
    !Array.isArray(value.stages) ||
    value.stages.length > 3000
  )
    throw invalid();
  const span = Date.parse(value.end) - Date.parse(value.start);
  if (span <= 0 || span > 72 * 3600000) throw invalid();
  const stages = value.stages
    .map((s): SleepStage => {
      if (
        !object(s) ||
        !instant(s.start) ||
        !instant(s.end) ||
        s.start < value.start! ||
        s.end > value.end! ||
        s.end <= s.start ||
        !Number.isInteger(s.type) ||
        Number(s.type) < 0 ||
        Number(s.type) > 7
      )
        throw invalid();
      return { start: s.start, end: s.end, type: s.type as number };
    })
    .sort((a, b) => a.start.localeCompare(b.start));
  if (stages.some((s, i) => i > 0 && s.start < stages[i - 1]!.end)) throw invalid();
  const result: ImportedSleep = {
    id: value.id,
    sourcePackage: value.sourcePackage,
    sourceName: value.sourceName,
    device: value.device,
    start: value.start,
    end: value.end,
    startOffset: value.startOffset,
    endOffset: value.endOffset,
    fallbackOffset: value.fallbackOffset,
    modified: value.modified,
    imported: value.imported,
    stages,
  };
  if (!validDay(sleepWakingDay(result))) throw invalid();
  return result;
}
export function parseSleepImports(value: unknown, day?: Day): ImportedSleep[] {
  if (!Array.isArray(value) || value.length > 100) throw invalid();
  const result = value.map(parseSleepImport);
  if (
    new Set(result.map(sleepImportKey)).size !== result.length ||
    (day && result.some((x) => sleepWakingDay(x) !== day))
  )
    throw invalid();
  return result;
}
export function sleepStageSummary(x: ImportedSleep) {
  let known = 0,
    asleep = 0,
    awake = 0;
  for (const s of x.stages) {
    const ms = Date.parse(s.end) - Date.parse(s.start);
    if (s.type !== 0) known += ms;
    if ([2, 4, 5, 6].includes(s.type)) asleep += ms;
    if ([1, 3, 7].includes(s.type)) awake += ms;
  }
  const span = Date.parse(x.end) - Date.parse(x.start);
  return {
    spanMinutes: span / 60000,
    asleepMinutes: asleep / 60000,
    awakeMinutes: awake / 60000,
    unknownMinutes: (span - known) / 60000,
    complete: known === span,
  };
}
export const minutesLabel = (n: number) => `${Math.round(n * 10) / 10} min`;
export function sleepLocalTime(instant: string, minutes: number) {
  const local = new Date(Date.parse(instant) + minutes * 60000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(minutes);
  return `${local} (UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')})`;
}
export function describeImportedSleep(x: ImportedSleep): string[] {
  const s = sleepStageSummary(x);
  return [
    `Imported sleep · ${x.sourceName}${x.device ? ` · ${x.device}` : ''}.`,
    `Session: ${sleepLocalTime(x.start, x.startOffset ?? x.fallbackOffset)} to ${sleepLocalTime(x.end, x.endOffset ?? x.fallbackOffset)}.`,
    `Session span: ${minutesLabel(s.spanMinutes)} (includes awake or unknown time).`,
    `Recorded asleep stages: ${minutesLabel(s.asleepMinutes)}${s.complete ? ' · full stage coverage' : ' · incomplete stages; total time asleep unknown'}.`,
    `Awake/out-of-bed stages: ${minutesLabel(s.awakeMinutes)}. Unknown time: ${minutesLabel(s.unknownMinutes)}.`,
    ...(x.startOffset === null || x.endOffset === null
      ? [
          'Missing source time-zone offset: the phone offset at the session end when first imported is used and retained.',
        ]
      : []),
    `Source: ${x.sourcePackage}; record ${x.id}; source modified ${x.modified}; imported ${x.imported}.`,
  ];
}
export function existingSleepImport(journal: Journal, incoming: ImportedSleep) {
  return Object.values(journal.entries)
    .flatMap((e) => e.sleepImports)
    .find((x) => sleepImportKey(x) === sleepImportKey(incoming));
}
function content(x: ImportedSleep) {
  const { imported: _imported, fallbackOffset: _fallback, ...rest } = x;
  return JSON.stringify(rest);
}
export function sleepImportState(
  journal: Journal,
  incoming: ImportedSleep,
): 'new' | 'unchanged' | 'updated' | 'older' {
  const old = existingSleepImport(journal, incoming);
  if (!old) return 'new';
  if (incoming.modified < old.modified) return 'older';
  return content(old) === content(incoming) ? 'unchanged' : 'updated';
}
export function overlappingSleepImports(journal: Journal, incoming: ImportedSleep) {
  return Object.values(journal.entries)
    .flatMap((e) => e.sleepImports)
    .filter(
      (x) =>
        sleepImportKey(x) !== sleepImportKey(incoming) &&
        x.start < incoming.end &&
        x.end > incoming.start,
    );
}
function mergeSleepImport(journal: Journal, value: ImportedSleep, today: Day): Journal {
  let incoming = parseSleepImport(value);
  const old = existingSleepImport(journal, incoming);
  // Travel must not move a previously imported session when its source omitted the zone.
  if (old) incoming = { ...incoming, fallbackOffset: old.fallbackOffset };
  const day = sleepWakingDay(incoming);
  if (day > today)
    throw new Error(
      'This sleep session ends on a future waking date. Check its source before importing.',
    );
  const state = sleepImportState(journal, incoming);
  if (state === 'older')
    throw new Error('This result is older than the imported copy. Refresh before trying again.');
  if (state === 'unchanged') return journal;
  let next = journal;
  for (const [date, entry] of Object.entries(journal.entries)) {
    const remaining = entry.sleepImports.filter(
      (x) => sleepImportKey(x) !== sleepImportKey(incoming),
    );
    if (remaining.length !== entry.sleepImports.length)
      next = updateEntry(next, date, { sleepImports: remaining });
  }
  next = updateEntry(next, day, {
    sleepImports: [...(next.entries[day]?.sleepImports ?? []), incoming],
  });
  return next;
}
export function checkJournalSize(next: Journal): Journal {
  if (Object.keys(next.entries).length > 40000)
    throw new Error('These changes would exceed the journal entry limit. Nothing was changed.');
  // The existing 8 MiB vault envelope uses hex ciphertext (two characters per byte).
  // Leave space for the authentication tag and envelope before changing the live journal.
  if (new TextEncoder().encode(JSON.stringify(next)).length > 4 * 1024 * 1024 - 512)
    throw new Error(
      'These changes would exceed the preview journal limit. Export a backup and remove unwanted imported copies first. Nothing was changed.',
    );
  return next;
}
export function applySleepImport(journal: Journal, value: ImportedSleep, today: Day): Journal {
  return checkJournalSize(mergeSleepImport(journal, value, today));
}
// One transaction: failure in any session leaves the caller's journal untouched.
// Size is checked once after merging, rather than serializing the vault for every night.
export function applySleepImports(journal: Journal, values: ImportedSleep[], today: Day): Journal {
  if (!Array.isArray(values) || !values.length || values.length > 500)
    throw new Error('Choose between 1 and 500 sleep sessions.');
  const incoming = values.map(parseSleepImport);
  if (new Set(incoming.map(sleepImportKey)).size !== incoming.length)
    throw new Error('The selection contains duplicate sleep sessions. Reload and try again.');
  let next = journal;
  for (const value of incoming) next = mergeSleepImport(next, value, today);
  return checkJournalSize(next);
}
