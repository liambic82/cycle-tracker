# iOS preview testing

## Scope: Trifelle Preview 0.22.0 / build 27

On October 27, 2026 the owner approved Trifelle's branding and asked for an iOS test version after integration. This authorizes the port now; pending Android checks remain relevant but are no longer a prerequisite for starting iOS work. This is a preview, not a 1.0 or App Store release.

The shared local journal, calendar, history, reports, encrypted backup/restore, observations, medications, care records and approved appearance options are included. The new native iOS passphrase module uses CommonCrypto PBKDF2-SHA256 on a background queue with the existing exact UTF-8 bytes, 600,000 iterations, 16-byte salt and 32-byte key. Journal format 10, encrypted envelope and backup compatibility remain unchanged. iOS requires **16.4 or later** with this Expo SDK.

**Platform limits:** Android Health Connect and its home-screen widget are Android features. This iOS preview can display sleep retained in a transferred backup and record manual sleep; it does not connect to Apple Health or directly to Fitbit. No iOS widget, cloud sync or closed-app sleep syncing is included. Face ID/Touch ID, notifications, file sharing and privacy behavior require actual iPhone testing. The preview permits screenshots while retaining the separate app-switcher privacy treatment.

## Apple Silicon simulator build

The [iOS preview workflow](../.github/workflows/ios-preview.yml) uses a macOS 26 runner with Xcode 26.6. It first compiles the actual CommonCrypto helper and checks the shared compatibility vectors, then builds a standalone Release app without signing credentials. It attempts a fresh-simulator launch and light/dark welcome captures. A successful archive build does not by itself prove the welcome screen rendered correctly; inspect the captured output and run the checks below.

The workflow artifact contains `trifelle-preview-0.22.0-ios-simulator-arm64.zip`, its SHA-256, build log and any successful simulator captures. It is for **Apple Silicon Macs running Xcode Simulator**, not an installable iPhone IPA. Artifact retention is 30 days; source and scripts remain in Git.

To reproduce on a Mac with Xcode 26.4+, Node 24, pnpm 11.19.0 and CocoaPods:

```sh
pnpm install --frozen-lockfile
bash scripts/build-ios-simulator.sh
```

Unzip the generated archive and drag the `.app` onto a booted iOS Simulator. The Release app contains its JavaScript and works without Metro. The unsigned simulator build does not require an Apple Developer membership. See [Expo simulator guidance](https://docs.expo.dev/build-reference/simulators/).

## Installable iPhone build

No signed IPA or TestFlight upload has been produced yet. This Windows host has no Xcode and no authenticated Expo session; Apple membership, signing access and the target iPhone/iOS version have been requested from the owner. Do not post passwords, tokens, private keys or provisioning profiles in chat or Git.

`eas.json` defines these ready-to-use paths once accounts are available:

- `preview`: internal distribution with the stable preview bundle identifier `com.liambic.cycletracker.preview`. Register the testing iPhone before building; ad hoc distribution needs its device registration and an Apple provisioning profile.
- `ios-simulator`: the same preview configuration for an EAS simulator build, if preferred over the repository's macOS runner.
- `ios-testflight`: a Release build with the same preview identifier for TestFlight. This produces the build; uploading, export-compliance answers, tester setup and any external beta review are separate steps. No public store submission is authorized.

An authorized user should sign into Expo interactively and complete Apple authentication/2FA in the local credential flow. After linking the intended EAS project and registering the device, the device-build command is `eas build --platform ios --profile preview`. [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/) explains the ad hoc requirements. Do not assert `usesNonExemptEncryption: false` without reviewing the app's encryption classification; the vault uses third-party AES as well as OS cryptography.

## First iPhone validation

Use fictional data for destructive and failure checks. Keep the Android journal and its backup intact; a backup copy is the explicit transfer mechanism, not automatic synchronization.

1. **Launch and readability:** check the Trifelle icon/name, light/dark launch, static-to-loaded transition, four-leaf clockwise accent during real loading, Reduce Motion, large text, VoiceOver, notches, keyboard, rotation and iPad layout if testing an iPad. Ready content must appear immediately; no full loop is required.
2. **Encryption:** create a disposable journal, measure setup/unlock time, test an incorrect passphrase, lock/restart and restore a disposable Android backup. Include a Unicode passphrase in a synthetic compatibility test. Export from iOS and restore that copy on Android; compare entries, attachments and saved sleep.
3. **Biometrics:** opt in, unlock, cancel the prompt, retry and use the passphrase fallback. Check device restart, biometric enrollment changes, disabled biometrics and deleting the disposable journal. Authentication must never expose the journal after it was backgrounded or locked.
4. **Privacy/lifecycle:** background and reopen before/after one minute, inspect the app switcher, interrupt file/biometric prompts and confirm the selected date plus saved records survive. Screenshots are intentionally allowed in this preview. Test native screenshot protection separately before store release.
5. **Daily use:** Add period ranges, daily forms, section order/pins, history navigation, deletion confirmation/Undo, manual/imported sleep display and experimental-estimate disclaimers. Check explicit Save/Cancel and swipe/back dismissal behavior.
6. **Files and appearance:** encrypted backup, restore, CSV/PDF sharing, medical attachment import/export and a personal background from Files. Cancel each picker and test offline access. Verify readable exports and local temporary-file cleanup with disposable records.
7. **Local reminders:** permission denial/grant, test reminder, medication/care alerts, foreground/background/killed-app delivery, time-zone changes, schedule edits and pending-alert cancellation on restore/delete. Simulator permission/delivery is not physical-device evidence.

Record device model, iOS version, build, timing and reproducible failures. Neither a Hermes bundle, a native compilation nor a simulator screenshot counts as a physical iPhone pass. Native backup policy, security/accessibility review, encryption declarations and final store metadata remain release work.
