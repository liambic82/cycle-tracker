import test from 'node:test';
import assert from 'node:assert/strict';
import {
  imageInfo,
  prepareEncodedPhoto,
  stripImageMetadata,
  photoDataUri,
  MAX_PHOTO_BYTES,
  MAX_PHOTO_INPUT,
} from '../src/domain/personalImage.ts';
import { chunk, png } from './fixtures/personal-photo.ts';

test('PNG metadata and trailing payloads are removed without changing alpha/pixel chunks', () => {
  const original = png({ metadata: true });
  const clean = prepareEncodedPhoto(original);
  assert.deepEqual(Buffer.from(clean.bytes), png());
  assert.deepEqual(imageInfo(clean.bytes), { mime: 'image/png', width: 2, height: 1 });
  assert.ok(original.includes(Buffer.from('private fixture')));
  clean.bytes.fill(0);
  assert.ok(original.includes(Buffer.from('private fixture')), 'caller input is owned separately');
});

test('JPEG metadata is removed while multiple scans, stuffed bytes, and restart markers survive', () => {
  const segment = (marker: number, data: number[]) => [255, marker, 0, data.length + 2, ...data];
  const start = [255, 216];
  const frame = segment(194, [8, 0, 2, 0, 3, 1, 1, 17, 0]);
  const scan = [...segment(218, [1, 1, 0, 0, 63, 0]), 31, 255, 0, 14, 255, 208, 15];
  const pixelParts = [...frame, ...scan, ...scan, 255, 217];
  const input = new Uint8Array([
    ...start,
    ...segment(225, [71, 80, 83]),
    ...segment(254, [78, 65, 77, 69]),
    ...pixelParts,
    1,
    2,
    3,
  ]);
  assert.deepEqual(imageInfo(input), { mime: 'image/jpeg', width: 3, height: 2 });
  assert.deepEqual(stripImageMetadata(input), new Uint8Array([...start, ...pixelParts]));
  assert.throws(() => stripImageMetadata(input.subarray(0, input.length - 5)), /valid JPEG/);
});

test('image guards reject unsupported, truncated, oversized and extreme-dimension input', () => {
  for (const bytes of [
    Buffer.from('<svg>not accepted</svg>'),
    png().subarray(0, 20),
    Buffer.alloc(MAX_PHOTO_INPUT + 1),
  ])
    assert.throws(() => imageInfo(bytes));
  for (const dimensions of [
    { width: 0 },
    { height: 0 },
    { width: 9000 },
    { width: 8000, height: 8000 },
  ])
    assert.throws(() => imageInfo(png(dimensions)));
  assert.throws(() => prepareEncodedPhoto(png({ width: 1601 })), /too large/);
  const malformed = png();
  malformed.writeUInt32BE(0xffffffff, 8);
  assert.throws(() => stripImageMetadata(malformed));
  assert.throws(() => stripImageMetadata(png().subarray(0, -12)), /valid JPEG/);
  const big = Buffer.concat([
    png().subarray(0, 33),
    chunk('IDAT', Buffer.alloc(MAX_PHOTO_BYTES)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  assert.throws(() => prepareEncodedPhoto(big), /too large/);
});

test('data URIs encode every padding case and a maximum-size photo exactly', () => {
  for (const length of [1, 2, 3, 4, 5, 256, MAX_PHOTO_BYTES]) {
    const bytes = Uint8Array.from({ length }, (_, i) => i % 256);
    const uri = photoDataUri({ mime: 'image/png', width: 1, height: 1, bytes });
    assert.equal(uri, `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`);
  }
});
