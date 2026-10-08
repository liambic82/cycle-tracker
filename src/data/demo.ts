import { addDays, type Day } from '../domain/dates.ts';
import { emptyEntry, emptyJournal, type Journal } from '../domain/journal.ts';

export function demoJournal(today: Day): Journal {
  const journal = emptyJournal(today);
  for (const offset of [-69, -39, -10]) {
    for (let day = 0; day < 5; day++) {
      journal.entries[addDays(today, offset + day)] = {
        ...emptyEntry(),
        flow: day < 2 ? 'medium' : 'light',
        periodStart: day === 0,
        periodEnd: day === 4,
        symptoms: day < 2 ? ['Cramps', 'Fatigue'] : [],
        cramps: day < 2 ? 4 : null,
        note: day === 0 ? 'A quiet evening and a heating pad helped.' : '',
      };
    }
  }
  journal.entries[addDays(today, -3)] = {
    ...emptyEntry(),
    symptoms: ['Sleep disruption'],
    note: 'Woke up early. A gentle walk felt good.',
  };
  journal.entries[today] = { ...emptyEntry(), symptoms: ['Bloating'], note: '' };
  return journal;
}
