# Development plan

## Milestone 1: private daily journal

Implemented in the 0.1 preview: calendar, daily flow and explicit start/end markers, selected symptom categories, custom symptoms, cramp severity, notes, recorded cycle history, encrypted local vault, backup/restore, CSV export, and responsive browser UI.

The full source brief remains the feature reference. Its version labels are provisional, and this milestone does not claim to implement every feature marked V1.

## Milestone 2: Android daily-use build

The owner reported successful Pixel 7 testing on Android 17 for previews 0.1.0 and 0.2.0 on October 9, 2026. The 0.2.0 response was “Testing complete, all pass.” Flip5 validation remains pending.

Preview 0.2.0 added entry deletion with session-only Undo, confirmed deletion of the local vault, and native screen capture/app-switcher protection. Preview 0.3.0 adds optional biometric unlock using an OS-protected key, with passphrase fallback, cancellation/invalidation handling, and cleanup during restore/deletion.

- Validate the 0.3.0 update on the Pixel 7 and the first installation on Galaxy Z Flip5, following [the device test guide](android-testing.md).
- Record OS versions; test input, accessibility text sizes, storage, backup sharing, and fold/reopen state.
- Measure passphrase unlock time and journal write performance on real hardware.
- Verify background locking, native app-switcher privacy, keyboard behavior, and recovery after app termination.
- Expand the symptom catalog from the source requirements; distinguish user-added labels from curated categories.
- Keep deletion/Undo, whole-journal deletion, backups, and update-in-place retention in the regression pass.
- Validate native biometric enrollment, cancellation, invalidation, disable, restart, and passphrase fallback on hardware. The full symptom catalog is the next feature slice.

## Milestone 3: medication and doctor records

- Medication and supplement definitions, dose times, on/off schedules, birth-control packs, and as-needed doses.
- Taken/skipped/late logging and individually controlled, discreet reminders.
- Doctor summary and PDF export based on recorded data.
- Resolve the brief's clot-logging/doctor-summary dependency before including structured clot data.

## Later milestones

- Carefully labeled prediction ranges, with agreed minimum history and validation for irregular cycles.
- Bloodwork with units, lab-provided reference ranges, attachments, and draw-date context.
- Educational phase/hormone visuals with medication context, separated from measured lab values. Resolve the brief's dashboard/visual staging mismatch first.
- Optional end-to-end encrypted sync, initially measured on a free tier; key recovery, conflict resolution, deletion propagation, and funding must be designed before public release.
- iOS device validation, store metadata, pricing, accessibility review, and release testing.

## Product constraints

Android is the initial priority. Computer access uses the responsive web version. The core remains usable without an account or sync. The planned initial business model is a modest upfront app purchase; hosted sync entitlements and exact prices remain undecided.

Predictions and hormone education must not be presented as measured physiology, a diagnosis, or reliable contraception. Medical explanatory copy in the ideation document must be reviewed before publication rather than copied as established fact.
