import React from 'react';
import { Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { formatDay, type Day } from '../domain/dates';
import {
  INTENSITIES,
  LIBIDO_LEVELS,
  sexualHealthLabel,
  type SexualHealth,
} from '../domain/sexualHealth';
import { Button, Chip } from './components';
import { common } from './theme';

export function SexualHealthEditor({
  date,
  value,
  change,
  done,
  saveStatus,
}: {
  date: Day;
  value: SexualHealth;
  change: (value: SexualHealth) => void;
  done: () => void;
  saveStatus: React.ReactNode;
}) {
  return (
    <View style={{ gap: 24 }}>
      <Button secondary label="Back to daily journal" icon={ArrowLeft} onPress={done} />
      <View style={{ gap: 6 }}>
        <Text style={common.heading}>Sexual health</Text>
        <Text style={common.label}>
          {formatDay(date, { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
        <Text style={common.body}>
          Log only what you want to track. Each field is independent and saves as you go.
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={common.label}>Sexual activity</Text>
        <Text style={common.small}>Any solo or partnered sexual activity you want to record.</Text>
        <View style={common.wrap}>
          {([null, false, true] as const).map((choice) => {
            const label = choice === null ? 'Not logged' : sexualHealthLabel(choice);
            return (
              <Chip
                key={label}
                label={label}
                accessibilityLabel={`Sexual activity: ${label}`}
                selected={value.activity === choice}
                onPress={() => change({ ...value, activity: choice })}
              />
            );
          })}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={common.label}>Activity intensity</Text>
        <Text style={common.small}>
          How physically intense the activity felt to you, if useful to record.
        </Text>
        <View style={common.wrap}>
          {([null, ...INTENSITIES] as const).map((choice) => {
            const label = choice === null ? 'Not logged' : sexualHealthLabel(choice);
            return (
              <Chip
                key={label}
                label={label}
                accessibilityLabel={`Activity intensity: ${label}`}
                selected={value.intensity === choice}
                onPress={() => change({ ...value, intensity: choice })}
              />
            );
          })}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={common.label}>Orgasm</Text>
        <View style={common.wrap}>
          {([null, false, true] as const).map((choice) => {
            const label = choice === null ? 'Not logged' : sexualHealthLabel(choice);
            return (
              <Chip
                key={label}
                label={label}
                accessibilityLabel={`Orgasm: ${label}`}
                selected={value.orgasm === choice}
                onPress={() => change({ ...value, orgasm: choice })}
              />
            );
          })}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={common.label}>Libido</Text>
        <Text style={common.small}>
          Your level of sexual desire today, whether or not you had sexual activity.
        </Text>
        <View style={common.wrap}>
          {([null, ...LIBIDO_LEVELS] as const).map((choice) => {
            const label = choice === null ? 'Not logged' : sexualHealthLabel(choice);
            return (
              <Chip
                key={label}
                label={label}
                accessibilityLabel={`Libido: ${label}`}
                selected={value.libido === choice}
                onPress={() => change({ ...value, libido: choice })}
              />
            );
          })}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={common.small}>
          Not logged clears only that field. No and None are recorded observations.
        </Text>
        <Text style={common.small}>
          These fields stay out of readable CSV exports unless you choose to include them in Your
          data. Encrypted backups always keep the full journal.
        </Text>
        {saveStatus}
      </View>
    </View>
  );
}
