import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Download, FileSpreadsheet, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { toCSV, type Journal } from '../domain/journal';
import { exportText } from '../data/files';
import { Button } from './components';
import { colors, common } from './theme';

export function DataSettings({
  journal,
  demo,
  backup,
  lock,
}: {
  journal: Journal;
  demo: boolean;
  backup: () => string;
  lock: () => Promise<void>;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [csvConfirm, setCSVConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const download = async (csv: boolean) => {
    setBusy(true);
    setMessage('');
    setError(false);
    try {
      await exportText(
        csv ? toCSV(journal) : backup(),
        csv ? 'cycle-tracker-journal.csv' : 'cycle-tracker-backup.cyclevault',
        csv ? 'text/csv' : 'application/octet-stream',
      );
      setMessage('Your export is ready. Check your downloads or the location you selected.');
      setCSVConfirm(false);
    } catch (err) {
      setError(true);
      setMessage(err instanceof Error ? err.message : 'Could not export your journal.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 22 }}>
      <View style={[common.card, { backgroundColor: colors.sage, gap: 12 }]}>
        <ShieldCheck size={27} color={colors.sageInk} strokeWidth={1.5} />
        <Text style={common.heading}>Your journal belongs to you.</Text>
        <Text style={common.body}>
          Your records are encrypted with your passphrase and stored on this device. This preview
          has no account, cloud sync, or analytics.
        </Text>
      </View>
      <View style={[common.card, { gap: 15 }]}>
        <Text style={common.heading}>Keep a copy</Text>
        <Text style={common.body}>
          An encrypted backup contains your full journal. Save a copy somewhere you trust, and use
          “Restore a backup” on the lock screen to bring it to another device.
        </Text>
        <Text style={common.small}>
          You’ll need the passphrase that was used to create the backup. There is no recovery
          service. Browser data can be removed when you clear site storage, so keep a separate
          backup.
        </Text>
        <Button
          label="Download encrypted backup"
          icon={Download}
          onPress={() => download(false)}
          busy={busy}
          disabled={demo}
        />
        {demo && (
          <Text style={common.small}>Create your own journal to use encrypted backups.</Text>
        )}
      </View>
      <View style={[common.card, { gap: 15 }]}>
        <Text style={common.heading}>Take your records with you</Text>
        <Text style={common.body}>
          Export daily entries as a spreadsheet-friendly CSV for your own records or to share with
          your doctor.
        </Text>
        <Text style={common.small}>
          CSV files are readable and are not encrypted. Only share them with people you choose.
        </Text>
        {csvConfirm ? (
          <View style={{ gap: 10 }}>
            <Button
              label="Export readable CSV"
              icon={FileSpreadsheet}
              onPress={() => download(true)}
              busy={busy}
            />
            <Button secondary label="Cancel export" onPress={() => setCSVConfirm(false)} />
          </View>
        ) : (
          <Button
            secondary
            label="Export CSV"
            icon={FileSpreadsheet}
            onPress={() => setCSVConfirm(true)}
          />
        )}
      </View>
      <View style={[common.card, { gap: 15 }]}>
        <Text style={common.heading}>Lock your journal</Text>
        <Text style={common.body}>
          Lock whenever you’re done. Your journal also locks after the app has been in the
          background for a minute. It always starts locked after reopening.
        </Text>
        <Button
          secondary
          label={demo ? 'Leave sample journal' : 'Lock now'}
          icon={LockKeyhole}
          onPress={lock}
        />
      </View>
      {!!message && (
        <Text
          accessibilityRole={error ? 'alert' : undefined}
          style={error ? common.error : common.body}
        >
          {message}
        </Text>
      )}
      <Text style={common.small}>
        Early preview · 0.1.0{'\n'}Medication tracking, predictions, biometrics, and cloud sync are
        planned for later milestones.
      </Text>
    </View>
  );
}
