import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { formatDay, type Day } from '../domain/dates';
import type { Entry } from '../domain/journal';
import { rateSymptom, symptomSeverity } from '../domain/symptomSeverity';
import { Button, Chip } from './components';
import { useTheme } from './theme';

export function SeverityControl({
  symptom,
  value,
  change,
}: {
  symptom: string;
  value: number | null;
  change: (value: number | null) => void;
}) {
  const { common } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text style={common.label}>
        {symptom === 'Cramps' ? 'Cramp' : symptom} severity ·{' '}
        {value === null ? 'Not rated' : `${value}/10`}
      </Text>
      <View style={common.wrap}>
        {Array.from({ length: 11 }, (_, i) => (
          <Chip
            key={i}
            label={String(i)}
            accessibilityLabel={`${symptom} severity ${i} of 10`}
            selected={value === i}
            onPress={() => change(i)}
          />
        ))}
      </View>
      <Text style={common.small}>0 · None 5 · Moderate 10 · Severe</Text>
      {value !== null && (
        <Button secondary label={`Clear ${symptom} rating`} onPress={() => change(null)} />
      )}
    </View>
  );
}

export function SymptomSeverityEditor({
  date,
  entry,
  onPatch,
  done,
  saveStatus,
}: {
  date: Day;
  entry: Entry;
  onPatch: (patch: Partial<Entry>) => void;
  done: () => void;
  saveStatus: React.ReactNode;
}) {
  const { common } = useTheme();
  const [chosen, setChosen] = useState(entry.symptoms[0] ?? '');
  const symptom = entry.symptoms.includes(chosen) ? chosen : entry.symptoms[0];
  return (
    <View style={{ gap: 22 }}>
      <Button secondary label="Back to daily journal" onPress={done} />
      <Text style={common.heading}>Symptom severity</Text>
      <Text style={common.body}>
        {formatDay(date, { month: 'long', day: 'numeric', year: 'numeric' })}
      </Text>
      <Text style={common.body}>
        Ratings are optional. Choose a logged symptom, then rate how severe it felt that day.
        Leaving it unrated is different from choosing 0. You can clear a rating without removing the
        symptom.
      </Text>
      <View style={common.wrap}>
        {entry.symptoms.map((label) => {
          const rating = symptomSeverity(entry, label);
          return (
            <Chip
              key={label}
              label={`${label} · ${rating === null ? 'Not rated' : `${rating}/10`}`}
              accessibilityLabel={`Rate ${label}, ${rating === null ? 'not rated' : `${rating} of 10`}`}
              selected={symptom === label}
              onPress={() => setChosen(label)}
            />
          );
        })}
      </View>
      {symptom ? (
        <View style={[common.card, { gap: 12 }]}>
          <SeverityControl
            symptom={symptom}
            value={symptomSeverity(entry, symptom)}
            change={(value) => onPatch(rateSymptom(entry, symptom, value))}
          />
        </View>
      ) : (
        <Text style={common.body}>Log a symptom in your daily journal to add a rating.</Text>
      )}
      <Text style={common.small}>
        Use your own experience as a guide. These are personal ratings, not a clinical assessment.
      </Text>
      {saveStatus}
      <Button label="Done" onPress={done} />
    </View>
  );
}
