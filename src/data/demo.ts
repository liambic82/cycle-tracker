import { addDays, type Day } from '../domain/dates.ts';
import { emptyEntry, emptyJournal, type Journal } from '../domain/journal.ts';
import { parseMedications, plannedDoses } from '../domain/medications.ts';
import { recordDose } from '../domain/medicationActions.ts';

export function demoJournal(today: Day): Journal {
  const journal = emptyJournal(today);
  const samplePlan = {
    startsOn: addDays(today, -10),
    kind: 'supplement',
    dose: '1 sample tablet',
    instructions: 'Fictional sample only.',
    mode: 'daily',
    times: ['08:00'],
    weekdays: [],
    onDays: null,
    offDays: null,
    offDose: null,
  };
  journal.medications = parseMedications([
    {
      id: 'sample-supplement',
      plans: [{ ...samplePlan, id: 'sample-daily-plan', name: 'Sample supplement' }],
    },
    {
      id: 'sample-as-needed',
      plans: [
        {
          ...samplePlan,
          id: 'sample-prn-plan',
          kind: 'medication',
          name: 'Sample as-needed medicine',
          mode: 'as-needed',
          times: [],
        },
      ],
    },
  ]);
  for (const offset of [-187, -157, -128, -98, -69, -39, -10]) {
    for (let day = 0; day < 5; day++) {
      journal.entries[addDays(today, offset + day)] = {
        ...emptyEntry(),
        flow: day < 2 ? 'medium' : 'light',
        flowRecorded: true,
        periodStart: day === 0,
        periodEnd: day === 4,
        symptoms: day < 2 ? ['Cramps', 'Fatigue'] : [],
        cramps: day < 2 ? (day === 0 ? 6 : 3) : null,
        symptomRatings: day < 2 ? [{ symptom: 'Fatigue', value: day === 0 ? 5 : 2 }] : [],
        note: day === 0 ? 'A quiet evening and a heating pad helped.' : '',
        productRecords:
          day === 0
            ? [
                {
                  id: `sample-pad-${-offset}`,
                  type: 'pad',
                  action: 'changed',
                  quantity: 1,
                  time: '08:30',
                  detail: 'Regular',
                  collectedMl: null,
                },
              ]
            : [],
        clots: day === 0 ? false : null,
        flooding: day === 0 ? false : null,
      };
    }
  }
  for (const offset of [-63, -62, -33, -32, -4]) {
    journal.entries[addDays(today, offset)] = { ...emptyEntry(), flowRecorded: true };
  }
  journal.entries[addDays(today, -3)] = {
    ...emptyEntry(),
    symptoms: ['Sleep disruption'],
    note: 'Woke up early. A gentle walk felt good.',
  };
  journal.entries[today] = {
    ...emptyEntry(),
    symptoms: ['Bloating'],
    symptomRatings: [{ symptom: 'Bloating', value: 2 }],
    note: '',
    sexualHealth: { activity: null, intensity: null, orgasm: null, libido: 'moderate' },
  };
  return recordDose(
    journal,
    today,
    today,
    plannedDoses(journal.medications, today)[0]!,
    'sample-dose-today',
    {
      status: 'taken',
      actualDose: '1 sample tablet',
      takenOn: today,
      actualTime: '08:15',
      note: 'Invented example.',
    },
  );
}
