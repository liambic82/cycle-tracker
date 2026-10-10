export const MAX_PHOTO_INPUT = 12 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 512 * 1024;
export const MAX_PHOTO_EDGE = 1600;
export type ImageInfo = { mime: 'image/jpeg' | 'image/png'; width: number; height: number };
export type PreparedPhoto = ImageInfo & { bytes: Uint8Array };
const invalid = () => new Error('Choose a valid JPEG or PNG image.');
const u16 = (b: Uint8Array, p: number) => b[p]! * 256 + b[p + 1]!;
const u32 = (b: Uint8Array, p: number) => u16(b, p) * 65536 + u16(b, p + 2);
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

export function imageInfo(bytes: Uint8Array): ImageInfo {
  if (bytes.length < 24 || bytes.length > MAX_PHOTO_INPUT) throw invalid();
  let info: ImageInfo | undefined;
  if (
    pngSignature.every((value, i) => bytes[i] === value) &&
    u32(bytes, 8) === 13 &&
    String.fromCharCode(...bytes.subarray(12, 16)) === 'IHDR'
  ) {
    info = { mime: 'image/png', width: u32(bytes, 16), height: u32(bytes, 20) };
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    let p = 2;
    while (p + 4 <= bytes.length) {
      if (bytes[p++] !== 255) throw invalid();
      while (bytes[p] === 255) p++;
      const marker = bytes[p++]!;
      if (marker === 218 || marker === 217) break;
      const size = u16(bytes, p);
      if (size < 2 || p + size > bytes.length) throw invalid();
      if ([192, 193, 194].includes(marker)) {
        if (size < 8) throw invalid();
        info = { mime: 'image/jpeg', height: u16(bytes, p + 3), width: u16(bytes, p + 5) };
        break;
      }
      p += size;
    }
  }
  if (!info || info.width < 1 || info.height < 1) throw invalid();
  if (info.width > 8192 || info.height > 8192 || info.width * info.height > 32_000_000)
    throw new Error('Choose an image up to 32 megapixels and 8192 pixels on either side.');
  return info;
}

function join(parts: Uint8Array[]) {
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

// Called only after decoding/re-encoding pixels, so EXIF orientation is already applied.
// Keep pixel/codec data, discard metadata, embedded thumbnails and trailing payloads.
export function stripImageMetadata(input: Uint8Array): Uint8Array {
  const info = imageInfo(input);
  const parts: Uint8Array[] = [];
  if (info.mime === 'image/png') {
    parts.push(input.subarray(0, 8));
    let p = 8;
    let pixels = false;
    while (p + 12 <= input.length) {
      const length = u32(input, p);
      const end = p + length + 12;
      if (end > input.length) throw invalid();
      const kind = String.fromCharCode(...input.subarray(p + 4, p + 8));
      if (['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'].includes(kind))
        parts.push(input.subarray(p, end));
      if (kind === 'IDAT') pixels = true;
      if (kind === 'IEND') {
        if (length !== 0 || !pixels) throw invalid();
        return join(parts);
      }
      p = end;
    }
  } else {
    parts.push(input.subarray(0, 2));
    let p = 2;
    while (p + 2 <= input.length) {
      const start = p;
      if (input[p++] !== 255) throw invalid();
      while (input[p] === 255) p++;
      const marker = input[p++]!;
      if (marker === 217) {
        parts.push(input.subarray(start, p));
        return join(parts);
      }
      if (p + 2 > input.length) throw invalid();
      const size = u16(input, p);
      if (size < 2 || p + size > input.length) throw invalid();
      const end = p + size;
      if (!(marker >= 224 && marker <= 239) && marker !== 254)
        parts.push(input.subarray(start, end));
      p = end;
      if (marker === 218) {
        const scanStart = p;
        while (p + 1 < input.length) {
          if (input[p] !== 255) {
            p++;
            continue;
          }
          if (input[p + 1] === 0 || (input[p + 1]! >= 208 && input[p + 1]! <= 215)) {
            p += 2;
            continue;
          }
          break;
        }
        parts.push(input.subarray(scanStart, p));
      }
    }
  }
  throw invalid();
}

export function prepareEncodedPhoto(encoded: Uint8Array): PreparedPhoto {
  const bytes = stripImageMetadata(encoded);
  const info = imageInfo(bytes);
  if (bytes.length > MAX_PHOTO_BYTES || Math.max(info.width, info.height) > MAX_PHOTO_EDGE)
    throw new Error('This image is still too large. Choose a smaller image.');
  return { ...info, bytes };
}

export function photoDataUri(photo: PreparedPhoto): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const result: string[] = [];
  for (let i = 0; i < photo.bytes.length; i += 3) {
    const a = photo.bytes[i]!;
    const b = photo.bytes[i + 1];
    const c = photo.bytes[i + 2];
    result.push(
      alphabet[a >> 2]! +
        alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)]! +
        (b === undefined ? '=' : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)]!) +
        (c === undefined ? '=' : alphabet[c & 63]!),
    );
  }
  return `data:${photo.mime};base64,${result.join('')}`;
}
