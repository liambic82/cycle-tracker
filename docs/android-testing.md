# Android preview testing

The first native target is a standalone, release-mode APK for the Pixel 7 and Galaxy Z Flip5. JavaScript is bundled into the APK, so an installed preview does not need the development server or an Expo account.

## App identity and data

The test app is named **Cycle Tracker Preview** and uses `com.liambic.cycletracker.preview`. The future store app has a separate identifier. Each installation has its own journal; the browser's journal does not appear automatically. Use an encrypted backup to move a journal between them.

Start with the fictional sample journal. Use invented entries and a test-only passphrase when checking persistence and recovery. Real-device behavior and security validation are still in progress.

## 0.9.0 medication reminders

Install `artifacts/android/cycle-tracker-preview-0.9.0-arm64-v8a.apk` over the existing preview after exporting an encrypted backup. Version code is 12; the signing key and package identity are unchanged. Screenshots remain enabled in previews. These checks are pending on Pixel 7 / Android 17 and Galaxy Z Flip5; record the Flip5 Android/One UI versions and actual delivery delays.

1. Confirm the existing journal, medication plans, dose records, and biometric/passphrase unlock still work. Initial medication reminder switches should be off. Sample mode and computer browsers must not prompt for notification permission or send reminders.
2. In your own fictional journal, open **Medications**, expand **Reminder settings and test**, and use **Send test reminder in 1 minute**. Allow notification permission. Background/lock the app and phone; check the discreet test notification and tap it. It must open the app without bypassing journal unlock. Record observed arrival time; Android battery settings can delay delivery.
3. With a fictional medication scheduled several minutes ahead, turn on **Remind me at scheduled times**. Verify queued count/deadline and the notification “A moment for you” / “You have a reminder. Open your journal to review it.” Names, amounts, and notes must not appear on the lock screen or notification tray. The OS may show the app name.
4. Schedule two fictional medications at the same time: expect one alert. Record one as Taken/Skipped/Taken late before the time; the other's alert should remain. Record both; it should cancel. Remove a dose record before its time to requeue, then Undo to cancel again. An already-past dose should never create an immediate catch-up alert.
5. Change an unused upcoming time, turn one medication off, pause a plan, and exercise a future dated change. Old alerts must disappear. Check selected weekdays and a short fictional on/off cycle, with and without an off-day label. As-needed plans must never invent a dose reminder.
6. Deny the initial permission on a separate test installation/state, or turn off app/channel notifications in system settings. Return to the app: show blocked/error state and keep editing usable. Re-enable permission, unlock/refresh, and verify delivery resumes without duplicate notifications. Try both the app-level and **Private reminders** channel controls.
7. Test delivery while foregrounded, locked/backgrounded, swiped from recents, after reboot, and after a preview update. Android force-stop prevents delivery until reopening; unlock/refresh must rearm future alerts. Check normal battery saving and Flip5 closed/reopened behavior. Do not treat a successful schedule API response as proof of delivery.
8. Change the phone's time zone, unlock, and verify the queued local schedule uses the new zone. The old absolute-time alarm must disappear. Test repeated/skipped DST times on a dedicated test environment if available; expected behavior is roll forward for a missing hour and once for a repeated hour.
9. Use **Turn off all reminders** with a pending test and enabled medications: no later alert should arrive. Lock/reopen and confirm off persists. Restore a valid backup, including a backup of this same journal: reminders must remain off until explicitly re-enabled. A failed/wrong-passphrase restore must leave existing reminders intact. On a disposable fictional journal, verify whole-journal deletion also cancels pending and displayed notifications.
10. Confirm the visible renewal deadline and refresh notice on a dense fictional schedule. Unlocking extends/reconciles the queue (up to 30 days / 60 distinct times). Leaving it locked past the deadline stops further dose reminders; this limit is intentional and visible, not an indefinite reminder promise. Retest keyboard, TalkBack labels/switch states, larger text, rotation, and biometric fallback.

Actual iOS scheduling/permission/background behavior also needs an iPhone build and device validation before store release; a JavaScript bundle check does not establish native iOS delivery.

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

