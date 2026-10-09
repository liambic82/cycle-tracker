import { validDay, type Day } from './dates.ts';
import { updateEntry, type Journal } from './journal.ts';
import {
  dosesFor,
  parseDoseRecords,
  parseMedications,
  sameDose,
  type DoseInput,
  type DoseRecord,
  type DoseTarget,
  type MedicationPlan,
} from './medications.ts';

export function saveMedicationPlan(
  journal: Journal,
  medicationId: string,
  plan: MedicationPlan,
  today: Day,
): Journal {
  const existing = journal.medications.find((medication) => medication.id === medicationId);
  const latest = existing?.plans.at(-1);
  if (latest) {
    if (!validDay(plan.startsOn) || plan.startsOn < today || plan.startsOn < latest.startsOn)
      throw new Error('Changes must start today or later, on or after the latest schedule starts.');
    const lastRecorded = Object.keys(journal.entries)
      .filter((date) =>
        journal.entries[date]!.doseRecords.some((record) => record.medicationId === medicationId),
      )
      .sort()
      .at(-1);
    if (lastRecorded && plan.startsOn <= lastRecorded)
      throw new Error(
        `Choose a date after ${lastRecorded} to preserve recorded doses. You can correct an individual dose in its daily log.`,
      );
  } else if (plan.mode === 'paused') throw new Error('Add an active schedule before pausing it.');
  const plans =
    latest?.startsOn === plan.startsOn ? existing!.plans.slice(0, -1) : (existing?.plans ?? []);
  const updated = { id: medicationId, plans: [...plans, plan] };
  const medications = parseMedications(
    existing
      ? journal.medications.map((med) => (med.id === medicationId ? updated : med))
      : [...journal.medications, updated],
  );
  return { ...journal, medications };
}
export function recordDose(
  journal: Journal,
  date: Day,
  today: Day,
  target: DoseTarget,
  id: string,
  input: DoseInput,
): Journal {
  if (!validDay(date) || date > today) throw new Error('Record doses for today or a past date.');
  const medication = journal.medications.find((med) => med.id === target.medicationId);
  const planned = medication && dosesFor(medication, date).find((dose) => sameDose(dose, target));
  if (!planned)
    throw new Error('This schedule changed. Return to the dose log and choose it again.');
  const record: DoseRecord = {
    id,
    medicationId: target.medicationId,
    planId: target.planId,
    scheduledTime: target.scheduledTime,
    name: planned.plan.name,
    kind: planned.plan.kind,
    plannedDose: planned.dose,
    phase: planned.phase,
    ...input,
  };
  checkTakenDate(record, today);
  return updateEntry(journal, date, {
    doseRecords: parseDoseRecords([...(journal.entries[date]?.doseRecords ?? []), record]),
  });
}
function checkTakenDate(record: DoseInput, today: Day) {
  if (record.takenOn !== null && (!validDay(record.takenOn) || record.takenOn > today))
    throw new Error('The date taken must be today or a past date.');
}
export function editDose(
  journal: Journal,
  date: Day,
  today: Day,
  id: string,
  input: DoseInput,
): Journal {
  const records = journal.entries[date]?.doseRecords ?? [];
  if (!records.some((record) => record.id === id))
    throw new Error('This dose record is no longer available.');
  checkTakenDate(input, today);
  return updateEntry(journal, date, {
    doseRecords: parseDoseRecords(
      records.map((record) => (record.id === id ? { ...record, ...input } : record)),
    ),
  });
}
export function removeDose(journal: Journal, date: Day, id: string): Journal {
  return updateEntry(journal, date, {
    doseRecords: (journal.entries[date]?.doseRecords ?? []).filter((record) => record.id !== id),
  });
}
export function restoreDose(journal: Journal, date: Day, removed: DoseRecord): Journal {
  return updateEntry(journal, date, {
    doseRecords: parseDoseRecords([...(journal.entries[date]?.doseRecords ?? []), { ...removed }]),
  });
}
