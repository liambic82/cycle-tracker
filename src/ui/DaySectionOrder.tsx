import React, { useEffect } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { ArrowUp, ArrowDown } from 'lucide-react-native';
import { DAY_SECTION_LABELS, moveDaySection, type DaySection } from '../domain/journalPreferences';
import { Button } from './components';
import { useTheme } from './theme';
export function DaySectionOrder({
  order,
  change,
  done,
  saveStatus,
}: {
  order: DaySection[];
  change: (order: DaySection[]) => void;
  done: () => void;
  saveStatus: React.ReactNode;
}) {
  const { common } = useTheme();
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      done();
      return true;
    });
    return () => sub.remove();
  }, [done]);
  return (
    <View style={{ gap: 16 }}>
      <Button quiet label="Back to journal settings" onPress={done} />
      <Text style={common.heading}>Daily section order</Text>
      <Text style={common.body}>Move sections to suit your routine.</Text>
      {order.map((section, i) => (
        <View key={section} style={{ gap: 8 }}>
          <Text style={common.label}>
            {i + 1}. {DAY_SECTION_LABELS[section]}
          </Text>
          <View style={common.wrap}>
            <Button
              secondary
              icon={ArrowUp}
              label={`Move ${DAY_SECTION_LABELS[section]} up`}
              disabled={i === 0}
              onPress={() => change(moveDaySection(order, section, -1))}
            />
            <Button
              secondary
              icon={ArrowDown}
              label={`Move ${DAY_SECTION_LABELS[section]} down`}
              disabled={i === order.length - 1}
              onPress={() => change(moveDaySection(order, section, 1))}
            />
          </View>
        </View>
      ))}
      {saveStatus}
      <Button label="Done" onPress={done} />
    </View>
  );
}
