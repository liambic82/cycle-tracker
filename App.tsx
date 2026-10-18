import { HormoneGuide } from './src/ui/HormoneGuide';
import { ActionRow } from './src/ui/ActionRow';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  CalendarDays,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  CircleAlert,
  Flower2,
  LockKeyhole,
  Plus,
  Pill,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useJournal } from './src/data/useJournal';
import { useScreenPrivacy } from './src/data/useScreenPrivacy';
import app from './app.json';
import { addCustomSymptom, cycleDay, starts, updateEntry } from './src/domain/journal';
import { formatDay, toDay, type Day } from './src/domain/dates';
import { AuthGate } from './src/ui/AuthGate';
import { Calendar, type CalendarView, type CalendarHandle } from './src/ui/Calendar';
import { DayEditor } from './src/ui/DayEditor';
import { History } from './src/ui/History';
import { DataSettings } from './src/ui/DataSettings';
import { UndoNotice } from './src/ui/UndoNotice';
import { Medications } from './src/ui/Medications';
import { CycleContext } from './src/ui/CycleContext';
import { PeriodEstimate } from './src/ui/PeriodEstimate';
import { PeriodRangeEditor } from './src/ui/PeriodRangeEditor';
import { Brand, Button } from './src/ui/components';
import { useTheme, serif } from './src/ui/theme';
import { AppearanceProvider, useAppearance } from './src/ui/AppearanceProvider';
import { AppearanceBackdrop } from './src/ui/AppearanceBackdrop';

type Page = 'calendar' | 'history' | 'medications' | 'data';
const NAV: Array<{ id: Page; label: string; icon: LucideIcon }> = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'history', label: 'Your history', icon: ChartNoAxesCombined },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'data', label: 'Your data', icon: ShieldCheck },
];

