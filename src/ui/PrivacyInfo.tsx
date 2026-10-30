import React, { useState } from 'react';
import { Linking, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import policy from '../content/privacy.json';
import { Button } from './components';
import { useTheme } from './theme';

// Static, bundled policy stays available before setup, while locked and offline.
// This component receives no journal, health data or authentication state.
export function PrivacyInfo() {
  const { colors, common } = useTheme();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const close = () => {
    setOpen(false);
    setError('');
  };
  return (
    <>
      <Button quiet label="Privacy & support" onPress={() => setOpen(true)} />
      <Modal visible={open} animationType="none" onRequestClose={close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
          <View
            style={[
              common.between,
              { padding: 16, gap: 12, borderBottomWidth: 1, borderColor: colors.line },
            ]}
          >
            <Text accessibilityRole="header" style={[common.heading, { flexShrink: 1 }]}>
              Privacy & support
            </Text>
            <Button secondary label="Close privacy" onPress={close} />
          </View>
          <ScrollView
            contentContainerStyle={{
              width: '100%',
              maxWidth: 760,
              alignSelf: 'center',
              padding: 24,
              gap: 20,
            }}
          >
            <Text style={common.small}>
              {policy.publisher} · Updated {policy.updated}
            </Text>
            <Text style={common.body}>{policy.intro}</Text>
            {policy.sections.map((section) => (
              <View key={section.id} style={{ gap: 10 }}>
                <Text accessibilityRole="header" style={common.heading}>
                  {section.title}
                </Text>
                {section.paragraphs.map((paragraph, index) => (
                  <Text key={index} style={common.body}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            ))}
            <Text selectable style={common.body}>
              {policy.email}
            </Text>
            <Button
              secondary
              label="Open email app for support"
              onPress={() => {
                setError('');
                void Linking.openURL(`mailto:${policy.email}?subject=Trifelle%20support`).catch(
                  () => setError(`Could not open an email app. Contact ${policy.email}.`),
                );
              }}
            />
            {!!error && (
              <Text accessibilityRole="alert" style={common.error}>
                {error}
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
