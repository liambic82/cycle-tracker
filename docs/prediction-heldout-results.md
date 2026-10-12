# Held-out prediction comparison results

October 11, 2026. The fixed weighted-median candidate did not improve the primary error metric in either held-out group. Keep the app's experimental median policy unchanged. These comparisons concern the next recorded event under assumed eligibility; they do not establish physiological period-prediction accuracy or authorize a release.

## Execution record

The [engineering review and execution freeze](prediction-heldout-review.md), new wrapper and nine synthetic checks were committed as **`a643590` before either held-out run**. The original comparison engine, methods, weights, thresholds, participant assignment, data preparation and [analysis plan](../research/protocols/zenodo-period-comparison-v1.json) were unchanged. Calibration ran first, then final test once. No fitting, tuning, source exclusions or reporting changes were made between those executions.

The final-test receipt records the calibration report's hash as its prerequisite. Both used execution freeze `eb0218a3c9f6b51431cb9003a90d4f9772b3d3ff22941e4117718fc1fb42c25e` and Node `v24.19.0`. Subsequent calls returned `replayed-saved`, verifying stored reports without running predictions again. The original development command remains development-only.

| Aggregate report                                                         | SHA-256 of original report bytes / LF-normalized repository copy   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [Calibration](../research/results/zenodo-calibration-comparison-v1.json) | `b5bf68c84878b97766c4e6f7ea456f10183d19925cbe0109a5feb873e1392976` |
| [Final test](../research/results/zenodo-test-comparison-v1.json)         | `1f64cb0b90daba66566810d57adfe47f20f41924f5f5b1668293035f38ad61b5` |

