import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { randomUUID } from 'expo-crypto';
import { createReportPdf } from '../domain/reportPdf';
import type { DoctorReport } from '../domain/report';

export function clearReportExportCache() {
  if (Platform.OS === 'web') return;
  const directory = new Directory(Paths.cache, 'cycle-report-exports');
  if (directory.exists) directory.delete();
}

async function fontBytes(module: number): Promise<Uint8Array> {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (Platform.OS !== 'web') return new File(uri).bytes();
  const response = await fetch(uri);
  if (!response.ok)
    throw new Error('The report font could not be loaded. Reopen the app and try again.');
  return new Uint8Array(await response.arrayBuffer());
}

export async function exportDoctorReport(
  report: DoctorReport,
  isActive: () => boolean,
): Promise<void> {
  const [regular, bold] = await Promise.all([
    fontBytes(require('../../assets/fonts/NotoSans-Regular.ttf')),
    fontBytes(require('../../assets/fonts/NotoSans-Bold.ttf')),
  ]);
  const bytes = await createReportPdf(report, { regular, bold });
  // A lock/navigation during generation must not unexpectedly open a share sheet afterward.
  if (!isActive()) return;
  const filename = `cycle-doctor-summary-${report.from}-to-${report.through}.pdf`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('File sharing is not available on this device.');
  if (!isActive()) return;
  const directory = new Directory(Paths.cache, 'cycle-report-exports', randomUUID());
  directory.create({ intermediates: true });
  const file = new File(directory, filename);
  let sharingStarted = false;
  try {
    file.write(bytes);
    sharingStarted = true;
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Save or share your doctor summary',
    });
  } finally {
    // The Android recipient can still be reading after the chooser returns.
    // Startup removes handed-off private copies; iOS reports completion here.
    if ((Platform.OS !== 'android' || !sharingStarted) && directory.exists) directory.delete();
  }
}
