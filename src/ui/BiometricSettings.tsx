import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Fingerprint } from 'lucide-react-native';
import { Button } from './components';
import { useTheme } from './theme';

export function BiometricSettings({
  enabled,
  available,
  demo,
  change,
}: {
  enabled: boolean;
  available: boolean;
  demo: boolean;
  change: (enabled: boolean) => Promise<void>;
}) {
  const { colors, common } = useTheme();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await change(next);
      setConfirm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'The setting could not be changed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[common.card, { gap: 15 }]}>
      <Fingerprint size={27} color={colors.plum} strokeWidth={1.5} />
      <Text style={common.heading}>An easier way to unlock</Text>
      {Platform.OS === 'web' ? (
        <Text style={common.body}>
          Biometric unlock is available in the installed mobile app. Use your passphrase in this
          browser.
        </Text>
      ) : (
        <>
          <Text style={common.body}>
            {enabled && !demo
              ? 'Biometric unlock is on for this journal on this device.'
              : 'Use a supported fingerprint or face unlock instead of typing your passphrase each time.'}
          </Text>
          <Text style={common.small}>
            Your device protects a copy of your journal’s encryption key. Anyone with biometrics
            enrolled on this device may be able to unlock it.
          </Text>
          <Text style={common.small}>
            Keep your passphrase. You still need it for backups, another device, or if biometric
            access changes. Restoring or deleting your journal turns biometric unlock off.
          </Text>
          {demo ? (
            <Text style={common.small}>Open your own journal to manage biometric unlock.</Text>
          ) : enabled ? (
            <Button
              secondary
              label="Turn off biometric unlock"
              busy={busy}
              onPress={() => toggle(false)}
            />
          ) : !available ? (
            <Text style={common.body}>
              Set up a supported fingerprint or face unlock in your device settings, then return
              here. Your passphrase works without biometrics.
            </Text>
          ) : confirm ? (
            <>
              <Button
                label="Enable on this device"
                icon={Fingerprint}
                busy={busy}
                onPress={() => toggle(true)}
              />
              <Button
                secondary
                label="Keep using passphrase"
                disabled={busy}
                onPress={() => {
                  setConfirm(false);
                  setError('');
                }}
              />
            </>
          ) : (
            <Button
              secondary
              label="Enable biometric unlock"
              icon={Fingerprint}
              onPress={() => {
                setConfirm(true);
                setError('');
              }}
            />
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={common.error}>
              {error}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
