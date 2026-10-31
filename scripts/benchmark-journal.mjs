import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { fictionalJournal } from './fictional-journal.ts';
import { addDays, monthCells } from '../src/domain/dates.ts';
import { history, toCSV } from '../src/domain/journal.ts';
import { cycleDayLookup, flowTimeline } from '../src/domain/history.ts';
import { checkJournalSize } from '../src/domain/sleepImport.ts';
import { openVaultWithKey, seal } from '../src/domain/vault.ts';
import { createDoctorReport, defaultReportOptions } from '../src/domain/report.ts';
import { createReportPdf } from '../src/domain/reportPdf.ts';
import { PDFDocument } from 'pdf-lib';
import { JournalWriter, STORAGE_KEY } from '../src/data/repository.ts';

const today = '2026-10-30';
const vault = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
const fonts = {
  regular: await readFile(new URL('../assets/fonts/NotoSans-Regular.ttf', import.meta.url)),
  bold: await readFile(new URL('../assets/fonts/NotoSans-Bold.ttf', import.meta.url)),
};
const samples = 7;
async function measure(work) {
  await work(); // Warm-up excluded; this is a local diagnostic, not a device SLA.
  const times = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    await work();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return { medianMs: +times[3].toFixed(2), maxMs: +times.at(-1).toFixed(2) };
}
const result = {
  generated: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  cpu: cpus()[0]?.model,
  samples,
  scope:
    'Fictional data; desktop Node. Save sink is memory, not Android SQLite/files. Unlock excludes passphrase derivation. No phone claims.',
  cases: [],
};
for (const count of [365, 1825, 3650, 4900]) {
  const journal = checkJournalSize(fictionalJournal(count));
  const encrypted = seal(journal, vault, randomBytes);
  assert.deepEqual(openVaultWithKey(encrypted, vault), journal);
  const options = { ...defaultReportOptions(today), from: addDays(today, -365) };
  const report = createDoctorReport(journal, options, today, true);
  const pdf = await createReportPdf(report, fonts);
  const pages = (await PDFDocument.load(pdf)).getPageCount();
  const timings = {
    sizeCheck: await measure(() => checkJournalSize(journal)),
    sealBackup: await measure(() => seal(journal, vault, randomBytes)),
    reopenAndValidate: await measure(() => openVaultWithKey(encrypted, vault)),
    calendarYear: await measure(() => {
      const dayNumber = cycleDayLookup(journal, today);
      for (let month = 1; month <= 12; month++)
        for (const day of monthCells(`2026-${String(month).padStart(2, '0')}-01`)) {
          if (day) {
            dayNumber(day);
            journal.medicalRecords.filter((record) => record.date === day);
          }
        }
    }),
    history: await measure(() => {
      const cycles = history(journal, today);
      for (const cycle of cycles.slice(-12)) flowTimeline(journal, cycle.start, cycle.end ?? today);
    }),
    csv: await measure(() => toCSV(journal)),
    report366Days: await measure(() => createDoctorReport(journal, options, today, true)),
    pdf366Days: await measure(() => createReportPdf(report, fonts)),
  };
  let saved = '',
    writes = 0;
  const writer = new JournalWriter(
    {
      async getItem() {
        return saved;
      },
      async setItem(key, raw) {
        assert.equal(key, STORAGE_KEY);
        saved = raw;
        writes++;
      },
      async removeItem() {
        saved = '';
      },
    },
    vault,
    randomBytes,
  );
  const start = performance.now();
  const edits = Array.from({ length: 20 }, (_, i) =>
    writer.save({ ...journal, selectedDate: addDays(today, -i) }),
  );
  await Promise.all(edits);
  assert.equal(openVaultWithKey(saved, vault).selectedDate, addDays(today, -19));
  const row = {
    entries: count,
    plainBytes: Buffer.byteLength(JSON.stringify(journal)),
    encryptedBytes: encrypted.length,
    pdfPages: pages,
    timings,
    burst20: { ms: +(performance.now() - start).toFixed(2), writes },
  };
  result.cases.push(row);
  console.log(JSON.stringify(row));
}
vault.key.fill(0);
await mkdir('artifacts/performance', { recursive: true });
await writeFile(
  'artifacts/performance/journal-benchmark.json',
  JSON.stringify(result, null, 2) + '\n',
);
