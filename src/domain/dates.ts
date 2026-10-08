export type Day = string;

export function toDay(date: Date): Day {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function fromDay(day: Day): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year!, month! - 1, date!, 12);
}

export function validDay(value: unknown): value is Day {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return value >= '1900-01-01' && value <= '2199-12-31' && toDay(fromDay(value)) === value;
}

// Calendar arithmetic uses UTC day numbers, so daylight-saving changes never add a day.
export function daysBetween(first: Day, last: Day): number {
  return Math.round(
    (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86400000,
  );
}

export function addDays(day: Day, amount: number): Day {
  const date = fromDay(day);
  date.setDate(date.getDate() + amount);
  return toDay(date);
}

export function monthKey(day: Day, offset = 0): Day {
  const date = fromDay(day);
  return toDay(new Date(date.getFullYear(), date.getMonth() + offset, 1, 12));
}

export function monthCells(month: Day): Array<Day | null> {
  const first = fromDay(monthKey(month));
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Array<Day | null> = Array.from({ length: first.getDay() }, () => null);
  for (let index = 0; index < count; index++) cells.push(addDays(toDay(first), index));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function formatDay(day: Day, options: Intl.DateTimeFormatOptions): string {
  return fromDay(day).toLocaleDateString('en-US', options);
}
