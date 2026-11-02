// Fictional data for the disposable Android emulator only. Outputs stay ignored.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { fictionalJournal } from './fictional-journal.ts';
import { emptyMedicalRecord } from '../src/domain/medicalRecords.ts';
import { checkJournalSize } from '../src/domain/sleepImport.ts';
import { newKey, seal, openVaultWithKey } from '../src/domain/vault.ts';

const directory = 'artifacts/qa/native-recovery';
const today = process.argv[2] || '2026-11-02';
export const fictionalPassphrase = 'Fictional native QA 2026';
await mkdir(directory, { recursive: true });
const vault = await newKey(fictionalPassphrase, randomBytes);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const cases = [
  ['one-year', 365, 0],
  ['ten-years', 3650, 0],
  ['near-limit', 4900, 0],
  ['attachments', 1825, 3],
];
const results = [];
try {
  for (const [name, count, attachments] of cases) {
    const journal = fictionalJournal(count, today);
    const attachmentHashes = [];
    for (let i = 0; i < attachments; i++) {
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      pdf.addPage().drawText(`Fictional native QA attachment ${i + 1}`, { x: 30, y: 740, font });
      const original = Buffer.from(await pdf.save());
      // PDF comments provide a reproducible large, valid attachment without real data.
      const padding = Buffer.from('\n% ' + 'Synthetic fixture padding. '.repeat(16000));
      const bytes = Buffer.concat([original, padding]).subarray(0, 384 * 1024);
      assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
      attachmentHashes.push({ bytes: bytes.length, sha256: digest(bytes) });
      journal.medicalRecords.push({
        ...emptyMedicalRecord(`native-attachment-${i}`, 'lab', today),
        title: `Fictional attachment ${i + 1}`,
        value: 'Synthetic result for storage testing',
        attachments: [
          {
            id: `synthetic-pdf-${i}`,
            name: `fictional-${i + 1}.pdf`,
            mime: 'application/pdf',
            hex: bytes.toString('hex'),
          },
        ],
      });
    }
    checkJournalSize(journal);
    const encrypted = seal(journal, vault, randomBytes);
    assert.deepEqual(openVaultWithKey(encrypted, vault), journal);
    await writeFile(`${directory}/${name}.cyclevault`, encrypted);
    await writeFile(`${directory}/${name}.json`, JSON.stringify(journal));
    results.push({
      name,
      fictional: true,
      today,
      entries: count,
      medicalRecords: journal.medicalRecords.length,
      attachmentHashes,
      plainBytes: Buffer.byteLength(JSON.stringify(journal)),
      encryptedBytes: Buffer.byteLength(encrypted),
      sha256: digest(encrypted),
    });
  }
} finally {
  vault.key.fill(0);
}
await writeFile(`${directory}/fixtures.json`, JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
