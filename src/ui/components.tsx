import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { useTheme, serif } from './theme';
import { TrifelleLogo } from './TrifelleLogo';
import { TRIFELLE_COLORS } from '../brand/trifelle';

export function Button({
  label,
  onPress,
  icon: Icon,
  secondary = false,
  quiet = false,
  danger = false,
  disabled = false,
  busy = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  secondary?: boolean;
  quiet?: boolean;
  danger?: boolean;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const accent = danger ? colors.error : colors.plumDark;
  const foreground =
    secondary || quiet
      ? danger
        ? colors.error
        : colors.ink
      : danger
        ? colors.onError
        : colors.onAccent;
  const iconColor = secondary || quiet ? (danger ? colors.error : colors.plum) : foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled || busy}
      aria-busy={busy}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: quiet ? 8 : 14,
          paddingVertical: 10,
          minHeight: 44,
          borderRadius: 10,
          flexDirection: 'row',
          gap: 9,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: quiet ? 'transparent' : secondary ? colors.paper : accent,
          borderColor: secondary && !danger ? colors.line : accent,
          borderWidth: quiet ? 0 : 1,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        Icon && <Icon size={17} color={iconColor} strokeWidth={1.7} />
      )}
      <Text
        style={{
          fontSize: 13,
          flexShrink: 1,
          fontWeight: '600',
          color: foreground,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  accessibilityLabel,
  selected,
  disabled = false,
  onPress,
  icon: Icon,
}: {
  label: string;
  accessibilityLabel?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  icon?: LucideIcon;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected, disabled }}
      aria-pressed={!!selected}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 42,
        maxWidth: '100%',
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderWidth: 1,
        borderColor: selected ? colors.plum : colors.line,
        borderRadius: 10,
        backgroundColor: selected ? colors.accentSoft : colors.paper,
        opacity: disabled ? 0.5 : pressed ? 0.65 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      })}
    >
      {Icon && <Icon size={15} color={selected ? colors.plum : colors.muted} />}
      <Text
        style={{
          fontSize: 12,
          flexShrink: 1,
          lineHeight: 20,
          color: selected ? colors.plum : colors.muted,
          fontWeight: selected ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Brand({ small = false }: { small?: boolean }) {
  const { colors, common } = useTheme();
  return (
    <View style={[common.row, { gap: 10 }]}>
      <View
        style={{
          width: small ? 33 : 39,
          height: small ? 33 : 39,
          borderRadius: 13,
          backgroundColor: TRIFELLE_COLORS.plum,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TrifelleLogo size={small ? 29 : 35} />
      </View>
      <Text style={{ fontFamily: serif, color: colors.ink, fontSize: small ? 23 : 27 }}>
        Trifelle
      </Text>
    </View>
  );
}

export function SectionLabel({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  const { colors, common } = useTheme();
  return (
    <View style={[common.row, { marginBottom: 12 }]}>
      {Icon && <Icon size={16} color={colors.plum} strokeWidth={1.6} />}
      <Text accessibilityRole="header" style={common.label}>
        {children}
      </Text>
    </View>
  );
}
