import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MAX_BACKUP_BYTES } from '../domain/vault';

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
  const file = new File(Paths.cache, filename);
  try {
    file.write(content);
    if (!(await Sharing.isAvailableAsync()))
      throw new Error('File sharing is not available on this device.');
    await Sharing.shareAsync(file.uri, {
      mimeType: mime,
      dialogTitle: 'Save your Cycle Tracker export',
    });
  } finally {
    // Exports may contain readable health information. Do not leave copies in app cache.
    if (file.exists) file.delete();
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
