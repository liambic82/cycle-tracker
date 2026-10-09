import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { APPEARANCE_KEY, AppearanceStore } from '../src/data/appearanceStore.ts';
import {
  PALETTES,
  BACKGROUNDS,
  appearanceColors,
  defaultAppearance,
  parseAppearance,
} from '../src/domain/appearance.ts';
import { STORAGE_KEY } from '../src/data/repository.ts';

function fixture(initial: string | null = null) {
  const values = new Map<string, string>(initial === null ? [] : [[APPEARANCE_KEY, initial]]);
  values.set(STORAGE_KEY, 'encrypted journal stays untouched');
  const writes: string[] = [];
  const store = new AppearanceStore({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      writes.push(key);
      values.set(key, value);
    },
  });
  return { store, values, writes };
}

test('appearance persists separately, reloads, and resets without touching the journal', async () => {
  const { store, values, writes } = fixture();
  await store.load();
  assert.deepEqual(store.getSnapshot().settings, defaultAppearance());
  const selected = {
    ...defaultAppearance(),
    palette: 'lavender-haze' as const,
    mode: 'dark' as const,
    background: BACKGROUNDS[5].id,
    visibility: 60,
  };
  await store.update(selected);
  const restored = fixture(values.get(APPEARANCE_KEY)!);
  await restored.store.load();
  assert.deepEqual(restored.store.getSnapshot().settings, selected);
  await store.reset();
  assert.deepEqual(JSON.parse(values.get(APPEARANCE_KEY)!), defaultAppearance());
  assert.equal(values.get(STORAGE_KEY), 'encrypted journal stays untouched');
  assert.ok(writes.every((key) => key === APPEARANCE_KEY));
  assert.notEqual(APPEARANCE_KEY, STORAGE_KEY);
});

test('sample choices and reset never persist, and leaving restores device preferences', async () => {
  const selected = {
    ...defaultAppearance(),
    palette: 'sage' as const,
    background: BACKGROUNDS[0].id,
  };
  const { store, writes } = fixture(JSON.stringify(selected));
  await store.load();
  store.setDemo(true);
  await store.update({ ...selected, palette: 'rosewater', mode: 'dark' });
  assert.equal(store.getSnapshot().settings.palette, 'rosewater');
  await store.reset();
  assert.deepEqual(store.getSnapshot().settings, defaultAppearance());
  store.setDemo(false);
  assert.deepEqual(store.getSnapshot().settings, selected);
  assert.deepEqual(writes, []);
});

test('opening sample mode during storage load starts from the saved preference', async () => {
  let finish!: (value: string) => void;
  const store = new AppearanceStore({
    getItem: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
    setItem: async () => assert.fail('no write expected'),
  });
  const pending = store.load();
  store.setDemo(true);
  await store.update({ ...defaultAppearance(), palette: 'ocean' });
  finish(JSON.stringify({ ...defaultAppearance(), palette: 'sage' }));
  await pending;
  assert.equal(store.getSnapshot().ready, true);
  assert.equal(store.getSnapshot().settings.palette, 'sage');
  store.setDemo(false);
  assert.equal(store.getSnapshot().settings.palette, 'sage');
});

test('invalid or future stored preferences recover with defaults without overwriting storage', async () => {
  for (const raw of [
    '{broken',
    'null',
    JSON.stringify({ ...defaultAppearance(), version: 2 }),
    JSON.stringify({ ...defaultAppearance(), background: 'https://example.com/image.png' }),
  ]) {
    const { store, writes } = fixture(raw);
    await store.load();
    assert.equal(store.getSnapshot().ready, true);
    assert.ok(store.getSnapshot().error);
    assert.deepEqual(store.getSnapshot().settings, defaultAppearance());
    assert.deepEqual(writes, []);
    await store.reset();
    assert.equal(store.getSnapshot().error, '');
  }
});

test('read failures do not block the app; later preference saves recover', async () => {
  let reads = 0;
  const store = new AppearanceStore({
    getItem: async () => {
      reads++;
      throw new Error('unavailable');
    },
    setItem: async () => {},
  });
  await Promise.all([store.load(), store.load()]);
  assert.equal(reads, 1);
  assert.equal(store.getSnapshot().ready, true);
  await store.retry();
  assert.equal(store.getSnapshot().error, '');
});

