import { validDay, type Day } from './dates.ts';
import type { Journal } from './journal.ts';
export const MEDICAL_KINDS = [
  'lab',
  'appointment',
  'question',
  'diagnosis',
  'procedure',
  'allergy',
] as const;
export type MedicalKind = (typeof MEDICAL_KINDS)[number];
export const MEDICAL_LABELS: Record<MedicalKind, string> = {
  lab: 'Bloodwork / lab result',
  appointment: 'Appointment',
  question: 'Doctor question',
  diagnosis: 'Diagnosis',
  procedure: 'Procedure',
  allergy: 'Allergy',
};
export const MAX_ATTACHMENT_BYTES = 512 * 1024;
export type MedicalAttachment = {
  id: string;
  name: string;
  mime: 'application/pdf' | 'image/jpeg' | 'image/png';
  hex: string;
};
export type MedicalRecord = {
  id: string;
  kind: MedicalKind;
  date: Day | null;
  time: string | null;
  title: string;
  detail: string;
  value: string;
  unit: string;
  reference: string;
  clinician: string;
  resolved: boolean;
  attachments: MedicalAttachment[];
};
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const short = (x: unknown, max: number) =>
  typeof x === 'string' && x.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x);
const id = (x: unknown): x is string => typeof x === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(x);
export function parseAttachment(v: unknown): MedicalAttachment {
  if (
    !object(v) ||
    !id(v.id) ||
    !short(v.name, 160) ||
    !(v.name as string).trim() ||
    typeof v.mime !== 'string' ||
    !['application/pdf', 'image/jpeg', 'image/png'].includes(v.mime) ||
    typeof v.hex !== 'string' ||
    v.hex.length < 16 ||
    v.hex.length > MAX_ATTACHMENT_BYTES * 2 ||
    !/^([0-9a-f]{2})+$/.test(v.hex)
  )
    throw new Error('Use a PDF, JPEG or PNG attachment up to 512 KiB.');
  const prefix =
    v.mime === 'application/pdf'
      ? '255044462d'
      : v.mime === 'image/jpeg'
        ? 'ffd8'
        : '89504e470d0a1a0a';
  if (!v.hex.startsWith(prefix))
    throw new Error('The attachment contents do not match its file type.');
  return {
    id: v.id,
    name: v.name as string,
    mime: v.mime as MedicalAttachment['mime'],
    hex: v.hex,
  };
}
export function emptyMedicalRecord(
  recordId: string,
  kind: MedicalKind,
  date: Day | null,
): MedicalRecord {
  return {
    id: recordId,
    kind,
    date,
    time: null,
    title: '',
    detail: '',
    value: '',
    unit: '',
    reference: '',
    clinician: '',
    resolved: false,
    attachments: [],
  };
}
export function parseMedicalRecord(v: unknown): MedicalRecord {
  if (
    !object(v) ||
    !id(v.id) ||
    !(MEDICAL_KINDS as readonly unknown[]).includes(v.kind) ||
    !(v.date === null || validDay(v.date)) ||
    !(
      v.time === null ||
      (typeof v.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.time))
    ) ||
    !short(v.title, 160) ||
    !(v.title as string).trim() ||
    !short(v.detail, 4000) ||
    !short(v.value, 100) ||
    !short(v.unit, 80) ||
    !short(v.reference, 200) ||
    !short(v.clinician, 160) ||
    typeof v.resolved !== 'boolean' ||
    !Array.isArray(v.attachments) ||
    v.attachments.length > 2
  )
    throw new Error('Check the medical record title, dates and field lengths.');
  if (v.kind === 'lab' && (!v.date || !(v.value as string).trim()))
    throw new Error(
      'A lab record needs its draw date and a result. Copy the result and units from the lab.',
    );
  if (v.kind === 'appointment' && !v.date) throw new Error('An appointment needs a date.');
  if (v.kind !== 'lab' && (v.value !== '' || v.unit !== '' || v.reference !== ''))
    throw new Error('Result fields belong to a lab record.');
  if (v.time !== null && (!v.date || v.kind !== 'appointment'))
    throw new Error('Only dated appointments have a time.');
  const attachments = v.attachments.map(parseAttachment);
  if (new Set(attachments.map((x) => x.id)).size !== attachments.length)
    throw new Error('Attachment identities must be unique.');
  return {
    id: v.id,
    kind: v.kind as MedicalKind,
    date: v.date as Day | null,
    time: v.time as string | null,
    title: (v.title as string).trim(),
    detail: v.detail as string,
    value: v.value as string,
    unit: v.unit as string,
    reference: v.reference as string,
    clinician: v.clinician as string,
    resolved: v.resolved,
    attachments,
  };
}
export function parseMedicalRecords(v: unknown): MedicalRecord[] {
  if (!Array.isArray(v) || v.length > 1000)
    throw new Error('Keep up to 1,000 medical records in this preview.');
  const result = v.map(parseMedicalRecord);
  if (new Set(result.map((x) => x.id)).size !== result.length)
    throw new Error('Medical record identities must be unique.');
  return result;
}
export function checkedJournalSize(journal: Journal): Journal {
  if (new TextEncoder().encode(JSON.stringify(journal)).length > 4 * 1024 * 1024 - 512)
    throw new Error(
      'This would exceed the preview journal size limit. Save a backup and remove unwanted attachments before retrying. Nothing was applied.',
    );
  return journal;
}
export function saveMedicalRecord(journal: Journal, value: MedicalRecord, today: Day): Journal {
  const record = parseMedicalRecord(value);
  if (record.date && record.date > today && !['appointment', 'question'].includes(record.kind))
    throw new Error('Use today or an earlier date for a recorded medical event.');
  const list = journal.medicalRecords.filter((x) => x.id !== record.id);
  return checkedJournalSize({ ...journal, medicalRecords: parseMedicalRecords([...list, record]) });
}
export function describeMedicalRecord(x: MedicalRecord, notes = false) {
  return [
    `${MEDICAL_LABELS[x.kind]}: ${x.title}.`,
    ...(x.time ? [`Time: ${x.time} (entered local time).`] : []),
    ...(x.kind === 'lab'
      ? [
          `Result: ${x.value}${x.unit ? ` ${x.unit}` : ''}. Lab-provided reference: ${x.reference || 'not entered'}.`,
        ]
      : []),
    ...(x.clinician ? [`Clinician / location: ${x.clinician}.`] : []),
    ...(x.kind === 'question' || x.kind === 'appointment'
      ? [`Marked complete: ${x.resolved ? 'Yes' : 'No'}.`]
      : []),
    ...(notes && x.detail ? [`Details: ${x.detail}`] : []),
    ...(x.attachments.length
      ? [`${x.attachments.length} attachment(s), contents excluded from this readable export.`]
      : []),
  ];
}
export function medicalCSV(records: MedicalRecord[]): string {
  const cell = (s: string) =>
    `"${(/^[\s]*[=+@\-\t\r]/.test(s) ? `'${s}` : s).replaceAll('"', '""')}"`;
  return [
    [
      'Date',
      'Kind',
      'Title',
      'Result',
      'Units',
      'Lab reference',
      'Time',
      'Clinician / location',
      'Completed',
      'Details',
      'Attachment count',
    ],
    ...records.map((x) => [
      x.date ?? '',
      x.kind,
      x.title,
      x.value,
      x.unit,
      x.reference,
      x.time ?? '',
      x.clinician,
      String(x.resolved),
      x.detail,
      String(x.attachments.length),
    ]),
  ]
    .map((r) => r.map(cell).join(','))
    .join('\r\n');
}
