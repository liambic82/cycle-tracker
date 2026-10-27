// Approved Trifelle vector geometry. Shared by the app and asset export script.
export const TRIFELLE_LEAF =
  'M135 113 C136 94 135 71 147 55 C157 41 177 42 183 56 C186 63 185 68 184 72 C193 68 203 70 210 77 C222 89 215 105 200 110 C182 117 156 114 135 113 Z';
export const TRIFELLE_STEM =
  'M127 128 C116 164 126 204 151 221 C158 226 165 229 168 233 C162 240 156 240 149 235 C113 210 112 170 121 138 Z';
export const TRIFELLE_COLORS = {
  plum: '#604054',
  rose: '#E4BACB',
  roseOnLight: '#C47D9E',
  ivory: '#FBF7F5',
  dark: '#261F28',
};
export const TRIFELLE_LOOP_MS = 2400;
// Clockwise: upper right, lower right, lower left, upper left. Each crossfade lasts 150 ms.
export const TRIFELLE_ACCENTS = [
  { inputRange: [0, 0.1875, 0.25, 0.9375, 1], outputRange: [1, 1, 0, 0, 1] },
  { inputRange: [0, 0.1875, 0.25, 0.4375, 0.5, 1], outputRange: [0, 0, 1, 1, 0, 0] },
  { inputRange: [0, 0.4375, 0.5, 0.6875, 0.75, 1], outputRange: [0, 0, 1, 1, 0, 0] },
  { inputRange: [0, 0.6875, 0.75, 0.9375, 1], outputRange: [0, 0, 1, 1, 0] },
];
