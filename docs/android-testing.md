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

| Date            | App version | Device                 | OS                                    | Result                                                                                             |
| --------------- | ----------- | ---------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| October 9, 2026 | 0.1.0       | Google Pixel 7         | Android 17                            | Owner reported testing passed. Individual checklist results and timings were not supplied.         |
| October 9, 2026 | 0.2.0       | Google Pixel 7         | Android 17 (established test context) | Owner reported “Testing complete, all pass” after the 0.2.0 update checklist.                      |
| October 9, 2026 | 0.3.0       | Google Pixel 7         | Android 17 (established test context) | Owner reported biometrics functioning as expected; individual edge-case results were not supplied. |
| Pending         | —           | Samsung Galaxy Z Flip5 | Android/One UI not yet reported       | Not yet validated.                                                                                 |

## 0.4.0 symptom browser checks

Install `cycle-tracker-preview-0.4.0-arm64-v8a.apk` over 0.3.0. Export an encrypted backup first and do not uninstall. This build uses the same preview identity and signing key; the passphrase and biometric key are unchanged.

1. Unlock the updated app, including biometric unlock if already enabled. Verify existing symptoms, custom labels, cramp scores, and notes remain.
2. Open a fictional day. Use **Browse all symptoms** to search `aura`, `lower back`, or another term; switch categories and use **Clear search**. Try **Less common symptoms**, select a new item, and return with **Back to daily journal**. All selected symptoms should appear together.
3. Add a custom symptom in the browser. Verify it is immediately logged under **Your symptoms**, survives lock/restart, and can be selected on another day. Duplicate names should be rejected regardless of capitalization or surrounding spaces.
4. Log a perimenopause symptom, then turn off **Your data → Symptom preferences → Show perimenopause choices**. The category and its curated search choices should disappear. The previously logged symptom must remain in that day's summary and exports. Turn the setting back on and verify the choices return.
5. Lock, force-close/reopen, and unlock offline. The preference and selected symptoms must persist. Use a disposable fictional journal to verify encrypted backup/restore keeps them; restore still turns off biometric access until explicitly re-enabled. Older backups should open with perimenopause choices visible by default.
6. Check Cramps and its 0–10 score, then remove Cramps from the day; the score should disappear. Check that selecting a symptom called Spotting or Skipped periods does not create a period-start marker or alter Flow.
7. Test the symptom browser with the keyboard, large system text, portrait/landscape, and TalkBack. Controls and long labels should remain reachable. The browser uses the existing daily sheet; its **Back to daily journal** button returns to the entry, while Android Back closes the sheet. On Flip5, also fold/reopen during selection.
8. Keep existing lock/privacy, deletion/Undo, and update-in-place retention checks in the regression pass. Changes to sample symptoms and preferences should disappear when leaving sample mode.

Report the device, OS, and build version with results. The automated and browser checks do not establish a native-device pass for 0.4.0.

## 0.3.0 biometric unlock checks

The owner reported a functional biometric pass on October 9, 2026. Keep the checklist below for regression testing; that report does not separately confirm every cancellation, invalidation, or recovery scenario.

Install `cycle-tracker-preview-0.3.0-arm64-v8a.apk` over the existing preview. Export a backup first; do not uninstall. Your existing passphrase and journal should continue to work, with biometrics initially off.

1. Unlock using the passphrase. In **Your data → An easier way to unlock**, select **Enable biometric unlock**, review the explanation, then **Enable on this device**. Complete the fingerprint prompt on Pixel 7. Verify the setting reports on.
2. Lock the journal, then select **Unlock with biometrics**. Successful authentication should show the same entries. Restart the app and repeat, including in airplane mode.
3. Cancel the system prompt. The journal must remain locked; retry and passphrase unlock must still work. A wrong fingerprint must not expose entries.
4. Turn biometric unlock off. After locking/restarting, only passphrase unlock should be offered. Turn it on again to check the full cycle.
5. Restore an encrypted backup while biometric unlock is enabled. Restore still requires the backup's passphrase and turns biometric unlock off. Enable it explicitly again if wanted. A failed passphrase for restore should leave the current journal and its setting intact.
6. Delete a disposable fictional journal after exporting a backup. A new journal must not inherit the deleted journal's biometric access. Restore the backup using its passphrase.
7. Switch apps while an unlock request is in progress. It should not unexpectedly open on return. Also keep the existing one-minute background lock and Recents/screenshot checks in the regression pass.

If you independently change enrolled fingerprints, use the passphrase afterward and re-enable biometric unlock. The app handles invalidated OS credentials, but do not change device enrollment solely for this test if you prefer to leave your phone settings alone. On devices without a supported enrolled biometric, the passphrase remains available and settings explain how to enable the option. iOS and Flip5 biometric behavior still need separate hardware validation.

## 0.2.0 update checks (owner reported passed)

Install `cycle-tracker-preview-0.2.0-arm64-v8a.apk` over 0.1.0 with the same preview signing key. Export a backup first; do not uninstall. Confirm that the previous fictional journal still unlocks with its existing passphrase.

- Delete a fictional day, then Undo: flow, symptoms, cramp rating, notes, and period markers should return. Navigate between screens and check Undo remains available until locking, dismissal, another deletion, or logging that date again.
- Cancel entry deletion and journal deletion; the records should remain.
- With a disposable journal and a separate encrypted backup, type `DELETE` in **Your data** and delete the journal. The app should return to setup and stay there after restart. Restore the backup to verify recovery from the separately saved copy.
- Attempt screenshots on setup, the open journal, and the daily editor. Android should block capture. Check that Recents does not expose the journal. Screen capture is also blocked in sample mode; use the browser preview for layout screenshots.
- Repeat backup sharing, offline restart, and background locking with the updated build.

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
