# Android preview testing

The first native target is a standalone, release-mode APK for the Pixel 7 and Galaxy Z Flip5. JavaScript is bundled into the APK, so an installed preview does not need the development server or an Expo account.

## App identity and data

The test app is named **Cycle Tracker Preview** and uses `com.liambic.cycletracker.preview`. The future store app has a separate identifier. Each installation has its own journal; the browser's journal does not appear automatically. Use an encrypted backup to move a journal between them.

Start with the fictional sample journal. Use invented entries and a test-only passphrase when checking persistence and recovery. Real-device behavior and security validation are still in progress.

## Build on this Windows computer

JDK 22 under `C:\Program Files\Java\jdk-22` and the SDK under `%LOCALAPPDATA%\Android\Sdk` are installed. From the project directory:

```powershell
.\scripts\build-android-preview.ps1
```

The script generates the Android project, builds a signed release APK for `arm64-v8a`, and places the APK and SHA-256 checksum in `artifacts/android`. This architecture matches both test phones. An `-Architecture x86_64` option is available for an appropriate emulator. `-SdkPath` and `-JdkPath` override the installed toolchain locations.

The first build downloads Gradle and missing Android build dependencies. It does not create a cloud build, purchase a plan, or submit to an app store. Expo's [local build documentation](https://docs.expo.dev/guides/local-app-development/) describes the underlying native workflow.

The flatter dependency layout in `pnpm-workspace.yaml` avoids excessive native build path lengths on Windows. pnpm 11 no longer reads that setting from `.npmrc`. The script copies only the application and build inputs into `%USERPROFILE%\.ct-android` so CMake/Ninja can use short physical paths. A project marker protects that dedicated build cache from being confused with other files; signing credentials and journal exports are never copied there. The installed Android Studio runtime uses Java 25, whose native-access warnings are rejected by the current Prefab build tool; the preview script uses the installed JDK 22 instead.

The local preview signing key and credentials live in `.tools/android-signing`, which is excluded from Git. Preserve that directory so later APKs can update the existing installation. The build refuses to use this signing setup with the store app identifier. Generated Android files and APKs are also excluded from Git. Future store signing is a separate release step.

## Install and update

1. Transfer the APK from `artifacts/android` to the Pixel 7, for example through OneDrive or USB file transfer.
2. Open that APK on the phone. If Android requests permission to install from that file source, allow that source for this installation, then turn the permission off afterward. Keep Play Protect enabled.
3. Open **Cycle Tracker Preview** and select **Explore with sample data**.
4. For a future update signed with the same preview key, install the newer APK over the current one. Do not uninstall first; uninstalling removes the phone's local journal. Export a backup before updating.

An optional developer route is `adb install -r <apk-path>` once USB debugging is enabled and the phone has authorized this computer.

## Device reports

| Date            | App version | Device                 | OS                              | Result                                                                                     |
| --------------- | ----------- | ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| October 9, 2026 | 0.1.0       | Google Pixel 7         | Android 17                      | Owner reported testing passed. Individual checklist results and timings were not supplied. |
| Pending         | —           | Samsung Galaxy Z Flip5 | Android/One UI not yet reported | Not yet validated.                                                                         |

## 0.2.0 update checks

Install `cycle-tracker-preview-0.2.0-arm64-v8a.apk` over 0.1.0 with the same preview signing key. Export a backup first; do not uninstall. Confirm that the previous fictional journal still unlocks with its existing passphrase.

- Delete a fictional day, then Undo: flow, symptoms, cramp rating, notes, and period markers should return. Navigate between screens and check Undo remains available until locking, dismissal, another deletion, or logging that date again.
- Cancel entry deletion and journal deletion; the records should remain.
- With a disposable journal and a separate encrypted backup, type `DELETE` in **Your data** and delete the journal. The app should return to setup and stay there after restart. Restore the backup to verify recovery from the separately saved copy.
- Attempt screenshots on setup, the open journal, and the daily editor. Android should block capture. Check that Recents does not expose the journal. Screen capture is also blocked in sample mode; use the browser preview for layout screenshots.
- Repeat backup sharing, offline restart, and background locking with the updated build. The October 9 report applies to 0.1.0, not these new features.

## First test session

Record the app version, phone model, Android version, and (on the Flip5) One UI version. Record only fictional test data in this repository.

| Check                  | Expected result                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sample journal         | Calendar, history, and daily editor work; demo edits never become real saved entries.                                                                                 |
| Touch and keyboard     | Fields remain reachable when the keyboard opens; Save/status feedback is visible; Android Back closes the editor.                                                     |
| Fictional journal      | Create a passphrase, log flow/start/end markers, symptoms, cramp severity, and a note. Lock and unlock; entries remain.                                               |
| App restart            | After the saved status appears, remove the app from Recents and reopen it. It opens locked and restores the saved journal after unlock.                               |
| Airplane mode          | Restart and use the installed app offline; no development server is required.                                                                                         |
| Background privacy     | Switch away and return after over one minute; the journal requires unlocking. Check whether Recents exposes journal text and report the result.                       |
| Backup and CSV         | Save a backup, restore it with its passphrase, and verify entries. Open a readable CSV with fictional entries. Check cancellation as well as successful file sharing. |
| Text size and rotation | Increase Android text size and rotate; controls remain usable and the selected day is retained.                                                                       |
| Flip5 continuity       | Close/reopen and partially fold the phone; verify selected day, in-progress note, keyboard, and lock behavior.                                                        |
| Unlock performance     | Note roughly how long a correct or incorrect passphrase takes; report stalls or unresponsive controls.                                                                |

Report the action, expected result, and actual result for any issue. Browser screenshots using sample data can help with layout issues; native screenshots are intentionally blocked from 0.2.0 onward.
