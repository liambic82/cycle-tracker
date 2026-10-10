# Cycle Tracker App

A personal period and perimenopause tracker centered on a continuously scrolling calendar, daily symptoms, medication tracking, and useful records for doctor visits.

## Product brief

The [initial feature requirements](https://docs.google.com/document/d/1tOEpyA0x_Q6Up33TXy3rcdgS_-YiQC6e1BDU2acZduM/edit) are the starting point for planning. The document's version labels are suggestions, not a fixed release scope.

The [October 9 source review](docs/source-review-2026-10-09.md) incorporates all ten comments and nine reference screenshots, including calendar view choices, richer daily logging, configurable doctor reports, and everyday education.

## Agreed direction

- Prioritize Android for the initial user.
- Plan for eventual publication in Google Play and the Apple App Store.
- Support use on a computer as well as on a phone.
- Launch with a modest upfront purchase price; the exact price is still to be decided.
- Keep the core app fully usable offline, without requiring cloud sync.
- Include export, backup, and restore so users can retain and transfer their records.
- Make automatic cross-device sync optional, with end-to-end encryption if enabled.
- Evaluate sync on a free hosting tier during development and measure actual usage.
- Decide how to fund ongoing sync costs before public release. An upfront app purchase does not yet promise unlimited hosted sync.

## Initial device testing

| Device                 | Testing role                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| Samsung Galaxy Z Flip5 | Initial user's daily use, usability feedback, and foldable behavior |
| Google Pixel 7         | Developer-owner's functional testing and regression checks          |

On both phones, check calendar navigation, daily logging, offline persistence, medication reminders, app locking, and backup/restore as those features become available. Check larger text settings, keyboard interaction, rotation, and returning to the app after it has been in the background.

For the Flip5, verify that closing and reopening the phone preserves the selected day, calendar position, and any in-progress entry. Check the main-screen layout when fully open and partially folded, following [Android's foldable design and app continuity guidance](https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables/learn-about-foldables).

The owner reported that previews 0.1.0 and 0.2.0 passed testing on the Pixel 7 running Android 17 on October 9, 2026. The 0.2.0 response was “Testing complete, all pass.” The owner then confirmed biometrics functioning as expected in 0.3.0 in the same test context. Individual biometric edge-case results and timings were not supplied. Flip5 testing and its Android/One UI versions are still pending.

The owner subsequently confirmed that symptoms, visibility, and biometrics work in 0.4.0 in the same Pixel 7 / Android 17 context. This functional report does not individually validate every edge case in the device checklist.

The owner reported that creating a journal on Galaxy Z Flip5 in 0.5.0 stayed on the creation spinner for over a minute. Preview 0.5.1 addresses the likely JavaScript key-calculation bottleneck with native Android cryptography, progress messages, and a bounded calculation. Confirmation on the Flip5 is pending; its Android/One UI versions have not been reported.

## Working preview: 0.16.0

The first implemented milestone uses React Native, Expo SDK 57, and TypeScript for Android, iOS, and browsers. It includes:

- Year, continuously scrolling month, and daily journal views with a shared selected date, past-date entry, and recorded cycle-day labels.
- **Explore cycle context** from the calendar or a daily entry: recorded day/flow context and nine browsable education topics, with bundled offline text and links to public health sources. General hormone information is separate from the selected day's records; personal phase stays undetermined. Hiding perimenopause choices also hides its dedicated education topic.
- **Explore period estimate** is optional and experimental. It requires seven recent recorded starts, a review of completeness/current context, and acceptable historical checks. It shows the fixed median method, historical spread, and earlier-entry errors; estimates expire without rolling forward. Choices reset when leaving. No predicted bleeding is added to the calendar, and this is not clinically validated or usable as contraception. See [method and validation limits](docs/period-estimates.md).
- Daily flow, explicit period start/end markers, grouped and custom symptoms, cramp severity, and notes.
- Optional 0–10 severity for every logged symptom through **Rate symptoms**, including custom and mood labels. Not rated differs from an explicit 0; clearing a rating keeps the symptom. **History → Explore symptom history** provides searchable labels, 30/90/365-day ranges, fixed-scale dated bars and links to entries. Ratings follow the selected symptom/mood sections in doctor summaries and are included in journal CSV and encrypted backups.
- Optional **Sleep details** records estimated time asleep, subjective quality and night wakings for the main sleep ending on that date, including daytime sleep. Each field can remain unlogged; 0 is explicit. The form saves only with **Save sleep details**, and Cancel preserves the saved record. **History → Explore sleep history** has 30/90/365-day ranges and links to dated entries. Sleep has its own doctor-summary section and three CSV columns, and is retained in encrypted backups. Wearable import is planned next, starting with Fitbit through Android Health Connect; it is not connected in this preview.
- Optional **Products & bleeding details** for pads, tampons, cups, discs, period underwear, liners, and other products. Records include use/change/emptying, quantity, optional local time, type/size, and observed cup/disc amount. Editing, confirmed removal, and Undo are available.
- Clot and flooding observations distinguish Yes, No, and Not logged. These details do not infer flow, cycle boundaries, or blood-loss estimates, and clearing flow preserves them.
- A short explanation beneath **Flooding noticed?** defines the term where it is logged.
- Optional sexual activity, activity intensity, orgasm, and libido records. Each field is independent, autosaves, and distinguishes unlogged values from explicit No/None. Daily summaries say only that details are logged.
- Medication and supplement definitions with daily, selected-weekday, repeating on/off, and as-needed schedules. Users enter dose labels and local times; on/off schedules can include a user-entered placebo/off-day label. Dated changes and pauses preserve earlier schedule history.
- Daily dose records with Taken, Skipped, or user-marked Taken late, actual amount/date/optional time, and a reason or note. Unrecorded doses stay unknown. Records retain their original planned dose/name, can be edited, and have confirmed removal with Undo. Schedule and dose forms save explicitly.
- Optional medication reminders in the installed mobile app, using saved schedule times and discreet text. Each medication is off initially; permission, test delivery, refresh, and turn-off controls are in Medications. Plan/dose changes update pending alerts. Reminders queue up to 30 days / 60 distinct times, show when to unlock to renew them, and send a refresh notice. Unlock after a time-zone change. Phone settings can delay or silence delivery; hardware validation is pending. Browser and sample journals do not send notifications.
- The full source symptom catalog (99 choices), searchable categories, a dedicated less-common browser, and quick choices. Logged symptoms remain visible across categories.
- An encrypted preference to hide curated perimenopause choices without removing existing logs or custom symptoms.
- Cycle-length and bleeding-duration charts with average, shortest, and longest recorded values. Incomplete cycles remain unknown.
- Flow strips inside each cycle, distinguishing bleeding, spotting, explicitly recorded no flow, and unlogged days. Clearing a flow log preserves other daily details.
- A passphrase-encrypted local journal, autosave, manual locking, and background locking after a minute. Android 8+ uses background native passphrase key calculation; browsers use Web Crypto. Existing passphrases and backup format are preserved.
- Encrypted backup/restore and readable CSV export. Each sexual-health column requires a separate choice for each CSV export, with all four off initially. Dates containing only excluded fields are omitted; notes and symptom labels remain included. Encrypted backups always retain the full journal.
- Journal CSV includes recorded doses and their notes. A separate readable CSV contains complete dated medication schedule history; encrypted backups retain both.
- Doctor summaries under **Your data**, with a date range, selectable sections, an on-screen preview, and printable PDF export. Include recorded cycles, flow/bleeding observations, products, symptoms, moods, medication schedules, and doses. Notes and each sexual-health field start off for every new report. PDFs are generated locally with bundled fonts and contain readable, unencrypted information.
- Daily entry deletion inside the date header’s Entry options menu, with confirmation and session-only Undo. The entry footer explains autosave and shows the actual save status. Whole-journal deletion remains separately confirmed.
- Screenshots enabled in testing previews, as requested by the owner. Store builds retain native capture prevention; browsers cannot prevent screenshots.
- Show/hide eye controls for passphrase setup, confirmation, unlock, and restore. Each field starts hidden and hides again on submission or backgrounding.
- Optional biometric unlock in the installed mobile app, using an OS-protected copy of the encryption key. Passphrase fallback and backup recovery remain available; browsers continue to use the passphrase.
- A separate fictional sample journal; demo edits are never saved to the real journal.
- Responsive desktop and phone layouts, plus a cached offline browser shell in the production web build.

This is a development preview, not a finished store release. Versions can continue through 0.16.0 and beyond; **1.0 requires an explicitly agreed release scope and readiness decision**, including device, security, accessibility, and store preparation. Broader prediction validation, personal ovulation/phase estimates, specialized patch/ring/injection/refill reminders, wearable import, the remaining structured symptom/lifestyle fields, bloodwork, further layout beautification, and optional sync are still pending. The app records user-entered schedules; it does not calculate or recommend dosing. Preview 0.16.0 retains the Flip5 creation fix, testing screenshots, passphrase eyes, and safer entry deletion. The owner reported phone tests passed after 0.13.0, 0.14.0 and 0.15.0. New sleep checks and regression checks for severity, photos, reminders, PDF sharing and estimate controls remain in [the device guide](docs/android-testing.md). See [the development plan](docs/development-plan.md) and [education sources and prediction boundaries](docs/cycle-education.md).

Doctor reports support up to 366 days per export. Excessively large reports request a shorter range or fewer sections rather than silently dropping records. The bundled font supports Latin, Greek, and Cyrillic text; unsupported scripts or emoji stop PDF export with an explanation. Journal content and CSV export remain intact. Reports include recorded information only, with no predictions, clinical interpretation, or lab results yet. Free-text labels and selected notes are not automatically redacted.

Journal content is now format 6 to preserve optional sleep details. Format 1–5 journals and backups migrate on opening with sleep fields unlogged. Existing symptom ratings, cramps, medications, doses and other observations are preserved; fields absent from older formats remain unknown or empty. New backups require 0.16.0 or later; update the receiving app before transferring them. The encrypted envelope, passphrase, and biometric key are unchanged.

Appearance is available under **Your data → Customize appearance** in preview **0.14.0**: nine palettes, System/Light/Dark, twelve approved built-in backgrounds, Plain/Soft wash, a visibility slider, and reset. Choices save on this device; sample choices are temporary. Installed artwork works offline. Personal JPEG/PNG photos can be previewed, applied, replaced and removed; a smaller copy is encrypted on the device and hidden while locked. Reset and journal replacement/deletion remove the copy, leaving the original untouched. Appearance and photos stay out of journal backups and reports. [Artwork gallery](docs/design/backgrounds/README.md) · [Device checklist](docs/android-testing.md#0140-personal-photo-backgrounds).

## Run locally

Use Node.js 24 LTS and pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
pnpm web
```

The web development server normally opens at http://localhost:8081. Choose **Explore with sample data** to review the experience without setting up a journal. The development server needs a connection to this computer; it is not the offline production build.

On this Windows workspace, if pnpm is not on PATH, `./scripts/pnpm.ps1` reuses the available desktop runtime. For example:

```powershell
.\scripts\pnpm.ps1 web
.\scripts\pnpm.ps1 check
```

To build and preview the offline browser version:

```sh
pnpm build:web
pnpm preview
```

Open http://127.0.0.1:4173. Load it once while connected so its app shell can be cached. Real hosting requires HTTPS for encryption APIs, browser edit locks, and the service worker. A browser vault belongs to its exact origin; localhost, 127.0.0.1, different ports, and a future public domain do not share data. Transfer it using encrypted backup/restore.

After a browser update, load the app while connected, then close every app tab for that address and reopen it so the new offline shell can activate. An older open tab can keep the previous offline version active. Do not clear site storage to update: it contains the encrypted journal.

## Verification and phone builds

```sh
pnpm check
pnpm build:all
```

`check` runs TypeScript and the domain/storage tests. `build:all` verifies web JavaScript and Android/iOS Hermes bundles; it does not create or test an APK or IPA.

`scripts/build-android-preview.ps1` builds a standalone APK using the Android SDK installed on this Windows computer. It creates a separate **Cycle Tracker Preview** app and uses a private local preview signing key. See [Android installation and testing](docs/android-testing.md) for the build command, signing-key location, and device checklist.

`eas.json` also defines a cloud preview APK profile and a production store profile for future use. No EAS project has been created and no cloud build or deployment has been requested. `app.config.ts` selects the preview identifier when `APP_VARIANT=preview`; the store identifier remains provisional.

## Data handling

The local vault uses AES-256-GCM with a fresh secure random nonce on each save, and a key derived from the passphrase using PBKDF2-SHA256. The passphrase is not stored. AsyncStorage holds encrypted journal content, device-local reminder opt-ins (opaque medication IDs and the public vault salt, without names or schedules), and, when enabled, a non-secret biometric reference; the optional unlock key is protected separately by the OS and requires biometric authentication. Enabled reminders give the phone OS generic notification text and future timestamps, so those times exist outside the encrypted vault. No medication names, amounts, notes, or decryption keys go into notifications. Reminder choices are excluded from backups and reset on restore. There is no server or analytics integration. Browser editing is restricted to one unlocked tab to prevent conflicting writes.

There is no passphrase reset. Keep the passphrase and a separate encrypted backup. CSV and PDF exports are deliberately readable. Browser storage can be cleared or evicted. This early implementation still needs native-device testing and a security review before real health data or a public launch. See [architecture and security notes](docs/architecture.md) and [the validation record](docs/validation.md).

## Decisions still open

- Native-device validation and a future sync provider.
- Whether automatic sync ships in the first release and how it is priced.
- Exact first-release feature scope, including the hormone estimates and clot logging dependencies noted in the brief.
- Attachment limits and hosting budget, informed by measured use of lab-report photos and PDFs.

No hosting service, paid service, or store release has been set up.
