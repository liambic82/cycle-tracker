import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  emptyEntry,
  emptyJournal,
  hasEntry,
  history,
  parseJournal,
  toCSV,
  updateEntry,
  type Journal,
} from '../src/domain/journal.ts';
import {
  MAX_PRODUCT_RECORDS,
  orderedProducts,
  parseProductRecords,
  productFromInput,
  saveProductRecord,
  type ProductRecord,
} from '../src/domain/flowDetails.ts';
import { deleteEntry, undoEntryDeletion } from '../src/domain/deletion.ts';
import { flowState } from '../src/domain/history.ts';
import { openVaultWithKey, seal } from '../src/domain/vault.ts';

const date = '2026-10-09';
const pad: ProductRecord = {
  id: 'pad-1',
  type: 'pad',
  action: 'changed',
  quantity: 2,
  time: '08:30',
  detail: 'Overnight',
  collectedMl: null,
};
const cup: ProductRecord = {
  id: 'cup-1',
  type: 'cup',
  action: 'emptied',
  quantity: 1,
  time: '23:59',
  detail: 'Small',
  collectedMl: 12.5,
};
const journalWith = (productRecords: unknown, clots: unknown = null, flooding: unknown = null) => ({
  ...emptyJournal(date),
  entries: { [date]: { ...emptyEntry(), productRecords, clots, flooding } },
});

test('version 1 journals migrate without inventing product or bleeding observations; version 2 is strict', () => {
  const legacy = {
    version: 1,
    selectedDate: date,
    customSymptoms: ['Personal'],
    entries: {
      [date]: {
        flow: 'none',
        periodStart: false,
        periodEnd: false,
        symptoms: ['Personal'],
        cramps: null,
        note: 'Legacy note',
      },
    },
  };
  const original = JSON.stringify(legacy);
  const migrated = parseJournal(legacy);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.entries[date]?.flowRecorded, false);
  assert.deepEqual(migrated.entries[date]?.productRecords, []);
  assert.equal(migrated.entries[date]?.clots, null);
  assert.equal(migrated.entries[date]?.flooding, null);
  assert.equal(migrated.entries[date]?.note, 'Legacy note');
  assert.deepEqual(migrated.customSymptoms, ['Personal']);
  assert.equal(migrated.preferences.showPerimenopause, true);
  assert.equal(JSON.stringify(legacy), original);
  assert.throws(() => parseJournal({ ...legacy, version: 2 }));
  assert.throws(() => parseJournal({ ...migrated, version: 4 }));
  for (const bad of [undefined, '', 'No', 0, [], {}]) {
    const invalid = journalWith([]);
    invalid.entries[date]!.clots = bad;
    assert.throws(() => parseJournal(invalid));
    invalid.entries[date]!.clots = null;
    invalid.entries[date]!.flooding = bad;
    assert.throws(() => parseJournal(invalid));
  }
});

test('product imports reject malformed, duplicate, oversized, and incompatible records without coercion', () => {
  assert.deepEqual(parseProductRecords([{ ...pad, unexpected: true }, cup]), [pad, cup]);
  const invalid = [
    null,
    {},
    'pad',
    { ...pad, id: '' },
    { ...pad, id: '__bad id' },
    { ...pad, type: 'unknown' },
    { ...pad, action: 'emptied' },
    { ...cup, action: 'used' },
    { ...pad, quantity: '2' },
    { ...pad, quantity: 0 },
    { ...pad, quantity: 101 },
    { ...pad, quantity: 1.5 },
    { ...pad, time: '24:00' },
    { ...pad, time: '9:00' },
    { ...pad, time: '00:60' },
    { ...pad, detail: 'a'.repeat(61) },
    { ...pad, collectedMl: 0 },
    { ...cup, collectedMl: '12' },
    { ...cup, collectedMl: NaN },
    { ...cup, collectedMl: Infinity },
    { ...cup, collectedMl: -1 },
    { ...cup, collectedMl: 1001 },
    { ...cup, collectedMl: 1.234 },
    { ...cup, collectedMl: 0.000000001 },
  ];
  for (const record of invalid) assert.throws(() => parseJournal(journalWith([record])));
  assert.throws(() => parseProductRecords([pad, pad]));
  assert.throws(() =>
    parseProductRecords(
      Array.from({ length: MAX_PRODUCT_RECORDS + 1 }, (_, i) => ({ ...pad, id: `p${i}` })),
    ),
  );
  for (const bad of [null, {}, undefined, '']) assert.throws(() => parseJournal(journalWith(bad)));
  assert.equal(parseProductRecords([{ ...cup, collectedMl: 0, time: '00:00' }])[0]?.collectedMl, 0);
});

test('product form validation distinguishes unknown time/amount from zero and accepts decimal commas', () => {
  const input = {
    id: 'input-1',
    type: 'cup' as const,
    action: 'emptied' as const,
    quantity: '2',
    time: '',
    detail: ' Small ',
    collectedMl: '',
  };
  assert.deepEqual(productFromInput(input), {
    ...cup,
    id: 'input-1',
    quantity: 2,
    time: null,
    collectedMl: null,
  });
  assert.equal(productFromInput({ ...input, collectedMl: '0' }).collectedMl, 0);
  assert.equal(productFromInput({ ...input, collectedMl: '12,50' }).collectedMl, 12.5);
  assert.equal(productFromInput({ ...input, time: ' 00:01 ' }).time, '00:01');
  for (const quantity of ['', '-1', '0', '1.5', '1e2', '101'])
    assert.throws(() => productFromInput({ ...input, quantity }), /quantity/);
  for (const time of ['8:30', '12:99', '24:00', '08:30Z'])
    assert.throws(() => productFromInput({ ...input, time }), /24-hour/);
  for (const collectedMl of ['-1', 'NaN', '1e2', '1001', '1.234'])
    assert.throws(() => productFromInput({ ...input, collectedMl }), /amount/);
});

