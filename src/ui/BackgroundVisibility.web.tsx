import React from 'react';
import type { BackgroundVisibilityProps } from './BackgroundVisibility';
import { useTheme } from './theme';

// A native HTML range keeps mouse, touch, keyboard, and screen-reader behavior.
export function BackgroundVisibility({ value, disabled, onChange }: BackgroundVisibilityProps) {
  const { colors } = useTheme();
  return (
    <input
      type="range"
      aria-label="Background visibility"
      aria-valuetext={`${value} percent`}
      min={0}
      max={60}
      step={5}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
      style={{
        width: '100%',
        height: 44,
        margin: 0,
        accentColor: colors.plum,
        cursor: disabled ? 'default' : 'pointer',
      }}
    />
  );
}
