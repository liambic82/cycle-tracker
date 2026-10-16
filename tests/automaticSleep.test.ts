import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyJournal, parseJournal, updateEntry } from '../src/domain/journal.ts';
import {
  defaultPreferences,
  moveDaySection,
  rememberRemovedSleep,
  resetRestoredAutomation,
} from '../src/domain/journalPreferences.ts';
import { toggleSymptom } from '../src/domain/symptoms.ts';
import { planAutomaticSleep } from '../src/domain/automaticSleep.ts';
import { applySleepImport, sleepImportKey, sleepWakingDay } from '../src/domain/sleepImport.ts';
import { demoSleepImports } from '../src/data/sleepImportDemo.ts';
import {
  ForegroundSleepImporter,
  type AutoSleepState,
} from '../src/data/foregroundSleepImporter.ts';
import { deleteEntry, undoEntryDeletion } from '../src/domain/deletion.ts';
import { seal, openVaultWithKey } from '../src/domain/vault.ts';
import { randomBytes } from 'node:crypto';

const today = '2026-10-16',
  at = `${today}T16:00:00.000Z`;
const records = () => demoSleepImports(today);
function journal() {
  const j = emptyJournal(today);
  j.preferences.sleepAutomation = {
    ...j.preferences.sleepAutomation,
    enabled: true,
    source: records()[0]!.sourcePackage,
    sourceName: records()[0]!.sourceName,
  };
  return j;
}
test('old preferences migrate safely; invalid section order defaults, pins deduplicate', () => {
  const base = updateEntry(emptyJournal(today), today, {
    symptoms: ['Old custom label'],
    note: 'Keep',
  });
  const old = { ...base, version: 9, preferences: { showPerimenopause: false } };
  const migrated = parseJournal(old);
  assert.deepEqual(migrated.entries, base.entries);
  assert.deepEqual(migrated.preferences, { ...defaultPreferences(), showPerimenopause: false });
  const changed = parseJournal({
    ...base,
    preferences: {
      ...base.preferences,
      sectionOrder: ['sleep', 'sleep'],
      pinnedSymptoms: ['Cramps', ' cramps ', 'Custom'],
    },
  });
  assert.deepEqual(changed.preferences.sectionOrder, defaultPreferences().sectionOrder);
  assert.deepEqual(changed.preferences.pinnedSymptoms, ['cramps', 'Custom']);
});
test('section moves and pin changes do not change journal entries; encrypted roundtrip preserves them', () => {
  const base = updateEntry(journal(), today, { symptoms: ['Cramps'] });
  const preferences = {
    ...base.preferences,
    sectionOrder: moveDaySection(base.preferences.sectionOrder, 'medications', -1),
    pinnedSymptoms: toggleSymptom(base.preferences.pinnedSymptoms, 'Custom'),
  };
  const next = { ...base, preferences };
  assert.equal(next.entries, base.entries);
  assert.equal(
    moveDaySection(preferences.sectionOrder, preferences.sectionOrder[0]!, -1),
    preferences.sectionOrder,
  );
  const vault = { key: randomBytes(32), salt: randomBytes(16).toString('hex') };
  assert.deepEqual(openVaultWithKey(seal(next, vault, randomBytes), vault), next);
  const restored = resetRestoredAutomation(next);
  assert.equal(restored.preferences.sleepAutomation.enabled, false);
  assert.deepEqual(restored.preferences.sectionOrder, next.preferences.sectionOrder);
  assert.deepEqual(restored.entries, next.entries);
});
test('malformed automation cannot enable access', () => {
  const base = journal();
  for (const patch of [
    { enabled: 'true' },
    { source: null },
    { suppressed: [null] },
    { lastCheck: {} },
  ])
    assert.throws(() =>
      parseJournal({
        ...base,
        preferences: {
          ...base.preferences,
          sleepAutomation: { ...base.preferences.sleepAutomation, ...patch },
        },
      }),
    );
});
test('automatic import is atomic, source-specific and idempotent; manual values and unknown stages survive', () => {
  const [first, second] = records();
  let base = updateEntry(journal(), today, {
    note: 'Concurrent note',
    sleep: { durationMinutes: 400, quality: 'good', wakings: 1 },
  });
  const raw = [
    first!,
    { ...second!, stages: [] },
    { ...second!, id: 'other', sourcePackage: 'other.provider' },
  ];
  const before = JSON.stringify(base);
  const next = planAutomaticSleep(base, raw, today, at);
  assert.equal(JSON.stringify(base), before);
  assert.deepEqual(next.entries[today]!.sleep, base.entries[today]!.sleep);
  assert.equal(next.entries[today]!.note, 'Concurrent note');
  assert.equal(next.preferences.sleepAutomation.lastCheck!.added, 2);
  assert.equal(
    planAutomaticSleep(next, raw, today, at).preferences.sleepAutomation.lastCheck!.added,
    0,
  );
  assert.deepEqual(parseJournal(next), next);
  for (const values of [
    [first, first],
    [first, { ...second, stages: null }],
    Array(501).fill(first),
  ])
    assert.throws(() => planAutomaticSleep(base, values, today, at));
  assert.equal(JSON.stringify(base), before);
});
test('corrections, changed waking dates and overlaps stay for review; older data is skipped', () => {
  const first = records()[0]!;
  const saved = applySleepImport(journal(), first, today);
  const corrected = { ...first, end: at, stages: [], modified: at, fallbackOffset: 600 };
  const review = planAutomaticSleep(saved, [corrected], today, at);
  assert.deepEqual(review.entries, saved.entries);
  assert.equal(review.preferences.sleepAutomation.lastCheck!.review, 1);
  const older = { ...first, modified: '2020-01-01T00:00:00.000Z' };
  assert.equal(
    planAutomaticSleep(saved, [older], today, at).preferences.sleepAutomation.lastCheck!.review,
    0,
  );
  const overlap = { ...first, id: 'overlap' };
  assert.equal(
    planAutomaticSleep(saved, [overlap], today, at).preferences.sleepAutomation.lastCheck!.review,
    1,
  );
  const ambiguous = planAutomaticSleep(journal(), [first, overlap], today, at);
  assert.equal(ambiguous.preferences.sleepAutomation.lastCheck!.review, 2);
  assert.deepEqual(ambiguous.entries, {});
});
test('future dates need review; empty or absent chosen source never switches providers', () => {
  const first = records()[0]!;
  const future = {
    ...first,
    start: '2027-01-01T00:00:00.000Z',
    end: '2027-01-01T01:00:00.000Z',
    stages: [],
  };
  assert.equal(
    planAutomaticSleep(journal(), [future], today, at).preferences.sleepAutomation.lastCheck!
      .review,
    1,
  );
  const none = planAutomaticSleep(journal(), [{ ...first, sourcePackage: 'another' }], today, at);
  assert.deepEqual(none.entries, {});
  assert.equal(none.preferences.sleepAutomation.lastCheck!.sourceSeen, false);
  assert.deepEqual(planAutomaticSleep(journal(), [], today, at).entries, {});
});
test('removing a copy or whole entry suppresses resurrection; Undo or manual reimport restores it', () => {
  const first = records()[0]!,
    day = sleepWakingDay(first);
  const base = applySleepImport(journal(), first, today);
  const removed = rememberRemovedSleep(base, updateEntry(base, day, { sleepImports: [] }));
  assert.deepEqual(removed.preferences.sleepAutomation.suppressed, [sleepImportKey(first)]);
  assert.equal(
    planAutomaticSleep(removed, [first], today, at).preferences.sleepAutomation.lastCheck!.added,
    0,
  );
  const manual = rememberRemovedSleep(removed, applySleepImport(removed, first, today));
  assert.deepEqual(manual.preferences.sleepAutomation.suppressed, []);
  const deleted = deleteEntry(base, day)!;
  const after = rememberRemovedSleep(base, deleted.journal);
  assert.equal(after.preferences.sleepAutomation.suppressed.length, 1);
  assert.deepEqual(
    rememberRemovedSleep(after, undoEntryDeletion(after, deleted.deleted)).preferences
      .sleepAutomation.suppressed,
    [],
  );
});
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function harness() {
  let current = journal(),
    active = true,
    permission = 'granted',
    reads = 0,
    saves = 0,
    time = new Date(at);
  const reports: AutoSleepState[] = [];
  let read = async (): Promise<unknown[]> => records();
  let save = async (next: typeof current) => {
    current = next;
  };
  const importer = new ForegroundSleepImporter({
    current: () => current,
    active: () => active,
    now: () => time,
    status: async () => permission,
    read: () => {
      reads++;
      return read();
    },
    save: async (next) => {
      saves++;
      await save(next);
    },
    report: (x) => reports.push(x),
  });
  return {
    importer,
    reports,
    current: () => current,
    reads: () => reads,
    saves: () => saves,
    edit: (j: typeof current) => {
      current = j;
    },
    active: (v: boolean) => {
      active = v;
    },
    permission: (p: string) => {
      permission = p;
    },
    read: (r: typeof read) => {
      read = r;
    },
    save: (s: typeof save) => {
      save = s;
    },
    advance: () => {
      time = new Date(time.getTime() + 60001);
    },
  };
}
test('one foreground read at a time and cooldown; explicit check can retry', async () => {
  const h = harness();
  const wait = deferred<unknown[]>();
  h.read(() => wait.promise);
  const running = h.importer.check();
  await Promise.resolve();
  await h.importer.check(true);
  assert.equal(h.reads(), 1);
  wait.resolve(records());
  await running;
  assert.equal(h.saves(), 1);
  assert.equal(h.reports.at(-1)!.state, 'saved');
  await h.importer.check();
  assert.equal(h.reads(), 1);
  h.advance();
  await h.importer.check();
  assert.equal(h.reads(), 2);
});
test('lock, background, disconnect, provider changes and restore invalidate late results', async () => {
  for (const change of ['lock', 'background', 'disconnect', 'provider', 'restore']) {
    const h = harness(),
      wait = deferred<unknown[]>();
    h.read(() => wait.promise);
    const running = h.importer.check();
    await Promise.resolve();
    if (change === 'lock') h.importer.cancel(true);
    if (change === 'background') h.active(false);
    if (change === 'restore') h.edit(resetRestoredAutomation(h.current()));
    if (change === 'disconnect') h.current().preferences.sleepAutomation.enabled = false;
    if (change === 'provider')
      h.current().preferences.sleepAutomation = {
        ...h.current().preferences.sleepAutomation,
        source: 'different',
      };
    wait.resolve(records());
    await running;
    assert.equal(h.saves(), 0, change);
    assert.notEqual(h.reports.at(-1)?.state, 'saved', change);
  }
});
test('permission loss before or during reading pauses without writes; no prompts', async () => {
  const h = harness();
  h.permission('not-granted');
  await h.importer.check();
  assert.equal(h.reads(), 0);
  assert.equal(h.reports.at(-1)!.state, 'paused');
  h.permission('granted');
  h.read(async () => {
    h.permission('not-granted');
    return records();
  });
  await h.importer.check(true);
  assert.equal(h.saves(), 0);
  assert.equal(h.reports.at(-1)!.state, 'paused');
});

