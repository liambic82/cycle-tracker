import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { emptyEntry, emptyJournal } from '../src/domain/journal.ts';
import {
  createDoctorReport,
  defaultReportOptions,
  REPORT_SECTIONS,
  type ReportSectionKey,
} from '../src/domain/report.ts';
import { createReportPdf, layoutReport, wrapReportText } from '../src/domain/reportPdf.ts';
import { SEXUAL_HEALTH_FIELDS } from '../src/domain/sexualHealth.ts';

const today = '2026-10-09';
const options = () => ({ ...defaultReportOptions(today), from: '2026-09-01' });
function journal() {
  const value = emptyJournal(today);
  value.entries = {
    '2026-08-30': {
      ...emptyEntry(),
      note: 'OUTSIDE_BEFORE',
      periodStart: true,
      flowRecorded: true,
      flow: 'light',
    },
    '2026-09-01': { ...emptyEntry(), flowRecorded: true, flow: 'heavy', periodStart: true },
    '2026-09-05': { ...emptyEntry(), flowRecorded: true, flow: 'light', periodEnd: true },
    '2026-09-29': { ...emptyEntry(), flowRecorded: true, flow: 'medium', periodStart: true },
    '2026-10-01': {
      ...emptyEntry(),
      flowRecorded: true,
      flow: 'none',
      clots: false,
      flooding: true,
      symptoms: ['Cramps', 'Anxiety', 'Custom café symptom', 'High libido'],
      cramps: 0,
      note: 'PRIVATE_NOTE',
    },
    '2026-10-08': {
      ...emptyEntry(),
      sexualHealth: { activity: false, intensity: 'gentle', orgasm: false, libido: 'none' },
    },
    '2026-10-10': { ...emptyEntry(), note: 'OUTSIDE_AFTER' },
  };
  return value;
}
function only(...keys: ReportSectionKey[]) {
  const selection = options();
  for (const key of Object.keys(REPORT_SECTIONS) as ReportSectionKey[])
    selection.sections[key] = keys.includes(key);
  return selection;
}
const text = (value: unknown) => JSON.stringify(value);

test('report defaults are independent and keep notes and all sexual fields off', () => {
  const first = defaultReportOptions(today),
    second = defaultReportOptions(today);
  first.sections.notes = true;
  first.sexualHealth.activity = true;
  assert.equal(second.sections.notes, false);
  assert.ok(Object.values(second.sexualHealth).every((value) => value === false));
  const report = createDoctorReport(journal(), second, today);
  assert.ok(!text(report).includes('PRIVATE_NOTE'));
  assert.ok(!text(report).includes('2026-10-08'));
  assert.ok(!text(report).includes('OUTSIDE_AFTER'));
});

test('date range and explicit section choices reject invalid, future, reversed, or overlong reports', () => {
  for (const patch of [
    { from: '2026-02-30' },
    { through: '2026-10-10' },
    { from: '2026-10-09', through: '2026-09-01' },
    { from: '2025-01-01' },
  ]) {
    assert.throws(() => createDoctorReport(journal(), { ...options(), ...patch }, today));
  }
  assert.throws(() => createDoctorReport(journal(), only(), today), /at least one/);
  const corrupted = only();
  corrupted.sections.flow = 'true' as unknown as boolean;
  assert.throws(() => createDoctorReport(journal(), corrupted, today), /at least one/);
});

test('cycle statistics use both boundaries within the range and retain incomplete values', () => {
  const report = createDoctorReport(journal(), only('cycles'), today);
  const content = text(report);
  assert.ok(content.includes('average 28 days'));
  assert.ok(content.includes('average 5 days'));
  assert.ok(content.includes('not established in this range'));
  assert.ok(!content.includes('2026-08-30'));
  assert.ok(!content.includes('Anxiety'));
  assert.ok(!content.includes('PRIVATE_NOTE'));
});

