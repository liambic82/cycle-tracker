import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Check, Droplet, Heart, NotebookPen, Plus, Sparkles } from 'lucide-react-native';
import { formatDay, type Day } from '../domain/dates';
import {
  cycleDay,
  emptyEntry,
  FLOWS,
  SYMPTOM_GROUPS,
  type Entry,
  type Journal,
} from '../domain/journal';
import { Button, Chip, SectionLabel } from './components';
import { colors, common } from './theme';

export function DayEditor({
  journal,
  today,
  onPatch,
  onCustom,
}: {
  journal: Journal;
  today: Day;
  onPatch: (patch: Partial<Entry>) => void;
  onCustom: (symptom: string) => void;
}) {
  const date = journal.selectedDate;
  const entry = journal.entries[date] ?? emptyEntry();
  const day = cycleDay(journal, date);
  const [group, setGroup] = useState<keyof typeof SYMPTOM_GROUPS>('Body & cycle');
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState('');
  const [customError, setCustomError] = useState('');
  const toggle = (symptom: string) =>
    onPatch({
      symptoms: entry.symptoms.includes(symptom)
        ? entry.symptoms.filter((s) => s !== symptom)
        : [...entry.symptoms, symptom],
    });
  const saveCustom = () => {
    const name = custom.trim();
    const all = [...Object.values(SYMPTOM_GROUPS).flat(), ...journal.customSymptoms];
    if (!name) {
      setCustomError('Give your symptom a name.');
      return;
    }
    if (all.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setCustomError('That symptom is already available.');
      return;
    }
    if (journal.customSymptoms.length >= 100) {
      setCustomError('You can add up to 100 custom symptoms.');
      return;
    }
    onCustom(name);
    setCustom('');
    setAdding(false);
    setCustomError('');
  };
  return (
    <View style={{ gap: 26 }}>
      <View style={{ gap: 6 }}>
        <Text style={common.eyebrow}>{date === today ? 'TODAY’S JOURNAL' : 'DAILY JOURNAL'}</Text>
        <Text style={common.heading}>{formatDay(date, { month: 'long', day: 'numeric' })}</Text>
        <Text style={common.body}>
          {formatDay(date, { weekday: 'long', year: 'numeric' })}
          {day ? `  ·  Cycle day ${day}` : ''}
        </Text>
      </View>
      {date > today ? (
        <View style={{ backgroundColor: colors.sage, padding: 20, borderRadius: 14, gap: 10 }}>
          <Sparkles size={24} color={colors.sageInk} />
          <Text style={common.label}>A day still to come</Text>
          <Text style={common.body}>
            Your journal will be ready when this day arrives. Choose today or a past date to log how
            you feel.
          </Text>
        </View>
      ) : (
        <>
          <View>
            <SectionLabel icon={Droplet}>Flow</SectionLabel>
            <View style={common.wrap}>
              {FLOWS.map((flow) => (
                <Chip
                  key={flow}
                  label={flow[0]!.toUpperCase() + flow.slice(1)}
                  selected={entry.flow === flow}
                  onPress={() => onPatch({ flow })}
                  icon={flow !== 'none' ? Droplet : undefined}
                />
              ))}
            </View>
            {entry.flow !== 'none' && entry.flow !== 'spotting' && (
              <View style={{ marginTop: 13, gap: 5 }}>
                {[
                  ['periodStart', 'Period started this day'],
                  ['periodEnd', 'Last day of bleeding'],
                ].map(([field, label]) => (
                  <Pressable
                    key={field}
                    accessibilityRole="checkbox"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: !!entry[field as 'periodStart' | 'periodEnd'] }}
                    onPress={() =>
                      onPatch({ [field!]: !entry[field as 'periodStart' | 'periodEnd'] })
                    }
                    style={[common.row, { minHeight: 42 }]}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: colors.plum,
                        backgroundColor: entry[field as 'periodStart' | 'periodEnd']
                          ? colors.plum
                          : '#fff',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {entry[field as 'periodStart' | 'periodEnd'] && (
                        <Check size={14} color="#fff" />
                      )}
                    </View>
                    <Text style={common.body}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={[common.small, { marginTop: 10 }]}>
              Spotting is recorded separately and won’t start a new cycle.
            </Text>
          </View>
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <View>
            <SectionLabel icon={Heart}>How are you feeling?</SectionLabel>
            <Text style={[common.small, { marginBottom: 13 }]}>
              Choose anything you notice. Every day counts.
            </Text>
            <View style={[common.wrap, { gap: 5, marginBottom: 14 }]}>
              {(Object.keys(SYMPTOM_GROUPS) as Array<keyof typeof SYMPTOM_GROUPS>).map((name) => (
                <Pressable
                  key={name}
                  accessibilityRole="tab"
                  accessibilityLabel={name}
                  accessibilityState={{ selected: group === name }}
                  onPress={() => setGroup(name)}
                  style={{
                    minHeight: 40,
                    paddingHorizontal: 9,
                    paddingVertical: 9,
                    borderBottomWidth: group === name ? 2 : 0,
                    borderColor: colors.plum,
                  }}
                >
                  <Text
                    style={{
                      color: group === name ? colors.plumDark : colors.muted,
                      fontSize: 11,
                      fontWeight: group === name ? '700' : '400',
                    }}
                  >
                    {name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={common.wrap}>
              {SYMPTOM_GROUPS[group].map((symptom) => (
                <Chip
                  key={symptom}
                  label={symptom}
                  selected={entry.symptoms.includes(symptom)}
                  onPress={() => toggle(symptom)}
                />
              ))}
            </View>
            {journal.customSymptoms.length > 0 && (
              <View style={{ gap: 9, marginTop: 15 }}>
                <Text style={common.small}>Your symptoms</Text>
                <View style={common.wrap}>
                  {journal.customSymptoms.map((symptom) => (
                    <Chip
                      key={symptom}
                      label={symptom}
                      selected={entry.symptoms.includes(symptom)}
                      onPress={() => toggle(symptom)}
                    />
                  ))}
                </View>
              </View>
            )}
            {entry.symptoms.filter(
              (s) => ![...SYMPTOM_GROUPS[group], ...journal.customSymptoms].includes(s as never),
            ).length > 0 && (
              <View style={{ gap: 8, marginTop: 14 }}>
                <Text style={common.small}>Also logged</Text>
                <View style={common.wrap}>
                  {entry.symptoms
                    .filter(
                      (s) =>
                        ![...SYMPTOM_GROUPS[group], ...journal.customSymptoms].includes(s as never),
                    )
                    .map((symptom) => (
                      <Chip
                        key={symptom}
                        label={symptom}
                        selected
                        onPress={() => toggle(symptom)}
                      />
                    ))}
                </View>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => setAdding(!adding)}
              style={[common.row, { minHeight: 46, marginTop: 6 }]}
            >
              <Plus size={14} color={colors.plum} />
              <Text style={{ fontSize: 12, color: colors.plum, fontWeight: '600' }}>
                Add your own symptom
              </Text>
            </Pressable>
            {adding && (
              <View style={{ gap: 8 }}>
                <TextInput
                  style={common.input}
                  accessibilityLabel="Custom symptom name"
                  value={custom}
                  onChangeText={setCustom}
                  placeholder="Name your symptom"
                  maxLength={60}
                  onSubmitEditing={saveCustom}
                />
                <Button secondary label="Add symptom" onPress={saveCustom} />
                {!!customError && <Text style={common.error}>{customError}</Text>}
              </View>
            )}
            {entry.symptoms.includes('Cramps') && (
              <View
                style={{
                  marginTop: 14,
                  backgroundColor: colors.roseSoft,
                  borderRadius: 12,
                  padding: 14,
                  gap: 12,
                }}
              >
                <Text style={common.label}>
                  Cramp severity{entry.cramps !== null ? ` · ${entry.cramps}/10` : ''}
                </Text>
                <View style={common.wrap}>
                  {Array.from({ length: 11 }, (_, i) => (
                    <Chip
                      key={i}
                      label={String(i)}
                      selected={entry.cramps === i}
                      onPress={() => onPatch({ cramps: i })}
                    />
                  ))}
                </View>
                <Text style={common.small}>0 · None 5 · Moderate 10 · Severe</Text>
              </View>
            )}
          </View>
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <View>
            <SectionLabel icon={NotebookPen}>A note for yourself</SectionLabel>
            <TextInput
              accessibilityLabel="Daily note"
              style={[
                common.input,
                { minHeight: 115, textAlignVertical: 'top', backgroundColor: '#FCFBF9' },
              ]}
              multiline
              value={entry.note}
              onChangeText={(note) => onPatch({ note })}
              placeholder="What’s on your mind today?"
              placeholderTextColor={colors.muted}
              maxLength={10000}
            />
            <Text style={[common.small, { marginTop: 9 }]}>
              Anything that feels relevant. Or nothing at all.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
