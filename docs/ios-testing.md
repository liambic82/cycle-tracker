# iOS preview testing

## Scope: Trifelle Preview 0.22.0 / build 27

On October 27, 2026 the owner approved Trifelle's branding and asked for an iOS test version after integration. This authorizes the port now; pending Android checks remain relevant but are no longer a prerequisite for starting iOS work. This is a preview, not a 1.0 or App Store release.

The shared local journal, calendar, history, reports, encrypted backup/restore, observations, medications, care records and approved appearance options are included. The new native iOS passphrase module uses CommonCrypto PBKDF2-SHA256 on a background queue with the existing exact UTF-8 bytes, 600,000 iterations, 16-byte salt and 32-byte key. Journal format 10, encrypted envelope and backup compatibility remain unchanged. iOS requires **16.4 or later** with this Expo SDK.

**Platform limits:** Android Health Connect and its home-screen widget are Android features. This iOS preview can display sleep retained in a transferred backup and record manual sleep; it does not connect to Apple Health or directly to Fitbit. No iOS widget, cloud sync or closed-app sleep syncing is included. Face ID/Touch ID, notifications, file sharing and privacy behavior require actual iPhone testing. The preview permits screenshots while retaining the separate app-switcher privacy treatment.

## Apple Silicon simulator build

**Verified October 27:** [macOS run 40461106974](https://github.com/liambic82/cycle-tracker/actions/runs/40461106974) passed on source commit `aec2248`. The four shared CommonCrypto vectors passed, as did invalid-salt rejection and owned-buffer clearing. The standalone Release app installed and launched on an **iPhone 17 Pro simulator**; the light/dark welcome captures were inspected and show the Trifelle logo, readable text and correctly themed surfaces. This was a launch/appearance smoke check, not an interactive journal, biometric, notification or physical-device pass.

The downloaded local package is `artifacts/ios/verified-build/trifelle-preview-0.22.0-ios-simulator-arm64.zip` (**37,188,906 bytes**), SHA-256 `2f542a781972c80bef8bbdba30cf1966fdcfdc592283cec7d9090a8099a518da`. Its embedded Info.plist confirms **Trifelle Preview**, version **0.22.0 / 27**, minimum iOS **16.4**, `iPhoneSimulator`, the preview identifier, Face ID usage description and `SplashScreen` launch storyboard. Mach-O inspection confirms ARM64. [Download the CI artifact](https://github.com/liambic82/cycle-tracker/actions/runs/40461106974/artifacts/12714802376) before its November 26 retention expiry; the local copy is outside Git.

The [iOS preview workflow](../.github/workflows/ios-preview.yml) uses a macOS 26 runner with Xcode 26.6. It first compiles the actual CommonCrypto helper and checks the shared compatibility vectors, then builds a standalone Release app without signing credentials. It attempts a fresh-simulator launch and light/dark welcome captures. A successful archive build does not by itself prove the welcome screen rendered correctly; inspect the captured output and run the checks below.

The workflow artifact contains `trifelle-preview-0.22.0-ios-simulator-arm64.zip`, its SHA-256, build log and simulator captures. It is for **Apple Silicon Macs running Xcode Simulator**, not an installable iPhone IPA. Artifact retention is 30 days; source and scripts remain in Git.

To reproduce on a Mac with Xcode 26.4+, Node 24, pnpm 11.19.0 and CocoaPods:

```sh
pnpm install --frozen-lockfile
bash scripts/build-ios-simulator.sh
```

Unzip the generated archive and drag the `.app` onto a booted iOS Simulator. The Release app contains its JavaScript and works without Metro. The unsigned simulator build does not require an Apple Developer membership. See [Expo simulator guidance](https://docs.expo.dev/build-reference/simulators/).

## Native iPhone package and free-account installation

The owner confirmed there is no Mac or paid Apple Developer membership and requested a package for a physical iPhone. The [device workflow](../.github/workflows/ios-device.yml) now builds a **Release ARM64 iPhoneOS IPA** on GitHub's Mac runner without signing credentials. It is a separate compilation from the simulator app. The owner or tester signs and installs it locally on Windows using [Sideloadly](https://sideloadly.io/) and a free Apple Account. No jailbreak, simulator service, Expo account or paid membership is required for this path.

The build script checks the actual CommonCrypto helper, generates the native project, rejects unexpected signing entitlements, archives for the physical iOS SDK, and creates `Payload/TrifellePreview.app` inside the IPA. The package audit checks the app and embedded native binaries for **physical iOS ARM64**, the standalone JavaScript bundle, app identity, version, Face ID description, ZIP integrity and absence of provisioning profiles/private keys. An unsigned IPA is **not** directly installable from Safari or Files: signing and device provisioning happen during Sideloadly installation.

**Verified October 27:** [device build 40508179298](https://github.com/liambic82/cycle-tracker/actions/runs/40508179298) passed on `d35b88e`. The package is `artifacts/ios-device/verified-build/trifelle-preview-0.22.0-iphone-unsigned.ipa`, **36,602,438 bytes**, SHA-256 `da74586baceb0e50ff5b16aa07dd79dd794e4be91c163f98f3340638e37f9316`. All **12 native binaries** passed the physical-iOS ARM64 audit, including the app executable; the release bundle reports **Trifelle Preview 0.22.0 / 27**, minimum iOS **16.4**. The downloaded artifact matched GitHub's digest and the IPA audit passed again on Windows. [Download the CI artifact](https://github.com/liambic82/cycle-tracker/actions/runs/40508179298/artifacts/12735788890) before November 26; unzip its outer archive to obtain the IPA. Successful compilation, package verification and actual iPhone installation are separate checks. **Local signing and physical iPhone installation have not been performed.**

The local-reminders configuration now removes Expo's default APNs entitlement and remote-notification background mode. The app does not use push tokens or remote push. Local reminders remain implemented; delivery and permission handling still need the physical-device checklist below. Free Personal Teams cannot provision every capability available to paid accounts, so future native features need another capability review.

### Install from Windows

**Remote tester handoff (October 29):** the owner confirmed the tester has their own Windows PC. Send them `artifacts/ios-device/trifelle-preview-0.22.0-iphone-test-kit.zip` as a file or through a file-sharing link they can access; a local `C:/...` link from the development chat is not a remote download. The kit contains the unchanged verified IPA, `INSTALL-IPHONE.txt` and the package audit. The tester downloads it on **their PC**, right-clicks the ZIP and chooses **Extract All**, then follows the steps below using **their iPhone, USB connection and Apple Account**. The developer's computer does not need to be connected or nearby. iPhone model, iOS version and successful installation remain unreported.

1. Use an iPhone with **iOS 16.4 or later**, a USB cable, an internet connection and a free Apple Account with access to its two-factor authentication. A free account has a limit of three sideloaded apps per device. [Apple's account limits](https://developer.apple.com/help/account/basics/about-your-developer-account).
2. Install the Windows version of [Sideloadly from its official site](https://sideloadly.io/). Its Windows instructions require Apple's desktop/web versions of iTunes and iCloud; use the official links on that page. If Store versions are already installed, follow Sideloadly's documented migration steps. Do not change another person's Apple software installation without their involvement.
3. Connect and unlock the iPhone. Accept **Trust This Computer** on the phone, then select the detected iPhone in Sideloadly.
4. Drag `trifelle-preview-0.22.0-iphone-unsigned.ipa` into Sideloadly. Use its **Apple ID Sideload** mode and the phone owner's Apple Account. Keep the app's default identifier and normal settings; no tweaks, injected libraries, file-sharing changes or minimum-iOS override are needed.
5. Start installation. Enter the password and any authentication code **directly in Sideloadly's local prompts**, never in chat, project files or GitHub. This third-party signing tool authenticates with Apple; only the account owner should perform this step.
6. On the phone, trust the developer under **Settings → General → VPN & Device Management**. Enable **Settings → Privacy & Security → Developer Mode** if prompted, restart, and confirm it. The Developer Mode option may appear only after the first installation attempt. [Developer Mode](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device).
7. Open **Trifelle Preview**. Begin with Sample mode or a disposable journal, then run the checks below. Use the same Apple Account and installed bundle identity for future refreshes/updates.

**Refresh:** free provisioning expires after **seven days**. Sideloadly can refresh while its daemon is running and the paired phone is reachable by USB or configured Wi-Fi. It cannot refresh while the computer is unavailable. If the app expires, refresh/reinstall over the existing app with the same account and identifier; avoid deleting the app, and retain an encrypted backup before updating or changing accounts. The journal is local, not cloud-synced. [Refresh and installation FAQ](https://sideloadly.io/faq).

If installation fails, record the visible error with account details and device identifiers redacted. Do not infer a physical-device pass from a successful build or package audit. Accounts, two-factor authentication, phone trust and Developer Mode are owner actions that cannot be completed from this disconnected development machine.

### Optional paid distribution later

No TestFlight upload has been produced. `eas.json` retains these paths if the owner later enrolls and chooses longer-lived/shared distribution:

- `preview`: internal distribution with the stable preview bundle identifier `com.liambic.cycletracker.preview`. Register the testing iPhone before building; ad hoc distribution needs its device registration and an Apple provisioning profile.
- `ios-simulator`: the same preview configuration for an EAS simulator build, if preferred over the repository's macOS runner.
- `ios-testflight`: a Release build with the same preview identifier for TestFlight. This produces the build; uploading, export-compliance answers, tester setup and any external beta review are separate steps. No public store submission is authorized.

For that optional route, an authorized user should sign into Expo interactively and complete Apple authentication/2FA in the local credential flow. After linking the intended EAS project and registering the device, the device-build command is `eas build --platform ios --profile preview`. [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/) explains the paid ad hoc requirements. Do not assert `usesNonExemptEncryption: false` without reviewing the app's encryption classification; the vault uses third-party AES as well as OS cryptography.

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
