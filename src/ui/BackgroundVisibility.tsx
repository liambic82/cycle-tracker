import React from 'react';
import Slider from '@react-native-community/slider';
import { useTheme } from './theme';

export type BackgroundVisibilityProps = {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

export function BackgroundVisibility({ value, disabled, onChange }: BackgroundVisibilityProps) {
  const { colors } = useTheme();
  return (
    <Slider
      accessibilityLabel="Background visibility"
      accessibilityValue={{ min: 0, max: 60, now: value, text: `${value} percent` }}
      minimumValue={0}
      maximumValue={60}
      step={5}
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(Math.round(next / 5) * 5)}
      minimumTrackTintColor={colors.plum}
      maximumTrackTintColor={colors.line}
      thumbTintColor={colors.plum}
      style={{ width: '100%', height: 44 }}
    />
  );
}
