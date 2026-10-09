import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  addCustomSymptom,
  emptyJournal,
  parseJournal,
  toCSV,
  updateEntry,
} from '../src/domain/journal.ts';
import { newKey, openVault, seal } from '../src/domain/vault.ts';
import {
  MAX_DAILY_SYMPTOMS,
  SYMPTOM_GROUPS,
  symptomSections,
  symptomSelected,
  toggleSymptom,
  validateCustomSymptom,
} from '../src/domain/symptoms.ts';

test('expanded catalog retains every label from the 0.3 preview without duplicate identities', () => {
  const labels = Object.values(SYMPTOM_GROUPS).flat();
  const old = [
    'Cramps',
    'Bloating',
    'Headache',
    'Breast tenderness',
    'Fatigue',
    'Back pain',
    'Nausea',
    'Migraine',
    'Pelvic pressure',
    'Mood swings',
    'Irritability',
    'Anxiety',
    'Low mood',
    'Brain fog',
    'Trouble concentrating',
    'Overwhelm',
    'Hot flashes',
    'Night sweats',
    'Sleep disruption',
    'Joint aches',
    'Vaginal dryness',
    'Heart palpitations',
    'Itchy skin',
    'Dry eyes',
    'Tingling',
    'Restless legs',
    'Dizziness',
    'Acid reflux',
    'Ringing in ears',
    'Hair changes',
  ];
  for (const label of old) assert.ok(labels.includes(label as never), label);
  assert.equal(new Set(labels.map((label) => label.toLowerCase())).size, labels.length);
  assert.ok(labels.every((label) => label.length <= 60));
});

test('search covers aliases and custom labels, filters categories, and hides curated perimenopause choices', () => {
  const labels = (show: boolean, query: string) =>
    symptomSections(['My symptom'], show, 'All', query).flatMap((s) => s.labels);
  assert.deepEqual(labels(true, 'lower back'), ['Back pain']);
  assert.deepEqual(labels(true, '  MY  '), ['My symptom']);
  assert.deepEqual(labels(true, 'hot flashes'), ['Hot flashes']);
  assert.deepEqual(labels(false, 'hot flashes'), []);
  assert.deepEqual(symptomSections([], true, 'Mood & mind', 'hot flashes'), []);
  assert.deepEqual(labels(true, 'no-such-symptom'), []);
  assert.ok(
    symptomSections([], false, 'More symptoms', 'itchy')
      .flatMap((s) => s.labels)
      .includes('Itchy ears'),
  );
});

test('new catalog matches do not duplicate or rename older custom labels', () => {
  const sections = symptomSections(['acne', 'ACNE', 'My symptom'], true);
  assert.equal(
    sections.flatMap((s) => s.labels).filter((s) => s.toLowerCase() === 'acne').length,
    1,
  );
  assert.deepEqual(sections.find((s) => s.category === 'Your symptoms')?.labels, [
    'acne',
    'My symptom',
  ]);
  assert.equal(symptomSelected(['acne'], 'Acne'), true);
  assert.deepEqual(toggleSymptom(['acne', 'Old imported label'], 'Acne'), ['Old imported label']);
  assert.throws(() => validateCustomSymptom(' ACNE ', []), /already available/);
  assert.throws(() => validateCustomSymptom('hot flashes', []), /already available/);
  assert.throws(() => validateCustomSymptom(' x ', ['X']), /already available/);
});

test('0.3 journal imports default to visible choices and retain unknown/custom symptom strings', () => {
  const { preferences: _preferences, ...legacy } = updateEntry(
    emptyJournal('2026-10-09'),
    '2026-10-09',
    {
      symptoms: ['Back pain', 'Hot flashes', 'An old imported label'],
      note: 'Fictional migration check',
    },
  );
  legacy.customSymptoms.push('Personal label');
  const parsed = parseJournal(legacy);
  assert.deepEqual(parsed.entries, legacy.entries);
  assert.deepEqual(parsed.customSymptoms, legacy.customSymptoms);
  assert.equal(parsed.preferences.showPerimenopause, true);
  for (const preferences of [
    null,
    false,
    {},
    { showPerimenopause: 'false' },
    { showPerimenopause: 0 },
  ])
    assert.throws(() => parseJournal({ ...legacy, preferences }));
  assert.deepEqual(
    parseJournal({ ...legacy, preferences: { showPerimenopause: false, unknown: 1 } }).preferences,
    { showPerimenopause: false },
  );
});

test('hidden-category entries and the preference survive encrypted restore and remain in CSV', async () => {
  const journal = updateEntry(emptyJournal('2026-10-09'), '2026-10-09', {
    symptoms: ['Hot flashes', 'Sleep disruption', 'Itchy ears'],
  });
  journal.preferences.showPerimenopause = false;
  const vault = await newKey('fictional symptom backup test', randomBytes);
  const restored = await openVault(
    seal(journal, vault, randomBytes),
    'fictional symptom backup test',
  );
  assert.deepEqual(restored.journal, journal);
  assert.ok(toCSV(restored.journal).includes('Hot flashes; Sleep disruption; Itchy ears'));
  assert.ok(!symptomSections([], false).some((section) => section.category === 'Perimenopause'));
  assert.deepEqual(
    restored.journal.entries['2026-10-09']?.symptoms,
    journal.entries['2026-10-09']?.symptoms,
  );
  vault.key.fill(0);
  restored.vault.key.fill(0);
});

test('daily selection limits do not prevent removal or leave a partial custom addition', () => {
  const labels = Array.from({ length: MAX_DAILY_SYMPTOMS }, (_, i) => `Imported ${i}`);
  assert.throws(() => toggleSymptom(labels, 'Itchy ears'), /up to 200/);
  assert.equal(toggleSymptom(labels, 'Imported 0').length, MAX_DAILY_SYMPTOMS - 1);
  const journal = updateEntry(emptyJournal('2026-10-09'), '2026-10-09', { symptoms: labels });
  assert.throws(() => addCustomSymptom(journal, 'New label'), /up to 200/);
  assert.deepEqual(journal.customSymptoms, []);
  const defined = addCustomSymptom(journal, 'Imported 0');
  assert.deepEqual(defined.entries['2026-10-09']?.symptoms, labels);
  assert.deepEqual(defined.customSymptoms, ['Imported 0']);
  assert.throws(
    () =>
      validateCustomSymptom(
        'New label',
        Array.from({ length: 100 }, (_, i) => `Custom ${i}`),
      ),
    /up to 100/,
  );
});
