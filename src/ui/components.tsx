import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Flower2, type LucideIcon } from 'lucide-react-native';
import { colors, common, serif } from './theme';

export function Button({
  label,
  onPress,
  icon: Icon,
  secondary = false,
  disabled = false,
  busy = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 18,
          paddingVertical: 12,
          minHeight: 46,
          borderRadius: 12,
          flexDirection: 'row',
          gap: 9,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: secondary ? colors.paper : colors.plumDark,
          borderColor: secondary ? colors.line : colors.plumDark,
          borderWidth: 1,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={secondary ? colors.plum : '#fff'} />
      ) : (
        Icon && <Icon size={17} color={secondary ? colors.plum : '#fff'} strokeWidth={1.7} />
      )}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: secondary ? colors.ink : '#fff',
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
  selected,
  onPress,
  icon: Icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: LucideIcon;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 42,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderWidth: 1,
        borderColor: selected ? '#C59BAB' : colors.line,
        borderRadius: 10,
        backgroundColor: selected ? colors.roseSoft : colors.paper,
        opacity: pressed ? 0.65 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      })}
    >
      {Icon && <Icon size={15} color={selected ? colors.roseInk : colors.muted} />}
      <Text
        style={{
          fontSize: 12,
          lineHeight: 20,
          color: selected ? colors.roseInk : colors.muted,
          fontWeight: selected ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <View style={[common.row, { gap: 10 }]}>
      <View
        style={{
          width: small ? 33 : 39,
          height: small ? 33 : 39,
          borderRadius: 13,
          backgroundColor: colors.plumDark,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Flower2 color="#F0DED8" size={small ? 22 : 27} strokeWidth={1.4} />
      </View>
      <Text style={{ fontFamily: serif, color: colors.ink, fontSize: small ? 23 : 27 }}>
        Cycle<Text style={{ color: colors.plum }}>.</Text>
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
  return (
    <View style={[common.row, { marginBottom: 12 }]}>
      {Icon && <Icon size={16} color={colors.plum} strokeWidth={1.6} />}
      <Text style={common.label}>{children}</Text>
    </View>
  );
}