test('flow statistics distinguish unlogged from explicit None and retain No observations', () => {
  const report = createDoctorReport(journal(), only('flow'), today);
  const content = text(report);
  assert.ok(
    content.includes(
      '39 calendar days: 3 with bleeding recorded, 0 spotting, 1 explicitly no flow, and 35 without a flow record',
    ),
  );
  assert.ok(content.includes('Clots noticed: No'));
  assert.ok(content.includes('Flooding noticed: Yes'));
  assert.ok(!content.includes('2026-10-08'));
});

test('symptoms and moods filter independently, keep custom labels, and preserve zero severity', () => {
  const symptoms = text(createDoctorReport(journal(), only('symptoms'), today));
  const moods = text(createDoctorReport(journal(), only('moods'), today));
  assert.ok(symptoms.includes('Custom café symptom'));
  assert.ok(symptoms.includes('Cramp severity: 0/10'));
  assert.ok(symptoms.includes('High libido')); // Label opt-in, not the separate structured field.
  assert.ok(!symptoms.includes('Anxiety'));
  assert.ok(moods.includes('Anxiety'));
  assert.ok(!moods.includes('Custom café symptom'));
  assert.ok(!moods.includes('Cramps'));
});

test('all sexual-field combinations include only chosen structured values and no excluded-only dates', () => {
  for (let mask = 0; mask < 16; mask++) {
    const selection = only('notes');
    SEXUAL_HEALTH_FIELDS.forEach((key, index) => {
      selection.sexualHealth[key] = !!(mask & (1 << index));
    });
    const report = createDoctorReport(journal(), selection, today);
    assert.equal(
      report.sections.length,
      1 + SEXUAL_HEALTH_FIELDS.filter((key) => selection.sexualHealth[key]).length,
    );
    assert.equal(text(report).includes('2026-10-08'), mask !== 0);
    if (selection.sexualHealth.activity)
      assert.equal(
        report.sections.find((section) => section.title === 'Sexual activity')!.blocks[0]!
          .paragraphs[0],
        'No',
      );
    if (selection.sexualHealth.libido)
      assert.equal(
        report.sections.find((section) => section.title === 'Libido')!.blocks[0]!.paragraphs[0],
        'None',
      );
  }
});

test('medication plans overlap the range while unrelated history and later changes stay out', () => {
  const value = journal();
  const plan = {
    id: 'old',
    startsOn: '2026-08-01',
    name: 'Old excluded name',
    dose: '1 test tablet',
    kind: 'medication' as const,
    mode: 'daily' as const,
    instructions: 'SCHEDULE_NOTE',
    times: ['08:00'],
    weekdays: [],
    onDays: null,
    offDays: null,
    offDose: null,
  };
  value.medications = [
    {
      id: 'med',
      plans: [
        plan,
        { ...plan, id: 'active', startsOn: '2026-08-20', name: 'Active fictional medicine' },
        { ...plan, id: 'future', startsOn: '2026-10-10', name: 'Future excluded name' },
      ],
    },
  ];
  const report = createDoctorReport(value, only('medications'), today);
  const content = text(report);
  assert.ok(
    content.includes(
      'Plan effective from 2026-08-20. Applies in this report: 2026-09-01 to 2026-10-09',
    ),
  );
  assert.ok(content.includes('Active fictional medicine'));
  assert.ok(!content.includes('Old excluded name'));
  assert.ok(!content.includes('Future excluded name'));
  assert.ok(!content.includes('SCHEDULE_NOTE'));
  assert.ok(
    text(createDoctorReport(value, only('medications', 'notes'), today)).includes('SCHEDULE_NOTE'),
  );
  assert.ok(!text(createDoctorReport(value, only('notes'), today)).includes('SCHEDULE_NOTE'));
});

