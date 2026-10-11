import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareZenodoRecords, ZENODO_DATASET_ID, jsonBytes } from '../research/prepare-zenodo.mjs';
import { participantSplit, benchmarkPeriodDataset } from '../research/period-dataset.ts';
import { readVerifiedZenodoSource, writeResearchBundle } from '../research/research-files.mjs';
import { ZENODO_SOURCE } from '../research/zenodo-intake.mjs';

const header = 'Woman;Date;Birthday;Study;Country;Origin;BeforeBirth;AfterBirth;Birth';
// Fictional source-format rows only. The adapter tests never read the real deposit.
const row = (id = 'fictional-a', date = '01.01.2020', flags = [0, 0, 0], study = 'new') =>
  `${id};${date};private-birthday;${study};private-country;private-origin;${flags.join(';')}`;
const csv = (rows: string[]) => [header, ...rows].join('\n') + '\n';
const members = (result) => Object.values(result.datasets).flatMap((d: any) => d.participants);

test('preparation sorts and deduplicates starts, retaining long gaps and separating birth annotations', () => {
  const prepared = prepareZenodoRecords(
    csv([
      row('fictional-a', '01.12.2020', [0, 1, 0]),
      row(),
      row(),
      row('fictional-a', '29.01.2020', [1, 0, 0]),
      row('fictional-a', '01.11.2020', [0, 0, 1]),
      row('fictional-birth-only', '01.10.2020', [0, 0, 1]),
    ]),
  );
  assert.equal(prepared.summary.duplicateRowsRemoved, 1);
  assert.equal(prepared.summary.birthOnlyIdentifiersOmitted, 1);
  assert.equal(prepared.summary.birthEventRowsExcludedFromStarts, 2);
  assert.equal(prepared.summary.retainedStarts, 3);
  assert.equal(prepared.summary.forecastsScored, 0);
  const person = members(prepared)[0];
  assert.deepEqual(person.segments, [
    {
      startDays: [0, 28, 335],
      observedThrough: 335,
      context: 'unknown',
      complete: false,
    },
  ]);
  const audit = Object.values(prepared.auditAnnotations)[0] as any;
  assert.deepEqual(audit.participants[0].birthEventDays, [305]);
  assert.deepEqual(audit.participants[0].onsetFlags, [
    { day: 28, beforeBirth: true, afterBirth: false },
    { day: 335, beforeBirth: false, afterBirth: true },
  ]);
  assert.equal(person.id, audit.participants[0].id);
  assert.deepEqual(Object.keys(person).sort(), ['id', 'segments']);
});

test('conflicting duplicate fields fail instead of silently selecting a clinical annotation', () => {
  for (const conflict of [
    row('fictional-a', '01.01.2020', [1, 0, 0]),
    row().replace('private-birthday', 'different-value'),
    row('fictional-a', '01.01.2020', [0, 0, 0], 'old'),
  ]) {
    assert.throws(() => prepareZenodoRecords(csv([row(), conflict])), /Conflicting records/);
  }
});

test('prepared files are deterministic under source ordering and omit source identifiers and demographics', () => {
  const rows = Array.from({ length: 40 }, (_, i) => row(`fictional-${i}`));
  rows.push(row('fictional-0', '29.01.2020'), rows[0]!);
  const original = prepareZenodoRecords(csv(rows));
  const reordered = prepareZenodoRecords(csv([...rows].reverse()).replace(/\n/g, '\r\n'));
  assert.equal(jsonBytes(original), jsonBytes(reordered));
  const output = jsonBytes(original);
  for (const forbidden of [
    'fictional-',
    'private-birthday',
    'private-country',
    'private-origin',
    '01.01.2020',
    'fingerprint',
  ])
    assert.equal(output.includes(forbidden), false);
  assert.equal(original.summary.retainedParticipants, 40);
  assert.equal(new Set(members(original).map((p) => p.id)).size, 40);
  for (const [split, dataset] of Object.entries(original.datasets) as any) {
    assert.ok(
      dataset.participants.every((p) => participantSplit(ZENODO_DATASET_ID, p.id) === split),
    );
    assert.deepEqual(
      original.auditAnnotations[split].participants.map((p) => p.id),
      dataset.participants.map((p) => p.id),
    );
  }
});

