import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  TRIFELLE_ACCENTS,
  TRIFELLE_COLORS,
  TRIFELLE_LEAF,
  TRIFELLE_LOOP_MS,
  TRIFELLE_STEM,
} from '../brand/trifelle';
import { serif, useTheme } from './theme';

export function TrifelleLogo({
  size = 40,
  animated = false,
  baseColor = TRIFELLE_COLORS.ivory,
  accentColor = TRIFELLE_COLORS.rose,
}: {
  size?: number;
  animated?: boolean;
  baseColor?: string;
  accentColor?: string;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  // Start still until the platform's motion preference has been read.
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    if (!animated) return;
    let current = true;
    let preferenceChanged = false;
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      preferenceChanged = true;
      if (current) setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (value) => {
        if (current && !preferenceChanged) setReduced(value);
      },
      () => {
        /* Keep the safe static fallback when the preference cannot be read. */
      },
    );
    const app = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => {
      current = false;
      motion.remove();
      app.remove();
    };
  }, [animated]);
  const moving = animated && !reduced && active;
  useEffect(() => {
    progress.setValue(0);
    if (!moving) return;
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: TRIFELLE_LOOP_MS,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
        isInteraction: false,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      progress.setValue(0);
    };
  }, [moving, progress]);
  const height = (size * 272) / 256;
  return (
    <View
      style={{ width: size, height }}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Svg width={size} height={height} viewBox="0 0 256 272">
        <Path d={TRIFELLE_STEM} fill={baseColor} />
        {[0, 1, 2, 3].map((leaf) => (
          <Path
            key={leaf}
            d={TRIFELLE_LEAF}
            transform={`rotate(${leaf * 90} 128 120)`}
            fill={!moving && leaf === 0 ? accentColor : baseColor}
          />
        ))}
      </Svg>
      {moving &&
        TRIFELLE_ACCENTS.map((range, leaf) => (
          <Animated.View
            key={leaf}
            style={[StyleSheet.absoluteFill, { opacity: progress.interpolate(range) }]}
          >
            <Svg width={size} height={height} viewBox="0 0 256 272">
              <Path
                d={TRIFELLE_LEAF}
                transform={`rotate(${leaf * 90} 128 120)`}
                fill={accentColor}
              />
            </Svg>
          </Animated.View>
        ))}
    </View>
  );
}

export function BrandLoading({ label = 'Opening your journal…' }: { label?: string }) {
  const { colors, dark } = useTheme();
  return (
    <View
      style={{ alignItems: 'center', gap: 16 }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Trifelle. ${label}`}
    >
      <TrifelleLogo
        size={116}
        animated
        baseColor={dark ? TRIFELLE_COLORS.ivory : TRIFELLE_COLORS.plum}
        accentColor={dark ? TRIFELLE_COLORS.rose : TRIFELLE_COLORS.roseOnLight}
      />
      <Text style={{ fontFamily: serif, fontSize: 42, color: colors.ink }}>Trifelle</Text>
      <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}
