# Development plan

The [October 9 source review](source-review-2026-10-09.md) reconciles the original brief, all ten comments, and all nine screenshots against preview 0.3.0. It records detailed gaps and dependencies; source stage numbers remain suggestions.

**October 10, 2026 update:** the owner reported “Phone tests passed. Keep going.” after preview 0.15.0, following the earlier 0.13.0 and 0.14.0 phone passes. This records the reported phone-validation pass and approval to continue in the established Pixel 7 / Android 17 and Galaxy Z Flip5 testing context. Individual checklist results, a per-device breakdown, Flip5 OS version, notification timings, and independent security/accessibility validation were not supplied. Older pending statements below describe the evidence available at those earlier milestones; retain their checklists for regression. The owner also requested wearable sleep support and selected **Fitbit first**.

## Current slice and next steps

**October 11 owner direction:** finish local Android development for a consolidated test pass, then port to iOS. Cloud sync and automatic background sleep syncing are deferred. Do not require a new phone sign-off after every development slice. The visual direction is clean, easy to read and clearly feminine; preserve approved palettes and the existing design until a specific replacement is approved.

Preview **0.18.0** adds the remaining structured daily observations, medical records and encrypted attachments, dated lab history, appointments/questions/medical history, care reminders, reviewed past medication corrections, guided historical periods and a strict CSV template importer. It also adds optional Health Connect 90/365-day history access and a static Android home-screen widget. Journal format **8** migrates formats 1–7; new backups need 0.18.0+. [Feature scope and open dependencies](android-completion.md).

