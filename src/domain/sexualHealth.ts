export const INTENSITIES = ['gentle', 'moderate', 'intense'] as const;
export const LIBIDO_LEVELS = ['none', 'low', 'moderate', 'high'] as const;
export interface SexualHealth {
  activity: boolean | null;
  intensity: (typeof INTENSITIES)[number] | null;
  orgasm: boolean | null;
  libido: (typeof LIBIDO_LEVELS)[number] | null;
}
export const SEXUAL_HEALTH_FIELDS = ['activity', 'intensity', 'orgasm', 'libido'] as const;
export type SexualHealthField = (typeof SEXUAL_HEALTH_FIELDS)[number];
export const SEXUAL_HEALTH_LABELS: Record<SexualHealthField, string> = {
  activity: 'Sexual activity',
  intensity: 'Activity intensity',
  orgasm: 'Orgasm',
  libido: 'Libido',
};
export type SexualHealthExport = Record<SexualHealthField, boolean>;
export function emptySexualHealth(): SexualHealth {
  return { activity: null, intensity: null, orgasm: null, libido: null };
}
export function emptySexualHealthExport(): SexualHealthExport {
  return { activity: false, intensity: false, orgasm: false, libido: false };
}
export function hasSexualHealth(value: SexualHealth): boolean {
  return SEXUAL_HEALTH_FIELDS.some((field) => value[field] !== null);
}
export function parseSexualHealth(value: unknown): SexualHealth {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('This journal contains invalid sexual-health observations.');
  const item = value as Record<string, unknown>;
  if (
    (item.activity !== null && typeof item.activity !== 'boolean') ||
    (item.orgasm !== null && typeof item.orgasm !== 'boolean') ||
    (item.intensity !== null &&
      !INTENSITIES.includes(item.intensity as SexualHealth['intensity'] & string)) ||
    (item.libido !== null &&
      !LIBIDO_LEVELS.includes(item.libido as SexualHealth['libido'] & string))
  )
    throw new Error('This journal contains invalid sexual-health observations.');
  return {
    activity: item.activity as SexualHealth['activity'],
    intensity: item.intensity as SexualHealth['intensity'],
    orgasm: item.orgasm as SexualHealth['orgasm'],
    libido: item.libido as SexualHealth['libido'],
  };
}
export function sexualHealthLabel(value: SexualHealth[SexualHealthField]): string {
  return value === null
    ? ''
    : typeof value === 'boolean'
      ? value
        ? 'Yes'
        : 'No'
      : value[0]!.toUpperCase() + value.slice(1);
}