| Date            | App version | Device                 | OS                                    | Result                                                                                                                         |
| --------------- | ----------- | ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| October 9, 2026 | 0.1.0       | Google Pixel 7         | Android 17                            | Owner reported testing passed. Individual checklist results and timings were not supplied.                                     |
| October 9, 2026 | 0.2.0       | Google Pixel 7         | Android 17 (established test context) | Owner reported “Testing complete, all pass” after the 0.2.0 update checklist.                                                  |
| October 9, 2026 | 0.3.0       | Google Pixel 7         | Android 17 (established test context) | Owner reported biometrics functioning as expected; individual edge-case results were not supplied.                             |
| October 9, 2026 | 0.4.0       | Google Pixel 7         | Android 17 (established test context) | Owner reported symptoms working well, visibility good, and biometrics working. Individual edge-case results were not supplied. |
| October 9, 2026 | 0.5.0       | Samsung Galaxy Z Flip5 | Android/One UI not yet reported       | Owner reported Create my journal spinning for over a minute. Creation failed this test; other checks are not marked passed.    |

## 0.8.0 medication schedules and dose records

Install `cycle-tracker-preview-0.8.0-arm64-v8a.apk` over the existing preview. Export an encrypted backup first if the journal opens. **Do not uninstall or clear storage.** App identity, certificate, passphrase, and biometric credentials are unchanged. Journal content upgrades to version 4; new backups need **0.8.0 or later** on the receiving app. Versions 1–3 remain readable. This preview does not send medication reminders.

1. Open the old journal and confirm notes, products, symptoms, sexual-health fields, and preferences remain. Existing passphrase and biometric unlock should work. **Medications** should initially have no definitions in an older real journal; sample mode has clearly fictional examples.
2. Add a fictional medication or supplement with a dose label, effective date, and two times such as 08:00 and 20:00. Try an empty name/dose, invalid date/time, or duplicate times; invalid forms must not save. Cancel a draft and confirm it adds nothing. Save the valid form and inspect the summary.
3. Test selected weekdays and a repeating on/off plan with short fictional lengths. Navigate the daily journal across a weekday or cycle boundary: off days have no dose unless an off-day/placebo label was explicitly entered. No plan alone should mark a calendar day logged or infer a period.
4. In a past/current day, open **Medications & supplements**. Unrecorded scheduled doses should be separate from recorded doses. Open one, choose Taken, verify/correct the actual amount, enter an optional time, and save. It should leave the unrecorded list and appear once in Recorded doses. Test Skipped and Taken late separately; no status is selected automatically. For an overnight example, record an actual date different from the scheduled journal date, never later than today.
5. Add an as-needed definition. Log two separate uses with different times/reasons. Both should be retained without creating expected or missed doses. Leave one time blank and verify it stays unknown rather than becoming the current time.
6. Open a record's options, edit the outcome, then try removal cancellation. Confirm removal once and use Undo. Other dose records, symptoms, notes, and products must remain. Test whole-entry Delete/Undo in sample mode: dose records return, and medication definitions are never deleted with the day.
7. Change a medication from a later date. After a recorded dose, the suggested effective date is at least the following day. Earlier plans and dose snapshots must remain unchanged. Inspect schedule history; test future changes, correction of the latest unused effective date, a paused schedule, and a later resumption. Choosing a changed cycle restarts its on-day count from the new effective date.
8. Lock, force-close/reopen, and unlock offline. Verify schedules and doses persist. Export/restore a fictional encrypted backup between updated Android/browser installations. Daily CSV should contain complete recorded doses and notes but no invented missed doses; separate schedule CSV should contain dated changes and notes. Sexual-health CSV choices must still start off each time.
9. Test phone Month sheets, Day view, the desktop tab, long names/labels, keyboard scrolling, large text, TalkBack, Android Back, rotation, and Flip5 fold/reopen. Forms need an explicit Save; leaving or locking may discard a draft. The visible save status should update after submission. Screenshots remain enabled in this preview.
10. Continue the pending Flip5 creation retest and passphrase-eye/biometric/background-lock regressions. Report phone, OS, app version, and results. Automated and browser checks do not establish a native pass.

## 0.7.0 flooding explanation and sexual-health records

Install `cycle-tracker-preview-0.7.0-arm64-v8a.apk` over the existing preview. Export an encrypted backup first if the journal opens. **Do not uninstall or clear storage.** The signing certificate, app identity, passphrase, and biometric key are unchanged. Journal content upgrades to version 3; **new backups need 0.7.0 or later on the receiving app**. Version 1/2 backups still open. Do not downgrade after adding new records.

