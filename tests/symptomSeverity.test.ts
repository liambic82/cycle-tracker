import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { addDays } from '../src/domain/dates.ts';
import {
  emptyEntry,
  emptyJournal,
  parseJournal,
  toCSV,
  updateEntry,
  type Journal,
} from '../src/domain/journal.ts';
import {
  parseSymptomRatings,
  rateSymptom,
  recordedSymptoms,
  severityHistory,
  symptomSeverity,
} from '../src/domain/symptomSeverity.ts';
import { deleteEntry, undoEntryDeletion } from '../src/domain/deletion.ts';
import { openVaultWithKey, seal } from '../src/domain/vault.ts';
import { demoJournal } from '../src/data/demo.ts';

const today = '2026-10-10';
test('formats 1–4 migrate without inventing symptom ratings or losing cramps, medications, or doses', () => {
  const sample = demoJournal(today);
  for (const version of [1, 2, 3, 4]) {
    const entries = Object.fromEntries(
      Object.entries(sample.entries).map(([date, entry]) => {
        const { symptomRatings: _ratings, ...old } = entry;
        return [date, old];
      }),
    );
    const legacy = { ...sample, version, entries };
    const before = JSON.stringify(legacy);
    const migrated = parseJournal(legacy);
    assert.equal(migrated.version, 6);
    assert.equal(JSON.stringify(legacy), before);
    for (const [date, entry] of Object.entries(migrated.entries)) {
      assert.deepEqual(entry.symptomRatings, []);
      assert.equal(entry.cramps, sample.entries[date]!.cramps);
      assert.deepEqual(entry.symptoms, sample.entries[date]!.symptoms);
      assert.equal(entry.note, sample.entries[date]!.note);
      assert.deepEqual(entry.doseRecords, version >= 4 ? sample.entries[date]!.doseRecords : []);
    }
    assert.deepEqual(migrated.medications, version >= 4 ? sample.medications : []);
  }
});

test('new format requires bounded, unique ratings for exact logged non-cramp labels', () => {
  const labels = ['Cramps', 'Fatigue', '__proto__', 'Custom'];
  const valid = [
    { symptom: 'Fatigue', value: 0 },
    { symptom: '__proto__', value: 10 },
  ];
  assert.deepEqual(parseSymptomRatings(valid, labels), valid);
  for (const invalid of [
    undefined,
    null,
    {},
    '0',
    [null],
    [{ symptom: 'Cramps', value: 3 }],
    [{ symptom: 'fatigue', value: 3 }],
    [{ symptom: 'Unknown', value: 3 }],
    [{ symptom: '', value: 0 }],
    [valid[0], valid[0]],
    ...[-1, 11, 0.5, NaN, Infinity, null, '3', true].map((value) => [
      { symptom: 'Fatigue', value },
    ]),
  ]) {
    assert.throws(() =>
      parseJournal({
        ...emptyJournal(today),
        entries: { [today]: { ...emptyEntry(), symptoms: labels, symptomRatings: invalid } },
      }),
    );
  }
  assert.throws(() =>
    parseSymptomRatings(
      Array.from({ length: 201 }, (_, n) => ({ symptom: `s${n}`, value: 1 })),
      Array.from({ length: 201 }, (_, n) => `s${n}`),
    ),
  );
  assert.throws(() =>
    parseSymptomRatings([{ symptom: 'x'.repeat(61), value: 1 }], ['x'.repeat(61)]),
  );
});

test('rating, clearing, removing and re-adding keep missing distinct from zero and preserve other fields', () => {
  let journal = updateEntry(emptyJournal(today), today, {
    symptoms: ['Fatigue', 'Cramps', 'Hot flashes'],
    cramps: 6,
    note: 'Keep',
    flow: 'medium',
  });
  const original = journal;
  assert.equal(symptomSeverity(journal.entries[today]!, 'Fatigue'), null);
  journal = updateEntry(journal, today, rateSymptom(journal.entries[today]!, 'Fatigue', 0));
  journal = updateEntry(journal, today, rateSymptom(journal.entries[today]!, 'Hot flashes', 10));
  assert.equal(symptomSeverity(journal.entries[today]!, 'Fatigue'), 0);
  assert.equal(symptomSeverity(original.entries[today]!, 'Fatigue'), null);
  journal = updateEntry(journal, today, rateSymptom(journal.entries[today]!, 'Cramps', null));
  assert.equal(journal.entries[today]!.cramps, null);
  assert.ok(journal.entries[today]!.symptoms.includes('Cramps'));
  journal = updateEntry(journal, today, rateSymptom(journal.entries[today]!, 'Fatigue', null));
  assert.ok(journal.entries[today]!.symptoms.includes('Fatigue'));
  assert.equal(symptomSeverity(journal.entries[today]!, 'Hot flashes'), 10);
  journal = updateEntry(journal, today, { symptoms: ['Fatigue'] });
  journal = updateEntry(journal, today, { symptoms: ['Fatigue', 'Hot flashes'] });
  assert.equal(symptomSeverity(journal.entries[today]!, 'Hot flashes'), null);
  assert.equal(journal.entries[today]!.note, 'Keep');
  assert.equal(journal.entries[today]!.flow, 'medium');
  assert.throws(() => rateSymptom(journal.entries[today]!, 'Cramps', 5));
  assert.throws(() => rateSymptom(journal.entries[today]!, 'Fatigue', 1.5));
  assert.throws(() =>
    updateEntry(journal, today, { symptomRatings: [{ symptom: 'Cramps', value: 5 }] }),
  );
  const zeroOnly = updateEntry(emptyJournal(today), today, {
    symptoms: ['Fatigue'],
    symptomRatings: [{ symptom: 'Fatigue', value: 0 }],
  });
  assert.ok(zeroOnly.entries[today]);
  assert.deepEqual(updateEntry(zeroOnly, today, { symptoms: [] }).entries, {});
});

