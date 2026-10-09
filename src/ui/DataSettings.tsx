import React, { useState } from 'react';
import { Platform, Switch, Text, TextInput, View } from 'react-native';
import { Download, FileSpreadsheet, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react-native';
import app from '../../app.json';
import { toCSV, type Journal } from '../domain/journal';
import { exportText } from '../data/files';
import { allowPreviewScreenshots } from '../data/buildSettings';
import { Button } from './components';
import { BiometricSettings } from './BiometricSettings';
import { colors, common } from './theme';

export function DataSettings({
  journal,
  demo,
  backup,
  lock,
  erase,
  biometricEnabled,
  biometricAvailable,
  setBiometricUnlock,
  setShowPerimenopause,
}: {
  journal: Journal;
  demo: boolean;
  backup: () => string;
  lock: () => Promise<void>;
  erase: (confirmation: string) => Promise<void>;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  setBiometricUnlock: (enabled: boolean) => Promise<void>;
  setShowPerimenopause: (show: boolean) => void;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [csvConfirm, setCSVConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const deleteJournal = async () => {
    if (busy || confirmation !== 'DELETE') return;
    setBusy(true);
    setDeleteError('');
    try {
      await erase(confirmation);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Your journal could not be deleted.');
    } finally {
      setBusy(false);
    }
  };
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
        <Text style={common.heading}>Symptom preferences</Text>
        <View style={common.between}>
          <Text style={[common.label, { flex: 1 }]}>Show perimenopause choices</Text>
          <Switch
            accessibilityLabel="Show perimenopause choices"
            value={journal.preferences.showPerimenopause}
            onValueChange={setShowPerimenopause}
            trackColor={{ false: '#D9D2D5', true: colors.plum }}
            thumbColor="#fff"
          />
        </View>
        <Text style={common.body}>
          Hide the perimenopause category if it isn’t useful to you. Previously logged symptoms and
          your custom labels stay available, and nothing is removed from your records or exports.
        </Text>
        <Text style={common.small}>
          {demo
            ? 'In sample mode, this preference lasts only for this session.'
            : 'This preference saves with your encrypted journal and travels with your backup.'}
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
        <Text style={common.small}>
          {Platform.OS === 'web'
            ? 'Browsers cannot block screenshots. Keep your screen private when your journal is open.'
            : allowPreviewScreenshots
              ? 'Screenshots are enabled in this testing preview. Your journal still locks when you leave it in the background for a minute.'
              : 'Screen capture is blocked throughout the app, including sample mode. The app-switcher preview is hidden.'}
        </Text>
        <Button
          secondary
          label={demo ? 'Leave sample journal' : 'Lock now'}
          icon={LockKeyhole}
          onPress={lock}
        />
      </View>
      <BiometricSettings
        enabled={biometricEnabled}
        available={biometricAvailable}
        demo={demo}
        change={setBiometricUnlock}
      />
      <View style={[common.card, { gap: 15 }]}>
        <Text style={common.heading}>Delete your journal</Text>
        <Text style={common.body}>
          Remove all entries and custom symptoms stored by this app on this device. This cannot be
          undone. Export an encrypted backup first if you want to keep a copy.
        </Text>
        <Text style={common.small}>
          Backups, CSV files, and journals on other devices or browser addresses are separate and
          will remain where you saved them.
        </Text>
        {deleteConfirm ? (
          <View style={{ gap: 12 }}>
            <Text style={common.label}>Type DELETE to confirm</Text>
            <TextInput
              style={common.input}
              accessibilityLabel="Type DELETE to confirm journal deletion"
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              editable={!busy}
            />
            {!!deleteError && (
              <Text accessibilityRole="alert" style={common.error}>
                {deleteError}
              </Text>
            )}
            <Button
              label="Permanently delete journal"
              icon={Trash2}
              disabled={confirmation !== 'DELETE'}
              busy={busy}
              onPress={deleteJournal}
            />
            <Button
              secondary
              label="Keep journal"
              disabled={busy}
              onPress={() => {
                setDeleteConfirm(false);
                setConfirmation('');
                setDeleteError('');
              }}
            />
          </View>
        ) : (
          <Button
            secondary
            label="Delete journal from this device"
            icon={Trash2}
            disabled={demo || busy}
            onPress={() => setDeleteConfirm(true)}
          />
        )}
        {demo && <Text style={common.small}>Sample mode cannot delete your saved journal.</Text>}
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
        Early preview · {app.expo.version}
        {'\n'}Medication tracking, predictions, and cloud sync are planned for later milestones.
      </Text>
    </View>
  );
}
