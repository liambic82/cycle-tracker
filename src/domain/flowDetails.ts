export const PRODUCT_TYPES = [
  'pad',
  'tampon',
  'cup',
  'disc',
  'period-underwear',
  'liner',
  'other',
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
export const PRODUCT_LABELS: Record<ProductType, string> = {
  pad: 'Pad',
  tampon: 'Tampon',
  cup: 'Cup',
  disc: 'Disc',
  'period-underwear': 'Period underwear',
  liner: 'Liner',
  other: 'Other',
};
export const PRODUCT_ACTIONS = ['used', 'changed', 'emptied'] as const;
export type ProductAction = (typeof PRODUCT_ACTIONS)[number];
export const ACTION_LABELS: Record<ProductAction, string> = {
  used: 'Used',
  changed: 'Changed',
  emptied: 'Emptied',
};
export const MAX_PRODUCT_RECORDS = 100;
export interface ProductRecord {
  id: string;
  type: ProductType;
  action: ProductAction;
  quantity: number;
  time: string | null;
  detail: string;
  collectedMl: number | null;
}
export function canEmpty(type: ProductType): boolean {
  return type === 'cup' || type === 'disc';
}
export function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function parseProductRecords(value: unknown): ProductRecord[] {
  if (!Array.isArray(value) || value.length > MAX_PRODUCT_RECORDS)
    throw new Error('This product log contains unsupported or invalid data.');
  const ids = new Set<string>();
  return value.map((record) => {
    if (
      !object(record) ||
      typeof record.id !== 'string' ||
      !/^[A-Za-z0-9_-]{1,80}$/.test(record.id) ||
      ids.has(record.id) ||
      !PRODUCT_TYPES.includes(record.type as ProductType) ||
      !PRODUCT_ACTIONS.includes(record.action as ProductAction) ||
      (record.action === 'emptied' && !canEmpty(record.type as ProductType)) ||
      !Number.isInteger(record.quantity) ||
      Number(record.quantity) < 1 ||
      Number(record.quantity) > 100 ||
      (record.time !== null && !validTime(record.time)) ||
      typeof record.detail !== 'string' ||
      record.detail.length > 60 ||
      (record.collectedMl !== null &&
        (typeof record.collectedMl !== 'number' ||
          !Number.isFinite(record.collectedMl) ||
          record.collectedMl < 0 ||
          record.collectedMl > 1000 ||
          Number(record.collectedMl.toFixed(2)) !== record.collectedMl ||
          record.action !== 'emptied' ||
          !canEmpty(record.type as ProductType)))
    ) {
      throw new Error('This product record contains unsupported or invalid data.');
    }
    ids.add(record.id);
    return {
      id: record.id,
      type: record.type as ProductType,
      action: record.action as ProductAction,
      quantity: record.quantity as number,
      time: record.time as string | null,
      detail: record.detail,
      collectedMl: record.collectedMl as number | null,
    };
  });
}
export function productFromInput(input: {
  id: string;
  type: ProductType;
  action: ProductAction;
  quantity: string;
  time: string;
  detail: string;
  collectedMl: string;
}): ProductRecord {
  const quantity = input.quantity.trim();
  const time = input.time.trim();
  const amount = input.collectedMl.trim().replace(',', '.');
  if (!/^\d+$/.test(quantity) || Number(quantity) < 1 || Number(quantity) > 100)
    throw new Error('Use a whole quantity from 1 to 100.');
  if (time && !validTime(time))
    throw new Error('Use a 24-hour time such as 08:30, or leave it blank.');
  if (amount && (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) > 1000))
    throw new Error(
      'Use an amount from 0 to 1,000 mL, with up to two decimal places, or leave it blank.',
    );
  if (input.detail.trim().length > 60)
    throw new Error('Keep the product type or size to 60 characters.');
  return parseProductRecords([
    {
      ...input,
      quantity: Number(quantity),
      time: time || null,
      detail: input.detail.trim(),
      collectedMl: amount ? Number(amount) : null,
    },
  ])[0]!;
}
export function saveProductRecord(
  records: ProductRecord[],
  record: ProductRecord,
  editing: boolean,
): ProductRecord[] {
  const exists = records.some((item) => item.id === record.id);
  if (editing && !exists)
    throw new Error('This record is no longer available. Return to flow details.');
  if (!editing && exists) throw new Error('This record is already in the log.');
  if (!editing && records.length >= MAX_PRODUCT_RECORDS)
    throw new Error(
      `This day already has ${MAX_PRODUCT_RECORDS} product records. Edit an existing record instead.`,
    );
  return parseProductRecords(
    editing ? records.map((item) => (item.id === record.id ? record : item)) : [...records, record],
  );
}
export function orderedProducts(records: ProductRecord[]): ProductRecord[] {
  // Times are local to the entry's calendar day; unknown times stay unknown and sort last.
  return [...records].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
}
export function describeProduct(record: ProductRecord): string {
  return [
    record.time ?? 'Time not logged',
    PRODUCT_LABELS[record.type],
    ACTION_LABELS[record.action],
    `Quantity: ${record.quantity}`,
    record.detail || null,
    record.collectedMl === null ? null : `Collected: ${record.collectedMl} mL`,
  ]
    .filter((part) => part !== null)
    .join(' · ');
}
