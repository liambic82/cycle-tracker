import type { Day } from './dates.ts';
import type { Entry, Journal } from './journal.ts';

export interface DeletedEntry {
  date: Day;
  entry: Entry;
}

export function deleteEntry(journal: Journal, date: Day) {
  const entry = journal.entries[date];
  if (!entry) return null;
  const entries = { ...journal.entries };
  delete entries[date];
  return {
    journal: { ...journal, entries },
    deleted: {
      date,
      entry: {
        ...entry,
        symptoms: [...entry.symptoms],
        symptomRatings: entry.symptomRatings.map((rating) => ({ ...rating })),
        sleep: { ...entry.sleep },
        productRecords: entry.productRecords.map((record) => ({ ...record })),
        sexualHealth: { ...entry.sexualHealth },
        doseRecords: entry.doseRecords.map((record) => ({ ...record })),
      },
    },
  };
}

export function undoEntryDeletion(journal: Journal, deleted: DeletedEntry): Journal {
  // Undo must never replace a new entry written since deletion.
  if (journal.entries[deleted.date]) return journal;
  return {
    ...journal,
    entries: { ...journal.entries, [deleted.date]: deleted.entry },
  };
}
