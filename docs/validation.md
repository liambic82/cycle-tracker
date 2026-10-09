# Validation record

## 0.4.0 owner report — October 9, 2026

The owner reported “Symptoms work well, visibility is good, and biometric is working.” This records a functional pass for those features in preview **0.4.0**, using the established Pixel 7 / Android 17 context. The report did not enumerate individual cancellation, import, accessibility, or other edge cases. Flip5 and iOS hardware validation remain pending. Earlier pending-device statements below describe the state when those checks were recorded.

## 0.5.0 calendar and visual history — October 9, 2026

Implemented year/month/day navigation, recorded cycle-day labels, cycle-length and bleeding-duration charts, all-history statistics, and chronological flow strips. Explicit no-flow observations are now separate from missing logs. Old positive-flow/spotting entries retain their observations; old default None values remain unknown. Vault envelope, passphrase, and biometric key are unchanged. CSV adds a final `Flow recorded` column.

- `pnpm check`: TypeScript and all **35 tests** passed. Seven new tests cover explicit None/clear-flow behavior, old journal migration and invalid flags, chronological run boundaries, long gaps/leap dates, actual-start cycle-day lookup, statistics with incomplete values and bounded end markers, and encrypted restore/CSV retention of the new distinction.
- Web, Android Hermes, and iOS Hermes production exports passed, including a rebuild after clarifying no-flow labels. TypeScript was checked after the final copy changes. Prettier and Git whitespace checks passed. The iOS result is a bundle check, not an IPA or device test.
- Browser checks used isolated `127.0.0.1:4174` and fictional data at 393 × 852 and 1280 × 720. Inspected mobile charts, annual tiles, desktop charts, desktop calendar/editor, and empty-history states. Sample cycle lengths were 30 and 29 days (average 29.5); the latest length remained incomplete. All three sample bleeding spans were 5 days.
- Verified year-month drilldown leaves the selected date unchanged, switching to Day view restores that selection, Today returns to today, invalid `2026-02-29` is rejected, and stepping forward from `2024-02-29` reaches March 1. Mobile month cells open the daily sheet. History-row buttons open the starting date in Day view. The symptom browser returns to the daily editor in that view.
- The previous fictional encrypted journal opened with its existing passphrase, three symptoms, and note intact. Its legacy default None correctly appeared as flow not logged. Explicit None survived lock/reload/unlock; clearing flow retained all symptoms and the note. Encrypted backup restore and CSV semantics were checked in automated tests; native file sharing/restore remain hardware checks.
- No captured browser console errors. The fictional vault was locked, sample mode exited, the test tab closed, viewport reset, and isolated preview server stopped. User storage on port 4173 was not used for these checks.
- Native update retention, biometrics, keyboard, TalkBack, large text, fold transitions, and offline restart need the [0.5.0 hardware checklist](android-testing.md#050-calendar-and-history-checks). No device pass is claimed for 0.5.0.

The signed ARM64 release APK built successfully. Signature and 16 KB zip-alignment verification passed; its signing certificate matches previous previews. Package identity is `com.liambic.cycletracker.preview`, version **0.5.0**, version code **5**, minimum API 24, target API 36, `USE_BIOMETRIC`, `allowBackup: false`, and no debuggable flag. The bundled Hermes program is 3,115,660 bytes.

- File: `artifacts/android/cycle-tracker-preview-0.5.0-arm64-v8a.apk` (29,920,070 bytes; excluded from Git).
- APK SHA-256: `222f7c6cf1c917278024bd8fa4064446f0a2566ae688c2bfcc0d2b4be956fd26`.
- Signing certificate SHA-256: `6e64159ed7656a5873b6f0379e74ef1c0a8bd6b1bbaba12e51cbd26355f75576`.

![Cycle-length chart at phone width](screenshots/history-mobile.jpg)

![Annual calendar at phone width](screenshots/calendar-year-mobile.jpg)

![Cycle-length chart on desktop](screenshots/history-desktop.jpg)

## 0.4.0 symptom catalog and preferences — October 9, 2026

Implemented 99 curated symptoms covering the source's four reference lists, category/search browsing, a less-common browser, selected-symptom summaries, quick choices, and an encrypted perimenopause visibility preference. All 30 original labels remain supported. Existing custom labels are retained when they overlap additions to the catalog. The preference defaults on for older backups; vault format, passphrase, and biometric key are unchanged.

- `pnpm check`: TypeScript and all **28 tests** passed. Six new tests cover old catalog labels, search/category visibility, case-insensitive custom collisions, older journal imports and malformed preferences, encrypted preference/entry round-trip with CSV retention, and selection limits without partial custom additions.
- Web, Android Hermes, and iOS Hermes production exports passed. TypeScript and the production exports were repeated after a browser accessibility correction; checkbox state and button pressed state are now explicitly exposed on web. Prettier and Git whitespace checks passed.
- Browser checks used the isolated `127.0.0.1:4174` test origin with fictional data. The previous preview's journal opened with its passphrase and original note intact. Logged Hot flashes, Itchy ears, and a custom fictional symptom; the selected-day summary retained all three and the note after locking/reloading/unlocking.
- Turning off perimenopause choices survived lock/reload/unlock, removed the curated category and its search results, and left the existing Hot flashes entry visible in the daily summary. Turning it on restored the category. Sample mode's visibility change disappeared after exiting/re-entering sample mode.
- Visually checked the symptom browser at 393 × 852 and 1280 × 720. Confirmed scoped uncommon-symptom search, custom creation, empty search feedback, separate migraine-with/without-aura results, and checkbox checked/pressed states in the browser accessibility tree. No captured console errors. The test session was locked, its tab closed, the viewport restored, and the isolated preview server stopped.
- Encrypted restore and CSV retention for hidden symptoms were exercised in automated tests. Native keyboard, Android Back, TalkBack, large text, fold transitions, native backup sharing/restore, and biometric regression still require the [0.4.0 hardware checklist](android-testing.md#040-symptom-browser-checks). No owner device pass is claimed for this build.

The signed ARM64 release APK built successfully. APK signature and 16 KB zip-alignment verification passed; the certificate matches previous previews. Package identity is `com.liambic.cycletracker.preview`, version **0.4.0**, version code **4**, minimum API 24, target API 36, `allowBackup: false`, and no debuggable flag. The bundled Hermes program is 3,104,148 bytes.

- File: `artifacts/android/cycle-tracker-preview-0.4.0-arm64-v8a.apk` (29,908,558 bytes; excluded from Git).
- APK SHA-256: `88fb090ca31d1833b6ff9b8cc73bcfce7f373624e7b3a95f76f7c18e22e0260e`.
- Signing certificate SHA-256: `6e64159ed7656a5873b6f0379e74ef1c0a8bd6b1bbaba12e51cbd26355f75576`.

![Symptom browser at phone width](screenshots/symptoms-mobile.jpg)

![Symptom browser on desktop](screenshots/symptoms-desktop.jpg)

## 0.3.0 owner biometric report — October 9, 2026

The owner reported “Verified biometrics are functioning as expected.” This records a functional biometric pass for preview **0.3.0** in the established Pixel 7 / Android 17 test context. The report did not enumerate cancellation, changed enrollment, background races, restore/deletion, or other individual checklist results; those are not independently marked passed. Flip5 and iOS hardware validation remain pending. Earlier pending-device statements below describe the state when those checks were recorded.

## 0.3.0 biometric unlock — October 9, 2026

Implemented optional native biometric unlock, explicit opt-in/disable controls, authenticated OS key storage, passphrase fallback, and credential cleanup during journal creation, restore, and deletion. The portable encrypted-vault format is unchanged.

- TypeScript and all **22** tests passed. Nine new tests cover biometric round-trip and separation of key material from ordinary storage; cancellation/retry; missing or invalidated credentials with passphrase recovery; absent/malformed/mismatched references; stale/tampered protected keys; unsupported devices and canceled setup; persistence/cleanup failures; orphan cleanup without removing the journal; and key-based vault authentication.
- These biometric tests use a mocked protected-storage interface. They exercise the app's key-handling and recovery logic, not a physical biometric sensor or native prompt.
- Web, Android Hermes, and iOS Hermes production exports passed. Prettier and Git whitespace checks passed. The installed Expo dependency map reports compatible packages in offline mode; no fresh remote dependency audit was performed.
- Browser regression on the isolated `127.0.0.1:4174` origin confirmed a wrong passphrase stays locked and the existing fictional 0.2.0 journal still opens with its correct passphrase and note intact. Browser unlock remains passphrase-only. Settings were visually checked at 393 × 852 and 1280 × 720; no captured console errors. The test journal was locked, the test tab closed, and the viewport reset afterward.
- Native source/configuration checks confirm `SecureStoreModule` registration, authenticated reads/writes using a dedicated service, the iOS Face ID usage message, `USE_BIOMETRIC`, and Android backup rules excluding SecureStore. Native enrollment/prompt behavior, cancellation, app-background races, disabling, and restore/delete cleanup need the 0.3.0 hardware checklist.
- A standalone ARM64 release APK built successfully. Signature verification and 16 KB zip alignment passed. Package identity remains `com.liambic.cycletracker.preview`, version `0.3.0`, version code `3`, minimum API 24, target API 36, `allowBackup: false`, and no debuggable flag. The bundled Hermes program is 3,093,676 bytes. The signing certificate matches earlier previews, supporting installation as an update.

File: `artifacts/android/cycle-tracker-preview-0.3.0-arm64-v8a.apk` (29,898,086 bytes; excluded from Git).

APK SHA-256: `0d3fa4a24975e84d36fc258b450bf4588a65ed2c9205617b88e19b66eb152f6d`.

Signing certificate SHA-256: `6e64159ed7656a5873b6f0379e74ef1c0a8bd6b1bbaba12e51cbd26355f75576`.

![Browser settings regression](screenshots/biometric-browser-desktop.jpg)

![Browser settings at phone width](screenshots/biometric-browser-mobile.jpg)

## 0.2.0 owner test result — October 9, 2026

After receiving the 0.2.0 APK and its device regression checklist, the owner reported “Testing complete, all pass.” This is recorded as a pass for 0.2.0 in the established Pixel 7 / Android 17 test context. No additional device or timing measurements were supplied. Flip5 validation remains pending; this report does not establish iOS validation or an independent security audit.

## Pixel 7 owner report — October 9, 2026

The owner reported “Testing passed on Pixel 7” and confirmed Android **17**. This records the overall functional pass of preview **0.1.0**. Individual checklist results, timings, and security/accessibility findings were not supplied. Galaxy Z Flip5 testing remains pending. Earlier pending-device statements below describe the state at the time those historical checks were recorded.

## 0.2.0 privacy and data controls — October 9, 2026

Implemented daily entry deletion with session-only Undo, typed confirmation for deleting the local journal, and native screen capture/app-switcher protection. The vault format and passphrase remain compatible with 0.1.0.

- `pnpm check`: TypeScript and all 13 domain/storage tests passed. New tests cover complete entry restoration and history recalculation, preserving newer edits, draining pending saves before deletion, rejecting late writes, preserving unrelated storage, and recovery after failed writes/deletion.
- Web, Android Hermes, and iOS Hermes production exports passed. iOS export is a bundle check, not an IPA build or device test.
- Prettier formatting and Git whitespace checks passed.
- Browser checks used a separate origin (`127.0.0.1:4174`) with fictional data, leaving the user's existing preview storage separate. Inspected the entry confirmation/cancel flow and data controls at phone width (393 × 852) and desktop width (1280 × 720).
- Verified that whole-journal deletion is disabled in sample mode; its final button requires exactly `DELETE`, rejects lowercase input, and can be canceled. The final destructive browser action was not exercised; actual storage removal and failure paths were covered by automated tests with in-memory storage.
- A fictional note remained after cancellation and survived lock, reload, and unlock. The inspected browser reported no captured console errors; viewport overrides were reset after testing.
- Native source inspection confirms the screen-capture module is registered and React Native's Android modal inherits `FLAG_SECURE`. Actual screenshot blocking, Recents privacy, update-in-place data retention, deletion/Undo, and backup recovery still need a 0.2.0 device regression pass. The earlier Pixel 7 pass applies to 0.1.0.

The standalone ARM64 APK built successfully with the existing local toolchain. Package checks confirm `com.liambic.cycletracker.preview`, version `0.2.0`, version code `2`, minimum API 24, target API 36, `allowBackup: false`, no debuggable flag, and a bundled Hermes program (3,071,732 bytes). APK signature and 16 KB zip-alignment verification passed. The preview signing certificate is unchanged from 0.1.0, supporting an update over the existing installation.

- File: `artifacts/android/cycle-tracker-preview-0.2.0-arm64-v8a.apk` (29,719,786 bytes; excluded from Git).
- APK SHA-256: `3624c4b7bf44304b5c5dd21a8f1a41982466e9dacd722b482dfb2faf713a69ed`.
- Signing certificate SHA-256: `6e64159ed7656a5873b6f0379e74ef1c0a8bd6b1bbaba12e51cbd26355f75576`.

![Desktop privacy controls](screenshots/privacy-controls-desktop.jpg)

![Phone privacy controls](screenshots/privacy-controls-mobile.jpg)

## 0.1 preview — October 8, 2026

This record separates executed checks from work still needing hardware or account access. Test journal entries are fictional.

### Automated checks passed

- Strict TypeScript compilation.
- Frozen dependency installation, Expo dependency compatibility check, and Prettier formatting check.
- Nine domain and storage tests: calendar boundaries/leap days/DST; spotting versus period starts; explicit bleeding duration; removing start markers and cramp severity; malformed journal imports; CSV formula escaping; authenticated encryption round-trip, random nonces, wrong passphrase and tampering rejection; envelope/KDF validation; ordered writes and recovery after a failed write.
- Expo web production JavaScript export.
- Android and iOS Hermes production bundle generation. These are bundle checks, not installable app builds or device execution.

### Browser checks performed

- Sample mode opens with clearly labeled fictional data.
- A new test vault can be created with a passphrase.
- Flow, period-start marker, cramp rating, and a note save and survive a reload/lock/unlock cycle.
- An incorrect passphrase leaves the vault locked with an error.
- An encrypted backup downloads and is accepted by the restore flow.
- Restoring the test backup recovers the note, flow, and cramp rating.
- Calendar, full-screen daily editor, and history screen were inspected at 393 × 852 CSS pixels.
- Desktop calendar and inline daily editor were inspected at 1280 × 720 CSS pixels.
- Loading earlier months shows the newly added months; Today returns to the current month.
- The production app reloads and sample mode opens with the local preview server stopped, using its cached offline shell.
- A second tab cannot unlock a journal already open in another tab, preventing competing snapshot writes.
- The production browser preview reports no captured console errors in the final check.

![Desktop sample preview](screenshots/desktop-preview.jpg)

### Still to validate

- An actual Android APK on Pixel 7 and Galaxy Z Flip5, including installed OS versions, fold/reopen behavior, keyboard, font scaling, background locking, file sharing, and cryptographic performance.
- Native iOS build and device behavior.
- Screen-reader navigation, browser compatibility beyond the current embedded Chromium browser, and a full accessibility review.
- OS backup policies and native task-switcher screenshot protection.
- Independent security review before real health records or public release.

### Known preview limits

The journal is a single encrypted snapshot with an 8 MB import/export limit. There is no sync, medication scheduling, notification delivery, prediction engine, full symptom catalog, PDF report, change-passphrase flow, biometric unlock, or in-app deletion flow yet. A browser vault is tied to the exact origin, so changing hostname or port requires backup/restore. Do not use this preview as the only copy of health records.

## Setup layout correction — October 8, 2026

The first-run setup card collapsed to 62 pixels wide in the browser because `flex: 0` set its flex basis to zero, overriding the intended 390-pixel width. Removed that shorthand, kept the card from shrinking, and allowed the stacked introduction to retain its content height. Feature labels and the privacy caption can wrap on narrow screens.

Verified the rebuilt production setup screen at the user's 1102 × 884 viewport, at the 900-pixel desktop breakpoint, and at 393 × 852 for phones. The desktop card measures 390 pixels wide, the mobile card fits its available width, and the breakpoint check found no horizontal content overflow. TypeScript and the web production build passed. The normal browser viewport was restored after checking.

![Corrected desktop setup](screenshots/setup-desktop.jpg)

![Corrected mobile setup](screenshots/setup-mobile.jpg)

## First Android APK — October 8, 2026

Built a standalone release-mode APK locally with Gradle 9.3.1, JDK 22, Android build tools 36.0.0, and NDK 27.1.12297006. The short build cache and pnpm's hoisted dependency configuration resolve the Windows native compiler path limits encountered during setup.

- File: `artifacts/android/cycle-tracker-preview-0.1.0-arm64-v8a.apk` (29,703,354 bytes; generated locally, excluded from Git).
- App label: **Cycle Tracker Preview**.
- Package: `com.liambic.cycletracker.preview`; version `0.1.0`, version code `1`.
- Minimum Android API 24; target API 36; native architecture `arm64-v8a`.
- `apksigner verify --verbose --print-certs` passed with the private preview certificate (RSA 3072, APK Signature Scheme v2).
- `zipalign -c -P 16 4` passed.
- APK contains its bundled Hermes JavaScript (`assets/index.android.bundle`, 3,055,376 bytes) and native libraries. It is a standalone build, with no development server required.
- Package inspection reports no `application-debuggable` flag. Expo configuration preserves `allowBackup: false` and keeps preview/store identifiers separate.
- `pnpm check` passed TypeScript and all nine existing tests; `pnpm format:check` passed after the dependency-layout correction.
- Git ignore checks exclude the signing key, credential file, and generated APK.

APK SHA-256: `267a27c00618c312e0a5cd553401561f8a44ae26b05473a7b8fcb0a37350f46e`.

Preview signing certificate SHA-256: `6e64159ed7656a5873b6f0379e74ef1c0a8bd6b1bbaba12e51cbd26355f75576`.

No physical phone or configured emulator was connected, so successful compilation and package checks do **not** establish native runtime behavior. Pixel 7/Flip5 installation, keyboard/folding behavior, passphrase performance, backup sharing, and background privacy remain to be exercised with fictional data using [the test guide](android-testing.md).
