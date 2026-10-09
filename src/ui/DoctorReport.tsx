import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Switch, Text, View } from 'react-native';
import { ArrowLeft, FileText } from 'lucide-react-native';
import type { Journal } from '../domain/journal';
import { toDay } from '../domain/dates';
import {
  createDoctorReport,
  defaultReportOptions,
  REPORT_SECTIONS,
  type DoctorReport as ReportSnapshot,
  type ReportOptions,
  type ReportSectionKey,
} from '../domain/report';
import { SEXUAL_HEALTH_FIELDS, SEXUAL_HEALTH_LABELS } from '../domain/sexualHealth';
import { exportDoctorReport } from '../data/reportExport';
import { MedicationField } from './MedicationForm';
import { Button } from './components';
import { useTheme } from './theme';

export function DoctorReport({
  journal,
  demo,
  close,
  onViewChange,
}: {
  journal: Journal;
  demo: boolean;
  close: () => void;
  onViewChange: () => void;
}) {
  const { colors, common } = useTheme();
  const [options, setOptions] = useState<ReportOptions>(() =>
    defaultReportOptions(toDay(new Date())),
  );
  const [report, setReport] = useState<ReportSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const preview = () => {
    setError('');
    setMessage('');
    try {
      const snapshot = createDoctorReport(journal, options, toDay(new Date()), demo);
      Keyboard.dismiss();
      setReport(snapshot);
      onViewChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to prepare this report.');
    }
  };
  const download = async () => {
    if (!report || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await exportDoctorReport(report, () => active.current);
      if (active.current)
        setMessage(
          'PDF export opened. Check your downloads or the destination you selected. Cancelling sharing does not save a copy there.',
        );
    } catch (err) {
      if (active.current)
        setError(
          err instanceof Error ? err.message : 'The PDF could not be created. Please try again.',
        );
    } finally {
      if (active.current) setBusy(false);
    }
  };
  const feedback = (
    <>
      {!!error && (
        <Text accessibilityRole="alert" style={[common.error, common.readable]}>
          {error}
        </Text>
      )}
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={[common.body, common.readable]}>
          {message}
        </Text>
      )}
    </>
  );
  if (report)
    return (
      <View style={{ gap: 20, maxWidth: 850, width: '100%', alignSelf: 'center' }}>
        <Button
          secondary
          icon={ArrowLeft}
          label="Change report choices"
          disabled={busy}
          onPress={() => {
            setReport(null);
            setMessage('');
            setError('');
            onViewChange();
          }}
        />
        <View style={[common.card, { gap: 12, backgroundColor: colors.sage }]}>
          <Text style={common.heading}>Review your doctor summary</Text>
          <Text style={common.body}>
            {report.from} to {report.through} · Prepared {report.generatedOn}
          </Text>
          <Text style={common.body}>
            {report.sample
              ? 'Fictional sample data - not a patient record.'
              : 'Patient-entered records for discussion. No diagnosis, predictions, or medication recommendations are included.'}
          </Text>
          <Text style={common.small}>Included: {report.included.join('; ')}.</Text>
          <Text style={common.body}>
            The PDF contains the content below, laid out for printing. It is readable and not
            encrypted. Review it before choosing where to save or share it.
          </Text>
        </View>
        {report.sections.map((section) => (
          <View key={section.title} style={[common.card, { gap: 12 }]}>
            <Text style={common.heading}>{section.title}</Text>
            <Text style={common.small}>{section.explanation}</Text>
            {!section.blocks.length && (
              <Text style={common.body}>No selected records in this date range.</Text>
            )}
            {section.blocks.map((block, index) => (
              <View
                key={index}
                style={{ gap: 6, borderTopWidth: 1, borderColor: colors.line, paddingTop: 12 }}
              >
                <Text style={common.label}>{block.heading}</Text>
                {block.paragraphs.map((paragraph, i) => (
                  <Text key={i} style={common.body}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ))}
        {feedback}
        <Button
          icon={FileText}
          label="Export readable PDF"
          busy={busy}
          onPress={() => void download()}
        />
        <Button secondary label="Back to Your data" disabled={busy} onPress={close} />
      </View>
    );
  return (
    <View style={{ gap: 20, maxWidth: 850, width: '100%', alignSelf: 'center' }}>
      <Button secondary icon={ArrowLeft} label="Back to Your data" onPress={close} />
      <View style={[common.card, { gap: 14 }]}>
        <Text style={common.heading}>A clearer picture for your visit.</Text>
        <Text style={common.body}>
          Choose a date range and the records you want to include. You’ll review a preview before
          exporting a PDF. These choices apply only to this report.
        </Text>
        <MedicationField
          label="Report start date"
          value={options.from}
          change={(from) => setOptions({ ...options, from })}
          maxLength={10}
          hint="YYYY-MM-DD"
        />
        <MedicationField
          label="Report end date"
          value={options.through}
          change={(through) => setOptions({ ...options, through })}
          maxLength={10}
          hint="Up to 366 days, ending today or earlier."
        />
      </View>
      <View style={[common.card, { gap: 16 }]}>
        <Text style={common.heading}>Include in this report</Text>
        {(Object.keys(REPORT_SECTIONS) as ReportSectionKey[]).map((key) => (
          <View key={key} style={common.between}>
            <Text style={[common.label, { flex: 1 }]}>{REPORT_SECTIONS[key]}</Text>
            <Switch
              accessibilityLabel={`Include ${REPORT_SECTIONS[key]} in PDF`}
              value={options.sections[key]}
              onValueChange={(include) =>
                setOptions({ ...options, sections: { ...options.sections, [key]: include } })
              }
              trackColor={{ false: colors.line, true: colors.plum }}
              thumbColor={colors.switchThumb}
            />
          </View>
        ))}
        <Text style={common.small}>
          Notes start off. Medication notes need both Notes and the relevant schedule/dose section.
          Other free-text labels, names, and product descriptions can still contain sensitive
          details. Mood & mind uses that category’s labels; custom labels are in Symptoms.
        </Text>
      </View>
      <View style={[common.card, { gap: 16 }]}>
        <Text style={common.heading}>Optional sexual-health details</Text>
        <Text style={common.body}>
          Each field starts off for every new report. Excluded fields and dates containing only
          excluded information do not appear. Symptom labels and any selected notes are not
          automatically redacted.
        </Text>
        {SEXUAL_HEALTH_FIELDS.map((key) => (
          <View key={key} style={common.between}>
            <Text style={[common.label, { flex: 1 }]}>{SEXUAL_HEALTH_LABELS[key]}</Text>
            <Switch
              accessibilityLabel={`Include ${SEXUAL_HEALTH_LABELS[key]} in PDF`}
              value={options.sexualHealth[key]}
              onValueChange={(include) =>
                setOptions({
                  ...options,
                  sexualHealth: { ...options.sexualHealth, [key]: include },
                })
              }
              trackColor={{ false: colors.line, true: colors.plum }}
              thumbColor={colors.switchThumb}
            />
          </View>
        ))}
      </View>
      <Text style={common.small}>
        Reports use recorded data only. Lab results and clinical discussion prompts will be added
        with those later features. Some scripts and emoji are not supported in PDF yet; an
        unsupported character stops export without changing your journal.
      </Text>
      {feedback}
      <Button label="Preview doctor summary" icon={FileText} onPress={preview} />
    </View>
  );
}
