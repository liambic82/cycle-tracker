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
    sleep: { durationMinutes: 375, quality: 'poor', wakings: 3 },
    note: 'Woke up early. A gentle walk felt good.',
  };
  journal.entries[today] = {
    ...emptyEntry(),
    symptoms: ['Bloating'],
    symptomRatings: [{ symptom: 'Bloating', value: 2 }],
    sleep: { durationMinutes: 450, quality: 'good', wakings: 1 },
    note: '',
    sexualHealth: { activity: null, intensity: null, orgasm: null, libido: 'moderate' },
  };
  journal.entries[today]!.dailyDetails = {
    ...journal.entries[today]!.dailyDetails,
    hotFlashes: 2,
    energy: 6,
    stress: 3,
    activityMinutes: 25,
    painLocations: ['Lower back'],
  };
  journal.medicalRecords = [
    {
      id: 'sample-lab',
      kind: 'lab',
      date: addDays(today, -5),
      time: null,
      title: 'Fictional lab example',
      detail: 'Fictional demonstration, not medical advice.',
      value: '12',
      unit: 'sample units',
      reference: '8–16 (fictional)',
      clinician: 'Sample clinic',
      resolved: false,
      attachments: [],
    },
    {
      id: 'sample-question',
      kind: 'question',
      date: null,
      time: null,
      title: 'What should I bring to my appointment?',
      detail: 'Fictional question.',
      value: '',
      unit: '',
      reference: '',
      clinician: '',
      resolved: false,
      attachments: [],
    },
  ];
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
