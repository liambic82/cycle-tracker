# Experimental period-start estimates — preview 0.12.0

## Scope and controls

**Calendar → Explore period estimate** offers an optional calculation for the next start, as of today. It is separate from recorded calendar cells and daily phase education. It never creates an entry, shades predicted bleeding days, schedules a notification, assigns ovulation/phase, or changes medication advice. Existing selected dates are preserved. Personal phase remains undetermined.

Estimates start off on every opening. The user must choose a comparable current pattern and confirm that the displayed starts are complete and belong to that pattern. Unknown/prefer-not-to-say, hormonal treatment or a recent change, pregnancy/recent birth/breastfeeding, and changing cycles (including perimenopause) withhold dates. More than one situation may apply; choosing any applicable withholding option is sufficient. No situation is inferred from symptoms, medication names, age, or sexual-health records. Users can continue logging with estimates off.

These choices exist only in React state. Turning the switch off, leaving the view, or locking discards them. They are not health-history records and are not saved, exported, or transmitted. No journal-format, passphrase, biometric, or backup changes are required. The expanded fictional sample has seven starts to demonstrate the feature; existing journals are untouched.

## Fixed method and product rules

The implementation is a transparent preview baseline, **not independently clinically validated**. The following limits are deliberately documented product choices, not diagnostic boundaries, clinical recommendations, or a declaration of which cycles are normal:

1. Read explicit period-start markers only. Reject the estimate if any start is in the future. Flow, end markers, symptoms, and notes cannot supply a start.
2. Use the latest seven starts on/before today, all within the preceding 365 days (inclusive), giving six complete start-to-start intervals. Older history stays in the journal and is explicitly outside this calculation. Do not trim, split, impute, or silently remove unusual intervals within the selected six.
3. Withhold if any selected interval is below 14 or above 90 days, their shortest-to-longest spread exceeds 14 days, or the latest start is more than 90 days old. Missing history is reported separately; a long interval is never declared a missing log or a medical condition.
4. Check the last three intervals chronologically. Predict interval 4 from intervals 1–3, interval 5 from 1–4, and interval 6 from 1–5. A training prefix must pass the same length/spread limits. The target interval is never used in its own prediction or abstention decision. Require all three checks and median-method mean absolute error of at most seven days before offering a current date.
5. Estimate the next length using the median of the selected six intervals, rounding a half-day up to the next whole day. Add that number to the last recorded start, without an extra inclusive day. This method stays fixed; it does not choose the best-looking method retrospectively for each user.
6. Also show dates obtained from the shortest and longest selected intervals. This is a **historical spread, not a calibrated prediction/confidence interval**. Even a one-day spread does not establish certainty. Both the UI and documentation say the next start can fall outside it.
7. Once today is later than the historical spread's upper date, withhold the estimate. Never advance it by another cycle, move it to tomorrow, or label a period late/missed. A newly logged or corrected start can change the calculation. Values beyond the supported calendar are withheld.

The current estimate always concerns today, even if another calendar day was selected before opening the view. Its anchor, contributing start dates, interval lengths, historical checks, and comparison errors are visible. It is not reliable contraception or evidence of hormone levels, pregnancy, or a diagnosis. No default 28-day personal estimate is used when information is absent.

## Validation method and results

`pnpm validate:estimates` runs deterministic synthetic stress cases in `scripts/validate-period-estimates.ts`. `backtestIntervals` uses a sliding window of three to six **preceding** intervals for each next target, without future information. It keeps unexpected targets in scoring and reports when training history makes the candidate abstain. Mean, last-interval, and fixed-28-day comparisons use exactly the same eligible folds. The fixed example is a benchmark only, not a fallback in the app.

These rows evaluate the candidate calculation and its training-history limits. They do **not** represent the complete UI eligibility policy: the UI additionally requires six completed intervals, user review, recency, an unexpired result, and three acceptable historical checks. “Offered / possible” below is candidate fold availability; “inside” is empirical inclusion in each training prefix's min–max spread. Neither is a future probability. Errors are in days.

| Synthetic scenario                    | Offered / possible | Median MAE | Mean MAE | Last MAE | Fixed-28 MAE | Inside prior min–max | Largest median error |
| ------------------------------------- | ------------------ | ---------- | -------- | -------- | ------------ | -------------------- | -------------------- |
| Stable 28-day example                 | 9/9                | 0.00       | 0.00     | 0.00     | 0.00         | 9/9                  | 0                    |
| Alternating 29/30                     | 9/9                | 0.67       | 0.67     | 1.00     | 1.56         | 9/9                  | 1                    |
| Gradual drift                         | 9/9                | 2.78       | 2.78     | 1.00     | 3.22         | 0/9                  | 3                    |
| Abrupt change                         | 9/9                | 5.44       | 5.44     | 1.56     | 10.89        | 8/9                  | 14                   |
| Possible missing start (not inferred) | 3/9                | 9.33       | 9.33     | 9.33     | 9.33         | 2/3                  | 28                   |
| Repeated variable intervals           | 0/9                | —          | —        | —        | —            | 0/0                  | —                    |
| Duplicate-like short interval         | 3/9                | 9.00       | 9.00     | 9.00     | 9.00         | 2/3                  | 27                   |
| Long interval                         | 3/9                | 22.33      | 22.33    | 22.33    | 22.33        | 2/3                  | 67                   |

These examples expose limitations: the median lags a trend, a historical spread can miss every drifting target, and a surprise gap cannot be anticipated from stable prior entries. It is not universally better than the comparisons. We retain the median for its simple, inspectable behavior, not because these examples prove superiority. The last-interval method adapts more quickly in these deliberately trending examples; it can also propagate a mistaken last start. No thresholds were fitted to private user records or to a claimed clinical cohort.

The live UI repeats the small chronological check on the user's selected history, showing candidate availability, median average/largest error, empirical spread inclusion, and optional baseline details. This is descriptive, small-sample, retrospective evidence; it cannot establish future accuracy, complete logging, or current medical comparability. Product-rule unit tests separately cover opt-in, withholding, date boundaries, corrections, expiry, immutability, and sensitive-field independence.

Before general release, obtain an appropriately licensed/consented dataset and independent clinical/editorial review, freeze the method and gates before evaluation, and report person-separated chronological holdout errors and availability for the **full** policy, including irregular histories and subgroup limitations. Evaluate calibration separately before offering any probability or confidence range. No external clinical dataset has been used and no population accuracy is claimed for 0.12.0.

## Evidence reviewed October 9, 2026

- [Office on Women’s Health: Your menstrual cycle](https://womenshealth.gov/menstrual-cycle/your-menstrual-cycle) describes counting starts, variation, and changes with life stage. It does not validate this app's numerical thresholds or algorithm.
- [Li et al., 2020, npj Digital Medicine](https://www.nature.com/articles/s41746-020-0269-8) discusses how forgotten tracking can inflate observed intervals. This motivates exposing gaps and requiring user review; we do not copy its exclusions or infer why a gap occurred.
- [Li et al., 2021, JAMIA (PubMed abstract)](https://pubmed.ncbi.nlm.nih.gov/34534312/) describes a model that explicitly accounts for tracking adherence. This preview is a simpler baseline and does not implement that published model or inherit its performance claims.
- [Urteaga et al., 2021, PMLR](https://proceedings.mlr.press/v149/urteaga21a.html) explains why uncertainty needs calibration when both physiology and self-tracking vary. This supports keeping an empirical historical spread distinct from a confidence interval. It does not calibrate our method.

The papers' populations and methods differ from this preview and cannot establish suitability for all users. Sources are development evidence; no source page is fetched during a calculation.
