# Archived independent prediction-review proposal

**Superseded October 12, 2026:** the owner declined independent review and requested assistant-led statistical review. External clinical/statistical review is not a project requirement. See the [completed internal review](prediction-statistical-review-2026-10-12.md). No external review or endorsement occurred.

The remaining text preserves the October 11 proposal for historical context. Its requests, pending fields and reviewer workflow are inactive and must not be treated as development or release blockers.

## Brief for the reviewer

Cycle is a local-first journal planned for paid Android and later iOS distribution, with desktop use. It includes an optional, session-enabled next-period estimate. The reference method is a median of recent recorded intervals, with context/completeness confirmation and withholding rules. The intended use is a rough planning aid; it does not assign ovulation, fertility, measured hormones or medication advice. The appropriate intended population, wording and acceptable performance still need review.

Five fixed point methods were compared under an explicit dates-only eligibility assumption in a licensed historical dataset. In final test, 42 participants provided 1,989 scored forecasts: median/weighted MAEs were 5.666/5.727 days, with weighted-minus-median difference +0.06083 days (95% participant-bootstrap interval +0.01090 to +0.09979). The median's largest error was 1,468 days. Unknown context, recording gaps and assumed same-day entry prevent interpreting this as prospective physiological accuracy. No production model changed. All source groups have been examined.

Please assess whether the proposed next study can answer the stated product question, and record changes needed **before** new confirmatory outcomes are collected or opened. A clinician experienced in menstrual health and a statistician experienced in repeated-measures prediction evaluation cover different parts of this review. One review should not be represented as covering expertise the reviewer does not have. Intended-user feedback should address understanding of estimates, ranges and withheld results without being called clinical sign-off.

## Materials

| Read in this order                                                                                                                                                   | Purpose                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Current feature and wording](period-estimates.md) and [estimate UI source](../src/ui/PeriodEstimate.tsx)                                                            | What the user currently sees; thresholds are preview product choices.                            |
| [Prospective protocol draft](prediction-prospective-protocol.md)                                                                                                     | Proposed target, real-time inputs, outcome labeling, denominators, missingness and study design. |
| [New-data suitability review](prediction-data-suitability.md)                                                                                                        | Documented access and field gaps; no accepted replacement source.                                |
| [Held-out results](prediction-heldout-results.md), [engineering review](prediction-heldout-review.md) and [metric definitions](prediction-controlled-comparisons.md) | Existing evidence, provenance and limitations.                                                   |
| [Current policy](../src/domain/periodEstimate.ts) and [readiness record](../research/protocols/period-prospective-review-v1.json)                                    | Exact reference implementation and unresolved decisions.                                         |

This package can be reviewed without participant-level records. Any subsequent raw-data access needs its own authorized environment and terms. Repository links supply code and aggregates; they do not grant access to restricted datasets.

## Questions requiring a recorded response

| Area                           | Requested decision                                                                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intended use and communication | Is the proposed planning-aid scope defensible? What wording prevents users mistaking a date or historical range for certainty? Which claims must remain unavailable?                                                        |
| Population and context         | Define eligible study population and independently assessed life-stage categories. Are the current completeness/context questions adequate? Which groups should be evaluated for withholding rather than accuracy?          |
| Reference outcome              | Specify onset versus spotting, diary coverage, label corrections, uncertain dates and assessor independence. Can the proposed data establish the first onset after an anchor?                                               |
| Timing and failure accounting  | Review first-request/episode identity, delayed entries, already-occurred targets, erroneous anchors and restored data. Does the protocol fairly count unsuccessful or unusable predictions?                                 |
| Statistical design             | Review pooled versus participant-equal metrics, abstention/ascertainment denominators, clustering, missingness bounds and descriptive comparators. Define a precision-based participant count, follow-up and stopping rule. |
| Meaningful acceptance          | Specify justified error, availability, missing-outcome, subgroup and usability criteria before outcomes are opened. A statistically nonzero difference of a fraction of a day is not automatically meaningful.              |
| Conduct and data stewardship   | Identify the responsible study operator, consent/withdrawal process, applicable oversight, permitted reuse, storage/access and retention rules. Record unresolved obligations rather than assuming exemption or approval.   |

## Response form

Copy this section into a dated review record. Do not fill approval fields on a reviewer's behalf.

- Reviewer name, role/qualifications and scope reviewed: **not supplied**.
- Independence from implementation and competing interests: **not supplied**.
- Documents/repository revision reviewed and date: **not supplied**.
- Disposition: **pending** — later choose suitable as written / changes required / insufficient evidence / outside expertise, specifying scope.
- Required changes, rationale and evidence references: **pending**.
- Agreed population/onset definition/issue and adjudication rules: **pending**.
- Participant-count and follow-up justification; numeric acceptance/precision criteria: **pending**.
- Responsible study operator, consent/data approvals and unresolved items: **pending**.
- Reviewer attestation and follow-up required: **not supplied**.

After a response, preserve it, resolve each requested change in a new protocol revision, and ask the reviewer to confirm material amendments within their scope. Freeze the approved study version before new outcomes. A review of study design is separate from a product-release decision or a claim of clinical accuracy.
