# Prediction benchmark and dataset intake

Research update: October 11, 2026. Extends the [initial evidence review and evaluation protocol](prediction-research-2026-10-11.md). Production preview remains **0.18.0**, with the existing experimental median policy.

## Completed and remaining

The local benchmark now accepts a strict normalized history format, assigns whole participants to stable development/calibration/test groups, and compares the production policy with a fixed recency-weighted candidate on the same scored cases. Automated examples are fictional. A separate intake audit has verified and inspected an original, openly licensed dataset with 198 menstrual histories. **No external forecast has been scored, no model has been fitted, and no clinical accuracy has been established.**

The source-specific forecast adapter remains pending. Missing context, follow-up and logging-time information prevent treating this dataset as a replay of every production eligibility rule. A future conditional, dates-only comparison must state its assumptions separately from full-policy validation. The perimenopause evidence gap remains open.

## Source decision and provenance

Use **Förster, Charlotte, and Mitesser, Oliver (2025), dataset v1, DOI 10.5281/zenodo.15598359** as the next dates-only research candidate. The [original Zenodo deposit](https://zenodo.org/records/15598359) identifies the creators, associated manuscript and downloadable file. Its [official metadata](https://zenodo.org/api/records/15598359) reports open access and `cc-by-4.0` for the dataset itself. Preserve attribution, the [CC BY 4.0 license link](https://creativecommons.org/licenses/by/4.0/), and a description of transformations with any derived results. The local original is unchanged; this repository contains audit code and aggregate findings, not participant records.

The associated [Helfrich-Förster et al. study, Science Advances (2025)](https://doi.org/10.1126/sciadv.adw4096), reviewed through the [institutional full-text copy](https://pure.amsterdamumc.nl/ws/portalfiles/portal/168280173/Synchronization-of-womens-menstruation-with-the-moon-has-decreased-but-remains-detectable-when-gravitational-pull-is-st.pdf), describes retrospective menstrual histories assembled from several sources, including paper and app records, and documents consent and ethics review. It links this deposit in its data-availability statement. Its lunar-synchronization analysis is **not a forecasting validation**; this project proposes using recorded starts, not adopting a lunar predictor. Cohort selection, long-record requirements and mixed recording eras limit transfer to current app users.

Other candidates assessed during this follow-up:

- [Marquette 2012](https://epublications.marquette.edu/data_nfp/7/): the original download returned HTTP 403 through both web and ordinary HTTP access. No participant file was obtained. Explicit commercial reuse scope and chronological suitability remain unresolved.
- [SWAN at NIA](https://agingresearchbiobank.nia.nih.gov/studies/swan/details): the repository lists monthly calendars for a subset, but explicitly prohibits commercial use. Do not assume that route covers development of this paid app. NIA also says its holdings cannot be linked to ICPSR data. [ICPSR access](https://www.swanstudy.org/swan-research/data-access/) is a separate route whose cycle-level suitability and terms remain unverified here.

No provider was contacted and no restricted-data agreement was accepted.

### Verified local source

| Field                           | Value                                                                   |
| ------------------------------- | ----------------------------------------------------------------------- |
| File                            | `menstruationdata.csv`, Zenodo record 15598359, v1                      |
| Retrieved                       | October 11, 2026                                                        |
| Size                            | 887,713 bytes                                                           |
| Repository MD5, matched locally | `1409abf2d80a62a26922ae62a487f5c9`                                      |
| Locally computed SHA-256        | `7712b11290d2d34384eaa3bca02739067a0dd6ddc8bd90c6fe91c545efffe28f`      |
| Encoding/structure              | UTF-8, unquoted semicolon-separated fields; event date `dd.MM.yyyy`     |
| Header                          | `Woman;Date;Birthday;Study;Country;Origin;BeforeBirth;AfterBirth;Birth` |

Run `pnpm research:audit-zenodo` with the unchanged file saved locally as `research/private-data/zenodo-15598359-menstruationdata.csv`. The command checks its size and both hashes before parsing. It prints aggregate information only. It does not download, normalize, deduplicate, forecast or write participant data. A changed deposit requires a new review; do not simply update the expected checksum to bypass a failure.

### Structural findings

These are our reproducible local counts, not the paper's rounded headline counts. “Menstrual” here means the source's `Birth=0` rows; it is a source categorization, not an independently verified clinical label.

| Intake measure                                          |         Result |
| ------------------------------------------------------- | -------------: |
| All event rows / identifiers                            |   15,686 / 199 |
| Birth rows / birth-only identifiers                     |         36 / 1 |
| Menstrual rows / participants                           |   15,650 / 198 |
| Distinct participant–menstrual-date pairs               |         15,646 |
| Menstrual rows per participant, min–max                 |         22–497 |
| Repeated date groups / excess rows                      |          4 / 4 |
| Repeated date groups with differing fields              |              0 |
| Descending within-person date transitions in file order |             19 |
| Menstrual rows flagged BeforeBirth / AfterBirth         |        36 / 32 |
| Menstrual rows by Study, old / new                      | 4,101 / 11,549 |

All event dates passed strict calendar validation; the three event flags contained only `0`/`1`. No duplicates were removed. File order cannot serve as chronology. An adapter may sort explicit dates and collapse the four exact duplicate rows under a recorded transformation rule, but must retain long observed intervals without inventing missing periods or silently deleting inconvenient outcomes.

`BeforeBirth` and `AfterBirth` need a documented interpretation before segmentation; their names do not establish when pregnancy was known to the participant or the app. Birthdays and source demographics are unnecessary for the first candidate and must stay out of normalized predictor inputs. The CSV does not supply the app's contemporaneous completeness/context answers, entry/correction timestamps, verified life-stage labels, or a full observation-coverage ledger. In particular, a long gap cannot automatically be classified as missed tracking, pregnancy, or a comparable physiological cycle. Missing information must not become `context=comparable, complete=true` by default.

## Normalized benchmark contract

The executable validator is [period-dataset.ts](../research/period-dataset.ts); a complete example is [the fictional fixture](../research/fixtures/period-history.synthetic.json). This is a developer research format, not an app import format.

- Root `protocol` is `period-history-v1`. Provenance includes a stable dataset ID, `synthetic`/`external` kind, HTTPS source and rights references, original source SHA-256 (required for external data), and `loggingAssumption=same-day-assumed`.
- Each stable pseudonymous participant ID owns one or more observation segments. All segments share that participant's relative day origin. Each segment supplies strictly increasing integer `startDays`, integer `observedThrough`, an explicit context, and a completeness boolean. Unknown context remains `unknown`; opt-in is assumed by the research harness, not measured.
- Segments must not overlap. Restart history after a **documented** unobserved interval; do not manufacture intervals across gaps. Conversely, an unusually long interval alone is not evidence that observation stopped. Segment boundaries and context changes need source-specific rules fixed before scoring.
- The final start has an unknown outcome. Follow-up after it affects forecast availability, never an invented target or zero-error score. At later issuance landmarks, cycles already ended and dates outside follow-up have separate counts.
- Bounds: 10,000 people, 100 segments per person, 1,024 starts per segment, 100,000 starts overall, relative days 0–36,500, and 8 MiB per CLI input. Unknown fields, duplicates, missing metadata and ambiguous numbers fail validation. Relative dates map to an arbitrary calendar origin for the policy; this does not anonymize a history.

External normalized inputs must remain within the ignored `research/private-data` directory, checked after resolving paths. Raw and normalized records are excluded from Git and formatting. This directory is not encrypted storage; use only an environment suitable for the source's terms. A supplied provenance hash is a declaration: the generic benchmark checks its format, whereas the source-specific intake audit actually checks the raw bytes. Aggregate output is not a guarantee against disclosure in small cohorts and should be reviewed before sharing.

## Fixed comparison and reproducibility

`sha256-participant-v1-60-20-20` hashes the protocol, fixed dataset ID and fixed participant ID into approximately 60% development, 20% calibration and 20% test. This is deterministic assignment, not exact balancing or deidentification. Never regenerate IDs to improve the split. Reordering rows, adding people and changing outcomes do not move an existing participant; every segment of one person stays together. Only the requested group's outcomes are evaluated.

Candidate `linear-weights-1-to-6-v1` uses the same latest intervals as the reference, with chronological weights 1 through n. It selects the smallest interval whose cumulative sorted weight reaches half the total. The choice was fixed before scoring any external forecasts. It is compared with median, rounded mean, last interval and fixed 28 on the **production reference policy's offered, observed folds**. This is not an evaluation of an alternative's own eligibility rules. It does not establish a winner.

```sh
pnpm research:benchmark research/fixtures/period-history.synthetic.json development 0
pnpm research:benchmark research/fixtures/period-history.synthetic.json calibration 0
pnpm research:benchmark research/fixtures/period-history.synthetic.json test 35
```

Windows can use `./scripts/pnpm.ps1 --config.verify-deps-before-run=false run` followed by the script name and arguments. Reports include the exact normalized-input hash, LF-normalized production-policy source hash, rule constants, split/candidate versions, availability, withheld reasons, observed/censored counts and matched-fold errors. Keep the repository revision with any saved report.

The eight-person fictional fixture produces 3/4/1 participants in development/calibration/test. At day 1, development offers 7/26 opportunities, scores 5, and gives median/weighted MAE 14.6/14.2 days; calibration offers 3/34, scores 2, and gives 0.5/1.0 days. Deliberate extreme examples drive those numbers. They exercise the pipeline and show that weighting is not uniformly better; they are **not accuracy estimates for real users or actual calibration**.

## Next research step

Freeze a source adapter and an explicitly conditional dates-only analysis plan before evaluating external forecasts. Account for exact duplicates, date ordering, birth-related ambiguity, observation gaps, source cohorts and unavailable context. Keep final test outcomes untouched while developing the method. Then extend reporting to participant-cluster uncertainty, error quantiles and prespecified subgroup checks; these required release analyses are not yet implemented. Independent clinical/editorial review and suitable intended-population evidence remain release gates.
