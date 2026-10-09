// Labels are stored in existing journals. Keep old labels stable when expanding the catalog.
export const SYMPTOM_GROUPS = {
  'Body & cycle': [
    'Cramps',
    'Bloating',
    'Headache',
    'Breast tenderness',
    'Fatigue',
    'Back pain',
    'Nausea',
    'Migraine',
    'Migraine with aura',
    'Migraine without aura',
    'Pelvic pressure',
    'Diarrhea',
    'Constipation',
    'Acne',
    'Oily skin',
    'Dry skin',
    'Cravings',
    'Appetite changes',
    'Ovulation pain',
    'Dizziness',
    'Leg pain',
    'Hip pain',
    'Swelling / water retention',
    'Discharge changes',
    'High libido',
    'Low libido',
    'Insomnia',
    'Feeling hot',
    'Feeling cold',
  ],
  'Mood & mind': [
    'Mood swings',
    'Irritability',
    'Rage',
    'Anxiety',
    'Low mood',
    'Crying spells',
    'Overwhelm',
    'Brain fog',
    'Trouble concentrating',
    'Word-finding trouble',
    'Forgetfulness',
    'Low motivation',
    'Social withdrawal',
    'Emotional sensitivity',
    'Restlessness',
  ],
  Perimenopause: [
    'Hot flashes',
    'Night sweats',
    'Sleep disruption',
    'Waking early',
    'Vaginal dryness',
    'Painful sex',
    'Urinary urgency',
    'Frequent urination',
    'Urinary leaking',
    'Recurrent UTIs',
    'Irregular periods',
    'Skipped periods',
    'Heavier periods',
    'Longer periods',
    'Flooding',
    'Spotting',
    'Heart palpitations',
    'Joint aches',
    'Muscle aches',
    'Leg cramps',
    'Midsection weight gain',
    'Hair thinning',
    'Increased anxiety',
    'Depression',
  ],
  'More symptoms': [
    'Itchy ears',
    'Itchy skin',
    'Itchy scalp',
    'Crawling / bugs-on-skin sensation',
    'Tingling',
    'Electric-shock sensations',
    'Numb or tingling hands and feet',
    'Burning mouth',
    'Metallic or changed taste',
    'Dry mouth',
    'Dry eyes',
    'Gum bleeding',
    'Gum sensitivity',
    'Ringing in ears',
    'Vertigo',
    'Body odor changes',
    'Brittle nails',
    'Hair changes',
    'Hair texture changes',
    'New facial hair',
    'New allergies',
    'Hives',
    'New food sensitivities',
    'Restless legs',
    'Frozen shoulder',
    'Tendon pain',
    'Heel pain',
    'Acid reflux',
    'Sound sensitivity',
    'Smell sensitivity',
    'Cold sweats',
  ],
} as const;

export type SymptomGroup = keyof typeof SYMPTOM_GROUPS;
export type SymptomCategory = SymptomGroup | 'Your symptoms';
export type SymptomFilter = SymptomCategory | 'All';
export const MAX_DAILY_SYMPTOMS = 200;
export const MAX_CUSTOM_SYMPTOMS = 100;
export const QUICK_SYMPTOMS = ['Cramps', 'Bloating', 'Headache', 'Fatigue', 'Anxiety', 'Low mood'];

const searchTerms: Record<string, string> = {
  'Back pain': 'lower back backache',
  'Waking early': 'early morning hours waking sleep',
  'Frequent urination': 'urinary frequency bladder',
  'Urinary leaking': 'incontinence bladder',
  'Recurrent UTIs': 'urinary tract infections',
  'Skipped periods': 'missed period cycle',
  'Longer periods': 'prolonged bleeding',
  'Crawling / bugs-on-skin sensation': 'formication crawling skin',
  'Ringing in ears': 'tinnitus',
  'Hair thinning': 'hair loss',
  'Acid reflux': 'heartburn',
};

export function symptomIdentity(label: string): string {
  return label.trim().toLowerCase();
}

export function symptomSelected(selected: readonly string[], label: string): boolean {
  return selected.some((value) => symptomIdentity(value) === symptomIdentity(label));
}

export function toggleSymptom(selected: readonly string[], label: string): string[] {
  if (symptomSelected(selected, label))
    return selected.filter((value) => symptomIdentity(value) !== symptomIdentity(label));
  if (selected.length >= MAX_DAILY_SYMPTOMS)
    throw new Error(`You can log up to ${MAX_DAILY_SYMPTOMS} symptoms on one day.`);
  return [...selected, label];
}

export function validateCustomSymptom(name: string, custom: readonly string[]): string {
  const label = name.trim();
  if (!label) throw new Error('Give your symptom a name.');
  if (label.length > 60) throw new Error('Use 60 characters or fewer.');
  if (symptomSelected([...Object.values(SYMPTOM_GROUPS).flat(), ...custom], label))
    throw new Error('That symptom is already available. Search for it in the symptom browser.');
  if (custom.length >= MAX_CUSTOM_SYMPTOMS)
    throw new Error(`You can add up to ${MAX_CUSTOM_SYMPTOMS} custom symptoms.`);
  return label;
}

export function symptomSections(
  custom: readonly string[],
  showPerimenopause: boolean,
  filter: SymptomFilter = 'All',
  query = '',
): Array<{ category: SymptomCategory; labels: string[] }> {
  // Existing custom labels take precedence over new catalog matches, without rewriting records.
  const customNames = new Set(custom.map(symptomIdentity));
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const sections: Array<{ category: SymptomCategory; labels: string[] }> = (
    Object.keys(SYMPTOM_GROUPS) as SymptomGroup[]
  )
    .filter((category) => showPerimenopause || category !== 'Perimenopause')
    .map((category) => ({
      category,
      labels: SYMPTOM_GROUPS[category].filter((label) => !customNames.has(symptomIdentity(label))),
    }));
  sections.push({ category: 'Your symptoms', labels: [...custom] });
  const seen = new Set<string>();
  return sections
    .filter(({ category }) => filter === 'All' || category === filter)
    .map(({ category, labels }) => ({
      category,
      labels: labels.filter((label) => {
        const identity = symptomIdentity(label);
        if (seen.has(identity)) return false;
        seen.add(identity);
        const searchable = `${identity} ${searchTerms[label] ?? ''}`;
        return terms.every((term) => searchable.includes(term));
      }),
    }))
    .filter(({ labels }) => labels.length > 0);
}