test('full-entry deletion snapshots and Undo preserve ratings independently', () => {
  const original = updateEntry(emptyJournal(today), today, {
    symptoms: ['Fatigue'],
    symptomRatings: [{ symptom: 'Fatigue', value: 0 }],
  });
  const { journal, deleted } = deleteEntry(original, today)!;
  assert.equal(journal.entries[today], undefined);
  assert.deepEqual(undoEntryDeletion(journal, deleted), original);
  original.entries[today]!.symptomRatings[0]!.value = 8;
  assert.equal(deleted.entry.symptomRatings[0]!.value, 0);
});

test('encrypted backups round-trip all ratings and restore actual format-4 content with the same key', () => {
  const journal = demoJournal(today);
  const vault = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  assert.deepEqual(openVaultWithKey(seal(journal, vault, randomBytes), vault), journal);
  const legacy = {
    ...journal,
    version: 4,
    entries: Object.fromEntries(
      Object.entries(journal.entries).map(([date, entry]) => {
        const { symptomRatings: _ratings, ...old } = entry;
        return [date, old];
      }),
    ),
  };
  assert.deepEqual(
    openVaultWithKey(seal(legacy as unknown as Journal, vault, randomBytes), vault),
    parseJournal(legacy),
  );
  vault.key.fill(0);
});

test('history uses inclusive calendar dates, excludes future records, and never turns unknown into zero', () => {
  let journal = emptyJournal(today);
  for (const [offset, value] of [
    [0, 0],
    [-2, null],
    [-29, 10],
    [-30, 7],
    [1, 9],
  ] as const) {
    journal = updateEntry(journal, addDays(today, offset), {
      symptoms: ['Fatigue'],
      symptomRatings: value === null ? [] : [{ symptom: 'Fatigue', value }],
    });
  }
  journal = updateEntry(journal, addDays(today, -1), { note: 'Not a symptom record' });
  journal = updateEntry(journal, addDays(today, 1), { symptoms: ['Future only'] });
  assert.deepEqual(recordedSymptoms(journal, today), ['Fatigue']);
  const result = severityHistory(journal, 'Fatigue', today, 30);
  assert.deepEqual(result.records, [
    { date: addDays(today, -29), value: 10 },
    { date: addDays(today, -2), value: null },
    { date: today, value: 0 },
  ]);
  assert.equal(result.rated, 2);
  assert.equal(result.unrated, 1);
  assert.equal(result.notLogged, 27);
  assert.equal(severityHistory(journal, 'Fatigue', today, 90).records.length, 4);
  assert.equal(severityHistory(journal, 'Cramps', today, 365).notLogged, 365);
  const leap = severityHistory(emptyJournal('2024-03-01'), 'Fatigue', '2024-03-01', 30);
  assert.equal(leap.from, '2024-02-01');
  assert.equal(
    severityHistory(emptyJournal('1900-01-01'), 'Fatigue', '1900-01-01', 30).notLogged,
    1,
  );
});

test('legacy cramps and hidden perimenopause/custom labels remain available in history', () => {
  const journal = updateEntry(emptyJournal(today), today, {
    symptoms: ['Cramps', 'Hot flashes', 'My symptom'],
    cramps: 0,
    symptomRatings: [{ symptom: 'Hot flashes', value: 8 }],
  });
  journal.preferences.showPerimenopause = false;
  assert.deepEqual(recordedSymptoms(journal, today), ['Cramps', 'Hot flashes', 'My symptom']);
  assert.equal(severityHistory(journal, 'Cramps', today, 30).records[0]!.value, 0);
  assert.equal(severityHistory(journal, 'Hot flashes', today, 30).records[0]!.value, 8);
  assert.equal(severityHistory(journal, 'My symptom', today, 30).records[0]!.value, null);
});

test('CSV retains zero, quotes custom ratings and prevents formula execution without opting in sexual fields', () => {
  const journal = updateEntry(emptyJournal(today), today, {
    symptoms: ['=Custom,"quoted"'],
    symptomRatings: [{ symptom: '=Custom,"quoted"', value: 0 }],
    sexualHealth: { activity: true, intensity: 'gentle', libido: null, orgasm: null },
  });
  const csv = toCSV(journal);
  assert.ok(csv.includes('"Other symptom severity (0-10)"'));
  assert.ok(csv.includes('"\'=Custom,""quoted"": 0/10"'));
  assert.ok(!csv.includes('gentle'));
  assert.ok(!csv.includes('Sexual activity'));
});
