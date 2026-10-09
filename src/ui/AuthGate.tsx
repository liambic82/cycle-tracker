import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import {
  ArrowRight,
  CalendarDays,
  Heart,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Upload,
} from 'lucide-react-native';
import { Button, Brand } from './components';
import { PassphraseField } from './PassphraseField';
import { colors, common, serif } from './theme';
import { readBackup } from '../data/files';
import { parseEnvelope } from '../domain/vault';

interface Props {
  exists: boolean;
  busy: boolean;
  authProgress: string;
  error: string;
  start: (passphrase: string, create: boolean) => Promise<void>;
  explore: () => void;
  restore: (raw: string, passphrase: string) => Promise<void>;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  unlockBiometric: () => Promise<void>;
}

export function AuthGate({
  exists,
  busy,
  authProgress,
  error,
  start,
  explore,
  restore,
  biometricEnabled,
  biometricAvailable,
  unlockBiometric,
}: Props) {
  const wide = useWindowDimensions().width >= 900;
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [backup, setBackup] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!busy) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  const submit = async () => {
    setMessage('');
    if (busy) return;
    if (backup && exists && !acknowledged) {
      setMessage('Confirm that you have saved your current journal before replacing it.');
      return;
    }
    if (!exists && !backup && passphrase !== confirm) {
      setMessage('The two passphrases do not match.');
      return;
    }
    if (backup) await restore(backup, passphrase);
    else await start(passphrase, !exists);
    setPassphrase('');
    setConfirm('');
  };
  const choose = async () => {
    if (busy) return;
    try {
      const raw = await readBackup();
      if (!raw) return;
      parseEnvelope(raw);
      setBackup(raw);
      setMessage('');
      setAcknowledged(false);
      setPassphrase('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not read the backup.');
    }
  };
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: colors.background,
        padding: wide ? 48 : 24,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', maxWidth: 1150, alignSelf: 'center', flexGrow: 1 }}>
        <Brand />
        <View
          style={{
            flexGrow: 1,
            flexDirection: wide ? 'row' : 'column',
            gap: wide ? 90 : 36,
            alignItems: wide ? 'center' : 'stretch',
            paddingVertical: wide ? 65 : 36,
          }}
        >
          <View style={{ flex: wide ? 1 : undefined, minWidth: 0, gap: 24 }}>
            <View style={[common.row, { gap: 7 }]}>
              <View
                style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.sageInk }}
              />
              <Text style={common.eyebrow}>A LITTLE MORE IN TUNE WITH YOU</Text>
            </View>
            <Text
              style={{
                fontFamily: serif,
                color: colors.ink,
                fontSize: wide ? 62 : 43,
                lineHeight: wide ? 70 : 52,
              }}
            >
              Your rhythm.{'\n'}Your own space.
            </Text>
            <Text style={[common.body, { fontSize: 17, lineHeight: 28, maxWidth: 450 }]}>
              A calmer way to keep track of your cycle, notice how you feel, and make room for the
              whole picture.
            </Text>
            <View
              style={{
                backgroundColor: colors.sage,
                borderRadius: 24,
                padding: 25,
                gap: 18,
                marginTop: 8,
              }}
            >
              <View style={common.row}>
                <CalendarDays size={20} color={colors.sageInk} strokeWidth={1.6} />
                <Text style={[common.label, { flex: 1 }]}>See your days together</Text>
              </View>
              <Text style={common.body}>
                A calendar that keeps flowing. A journal that meets you wherever you are in your
                cycle.
              </Text>
              <View style={common.row}>
                <Heart size={20} color={colors.sageInk} strokeWidth={1.6} />
                <Text style={[common.label, { flex: 1 }]}>Every feeling has a place</Text>
              </View>
              <Text style={common.body}>
                Flow, symptoms, and the little things you want to remember. All on your device.
              </Text>
            </View>
          </View>
          <View
            style={[
              common.card,
              // flex: 0 becomes a zero flex-basis on web and collapses this fixed-width card.
              { flexShrink: 0, width: wide ? 390 : '100%', padding: 30, gap: 18 },
            ]}
          >
            <View
              style={{
                backgroundColor: colors.roseSoft,
                padding: 14,
                borderRadius: 16,
                alignSelf: 'flex-start',
              }}
            >
              <LockKeyhole size={25} color={colors.plum} strokeWidth={1.5} />
            </View>
            <View style={{ gap: 7 }}>
              <Text style={common.heading}>
                {backup
                  ? 'Bring your journal home'
                  : exists
                    ? 'Welcome back.'
                    : 'Make this space yours.'}
              </Text>
              <Text style={common.body}>
                {backup
                  ? 'Enter the passphrase used when this backup was created.'
                  : exists
                    ? 'Unlock the journal saved on this device.'
                    : 'Choose a passphrase to encrypt your journal. No account or email needed.'}
              </Text>
            </View>
            {exists && !backup && biometricEnabled && (
              <View style={{ gap: 10 }}>
                <Button
                  label="Unlock with biometrics"
                  icon={Fingerprint}
                  disabled={busy || !biometricAvailable}
                  onPress={() => {
                    setMessage('');
                    setPassphrase('');
                    void unlockBiometric();
                  }}
                />
                <Text style={common.small}>
                  {biometricAvailable
                    ? 'Or enter your passphrase below.'
                    : 'Biometrics are unavailable right now. Your passphrase still works.'}
                </Text>
              </View>
            )}
            <PassphraseField
              key={backup ? 'restore' : exists ? 'unlock' : 'create'}
              label="Passphrase"
              busy={busy}
              value={passphrase}
              onChangeText={setPassphrase}
              placeholder={exists || backup ? 'Your journal passphrase' : 'At least 12 characters'}
              onSubmitEditing={exists || backup ? submit : undefined}
            />
            {!exists && !backup && (
              <PassphraseField
                label="Confirm passphrase"
                busy={busy}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="One more time"
                onSubmitEditing={submit}
              />
            )}
            {backup && exists && (
              <View
                style={{ backgroundColor: colors.roseSoft, padding: 14, borderRadius: 12, gap: 12 }}
              >
                <Text style={common.body}>
                  Restoring replaces the journal on this device. Export your current journal first
                  if you want to keep it.
                </Text>
                <Button
                  secondary
                  label={acknowledged ? 'Replacement confirmed' : 'I have saved what I need'}
                  disabled={busy}
                  onPress={() => setAcknowledged(true)}
                />
              </View>
            )}
            {!!(message || error) && (
              <Text accessibilityRole="alert" style={common.error}>
                {message || error}
              </Text>
            )}
            <Button
              label={backup ? 'Restore journal' : exists ? 'Unlock journal' : 'Create my journal'}
              icon={ArrowRight}
              onPress={submit}
              busy={busy}
              disabled={
                !passphrase ||
                (!exists && !backup && (!confirm || passphrase.length < 12)) ||
                (!!backup && exists && !acknowledged)
              }
            />
            {!exists && !backup && (
              <Text style={common.small}>
                Keep your passphrase somewhere safe. There is no password reset, and a backup needs
                this same passphrase.
              </Text>
            )}
            {busy && (
              <View style={{ gap: 5 }}>
                <Text accessibilityLiveRegion="polite" style={common.small}>
                  {authProgress || 'Working…'}
                </Text>
                {elapsed >= 10 && (
                  <Text style={common.small}>Still working · {elapsed} seconds</Text>
                )}
              </View>
            )}
            {backup ? (
              <Button
                secondary
                label="Cancel restore"
                disabled={busy}
                onPress={() => {
                  setBackup(null);
                  setPassphrase('');
                }}
              />
            ) : (
              <>
                <Button
                  secondary
                  label="Explore with sample data"
                  disabled={busy}
                  onPress={explore}
                />
                <Button
                  secondary
                  label="Restore a backup"
                  disabled={busy}
                  icon={Upload}
                  onPress={choose}
                />
              </>
            )}
            <View style={[common.row, { justifyContent: 'center', paddingTop: 4 }]}>
              <ShieldCheck size={15} color={colors.sageInk} />
              <Text style={[common.small, { flexShrink: 1 }]}>Encrypted here. Yours to keep.</Text>
            </View>
          </View>
        </View>
        <Text style={[common.small, { textAlign: 'center' }]}>
          Early preview · Calendar & daily journal · Built with care, at your pace
        </Text>
      </View>
    </ScrollView>
  );
}