test('dose records preserve snapshots, outcomes and actual dates without inferring adherence', () => {
  const value = journal();
  value.entries[today] = {
    ...emptyEntry(),
    doseRecords: [
      {
        id: 'dose',
        medicationId: 'med',
        planId: 'plan',
        name: 'Fictional snapshot',
        kind: 'supplement',
        plannedDose: '1 test amount',
        phase: 'regular',
        scheduledTime: '08:00',
        status: 'late',
        actualDose: 'Half a test amount',
        takenOn: '2026-10-08',
        actualTime: null,
        note: 'DOSE_NOTE',
      },
    ],
  };
  const report = createDoctorReport(value, only('doses'), today);
  assert.equal(report.sections[0]!.blocks[0]!.heading, today);
  assert.ok(text(report).includes('Fictional snapshot'));
  assert.ok(text(report).includes('Taken late'));
  assert.ok(text(report).includes('Taken 2026-10-08'));
  assert.ok(text(report).includes('time not logged'));
  assert.ok(!text(report).includes('DOSE_NOTE'));
  assert.ok(text(createDoctorReport(value, only('doses', 'notes'), today)).includes('DOSE_NOTE'));
});

test('report snapshot cannot reveal subsequent edits and never mutates the journal', () => {
  const value = journal(),
    before = text(value);
  const report = createDoctorReport(value, options(), today, true);
  assert.equal(text(value), before);
  assert.equal(report.sample, true);
  value.entries['2026-10-01']!.symptoms.push('LATER_EDIT');
  assert.ok(!text(report).includes('LATER_EDIT'));
  assert.ok(!text(report).includes('medicationId'));
});

test('oversized reports reject without silently dropping selected content', () => {
  const value = journal();
  for (let day = 1; day <= 25; day++)
    value.entries[`2026-09-${String(day).padStart(2, '0')}`] = {
      ...emptyEntry(),
      note: 'x'.repeat(10000),
    };
  assert.throws(() => createDoctorReport(value, only('notes'), today), /too large/);
});

const fonts = Promise.all([
  readFile(new URL('../assets/fonts/NotoSans-Regular.ttf', import.meta.url)),
  readFile(new URL('../assets/fonts/NotoSans-Bold.ttf', import.meta.url)),
]).then(([regular, bold]) => ({ regular, bold }));
async function embedded() {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const bytes = await fonts;
  return {
    pdf,
    regular: await pdf.embedFont(bytes.regular),
    bold: await pdf.embedFont(bytes.bold),
  };
}

test('PDF pagination wraps long notes, long words, Unicode, and blank lines within printable bounds', async () => {
  const { regular, bold } = await embedded();
  const value = journal();
  value.entries[today] = {
    ...emptyEntry(),
    note: ('Fictional café observation - naïve, résumé.\n\n' + 'a'.repeat(200) + '\n').repeat(35),
  };
  const report = createDoctorReport(value, only('notes'), today);
  const layout = layoutReport(report, regular, bold);
  assert.ok(layout.pages.length > 2);
  for (const page of layout.pages)
    for (const line of page) {
      assert.ok(line.y >= 62 && line.y <= 744);
      assert.ok((line.bold ? bold : regular).widthOfTextAtSize(line.text, line.size) <= 516.001);
    }
  const token = 'a'.repeat(200);
  assert.equal(wrapReportText(token, regular, 10, 100).join(''), token);
  assert.ok(layout.pages.flat().some((line) => line.text.includes('café')));
});

test('PDF creation embeds fonts, produces numbered pages and has no attachments or executable actions', async () => {
  const report = createDoctorReport(journal(), options(), today, true);
  const bytes = await createReportPdf(report, await fonts);
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 2);
  assert.equal(pdf.getTitle(), 'Cycle - Doctor summary');
  const catalog = pdf.catalog.toString();
  assert.ok(!catalog.includes('/OpenAction'));
  assert.ok(!catalog.includes('/EmbeddedFiles'));
  assert.ok(!catalog.includes('/JavaScript'));
  assert.equal(pdf.getPage(0).getWidth(), 612);
});

test('unsupported glyphs stop PDF export instead of producing invisible or substituted health text', async () => {
  const value = journal();
  value.entries[today] = { ...emptyEntry(), note: 'Unsupported: 🦄' };
  await assert.rejects(
    createReportPdf(createDoctorReport(value, only('notes'), today), await fonts),
    /cannot display/,
  );
  assert.ok(value.entries[today]!.note.includes('🦄'));
});
