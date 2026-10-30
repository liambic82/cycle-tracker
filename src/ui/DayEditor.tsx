import { ActionRow } from './ActionRow';
import { DaySectionOrder } from './DaySectionOrder';
import type { DaySection } from '../domain/journalPreferences';
import React, { useEffect, useImperativeHandle, useState } from 'react';
import { BackHandler, Pressable, Text, TextInput, View } from 'react-native';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Droplet,
  Ellipsis,
  Heart,
  NotebookPen,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { addDays, validDay, formatDay, type Day } from '../domain/dates';
import {
  cycleDay,
  emptyEntry,
  FLOWS,
  FLOW_LABELS,
  type Entry,
  type Journal,
} from '../domain/journal';
import { Button, Chip, SectionLabel } from './components';
import { useTheme } from './theme';
import {
  symptomIdentity,
  symptomSections,
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
import { SeverityControl, SymptomSeverityEditor } from './SymptomSeverityEditor';
import { symptomSeverity } from '../domain/symptomSeverity';
import { describeMedicalRecord } from '../domain/medicalRecords';
import { DailyDetailsEditor } from './DailyDetailsEditor';
import { hasDailyDetails, describeDailyDetails } from '../domain/dailyDetails';
import { SleepEditor } from './SleepEditor';
import { ImportedSleepDetails } from './ImportedSleepDetails';
import { hasSleep } from '../domain/sleep';

export interface DayEditorHandle {
  back(): boolean;
}

export function DayEditor({
  backRef,
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
  onSelectDate,
}: {
  backRef: React.Ref<DayEditorHandle>;
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
  onSelectDate: (date: Day) => void;
}) {
  const { colors, common, dark } = useTheme();
  const date = journal.selectedDate;
  const entry = journal.entries[date] ?? emptyEntry();
  const day = date <= today ? cycleDay(journal, date) : null;
  const [browsing, setBrowsing] = useState<SymptomFilter | null>(null);
  const [symptomError, setSymptomError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [flowDetailsOpen, setFlowDetailsOpen] = useState(false);
  const [sexualHealthOpen, setSexualHealthOpen] = useState(false);
  const [dosesOpen, setDosesOpen] = useState(false);
  const [severityOpen, setSeverityOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  // Android Modal sends system Back to onRequestClose, not to BackHandler listeners.
  useImperativeHandle(backRef, () => ({
    back: () => {
      const close = orderOpen
        ? () => setOrderOpen(false)
        : pinsOpen
          ? () => setPinsOpen(false)
          : settingsOpen
            ? () => setSettingsOpen(false)
            : browsing !== null
              ? () => setBrowsing(null)
              : dailyOpen
                ? () => setDailyOpen(false)
                : sleepOpen
                  ? () => setSleepOpen(false)
                  : dosesOpen
                    ? () => setDosesOpen(false)
                    : severityOpen
                      ? () => setSeverityOpen(false)
                      : flowDetailsOpen
                        ? () => setFlowDetailsOpen(false)
                        : sexualHealthOpen
                          ? () => setSexualHealthOpen(false)
                          : deleteConfirm
                            ? () => setDeleteConfirm(false)
                            : actionsOpen
                              ? () => setActionsOpen(false)
                              : null;
      if (!close) return false;
      close();
      onViewChange();
      return true;
    },
  }));
  useEffect(() => {
    if (!settingsOpen && !pinsOpen && browsing === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pinsOpen) setPinsOpen(false);
      else if (browsing !== null) setBrowsing(null);
      else setSettingsOpen(false);
      onViewChange();
      return true;
    });
    return () => sub.remove();
  }, [settingsOpen, pinsOpen, browsing, onViewChange]);
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
  if (orderOpen)
    return (
      <DaySectionOrder
        order={journal.preferences.sectionOrder}
        saveStatus={saveStatus}
        change={(sectionOrder) =>
          onUpdate((value) => ({ ...value, preferences: { ...value.preferences, sectionOrder } }))
        }
        done={() => {
          setOrderOpen(false);
          onViewChange();
        }}
      />
    );
  if (pinsOpen)
    return (
      <SymptomBrowser
        pinMode
        backLabel="Back to journal settings"
        selected={journal.preferences.pinnedSymptoms}
        custom={journal.customSymptoms}
        showPerimenopause={journal.preferences.showPerimenopause}
        initialFilter="All"
        toggle={(symptom) =>
          onUpdate((value) => ({
            ...value,
            preferences: {
              ...value.preferences,
              pinnedSymptoms: toggleSymptom(value.preferences.pinnedSymptoms, symptom),
            },
          }))
        }
        onCustom={() => {}}
        done={() => {
          setPinsOpen(false);
          onViewChange();
        }}
        error=""
      />
    );
  if (settingsOpen)
    return (
      <View style={{ gap: 12 }}>
        <Button
          quiet
          label="Back to journal"
          onPress={() => {
            setSettingsOpen(false);
            onViewChange();
          }}
        />
        <Text accessibilityRole="header" style={common.heading}>
          Journal settings
        </Text>
        <ActionRow
          label="Section order"
          detail="Choose what comes first"
          onPress={() => {
            setOrderOpen(true);
            onViewChange();
          }}
        />
        <ActionRow
          label="Pinned symptoms"
          detail="Quick choices for every day"
          onPress={() => {
            setPinsOpen(true);
            onViewChange();
          }}
        />
      </View>
    );
  if (dailyOpen && date <= today)
    return (
      <DailyDetailsEditor
        date={date}
        value={entry.dailyDetails}
        save={(dailyDetails) => {
          onPatch({ dailyDetails });
          setDailyOpen(false);
          onViewChange();
        }}
        cancel={() => {
          setDailyOpen(false);
          onViewChange();
        }}
      />
    );
  if (sleepOpen && date <= today)
    return (
      <SleepEditor
        date={date}
        value={entry.sleep}
        save={(sleep) => {
          onPatch({ sleep });
          setSleepOpen(false);
          onViewChange();
        }}
        cancel={() => {
          setSleepOpen(false);
          onViewChange();
        }}
      />
    );
  if (severityOpen && date <= today)
    return (
      <SymptomSeverityEditor
        date={date}
        entry={entry}
        onPatch={onPatch}
        saveStatus={saveStatus}
        done={() => {
          setSeverityOpen(false);
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
        favorites={journal.preferences.pinnedSymptoms}
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
  const visibleSymptoms = new Set(
    symptomSections(journal.customSymptoms, journal.preferences.showPerimenopause)
      .flatMap((section) => section.labels)
      .map(symptomIdentity),
  );
  const pinnedSymptoms = journal.preferences.pinnedSymptoms.filter((label) =>
    visibleSymptoms.has(symptomIdentity(label)),
  );
  const sections: Record<DaySection, React.ReactNode> = {
    symptoms: (
      <View>
        <SectionLabel icon={Heart}>How are you feeling?</SectionLabel>
        <Text style={[common.small, { marginBottom: 8 }]}>
          {entry.symptoms.length} logged · tap to add or remove
        </Text>
        <View style={common.wrap}>
          {[
            ...pinnedSymptoms,
            ...entry.symptoms.filter((symptom) => !symptomSelected(pinnedSymptoms, symptom)),
          ].map((symptom) => {
            const selected = symptomSelected(entry.symptoms, symptom);
            const severity = symptomSeverity(entry, symptom);
            return (
              <Chip
                key={symptomIdentity(symptom)}
                label={`${symptom}${selected && severity !== null ? ` · ${severity}/10` : ''}`}
                accessibilityLabel={`${selected ? 'Remove' : 'Log'} ${symptom}${selected && severity !== null ? `, severity ${severity} of 10` : ''}`}
                selected={selected}
                icon={selected ? Check : undefined}
                onPress={() => toggle(symptom)}
              />
            );
          })}
        </View>
        <View style={[common.wrap, { marginTop: 8 }]}>
          <Button quiet label="All symptoms" onPress={() => browse('All')} />
          {entry.symptoms.length > 0 && (
            <Button
              quiet
              label="Rate symptoms · optional"
              onPress={() => {
                closeActions();
                setSeverityOpen(true);
                onViewChange();
              }}
            />
          )}
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
            <SeverityControl
              symptom="Cramps"
              value={entry.cramps}
              change={(cramps) => onPatch({ cramps })}
            />
          </View>
        )}
      </View>
    ),
    observations: (
      <ActionRow
        label="Daily observations"
        detail={
          hasDailyDetails(entry.dailyDetails)
            ? `${describeDailyDetails(entry.dailyDetails).length} recorded`
            : 'Mood, energy, activity & more'
        }
        onPress={() => {
          closeActions();
          setDailyOpen(true);
          onViewChange();
        }}
      />
    ),
    medications: (
      <ActionRow
        label="Medications & supplements"
        detail={`${entry.doseRecords.length} logged · ${plannedDoses(journal.medications, date).filter((d) => d.phase !== 'as-needed').length} scheduled`}
        onPress={() => {
          closeActions();
          setDosesOpen(true);
          onViewChange();
        }}
      />
    ),
    sleep: (
      <View>
        <ActionRow
          label="Sleep"
          detail={`${hasSleep(entry.sleep) ? 'Manual details recorded' : 'No manual details'}${entry.sleepImports.length ? ` · ${entry.sleepImports.length} imported` : ''}`}
          onPress={() => {
            closeActions();
            setSleepOpen(true);
            onViewChange();
          }}
        />
        <ImportedSleepDetails
          records={entry.sleepImports}
          change={(sleepImports) => onPatch({ sleepImports })}
        />
      </View>
    ),
    flow: (
      <View>
        <ActionRow
          label="Flow"
          detail={entry.flowRecorded ? FLOW_LABELS[entry.flow] : 'Not logged'}
          expanded={flowOpen}
          onPress={() => setFlowOpen(!flowOpen)}
        />
        {flowOpen && (
          <View>
            <SectionLabel icon={Droplet}>Flow</SectionLabel>
            <View style={common.wrap}>
              {FLOWS.map((flow) => (
                <Chip
                  key={flow}
                  label={FLOW_LABELS[flow]}
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
                  : entry.flow === 'unspecified'
                    ? 'Bleeding recorded. You can add the flow level whenever you like.'
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
                          : colors.paper,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {entry[field as 'periodStart' | 'periodEnd'] && (
                        <Check size={14} color={colors.onAccent} />
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
        )}
      </View>
    ),
    sexualHealth: (
      <ActionRow
        label="Sexual health"
        detail={hasSexualHealth(entry.sexualHealth) ? 'Details recorded' : undefined}
        onPress={() => {
          closeActions();
          setSexualHealthOpen(true);
          onViewChange();
        }}
      />
    ),
    notes: (
      <View>
        <ActionRow
          label="Notes"
          detail={entry.note ? 'Note recorded' : undefined}
          expanded={notesOpen}
          onPress={() => setNotesOpen(!notesOpen)}
        />
        {notesOpen && (
          <View>
            <SectionLabel icon={NotebookPen}>A note for yourself</SectionLabel>
            <TextInput
              keyboardAppearance={dark ? 'dark' : 'light'}
              selectionColor={colors.plum}
              accessibilityLabel="Daily note"
              style={[
                common.input,
                { minHeight: 115, textAlignVertical: 'top', backgroundColor: colors.paper },
              ]}
              multiline
              value={entry.note}
              onChangeText={(note) => onPatch({ note })}
              placeholder="What’s on your mind today?"
              placeholderTextColor={colors.muted}
              maxLength={10000}
            />
          </View>
        )}
      </View>
    ),
  };
  return (
    <View style={{ gap: 8 }}>
      <View style={[common.between, { alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={common.eyebrow}>{date === today ? 'TODAY’S JOURNAL' : 'DAILY JOURNAL'}</Text>
          <Text accessibilityRole="header" style={common.heading}>
            {formatDay(date, { month: 'long', day: 'numeric' })}
          </Text>
          <Text style={common.body}>
            {formatDay(date, { weekday: 'long' })} · {date.slice(0, 4)}
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
      <View style={[common.between, { flexWrap: 'wrap', gap: 4 }]}>
        <View style={common.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            disabled={!validDay(addDays(date, -1))}
            onPress={() => onSelectDate(addDays(date, -1))}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft color={colors.plum} size={22} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next day"
            disabled={!validDay(addDays(date, 1))}
            onPress={() => onSelectDate(addDays(date, 1))}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronRight color={colors.plum} size={22} />
          </Pressable>
        </View>
        <Button
          quiet
          icon={Settings2}
          label="Journal settings"
          onPress={() => {
            setSettingsOpen(true);
            closeActions();
            onViewChange();
          }}
        />
      </View>
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
                observations, sexual-health details, dose records, symptoms, sleep, daily
                observations, notes, and period markers for{' '}
                {formatDay(date, { month: 'long', day: 'numeric', year: 'numeric' })}. You can undo
                the last deletion until you lock, delete another entry, or log this day again.
                Medication schedules, care reminder plans and separate medical records are kept.
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
      {journal.medicalRecords
        .filter((record) => record.date === date)
        .map((record) => (
          <View key={record.id} style={[common.card, { gap: 8 }]}>
            <Text style={common.label}>Medical record · {record.title}</Text>
            {describeMedicalRecord(record, true)
              .slice(1)
              .map((text, i) => (
                <Text key={i} style={common.body}>
                  {text}
                </Text>
              ))}
            <Text style={common.small}>
              Edit or manage attachments under Your data → Medical records.
            </Text>
          </View>
        ))}
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
          {journal.preferences.sectionOrder.map((section) => (
            <View key={section}>{sections[section]}</View>
          ))}
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
