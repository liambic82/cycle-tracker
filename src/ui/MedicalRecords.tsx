import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import Svg, { Polyline } from 'react-native-svg';
import {
  MEDICAL_KINDS,
  MEDICAL_LABELS,
  emptyMedicalRecord,
  saveMedicalRecord,
  parseMedicalRecord,
  describeMedicalRecord,
  medicalCSV,
  type MedicalRecord,
  type MedicalKind,
} from '../domain/medicalRecords';
import { cycleDay, type Journal } from '../domain/journal';
import { toDay } from '../domain/dates';
import { exportText } from '../data/files';
import { pickMedicalAttachment, exportMedicalAttachment } from '../data/medicalAttachments';
import { Button, Chip } from './components';
import { useTheme } from './theme';

export function MedicalRecords({
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
  const [filter, setFilter] = useState<MedicalKind>('lab');
  const [draft, setDraft] = useState<MedicalRecord | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [removed, setRemoved] = useState<MedicalRecord | null>(null);
  const [exportConfirm, setExportConfirm] = useState(false);
  const [fileConfirm, setFileConfirm] = useState<{ record: string; attachment: string } | null>(
    null,
  );
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const [trend, setTrend] = useState('');
  const controller = useRef(new AbortController());
  useEffect(() => () => controller.current.abort(), []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (draft) {
        setDraft(null);
        onViewChange();
      } else close();
      return true;
    });
    return () => sub.remove();
  }, [draft, close, onViewChange]);
  const today = toDay(new Date());
  const rows = journal.medicalRecords
    .filter(
      (x) =>
        x.kind === filter &&
        `${x.title} ${x.clinician}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const trends = [
    ...new Set(
      journal.medicalRecords
        .filter((x) => x.kind === 'lab')
        .map((x) => JSON.stringify([x.title, x.unit])),
    ),
  ];
  const points = journal.medicalRecords
    .filter(
      (x) =>
        x.kind === 'lab' &&
        x.date &&
        JSON.stringify([x.title, x.unit]) === trend &&
        /^-?\d+(?:\.\d+)?$/.test(x.value.trim()) &&
        Number.isFinite(Number(x.value)),
    )
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .slice(-12);
  const nums = points.map((x) => Number(x.value));
  const min = Math.min(...nums),
    max = Math.max(...nums);
  const change = (patch: Partial<MedicalRecord>) => {
    setDraft(draft ? { ...draft, ...patch } : draft);
    setError('');
  };
  const field = (
    key: 'title' | 'detail' | 'value' | 'unit' | 'reference' | 'clinician',
    label: string,
    maxLength: number,
  ) =>
    draft && (
      <View style={{ gap: 8 }}>
        <Text style={common.label}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          style={common.input}
          placeholderTextColor={colors.muted}
          value={draft[key]}
          onChangeText={(text) => change({ [key]: text })}
          maxLength={maxLength}
          multiline={key === 'detail'}
        />
      </View>
    );
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (e) {
      if (!controller.current.signal.aborted)
        setError(e instanceof Error ? e.message : 'Please retry.');
    } finally {
      if (!controller.current.signal.aborted) setBusy(false);
    }
  };
  return (
    <View style={{ gap: 20 }}>
      <Button
        secondary
        label={draft ? 'Cancel medical record changes' : 'Back to Your data'}
        disabled={busy}
        onPress={() => {
          if (draft) {
            setDraft(null);
            setError('');
            onViewChange();
          } else close();
        }}
      />
      {saveStatus}
      <Text style={common.heading}>
        {draft ? 'Medical record' : 'Medical records & doctor visits'}
      </Text>
      {!!error && !draft && (
        <Text accessibilityRole="alert" style={common.error}>
          {error}
        </Text>
      )}
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={common.body}>
          {message}
        </Text>
      )}
      {draft ? (
        <>
          <Text style={common.label}>{MEDICAL_LABELS[draft.kind]}</Text>
          {field('title', draft.kind === 'lab' ? 'Test name' : 'Title', 160)}
          <Text style={common.label}>
            {draft.kind === 'lab'
              ? 'Draw date (YYYY-MM-DD)'
              : draft.kind === 'appointment'
                ? 'Appointment date (YYYY-MM-DD)'
                : 'Date (YYYY-MM-DD) · blank if unknown'}
          </Text>
          <TextInput
            accessibilityLabel="Medical record date"
            style={common.input}
            value={draft.date ?? ''}
            onChangeText={(date) => change({ date: date || null })}
            maxLength={10}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
          />
          {draft.kind === 'appointment' && (
            <>
              {<Text style={common.label}>Appointment time · optional (HH:MM)</Text>}
              <TextInput
                accessibilityLabel="Appointment time"
                style={common.input}
                value={draft.time ?? ''}
                onChangeText={(time) => change({ time: time || null })}
                maxLength={5}
                placeholder="HH:MM"
                placeholderTextColor={colors.muted}
              />
            </>
          )}
          {draft.kind === 'lab' && (
            <>
              {field('value', 'Result · exactly as the lab reports it', 100)}
              {field('unit', 'Units · from the lab', 80)}
              {field('reference', 'Lab reference range · optional', 200)}
              <Text style={common.small}>
                Results may be numbers or text such as “less than 5”. Copy units and reference
                ranges from the lab; this app does not interpret or flag results. Record hormonal
                medication context in Details.
              </Text>
            </>
          )}
          {field('clinician', 'Clinician / location · optional', 160)}
          {field('detail', 'Details / questions / medication context', 4000)}
          {['appointment', 'question'].includes(draft.kind) && (
            <Chip
              label={draft.resolved ? 'Marked complete' : 'Not completed'}
              selected={draft.resolved}
              onPress={() => change({ resolved: !draft.resolved })}
            />
          )}
          <Text style={common.label}>Attachments · {draft.attachments.length}/2</Text>
          <Text style={common.small}>
            PDF, JPEG or PNG, up to 512 KiB each. Copies, including any original file metadata, are
            encrypted inside your journal and full backups. Attachments are not embedded in doctor
            PDFs or CSV.
          </Text>
          {draft.attachments.map((a) => (
            <View key={a.id} style={{ gap: 8 }}>
              <Text style={common.body}>
                {a.name} · {Math.ceil(a.hex.length / 2048)} KiB
              </Text>
              <Button
                secondary
                label={`Remove attachment from draft: ${a.name}`}
                disabled={busy}
                onPress={() =>
                  change({ attachments: draft.attachments.filter((x) => x.id !== a.id) })
                }
              />
            </View>
          ))}
          <Button
            secondary
            label="Choose medical attachment"
            disabled={busy || draft.attachments.length >= 2}
            onPress={() =>
              void run(async () => {
                const a = await pickMedicalAttachment(
                  Crypto.randomUUID(),
                  controller.current.signal,
                );
                if (a && !controller.current.signal.aborted)
                  setDraft((current) =>
                    current && current.id === draft.id
                      ? { ...current, attachments: [...current.attachments, a] }
                      : current,
                  );
              })
            }
          />
          <Button
            label="Save medical record"
            disabled={busy}
            onPress={() => {
              try {
                const value = parseMedicalRecord(draft);
                update((j) => saveMedicalRecord(j, value, today));
                setDraft(null);
                setError('');
                onViewChange();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not save record.');
              }
            }}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={common.error}>
              {error}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text style={common.body}>
            Keep measured results, visits and your own questions together. Entries are records you
            supply; the app does not verify diagnoses or interpret results. Questions and
            appointments can have future dates. Other records describe past or current events.
          </Text>
          <View style={common.wrap}>
            {MEDICAL_KINDS.map((kind) => (
              <Chip
                key={kind}
                label={MEDICAL_LABELS[kind]}
                selected={filter === kind}
                onPress={() => {
                  setFilter(kind);
                  setLimit(20);
                  setQuery('');
                  setConfirm(null);
                }}
              />
            ))}
          </View>
          <Button
            label={`Add ${MEDICAL_LABELS[filter].toLowerCase()}`}
            onPress={() => {
              setDraft(emptyMedicalRecord(Crypto.randomUUID(), filter, today));
              setError('');
              onViewChange();
            }}
          />
          <TextInput
            accessibilityLabel="Search medical records"
            style={common.input}
            placeholder="Search title or clinician"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setLimit(20);
            }}
          />
          {filter === 'lab' && trends.length > 0 && (
            <View style={{ gap: 12 }}>
              <Text style={common.label}>Lab history · choose a test and unit</Text>
              <View style={common.wrap}>
                {trends.map((key) => {
                  const [name, unit] = JSON.parse(key);
                  return (
                    <Chip
                      key={key}
                      label={`${name} · ${unit || 'unit not recorded'}`}
                      selected={key === trend}
                      onPress={() => setTrend(key)}
                    />
                  );
                })}
              </View>
              {trend && (
                <>
                  <Text style={common.small}>
                    Latest {points.length} numeric results in date order. Only exact test-name and
                    unit matches are compared. Text/qualified results remain in the records below
                    and are omitted from the chart. No normal-range interpretation or hormone curve
                    is inferred.
                  </Text>
                  {points.length > 1 && (
                    <View
                      accessible
                      accessibilityLabel={points
                        .map((p) => `${p.date}: ${p.value} ${p.unit}`)
                        .join('; ')}
                      style={{ width: '100%', maxWidth: 600 }}
                    >
                      <Svg width="100%" height={125} viewBox="0 0 300 125">
                        <Polyline
                          fill="none"
                          stroke={colors.plum}
                          strokeWidth={3}
                          points={points
                            .map(
                              (p, i) =>
                                `${10 + (i * 280) / (points.length - 1)},${110 - ((Number(p.value) - min) / (max - min || 1)) * 95}`,
                            )
                            .join(' ')}
                        />
                      </Svg>
                    </View>
                  )}
                  {points.map((p) => (
                    <Text key={p.id} style={common.body}>
                      {p.date} · {p.value} {p.unit}
                    </Text>
                  ))}
                </>
              )}
            </View>
          )}
          <Text style={common.small}>{rows.length} records in this category</Text>
          {rows.slice(0, limit).map((record) => (
            <View key={record.id} style={[common.card, { gap: 12 }]}>
              <Text style={common.heading}>{record.title}</Text>
              <Text style={common.label}>
                {record.date ?? 'Date unknown'}
                {record.kind === 'lab' && record.date
                  ? ` · recorded cycle day ${cycleDay(journal, record.date) ?? 'unknown'}`
                  : ''}
              </Text>
              {describeMedicalRecord(record, true)
                .slice(1)
                .map((line, i) => (
                  <Text key={i} style={common.body}>
                    {line}
                  </Text>
                ))}
              <Button
                secondary
                label={`Edit ${record.title}`}
                disabled={busy}
                onPress={() => {
                  setDraft(parseMedicalRecord(record));
                  setError('');
                  onViewChange();
                }}
              />
              {record.attachments.map((a) => (
                <Button
                  key={a.id}
                  secondary
                  label={`Export attachment: ${a.name}`}
                  disabled={busy}
                  onPress={() => setFileConfirm({ record: record.id, attachment: a.id })}
                />
              ))}
              {fileConfirm?.record === record.id && (
                <>
                  <Text style={common.body}>
                    Export a readable copy outside your encrypted journal? Other apps and saved
                    copies follow their own privacy practices.
                  </Text>
                  <Button
                    secondary
                    label="Cancel attachment export"
                    onPress={() => setFileConfirm(null)}
                  />
                  <Button
                    label="Export readable attachment"
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        const a = record.attachments.find((x) => x.id === fileConfirm.attachment);
                        if (a)
                          await exportMedicalAttachment(
                            a,
                            () => !controller.current.signal.aborted,
                          );
                        if (!controller.current.signal.aborted) {
                          setFileConfirm(null);
                          setMessage('Attachment export is ready.');
                        }
                      })
                    }
                  />
                </>
              )}
              {confirm === record.id ? (
                <>
                  <Text style={common.body}>
                    Delete this medical record and its stored attachments? Undo is available until
                    you leave this screen. External copies remain.
                  </Text>
                  <Button secondary label="Keep medical record" onPress={() => setConfirm(null)} />
                  <Button
                    danger
                    label="Delete medical record"
                    onPress={() => {
                      update((j) => ({
                        ...j,
                        medicalRecords: j.medicalRecords.filter((x) => x.id !== record.id),
                      }));
                      setRemoved(parseMedicalRecord(record));
                      setConfirm(null);
                    }}
                  />
                </>
              ) : (
                <Button
                  secondary
                  label={`Delete options: ${record.title}`}
                  onPress={() => setConfirm(record.id)}
                />
              )}
            </View>
          ))}
          {rows.length > limit && (
            <Button
              secondary
              label="Show more medical records"
              onPress={() => setLimit(limit + 20)}
            />
          )}
          {removed && (
            <Button
              secondary
              label="Undo medical record deletion"
              onPress={() => {
                try {
                  update((j) =>
                    j.medicalRecords.some((x) => x.id === removed.id)
                      ? j
                      : saveMedicalRecord(j, removed, today),
                  );
                  setRemoved(null);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not undo.');
                }
              }}
            />
          )}
          {exportConfirm ? (
            <>
              <Text style={common.body}>
                Export all medical records as readable CSV, including details and clinician names?
                Attachment contents are excluded.
              </Text>
              <Button
                secondary
                label="Cancel medical CSV"
                onPress={() => setExportConfirm(false)}
              />
              <Button
                label="Export readable medical CSV"
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    await exportText(
                      medicalCSV(journal.medicalRecords),
                      'cycle-medical-records.csv',
                      'text/csv',
                    );
                    if (!controller.current.signal.aborted) {
                      setExportConfirm(false);
                      setMessage('Medical CSV export is ready.');
                    }
                  })
                }
              />
            </>
          ) : (
            <Button
              secondary
              label="Export medical records CSV"
              onPress={() => setExportConfirm(true)}
            />
          )}
        </>
      )}
    </View>
  );
}
