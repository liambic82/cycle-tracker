import { daysBetween, type Day } from './dates.ts';
import { starts, type Flow, type Journal } from './journal.ts';

export type DayContext = {
  date: Day;
  future: boolean;
  lastStart: Day | null;
  cycleDay: number | null;
  daysSinceStart: number | null;
  flow: Flow | 'unknown';
  phase: 'unknown';
};

// Observations only: symptoms, medications, and an elapsed day count cannot establish a phase.
export function dayContext(journal: Journal, date: Day, today: Day): DayContext {
  const future = date > today;
  const lastStart = future ? null : (starts(journal, date).at(-1) ?? null);
  const elapsed = lastStart ? daysBetween(lastStart, date) : null;
  const entry = future ? undefined : journal.entries[date];
  return {
    date,
    future,
    lastStart,
    cycleDay: elapsed === null ? null : elapsed + 1,
    daysSinceStart: elapsed,
    flow: entry?.flowRecorded ? entry.flow : 'unknown',
    phase: 'unknown',
  };
}

export const EDUCATION_SOURCES = {
  cycle: {
    publisher: 'Office on Women’s Health',
    title: 'Your menstrual cycle',
    url: 'https://womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
  },
  menstruation: {
    publisher: 'NICHD',
    title: 'About menstruation',
    url: 'https://www.nichd.nih.gov/health/topics/menstruation/conditioninfo',
  },
  phases: {
    publisher: 'NHS',
    title: 'Periods and fertility in the menstrual cycle',
    url: 'https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/',
  },
  pms: {
    publisher: 'NHS',
    title: 'PMS (premenstrual syndrome)',
    url: 'https://www.nhs.uk/conditions/pre-menstrual-syndrome/',
  },
  pill: {
    publisher: 'NHS',
    title: 'What is the combined pill?',
    url: 'https://www.nhs.uk/contraception/methods-of-contraception/combined-pill/what-is-it/',
  },
  hrt: {
    publisher: 'NHS',
    title: 'About hormone replacement therapy (HRT)',
    url: 'https://www.nhs.uk/medicines/hormone-replacement-therapy-hrt/about-hormone-replacement-therapy-hrt/',
  },
  perimenopause: {
    publisher: 'NHS',
    title: 'Symptoms of menopause and perimenopause',
    url: 'https://www.nhs.uk/conditions/menopause-and-perimenopause/symptoms/',
  },
} as const;

export const EDUCATION_CHECKED_ON = '2026-10-09';
export type EducationCard = {
  readonly id: string;
  readonly topic: string;
  readonly title: string;
  readonly body: string;
  readonly prompt: string;
  readonly sources: readonly (keyof typeof EDUCATION_SOURCES)[];
  readonly perimenopause?: boolean;
};

// Bundled general education, not selected or rewritten from a user's health records.
const CARDS: readonly EducationCard[] = [
  {
    id: 'cycle',
    topic: 'Cycle basics',
    title: 'A cycle is more than a number.',
    body: 'Cycle day 1 is the first day of a period. The next period starts a new cycle. Length can vary between people and from month to month; a 28-day example is not a schedule your body must follow.',
    prompt: 'Record a period start when it happens. An unlogged day stays unknown in your journal.',
    sources: ['cycle'],
  },
  {
    id: 'bleeding',
    topic: 'Menstruation',
    title: 'What a period records.',
    body: 'During menstruation, blood and tissue from the uterine lining leave the body. In an ovulatory cycle without pregnancy, falling hormone levels help trigger this shedding. A bleeding log alone does not tell us your hormone levels or whether ovulation occurred.',
    prompt:
      'You can record flow and how you feel separately. There is no need to fill in a symptom that you did not notice.',
    sources: ['menstruation'],
  },
  {
    id: 'before-ovulation',
    topic: 'Before ovulation',
    title: 'Estrogen and preparation.',
    body: 'In a typical ovulatory cycle, estrogen rises as an egg develops and the uterine lining thickens. This is general physiology, not a reading of your estrogen today. The calendar does not establish where you are in that process.',
    prompt: 'Notice your own energy and mood without expecting a particular kind of day.',
    sources: ['phases'],
  },
  {
    id: 'ovulation',
    topic: 'Ovulation',
    title: 'Timing is not confirmation.',
    body: 'Ovulation means an ovary releases an egg. Its timing varies, and it may not occur in every cycle. Pregnancy, breastfeeding, and the menopause transition can affect ovulation. A calendar count or a symptom alone does not confirm it.',
    prompt:
      'This app does not identify fertile or “safe” days and must not be used as contraception.',
    sources: ['cycle'],
  },
  {
    id: 'after-ovulation',
    topic: 'After ovulation',
    title: 'Progesterone has a role, too.',
    body: 'After ovulation, progesterone helps prepare the uterine lining for a possible pregnancy. If pregnancy does not occur, estrogen and progesterone fall before the next period. These changes are an educational description, not measured hormone levels or a personal phase assignment.',
    prompt: 'A long gap since a logged period does not prove that you are in this phase.',
    sources: ['phases'],
  },
  {
    id: 'mood-sleep',
    topic: 'Mood & sleep',
    title: 'Your experience can change.',
    body: 'Some people notice changes in mood, sleep, tiredness, or appetite before a period. Experiences can vary from month to month. Hormonal changes may contribute to PMS, but the cause is not fully understood. A symptom label in this app does not diagnose PMS or explain its cause.',
    prompt:
      'A symptom diary over at least two cycles can help a clinical conversation. If symptoms disrupt daily life, speak with a healthcare professional.',
    sources: ['pms'],
  },
  {
    id: 'medications',
    topic: 'Hormonal medicines',
    title: 'Treatment changes the context.',
    body: 'Hormonal treatments do not all work the same way. For example, the combined contraceptive pill prevents ovulation, while HRT supplies hormones to help with menopause symptoms. A natural-cycle illustration may not describe your experience on treatment. This app does not infer treatment effects from a medication name.',
    prompt:
      'Keep your prescribed plan and record changes you want to discuss with your prescriber. These cards do not recommend dose or schedule changes.',
    sources: ['pill', 'hrt'],
  },
  {
    id: 'perimenopause',
    topic: 'Perimenopause',
    title: 'Patterns may become less familiar.',
    body: 'During perimenopause, periods may become closer together or farther apart, and bleeding may become lighter or heavier. Sleep, mood, and concentration can also change. Experiences differ. These symptoms and a calendar gap do not establish a diagnosis of perimenopause or menopause.',
    prompt:
      'If changes concern you or you want support, discuss them with a healthcare professional. Your records can help describe what has changed.',
    sources: ['perimenopause'],
    perimenopause: true,
  },
  {
    id: 'patterns',
    topic: 'Your own patterns',
    title: 'Curiosity, without a verdict.',
    body: 'Tracking dates and symptoms can make changes easier to describe at an appointment, including when periods are irregular. Records do not need to fit a textbook cycle to be useful. A repeating pattern is something to discuss, not proof of a particular hormone level or diagnosis.',
    prompt:
      'A short note about what helped or what interrupted your day can be useful. Choose only the details you want in a doctor summary.',
    sources: ['cycle', 'pms'],
  },
];

export function educationCards(showPerimenopause: boolean): readonly EducationCard[] {
  return CARDS.filter((card) => showPerimenopause || !card.perimenopause);
}