Only aggregate reports were copied into Git. Participant records, annotations and local execution claims remain ignored. Full reports contain all five methods, signed and absolute errors, within-1/3/7-day counts, availability, censoring, historical spread, source strata and provenance. The [metric definitions](prediction-controlled-comparisons.md#metric-definitions-fixed-before-external-scoring) remain those specified before the development run. Report and plan authoring states are historical records, not live task status.

## Final test: 42 participants

There were **2,729 issue opportunities**, comprising 2,687 observed targets and 42 censored final targets. The conditional policy offered 2,026 forecasts (**74.24%**, bootstrap interval 68.64–79.42%). Of these, **1,989 were scored** and 37 were censored. All 42 participants had scored forecasts. Withholding counts were 330 insufficient-history, 306 variable-history, 61 unsupported-history and 6 poor-fit cases.

| Method                | MAE, days | 95% bootstrap interval for MAE | Median absolute error | P90 absolute error | Within ±3 days |
| --------------------- | --------: | ------------------------------ | --------------------: | -----------------: | -------------: |
| Production median     |     5.666 | 3.467–7.891                    |                     2 |                  4 |         85.07% |
| Rounded mean          |     5.657 | 3.457–7.890                    |                     1 |                  4 |         85.37% |
| Last interval         |     6.247 | 4.020–8.507                    |                     2 |                  6 |         74.96% |
| Fixed 28              |     6.069 | 3.831–8.304                    |                     2 |                  5 |         79.14% |
| Fixed weighted median |     5.727 | 3.528–7.966                    |                     2 |                  5 |         83.46% |

All five methods use the same 1,989 cases. The prespecified primary contrast, **weighted minus median MAE, is +0.06083 days**, with a 95% paired participant-bootstrap interval of **+0.01090 to +0.09979 days**. Positive means weighting was worse. All 2,000 replicates were defined. The difference is small and specific to these records and shared reference-policy cases. The rounded mean's slightly lower MAE is a secondary observation, not a tested replacement decision.

The median's mean signed error is **−3.609 days**, and its largest absolute error is **1,468 days**. Those extreme recorded gaps remain included. They are not verified physiological cycle lengths; the apparent tension between a two-day median error and a 5.666-day mean reflects the long tail. No post hoc exclusion or alternative headline metric replaces the planned result.

Historical min–max spread contained 1,543/1,989 targets (**77.58%**, bootstrap interval 75.53–79.18%). Its mean width was **5.25 days** over all 2,026 offered forecasts. This is descriptive historical coverage, not a calibrated prediction interval.

## Calibration: 28 participants

This reserved group was evaluated without fitting a model or calibrating probabilities. There were **1,961 issue opportunities**, comprising 1,933 observed and 28 censored targets. The policy offered 1,457 forecasts (**74.30%**, bootstrap interval 65.73–81.06%): **1,436 were scored**, 21 were censored. Twenty-six participants had scored forecasts; two never received a forecast and remained in the bootstrap sampling pool. Withholding counts were 225 insufficient-history, 214 variable-history, 61 unsupported-history and 4 poor-fit cases.

| Method                | MAE, days | 95% bootstrap interval for MAE | Median absolute error | P90 absolute error | Within ±3 days |
| --------------------- | --------: | ------------------------------ | --------------------: | -----------------: | -------------: |
| Production median     |     5.400 | 2.996–9.058                    |                     2 |                  5 |         82.03% |
| Rounded mean          |     5.397 | 2.987–9.063                    |                     2 |                  5 |         82.31% |
| Last interval         |     6.008 | 3.628–9.714                    |                     2 |                  7 |         72.63% |
| Fixed 28              |     6.022 | 3.647–9.624                    |                     2 |                  6 |         72.98% |
| Fixed weighted median |     5.500 | 3.081–9.204                    |                     2 |                  5 |         80.78% |

The weighted-minus-median contrast was **+0.09958 days**, with a 95% paired participant-bootstrap interval of **+0.03523 to +0.14880 days**. All 2,000 replicates were defined. Median mean signed error was **−3.308 days**, and the largest absolute error was **2,226 days**. No setting changed in response to this group before final test.

Historical spread contained 1,099/1,436 targets (**76.53%**, bootstrap interval 73.67–78.18%), with mean width **5.84 days** over 1,457 offered forecasts. No probability claim follows from this coverage.

## Descriptive source strata

| Group       | Source   | Participants | Scored cases | Median MAE, days | Weighted MAE, days |
| ----------- | -------- | -----------: | -----------: | ---------------: | -----------------: |
| Calibration | Old-only |            3 |          597 |            3.673 |              3.796 |
| Calibration | New-only |           25 |          839 |            6.629 |              6.713 |
| Final test  | Old-only |            2 |          344 |           12.465 |             12.564 |
| Final test  | New-only |           40 |        1,645 |            4.244 |              4.297 |

Both mixed-source strata were empty and report unavailable errors. Small participant counts and long recorded gaps make these descriptive views unsuitable for generalizing source differences. There was no stratum-based tuning or separate hypothesis test. Calibration, final test and development remain separate reports.

## Decision and remaining work

This completes the fixed external dates-only comparison protocol. It supplies no evidence to adopt the weighted candidate. The app's median policy, eligibility gates, experimental wording and preview **0.18.0** remain unchanged. No APK or phone validation accompanies this research-only step.

The next prediction work is independent methodological/clinical review and a separately specified evaluation using suitable consented or licensed records with verified logging, completeness, relevant context and follow-up. The subsequent [protocol draft](prediction-prospective-protocol.md), [review package](prediction-independent-review.md) and [candidate-data assessment](prediction-data-suitability.md) are prepared; reviewer responses, a suitable cohort and the final study design remain pending. A prospective protocol should be fixed before collecting or opening new outcomes. All participants in this dataset have now been examined; future experiments on them must be labeled exploratory, with new unexamined data needed for a new confirmatory test. Do not reopen this final test to choose a winner or tune thresholds.

Broader Android work remains tracked in the [completion record](android-completion.md), including the pending consolidated 0.18.0 phone pass and independent security/accessibility review. The 1.0 readiness decision remains separate.