1. Open an existing journal with the passphrase and, if enabled, biometrics. Verify old notes, symptoms, products, and clot/flooding observations. In **Products & bleeding details**, confirm the flooding explanation is visible and readable above its choices.
2. Open **Sexual health · optional** on a fictional date. Older entries should have all four fields Not logged. Record activity Yes, intensity Gentle, orgasm No, and libido High. Set intensity back to Not logged; only that field should clear. Return to the daily entry: it should say **Details logged for this day**, without showing the values there.
3. On a different empty date, record only libido None or activity No. It should count as a logged day, with flow still unlogged and no inferred period start. Clear the sole observation and confirm the date becomes unlogged again. Clearing flow on a date with sexual-health records must preserve them.
4. Lock, force-close/reopen, and unlock offline. Confirm every field and the selected date persist. In sample mode, test whole-entry Delete/Undo and confirm all four fields return alongside any products, notes, and symptoms.
5. Open **Your data → Export CSV**. All four optional columns should start off. Enable one, cancel, and reopen; they should all be off again. Export with none, then with only Libido, then any other useful selection. Check actual files: only chosen columns appear; a date containing solely excluded fields is omitted. Explicit No/None remains visible when included and unlogged values stay blank. Notes and symptom labels are still included even if they mention sexual health, as explained on the screen.
6. Export a new encrypted backup and restore it into an updated test installation/browser. All four fields must survive regardless of earlier CSV choices. Try an older backup in a fictional test journal too. Restore still disables biometric convenience unlock until explicitly re-enabled.
7. Check Month view's daily sheet, Day view, and the desktop side panel. Verify scrolling, wrapped choice rows, large text, TalkBack labels/selected states, Android Back, rotation, and Flip5 fold/reopen. Existing note/product keyboard input should still work. Screenshots remain enabled in this preview.
8. Retain the earlier Flip5 creation retest, passphrase-eye, background-lock, and biometric fallback checks. Report the device, OS, and app version with results. Automated/browser checks do not establish a hardware pass.

## 0.6.0 product records and bleeding observations

Install `cycle-tracker-preview-0.6.0-arm64-v8a.apk` over the current preview. Export an encrypted backup first if the journal opens. **Do not uninstall or clear storage.** The app identity, signing certificate, passphrase, and biometric key are unchanged. Journal content upgrades to version 2; **new backups need 0.6.0 or later on the receiving app**. Older backups still open in this version. Do not downgrade after adding new records.

1. Open an existing journal and verify old notes, symptoms, flow, and preferences. **Products & bleeding details** should show no product records and **Not logged** observations on older entries. Existing biometrics and passphrase unlock should still work.
2. On a fictional day, open that section and select Clots Yes / Flooding No. Return to the daily entry; the compact summary should reflect both. Change either to Not logged and confirm it clears only that observation. Product-only or No-only days still count as logged, without creating flow or period markers.
3. Add pad/tampon/underwear records with quantities, a type/size description, and optional 24-hour time. Add a cup/disc emptying with observed mL. Test blank time/amount, zero mL, decimal comma/point, midnight, and invalid time/quantity. Counts must not produce automatic mL estimates. Older dates must not receive today's time automatically.
4. Edit a record through its options menu. Verify quantity/time/amount changes replace that record without duplicating it. Cancel a draft and ensure no partial record appears. Records with times should sort chronologically; untimed records appear last. Cup/disc amounts must not carry into a pad or a non-emptying action.
5. Through a record’s options menu, try Remove, then Keep. Confirm removal once and use **Undo product removal**. Other daily fields must be preserved. Separately, test whole-entry Delete/Undo in sample mode and verify all products and observations return. Clearing the Flow log must also preserve them.
6. Lock, force-close/reopen, and unlock offline. Verify new details and existing notes persist. Use a fictional journal to export/restore a new backup between updated browser/Android apps, and import a pre-0.6 backup. Check the last three CSV columns for explicit Yes/No, blank unlogged observations, and complete product details.
7. Check Month view’s sheet, Day view, and desktop side panel. Test keyboard editing (including colon and decimal entry), scrolling to Add/Save, large text, TalkBack labels/selected/expanded states, rotation, and Flip5 fold/reopen. Product forms are drafts until Add/Save; leaving a date/view or locking may discard an unsubmitted draft. Observation choices save immediately.
8. Retain screenshot/eye-control, biometric fallback, and background-lock regression checks. The earlier Flip5 setup retest remains pending. Report the device, OS, and version with results; browser and automated checks do not establish native performance or hardware behavior.

The owner's “Looks good, move forward” after 0.5.3 approved continuation but did not supply another device-specific test report.

## 0.5.3 entry options and autosave

