import React, { useId, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAppearance } from './AppearanceProvider';
import { backgroundAssets } from './backgroundAssets';
import { useTheme } from './theme';

export function AppearanceBackdrop() {
  const { settings } = useAppearance();
  const { colors } = useTheme();
  const id = useId().replace(/[^a-z0-9]/gi, '');
  const [failed, setFailed] = useState<string | null>(null);
  if (settings.background === 'plain' || settings.visibility === 0) return null;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[StyleSheet.absoluteFill, { opacity: settings.visibility / 100, overflow: 'hidden' }]}
    >
      {settings.background === 'wash' ? (
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.plum} />
              <Stop offset="0.5" stopColor={colors.background} />
              <Stop offset="1" stopColor={colors.plum} />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill={`url(#${id})`} />
        </Svg>
      ) : failed !== settings.background ? (
        <Image
          key={settings.background}
          source={backgroundAssets[settings.background]}
          resizeMode="cover"
          accessible={false}
          fadeDuration={0}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          onError={() => setFailed(settings.background)}
        />
      ) : null}
    </View>
  );
}
