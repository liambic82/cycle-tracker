import { daysBetween, fromDay, validDay, type Day } from './dates.ts';
import { validTime } from './flowDetails.ts';

export const MEDICATION_KINDS = ['medication', 'supplement'] as const;
export const SCHEDULE_MODES = ['daily', 'weekdays', 'cycle', 'as-needed', 'paused'] as const;
export const MODE_LABELS = {
  daily: 'Every day',
  weekdays: 'Selected weekdays',
  cycle: 'Repeating on/off',
  'as-needed': 'As needed',
  paused: 'Paused',
};
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const STATUS_LABELS = { taken: 'Taken', skipped: 'Skipped', late: 'Taken late' };
export const MAX_MEDICATIONS = 100;
export const MAX_PLANS = 100;
export const MAX_DOSE_RECORDS = 200;
export interface MedicationPlan {
  id: string;
  startsOn: Day;
  name: string;
  kind: (typeof MEDICATION_KINDS)[number];
  dose: string;
  instructions: string;
  mode: (typeof SCHEDULE_MODES)[number];
  times: string[];
  weekdays: number[];
  onDays: number | null;
  offDays: number | null;
  offDose: string | null;
}
export interface Medication {
  id: string;
  plans: MedicationPlan[];
}
export interface DoseTarget {
  medicationId: string;
  planId: string;
  scheduledTime: string | null;
}
export interface DoseRecord extends DoseTarget {
  id: string;
  name: string;
  kind: MedicationPlan['kind'];
  plannedDose: string;
  phase: 'regular' | 'on' | 'off' | 'as-needed';
  status: keyof typeof STATUS_LABELS;
  actualDose: string;
  takenOn: Day | null;
  actualTime: string | null;
  note: string;
}
export type DoseInput = Pick<
  DoseRecord,
  'status' | 'actualDose' | 'takenOn' | 'actualTime' | 'note'
