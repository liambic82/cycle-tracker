import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import {
  Check,
  BookOpen,
  Droplet,
  Ellipsis,
  Heart,
  NotebookPen,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { formatDay, type Day } from '../domain/dates';
import { cycleDay, emptyEntry, FLOWS, type Entry, type Journal } from '../domain/journal';
import { Button, Chip, SectionLabel } from './components';
import { colors, common } from './theme';
import {
  QUICK_SYMPTOMS,
  symptomSelected,
  toggleSymptom,
  type SymptomFilter,
} from '../domain/symptoms';
import { SymptomBrowser } from './SymptomBrowser';
import { FlowDetails } from './FlowDetails';
import { SexualHealthEditor } from './SexualHealthEditor';
import { hasSexualHealth } from '../domain/sexualHealth';
import { DoseLog } from './DoseLog';
import { plannedDoses } from '../domain/medications';
import { CycleContext } from './CycleContext';

export function DayEditor({
  journal,
  today,
  onPatch,
  onCustom,
  onDelete,
  undoNotice,
  saveStatus,
  demo,
  onViewChange,
  onUpdate,
  onManageMedications,
}: {
  journal: Journal;
  today: Day;
  onPatch: (patch: Partial<Entry>) => void;
  onCustom: (symptom: string) => void;
  onDelete: () => void;
  undoNotice: React.ReactNode;
  saveStatus: React.ReactNode;
  demo: boolean;
  onViewChange: () => void;
  onUpdate: (transform: (journal: Journal) => Journal) => void;
  onManageMedications: () => void;
}) {
  const date = journal.selectedDate;
  const entry = journal.entries[date] ?? emptyEntry();
  const day = date <= today ? cycleDay(journal, date) : null;
  const [contextOpen, setContextOpen] = useState(false);
  const [browsing, setBrowsing] = useState<SymptomFilter | null>(null);
  const [symptomError, setSymptomError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [flowDetailsOpen, setFlowDetailsOpen] = useState(false);
  const [sexualHealthOpen, setSexualHealthOpen] = useState(false);
  const [dosesOpen, setDosesOpen] = useState(false);
  const closeActions = () => {
    setActionsOpen(false);
    setDeleteConfirm(false);
  };
  const browse = (filter: SymptomFilter | null) => {
    closeActions();
    setBrowsing(filter);
    setSymptomError('');
    onViewChange();
  };
  const toggle = (symptom: string) => {
    try {
      onPatch({ symptoms: toggleSymptom(entry.symptoms, symptom) });
      setSymptomError('');
    } catch (err) {
      setSymptomError(err instanceof Error ? err.message : 'Could not log this symptom.');
    }
  };
  if (contextOpen)
    return (
      <CycleContext
        journal={journal}
        date={date}
        today={today}
        doneLabel="Back to daily journal"
        done={() => {
          setContextOpen(false);
          onViewChange();
        }}
      />
    );
  if (dosesOpen && date <= today)
    return (
      <DoseLog
        journal={journal}
        date={date}
        today={today}
        update={onUpdate}
        manage={onManageMedications}
        saveStatus={saveStatus}
        onViewChange={onViewChange}
        done={() => {
          setDosesOpen(false);
          onViewChange();
        }}
      />
    );
  if (sexualHealthOpen && date <= today)
    return (
      <SexualHealthEditor
        date={date}
        value={entry.sexualHealth}
        change={(sexualHealth) => onPatch({ sexualHealth })}
        saveStatus={saveStatus}
        done={() => {
          setSexualHealthOpen(false);
          onViewChange();
        }}
      />
    );
  if (flowDetailsOpen && date <= today)
    return (
      <FlowDetails
        date={date}
        entry={entry}
        onPatch={onPatch}
        saveStatus={saveStatus}
        onViewChange={onViewChange}
        done={() => {
          setFlowDetailsOpen(false);
          onViewChange();
        }}
      />
    );
  if (browsing !== null && date <= today)
    return (
      <SymptomBrowser
        selected={entry.symptoms}
        custom={journal.customSymptoms}
        showPerimenopause={journal.preferences.showPerimenopause}
        initialFilter={browsing}
        toggle={toggle}
        onCustom={onCustom}
        done={() => browse(null)}
        error={symptomError}
      />
    );
  return (
    <View style={{ gap: 26 }}>
      <View style={[common.between, { alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={common.eyebrow}>{date === today ? 'TODAY’S JOURNAL' : 'DAILY JOURNAL'}</Text>
          <Text style={common.heading}>{formatDay(date, { month: 'long', day: 'numeric' })}</Text>
          <Text style={common.body}>
            {formatDay(date, { weekday: 'long', year: 'numeric' })}
            {day ? `  ·  Cycle day ${day}` : ''}
          </Text>
        </View>
        {date <= today && !!journal.entries[date] && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Entry options"
            accessibilityState={{ expanded: actionsOpen }}
            aria-expanded={actionsOpen}
            onPress={() => {
              setActionsOpen(!actionsOpen);
              setDeleteConfirm(false);
            }}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: actionsOpen || pressed ? colors.roseSoft : colors.paper,
              borderWidth: 1,
              borderColor: colors.line,
            })}
          >
            <Ellipsis size={22} color={colors.plum} />
          </Pressable>
        )}
      </View>
      <Button
        secondary
        icon={BookOpen}
        label="Explore this day’s cycle context"
        onPress={() => {
          closeActions();
          setContextOpen(true);
          onViewChange();
        }}
      />
      {actionsOpen && date <= today && !!journal.entries[date] && (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 14,
            padding: 16,
            gap: 12,
          }}
        >
          {deleteConfirm ? (
            <>
              <Text style={common.label}>Delete this day’s entry?</Text>
              <Text style={common.body}>
                This removes all daily details, including flow, product records, bleeding
                observations, sexual-health details, dose records, symptoms, notes, and period
                markers for {formatDay(date, { month: 'long', day: 'numeric', year: 'numeric' })}.
                You can undo the last deletion until you lock, delete another entry, or log this day
                again. Medication schedules are kept.
              </Text>
              <Button label="Keep entry" onPress={closeActions} />
              <Button
                secondary
                danger
                label="Delete this entry"
                icon={Trash2}
                onPress={() => {
                  onDelete();
                  closeActions();
                }}
              />
            </>
          ) : (
            <>
              <Text style={common.label}>Entry options</Text>
              <Button
                secondary
                danger
                label="Delete entry"
                icon={Trash2}
                onPress={() => setDeleteConfirm(true)}
              />
            </>
          )}
        </View>
      )}
      {undoNotice}
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
                  selected={entry.flowRecorded && entry.flow === flow}
                  onPress={() => onPatch({ flow })}
                  icon={flow !== 'none' ? Droplet : undefined}
                />
              ))}
            </View>
            <Text style={[common.small, { marginTop: 10 }]}>
              {entry.flowRecorded
                ? entry.flow === 'none'
                  ? 'Recorded: no flow.'
                  : 'Flow recorded for this day.'
                : 'Flow not logged yet. Choose None to record a day without flow.'}
            </Text>
            {entry.flowRecorded && (
              <Button
                secondary
                label="Clear flow log"
                style={{ marginTop: 10 }}
                onPress={() => onPatch({ flow: 'none', flowRecorded: false })}
              />
            )}
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
                    aria-checked={!!entry[field as 'periodStart' | 'periodEnd']}
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
            <View style={{ marginTop: 16, gap: 9 }}>
              <Button
                secondary
                label="Products & bleeding details"
                onPress={() => {
                  closeActions();
                  setFlowDetailsOpen(true);
                  onViewChange();
                }}
              />
              {(entry.productRecords.length > 0 ||
                entry.clots !== null ||
                entry.flooding !== null) && (
                <Text style={common.small}>
                  {[
                    entry.productRecords.length
                      ? `${entry.productRecords.length} product ${entry.productRecords.length === 1 ? 'record' : 'records'}`
                      : null,
                    entry.clots === null ? null : `Clots: ${entry.clots ? 'Yes' : 'No'}`,
                    entry.flooding === null ? null : `Flooding: ${entry.flooding ? 'Yes' : 'No'}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <View style={{ gap: 9 }}>
            <Button
              secondary
              label="Medications & supplements"
              onPress={() => {
                closeActions();
                setDosesOpen(true);
                onViewChange();
              }}
            />
            <Text style={common.small}>
              {entry.doseRecords.length} dose{' '}
              {entry.doseRecords.length === 1 ? 'record' : 'records'} ·{' '}
              {
                plannedDoses(journal.medications, date).filter((dose) => dose.phase !== 'as-needed')
                  .length
              }{' '}
              scheduled for this day
            </Text>
          </View>
          <View>
            <SectionLabel icon={Heart}>How are you feeling?</SectionLabel>
            <Text style={[common.small, { marginBottom: 13 }]}>
              Choose anything you notice. Every day counts.
            </Text>
            {entry.symptoms.length > 0 && (
              <View style={{ gap: 9, marginBottom: 18 }}>
                <Text style={common.label}>Logged this day · {entry.symptoms.length}</Text>
                <Text style={common.small}>Tap a selected symptom to remove it from this day.</Text>
                <View style={common.wrap}>
                  {entry.symptoms.map((symptom) => (
                    <Chip
                      key={symptom}
                      label={symptom}
                      selected
                      icon={Check}
                      onPress={() => toggle(symptom)}
                    />
                  ))}
                </View>
              </View>
            )}
            <Text style={[common.small, { marginBottom: 9 }]}>Quick choices</Text>
            <View style={common.wrap}>
              {QUICK_SYMPTOMS.map((symptom) => (
                <Chip
                  key={symptom}
                  label={symptom}
                  selected={symptomSelected(entry.symptoms, symptom)}
                  onPress={() => toggle(symptom)}
                />
              ))}
            </View>
            <View style={{ gap: 10, marginTop: 16 }}>
              <Button label="Browse all symptoms" onPress={() => browse('All')} />
              <Button
                secondary
                label="Less common symptoms"
                onPress={() => browse('More symptoms')}
              />
              {!!symptomError && (
                <Text accessibilityRole="alert" style={common.error}>
                  {symptomError}
                </Text>
              )}
            </View>
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
            <Button
              secondary
              label="Sexual health · optional"
              onPress={() => {
                closeActions();
                setSexualHealthOpen(true);
                onViewChange();
              }}
            />
            {hasSexualHealth(entry.sexualHealth) && (
              <Text style={[common.small, { marginTop: 9 }]}>Details logged for this day.</Text>
            )}
          </View>
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
          <View style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 20, gap: 8 }}>
            <Text style={common.small}>
              {demo ? 'You’re exploring a sample journal.' : 'Changes save automatically.'}
            </Text>
            {saveStatus}
          </View>
        </>
      )}
    </View>
  );
}
