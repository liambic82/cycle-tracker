import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { toCSV } from '../src/domain/journal.ts';
import { addDays } from '../src/domain/dates.ts';
import { createDoctorReport, defaultReportOptions } from '../src/domain/report.ts';
import { createReportPdf } from '../src/domain/reportPdf.ts';

const directory = 'artifacts/qa/native-recovery';
const fixture = JSON.parse(await readFile(`${directory}/attachments.json`, 'utf8'));
const today = fixture.selectedDate;
const csv = await readFile(`${directory}/attachments-exported.csv`, 'utf8');
assert.equal(csv, toCSV(fixture));
const options = { ...defaultReportOptions(today), from: addDays(today, -365) };
const expected = await PDFDocument.load(
  await createReportPdf(createDoctorReport(fixture, options, today, false), {
    regular: await readFile('assets/fonts/NotoSans-Regular.ttf'),
    bold: await readFile('assets/fonts/NotoSans-Bold.ttf'),
  }),
);
const actual = await PDFDocument.load(
  await readFile(`${directory}/attachments-report-366-days.pdf`),
);
assert.equal(actual.getPageCount(), expected.getPageCount());
assert.deepEqual(
  actual.getPages().map((p) => p.getSize()),
  expected.getPages().map((p) => p.getSize()),
);
console.log(
  JSON.stringify({
    csv: 'exact match',
    pdf: 'valid PDF; page count and sizes match the same report generated on desktop',
    pages: actual.getPageCount(),
  }),
);
