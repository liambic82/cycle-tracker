# Validation record

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
