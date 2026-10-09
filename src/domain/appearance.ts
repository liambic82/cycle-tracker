export const PALETTES = [
  {
    id: 'plum',
    name: 'Plum',
    swatch: '#775368',
    background: '#F8F6F2',
    accent: '#684256',
    soft: '#F3E8EF',
    darkBackground: '#1D1B20',
    darkAccent: '#E6B3CF',
    darkSoft: '#42303D',
  },
  {
    id: 'sage',
    name: 'Sage',
    swatch: '#7D9679',
    background: '#F3F5EE',
    accent: '#365D45',
    soft: '#E3EDDD',
    darkBackground: '#191F1B',
    darkAccent: '#AFD4B6',
    darkSoft: '#304638',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    swatch: '#487C91',
    background: '#F1F5F7',
    accent: '#285F78',
    soft: '#E1EEF4',
    darkBackground: '#182027',
    darkAccent: '#A2CDE3',
    darkSoft: '#2C4555',
  },
  {
    id: 'buttercup-morning',
    name: 'Buttercup Morning',
    swatch: '#F3D76A',
    background: '#FCF9ED',
    accent: '#765700',
    soft: '#F7EDC4',
    darkBackground: '#242119',
    darkAccent: '#E5CD80',
    darkSoft: '#494027',
  },
  {
    id: 'apricot-blossom',
    name: 'Apricot Blossom',
    swatch: '#ECA36E',
    background: '#FCF5EE',
    accent: '#91491F',
    soft: '#F8E2D0',
    darkBackground: '#261E19',
    darkAccent: '#F0BD97',
    darkSoft: '#4A3529',
  },
  {
    id: 'lavender-haze',
    name: 'Lavender Haze',
    swatch: '#B9A3D5',
    background: '#F6F3FA',
    accent: '#655087',
    soft: '#ECE3F5',
    darkBackground: '#201C28',
    darkAccent: '#D0BCEB',
    darkSoft: '#3F334F',
  },
  {
    id: 'rosewater',
    name: 'Rosewater',
    swatch: '#E9A8BF',
    background: '#FCF3F6',
    accent: '#934A6C',
    soft: '#F5DFE8',
    darkBackground: '#271D22',
    darkAccent: '#F0BAD0',
    darkSoft: '#4B303E',
  },
  {
    id: 'bluebell-mist',
    name: 'Bluebell Mist',
    swatch: '#A2C5E6',
    background: '#F2F7FC',
    accent: '#365F83',
    soft: '#E0ECF7',
    darkBackground: '#1B222B',
    darkAccent: '#B5D4EF',
    darkSoft: '#304354',
  },
  {
    id: 'silver-moon',
    name: 'Silver Moon',
    swatch: '#96989E',
    background: '#F1F1F2',
    accent: '#535860',
    soft: '#E0E1E5',
    darkBackground: '#202124',
    darkAccent: '#D0D2D8',
    darkSoft: '#3B3E45',
  },
] as const;
export type PaletteId = (typeof PALETTES)[number]['id'];
export const BACKGROUNDS = [
  { id: 'buttercup-morning-01-meadow-light', palette: 'buttercup-morning', name: 'Meadow Light' },
  { id: 'buttercup-morning-02-sunlit-petals', palette: 'buttercup-morning', name: 'Sunlit Petals' },
  { id: 'apricot-blossom-01-orchard-bloom', palette: 'apricot-blossom', name: 'Orchard Bloom' },
  { id: 'apricot-blossom-02-apricot-dawn', palette: 'apricot-blossom', name: 'Apricot Dawn' },
  { id: 'lavender-haze-01-lavender-whisper', palette: 'lavender-haze', name: 'Lavender Whisper' },
  { id: 'lavender-haze-02-lilac-dusk', palette: 'lavender-haze', name: 'Lilac Dusk' },
  { id: 'rosewater-01-petal-ripples', palette: 'rosewater', name: 'Petal Ripples' },
  { id: 'rosewater-02-garden-reverie', palette: 'rosewater', name: 'Garden Reverie' },
  { id: 'bluebell-mist-01-bluebell-garden', palette: 'bluebell-mist', name: 'Bluebell Garden' },
  { id: 'bluebell-mist-02-morning-dew', palette: 'bluebell-mist', name: 'Morning Dew' },
  { id: 'silver-moon-01-moonlit-magnolia', palette: 'silver-moon', name: 'Moonlit Magnolia' },
  { id: 'silver-moon-02-moonveil', palette: 'silver-moon', name: 'Moonveil' },
] as const;
export type BackgroundId = (typeof BACKGROUNDS)[number]['id'];
export type AppearanceSettings = {
  version: 1;
  palette: PaletteId;
  mode: 'system' | 'light' | 'dark';
  background: 'plain' | 'wash' | BackgroundId;
  visibility: number;
};
export const defaultAppearance = (): AppearanceSettings => ({
  version: 1,
  palette: 'plum',
  mode: 'system',
  background: 'plain',
  visibility: 25,
});

// Preferences have their own schema/key, never fields in the health journal or its backups.
export function parseAppearance(value: unknown): AppearanceSettings {
  if (!value || typeof value !== 'object') throw new Error('Invalid appearance preferences');
  const v = value as Record<string, unknown>;
  if (
    v.version !== 1 ||
    !PALETTES.some((p) => p.id === v.palette) ||
    !['system', 'light', 'dark'].includes(v.mode as string) ||
    (v.background !== 'plain' &&
      v.background !== 'wash' &&
      !BACKGROUNDS.some((b) => b.id === v.background)) ||
    typeof v.visibility !== 'number' ||
    !Number.isInteger(v.visibility) ||
    v.visibility < 0 ||
    v.visibility > 60 ||
    v.visibility % 5 !== 0
  ) {
    throw new Error('Invalid appearance preferences');
  }
  // Copy only allowlisted non-sensitive fields. Never persist URLs, files, or journal content.
  return {
    version: 1,
    palette: v.palette as PaletteId,
    mode: v.mode as AppearanceSettings['mode'],
    background: v.background as AppearanceSettings['background'],
    visibility: v.visibility,
  };
}

export function appearanceColors(palette: PaletteId, dark: boolean) {
  const p = PALETTES.find((item) => item.id === palette) ?? PALETTES[0];
  return {
    background: dark ? p.darkBackground : p.background,
    paper: dark ? '#29262C' : '#FFFFFF',
    ink: dark ? '#F2EEF3' : '#302B32',
    muted: dark ? '#C6BDC9' : '#625C64',
    line: dark ? '#736A79' : '#D4CBD4',
    // Legacy accent names remain aliases while components migrate to the shared theme hook.
    plum: dark ? p.darkAccent : p.accent,
    plumDark: dark ? p.darkAccent : p.accent,
    accentSoft: dark ? p.darkSoft : p.soft,
    onAccent: dark ? '#241E26' : '#FFFFFF',
    rose: dark ? '#59313F' : '#F1D9DD',
    roseSoft: dark ? '#422A35' : '#FAEFF0',
    roseInk: dark ? '#F4C6D3' : '#92495D',
    sage: dark ? '#293E32' : '#EAF0E9',
    sageInk: dark ? '#C2E2C9' : '#4D6955',
    sand: dark ? '#4B402B' : '#F0EAE1',
    spotInk: dark ? '#E8CC96' : '#79552B',
    soft: dark ? '#343039' : '#F4F1EE',
    error: dark ? '#FFB6C2' : '#A43C46',
    onError: dark ? '#392126' : '#FFFFFF',
    switchThumb: dark ? '#241E26' : '#FFFFFF',
  };
}
