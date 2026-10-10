import {
  imageInfo,
  MAX_PHOTO_INPUT,
  MAX_PHOTO_BYTES,
  prepareEncodedPhoto,
  type PreparedPhoto,
} from '../domain/personalImage';

function selectFile(signal: AbortSignal): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png';
    input.setAttribute('aria-label', 'Choose personal background');
    input.style.display = 'none';
    const finish = (file: File | null) => {
      signal.removeEventListener('abort', cancel);
      input.remove();
      resolve(file);
    };
    const cancel = () => finish(null);
    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', cancel, { once: true });
    signal.addEventListener('abort', cancel, { once: true });
    document.body.appendChild(input);
    if (signal.aborted) cancel();
    else input.click();
  });
}

export async function pickPersonalPhoto(signal: AbortSignal): Promise<PreparedPhoto | null> {
  const file = await selectFile(signal);
  if (!file || signal.aborted) return null;
  if (!file.size || file.size > MAX_PHOTO_INPUT)
    throw new Error('Choose a JPEG or PNG photo smaller than 12 MB.');
  const input = new Uint8Array(await file.arrayBuffer());
  let mime: 'image/jpeg' | 'image/png';
  try {
    mime = imageInfo(input).mime;
  } finally {
    input.fill(0);
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is unavailable in this browser.');
    for (const edge of [1600, 1200, 900, 640, 480, 320]) {
      if (signal.aborted) return null;
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.82));
      if (blob && blob.size <= MAX_PHOTO_BYTES) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        try {
          return signal.aborted ? null : prepareEncodedPhoto(bytes);
        } finally {
          bytes.fill(0);
        }
      }
    }
    throw new Error('This photo could not be made small enough. Choose a smaller image.');
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
