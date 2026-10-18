import { createContext, useContext } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { appearanceColors, type PaletteId } from '../domain/appearance';

export const serif = Platform.select({ web: 'Georgia, serif', ios: 'Georgia', default: 'serif' });
export function createTheme(palette: PaletteId, dark: boolean) {
  const colors = appearanceColors(palette, dark);
  const common = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    between: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    title: { color: colors.ink, fontSize: 26, lineHeight: 34, fontWeight: '600' },
    heading: { color: colors.ink, fontSize: 21, lineHeight: 28, fontWeight: '600' },
    label: { color: colors.ink, fontSize: 14, fontWeight: '600', lineHeight: 22 },
    body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
    small: { color: colors.muted, fontSize: 12, lineHeight: 19 },
    eyebrow: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.8,
      lineHeight: 18,
    },
    card: {
      backgroundColor: colors.paper,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
    },
    readable: { backgroundColor: colors.paper, borderRadius: 12, padding: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      lineHeight: 22,
      color: colors.ink,
      backgroundColor: colors.paper,
      minHeight: 48,
    },
    error: { color: colors.error, fontSize: 13, lineHeight: 20 },
  });
  return { colors, common, dark };
}
export const ThemeContext = createContext(createTheme('plum', false));
export const useTheme = () => useContext(ThemeContext);