function CycleApp() {
  const { colors, common } = useTheme();
  const state = useJournal();
  const { setDemo } = useAppearance();
  useEffect(() => {
    setDemo(state.demo);
  }, [state.demo, setDemo]);
  const width = useWindowDimensions().width;
  const desktop = width >= 900;
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const calendarScroll = useRef<CalendarHandle>(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [page, setPage] = useState<Page>('calendar');
  const [editing, setEditing] = useState(false);
  const [learning, setLearning] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [addingPeriod, setAddingPeriod] = useState(false);
  const mainScroll = useRef<ScrollView>(null);
  const editorScroll = useRef<ScrollView>(null);
  const [today, setToday] = useState(toDay(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setToday(toDay(new Date())), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!state.journal) {
      setEditing(false);
      setLearning(false);
      setEstimating(false);
      setAddingPeriod(false);
      setPage('calendar');
      setCalendarView('month');
    }
  }, [!!state.journal]);
  useEffect(() => {
    if ((!learning && !estimating) || page !== 'calendar') return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      setLearning(false);
      setEstimating(false);
      mainScroll.current?.scrollTo({ y: 0, animated: false });
      return true;
    });
    return () => listener.remove();
  }, [learning, estimating, page]);

  if (state.loading)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20,
          backgroundColor: colors.background,
        }}
      >
        <Brand />
        <ActivityIndicator color={colors.plum} />
      </View>
    );
  if (!state.journal)
    return (
      <AuthGate
        exists={state.exists}
        busy={state.busy}
        authProgress={state.authProgress}
        error={state.error}
        start={state.start}
        explore={state.explore}
        restore={state.restore}
        biometricEnabled={state.biometricEnabled}
        biometricAvailable={state.biometricAvailable}
        unlockBiometric={state.unlockBiometric}
      />
    );
  const journal = state.journal;
  const day = cycleDay(journal, today);
  const lastStart = starts(journal, today).at(-1);
  const select = (date: Day) => {
    const open = () => {
      state.update((value) => ({ ...value, selectedDate: date }));
      setEditing(true);
    };
    if (calendarScroll.current) calendarScroll.current.rememberPosition(open);
    else open();
  };
  const closeDay = () => {
    setEditing(false);
    calendarScroll.current?.restorePosition();
  };
  const showDay = (date: Day) => {
    setLearning(false);
    setEstimating(false);
    setAddingPeriod(false);
    setPage('calendar');
    setCalendarView('day');
    setEditing(false);
    state.update((value) => ({ ...value, selectedDate: date }));
    calendarScroll.current?.journal();
  };
  const logToday = () => showDay(today);
  const undoNotice = state.deleted ? (
    <UndoNotice date={state.deleted.date} undo={state.undoDelete} dismiss={state.dismissUndo} />
  ) : null;
  const saveStatus = (
    <View style={[common.row, { gap: 6 }]}>
      {state.status === 'Saving…' ? (
        <ActivityIndicator size="small" color={colors.plum} />
      ) : state.status === 'Not saved' ? (
        <CircleAlert size={15} color={colors.error} />
      ) : (
        <Check size={15} color={colors.sageInk} />
      )}
      <Text accessibilityLiveRegion="polite" style={[common.small, { flexShrink: 1 }]}>
        {state.status}
      </Text>
    </View>
  );
  const editor = (
    <DayEditor
      key={journal.selectedDate}
      journal={journal}
      today={today}
      undoNotice={undoNotice}
      saveStatus={saveStatus}
      demo={state.demo}
      onViewChange={() => {
        if (editing) editorScroll.current?.scrollTo({ y: 0, animated: false });
        else calendarScroll.current?.journal();
      }}
      onDelete={() => state.removeEntry(journal.selectedDate)}
      onPatch={(patch) => state.update((value) => updateEntry(value, value.selectedDate, patch))}
      onCustom={(symptom) => state.update((value) => addCustomSymptom(value, symptom))}
      onUpdate={state.update}
      onManageMedications={() => {
        setEditing(false);
        setPage('medications');
        mainScroll.current?.scrollTo({ y: 0, animated: false });
      }}
    />
  );
  const calendarHome = page === 'calendar' && !addingPeriod && !estimating && !learning;
  const home = (
    <Calendar
      ref={calendarScroll}
      journal={journal}
      today={today}
      compact={!desktop}
      view={calendarView}
      onSelect={(date) => state.update((value) => ({ ...value, selectedDate: date }))}
      onOpenDay={select}
      changeView={(view) => {
        setCalendarView(view);
        setEditing(false);
      }}
      dayContent={editor}
      header={
        <View style={{ gap: 14 }}>
          <View style={[common.card, { padding: 18, gap: 10 }]}>
            <Text style={common.eyebrow}>CURRENT CYCLE · TODAY</Text>
            <View style={[common.between, { flexWrap: 'wrap', gap: 12 }]}>
              <View>
                <Text style={common.heading}>{day ? `Cycle day ${day}` : 'Cycle day unknown'}</Text>
                <Text style={common.small}>
                  Last period start:{' '}
                  {lastStart
                    ? formatDay(lastStart, { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Not recorded'}
                </Text>
              </View>
            </View>
            <HormoneGuide />
          </View>
          <Button
            icon={Plus}
            label="Add period"
            onPress={() => {
              setEditing(false);
              setAddingPeriod(true);
            }}
          />
          {journal.preferences.sleepAutomation.enabled && (
            <Text style={common.small} accessibilityLiveRegion="polite">
              {state.autoSleep.message ||
                (journal.preferences.sleepAutomation.lastCheck
                  ? `Sleep · ${journal.preferences.sleepAutomation.lastCheck.added} new, ${journal.preferences.sleepAutomation.lastCheck.review} to review at last check`
                  : 'Sleep import on unlock is on')}
              {' · Your data → Wearable sleep'}
            </Text>
          )}
        </View>
      }
      explore={
        <View>
          <ActionRow
            label="Explore"
            expanded={exploreOpen}
            onPress={() => setExploreOpen(!exploreOpen)}
          />
          {exploreOpen && (
            <View style={{ gap: 10, marginTop: 10 }}>
              <Button
                secondary
                icon={BookOpen}
                label="Cycle context"
                onPress={() => setLearning(true)}
              />
              <Button
                secondary
                icon={CalendarDays}
                label="Period estimate"
                onPress={() => setEstimating(true)}
              />
            </View>
          )}
        </View>
      }
    />
  );
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
      {desktop && (
        <View
          style={{
            width: 210,
            paddingHorizontal: 22,
            paddingVertical: 35,
            backgroundColor: colors.paper,
            borderRightWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Brand />
          <Text style={[common.eyebrow, { marginTop: 45, marginBottom: 18, fontSize: 9 }]}>
            YOUR EVERYDAY COMPANION
          </Text>
          <View style={{ gap: 8 }}>
            {NAV.map(({ id, label, icon: Icon }) => (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: page === id }}
                onPress={() => {
                  setLearning(false);
                  setEstimating(false);
                  setAddingPeriod(false);
                  setPage(id);
                  if (id === 'calendar') calendarScroll.current?.top();
                }}
                style={{
                  minHeight: 49,
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: page === id ? colors.accentSoft : 'transparent',
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={1.6}
                  color={page === id ? colors.plumDark : colors.muted}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: page === id ? '600' : '400',
                    color: page === id ? colors.plumDark : colors.muted,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flex: 1, minHeight: 40 }} />
          <View style={{ padding: 18, borderRadius: 17, backgroundColor: colors.sage, gap: 12 }}>
            <Flower2 size={26} color={colors.sageInk} strokeWidth={1.3} />
            <Text style={{ fontFamily: serif, fontSize: 19, lineHeight: 25, color: colors.ink }}>
              A space that’s{'\n'}yours.
            </Text>
            <Text style={[common.small, { fontSize: 11 }]}>
              Your journal stays on this device. Your story stays yours.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.demo ? 'Exit demo' : 'Lock journal'}
            onPress={state.lock}
            style={[common.row, { minHeight: 52, marginTop: 15, paddingHorizontal: 12 }]}
          >
            <LockKeyhole size={15} color={colors.muted} />
            <Text style={common.small}>{state.demo ? 'Exit demo' : 'Lock journal'}</Text>
          </Pressable>
          <Text style={[common.eyebrow, { fontSize: 8, marginLeft: 12, color: colors.muted }]}>
            EARLY PREVIEW · {app.expo.version}
          </Text>
        </View>
      )}
      <View
        style={{ flex: 1, minWidth: 0 }}
        accessibilityElementsHidden={editing}
        importantForAccessibility={editing ? 'no-hide-descendants' : 'auto'}
        aria-hidden={editing}
      >
        {!state.obscured && <AppearanceBackdrop personalUri={state.photo.uri} />}
        {!desktop && (
          <View
            style={[
              common.between,
              {
                paddingHorizontal: 21,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.paper,
              },
            ]}
          >
            <Brand small />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={state.demo ? 'Exit demo' : 'Lock journal'}
              onPress={state.lock}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <LockKeyhole size={20} color={colors.plum} />
            </Pressable>
          </View>
        )}
        {state.demo && (
          <View
            style={[
              common.between,
              {
                paddingHorizontal: desktop ? 32 : 20,
                paddingVertical: 10,
                backgroundColor: colors.sage,
                flexWrap: 'wrap',
              },
            ]}
          >
            <Text style={[common.small, { color: colors.sageInk }]}>
              Sample journal · All entries are fictional
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={state.lock}
              style={{ minHeight: 35, justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 12, color: colors.sageInk, fontWeight: '700' }}>
                Make it yours →
              </Text>
            </Pressable>
          </View>
        )}
        {!!state.error && (
          <View style={{ backgroundColor: colors.roseSoft, padding: 16, gap: 10 }}>
            <Text accessibilityRole="alert" style={common.error}>
              {state.error}
            </Text>
            <Button secondary label="Retry saving" onPress={state.retry} />
          </View>
        )}
        {!!state.reminderError && (
          <View style={{ backgroundColor: colors.roseSoft, padding: 16, gap: 10 }}>
            <Text accessibilityRole="alert" style={common.error}>
              {state.reminderError}
            </Text>
            {page !== 'medications' && (
              <Button
                secondary
                label="Review reminders"
                onPress={() => {
                  setEditing(false);
                  setPage('medications');
                }}
              />
            )}
          </View>
        )}
        {calendarHome ? (
          home
        ) : (
          <ScrollView
            ref={mainScroll}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: desktop ? 32 : 20,
              gap: 24,
              maxWidth: 1530,
              width: '100%',
              alignSelf: 'center',
              paddingBottom: 36,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={common.heading}>
              {page === 'calendar'
                ? addingPeriod
                  ? 'Add period'
                  : estimating
                    ? 'Period estimate'
                    : 'Cycle context'
                : page === 'history'
                  ? 'Your history'
                  : page === 'medications'
                    ? 'Medications'
                    : 'Your data'}
            </Text>
            {undoNotice}
            {page === 'calendar' && addingPeriod ? (
              <PeriodRangeEditor
                journal={journal}
                today={today}
                update={state.update}
                saveStatus={saveStatus}
                onViewChange={() => mainScroll.current?.scrollTo({ y: 0, animated: false })}
                closeLabel="Back to calendar"
                close={() => {
                  setAddingPeriod(false);
                  mainScroll.current?.scrollTo({ y: 0, animated: false });
                }}
              />
            ) : page === 'calendar' && estimating ? (
              <PeriodEstimate
                journal={journal}
                today={today}
                done={() => {
                  setEstimating(false);
                  mainScroll.current?.scrollTo({ y: 0, animated: false });
                }}
              />
            ) : page === 'calendar' && learning ? (
              <CycleContext
                journal={journal}
                date={journal.selectedDate}
                today={today}
                doneLabel="Back to calendar"
                done={() => {
                  setLearning(false);
                  mainScroll.current?.scrollTo({ y: 0, animated: false });
                }}
              />
            ) : page === 'history' ? (
              <History journal={journal} today={today} openDay={showDay} />
            ) : page === 'medications' ? (
              <Medications
                reminders={{
                  state: state.reminderState,
                  available: state.remindersAvailable,
                  demo: state.demo,
                  busy: state.busy,
                  error: state.reminderError,
                  setEnabled: state.setMedicationReminder,
                  refresh: state.refreshReminders,
                  stop: state.stopReminders,
                  test: state.testReminder,
                }}
                journal={journal}
                today={today}
                update={state.update}
                openToday={logToday}
                saveStatus={saveStatus}
                onViewChange={() => mainScroll.current?.scrollTo({ y: 0, animated: false })}
              />
            ) : (
              <DataSettings
                autoSleep={state.autoSleep}
                checkSleep={state.checkSleep}
                saveStatus={saveStatus}
                update={state.update}
                photo={state.photo}
                onViewChange={() => mainScroll.current?.scrollTo({ y: 0, animated: false })}
                journal={journal}
                demo={state.demo}
                openDay={showDay}
                backup={state.backup}
                lock={state.lock}
                erase={state.erase}
                biometricEnabled={state.biometricEnabled}
                biometricAvailable={state.biometricAvailable}
                setBiometricUnlock={state.setBiometricUnlock}
                setShowPerimenopause={(showPerimenopause) =>
                  state.update((value) => ({
                    ...value,
                    preferences: { ...value.preferences, showPerimenopause },
                  }))
                }
              />
            )}
          </ScrollView>
        )}
        {!desktop && (
          <View
            style={{
              flexDirection: 'row',
              borderTopWidth: 1,
              borderColor: colors.line,
              paddingTop: 7,
              backgroundColor: colors.paper,
            }}
          >
            {NAV.map(({ id, label, icon: Icon }) => (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: page === id }}
                onPress={() => {
                  setLearning(false);
                  setEstimating(false);
                  setAddingPeriod(false);
                  setPage(id);
                  if (id === 'calendar') calendarScroll.current?.top();
                }}
                style={{ flex: 1, alignItems: 'center', gap: 5, padding: 10, minHeight: 59 }}
              >
                <Icon
                  size={20}
                  color={page === id ? colors.plumDark : colors.muted}
                  strokeWidth={1.7}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: page === id ? '700' : '400',
                    color: page === id ? colors.plumDark : colors.muted,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <Modal
        visible={editing && !state.obscured}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDay}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
          <View
            style={[
              common.between,
              {
                paddingHorizontal: 23,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderColor: colors.line,
              },
            ]}
          >
            {saveStatus}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close daily journal"
              onPress={closeDay}
              style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
            >
              <X size={22} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView
            ref={editorScroll}
            contentContainerStyle={{ padding: 24, paddingBottom: 55 }}
            keyboardShouldPersistTaps="handled"
          >
            {editor}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {state.obscured && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Brand />
          <LockKeyhole color={colors.plum} size={24} />
          <Text style={common.body}>Your journal is private.</Text>
        </View>
      )}
      {state.busy && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <ActivityIndicator color={colors.plum} />
          <Text style={common.body}>Please wait…</Text>
        </View>
      )}
    </View>
  );
}

function AppShell() {
  const { colors, common, dark } = useTheme();
  const privacy = useScreenPrivacy();
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        {privacy.ready ? (
          <CycleApp />
        ) : (
          <View
            style={{
              flex: 1,
              padding: 28,
              gap: 20,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Brand />
            {privacy.error ? (
              <>
                <Text accessibilityRole="alert" style={common.error}>
                  Privacy setup could not finish. Try again before opening your journal.
                </Text>
                <Button label="Retry privacy setup" onPress={privacy.retry} />
              </>
            ) : (
              <ActivityIndicator color={colors.plum} />
            )}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AppearanceProvider>
      <AppShell />
    </AppearanceProvider>
  );
}