test('rapid choices write in order and remain saving until the latest write finishes', async () => {
  const values: string[] = [];
  let release!: () => void;
  const store = new AppearanceStore({
    getItem: async () => null,
    setItem: async (_key, value) => {
      if (!values.length)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      values.push(value);
    },
  });
  await store.load();
  const first = store.update({ ...defaultAppearance(), palette: 'sage' });
  const last = store.update({ ...defaultAppearance(), palette: 'ocean' });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(store.getSnapshot().settings.palette, 'ocean');
  assert.equal(store.getSnapshot().saving, true);
  release();
  await Promise.all([first, last]);
  assert.deepEqual(
    values.map((raw) => JSON.parse(raw).palette),
    ['sage', 'ocean'],
  );
  assert.equal(store.getSnapshot().saving, false);
});

test('a failed write is visible, and retry or subsequent choices recover the queue', async () => {
  let fail = true;
  let saved = '';
  const store = new AppearanceStore({
    getItem: async () => null,
    setItem: async (_key, value) => {
      if (fail) throw new Error('full');
      saved = value;
    },
  });
  await store.load();
  await store.update({ ...defaultAppearance(), palette: 'silver-moon' });
  assert.ok(store.getSnapshot().error);
  assert.equal(store.getSnapshot().saving, false);
  fail = false;
  await store.retry();
  assert.equal(JSON.parse(saved).palette, 'silver-moon');
  assert.equal(store.getSnapshot().error, '');
  fail = true;
  const first = store.update({ ...defaultAppearance(), palette: 'ocean' });
  await first;
  fail = false;
  await store.update({ ...defaultAppearance(), palette: 'rosewater' });
  assert.equal(JSON.parse(saved).palette, 'rosewater');
});

test('preference validation rejects unsafe values and strips unrelated fields', () => {
  for (const patch of [
    { visibility: -5 },
    { visibility: 65 },
    { visibility: 2 },
    { visibility: NaN },
    { visibility: '25' },
    { mode: 'automatic' },
    { palette: 'unknown' },
    { background: '../private.png' },
  ]) {
    assert.throws(() => parseAppearance({ ...defaultAppearance(), ...patch }));
  }
  assert.deepEqual(
    parseAppearance({ ...defaultAppearance(), journal: 'private data', uri: 'file:///photo' }),
    defaultAppearance(),
  );
});

function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('all palettes keep body, selected, semantic and button text at least 4.5:1 in light and dark', () => {
  for (const palette of PALETTES)
    for (const dark of [false, true]) {
      const c = appearanceColors(palette.id, dark);
      const pairs = [
        ...[c.paper, c.background, c.soft, c.sage, c.roseSoft, c.accentSoft].flatMap((surface) => [
          [c.ink, surface],
          [c.muted, surface],
        ]),
        [c.plum, c.paper],
        [c.plum, c.accentSoft],
        [c.onAccent, c.plum],
        [c.roseInk, c.rose],
        [c.roseInk, c.roseSoft],
        [c.sageInk, c.sage],
        [c.spotInk, c.sand],
        [c.error, c.paper],
        [c.onError, c.error],
      ];
      for (const [foreground, background] of pairs)
        assert.ok(
          contrast(foreground!, background!) >= 4.5,
          `${palette.id}/${dark ? 'dark' : 'light'} ${foreground} on ${background}: ${contrast(foreground!, background!).toFixed(2)}`,
        );
    }
});

test('calendar semantic colors stay constant when choosing a different palette', () => {
  for (const dark of [false, true]) {
    const base = appearanceColors('plum', dark);
    for (const palette of PALETTES)
      for (const token of [
        'rose',
        'roseSoft',
        'roseInk',
        'sage',
        'sageInk',
        'sand',
        'spotInk',
      ] as const)
        assert.equal(appearanceColors(palette.id, dark)[token], base[token]);
  }
});

test('all twelve bundled images exactly match the reviewed originals', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../docs/design/backgrounds/assets.json', import.meta.url), 'utf8'),
  );
  assert.equal(BACKGROUNDS.length, 12);
  assert.equal(new Set(BACKGROUNDS.map((b) => b.id)).size, 12);
  for (const palette of PALETTES.slice(3))
    assert.equal(BACKGROUNDS.filter((b) => b.palette === palette.id).length, 2);
  for (const art of BACKGROUNDS) {
    const record = manifest.assets.find((item: { id: string }) => item.id === art.id);
    assert.ok(record);
    const bytes = await readFile(new URL(`../assets/backgrounds/${art.id}.png`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256);
    assert.equal(bytes.length, record.bytes);
    assert.equal(bytes.readUInt32BE(16), record.width);
    assert.equal(bytes.readUInt32BE(20), record.height);
  }
});
