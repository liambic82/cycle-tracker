# Cycle education and prediction boundaries

## Preview 0.11.0 scope

This implements the educational portion of milestone 5 and source screenshot 9 / comment `AAACIGIsKos`. The selected day's context shows only its recorded cycle-day count, elapsed days from the last explicit start, and recorded flow. It always leaves personal phase undetermined. Future dates receive no projected day count, even when a backup contains future entries. The daily-entry header now uses that same future-date boundary.

Nine manually browsable topics cover cycle basics, menstruation, before ovulation, ovulation, after ovulation, mood/sleep, hormonal medicines, perimenopause, and observing personal patterns. The topic order does not depend on cycle day, symptoms, medication names, or sexual-health records. General descriptions of estrogen/progesterone changes do not appear as personal hormone readings. No positive/negative personality, productivity, diet, or exercise prescription is assigned to a phase.

The existing perimenopause-visibility preference also hides the dedicated education topic. It does not remove logs or erase references to menopause from other relevant topics, such as medication information. Browsing and returning to the calendar/editor never writes records or viewing history. Journal content remains format 4, and education is excluded from health-data exports.

## Source check — October 9, 2026

The app bundles original, brief paraphrases and static links to the following public health sources. The date records a developer source check, **not independent clinical approval**. Some source pages show a next-review date that has passed; their inclusion must be reassessed during pre-release clinical/editorial review. Opening a source requires an internet connection and uses a fixed URL with no journal values or query parameters. The external website has its own data practices.

| Topic                                       | Source                                                                                                                                                                                                                     | Basis used                                                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Cycle basics, ovulation, observing patterns | [Office on Women’s Health: Your menstrual cycle](https://womenshealth.gov/menstrual-cycle/your-menstrual-cycle)                                                                                                            | Counting from period start, variation, ovulation and life-stage context, value of symptom records.                       |
| Menstruation                                | [NICHD: About menstruation](https://www.nichd.nih.gov/health/topics/menstruation/conditioninfo)                                                                                                                            | Uterine lining shedding and hormonal context.                                                                            |
| Before/after ovulation                      | [NHS: Periods and fertility in the menstrual cycle](https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/)                                                                                               | General estrogen/progesterone roles. No fixed ovulation day or personal hormone curve is adopted.                        |
| Mood, sleep, and diary use                  | [NHS: PMS](https://www.nhs.uk/conditions/pre-menstrual-syndrome/)                                                                                                                                                          | Symptoms and month-to-month variation, uncertain cause, diary use, seeking help for daily-life impact.                   |
| Hormonal medicines                          | [NHS: Combined pill](https://www.nhs.uk/contraception/methods-of-contraception/combined-pill/what-is-it/), [NHS: HRT](https://www.nhs.uk/medicines/hormone-replacement-therapy-hrt/about-hormone-replacement-therapy-hrt/) | Examples of different treatment mechanisms; no regimen advice or automatic medication classification.                    |
| Perimenopause                               | [NHS: Menopause and perimenopause symptoms](https://www.nhs.uk/conditions/menopause-and-perimenopause/symptoms/)                                                                                                           | Possible changes in bleeding, sleep, mood, and concentration, with individual variation and a route to clinical support. |

The UI's unknown-phase rule and contraception limitation are product boundaries, not a claim that these sources validate an algorithm. No prediction algorithm ships in 0.11.0. Clinical alerts, diagnosis, treatment recommendations, pregnancy detection, and fertile/safe-day calculations are absent.

## Next prediction work

Preview 0.12.0 now provides an explicitly experimental period-start calculation, separate from this educational library. Its session controls, fixed method, product limits, earlier-entry checks, and synthetic comparison results are in [period estimates](period-estimates.md). No general-release accuracy or calibrated interval is claimed. The following criteria continue to govern prediction development:

1. Specify the estimation method, minimum completed history, recency window, and treatment of missing logs, unusual intervals, and irregular cycles. Label any thresholds as product rules unless clinically supported. Do not silently delete unusual records.
2. Provide explicit user control and relevant context for hormonal treatment, pregnancy/postpartum/breastfeeding, and changing cycles. Medication names alone cannot establish that context. Define when the result stays unknown.
3. Compare a transparent baseline with alternatives using chronological holdout testing. Publish error and coverage results, including irregular-history cases. A statistical interval must not be labeled a confidence range without calibration evidence.
4. Keep estimated periods visually and semantically separate from logged bleeding. An estimate must never create an entry, infer a missed period, or silently roll forward after its window passes.
5. Treat ovulation/phase estimation, measured lab overlays, and clinical notification criteria as further work with their own evidence and validation. Period-start prediction does not confirm ovulation or provide contraception.

Release 1.0 still requires a separate scope/readiness decision. This sequence does not defer the appearance work indefinitely: themes/backgrounds and beautification remain explicit later roadmap items.
