import { addDays, type Day } from '../src/domain/dates.ts';
import { emptyEntry, emptyJournal } from '../src/domain/journal.ts';
import { emptyMedicalRecord } from '../src/domain/medicalRecords.ts';

// Synthetic stress data only. No imported records or research participants.
export function fictionalJournal(count: number, today: Day = '2026-10-30') {
  const journal = emptyJournal(today);
  for (let i = 0; i < count; i++) {
    const day = addDays(today, i - count + 1);
    const phase = i % 28;
    journal.entries[day] = {
      ...emptyEntry(),
      periodStart: phase === 0,
      periodEnd: phase === 4,
      flowRecorded: true,
      flow: phase < 5 ? 'medium' : 'none',
      symptoms: i % 3 === 0 ? ['Fatigue'] : [],
      note: 'Fictional performance record. '.repeat(3),
    };
    if (i % 7 === 0)
      journal.medicalRecords.push({
        ...emptyMedicalRecord(`fictional-${i}`, 'question', day),
        title: 'Fictional question',
        detail: 'Synthetic data for performance checks.',
      });
  }
  return journal;
}