test('product-only and explicit No observations keep a day logged without inventing flow or a cycle', () => {
  let journal = updateEntry(emptyJournal(date), date, { productRecords: [pad, cup] });
  assert.equal(hasEntry(journal.entries[date]), true);
  assert.equal(flowState(journal.entries[date]), 'unknown');
  assert.deepEqual(history(journal, date), []);
  journal = updateEntry(journal, date, {
    flow: 'heavy',
    periodStart: true,
    clots: true,
    flooding: false,
  });
  journal = updateEntry(journal, date, { flow: 'none', flowRecorded: false });
  assert.deepEqual(journal.entries[date]?.productRecords, [pad, cup]);
  assert.equal(journal.entries[date]?.clots, true);
  assert.equal(journal.entries[date]?.flooding, false);
  assert.deepEqual(history(journal, date), []);
  journal = updateEntry(journal, date, { productRecords: [], clots: null });
  assert.equal(hasEntry(journal.entries[date]), true, 'an explicit No is still an observation');
  journal = updateEntry(journal, date, { flooding: null });
  assert.equal(journal.entries[date], undefined);
});

test('product edits retain identity and ordering without mutating prior snapshots; limit and stale edits are rejected', () => {
  const unknown = { ...pad, id: 'unknown', time: null };
  const original = [cup, unknown];
  const added = saveProductRecord(original, pad, false);
  assert.deepEqual(original, [cup, unknown]);
  assert.deepEqual(orderedProducts(added), [pad, cup, unknown]);
  assert.deepEqual(added, [cup, unknown, pad]);
  const changed = saveProductRecord(added, { ...pad, quantity: 3, time: '00:00' }, true);
  assert.equal(changed.length, 3);
  assert.equal(changed[2]?.id, pad.id);
  assert.equal(added[2]?.quantity, 2);
  assert.throws(() => saveProductRecord(original, cup, false), /already/);
  assert.throws(() => saveProductRecord(original, pad, true), /no longer/);
  const full = Array.from({ length: MAX_PRODUCT_RECORDS }, (_, i) => ({ ...pad, id: `p${i}` }));
  assert.throws(() => saveProductRecord(full, cup, false), /already has/);
  assert.equal(
    saveProductRecord(full, { ...full[0]!, quantity: 4 }, true).length,
    MAX_PRODUCT_RECORDS,
  );
});

test('entry deletion and Undo retain independent copies of every product and observation', () => {
  const journal = updateEntry(emptyJournal(date), date, {
    productRecords: [pad, cup],
    clots: true,
    flooding: false,
    note: 'Keep all details',
  });
  const result = deleteEntry(journal, date)!;
  assert.deepEqual(undoEntryDeletion(result.journal, result.deleted), journal);
  assert.notEqual(result.deleted.entry.productRecords, journal.entries[date]!.productRecords);
  assert.notEqual(result.deleted.entry.productRecords[0], journal.entries[date]!.productRecords[0]);
  journal.entries[date]!.productRecords[0]!.detail = 'Changed after deletion';
  assert.equal(result.deleted.entry.productRecords[0]?.detail, 'Overnight');
});

test('new records and legacy journals open through the same encrypted envelope and key', () => {
  const vault = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  const journal = updateEntry(emptyJournal(date), date, {
    productRecords: [pad, cup],
    clots: false,
    flooding: true,
  });
  assert.deepEqual(openVaultWithKey(seal(journal, vault, randomBytes), vault), journal);
  const {
    productRecords: _products,
    clots: _clots,
    flooding: _flooding,
    ...legacyEntry
  } = journal.entries[date]!;
  const legacy = { ...journal, version: 1, entries: { [date]: legacyEntry } };
  const migrated = openVaultWithKey(seal(legacy as unknown as Journal, vault, randomBytes), vault);
  assert.equal(migrated.version, 3);
  assert.deepEqual(migrated.entries[date], {
    ...legacyEntry,
    productRecords: [],
    clots: null,
    flooding: null,
  });
  vault.key.fill(0);
});

test('CSV includes complete dated product details and preserves No versus unlogged observations', () => {
  let journal = updateEntry(emptyJournal(date), date, {
    productRecords: [{ ...cup, detail: 'Size "A", small' }, pad],
    clots: false,
    flooding: true,
    note: '=test',
  });
  journal = updateEntry(journal, '2026-10-08', { note: 'Unlogged observations' });
  const csv = toCSV(journal);
  assert.ok(
    csv.startsWith(
      '"Date","Flow","Period start","Period end","Symptoms","Cramp severity (0-10)","Note","Flow recorded","Clots noticed","Flooding noticed","Product records"',
    ),
  );
  assert.ok(csv.includes('"Unlogged observations","false","","",""'));
  assert.ok(
    csv.includes(
      '"\'=test","false","No","Yes","08:30 · Pad · Changed · Quantity: 2 · Overnight\n23:59 · Cup · Emptied · Quantity: 1 · Size ""A"", small · Collected: 12.5 mL"',
    ),
  );
});