Install `cycle-tracker-preview-0.5.3-arm64-v8a.apk` over the current preview. Export a backup first if the journal opens, and **do not uninstall or clear storage**. The app identity and signing key are unchanged. This update includes the 0.5.1 passphrase fix and 0.5.2 screenshot/eye controls; their native checks are still pending.

1. In sample mode, open a day without an entry. There should be no Delete button or Entry options control. Add a note or symptom; the ellipsis appears beside the date, while Delete stays hidden. The footer describes session-only sample changes.
2. Open **Entry options → Delete entry**. Verify the date and scope in the confirmation. **Keep entry** must close the panel without changing any fields. Open it again, confirm deletion, then use **Undo deletion** near the date. All flow, symptoms, notes, and period markers should return.
3. Close and reopen the options panel, change dates, and open/return from the symptom browser. Confirmation must not carry over to another date or return from the browser. Future dates must not offer deletion.
4. In a fictional saved journal, add a note. The footer should say **Changes save automatically** and show **Saved on this device** when writing finishes. Check persistence after closing the sheet, locking, and reopening. No Save or Delete action is required to finish a normal entry.
5. Check Month view’s daily sheet and Day view on Pixel 7 and Flip5, plus the desktop side panel. Use TalkBack to check the **Entry options** label and expanded/collapsed state, the dated confirmation, and save status. Verify large text, keyboard access, rotation, and fold/reopen.
6. Continue the Flip5 creation retest and preview screenshot/passphrase-eye checks below. Report the device, OS, and app version with results. This UX feedback does not establish a successful Flip5 setup retest.

## 0.5.2 screenshots and passphrase controls

Install `cycle-tracker-preview-0.5.2-arm64-v8a.apk` over the existing app. Do not uninstall or clear storage; export a backup first if the journal opens. The preview app identity and signing key are unchanged, and this update includes the 0.5.1 native passphrase fix, which still needs the Flip5 retest below.

1. Take a screenshot of setup/unlock, the sample calendar, and a sample daily editor. Capture should now succeed in preview builds. The previous screenshot-blocking expectations below are historical and do not apply to these testing previews. Android Recents may also show the screen now that the secure-window flag is off; the background overlay/automatic lock remain.
2. During setup, type fictional text and use each eye independently. Show reveals only its own field, Hide masks it, and text should be preserved. Check long passphrases, keyboard editing/cursor position, and large text. Try a mismatch, then correct it and submit.
3. Check the eye on unlock and backup restore. Fields start hidden and hide after submission, clearing, changing form mode, or backgrounding. Eye controls should not respond while the operation is busy. Use TalkBack to check Show/Hide labels.
4. Repeat the 0.5.1 Flip5 creation/unlock checks below, plus Pixel 7 update retention and biometric unlock. Report the phone, OS, app version, and any remaining setup progress/error message. Do not share your passphrase in feedback screenshots.

## 0.5.1 passphrase fix checks

Install `cycle-tracker-preview-0.5.1-arm64-v8a.apk` over 0.5.0. Close the stalled app before updating. **Do not uninstall or clear app storage.** If a journal already opens, export a backup first. The signing key, app identity, encryption parameters, and existing passphrases are unchanged.

1. On Flip5, try **Create my journal** again with matching passphrases. Record the approximate time and whether it opens the calendar. If the previous attempt completed in the background and the app shows **Welcome back**, unlock using that attempt's passphrase instead of deleting anything.
2. If it does not complete, report the displayed stage or error and elapsed time, plus Android/One UI versions. Do not share the passphrase. Key calculation should either complete or report a timeout at about 30 seconds; storage/OS prompts have separate progress stages.
3. Once created, add a fictional note, lock, force-close, reopen, and unlock using the passphrase. Confirm the note remains. Try an incorrect passphrase and then the correct one. Repeat offline.
4. On Pixel 7, install over the existing app and verify the old journal opens with its existing passphrase and with biometrics. On Flip5, enable biometrics after setup and verify lock/unlock and passphrase fallback.
5. With a fictional test journal, verify encrypted backup/restore across the new Android build and browser, including a backup produced before 0.5.1. Restore still disables biometrics until explicitly re-enabled. Keep existing calendar/history and privacy checks in the regression pass.

The Java helper's compatibility checks and browser first-run test passed on the development computer. They do not establish a fixed creation time or a successful creation on Flip5; that retest is pending.

## 0.5.0 calendar and history checks

Install `cycle-tracker-preview-0.5.0-arm64-v8a.apk` over the current preview. Export an encrypted backup first and do not uninstall. This build retains the preview identity, signing key, passphrase, and biometric key. Hardware validation of 0.5.0 is pending.

