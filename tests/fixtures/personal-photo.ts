import { deflateSync } from 'node:zlib';

export function chunk(kind: string, data: Uint8Array) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length);
  out.write(kind, 4, 'ascii');
  out.set(data, 8);
  let crc = 0xffffffff;
  for (const byte of out.subarray(4, -4)) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4);
  return out;
}

// Fictional two-pixel red/blue PNG with alpha; no personal image or downloaded fixture.
export function png({ metadata = false, width = 2, height = 1, blue = 255 } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    ...(metadata
      ? [
          chunk('tEXt', Buffer.from('Description\0private fixture')),
          chunk('eXIf', Buffer.from('GPS/thumbnail fixture')),
        ]
      : []),
    chunk('IDAT', deflateSync(Buffer.from([0, 255, 0, 0, 255, 0, 0, blue, 128]))),
    chunk('IEND', Buffer.alloc(0)),
    ...(metadata ? [Buffer.from('trailing private fixture')] : []),
  ]);
}
