# Review before held-out prediction comparisons

October 11, 2026. This records an engineering review and execution freeze before opening calibration or final-test outcomes. It is a review by the implementing assistant, not independent statistical or clinical sign-off. The owner authorized continuation of the controlled comparison work.

## Reviewed scope and decision

Reviewed the fixed [analysis plan](../research/protocols/zenodo-period-comparison-v1.json), preparation receipt, chronological replay, production policy, metric and bootstrap implementation, development aggregate report and existing synthetic tests. No analytic defect requiring a method change was identified. Proceed with the same five methods and reporting definitions for calibration, followed by final test once. Do not select thresholds, alter weights, remove targets or fit a model from either held-out result.

- Each forecast receives only the recorded start prefix available at its issue time. Same-day logging remains an assumption, not an observed property of the source.
- All methods share the production reference policy's offered, observed cases. This isolates point-method differences on those cases; it does not compare alternative complete policies. In particular, the median-based backtest gate may favor the reference method's case selection.
- Missing source eligibility stays unknown in prepared records. Comparable/complete history is an explicit evaluation-only assumption. No retrospective birth flag enters issuance, availability or target selection.
- Long recorded gaps stay in the target set without splitting, clipping, imputation or exclusions. The development report's post-run gap counts do not create a new analysis subgroup or an exclusion rule.
- Censored final outcomes contribute to opportunities and, if offered, availability, never accuracy. Empty denominators stay unavailable. Source strata remain descriptive.
- Participant IDs and splits are stable. Bootstrap draws keep participants intact, use the same draws for all methods and retain people without forecasts. The primary statistic pools errors across scored cases, with paired differences and explicit counts of undefined replicates.
- Fixed bootstrap settings remain 2,000 replicates, xorshift32 seed `20261011` and linear type-7 percentile interpolation. No additional hypothesis or subgroup is added.

The source cannot distinguish all missed observations, biological changes or logging gaps. It lacks confirmed completeness, eligibility and prospective entry timestamps. Cluster bootstrap intervals cannot repair those limitations or establish population representativeness. The calibration group is a reserved evaluation group here: no probability calibration or model fitting is performed. Final-test results will be reported separately from development and calibration, without pooled headline accuracy. None of these results authorizes clinical claims, a production predictor replacement or a 1.0 release.

## Frozen execution

The original engine, development-only command, preparation, plan, package files and production domain code are unchanged. The separate [held-out wrapper](../research/heldout-comparison.mjs) and [command](../scripts/compare-zenodo-heldout.mjs) verify the original development receipt, all recorded code hashes, preparation receipt, selected input checksums and Node version before scoring. Only the selected participant group is read, after an exclusive execution claim is saved.

Frozen identifiers (SHA-256; source text normalized to LF where stated):

| Item                      | Hash                                                               |
| ------------------------- | ------------------------------------------------------------------ |
| Development report, LF    | `a3e04dcba11e28d9378757a6a9bd920930d33726e3bee0b7a827a69de4d0929d` |
| Preparation receipt, LF   | `e0e28e2ee6f09286b45fea6879edc138dd6e79ed2b77522084c22b50197e3a8b` |
| Analysis plan, LF         | `8ca6a1cbf3f26788ca70cb37b9ee181da6f72b729c71b4361ba617bbb8d2f12f` |
| Held-out wrapper, LF      | `47ffc23959ae84cd7723620b28f907ccabbcec401615538883eda4f0ccc5514b` |
| Held-out command, LF      | `1674a611a80cd37ab70ccfcf439875da3f63551626786019fcbe904185195eaf` |
| Combined execution freeze | `eb0218a3c9f6b51431cb9003a90d4f9772b3d3ff22941e4117718fc1fb42c25e` |

Runtime is Node `v24.19.0`, matching development. Full original implementation hashes are in the development report; the held-out reports will retain those hashes and the new wrapper hashes. This document and execution code are committed before the first held-out run. The original plan's authoring status and development report remain immutable historical records.

```sh
node --experimental-strip-types scripts/compare-zenodo-heldout.mjs calibration
node --experimental-strip-types scripts/compare-zenodo-heldout.mjs test
```

The commands require the original ignored prepared files. Each writes only aggregates under `research/private-data/zenodo-{calibration|test}-comparison-v1/`, with a SHA-256 receipt. An exclusive `*.started.json` claim is synced before reading the selected records; final test requires a completed calibration receipt with the same execution freeze and records that prerequisite's report hash. Concurrent runs cannot both acquire a claim. Existing results are checksum-verified and returned as `replayed-saved` without invoking the evaluator. Missing, altered or incomplete results stop execution. An interrupted run leaves its claim in place for review, never automatic rescoring. These local safeguards prevent accidental repeat execution, not deliberate deletion or coordinated tampering with local files.

For reproduction after later application changes, use the frozen revision and matching runtime in a separate checkout, retaining the original receipts. Do not relax its hash checks to accommodate later production changes. A subsequent exploratory experiment needs a new protocol and must acknowledge that these participants have already been examined.

## Verification before opening held-out outcomes

TypeScript and **238/238 tests** passed. Nine new synthetic checks cover prerequisite ordering, saved-result replay without evaluation, interrupted and concurrent executions, altered/incomplete results, changed execution/code hashes, early argument rejection and the unchanged engine on fictional calibration/test histories. The public-only freeze review passed without reading either held-out group. No method, threshold, source exclusion, UI or production code changed.
