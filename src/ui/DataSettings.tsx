import type { AutoSleepState } from '../data/foregroundSleepImporter';
import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, Switch, Text, TextInput, View } from 'react-native';
import { Download, FileSpreadsheet, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react-native';
import app from '../../app.json';
import { toCSV, type Journal } from '../domain/journal';
import { medicationCSV } from '../domain/medications';
import {
  emptySexualHealthExport,
  SEXUAL_HEALTH_FIELDS,
  SEXUAL_HEALTH_LABELS,
} from '../domain/sexualHealth';
import { exportText } from '../data/files';
import { allowPreviewScreenshots } from '../data/buildSettings';
import { Button } from './components';
import { BiometricSettings } from './BiometricSettings';
import { DoctorReport } from './DoctorReport';
import { AppearanceSettings } from './AppearanceSettings';
import { JournalImport } from './JournalImport';
import { PeriodRangeEditor } from './PeriodRangeEditor';
import { toDay, type Day } from '../domain/dates';
import { MedicalRecords } from './MedicalRecords';
import { SleepImportSettings } from './SleepImportSettings';
import type { PhotoControls } from '../data/personalBackgroundStore';
import { useTheme } from './theme';
import { PrivacyInfo } from './PrivacyInfo';

export function DataSettings({
  autoSleep,
  checkSleep,
  photo,
  journal,
  demo,
  backup,
  lock,
  erase,
  biometricEnabled,
  biometricAvailable,
  setBiometricUnlock,
  setShowPerimenopause,
  onViewChange,
  update,
  saveStatus,
  openDay,
}: {
  autoSleep: AutoSleepState;
  checkSleep: () => Promise<void>;
  photo: PhotoControls;
  journal: Journal;
  demo: boolean;
  backup: () => string;
  lock: () => Promise<void>;
  erase: (confirmation: string) => Promise<void>;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  setBiometricUnlock: (enabled: boolean) => Promise<void>;
  setShowPerimenopause: (show: boolean) => void;
  onViewChange: () => void;
  update: (transform: (journal: Journal) => Journal) => void;
  saveStatus: React.ReactNode;
  openDay: (day: Day) => void;
}) {
  const { colors, common, dark } = useTheme();
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [csvConfirm, setCSVConfirm] = useState(false);
  const [medicationConfirm, setMedicationConfirm] = useState(false);
  const [sexualExport, setSexualExport] = useState(emptySexualHealthExport);
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [journalImportOpen, setJournalImportOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [medicalOpen, setMedicalOpen] = useState(false);
  const [testExport, setTestExport] = useState(false);
  const [sleepImportOpen, setSleepImportOpen] = useState(false);
  useEffect(() => {
    if (!appearanceOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setAppearanceOpen(false);
      onViewChange();
      return true;
    });
    return () => subscription.remove();
  }, [appearanceOpen, onViewChange]);
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
  const download = async (kind: 'journal' | 'schedules' | 'backup') => {
    setBusy(true);
    setMessage('');
    setError(false);
    try {
      await exportText(
        kind === 'journal'
          ? toCSV(journal, sexualExport, testExport)
          : kind === 'schedules'
            ? medicationCSV(journal.medications)
            : backup(),
        kind === 'journal'
          ? 'cycle-tracker-journal.csv'
          : kind === 'schedules'
            ? 'cycle-tracker-medication-schedules.csv'
            : 'cycle-tracker-backup.cyclevault',
        kind === 'backup' ? 'application/octet-stream' : 'text/csv',
      );
      setMessage('Your export is ready. Check your downloads or the location you selected.');
      setCSVConfirm(false);
      setTestExport(false);
      setMedicationConfirm(false);
    } catch (err) {
      setError(true);
      setMessage(err instanceof Error ? err.message : 'Could not export your journal.');
    } finally {
      setBusy(false);
    }
  };
  if (periodOpen)
    return (
      <PeriodRangeEditor
        journal={journal}
        today={toDay(new Date())}
        update={update}
        saveStatus={saveStatus}
        onViewChange={onViewChange}
        closeLabel="Back to Your data"
        close={() => {
          setPeriodOpen(false);
          onViewChange();
        }}
      />
    );
  if (journalImportOpen)
    return (
      <JournalImport
        journal={journal}
        update={update}
        saveStatus={saveStatus}
        onViewChange={onViewChange}
        close={() => {
          setJournalImportOpen(false);
          onViewChange();
        }}
      />
    );
  if (medicalOpen)
    return (
      <MedicalRecords
        journal={journal}
        update={update}
        saveStatus={saveStatus}
        onViewChange={onViewChange}
        close={() => {
          setMedicalOpen(false);
          onViewChange();
        }}
      />
    );
  if (sleepImportOpen)
    return (
      <SleepImportSettings
        autoSleep={autoSleep}
        checkSleep={checkSleep}
        openDay={openDay}
        saveStatus={saveStatus}
        journal={journal}
        demo={demo}
        update={update}
        onViewChange={onViewChange}
        close={() => {
          setSleepImportOpen(false);
          onViewChange();
        }}
      />
    );
  if (appearanceOpen)
    return (
      <AppearanceSettings
        photo={photo}
        close={() => {
          setAppearanceOpen(false);
          onViewChange();
        }}
      />
    );
  if (reportOpen)
    return (
      <DoctorReport
        journal={journal}
        demo={demo}
        onViewChange={onViewChange}
        close={() => {
          setReportOpen(false);
          onViewChange();
        }}
      />
    );
  return (
    <View style={{ gap: 22 }}>
      <View style={[common.card, { gap: 15 }]}>
        <Text style={common.heading}>Earlier records</Text>
        <Text style={common.body}>
          Record a period's start and finish together, or import a prepared CSV file.
        </Text>
        <Button
          secondary
          label="Add period"
          onPress={() => {
            setPeriodOpen(true);
            onViewChange();
          }}
        />
        <Button
          secondary
          label="Import CSV"
          onPress={() => {
            setJournalImportOpen(true);
            onViewChange();
          }}
        />
      </View>
      <View style={[common.card, { gap: 15 }]}>
        <Text style={common.heading}>Medical records & doctor visits</Text>
        <Text style={common.body}>
          Bloodwork, attachments, appointments, questions and medical history.
        </Text>
        <Button
          secondary
          label="Open medical records"
          onPress={() => {
            setMedicalOpen(true);
            onViewChange();
          }}
        />
      </View>
      {Platform.OS === 'android' && (
        <View style={[common.card, { gap: 12 }]}>
          <Text style={common.heading}>Android home-screen widget</Text>
          <Text style={common.body}>
            Long-press an empty area of the Android home screen, choose Widgets, then Trifelle
            journal. The shortcut opens the app through its normal lock screen. It displays no
            health records and needs no background access.
          </Text>
        </View>
      )}
      <View style={[common.card, { gap: 14 }]}>
        <Text style={common.heading}>Appearance</Text>
        <Text style={common.body}>
          Choose your colors, light or dark mode, and a built-in background or your own photo.
        </Text>
        <Button
          secondary
          label="Customize appearance"
          onPress={() => {
            setAppearanceOpen(true);
            onViewChange();
          }}
        />
      </View>
      <View style={[common.card, { backgroundColor: colors.sage, gap: 12 }]}>
        <ShieldCheck size={27} color={colors.sageInk} strokeWidth={1.5} />
        <Text style={common.heading}>Your journal belongs to you.</Text>
        <Text style={common.body}>
          Your records are encrypted with your passphrase and stored on this device. This preview
          has no account, cloud sync, or analytics.
        </Text>
      </View>
      <View style={[common.card, { gap: 15 }]}>
        <Text style={common.heading}>Wearable sleep</Text>
        <Text style={common.body}>
          {Platform.OS === 'ios'
            ? 'Review sleep saved in your journal or restored from an Android backup. Apple Health import is not included in this iPhone preview.'
            : 'Review sleep shared by Fitbit / Google Health through Android Health Connect. Imported copies stay separate from manual sleep details.'}
        </Text>
        <Button
          secondary
          label={Platform.OS === 'ios' ? 'View imported sleep' : 'Import wearable sleep'}
          onPress={() => {
            setSleepImportOpen(true);
            onViewChange();
          }}
        />
      </View>
      <View style={[common.card, { gap: 15 }]}>
        <Text style={common.heading}>Doctor summary</Text>
        <Text style={common.body}>
          Build a PDF from the dates and sections you choose, then review the content before saving
          or sharing it.
        </Text>
        <Button
          secondary
          label="Create doctor summary"
          onPress={() => {
            setReportOpen(true);
            onViewChange();
          }}
        />
      </View>
      <View style={[common.card, { gap: 15 }]}>
        <Text style={common.heading}>Symptom preferences</Text>
        <View style={common.between}>
          <Text style={[common.label, { flex: 1 }]}>Show perimenopause choices</Text>
          <Switch
            accessibilityLabel="Show perimenopause choices"
            value={journal.preferences.showPerimenopause}
            onValueChange={setShowPerimenopause}
            trackColor={{ false: colors.line, true: colors.plum }}
            thumbColor={colors.switchThumb}
          />
        </View>
        <Text style={common.body}>
          Hide the perimenopause category and its education topic if they aren’t useful to you.
          Previously logged symptoms and your custom labels stay available, and nothing is removed
          from your records or exports.
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
        <Text style={common.small}>
          New backups need preview 0.20.0 or later. Update the receiving app before restoring.
          Earlier backups still open here. Encrypted backups include all sexual-health fields,
          regardless of your CSV choices, plus all medication schedules and dose records.
        </Text>
        <Button
          label="Download encrypted backup"
          icon={Download}
          onPress={() => download('backup')}
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
          Includes symptom ratings, sleep details, dose records with notes, product records, and
          clot/flooding observations. Blank values mean not logged, not No or zero.
        </Text>
        <Text style={common.small}>
          CSV files are readable and are not encrypted. Only share them with people you choose.
        </Text>
        {csvConfirm ? (
          <View style={{ gap: 10 }}>
            <View style={common.between}>
              <Text style={[common.label, { flex: 1 }]}>
                Include test and fertility observations
              </Text>
              <Switch
                accessibilityLabel="Include test and fertility observations in CSV"
                value={testExport}
                onValueChange={setTestExport}
                disabled={busy}
              />
            </View>
            <Text style={common.small}>
              Includes basal temperature, LH/pregnancy tests and cervical mucus only when selected.
            </Text>
            <Text style={common.label}>Optional sexual-health columns</Text>
            <Text style={common.small}>
              Choose for this export only. All four start off each time.
            </Text>
            {SEXUAL_HEALTH_FIELDS.map((field) => (
              <View key={field} style={[common.between, { minHeight: 48 }]}>
                <Text style={[common.label, { flex: 1 }]}>{SEXUAL_HEALTH_LABELS[field]}</Text>
                <Switch
                  accessibilityLabel={`Include ${SEXUAL_HEALTH_LABELS[field].toLowerCase()} in CSV`}
                  value={sexualExport[field]}
                  disabled={busy}
                  onValueChange={(include) =>
                    setSexualExport((current) => ({ ...current, [field]: include }))
                  }
                  trackColor={{ false: colors.line, true: colors.plum }}
                  thumbColor={colors.switchThumb}
                />
              </View>
            ))}
            <Text style={common.small}>
              Excluded columns and days with only excluded details are omitted. Notes and symptoms
              are still included, even if you wrote about sexual health there.
            </Text>
            <Button
              label="Export readable CSV"
              icon={FileSpreadsheet}
              onPress={() => download('journal')}
              busy={busy}
            />
            <Button
              secondary
              label="Cancel export"
              disabled={busy}
              onPress={() => setCSVConfirm(false)}
            />
          </View>
        ) : (
          <Button
            secondary
            label="Export CSV"
            icon={FileSpreadsheet}
            onPress={() => {
              setSexualExport(emptySexualHealthExport());
              setTestExport(false);
              setCSVConfirm(true);
            }}
          />
        )}
      </View>
      <View style={[common.card, { gap: 15 }]}>
        <Text style={common.heading}>Medication schedule history</Text>
        <Text style={common.body}>
          Export your medication and supplement names, planned doses, dated schedule changes, and
          schedule notes. Daily dose records are in the journal CSV above.
        </Text>
        <Text style={common.small}>
          This CSV is readable and not encrypted. It contains every saved schedule, including paused
          and future plans.
        </Text>
        {medicationConfirm ? (
          <View style={{ gap: 10 }}>
            <Button
              label="Export readable schedules"
              busy={busy}
              onPress={() => download('schedules')}
            />
            <Button
              secondary
              label="Cancel schedule export"
              disabled={busy}
              onPress={() => setMedicationConfirm(false)}
            />
          </View>
        ) : (
          <Button
            secondary
            label="Export medication schedules"
            disabled={busy || !journal.medications.length}
            onPress={() => setMedicationConfirm(true)}
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
          Remove all entries, medication schedules, and custom symptoms stored by this app on this
          device. This cannot be undone. Export an encrypted backup first if you want to keep a
          copy. The app’s saved background photo is also removed; your original photo is unchanged.
        </Text>
        <Text style={common.small}>
          Backups, CSV files, and journals on other devices or browser addresses are separate and
          will remain where you saved them.
        </Text>
        {deleteConfirm ? (
          <View style={{ gap: 12 }}>
            <Text style={common.label}>Type DELETE to confirm</Text>
            <TextInput
              keyboardAppearance={dark ? 'dark' : 'light'}
              selectionColor={colors.plum}
              placeholderTextColor={colors.muted}
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
          style={[error ? common.error : common.body, common.readable]}
        >
          {message}
        </Text>
      )}
      <PrivacyInfo />
      <Text style={[common.small, common.readable]}>
        Early preview · {app.expo.version}
        {'\n'}Medication reminders are available in the installed mobile app. Period estimates are
        optional and experimental. Cloud sync is planned for a later milestone.
      </Text>
    </View>
  );
}
