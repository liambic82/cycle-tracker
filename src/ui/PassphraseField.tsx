import React, { useEffect, useState } from 'react';
import { AppState, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from './theme';

export function PassphraseField({
  label,
  value,
  onChangeText,
  placeholder,
  busy,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  busy: boolean;
  onSubmitEditing?: () => void;
}) {
  const { colors, common, dark } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const visible = revealed && !busy;
  useEffect(() => {
    if (busy || !value) setRevealed(false);
  }, [busy, value]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setRevealed(false);
    });
    const hideWhenBackgrounded = () => {
      if (document.hidden) setRevealed(false);
    };
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', hideWhenBackgrounded);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web')
        document.removeEventListener('visibilitychange', hideWhenBackgrounded);
    };
  }, []);
  const Icon = visible ? EyeOff : Eye;
  return (
    <View style={{ gap: 8 }}>
      <Text style={common.label}>{label}</Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          keyboardAppearance={dark ? 'dark' : 'light'}
          selectionColor={colors.plum}
          accessibilityLabel={label}
          secureTextEntry={!visible}
          editable={!busy}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={[common.input, { paddingRight: 58 }]}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          maxLength={1024}
          onSubmitEditing={onSubmitEditing}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          accessibilityState={{ disabled: busy, selected: visible }}
          aria-pressed={visible}
          disabled={busy}
          onPress={() => setRevealed((current) => !current)}
          style={({ pressed }) => ({
            position: 'absolute',
            right: 2,
            top: 0,
            bottom: 0,
            width: 48,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            opacity: busy ? 0.4 : pressed ? 0.65 : 1,
          })}
        >
          <Icon size={21} color={colors.plum} strokeWidth={1.8} accessible={false} aria-hidden />
        </Pressable>
      </View>
    </View>
  );
}