>;
export interface PlannedDose extends DoseTarget {
  plan: MedicationPlan;
  dose: string;
  phase: DoseRecord['phase'];
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function check(
  value: unknown,
  message = 'This medication record contains unsupported or invalid data.',
): asserts value {
  if (!value) throw new Error(message);
}
function text(value: unknown, limit: number, required = true): value is string {
  return typeof value === 'string' && value.length <= limit && (!required || !!value.trim());
}
function id(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
}
function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
export function parsePlan(value: unknown): MedicationPlan {
  check(object(value));
  check(id(value.id) && validDay(value.startsOn) && text(value.name, 80) && text(value.dose, 100));
  check(MEDICATION_KINDS.includes(value.kind as MedicationPlan['kind']));
  check(SCHEDULE_MODES.includes(value.mode as MedicationPlan['mode']));
  check(text(value.instructions, 500, false));
  const scheduled = value.mode !== 'as-needed' && value.mode !== 'paused';
  check(Array.isArray(value.times) && value.times.length <= 8 && value.times.every(validTime));
  check(
    new Set(value.times).size === value.times.length &&
      (scheduled ? value.times.length > 0 : value.times.length === 0),
  );
  check(Array.isArray(value.weekdays) && value.weekdays.every((day) => integer(day, 0, 6)));
  check(new Set(value.weekdays).size === value.weekdays.length);
  check(value.mode === 'weekdays' ? value.weekdays.length > 0 : value.weekdays.length === 0);
  check(
    value.mode === 'cycle'
      ? integer(value.onDays, 1, 366) &&
          integer(value.offDays, 1, 366) &&
          (value.offDose === null || text(value.offDose, 100))
      : value.onDays === null && value.offDays === null && value.offDose === null,
  );
  return {
    id: value.id,
    startsOn: value.startsOn,
    name: value.name,
    kind: value.kind as MedicationPlan['kind'],
    dose: value.dose,
    instructions: value.instructions,
    mode: value.mode as MedicationPlan['mode'],
    times: [...value.times].sort(),
    weekdays: [...value.weekdays].sort((a, b) => a - b),
    onDays: value.onDays as number | null,
    offDays: value.offDays as number | null,
    offDose: value.offDose as string | null,
  };
}
export function parseMedications(value: unknown): Medication[] {
  check(Array.isArray(value) && value.length <= MAX_MEDICATIONS);
  const ids = new Set<string>();
  const planIds = new Set<string>();
  return value.map((medication) => {
    check(object(medication) && id(medication.id) && !ids.has(medication.id));
    ids.add(medication.id);
    check(
      Array.isArray(medication.plans) &&
        medication.plans.length > 0 &&
        medication.plans.length <= MAX_PLANS,
    );
    const plans = medication.plans.map(parsePlan);
    plans.forEach((plan, index) => {
      check(!planIds.has(plan.id) && (!index || plans[index - 1]!.startsOn < plan.startsOn));
      planIds.add(plan.id);
    });
    return { id: medication.id, plans };
  });
}
export function planOn(medication: Medication, date: Day): MedicationPlan | undefined {
  for (let index = medication.plans.length - 1; index >= 0; index--) {
    if (medication.plans[index]!.startsOn <= date) return medication.plans[index];
  }
  return undefined;
}
export function dosesFor(medication: Medication, date: Day): PlannedDose[] {
  const plan = planOn(medication, date);
  if (!plan || plan.mode === 'paused') return [];
  if (plan.mode === 'weekdays' && !plan.weekdays.includes(fromDay(date).getDay())) return [];
  let phase: DoseRecord['phase'] = plan.mode === 'as-needed' ? 'as-needed' : 'regular';
  let dose = plan.dose;
  if (plan.mode === 'cycle') {
    const off = daysBetween(plan.startsOn, date) % (plan.onDays! + plan.offDays!) >= plan.onDays!;
    phase = off ? 'off' : 'on';
    if (off && plan.offDose === null) return [];
    if (off) dose = plan.offDose!;
  }
  return (plan.mode === 'as-needed' ? [null] : plan.times).map((scheduledTime) => ({
    medicationId: medication.id,
    planId: plan.id,
    scheduledTime,
    plan,
    dose,
    phase,
  }));
}
export function plannedDoses(medications: Medication[], date: Day): PlannedDose[] {
  return medications
    .flatMap((medication) => dosesFor(medication, date))
    .sort(
      (a, b) =>
        (a.scheduledTime ?? '99:99').localeCompare(b.scheduledTime ?? '99:99') ||
        a.plan.name.localeCompare(b.plan.name),
    );
}
export function sameDose(a: DoseTarget, b: DoseTarget): boolean {
  return (
    a.medicationId === b.medicationId &&
    a.planId === b.planId &&
    a.scheduledTime === b.scheduledTime
  );
}
export function parseDoseRecords(value: unknown): DoseRecord[] {
  check(Array.isArray(value) && value.length <= MAX_DOSE_RECORDS);
  const ids = new Set<string>();
  const slots = new Set<string>();
  return value.map((dose) => {
    check(object(dose) && id(dose.id) && !ids.has(dose.id));
    ids.add(dose.id);
    check(id(dose.medicationId) && id(dose.planId));
    check(dose.scheduledTime === null || validTime(dose.scheduledTime));
    check(
      text(dose.name, 80) &&
        MEDICATION_KINDS.includes(dose.kind as MedicationPlan['kind']) &&
        text(dose.plannedDose, 100),
    );
    check(['regular', 'on', 'off', 'as-needed'].includes(dose.phase as string));
    check(['taken', 'skipped', 'late'].includes(dose.status as string));
    check(
      dose.phase === 'as-needed'
        ? dose.scheduledTime === null && dose.status === 'taken'
        : dose.scheduledTime !== null,
    );
    check(text(dose.note, 500, false));
    check(
      dose.status === 'skipped'
        ? dose.actualDose === '' && dose.takenOn === null && dose.actualTime === null
        : text(dose.actualDose, 100) &&
            validDay(dose.takenOn) &&
            (dose.actualTime === null || validTime(dose.actualTime)),
    );
    if (dose.scheduledTime !== null) {
      const slot = `${dose.medicationId}/${dose.scheduledTime}`;
      check(
        !slots.has(slot),
        'This scheduled dose already has a record. Edit the existing record instead.',
      );
      slots.add(slot);
    }
    return {
      id: dose.id,
      medicationId: dose.medicationId,
      planId: dose.planId,
      scheduledTime: dose.scheduledTime as string | null,
      name: dose.name,
      kind: dose.kind as MedicationPlan['kind'],
      plannedDose: dose.plannedDose,
      phase: dose.phase as DoseRecord['phase'],
      status: dose.status as DoseRecord['status'],
      actualDose: dose.actualDose as string,
      takenOn: dose.takenOn as Day | null,
      actualTime: dose.actualTime as string | null,
      note: dose.note,
    };
  });
}
export function describeSchedule(plan: MedicationPlan): string {
  if (plan.mode === 'paused' || plan.mode === 'as-needed') return MODE_LABELS[plan.mode];
  const frequency =
    plan.mode === 'weekdays'
      ? plan.weekdays.map((day) => WEEKDAYS[day]).join(', ')
      : plan.mode === 'cycle'
        ? `${plan.onDays} days on / ${plan.offDays} days off${plan.offDose ? ` (${plan.offDose} on off days)` : ' (no dose on off days)'}`
        : 'Every day';
  return `${frequency} · ${plan.times.join(', ')}`;
}
export function describeDose(dose: DoseRecord): string {
  return [
    dose.name,
    dose.kind,
    `Planned: ${dose.plannedDose}`,
    dose.scheduledTime
      ? `Scheduled ${dose.scheduledTime}${dose.phase === 'regular' ? '' : ` (${dose.phase} day)`}`
      : 'As needed',
    STATUS_LABELS[dose.status],
    ...(dose.status === 'skipped'
      ? []
      : [
          `Recorded amount: ${dose.actualDose}`,
          `Taken ${dose.takenOn} · ${dose.actualTime ?? 'time not logged'}`,
        ]),
    ...(dose.note ? [dose.note] : []),
  ].join(' · ');
}
export function medicationCSV(medications: Medication[]): string {
  const rows = [
    ['Name', 'Kind', 'Effective from', 'Through', 'Planned dose', 'Schedule', 'Instructions'],
  ];
  for (const medication of medications)
    medication.plans.forEach((plan, index) => {
      // An exclusive boundary avoids inventing a dose or duration on the transition date.
      rows.push([
        plan.name,
        plan.kind,
        plan.startsOn,
        medication.plans[index + 1] ? `Before ${medication.plans[index + 1]!.startsOn}` : '',
        plan.dose,
        describeSchedule(plan),
        plan.instructions,
      ]);
    });
  return rows
    .map((row) =>
      row
        .map(
          (value) =>
            `"${(/^[\s]*[=+@\-\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`,
        )
        .join(','),
    )
    .join('\r\n');
}
