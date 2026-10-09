import React, { useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { ArrowLeft, Check, Plus, Search } from 'lucide-react-native';
import {
  SYMPTOM_GROUPS,
  symptomSections,
  symptomSelected,
  validateCustomSymptom,
  type SymptomFilter,
  type SymptomGroup,
} from '../domain/symptoms';
import { Button, Chip } from './components';
import { colors, common } from './theme';

export function SymptomBrowser({
  selected,
  custom,
  showPerimenopause,
  initialFilter,
  toggle,
  onCustom,
  done,
  error,
}: {
  selected: string[];
  custom: string[];
  showPerimenopause: boolean;
  initialFilter: SymptomFilter;
  toggle: (label: string) => void;
  onCustom: (label: string) => void;
  done: () => void;
  error: string;
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [customError, setCustomError] = useState('');
  const activeFilter = !showPerimenopause && filter === 'Perimenopause' ? 'All' : filter;
  const categories: SymptomFilter[] = [
    'All',
    ...(Object.keys(SYMPTOM_GROUPS) as SymptomGroup[]).filter(
      (category) => showPerimenopause || category !== 'Perimenopause',
    ),
    'Your symptoms',
  ];
  const sections = symptomSections(custom, showPerimenopause, activeFilter, query);
  const resultCount = sections.reduce((count, section) => count + section.labels.length, 0);
  const saveCustom = () => {
    try {
      onCustom(validateCustomSymptom(name, custom));
      setName('');
      setAdding(false);
      setCustomError('');
      setFilter('Your symptoms');
      setQuery('');
      Keyboard.dismiss();
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'Could not add this symptom.');
    }
  };
  return (
    <View style={{ gap: 18 }}>
      <Button
        secondary
        label="Back to daily journal"
        icon={ArrowLeft}
        onPress={() => {
          Keyboard.dismiss();
          done();
        }}
      />
      <View style={{ gap: 6 }}>
        <Text style={common.heading}>Find what you’re feeling</Text>
        <Text style={common.body}>
          Choose a category or search. Your selections save as you go.
        </Text>
        <Text accessibilityLiveRegion="polite" style={[common.label, { color: colors.plum }]}>
          {selected.length} logged for this day
        </Text>
      </View>
      <View style={[common.row, { gap: 8 }]}>
        <Search size={18} color={colors.plum} />
        <TextInput
          style={[common.input, { flex: 1, minWidth: 0 }]}
          accessibilityLabel="Search symptoms"
          placeholder="Search symptoms"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={100}
          returnKeyType="search"
        />
      </View>
      {!!query && <Button secondary label="Clear search" onPress={() => setQuery('')} />}
      <View style={common.wrap}>
        {categories.map((category) => (
          <Chip
            key={category}
            label={category}
            selected={activeFilter === category}
            onPress={() => setFilter(category)}
          />
        ))}
      </View>
      {!showPerimenopause && (
        <Text style={common.small}>
          Perimenopause choices are hidden. You can show them in Your data → Symptom preferences.
          Previously logged symptoms and your own labels remain available.
        </Text>
      )}
      <Button
        secondary
        label={adding ? 'Cancel custom symptom' : 'Add your own symptom'}
        icon={Plus}
        onPress={() => {
          setAdding(!adding);
          setCustomError('');
        }}
      />
      {adding && (
        <View style={{ gap: 10 }}>
          <TextInput
            style={common.input}
            accessibilityLabel="Custom symptom name"
            placeholder="Name your symptom"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            maxLength={60}
            onSubmitEditing={saveCustom}
          />
          <Button label="Add and log symptom" onPress={saveCustom} />
          {!!customError && (
            <Text accessibilityRole="alert" style={common.error}>
              {customError}
            </Text>
          )}
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={common.error}>
          {error}
        </Text>
      )}
      <Text accessibilityLiveRegion="polite" style={common.small}>
        {resultCount} {resultCount === 1 ? 'result' : 'results'} ·{' '}
        {activeFilter === 'All' ? 'All visible categories' : activeFilter}
      </Text>
      {resultCount === 0 ? (
        <View style={{ padding: 18, backgroundColor: colors.soft, borderRadius: 14, gap: 6 }}>
          <Text style={common.label}>No matching symptoms</Text>
          <Text style={common.body}>Try another search or category, or add your own label.</Text>
        </View>
      ) : (
        sections.map(({ category, labels }) => (
          <View key={category} style={{ gap: 10 }}>
            <Text style={common.label}>{category}</Text>
            {labels.map((label) => {
              const checked = symptomSelected(selected, label);
              return (
                <Pressable
                  key={label}
                  accessibilityRole="checkbox"
                  accessibilityLabel={label}
                  accessibilityState={{ checked }}
                  aria-checked={checked}
                  onPress={() => toggle(label)}
                  style={({ pressed }) => ({
                    minHeight: 48,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: checked ? '#C59BAB' : colors.line,
                    backgroundColor: checked ? colors.roseSoft : colors.paper,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: checked ? colors.plum : colors.muted,
                      backgroundColor: checked ? colors.plum : colors.paper,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {checked && <Check size={16} color="#fff" />}
                  </View>
                  <Text
                    style={[
                      common.body,
                      { flex: 1, color: checked ? colors.plumDark : colors.ink },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))
      )}
      <Text style={common.small}>
        These labels describe what you notice; they don’t establish a cause or diagnosis. Log
        spotting and period boundaries in Flow to include them in your cycle history.
      </Text>
      <Button
        label="Done choosing symptoms"
        onPress={() => {
          Keyboard.dismiss();
          done();
        }}
      />
    </View>
  );
}
