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

## Working preview: 0.5.0

The first implemented milestone uses React Native, Expo SDK 57, and TypeScript for Android, iOS, and browsers. It includes:

- Year, continuously scrolling month, and daily journal views with a shared selected date, past-date entry, and recorded cycle-day labels.
- Daily flow, explicit period start/end markers, grouped and custom symptoms, cramp severity, and notes.
- The full source symptom catalog (99 choices), searchable categories, a dedicated less-common browser, and quick choices. Logged symptoms remain visible across categories.
- An encrypted preference to hide curated perimenopause choices without removing existing logs or custom symptoms.
- Cycle-length and bleeding-duration charts with average, shortest, and longest recorded values. Incomplete cycles remain unknown.
- Flow strips inside each cycle, distinguishing bleeding, spotting, explicitly recorded no flow, and unlogged days. Clearing a flow log preserves other daily details.
- A passphrase-encrypted local journal, autosave, manual locking, and background locking after a minute.
- Encrypted backup/restore and readable CSV export.
- Daily entry deletion with session-only Undo, and confirmed deletion of the whole local journal.
- Native screen capture prevention and app-switcher protection, enabled before opening the journal. Browsers cannot prevent screenshots.
- Optional biometric unlock in the installed mobile app, using an OS-protected copy of the encryption key. Passphrase fallback and backup recovery remain available; browsers continue to use the passphrase.
- A separate fictional sample journal; demo edits are never saved to the real journal.
- Responsive desktop and phone layouts, plus a cached offline browser shell in the production web build.

This is a development preview, not a finished store release. Medication schedules, notifications, additional structured symptom/lifestyle fields, PDF doctor summaries, bloodwork, and optional sync are still pending. Preview 0.5.0 needs device validation. Symptoms, visibility, and biometrics in 0.4.0 have an owner-reported functional pass; keep them in regression testing. See [the development plan](docs/development-plan.md).

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

## Verification and phone builds

```sh
pnpm check
pnpm build:all
```

`check` runs TypeScript and the domain/storage tests. `build:all` verifies web JavaScript and Android/iOS Hermes bundles; it does not create or test an APK or IPA.

`scripts/build-android-preview.ps1` builds a standalone APK using the Android SDK installed on this Windows computer. It creates a separate **Cycle Tracker Preview** app and uses a private local preview signing key. See [Android installation and testing](docs/android-testing.md) for the build command, signing-key location, and device checklist.

`eas.json` also defines a cloud preview APK profile and a production store profile for future use. No EAS project has been created and no cloud build or deployment has been requested. `app.config.ts` selects the preview identifier when `APP_VARIANT=preview`; the store identifier remains provisional.

## Data handling

The local vault uses AES-256-GCM with a fresh secure random nonce on each save, and a key derived from the passphrase using PBKDF2-SHA256. The passphrase is not stored. AsyncStorage holds encrypted journal content and, when enabled, a non-secret biometric reference; the optional unlock key is protected separately by the OS and requires biometric authentication. There is no server or analytics integration. Browser editing is restricted to one unlocked tab to prevent conflicting writes.

There is no passphrase reset. Keep the passphrase and a separate encrypted backup. CSV exports are deliberately readable. Browser storage can be cleared or evicted. This early implementation still needs native-device testing and a security review before real health data or a public launch. See [architecture and security notes](docs/architecture.md) and [the validation record](docs/validation.md).

## Decisions still open

- Native-device validation and a future sync provider.
- Whether automatic sync ships in the first release and how it is priced.
- Exact first-release feature scope, including the hormone estimates and clot logging dependencies noted in the brief.
- Attachment limits and hosting budget, informed by measured use of lab-report photos and PDFs.

No hosting service, paid service, or store release has been set up.
