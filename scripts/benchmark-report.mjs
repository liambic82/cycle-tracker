// Fictional PDF profile. Instrumentation adds overhead: counts identify repeated
// work; native file-ready observations remain a separate measurement.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, PDFFont } from 'pdf-lib';
import { fictionalJournal } from './fictional-journal.ts';
import { createDoctorReport, defaultReportOptions } from '../src/domain/report.ts';
import { createReportPdf } from '../src/domain/reportPdf.ts';
import { addDays } from '../src/domain/dates.ts';

const counters = {};
for (const name of ['widthOfTextAtSize', 'encodeText']) {
  const original = PDFFont.prototype[name];
  const row = (counters[name] = { calls: 0, ms: 0, unique: new Set() });
  PDFFont.prototype[name] = function (...args) {
    const start = performance.now();
    try {
      return original.apply(this, args);
    } finally {
      row.calls++;
      row.ms += performance.now() - start;
      row.unique.add(this.name + JSON.stringify(args));
    }
  };
}
for (const name of ['embedFont', 'save']) {
  const original = PDFDocument.prototype[name];
  const row = (counters[name] = { calls: 0, ms: 0 });
  PDFDocument.prototype[name] = async function (...args) {
    const start = performance.now();
    try {
      return await original.apply(this, args);
    } finally {
      row.calls++;
      row.ms += performance.now() - start;
    }
  };
}
const today = '2026-11-02';
const report = createDoctorReport(
  fictionalJournal(1825, today),
  { ...defaultReportOptions(today), from: addDays(today, -365) },
  today,
);
const fonts = {
  regular: await readFile(new URL('../assets/fonts/NotoSans-Regular.ttf', import.meta.url)),
  bold: await readFile(new URL('../assets/fonts/NotoSans-Bold.ttf', import.meta.url)),
};
const start = performance.now();
const bytes = await createReportPdf(report, fonts);
const ms = performance.now() - start;
const result = {
  ms,
  bytes: bytes.length,
  counts: Object.fromEntries(
    Object.entries(counters).map(([key, value]) => [key, { ...value, unique: value.unique?.size }]),
  ),
};
const out = new URL('../artifacts/performance/report/', import.meta.url);
await mkdir(out, { recursive: true });
await writeFile(new URL('fictional-report.pdf', out), bytes);
await writeFile(new URL('profile.json', out), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
