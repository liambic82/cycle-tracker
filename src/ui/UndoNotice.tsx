import React from 'react';
import { Text, View } from 'react-native';
import { Undo2 } from 'lucide-react-native';
import { formatDay, type Day } from '../domain/dates';
import { Button } from './components';
import { colors, common } from './theme';

export function UndoNotice({
  date,
  undo,
  dismiss,
}: {
  date: Day;
  undo: () => void;
  dismiss: () => void;
}) {
  return (
    <View style={{ backgroundColor: colors.sage, padding: 16, borderRadius: 14, gap: 10 }}>
      <Text accessibilityLiveRegion="polite" style={common.body}>
        Entry removed for {formatDay(date, { month: 'short', day: 'numeric', year: 'numeric' })}.
      </Text>
      <Button secondary label="Undo deletion" icon={Undo2} onPress={undo} />
      <Button secondary label="Dismiss undo" onPress={dismiss} />
    </View>
  );
}
