import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, realpath, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  executeHeldoutOnce,
  runHeldoutComparison,
  verifyFrozenHashes,
} from '../research/heldout-comparison.mjs';
import { hash } from '../research/controlled-input.mjs';
import { comparePeriodDataset } from '../research/controlled-comparison.ts';
import { parsePeriodDataset, participantSplit } from '../research/period-dataset.ts';

const freeze = hash('fictional frozen execution');
const repo = fileURLToPath(new URL('../', import.meta.url));
async function temporary(t) {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(join(parent, 'cycle-heldout-test-'));
  t.after(async () => {
    // Delete only this test's resolved, dedicated temporary directory.
    assert.equal(dirname(await realpath(root)), parent);
    assert.match(basename(root), /^cycle-heldout-test-/);
    await rm(root, { recursive: true });
  });
  return root;
}
const fictionalReport = (split) => ({ split, overall: { participants: 1, scored: 6 } });

test('final test refuses to start before a verified calibration result', async (t) => {
  const root = await temporary(t);
  let calls = 0;
  await assert.rejects(
    executeHeldoutOnce(root, 'test', freeze, () => {
      calls++;
    }),
    /Complete and verify calibration/,
  );
  assert.equal(calls, 0);
  assert.deepEqual(await readdir(root), []);
});

test('calibration and final test execute once; later calls verify saved bytes without evaluating', async (t) => {
  const root = await temporary(t);
  let calls = 0;
  let calibrationHash;
  for (const split of ['calibration', 'test']) {
    const evaluate = () => {
      calls++;
      return fictionalReport(split);
    };
    const first = await executeHeldoutOnce(root, split, freeze, evaluate);
    assert.equal(first.status, 'created');
    assert.equal(first.report.execution.prerequisiteReportSha256, calibrationHash ?? null);
    const second = await executeHeldoutOnce(root, split, freeze, evaluate);
    assert.equal(second.status, 'replayed-saved');
    assert.deepEqual(second.report, first.report);
    assert.deepEqual(second.receipt, first.receipt);
    if (split === 'calibration') calibrationHash = first.receipt.reportSha256;
  }
  assert.equal(calls, 2);
});

test('an interrupted execution retains its claim and blocks automatic rescoring', async (t) => {
  const root = await temporary(t);
  let calls = 0;
  await assert.rejects(
    executeHeldoutOnce(root, 'calibration', freeze, () => {
      calls++;
      throw new Error('fictional failure');
    }),
    /fictional failure/,
  );
  await assert.rejects(
    executeHeldoutOnce(root, 'calibration', freeze, () => {
      calls++;
    }),
    /already started.*do not rescore/,
  );
  assert.equal(calls, 1);
});

test('concurrent requests cannot both acquire the execution claim', async (t) => {
  const root = await temporary(t);
  let entered, release;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const proceed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const first = executeHeldoutOnce(root, 'calibration', freeze, async () => {
    calls++;
    entered();
    await proceed;
    return fictionalReport('calibration');
  });
  await started;
  try {
    await assert.rejects(
      executeHeldoutOnce(root, 'calibration', freeze, () => {
        calls++;
      }),
      /already started/,
    );
  } finally {
    release();
    await first;
  }
  assert.equal(calls, 1);
});

test('altered saved bytes block replay and final-test prerequisites without evaluation', async (t) => {
  const root = await temporary(t);
  await executeHeldoutOnce(root, 'calibration', freeze, () => fictionalReport('calibration'));
  const path = join(root, 'zenodo-calibration-comparison-v1/report.json');
  await writeFile(path, (await readFile(path, 'utf8')) + ' ');
  let calls = 0;
  for (const split of ['calibration', 'test'])
    await assert.rejects(
      executeHeldoutOnce(root, split, freeze, () => {
        calls++;
      }),
      /checksum mismatch/,
    );
  assert.equal(calls, 0);
  assert.ok(!(await readdir(root)).some((name) => name.startsWith('zenodo-test')));
});

test('changed execution freeze and incomplete bundles never trigger a replacement run', async (t) => {
  const root = await temporary(t);
  await executeHeldoutOnce(root, 'calibration', freeze, () => fictionalReport('calibration'));
  let calls = 0;
  await assert.rejects(
    executeHeldoutOnce(root, 'test', hash('changed wrapper'), () => {
      calls++;
    }),
    /different execution freeze/,
  );
  await unlink(join(root, 'zenodo-calibration-comparison-v1/report.json'));
  await assert.rejects(
    executeHeldoutOnce(root, 'calibration', freeze, () => {
      calls++;
    }),
    /incomplete or changed/,
  );
  assert.equal(calls, 0);
});

test('frozen code hash checks tolerate checkout line endings but reject implementation changes', async (t) => {
  const root = await temporary(t);
  await writeFile(join(root, 'policy.ts'), 'fixed\r\n');
  await verifyFrozenHashes(root, { 'policy.ts': hash('fixed\n') });
  await writeFile(join(root, 'policy.ts'), 'tuned\n');
  await assert.rejects(
    verifyFrozenHashes(root, { 'policy.ts': hash('fixed\n') }),
    /Frozen implementation/,
  );
});

test('invalid group and CLI arguments fail before any participant access', async () => {
  await assert.rejects(runHeldoutComparison('nonexistent-root', '../test'), /Select exactly/);
  await assert.rejects(
    executeHeldoutOnce('nonexistent-root', 'development', freeze, () => {}),
    /Select exactly/,
  );
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', 'scripts/compare-zenodo-heldout.mjs', 'test', 'unexpected'],
    { cwd: repo, encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/);
  assert.equal(result.stdout, '');
});

test('fictional calibration and final-test histories use the unchanged matched-case engine', async () => {
  const fixture = JSON.parse(
    await readFile(join(repo, 'research/fixtures/period-history.synthetic.json'), 'utf8'),
  );
  for (const split of ['calibration', 'test'] as const) {
    let index = 0;
    while (participantSplit(fixture.provenance.datasetId, `fictional-heldout-${index}`) !== split)
      index++;
    const id = `fictional-heldout-${index}`;
    const dataset = parsePeriodDataset({
      ...fixture,
      participants: [
        {
          id,
          segments: [
            {
              startDays: Array.from({ length: 13 }, (_, i) => i * 28),
              observedThrough: 336,
              context: 'unknown',
              complete: false,
            },
          ],
        },
      ],
    });
    const report = comparePeriodDataset(dataset, new Map([[id, 'new-only']]), split);
    assert.equal(report.split, split);
    assert.equal(report.overall.scored, 6);
    assert.equal(report.overall.offeredCensored, 1);
    for (const method of Object.values(report.overall.methods))
      assert.equal(method.meanAbsoluteError, 0);
    assert.equal(report.overall.weightedMinusMedian, 0);
    assert.equal(JSON.stringify(report).includes(id), false);
  }
});
