# Controlled prediction comparisons

October 11, 2026. Implements the [fixed comparison plan](../research/protocols/zenodo-period-comparison-v1.json) against the [prepared records](prediction-record-preparation.md). The app's prediction policy and preview 0.18.0 remain unchanged.

## Execution boundary

`pnpm research:compare-zenodo` evaluates **development participants only**. Explicit `calibration` or `test` arguments are rejected before reading any files. The runner verifies the committed preparation receipt, local manifest, source-processing/policy hashes, analysis-plan hash and the exact development data/audit file hashes. It never opens the held-out participant files.

Source context remains unknown and completeness remains unconfirmed. The runner constructs an in-memory, explicitly counterfactual review of comparable/complete history for the dates-only analysis. It does not edit the prepared data or alter the app's context gate. Birth annotations never enter prediction or target selection. Only source `old`/`new` membership is extracted for descriptive strata.

Each person's starts are replayed chronologically at issuance offset zero, with only the known prefix supplied to the production policy. The policy determines availability. Median, rounded mean, last interval, fixed 28 and the fixed recency-weighted median are scored on exactly the same offered cases with known subsequent recorded starts. No future target is removed for being unusually long or because later records reveal a birth. The final unknown target contributes to availability when offered, never accuracy. Fixed 28 is only a comparator.

## Metric definitions fixed before external scoring

- Point errors are in days. Signed error is predicted minus recorded, so positive means late. MAE pools scored cycles across the selected participants; it does not average participant MAEs. The primary contrast is weighted MAE minus production-median MAE: negative favors weighting on these matched cases.
- Median absolute error is the ordinary sample median (average the two central values for even counts). P90 absolute error is the nearest-rank value at one-based index `ceil(0.9*n)`. Fractions within 1, 3 and 7 days are inclusive and include their count and denominator. No scored observations means `null`, not perfect accuracy.
- Availability is offered / all issue opportunities, including cold starts and censored final targets. Report withholding reasons, scored/censored counts and people without forecasts separately. This is **conditional numeric-policy availability**, not an estimate of actual app eligibility or user opt-in.
- Historical spread coverage uses offered, observed targets. Mean spread width uses all offered forecasts, including those without known outcomes. It is descriptive min–max coverage and has no promised probability.
- The paired bootstrap draws the selected number of **participants** with replacement, preserving all each person's rows and using the same draw for every method. People with zero forecasts remain in the sampling pool. Pooled sums/counts reproduce cycle-weighted MAE without resampling individual cycles. There are 2,000 replicates, with the plan's xorshift32 seed `20261011`; participants are ordered by stable ID before drawing.
- Bootstrap intervals use the 2.5th and 97.5th percentiles of defined replicate statistics. Interpolation is explicitly **linear type 7**, as defined in the [R quantile documentation](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/quantile.html): interpolate at zero-based position `(n-1)*p`. This resolves the plan's unspecified interpolation detail before any external scoring. It is not an implementation of R's `boot.ci` package. Every interval reports defined/undefined replicate counts; empty denominators remain unavailable. Intervals are produced for each method's MAE, the primary paired contrast, conditional availability and historical-spread coverage.
- Source strata are old-only, new-only and mixed, with the same metrics but no separate resampling, tuning or model-selection step. An empty stratum reports zero counts and unavailable rates/errors. These are descriptive secondary views, not independent external validation.

These uncertainty intervals describe resampling variability within this development cohort. They do not account for unknown logging behavior, eligibility, selection bias, source-label error or transfer to the intended population. They are not individual prediction intervals or calibrated probabilities. Extreme errors stay visible; a small paired difference can coexist with poor absolute performance.

## Reproduction and outputs

```sh
pnpm research:compare-zenodo
```

Windows: `./scripts/pnpm.ps1 --config.verify-deps-before-run=false run research:compare-zenodo`.

The command writes aggregate `report.json` and `manifest.json` under the ignored `research/private-data/zenodo-development-comparison-v1/`. It prints a compact aggregate result and report hash. Reports contain plan/input/source/implementation hashes, production rules, runtime version, explicit assumptions, all metrics and descriptive strata. No participant IDs, dates or per-person results are emitted. The previously tested bundle writer refuses to overwrite changed output; an identical rerun verifies every byte. Subsequent implementation changes require a versioned result rather than silently replacing this baseline.

Only reviewed aggregate results may be copied into the repository. All raw/prepared participant histories remain local. Keep the original plan/receipt immutable: their `prespecified-not-executed` status records when they were authored; later execution belongs in the result record, not a rewritten plan.

## Verification before the first development run

TypeScript and **229/229 tests** pass. Ten new checks cover hand-calculated stable/drifting histories, retained extreme targets, quantile/sign/denominator definitions, paired participant resampling, empty/no-forecast cases, the unsigned xorshift sequence, order invariance, mixed-group rejection, audit-annotation isolation, checksum failures and rejection of held-out CLI selection. Existing chronological leakage and preparation checks remain in place. Test records are fictional.

The implementation and this metric specification are committed before the first external development run. Development results will be recorded separately after that run. Calibration and final-test forecasts remain unscored; no production model change or clinical release is authorized by this analysis.
