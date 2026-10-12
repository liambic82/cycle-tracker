# Internal statistical review — October 12, 2026

The owner decided that there will be no independent prediction review, requested an assistant-led statistical review, and requested an in-app medical-advice disclaimer. External clinical/statistical sign-off is removed as a project requirement. This is the implementing assistant's internal methodological and numerical review; it is not independent, a credentialed professional attestation, or clinical validation.

**Decision:** retain the experimental median and all existing withholding rules. The evidence does not support adopting the fixed weighted candidate, claiming a personal accuracy rate, or labeling the historical spread as a probability interval. Continue Android development and device testing with clear prediction limitations. A future study or audit-capture feature is a separate development choice, not a new prerequisite created by this review.

## Evidence and checks

Reviewed `periodEstimate.ts`, the chronological policy replay, source adapter/input contract, participant assignment, controlled metric/weighting/bootstrap implementation, frozen execution receipts, synthetic tests and the three saved aggregate reports. The original implementation freeze was verified before the 0.18.1 package-version change. The point estimator and all production domain files remain unchanged.

The new aggregate-only command is reproducible without participant records:

```sh
node scripts/review-period-results.mjs
```

It verifies the three original report hashes, split/provenance fields, opportunity and censoring partitions, status totals, common scored denominators, within-day rates, signed/absolute-error bounds, integral absolute-error sums, source-stratum aggregation, paired point differences, bootstrap metadata/endpoints and the calibration-to-test receipt chain. It passed for all groups. It does not replay participant histories, fit a model, generate new uncertainty intervals or select an alternative analysis after seeing test results.

| Group       | People | Scored cases | Median MAE, days | Weighted MAE, days | Weighted minus median | Paired 95% bootstrap interval |
| ----------- | -----: | -----------: | ---------------: | -----------------: | --------------------: | ----------------------------- |
| Development |    128 |        8,068 |          4.86180 |            4.92427 |              +0.06247 | +0.04158 to +0.08114          |
| Calibration |     28 |        1,436 |          5.40042 |            5.50000 |              +0.09958 | +0.03523 to +0.14880          |
| Final test  |     42 |        1,989 |          5.66616 |            5.72700 |              +0.06083 | +0.01090 to +0.09979          |

These are the existing [saved results](prediction-heldout-results.md), not new experiments. Group results stay separate. The positive primary difference favors the median on the reference policy's offered/observed cases. Its magnitude is small; exclusion of zero in these intervals does not establish a useful clinical difference or broad superiority. The slightly lower secondary rounded-mean MAE does not justify switching models on the inspected test group.

## Methodological assessment