test('a new unlock queues behind an invalidated read without applying the old result', async () => {
  const h = harness(),
    wait = deferred<unknown[]>();
  h.read(() => wait.promise);
  const old = h.importer.check();
  await Promise.resolve();
  h.importer.cancel(true);
  h.read(async () => records());
  await h.importer.check();
  wait.resolve([{ malformed: true }]);
  await old;
  assert.equal(h.reads(), 2);
  assert.equal(h.saves(), 1);
  assert.equal(h.reports.at(-1)!.state, 'saved');
});
test('concurrent manual edits survive a slow read; success waits for encrypted persistence', async () => {
  const h = harness(),
    wait = deferred<unknown[]>(),
    saved = deferred<void>();
  h.read(() => wait.promise);
  h.save(async (next) => {
    h.edit(next);
    await saved.promise;
  });
  const running = h.importer.check();
  await Promise.resolve();
  h.edit(updateEntry(h.current(), today, { note: 'Written while waiting' }));
  wait.resolve(records());
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.notEqual(h.reports.at(-1)!.state, 'saved');
  saved.resolve();
  await running;
  assert.equal(h.current().entries[today]!.note, 'Written while waiting');
  assert.equal(h.reports.at(-1)!.state, 'saved');
});
test('read and storage errors remain recoverable and never report an imported success', async () => {
  const h = harness();
  h.read(async () => {
    throw new Error('Read failed');
  });
  await h.importer.check();
  assert.equal(h.reports.at(-1)!.state, 'error');
  assert.equal(h.saves(), 0);
  h.read(async () => records());
  h.save(async () => {
    throw new Error('Storage full');
  });
  await h.importer.check(true);
  assert.equal(h.reports.at(-1)!.state, 'error');
  assert.equal(
    h.reports.some((x) => x.state === 'saved'),
    false,
  );
  h.save(async (next) => {
    h.edit(next);
  });
  await h.importer.check(true);
  assert.equal(h.reports.at(-1)!.state, 'saved');
});
