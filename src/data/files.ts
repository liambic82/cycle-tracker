import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import { MAX_BACKUP_BYTES } from '../domain/vault';

export function clearTextExportCache() {
  if (Platform.OS === 'web') return;
  const directory = new Directory(Paths.cache, 'cycle-text-exports');
  if (directory.exists) directory.delete();
  // These exact cache names were used by previews through 0.22.0. Never scan
  // external folders or delete the user's intentionally shared/exported copies.
  for (const name of [
    'cycle-tracker-journal.csv',
    'cycle-tracker-medication-schedules.csv',
    'cycle-tracker-backup.cyclevault',
    'cycle-medical-records.csv',
    'cycle-simple-import-template.csv',
  ]) {
    const legacy = new File(Paths.cache, name);
    if (legacy.exists) legacy.delete();
  }
}

export async function exportText(content: string, filename: string, mime: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const directory = new Directory(Paths.cache, 'cycle-text-exports', randomUUID());
  directory.create({ intermediates: true });
  const file = new File(directory, filename);
  let sharingStarted = false;
  try {
    file.write(content);
    if (!(await Sharing.isAvailableAsync()))
      throw new Error('File sharing is not available on this device.');
    sharingStarted = true;
    await Sharing.shareAsync(file.uri, {
      mimeType: mime,
      dialogTitle: 'Save your Trifelle export',
    });
  } finally {
    // Android's chooser result does not confirm that the recipient has read the file.
    // Retain handed-off copies until next startup; never overwrite an earlier share.
    if ((Platform.OS !== 'android' || !sharingStarted) && directory.exists) directory.delete();
  }
}

export async function readBackup(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    base64: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  if (Platform.OS === 'web') {
    if (!asset.file || asset.file.size > MAX_BACKUP_BYTES)
      throw new Error('Choose an encrypted backup smaller than 8 MB.');
    return asset.file.text();
  }
  const file = new File(asset.uri);
  try {
    if (file.size > MAX_BACKUP_BYTES)
      throw new Error('Choose an encrypted backup smaller than 8 MB.');
    return await file.text();
  } finally {
    if (file.exists) file.delete();
  }
}