test('appending future events or people cannot move existing participants between splits', () => {
  const rows = Array.from({ length: 30 }, (_, i) => row(`fictional-${i}`));
  const before = prepareZenodoRecords(csv(rows));
  const after = prepareZenodoRecords(
    csv([...rows, row('fictional-0', '01.12.2020'), row('fictional-added')]),
  );
  const originalIds = members(before).map((p) => p.id);
  assert.equal(members(after).length, originalIds.length + 1);
  for (const split of ['development', 'calibration', 'test']) {
    assert.deepEqual(
      before.datasets[split]?.participants.map((p) => p.id) ?? [],
      after.datasets[split]?.participants
        .filter((p) => originalIds.includes(p.id))
        .map((p) => p.id) ?? [],
    );
  }
});

test('normalization never opens the production context gate or invents final follow-up', () => {
  const rows = [
    '01.01.2020',
    '29.01.2020',
    '26.02.2020',
    '25.03.2020',
    '22.04.2020',
    '20.05.2020',
    '17.06.2020',
    '15.07.2020',
  ].map((date) => row('fictional-a', date));
  const prepared = prepareZenodoRecords(csv(rows));
  const [split, dataset] = Object.entries(prepared.datasets)[0] as any;
  const report = benchmarkPeriodDataset(dataset, split);
  assert.equal(report.policy.offered, 0);
  assert.equal(report.policy.meanError.median, null);
  assert.equal(report.policy.censored, 1);
  const later = benchmarkPeriodDataset(dataset, split, 14);
  assert.equal(later.policy.outsideFollowUp, 1);
});

test('source cohorts and annotations never select targets or split histories', () => {
  const prepared = prepareZenodoRecords(
    csv([
      row('fictional-a', '01.01.2020', [1, 0, 0], 'old'),
      row('fictional-a', '01.12.2020', [0, 1, 0], 'new'),
      row('fictional-a', '01.01.2019', [0, 0, 1], 'old'),
    ]),
  );
  assert.deepEqual(members(prepared)[0].segments[0].startDays, [0, 335]);
  assert.equal(prepared.summary.historySegments, 1);
  const audit = Object.values(prepared.auditAnnotations)[0] as any;
  assert.deepEqual(audit.participants[0].studySources, ['new', 'old']);
  assert.deepEqual(audit.participants[0].birthEventDays, [-365]);
});

test('bundle writes are repeatable and reject altered output and path traversal without overwrite', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cycle-research-preparation-'));
  const files = { 'development.json': '{"fictional":true}\n', 'manifest.json': '{"test":true}\n' };
  const destination = join(root, 'prepared-v1');
  try {
    assert.equal(await writeResearchBundle(root, 'prepared-v1', files), 'created');
    assert.equal(await writeResearchBundle(root, 'prepared-v1', files), 'verified-existing');
    await writeFile(join(destination, 'development.json'), 'changed');
    await assert.rejects(
      writeResearchBundle(root, 'prepared-v1', files),
      /no files were overwritten/,
    );
    assert.equal(await readFile(join(destination, 'development.json'), 'utf8'), 'changed');
    await assert.rejects(
      writeResearchBundle(root, '../outside', files),
      /Invalid research bundle layout/,
    );
    await assert.rejects(
      writeResearchBundle(root, 'prepared-v2', { ...files, '../outside.json': '{}' }),
      /Invalid research bundle layout/,
    );
  } finally {
    for (const name of Object.keys(files)) await unlink(join(destination, name));
    await rmdir(destination);
    await rmdir(root);
  }
});

test('source verification rejects changed bytes and sources outside the private directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cycle-research-source-'));
  const input = join(root, 'fictional.csv');
  try {
    await writeFile(input, 'fake');
    await assert.rejects(readVerifiedZenodoSource(root, input), /Source size differs/);
    await writeFile(input, Buffer.alloc(ZENODO_SOURCE.bytes));
    await assert.rejects(readVerifiedZenodoSource(root, input), /Source checksum differs/);
    await assert.rejects(
      readVerifiedZenodoSource(root, fileURLToPath(new URL('../package.json', import.meta.url))),
      /Keep external inputs/,
    );
  } finally {
    await unlink(input);
    await rmdir(root);
  }
});