1. Unlock with biometrics if enabled, then check existing notes, symptoms, custom labels, preferences, and period boundaries. Older days without recorded bleeding/spotting should say flow is not logged; they must not be silently counted as no-flow days.
2. In sample mode, switch between **Year view**, **Month view**, and **Day view**. Tap a year-view month to open its calendar; the selected day should stay unchanged until you select another date. Try previous/next year, earlier/later months, Today, and Jump to date. A leap date such as `2024-02-29` should work; `2026-02-29` should be rejected.
3. Navigate previous/next day across month and year boundaries. Check cycle-day labels against recorded start dates. Month-view date taps should open the daily sheet; Day view should show the full editor. Search symptoms and return to the editor in both views.
4. In **Your history**, the unchanged sample has cycle lengths 30 and 29 days (average 29.5), with the latest cycle incomplete. Its three bleeding spans are 5 days. Check text counts and colored strips; open a cycle to inspect its starting day. Your own incomplete intervals should remain dashes, not zeros.
5. On a fictional day, choose **None**. It should become an explicit no-flow observation and appear as such in the calendar/history. **Clear flow log** should restore unknown flow while retaining symptoms and notes. Positive flow can have start/end markers; clearing it removes those markers and recalculates history.
6. Lock, force-close, and reopen offline. Explicit None, selected date, and other saved details must persist. Export and restore an encrypted backup using a disposable fictional journal; it must preserve the distinction. CSV's final `Flow recorded` column should be true for explicitly logged flow and false for unknown flow. Restore still disables biometrics until explicitly re-enabled.
7. Test both chart and calendar scrolling, keyboard input, large system text, rotation, and TalkBack. Long labels and all controls should stay reachable. On Flip5, also fold/reopen while navigating or editing.
8. Keep biometric cancellation/passphrase fallback, background locking, screenshot/Recents protection, deletion/Undo, and backup sharing in regression testing. Report the device, OS, and version with results.

## 0.4.0 symptom browser checks

The owner reported symptoms, visibility, and biometrics working on October 9, 2026 in the established Pixel 7 / Android 17 context. Retain these checks for regression; individual edge-case outcomes were not separately reported.

Install `cycle-tracker-preview-0.4.0-arm64-v8a.apk` over 0.3.0. Export an encrypted backup first and do not uninstall. This build uses the same preview identity and signing key; the passphrase and biometric key are unchanged.

1. Unlock the updated app, including biometric unlock if already enabled. Verify existing symptoms, custom labels, cramp scores, and notes remain.
2. Open a fictional day. Use **Browse all symptoms** to search `aura`, `lower back`, or another term; switch categories and use **Clear search**. Try **Less common symptoms**, select a new item, and return with **Back to daily journal**. All selected symptoms should appear together.
3. Add a custom symptom in the browser. Verify it is immediately logged under **Your symptoms**, survives lock/restart, and can be selected on another day. Duplicate names should be rejected regardless of capitalization or surrounding spaces.
4. Log a perimenopause symptom, then turn off **Your data → Symptom preferences → Show perimenopause choices**. The category and its curated search choices should disappear. The previously logged symptom must remain in that day's summary and exports. Turn the setting back on and verify the choices return.
5. Lock, force-close/reopen, and unlock offline. The preference and selected symptoms must persist. Use a disposable fictional journal to verify encrypted backup/restore keeps them; restore still turns off biometric access until explicitly re-enabled. Older backups should open with perimenopause choices visible by default.
6. Check Cramps and its 0–10 score, then remove Cramps from the day; the score should disappear. Check that selecting a symptom called Spotting or Skipped periods does not create a period-start marker or alter Flow.
7. Test the symptom browser with the keyboard, large system text, portrait/landscape, and TalkBack. Controls and long labels should remain reachable. The browser uses the existing daily sheet; its **Back to daily journal** button returns to the entry, while Android Back closes the sheet. On Flip5, also fold/reopen during selection.
8. Keep existing lock/privacy, deletion/Undo, and update-in-place retention checks in the regression pass. Changes to sample symptoms and preferences should disappear when leaving sample mode.

Report the device, OS, and build version with results. Automated and browser checks supplement the owner's functional report and do not establish a Flip5 or iOS pass.

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

Report the action, expected result, and actual result for any issue. Use fictional sample data in feedback screenshots. Native screenshots were blocked in previews 0.2.0–0.5.1 and are enabled in testing previews from 0.5.2; store builds retain capture prevention.
