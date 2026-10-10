import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  imageInfo,
  MAX_PHOTO_INPUT,
  MAX_PHOTO_BYTES,
  prepareEncodedPhoto,
  type PreparedPhoto,
} from '../domain/personalImage';
import { removePhotoTemp } from './photoCache';

export async function pickPersonalPhoto(signal: AbortSignal): Promise<PreparedPhoto | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/jpeg', 'image/png'],
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const uri = result.assets[0].uri;
  try {
    if (signal.aborted) return null;
    const file = new File(uri);
    if (!file.size || file.size > MAX_PHOTO_INPUT)
      throw new Error('Choose a JPEG or PNG photo smaller than 12 MB.');
    const input = await file.bytes();
    let mime: 'image/jpeg' | 'image/png';
    try {
      mime = imageInfo(input).mime;
    } finally {
      input.fill(0);
    }
    const context = ImageManipulator.manipulate(uri);
    try {
      // The SDK normalizes EXIF orientation while loading; resize uses displayed dimensions.
      const original = await context.renderAsync();
      const width = original.width;
      const height = original.height;
      original.release();
      for (const edge of [1600, 1200, 900, 640, 480, 320]) {
        if (signal.aborted) return null;
        const scale = Math.min(1, edge / Math.max(width, height));
        context.reset();
        context.resize({
          width: Math.max(1, Math.round(width * scale)),
          height: Math.max(1, Math.round(height * scale)),
        });
        const rendered = await context.renderAsync();
        try {
          const saved = await rendered.saveAsync({
            format: mime === 'image/png' ? SaveFormat.PNG : SaveFormat.JPEG,
            compress: 0.82,
          });
          try {
            const encoded = await new File(saved.uri).bytes();
            try {
              if (!signal.aborted && encoded.length <= MAX_PHOTO_BYTES)
                return prepareEncodedPhoto(encoded);
            } finally {
              encoded.fill(0);
            }
          } finally {
            removePhotoTemp(saved.uri, 'ImageManipulator');
          }
        } finally {
          rendered.release();
        }
      }
      if (signal.aborted) return null;
      throw new Error('This photo could not be made small enough. Choose a smaller image.');
    } finally {
      context.release();
    }
  } finally {
    removePhotoTemp(uri, 'DocumentPicker');
  }
}