Next: run the [consolidated Android checklist](android-testing.md#0180-consolidated-local-android-test-build) on Pixel 7 / Android 17, Galaxy Z Flip5 and the phone paired with Fitbit Inspire 3; fix observed issues before the native iOS port. The last owner-reported phone pass is still **0.15.0**. Automated and browser tests are separate evidence.

The owner selected prediction research next. The [October 11 research review](prediction-research-2026-10-11.md), [benchmark/intake](prediction-benchmark.md) and [record preparation](prediction-record-preparation.md) establish fixed participant groups and a plan for 198 histories. The [development comparison](prediction-controlled-comparisons.md), [implementation review](prediction-heldout-review.md) and [calibration/final-test evaluations](prediction-heldout-results.md) are complete: the fixed weighted candidate did not improve on the reference median in any group. Missing context prevents treating this as full-policy or clinical validation. Next prediction work requires independent methodological/clinical review and suitable new records under a separate prospective protocol; the examined final test must not be reused for tuning. Other-app import samples, accessibility/security review and store preparation remain open. The template importer does not claim universal vendor compatibility. There is no 1.0 release decision.

## Milestone 1: private daily journal

Implemented in the 0.1 preview: calendar, daily flow and explicit start/end markers, selected symptom categories, custom symptoms, cramp severity, notes, recorded cycle history, encrypted local vault, backup/restore, CSV export, and responsive browser UI.

The full source brief remains the feature reference. Its version labels are provisional, and this milestone does not claim to implement every feature marked V1.

## Milestone 2: Android daily-use build

The owner reported successful Pixel 7 testing on Android 17 for previews 0.1.0 and 0.2.0 on October 9, 2026, then confirmed biometrics functioning as expected in 0.3.0. The 0.2.0 response was “Testing complete, all pass.” Individual 0.3.0 edge-case results were not supplied. Flip5 validation remains pending.

Preview 0.2.0 added entry deletion with session-only Undo, confirmed deletion of the local vault, and native screen capture/app-switcher protection. Preview 0.3.0 adds optional biometric unlock using an OS-protected key, with passphrase fallback, cancellation/invalidation handling, and cleanup during restore/deletion.

- Continue 0.3.0 edge-case regression on the Pixel 7 and validate the first installation on Galaxy Z Flip5, following [the device test guide](android-testing.md).
- Record OS versions; test input, accessibility text sizes, storage, backup sharing, and fold/reopen state.
- Measure passphrase unlock time and journal write performance on real hardware.
- Verify background locking, native app-switcher privacy, keyboard behavior, and recovery after app termination.
- Implemented in 0.4.0: the complete 99-choice catalog, search and category browsing, a less-common browser, custom-label handling, and optional perimenopause visibility. Existing labels and older backups remain supported. The owner reported symptoms, visibility, and biometrics working on October 9 in the established Pixel 7 / Android 17 context. Keep [the 0.4.0 checklist](android-testing.md#040-symptom-browser-checks) for regression; individual edge-case results were not supplied.
- Keep deletion/Undo, whole-journal deletion, backups, and update-in-place retention in the regression pass.
- Keep native biometric enrollment, cancellation, invalidation, disable, restart, and passphrase fallback in hardware regression testing.

## Milestone 3: visual history and daily detail

The first visual-history portion is implemented in preview 0.5.0. Product logging and clot/flooding observations are implemented in 0.6.0. Optional sexual-health records and a visible flooding explanation are implemented in 0.7.0. Medication/supplement definitions, user-entered schedules, and dose logging are implemented in 0.8.0. Outstanding native checks remain in the device guide; notification delivery follows the medication recording foundation.

The owner reported a creation spinner lasting over a minute on Galaxy Z Flip5 with 0.5.0. Native Android key calculation and setup progress/deadline handling are implemented in 0.5.1; the device retest remains pending. The owner subsequently approved the 0.5.3 layout and explicitly requested continuing development. Continue the planned work while retaining [the focused Flip5 checklist](android-testing.md#051-passphrase-fix-checks); approval to proceed is not a device-validation result.

Preview 0.5.2 additionally enables testing screenshots and adds passphrase show/hide controls at the owner's request. It includes the 0.5.1 fix; test both with [the 0.5.2 checklist](android-testing.md#052-screenshots-and-passphrase-controls).

Preview 0.5.3 addresses the owner’s concern about accidental deletion from the entry footer. Deletion now requires opening Entry options beside the date, then confirming; the footer explains autosave and displays its current status. The owner responded “Looks good, move forward.” Keep [the 0.5.3 checklist](android-testing.md#053-entry-options-and-autosave) alongside the outstanding Flip5 setup and 0.5.2 checks in regression testing.

- Implemented in 0.5.0: year/month/day navigation with a consistent selected date, compact annual overview, recorded cycle-day context, and continuous month scrolling.
- Implemented in 0.5.0: cycle-length and bleeding-duration charts with average, shortest, and longest values. Incomplete records remain unknown and are excluded from statistics.
- Implemented in 0.5.0: chronological flow strips within cycle-history rows, with separate treatment for bleeding, spotting, explicitly recorded no flow, and unlogged days. Older entries without explicit flow information remain unknown.
- Implemented in 0.6.0: optional product records with type/detail, count, use/change/emptying, optional local time and observed cup/disc amount, plus independent Yes/No/Not logged clot/flooding observations. Included in entry summaries, encrypted backups, CSV, and entry deletion/Undo. Journal version 2 safely migrates earlier journals; older apps reject the new content version. Follow [the 0.6.0 checklist](android-testing.md#060-product-records-and-bleeding-observations).
- Implemented in 0.7.0: independent optional sexual-activity, intensity, orgasm, and libido fields, plus one switch per field in readable CSV exports, all off for each new export. Excluded-only dates are omitted; free-text notes and symptom labels still export. Full encrypted backups preserve everything. Journal version 3 migrates versions 1/2 and requires 0.7.0+ to restore new backups. PDF-specific report controls remain part of milestone 4. Follow [the 0.7.0 checklist](android-testing.md#070-flooding-explanation-and-sexual-health-records).
- Implemented in 0.7.0: the owner-approved plain-language flooding definition, shown beside its choices. The instruction to add it and move forward authorizes this milestone; it does not establish another hardware test pass.
- Keep recorded data separate from prediction overlays, which require the later prediction work.

## Milestone 4: medication and doctor records

- Implemented in 0.8.0: medication/supplement names and dose labels; daily, selected-weekday, repeating on/off, and as-needed schedules; multiple local times; user-entered off-day/placebo labels for repeating packs. No regimen, dose, or pack length is prescribed by the app.
- Implemented in 0.8.0: Taken, Skipped, and user-marked Taken late records, actual amount/date/optional time, as-needed reasons and dose notes, editing, confirmed removal/Undo, and complete exports. Unrecorded doses are not inferred missed or taken. No adherence percentage or lateness threshold is calculated.
- Implemented in 0.8.0: dated user-entered dose/schedule changes, pauses/resumption, and schedule history. Changes start today or later and after existing dose records; latest unused schedules can be corrected on the same effective date. These are recording tools for an existing plan, not automatic titration advice. Follow [the medication checklist](android-testing.md#080-medication-schedules-and-dose-records).
- Implemented in 0.9.0: individually enabled, discreet local medication notifications, permission and blocked-channel handling, test notification, cancellation/rescheduling after saved plan or dose changes, and cleanup on journal replacement/deletion. Choices are device-local and off after restore. The rolling queue covers up to 30 days / 60 distinct dose times, shows the refresh deadline, and includes an unlock-to-refresh notice. Local times refresh on unlock/foreground/manual refresh; actual delivery and background behavior remain [device checks](android-testing.md#090-medication-reminders). Browser and sample journals do not send alerts.
- Implemented in 0.18.0: dedicated journal/patch/ring/injection/refill/appointment/custom reminder plans and reviewed retrospective schedule corrections. Existing dose snapshots remain unchanged; no adherence or missed-dose inference is added.
- Implemented in 0.10.0: doctor summaries and locally generated PDFs, with a date range up to 366 days, independent section choices, and review before export. Includes recorded cycle/bleeding spans, flow, clot/flooding observations, products, symptoms, moods, overlapping medication plans, and recorded doses. Notes and each sexual-health field start off for each new report. Phone sharing/offline behavior remains in [the device checklist](android-testing.md#0100-doctor-summaries-and-pdf-export). No journal-format change.
- Implemented in 0.18.0: optional lab/medical records and observation/test sections in reports. Reviewed clinical discussion prompts remain a separate dependency. Broader font/script coverage and tagged PDF accessibility remain release work.
- The clot-logging dependency is implemented in 0.6.0 as a daily Yes/No/Not logged observation and included in 0.10.0 reports when selected; clinical interpretation and any more detailed clot measurements need separate design/review.

## Milestone 5: predictions and everyday education

- Implemented in 0.11.0: recorded selected-day context and nine browsable, offline education topics covering cycle/hormone basics, symptoms, hormonal-treatment limitations, and perimenopause. Each topic links to its public health sources. Personal phase remains undetermined, and future dates receive no projected day count. The perimenopause preference hides its dedicated topic. This completes the first educational slice, not all of milestone 5.
- Implemented experimentally in 0.12.0: optional period-start calculation with session-only opt-in/context/completeness review, seven recent starts, a fixed median method, explicit withholding/expiry, and chronological earlier-entry checks against three comparison methods. No calendar overlays or automatic entries. [Method, product limits, and reproducible synthetic results](period-estimates.md) are documented. This is not independently clinically validated; historical spread is not a confidence interval.
- Before general prediction release: independent clinical/editorial review and consented/licensed external-data validation of the full policy, including error, availability, irregular-history behavior, and calibration before claiming probabilities. Broader prediction work must not hold up the independent appearance milestone.
- Research update, October 11: [evidence, dataset candidates and evaluation protocol](prediction-research-2026-10-11.md) plus `pnpm research:predictions` now test the full existing policy on synthetic histories, including cold starts, withheld dates and unknown outcomes. This does not establish clinical accuracy or change the production method. Period-start forecasting is first; measurement-assisted phase/ovulation work remains separate.
- Dataset follow-up: `pnpm research:benchmark` validates normalized histories and isolates participant groups; `pnpm research:audit-zenodo` verifies the reviewed original file and emits structural counts. The [intake record](prediction-benchmark.md) documents duplicates, ordering, licensing and missing context. Weighted comparisons remain research-only; development results are recorded in the subsequent controlled-comparison step.
- Record preparation: `pnpm research:prepare-zenodo` creates reproducible source-faithful files for 128 development, 28 calibration and 42 test participants. Exact duplicates are collapsed, long intervals retained, context kept unknown, and birth annotations isolated from predictor inputs. The [fixed plan and preparation receipt](prediction-record-preparation.md) were completed before external scoring.
- Controlled comparison: `pnpm research:compare-zenodo` implements the fixed methods, matched-case metrics and paired participant bootstrap. The [development report](prediction-controlled-comparisons.md) retains extreme recorded gaps and evaluates 8,068 offered/observed cases. Reference median/weighted MAEs are 4.862/4.924 days under explicit eligibility assumptions; this does not establish app accuracy.
- Held-out completion: a separate runner frozen in `a643590` evaluated calibration (28 people, 1,436 scored cases) and then final test once (42 people, 1,989 cases). Final-test median/weighted MAEs are 5.666/5.727 days; the paired weighted-minus-median contrast is +0.06083 days (95% participant-bootstrap interval +0.01090 to +0.09979). [Separate reports and limitations](prediction-heldout-results.md) are saved. No tuning or production change followed. Repeated commands verify saved results without rescoring; all source groups are now examined, so future confirmatory work needs new unexamined records.
- Later in this milestone: personal phase/ovulation estimates and phase-specific daily context only with appropriate evidence and clear unknown states. General education cards do not establish a user's phase, hormone level, mood, or energy.
- Educational copy was checked against public health sources for 0.11.0; independent clinical/editorial review and medication-context validation remain required before release. The source feedback prioritizes self-understanding and empathy; it does not authorize partner access or sharing.
- Offer measured lab results alone or beside clearly labeled typical curves when available, preserving hormonal-medication context. Resolve the brief's dashboard/visual staging mismatch before presenting estimates.

## Extended local features and later milestones

- Implemented in 0.18.0: bloodwork with units, lab-provided reference ranges, encrypted attachments, dated same-test/unit history and draw-date cycle context. Educational typical-curve overlays retain their separate review dependency.
- Implemented in 0.18.0: appointments, doctor questions, diagnoses/procedures/allergies and the structured daily symptom/lifestyle/test observations identified in the source review.
- Implemented in 0.18.0: guided past periods and the strict simple CSV template importer. Vendor-specific mappings still require actual export samples; no universal import promise.
- Beautification and personal appearance: see the dedicated scope below. Implemented in 0.18.0: a static Android home-screen widget that opens the normal lock flow without displaying health data.
- Optional end-to-end encrypted sync, initially measured on a free tier; key recovery, conflict resolution, deletion propagation, and funding must be designed before public release.
- iOS device validation, store metadata, pricing, accessibility review, and release testing.

## Beautification and personal appearance

Explicitly reaffirmed by the owner after medication logging, following screenshot 6 and source comment `AAACIGIsKnU` in [the source review](source-review-2026-10-09.md). The owner liked the initial visual proposals and approved all twelve background images and six additional named palettes on October 9, 2026: “Looks good, these are approved.” [Design record](design/appearance-proposal.md) · [Approved artwork](design/backgrounds/README.md).

- Implemented in **preview 0.13.0**: Plum, Sage, Ocean, Buttercup Morning (yellow), Apricot Blossom (orange), Lavender Haze, Rosewater (pink), Bluebell Mist (pastel blue), and Silver Moon (light charcoal). System/Light/Dark appearance applies throughout setup, calendar, entries, history, medications, and settings.
- Implemented: two approved images per new palette, bundled for offline use, with any palette/image pairing. Plain and Soft wash remain available; visibility runs from 0–60% in 5-point steps. Reading surfaces stay opaque, flow semantics stay independent of palette, and Reset appearance restores Plum/System/Plain/25%.
- Implemented: versioned device-local appearance preferences separate from encrypted journal content and exports. Sample changes are temporary and restore the device's choices on exit. Read/write errors are recoverable without blocking the journal. Artwork appears only in unlocked content.
- The existing navigation and layout remain. Broader typography/spacing/layout beautification is still open; none of the three alternative layouts has been selected as a replacement. **Present new visual choices for approval before implementation.** General permission to continue does not approve unseen designs.
- Implemented in **preview 0.14.0**: the approved personal-image choose/preview/apply/replace/remove flow, with JPEG/PNG limits, orientation normalization, metadata removal, encrypted device-local storage, recoverable storage errors, and lock/sample isolation. Reset appearance, journal replacement, and journal deletion remove the app's photo copy. The original stays unchanged; photos are excluded from backups and reports. See [the storage design](architecture.md#personal-photo-backgrounds-0140).
- The owner reported phone validations passed for 0.13.0 and subsequently reported “Phone test passed. Move on” after 0.14.0 on October 10. Keep larger text, TalkBack, system appearance, persistence, offline use, folding and rotation in regression, alongside the [photo checks](android-testing.md#0140-personal-photo-backgrounds). These are reported passes, not independently witnessed per-device measurements.
- Preserve the modest upfront purchase model. No subscription, cosmetic upsell, or paid theme tier is authorized.

## Product constraints

Preview numbering continues as 0.10.0, 0.11.0, and so on. Completing a development milestone does not trigger 1.0. A public 1.0 requires an explicitly agreed release scope and readiness decision after feature, device, privacy/security, accessibility, and store work. The owner reaffirmed continuing preview development after raising this concern.

Android is the initial priority. Computer access uses the responsive web version. The core remains usable without an account or sync. The planned initial business model is a modest upfront app purchase; hosted sync entitlements and exact prices remain undecided.

Comments criticizing intrusive upsells reinforce a calm interface. Suggestions about cosmetic premium options, ads, and partner understanding do not authorize ads, subscriptions, premium tiers, or partner sharing.

Predictions and hormone education must not be presented as measured physiology, a diagnosis, or reliable contraception. Medical explanatory copy in the ideation document must be reviewed before publication rather than copied as established fact.
