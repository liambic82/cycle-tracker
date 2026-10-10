import { addDays, type Day } from '../domain/dates.ts';
import type { ImportedSleep } from '../domain/sleepImport.ts';

// Deliberately fictional provider identity: never represents measured Inspire 3 output.
export function demoSleepImports(today: Day): ImportedSleep[] {
  const end = `${today}T07:00:00.000Z`,
    start = `${addDays(today, -1)}T23:00:00.000Z`;
  const first: ImportedSleep = {
    id: 'sample-main',
    sourcePackage: 'example.fictional.sleep',
    sourceName: 'Fictional Fitbit-style sample',
    device: 'Simulated tracker',
    start,
    end,
    startOffset: 0,
    endOffset: 0,
    fallbackOffset: 0,
    modified: `${today}T08:00:00.000Z`,
    imported: `${today}T08:00:00.000Z`,
    stages: [
      { start, end: `${today}T03:00:00.000Z`, type: 4 },
      { start: `${today}T03:00:00.000Z`, end: `${today}T03:30:00.000Z`, type: 1 },
      { start: `${today}T03:30:00.000Z`, end, type: 6 },
    ],
  };
  return [
    first,
    {
      ...first,
      id: 'sample-missing',
      start: `${addDays(today, -1)}T13:00:00.000Z`,
      end: `${addDays(today, -1)}T14:00:00.000Z`,
      stages: [],
    },
  ];
}
