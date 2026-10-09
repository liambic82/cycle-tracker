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

The first visual-history portion is implemented in preview 0.5.0 and awaits hardware validation. Daily-detail extensions remain the next development slice.

Before extending daily detail, validate the 0.5.1 passphrase fix. The owner reported a creation spinner lasting over a minute on Galaxy Z Flip5 with 0.5.0. Native Android key calculation and setup progress/deadline handling are implemented in 0.5.1; the device retest remains pending. Use [the focused checklist](android-testing.md#051-passphrase-fix-checks) before resuming new features.

Preview 0.5.2 additionally enables testing screenshots and adds passphrase show/hide controls at the owner's request. It includes the 0.5.1 fix; test both with [the 0.5.2 checklist](android-testing.md#052-screenshots-and-passphrase-controls).

Preview 0.5.3 addresses the owner’s concern about accidental deletion from the entry footer. Deletion now requires opening Entry options beside the date, then confirming; the footer explains autosave and displays its current status. Follow [the 0.5.3 checklist](android-testing.md#053-entry-options-and-autosave) alongside the outstanding Flip5 setup and 0.5.2 checks before continuing daily-detail features.

- Implemented in 0.5.0: year/month/day navigation with a consistent selected date, compact annual overview, recorded cycle-day context, and continuous month scrolling.
- Implemented in 0.5.0: cycle-length and bleeding-duration charts with average, shortest, and longest values. Incomplete records remain unknown and are excluded from statistics.
- Implemented in 0.5.0: chronological flow strips within cycle-history rows, with separate treatment for bleeding, spotting, explicitly recorded no flow, and unlogged days. Older entries without explicit flow information remain unknown.
- Add optional product-event records (type, amount/count, changes or cup emptying, and time), plus clots/flooding where appropriate.
- Add optional sexual-activity, intensity, orgasm, and libido fields with independent report inclusion controls.
- Keep recorded data separate from prediction overlays, which require the later prediction work.

## Milestone 4: medication and doctor records

- Medication and supplement definitions, dose times, on/off schedules, birth-control packs, and as-needed doses.
- Taken/skipped/late logging and individually controlled, discreet reminders.
- User-entered titration/dose-change schedules, side-effect notes, and later patch/ring/injection/refill reminders.
- Doctor summary and PDF export based on recorded data, with a date range, selectable sections, and preview before export. Include medications and labs only as their records become available.
- Resolve the brief's clot-logging/doctor-summary dependency before including structured clot data.

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
