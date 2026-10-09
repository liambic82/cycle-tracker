# Development plan

The [October 9 source review](source-review-2026-10-09.md) reconciles the original brief, all ten comments, and all nine screenshots against preview 0.3.0. It records detailed gaps and dependencies; source stage numbers remain suggestions.

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
- Next slice: individually enabled, discreet medication notifications, with native permission handling, cancellation/rescheduling on plan changes, time-zone behavior, and real-device delivery checks. Keep the app usable when reminders are off or unavailable.
- Later medication refinements: dedicated patch/ring/injection/refill reminders and broader retrospective schedule editing with explicit record reconciliation.
- Doctor summary and PDF export based on recorded data, with a date range, selectable sections, and preview before export. Include medications and labs only as their records become available.
- The clot-logging dependency is implemented in 0.6.0 as a daily Yes/No/Not logged observation. Future reports can include it as recorded; clinical interpretation and any more detailed clot measurements need separate design/review.

## Milestone 5: predictions and everyday education

- Carefully labeled typical/personal prediction ranges, with agreed minimum history, outlier handling, and validation for irregular cycles.
- Everyday tip cards for cycle-day/phase context, possible hormone changes, and tentative explanations of mood, energy, sleep, and appetite. Unknown phase must remain possible; calendar estimates are not measured hormone levels.
- Review educational copy and medication effects before release. The source feedback prioritizes self-understanding and empathy; it does not authorize partner access or sharing.
- Offer measured lab results alone or beside clearly labeled typical curves when available, preserving hormonal-medication context. Resolve the brief's dashboard/visual staging mismatch before presenting estimates.

## Later milestones

- Bloodwork with units, lab-provided reference ranges, attachments, and draw-date context.
- Appointments, doctor questions, medical-history records, and the remaining structured symptom/lifestyle inputs identified in the source review.
- CSV/other-app import feasibility based on actual export formats; no universal import promise.
- Dark mode, customizable colors, and optional backgrounds that preserve legibility and useful screen space; later home-screen widget.
- Optional end-to-end encrypted sync, initially measured on a free tier; key recovery, conflict resolution, deletion propagation, and funding must be designed before public release.
- iOS device validation, store metadata, pricing, accessibility review, and release testing.

## Product constraints

Android is the initial priority. Computer access uses the responsive web version. The core remains usable without an account or sync. The planned initial business model is a modest upfront app purchase; hosted sync entitlements and exact prices remain undecided.

Comments criticizing intrusive upsells reinforce a calm interface. Suggestions about cosmetic premium options, ads, and partner understanding do not authorize ads, subscriptions, premium tiers, or partner sharing.

Predictions and hormone education must not be presented as measured physiology, a diagnosis, or reliable contraception. Medical explanatory copy in the ideation document must be reviewed before publication rather than copied as established fact.
