import { addDays, daysBetween, validDay, type Day } from './dates.ts';
import { history, type Journal } from './journal.ts';
import { flowTimeline, statistics } from './history.ts';
import { describeProduct, orderedProducts } from './flowDetails.ts';
import { describeDose, describeSchedule } from './medications.ts';
import { SYMPTOM_GROUPS } from './symptoms.ts';
import { symptomSeverity } from './symptomSeverity.ts';
import { describeSleep } from './sleep.ts';
import {
  emptySexualHealthExport,
  sexualHealthLabel,
  SEXUAL_HEALTH_FIELDS,
  SEXUAL_HEALTH_LABELS,
  type SexualHealthExport,
} from './sexualHealth.ts';

export const REPORT_SECTIONS = {
  cycles: 'Cycle and bleeding spans',
  flow: 'Flow and bleeding observations',
  products: 'Period products',
  symptoms: 'Symptoms and severity',
  moods: 'Mood and mind',
  sleep: 'Sleep',
  medications: 'Medication schedules',
  doses: 'Recorded doses',
  notes: 'Journal and medication notes',
} as const;
export type ReportSectionKey = keyof typeof REPORT_SECTIONS;
export type ReportOptions = {
  from: Day;
  through: Day;
  sections: Record<ReportSectionKey, boolean>;
  sexualHealth: SexualHealthExport;
};
export type ReportBlock = { heading: string; paragraphs: string[] };
export type ReportSection = { title: string; explanation: string; blocks: ReportBlock[] };
export type DoctorReport = {
  from: Day;
  through: Day;
  generatedOn: Day;
  sample: boolean;
  included: string[];
  sections: ReportSection[];
};
export const MAX_REPORT_CHARACTERS = 200000;
export function defaultReportOptions(today: Day): ReportOptions {
  return {
    from: addDays(today, -89),
    through: today,
    sections: {
      cycles: true,
      flow: true,
      products: true,
      symptoms: true,
      moods: true,
      sleep: true,
      medications: true,
      doses: true,
      notes: false,
    },
    sexualHealth: emptySexualHealthExport(),
  };
}
function statsText(label: string, values: Array<number | null>): string {
  const stats = statistics(values);
  return stats.count
    ? `${label}: ${stats.count} complete record(s); average ${stats.average} days; shortest ${stats.shortest}; longest ${stats.longest}.`
    : `${label}: not established from the selected records.`;
}
const yesNo = (value: boolean) => (value ? 'Yes' : 'No');
const capitalize = (value: string) => value[0]!.toUpperCase() + value.slice(1);

