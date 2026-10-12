# Android usability feedback — October 12, 2026

The owner relayed initial tester feedback and clarified the sleep issue. This record retains product observations only; personal conversation, health records and the remote screenshot are not copied into Git.

## Reported experience

- The tester installed the latest available preview, entered historical periods and created a backup. The exact installed build and OS were not independently confirmed in this report. Creating a backup does not establish a successful restore.
- Historical period entry felt like a day-by-day chore. The main request was to enter start and finish together, add flow details later and repeat easily for a year's history.
- Sleep import took several attempts to understand. The owner clarified that importing nights one at a time was the main problem.
- These are partial functional observations with usability failures, not a consolidated phone-test pass. The last reported broad pass remains 0.15.0; the complete Android checklist remains open.

## Changes in preview 0.19.0

**Period entry:** Calendar → Add period opens a single form with start/finish date pickers, quick month/year navigation, optional flow, Save and Cancel. Your data also offers Add period separately from CSV import. After a successful addition, Add another period starts a fresh form in the same month; returning to the calendar selects the added start. Start-only and single-day records are supported. A selected closed range explicitly records bleeding on each included day, with one start and one finish; unknown flow level is stored as `unspecified`, never guessed as medium. Known daily flow, notes, symptoms, sleep and other fields are retained. Conflicting no-flow/spotting logs and overlapping period boundaries stop the whole addition. Duplicate spans add no duplicates. The UI and reports distinguish unspecified intensity from no flow or unlogged days.

**Sleep import:** the only source is selected automatically when exactly one is returned; multiple sources remain an explicit choice. Select individual nights or Select all new nights, review the chosen sessions, then import them in one transaction. Updated sessions require individual selection and a replacement warning; already-imported/older/future sessions cannot be selected. Selection resets when source/range changes or previews clear. The review shows source-local dates/times, hours/minutes and missing-stage qualifications, with overlap warnings. Copies stay separate from manual values and from each other. View saved sleep nights opens journal history directly. One invalid or stale record, daily limit or vault-size failure prevents the whole batch being applied.

Journal content is **format 9**. Formats 1–8 migrate; earlier values and encryption/key handling remain unchanged. New backups need **0.19.0+** on the receiving app because earlier parsers cannot represent unspecified bleeding intensity. CSV exports retain the explicit `unspecified` value; reports use readable wording. The old boundary-only helper remains available for reproducing earlier research/tools, but it is no longer the period-entry UI.

These are functional entry/import fixes using the existing approved appearance. No new palette, background or general beautification is included. Prediction rules and disclaimer remain; no new research evaluation, cloud sync or background import is introduced.

## Focused phone retest

Use the [0.19.0 checklist](android-testing.md#0190-period-ranges-and-bulk-sleep-import) with the consolidated checks. Confirm easier period catch-up, multi-night import, update-in-place retention, backup/restore, native navigation, larger text and the Fitbit source on the actual paired phone. Automated and browser findings are in [validation evidence](validation.md).
