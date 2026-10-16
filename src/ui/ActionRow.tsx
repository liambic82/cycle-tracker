import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useTheme } from './theme';

export function ActionRow({
  label,
  detail,
  onPress,
  expanded,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  expanded?: boolean;
}) {
  const { colors, common } = useTheme();
  const Icon = expanded ? ChevronDown : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      aria-expanded={expanded}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderColor: colors.line,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={common.label}>{label}</Text>
        {!!detail && <Text style={common.small}>{detail}</Text>}
      </View>
      <Icon color={colors.plum} size={20} />
    </Pressable>
  );
}
