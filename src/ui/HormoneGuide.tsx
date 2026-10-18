import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { ActionRow } from './ActionRow';
import { Button } from './components';
import { useTheme } from './theme';

// Deliberately schematic curves, not digitized measurements or a personalized model.
const CURVES = [
  {
    name: 'Estrogen',
    color: '#B34B75',
    dark: '#F39CBF',
    dash: undefined,
    path: 'M10 112 C50 115 68 84 95 35 S121 80 150 87 S188 45 225 70 S270 112 310 114',
  },
  {
    name: 'Progesterone',
    color: '#5966A7',
    dark: '#B8BFFF',
    dash: '8 4',
    path: 'M10 126 C70 127 112 128 148 122 S180 28 223 38 S270 116 310 126',
  },
  {
    name: 'Testosterone',
    color: '#697C3E',
    dark: '#BCD58B',
    dash: '2 5',
    path: 'M10 98 C50 101 84 94 115 79 S148 86 175 91 S260 102 310 100',
  },
];
export function HormoneGuide() {
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState(false);
  const { colors, common, dark } = useTheme();
  return (
    <View>
      <ActionRow label="Hormone guide" expanded={open} onPress={() => setOpen(!open)} />
      {open && (
        <View style={{ gap: 12, paddingTop: 12 }}>
          <Text style={common.label}>Illustration, not your hormone levels</Text>
          <Text style={common.small}>Relative patterns · schematic</Text>
          <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: 8 }}>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel="Schematic hormone patterns: estrogen has a peak before ovulation and a smaller later rise; progesterone rises after ovulation; testosterone can have a modest mid-cycle rise. Individual patterns vary. The lines do not compare hormone concentrations."
            >
              <Svg
                width="100%"
                height={160}
                viewBox="0 0 320 150"
                preserveAspectRatio="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Line x1="10" y1="140" x2="310" y2="140" stroke={colors.line} />
                {CURVES.map((c) => (
                  <Path
                    key={c.name}
                    d={c.path}
                    fill="none"
                    stroke={dark ? c.dark : c.color}
                    strokeWidth={3}
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray={c.dash}
                  />
                ))}
              </Svg>
            </View>
            <View style={common.between}>
              {['Early cycle', 'Middle', 'Late cycle'].map((t) => (
                <Text key={t} style={common.small}>
                  {t}
                </Text>
              ))}
            </View>
          </View>
          <View style={common.wrap}>
            {CURVES.map((c) => (
              <View key={c.name} style={common.row}>
                <Svg width={28} height={12}>
                  <Line
                    x1="0"
                    y1="6"
                    x2="28"
                    y2="6"
                    stroke={dark ? c.dark : c.color}
                    strokeWidth={3}
                    strokeDasharray={c.dash}
                  />
                </Svg>
                <Text style={common.small}>{c.name}</Text>
              </View>
            ))}
          </View>
          <Text style={common.body}>
            Estrogen often peaks before ovulation; progesterone rises afterward. Testosterone may
            rise modestly around mid-cycle, but this pattern is not seen in everyone.
          </Text>
          <Text style={common.small}>
            Each line uses its own relative scale. Their heights do not compare hormone amounts.
            Timing and patterns vary, including with hormonal contraception, perimenopause,
            irregular cycles or cycles without ovulation.
          </Text>
          <Text style={common.small}>
            Your dates and sleep records cannot measure hormone levels. This guide and period
            predictions are not medical advice or contraception guidance.
          </Text>
          <ActionRow
            label="Guide sources"
            expanded={sources}
            onPress={() => setSources(!sources)}
          />
          {sources && (
            <View style={{ gap: 8 }}>
              <Button
                secondary
                label="Office on Women’s Health · Menstrual cycle"
                onPress={() =>
                  void Linking.openURL(
                    'https://womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
                  )
                }
              />
              <Button
                secondary
                label="Testosterone patterns · 2024 study"
                onPress={() => void Linking.openURL('https://pubmed.ncbi.nlm.nih.gov/39053138/')}
              />
              <Button
                secondary
                label="Individual variation · 2013 study"
                onPress={() => void Linking.openURL('https://pubmed.ncbi.nlm.nih.gov/23127814/')}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}