| Question                        | Finding                                                                                                                                                                                                                 | Consequence                                                                                                                                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Future-information leakage      | At issuance offset zero, only the known start prefix reaches the policy. The next target is held out; long future targets cannot revoke an issued forecast. Birth annotations do not become predictors.                 | No implementation leakage defect identified for this defined replay. Actual entry/edit timing remains an assumption.                                                                                                                                |
| Participant separation          | Assignment uses stable dataset/participant IDs and fixed SHA-256 thresholds. The preparation receipts fix membership; all segments of one person remain together.                                                       | The held-out comparison tests unseen participants in this source, not transfer to a separately recruited population.                                                                                                                                |
| Comparison fairness             | All five methods share reference-policy eligibility, six-interval inputs and target cases. The reference gate itself uses median backtest error.                                                                        | Fair comparison of point methods on these cases, not a comparison of five complete deployment policies. The selection can favor the reference.                                                                                                      |
| Statistical unit and weighting  | Whole participants are resampled, with identical draws across methods. Their error sums and case counts are pooled, preserving paired differences. People with no forecasts remain sampled.                             | Accounts for within-person clustering in this bootstrap. Longer histories contribute more to the pooled point metric. Participant-equal error and leave-one-person-out influence are not available from these aggregates and have not been claimed. |
| Uncertainty                     | Fixed 2,000-replicate xorshift32 bootstrap, seed `20261011`, type-7 percentile endpoints, explicit undefined-replicate counts. Existing hand-calculated tests cover pairing, pooled ratios, quantiles and empty groups. | Appropriate implementation of the specified percentile procedure; it does not guarantee nominal coverage for small, heterogeneous, heavy-tailed cohorts. All primary ratios happened to be defined here. No new bootstrap tuning was performed.     |
| Missingness and context         | Source eligibility/completeness are unknown; same-day entry is assumed. Final unknown targets affect availability but not error. Internal unobserved periods cannot be identified from dates alone.                     | Report conditional next-recorded-event performance. Do not market these values as prospective physiological accuracy or assume missingness is random.                                                                                               |
| Extreme errors                  | No long target was trimmed or retrospectively excluded. Median, P90, mean, maximum and within-day fractions expose different parts of the distribution.                                                                 | A low median error can coexist with a high mean. Do not remove extreme cases merely to improve the headline.                                                                                                                                        |
| Multiplicity and selection      | Weighted-minus-median was the fixed primary contrast; the remaining methods/strata are secondary descriptions. Calibration did not fit or calibrate probabilities.                                                      | No winner selection from secondary minima; no invented p-values or family-wide superiority claim.                                                                                                                                                   |
| Availability and generalization | Final-test conditional availability was 2,026/2,729, with 1,989 scored forecasts and 37 offered/censored forecasts. Intended-user opt-in and real context eligibility were not measured.                                | This fraction is not the percentage of real users who will receive a useful estimate. Withheld groups have unavailable accuracy, not zero error.                                                                                                    |
| Historical range                | Final-test min–max coverage was 1,543/1,989 (77.58%). Width reflects selected past intervals, without a stated probability model.                                                                                       | Keep the range labeled past variation. It is not a confidence interval or a contraceptive/fertility window.                                                                                                                                         |

### Additional descriptive arithmetic

After inspecting the saved results, the review command divides the largest single median-method absolute error by the total absolute-error sum. Development: **3,893/39,225 = 9.92%**; calibration: **2,226/7,755 = 28.70%**; final test: **1,468/11,270 = 13.03%**. This is a post-result description of tail influence, not a prespecified new endpoint, participant-level influence estimate or rerun excluding those errors. Both original point estimates and intervals remain intact.

### Limits of this review

The review can assess the implemented mathematics, reproducibility and whether conclusions follow from the evidence. It cannot reconstruct absent timestamps, establish the causes of long gaps, manufacture prospective observations, or establish the appropriate medical use of an individual prediction. It has not independently re-adjudicated participant labels or provided an external professional endorsement. The disclaimer communicates intended use; it adds no statistical evidence of accuracy.

For methodology, [TRIPOD+AI (Collins et al., 2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11019967/) is used as reporting guidance for documenting data, methods, performance and limitations. The [external-evaluation guidance by Riley et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC10788734/) informed the earlier protocol; its page returned a browser check on this review date. Neither source certifies this app or supplies an acceptance threshold for it. This is a focused review, not a systematic literature review or formal checklist accreditation.

## App wording and continuing work

Preview **0.18.1** places this body-size text before the estimate controls:

> Predictions are not medical advice. Do not use them to diagnose or treat a condition or make medication decisions. Talk with a healthcare professional about medical concerns.

An offered date also carries **“Estimate only. Not medical advice.”** Existing experimental labeling, the statement that the preview has not been clinically validated, the contraception warning, range limitations and context/completeness gates remain. No acknowledgement checkbox or new journal data is introduced.

Proceed with ordinary development and the consolidated Android test pass. If the owner later chooses prospective evaluation, use the [updated draft](prediction-prospective-protocol.md) as an internal planning document: specify actual capture semantics, data suitability, meaningful precision/acceptance criteria and consented data handling before opening new outcomes. Those open research questions are not an external-review requirement and do not constitute a 1.0 release decision.
