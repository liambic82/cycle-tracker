import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { randomUUID } from 'expo-crypto';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import {
  MAX_ATTACHMENT_BYTES,
  parseAttachment,
  type MedicalAttachment,
} from '../domain/medicalRecords';
import { removePhotoTemp } from './photoCache';
export async function pickMedicalAttachment(
  id: string,
  signal: AbortSignal,
): Promise<MedicalAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png'],
    multiple: false,
    copyToCacheDirectory: true,
    base64: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  try {
    if (signal.aborted) return null;
    const size = Platform.OS === 'web' ? asset.file?.size : new File(asset.uri).size;
    if (!size || size > MAX_ATTACHMENT_BYTES)
      throw new Error('Choose an attachment up to 512 KiB.');
    const bytes =
      Platform.OS === 'web'
        ? new Uint8Array(await asset.file!.arrayBuffer())
        : await new File(asset.uri).bytes();
    try {
      if (signal.aborted) return null;
      const hex = bytesToHex(bytes);
      const mime = hex.startsWith('255044462d')
        ? 'application/pdf'
        : hex.startsWith('ffd8')
          ? 'image/jpeg'
          : 'image/png';
      return parseAttachment({ id, name: asset.name, mime, hex });
    } finally {
      bytes.fill(0);
    }
  } finally {
    if (Platform.OS !== 'web') removePhotoTemp(asset.uri, 'DocumentPicker');
  }
}
export function clearMedicalExportCache() {
  if (Platform.OS !== 'web') {
    const dir = new Directory(Paths.cache, 'cycle-medical-exports');
    if (dir.exists) dir.delete();
  }
}
export async function exportMedicalAttachment(
  value: MedicalAttachment,
  valid: () => boolean,
): Promise<void> {
  const attachment = parseAttachment(value);
  const bytes = hexToBytes(attachment.hex);
  const ext =
    attachment.mime === 'application/pdf'
      ? 'pdf'
      : attachment.mime === 'image/jpeg'
        ? 'jpg'
        : 'png';
  const filename = `medical-attachment-${attachment.id}.${ext}`;
  try {
    if (!valid()) return;
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: attachment.mime }));
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } else {
      const dir = new Directory(Paths.cache, 'cycle-medical-exports', randomUUID());
      dir.create({ intermediates: true });
      const file = new File(dir, filename);
      let sharingStarted = false;
      try {
        file.write(bytes);
        if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is unavailable.');
        if (valid()) {
          sharingStarted = true;
          await Sharing.shareAsync(file.uri, {
            mimeType: attachment.mime,
            dialogTitle: 'Export readable medical attachment',
          });
        }
      } finally {
        // Keep Android's handed-off URI readable until the next app startup.
        if ((Platform.OS !== 'android' || !sharingStarted) && dir.exists) dir.delete();
      }
    }
  } finally {
    bytes.fill(0);
  }
}