// The same fully filtered snapshot drives the on-screen preview and PDF. No hidden data is retained.
export function createDoctorReport(
  journal: Journal,
  options: ReportOptions,
  today: Day,
  sample = false,
): DoctorReport {
  const { from, through } = options;
  if (!validDay(from) || !validDay(through))
    throw new Error('Enter real dates in YYYY-MM-DD format.');
  if (from > through) throw new Error('The start date must be on or before the end date.');
  if (through > today) throw new Error('Choose an end date no later than today.');
  if (daysBetween(from, through) >= 366) throw new Error('Choose up to 366 days per report.');
  const selected = (key: ReportSectionKey) => options.sections[key] === true;
  const sexual = SEXUAL_HEALTH_FIELDS.filter((key) => options.sexualHealth[key] === true);
  const included = (Object.keys(REPORT_SECTIONS) as ReportSectionKey[])
    .filter(selected)
    .map((key) => REPORT_SECTIONS[key] as string);
  included.push(...sexual.map((key) => SEXUAL_HEALTH_LABELS[key]));
  if (!included.length) throw new Error('Choose at least one section for your report.');
  const dates = Object.keys(journal.entries)
    .filter((date) => date >= from && date <= through)
    .sort();
  const filtered = {
    ...journal,
    entries: Object.fromEntries(dates.map((date) => [date, journal.entries[date]!])),
  };
  const sections: ReportSection[] = [];
  if (selected('cycles')) {
    const cycles = history(filtered, through);
    sections.push({
      title: REPORT_SECTIONS.cycles,
      explanation:
        'Only explicit period starts and ends within this date range are used. Cycle length is start-to-next-start. A bleeding span is start through recorded end, not proof of bleeding on every day. Incomplete spans stay unknown.',
      blocks: [
        {
          heading: 'Recorded statistics',
          paragraphs: [
            statsText(
              'Cycle length',
              cycles.map((cycle) => cycle.length),
            ),
            statsText(
              'Bleeding span',
              cycles.map((cycle) => cycle.duration),
            ),
          ],
        },
        ...cycles.map((cycle) => ({
          heading: `Period start ${cycle.start}`,
          paragraphs: [
            `Cycle length: ${cycle.length === null ? 'not established in this range' : `${cycle.length} days`}.`,
            `Recorded period end: ${cycle.end ?? 'not logged in this range'}. Bleeding span: ${cycle.duration === null ? 'unknown' : `${cycle.duration} days`}.`,
          ],
        })),
      ],
    });
  }
  if (selected('flow')) {
    const { counts, total } = flowTimeline(filtered, from, through);
    const countsText = `${total} calendar days: ${counts.bleeding} with bleeding recorded, ${counts.spotting} spotting, ${counts.none} explicitly no flow, and ${counts.unknown} without a flow record.`;
    const heavy = dates.filter(
      (date) => journal.entries[date]!.flowRecorded && journal.entries[date]!.flow === 'heavy',
    );
    const observed = (key: 'clots' | 'flooding') =>
      dates.filter((date) => journal.entries[date]![key] === true);
    sections.push({
      title: REPORT_SECTIONS.flow,
      explanation:
        'Observations are self-reported. A missing log does not mean no bleeding or no symptoms.',
      blocks: [
        {
          heading: 'At a glance',
          paragraphs: [
            countsText,
            `Heavy flow recorded: ${heavy.length} day(s). Clots noticed: ${observed('clots').length} day(s). Flooding noticed: ${observed('flooding').length} day(s).`,
          ],
        },
        ...dates.flatMap((date) => {
          const entry = journal.entries[date]!;
          if (!entry.flowRecorded && entry.clots === null && entry.flooding === null) return [];
          const details = [`Flow: ${entry.flowRecorded ? capitalize(entry.flow) : 'not logged'}.`];
          if (entry.clots !== null) details.push(`Clots noticed: ${yesNo(entry.clots)}.`);
          if (entry.flooding !== null) details.push(`Flooding noticed: ${yesNo(entry.flooding)}.`);
          return [{ heading: date, paragraphs: [details.join(' ')] }];
        }),
      ],
    });
  }
  const dailySection = (title: string, explanation: string, get: (date: Day) => string[]) => {
    sections.push({
      title,
      explanation,
      blocks: dates.flatMap((date) => {
        const paragraphs = get(date);
        return paragraphs.length ? [{ heading: date, paragraphs }] : [];
      }),
    });
  };
  if (selected('products'))
    dailySection(
      REPORT_SECTIONS.products,
      'Quantities and collected amounts are recorded values, not estimates of total blood loss. Product descriptions are included.',
      (date) => orderedProducts(journal.entries[date]!.productRecords).map(describeProduct),
    );
  const moodLabels = new Set<string>(SYMPTOM_GROUPS['Mood & mind']);
  for (const key of ['symptoms', 'moods'] as const)
    if (selected(key)) {
      dailySection(
        REPORT_SECTIONS[key],
        key === 'moods'
          ? 'Includes labels from the Mood & mind category and optional self-rated severity (0–10). Missing ratings stay unknown; 0 is an explicit None rating.'
          : 'Includes other selected symptom labels and custom labels, including any sexual-health wording in those labels. Optional self-rated severity uses 0–10. Missing ratings stay unknown; 0 is an explicit None rating.',
        (date) => {
          const entry = journal.entries[date]!;
          const labels = entry.symptoms.filter(
            (label) => moodLabels.has(label) === (key === 'moods'),
          );
          return labels.length
            ? [
                labels.join('; '),
                ...labels.flatMap((label) => {
                  const value = symptomSeverity(entry, label);
                  return value === null
                    ? []
                    : [`${label === 'Cramps' ? 'Cramp' : label} severity: ${value}/10.`];
                }),
              ]
            : [];
        },
      );
    }
  if (selected('sleep'))
    dailySection(
      REPORT_SECTIONS.sleep,
      'Self-reported main sleep, recorded on the day of waking, including daytime sleep. Duration, quality and wakings are independent optional observations. Missing values stay unknown; 0 is explicit. No sleep score or diagnosis is calculated.',
      (date) => describeSleep(journal.entries[date]!.sleep),
    );
  if (selected('medications')) {
    const blocks: ReportBlock[] = [];
    for (const medication of journal.medications)
      medication.plans.forEach((plan, index) => {
        const next = medication.plans[index + 1]?.startsOn;
        if (plan.startsOn > through || (next && next <= from)) return;
        const start = plan.startsOn < from ? from : plan.startsOn;
        const end = next && next <= through ? addDays(next, -1) : through;
        blocks.push({
          heading: `${plan.name} (${plan.kind})`,
          paragraphs: [
            `Plan effective from ${plan.startsOn}. Applies in this report: ${start} to ${end}.`,
            `Planned dose label: ${plan.dose}. ${describeSchedule(plan)}.`,
            ...(selected('notes') && plan.instructions
              ? [`Schedule note: ${plan.instructions}`]
              : []),
          ],
        });
      });
    sections.push({
      title: REPORT_SECTIONS.medications,
      explanation:
        'User-entered plans overlapping the selected dates, including plans already in effect at the start. Plans do not establish that a dose was taken. Future changes outside the range are excluded.',
      blocks,
    });
  }
  if (selected('doses'))
    dailySection(
      REPORT_SECTIONS.doses,
      'Grouped by journal date; actual taken date/time is shown separately. Taken late is user-marked. Missing records are not counted as missed doses, and no adherence percentage is calculated.',
      (date) =>
        journal.entries[date]!.doseRecords.map((dose) =>
          describeDose({ ...dose, note: selected('notes') ? dose.note : '' }),
        ),
    );
  if (selected('notes'))
    dailySection(
      'Journal notes',
      'Free text exactly as recorded; it may include sensitive details. Medication notes appear only when their corresponding schedule/dose section is selected.',
      (date) => (journal.entries[date]!.note ? [journal.entries[date]!.note] : []),
    );
  for (const key of sexual)
    dailySection(
      SEXUAL_HEALTH_LABELS[key],
      'Included by explicit choice for this report. Only logged values appear; an omitted date is unknown.',
      (date) =>
        journal.entries[date]!.sexualHealth[key] === null
          ? []
          : [sexualHealthLabel(journal.entries[date]!.sexualHealth[key])],
    );
  const report = { from, through, generatedOn: today, sample, included, sections };
  if (JSON.stringify(report).length > MAX_REPORT_CHARACTERS)
    throw new Error(
      'This report is too large. Choose a shorter date range or fewer sections. Nothing has been exported.',
    );
  return report;
}
