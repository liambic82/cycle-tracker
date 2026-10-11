import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import {
  CSV_TEMPLATE,
  parseJournalCSV,
  importRowState,
  applyImportRows,
  historicalPeriodRows,
  type ImportRow,
} from '../domain/journalImport';
import { toDay } from '../domain/dates';
import type { Flow, Journal } from '../domain/journal';
import { exportText } from '../data/files';
import { removePhotoTemp } from '../data/photoCache';
import { Button, Chip } from './components';
import { useTheme } from './theme';
export function JournalImport({
  journal,
  update,
  close,
  saveStatus,
  onViewChange,
}: {
  journal: Journal;
  update: (f: (j: Journal) => Journal) => void;
  close: () => void;
  saveStatus: React.ReactNode;
  onViewChange: () => void;
}) {
  const { common, colors } = useTheme();
  const [rows, setRows] = useState<ImportRow[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [start, setStart] = useState(''),
    [end, setEnd] = useState(''),
    [flow, setFlow] = useState<Flow>('medium'),
    [busy, setBusy] = useState(false),
    [limit, setLimit] = useState(20);
  const alive = useRef(true);
  const today = toDay(new Date());
  useEffect(() => {
    alive.current = true;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, [close]);
  const review = (incoming: ImportRow[]) => {
    setRows(incoming);
    setSelected(
      incoming
        .filter((x) => ['new', 'merge'].includes(importRowState(journal, x)))
        .map((x) => x.date),
    );
    setError('');
    setMessage(
      'Review the dated rows before applying. Conflicting existing flow or notes will not be replaced.',
    );
    setLimit(20);
    onViewChange();
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not import.');
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  return (
    <View style={{ gap: 18 }}>
      <Button secondary label="Back to Your data" disabled={busy} onPress={close} />
      {saveStatus}
      <Text style={common.heading}>Add past periods & import CSV</Text>
      {!!error && (
        <Text accessibilityRole="alert" style={common.error}>
          {error}
        </Text>
      )}
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={common.body}>
          {message}
        </Text>
      )}
      {rows.length > 0 ? (
        <>
          <Text style={common.label}>
            {selected.length} selected of {rows.length} rows
          </Text>
          <Text style={common.small}>
            New observations merge with existing sleep, medication, measurements and other fields.
            Existing conflicting flow or notes must be resolved in the daily editor. Unchanged rows
            add no duplicates.
          </Text>
          {rows.slice(0, limit).map((row) => {
            const state = importRowState(journal, row);
            return (
              <View key={row.date} style={[common.card, { gap: 10 }]}>
                <Chip
                  label={`${row.date} · ${state}`}
                  selected={selected.includes(row.date)}
                  disabled={state === 'conflict' || state === 'unchanged'}
                  onPress={() =>
                    setSelected(
                      selected.includes(row.date)
                        ? selected.filter((x) => x !== row.date)
                        : [...selected, row.date],
                    )
                  }
                />
                <Text style={common.body}>
                  {row.flow ?? 'Flow not supplied'}
                  {row.start ? ' · period start' : ''}
                  {row.end ? ' · period end' : ''}
                </Text>
                <Text style={common.body}>{row.symptoms.join('; ')}</Text>
                <Text style={common.body}>{row.note}</Text>
              </View>
            );
          })}
          {rows.length > limit && (
            <Button secondary label="Show more import rows" onPress={() => setLimit(limit + 20)} />
          )}
          <Button
            secondary
            label="Cancel import review"
            onPress={() => {
              setRows([]);
              setSelected([]);
              setMessage('');
            }}
          />
          <Button
            label="Apply selected import rows"
            disabled={!selected.length || busy}
            onPress={() => {
              try {
                update((j) =>
                  applyImportRows(
                    j,
                    rows.filter((r) => selected.includes(r.date)),
                    today,
                  ),
                );
                setRows([]);
                setSelected([]);
                setMessage('Rows applied. Check the save status before leaving.');
                onViewChange();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not apply rows.');
              }
            }}
          />
        </>
      ) : (
        <>
          <Text style={common.label}>Add a past period</Text>
          <Text style={common.body}>
            Enter the start and optional last day you remember. Only those dates receive
            observations; days in between remain unlogged. A start/end pair describes a span, not
            proof of bleeding every day.
          </Text>
          <TextInput
            accessibilityLabel="Historical period start"
            style={common.input}
            placeholder="Start YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            value={start}
            onChangeText={setStart}
            maxLength={10}
          />
          <TextInput
            accessibilityLabel="Historical period end"
            style={common.input}
            placeholder="End YYYY-MM-DD (optional)"
            placeholderTextColor={colors.muted}
            value={end}
            onChangeText={setEnd}
            maxLength={10}
          />
          <Text style={common.small}>
            Flow to record on the supplied dates; use each day's editor if they differed.
          </Text>
          <View style={common.wrap}>
            {(['light', 'medium', 'heavy'] as const).map((x) => (
              <Chip key={x} label={x} selected={flow === x} onPress={() => setFlow(x)} />
            ))}
          </View>
          <Button
            label="Review past period"
            onPress={() => {
              try {
                review(historicalPeriodRows(start, end || null, flow, today));
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Check the dates.');
              }
            }}
          />
          <Text style={common.label}>Import from a prepared CSV</Text>
          <Text style={common.body}>
            Use the simple template for dates, flow, period boundaries, symptoms and notes. It has a
            fictional example row to replace. Readable full-journal exports and other apps' files
            need conversion to this exact format; encrypted backups remain the complete transfer
            method.
          </Text>
          <Button
            secondary
            label="Download simple CSV template"
            disabled={busy}
            onPress={() =>
              void run(() =>
                exportText(CSV_TEMPLATE, 'cycle-simple-import-template.csv', 'text/csv'),
              )
            }
          />
          <Button
            secondary
            label="Choose CSV to review"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                const result = await DocumentPicker.getDocumentAsync({
                  type: ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel'],
                  copyToCacheDirectory: true,
                  base64: false,
                });
                if (result.canceled || !result.assets[0]) return;
                const a = result.assets[0];
                try {
                  if (!alive.current) return;
                  const size = Platform.OS === 'web' ? a.file?.size : new File(a.uri).size;
                  if (!size || size > 1024 * 1024) throw new Error('Choose a CSV up to 1 MiB.');
                  const text =
                    Platform.OS === 'web' ? await a.file!.text() : await new File(a.uri).text();
                  if (alive.current) {
                    const parsed = parseJournalCSV(text, today);
                    if (!parsed.length) throw new Error('No data rows were found.');
                    review(parsed);
                  }
                } finally {
                  if (Platform.OS !== 'web') removePhotoTemp(a.uri, 'DocumentPicker');
                }
              })
            }
          />
        </>
      )}
    </View>
  );
}
