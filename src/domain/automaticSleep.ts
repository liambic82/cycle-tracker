import type { Day } from './dates.ts';
import type { Journal } from './journal.ts';
import {
  applySleepImports,
  checkJournalSize,
  existingSleepImport,
  overlappingSleepImports,
  parseSleepImport,
  sleepImportKey,
  sleepImportState,
  sleepWakingDay,
} from './sleepImport.ts';

export function planAutomaticSleep(journal: Journal, raw: unknown[], today: Day, at: string) {
  if (!Array.isArray(raw) || raw.length > 500)
    throw new Error('Too many sleep sessions. Use manual import to review them.');
  const all = raw.map(parseSleepImport);
  if (new Set(all.map(sleepImportKey)).size !== all.length)
    throw new Error('Duplicate source records. Try checking sleep again.');
  const preferences = journal.preferences.sleepAutomation;
  if (!preferences.enabled || !preferences.source)
    throw new Error('Automatic sleep import is off.');
  const suppressed = new Set(preferences.suppressed);
  const source = all
    .filter((r) => r.sourcePackage === preferences.source)
    .map((r) => {
      const old = existingSleepImport(journal, r);
      return old ? { ...r, fallbackOffset: old.fallbackOffset } : r;
    });
  let review = 0;
  const added = source.filter((record) => {
    if (suppressed.has(sleepImportKey(record))) return false;
    const state = sleepImportState(journal, record);
    if (state === 'unchanged' || state === 'older') return false;
    const overlap =
      overlappingSleepImports(journal, record).length > 0 ||
      source.some(
        (other) =>
          sleepImportKey(other) !== sleepImportKey(record) &&
          other.start < record.end &&
          other.end > record.start,
      );
    if (state === 'updated' || overlap || sleepWakingDay(record) > today) {
      review++;
      return false;
    }
    return true;
  });
  const next = added.length ? applySleepImports(journal, added, today) : journal;
  const result = { at, added: added.length, review, sourceSeen: source.length > 0 };
  return checkJournalSize({
    ...next,
    preferences: { ...next.preferences, sleepAutomation: { ...preferences, lastCheck: result } },
  });
}
