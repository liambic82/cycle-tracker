# Prepared records for controlled prediction comparisons

October 11, 2026. The original [Zenodo source assessed during intake](prediction-benchmark.md) has now been transformed into reproducible local comparison inputs. **15,646 distinct non-birth records from 198 participants are prepared. No external forecasts have been scored.** Preview 0.18.0 and the production prediction policy are unchanged.

## Reproducible preparation

Run:

```sh
pnpm research:prepare-zenodo
```

On this Windows workspace: `./scripts/pnpm.ps1 --config.verify-deps-before-run=false run research:prepare-zenodo`.

The command reads the original `research/private-data/zenodo-15598359-menstruationdata.csv`. An optional local source path must also resolve inside `research/private-data`. Both the published MD5 and previously reviewed SHA-256, plus the exact source size, are checked before parsing. No download or forecast is performed.

Output is `research/private-data/zenodo-15598359-prepared-v1/`:

| Files                                               | Purpose                                                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `development.json`, `calibration.json`, `test.json` | Separate participant groups in the strict `period-history-v1` format                                  |
| Corresponding `*-audit.json` files                  | Source cohort, relative birth-event dates and source flags; explicitly excluded from predictor inputs |
| `manifest.json`                                     | Source attribution/license, preparation rules, plan/code/file hashes and aggregate counts             |

The committed [preparation manifest](../research/manifests/zenodo-preparation-v1.json) contains only provenance, hashes and aggregate counts. Raw and transformed participant files remain ignored by Git and formatting. Output contains no source identifiers, birthdays, country/origin fields or absolute event dates. Stable public-source identifier hashes and relative histories **are not anonymous data**; neither the manifest nor local folder adds encryption.

All files are assembled before writing and published together by renaming a completed temporary directory. Reruns compare every expected file byte for byte. Existing output is never silently replaced; mismatched, altered or incomplete output fails. An interrupted write can leave an ignored temporary directory, which must not be treated as a completed bundle. A future transformation change needs a versioned preparation and manifest, preserving this baseline.

## Fixed transformations and retained uncertainty

1. Parse the verified deposit using its exact header, date and flag formats. General-purpose or differently formatted CSV is rejected.
2. Identify duplicate events by the original participant ID, event date and birth/non-birth type. Collapse only rows whose complete source content matches after line-ending normalization. Differences in any field, including unused demographic fields, cause an error. Four exact excess rows were removed from this source.
3. Exclude the 36 `Birth=1` events from the start sequence. One identifier has birth data only and supplies no start history, so it does not enter the cohort. The original file retains those records. Retained participants' birth events remain in the audit sidecars.
4. Sort each person's `Birth=0` dates and express them as whole days since that person's first retained date. Keep every distinct date and interval, including unusually long ones. These are source-classified recorded events, not independently verified physiological onsets. No gap is clipped, imputed, removed or labeled as a missed period.
5. Keep one unsegmented sequence per person. This does **not** establish continuous observation. Set `context=unknown`, `complete=false` (completeness not established) and `observedThrough=last recorded start`. There is no invented observation time after that date. The final next-start target is unknown.
6. Preserve `BeforeBirth`/`AfterBirth` flags and birth-event days only in audit sidecars. Their retrospective presence does not establish what was known at issuance. Source `old`/`new` membership is retained as an audit stratum, with mixed membership allowed; it neither determines a participant's split nor excludes targets.

The [associated study's methods](https://pure.amsterdamumc.nl/ws/portalfiles/portal/168280173/Synchronization-of-womens-menstruation-with-the-moon-has-decreased-but-remains-detectable-when-gravitational-pull-is-st.pdf) describe menstrual diaries and some birth/miscarriage information. They do not provide contemporaneous answers to this app's eligibility questions. This preparation does not infer pregnancy onset, postpartum recovery, hormonal medication use or life stage from those annotations. In particular, a later-known birth cannot be used to erase an earlier forecasting miss.

## Participant assignment and receipt

The fixed dataset ID is `zenodo-15598359-v1`. Each original `Woman` identifier becomes `z_` plus SHA-256 of the JSON pair `["zenodo-15598359-identifier-v1", source ID]`. The existing `sha256-participant-v1-60-20-20` procedure then assigns that pseudonym. Assignment does not depend on dates, outcomes, source cohort, file order or future additions. Every record and audit annotation for one person stays in one group.

| Group       | Participants | Retained starts |
| ----------- | -----------: | --------------: |
| Development |          128 |          10,956 |
| Calibration |           28 |           1,961 |
| Final test  |           42 |           2,729 |
| Total       |          198 |          15,646 |

Approximate proportions are expected; do not rebalance by trying different IDs or seeds. Preparation read all rows for structural checks and counts, but no forecast, error distribution or model-selection result was calculated for any group. Separate files provide workflow separation, not an access-control barrier or a claim that source records were never inspected.

The first run reported `created`; a second run reported `verified-existing`, with identical files. Receipt hashes:

- Analysis plan, LF-normalized SHA-256: `8ca6a1cbf3f26788ca70cb37b9ee181da6f72b729c71b4361ba617bbb8d2f12f`.
- Generated local manifest, exact-byte SHA-256: `e0e28e2ee6f09286b45fea6879edc138dd6e79ed2b77522084c22b50197e3a8b`.

The manifest records individual output hashes and the exact adapter/parser/writer/policy versions by source hash. Git may change checkout line endings; compare code and plan hashes after LF normalization. Participant output hashes refer to the exact generated UTF-8/LF bytes.

## Comparison plan fixed before external scoring

The [versioned analysis plan](../research/protocols/zenodo-period-comparison-v1.json) specifies a **conditional dates-only** analysis. It asks how the numeric calendar policy behaves if eligibility/completeness were assumed, while the source files continue to record unknown context. A future comparison runner must make that counterfactual explicit in each report and leave prepared data unchanged. Running the ordinary benchmark directly on these source-faithful files will withhold forecasts; that is expected, not a measured accuracy of zero.

Primary issuance is immediately after a recorded start, assuming same-day logging. At each issue time, only earlier completed intervals are available. The target's eventual length and retrospective annotations cannot influence inclusion. The production median and fixed weighted candidate use identical reference-policy offered/scorable cases, alongside rounded mean, last interval and fixed 28. Report the paired MAE difference (weighted minus median) as the primary contrast, with error quantiles, availability, missing outcomes and participant-cluster uncertainty. Historical spread is not a calibrated probability interval.

The plan fixes 2,000 paired participant bootstrap replicates and a reproducible seed, along with descriptive source-cohort strata. The comparison runner and those reporting additions are **next**, not implemented or executed by the preparation command. Start on development participants; freeze the evaluated implementation before calibration and final test. No thresholds, weights, exclusions or subgroup definitions may be chosen from final-test performance. Any later plan change must be recorded with its timing and rationale.

This cohort cannot establish prospective accuracy, perimenopause performance, full-policy eligibility, ovulation or clinical readiness. No production model change or release decision follows from preparing these records.

## Verification

`pnpm check` passed TypeScript and **219/219 tests**. Eight new preparation checks cover exact/conflicting duplicates, chronology and long gaps, deterministic output, participant isolation, removal of source identifiers/demographics, unknown eligibility and final follow-up, audit-only annotations, safe repeatable writes and raw-file verification. Tests use fictional records. The real source passed its checksum audit and two complete preparation runs; participant files were not printed or committed.
