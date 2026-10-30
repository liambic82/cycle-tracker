# Android preview testing

## 0.23.0 storage and export hardening

Make an encrypted backup in the installed preview, then update with `artifacts/android/trifelle-preview-0.23.0-arm64-v8a.apk` (**code 28**). Do not uninstall or clear storage. Package/signing identity and backup format are unchanged. The first successful save migrates Android's local encrypted storage; **do not downgrade the app after migration**. Keep the backup separately.

1. **Update and migrate:** unlock the existing journal, compare older/recent entries and any attachments, make a small disposable edit and wait for Saved. Fully close/reopen, unlock with passphrase, then test biometric unlock. Confirm all records and the edit remain. Test reminders and the selected appearance still work.
2. **Persistence and recovery:** use fictional records for interruption, low-storage and larger-journal checks. A rejected save must remain visibly unsaved and retryable; never force-stop a real journal with pending changes. Confirm several saves followed by restart retain the latest completed state. Measure save/unlock time on Flip5. Automated failure injection does not substitute for native behavior.
3. **Back up and restore:** export after migration, save it outside the app, then restore into a disposable test installation/browser and compare dates, notes, medications, imported sleep and attachments. Retain the source and original backup. Check that restoring disables reminder/automatic-import opt-ins as designed.
4. **Export handoff:** save/open a CSV, PDF, encrypted backup and fictional medical attachment using the phone's actual share destinations. Include a slow receiving app, cancellation, repeated exports, returning to Trifelle, and restarting after the destination finishes. The destination copy must stay readable and a second export must not replace the first. Private temporary copies clear at the next cold start; external copies remain. Report any receiving-app race or startup cleanup error.
5. **Permissions and picker:** select a background photo/medical attachment, import CSV, read a backup, test notifications and import sleep. Broad storage/photo-library and overlay permission prompts should not appear. Screenshots remain enabled for testing. Health Connect's explicit sleep/history grants are unchanged.
6. **Deletion:** only in a disposable journal, confirm whole-journal deletion and restart; no old records should return. Recreate a journal and verify save/reopen. Do not use a tester's only real records for destructive checks.

Continue the consolidated feature and accessibility checklist below. Record build/device/OS and exact results; no 0.23.0 physical-device pass is established by the automated checks or APK build. The eventual Play package is separate: follow [preview-to-Play transfer](play-release-plan.md#preview-to-play-transfer-and-test-evidence).

## 0.22.0 Trifelle branding

Install `artifacts/android/trifelle-preview-0.22.0-arm64-v8a.apk` as an update after making a backup. The launcher label becomes **Trifelle Preview**; package `com.liambic.cycletracker.preview`, signing certificate, storage and journal format **10** remain unchanged. Do not uninstall or clear data to rename the app. Version code is **27**.

1. Confirm old entries, biometrics, reminder choices and appearance survive the update. Test normal unlock, lock/restart, backup and readable PDF/CSV export.
2. Check the four-leaf launcher icon, Android themed icon, static light/dark native launch, Trifelle header and report title. During actual loading the rose accent travels clockwise while the clover stays still. Ready content must appear without waiting for a complete loop. Very fast loading may show no visible animation.
3. Turn on the system's reduced-motion/remove-animations setting; the accent should remain on the upper-right leaf. Check background/reopen, large text, TalkBack and light/dark appearance. Keep selected palettes/backgrounds unchanged.
4. Retest Calendar & journal and wearable sleep with the 0.21.0 checklist below. Verify the home-screen shortcut now identifies Trifelle and notification icons remain recognizable.

No 0.22.0 physical-device pass is claimed by packaging or automated checks. The iOS preview is a separate test effort; see [its platform limits and installation requirements](ios-testing.md).

## 0.21.0 Calendar & journal

Install `artifacts/android/cycle-tracker-preview-0.21.0-arm64-v8a.apk` as an update. Version **0.21.0 / code 26**, journal **format 10**, existing preview package and signing certificate. Back up first. The owner approved Calendar & journal, History and wearable sleep on October 18. Use this layout checklist instead of older Journal-first/Day-tab expectations; the underlying feature checks remain relevant.

1. **Calendar first.** The cycle summary, Add period and calendar should be easy to find. Test Month/Year, previous year → January/December, Today, Find date (including leap day and invalid dates), and month arrows. Scroll to earlier/later months across years. Open/close a date after scrolling and check the same position returns. Test four-, five- and six-week months and larger system text.
2. **Focused journal.** Tap a date; check previous/next day beside its heading. Open observations, medications/dose form, manual sleep, flow/product form, sexual details, notes and symptom ratings. A form must open visibly. Save status/error stays at the top; explicit-save forms name the Save/Add action needed to apply changes. Android Back cancels the current unsaved form first, then returns to the journal, then calendar. Verify saved values, cancellation, deletion confirmation and Undo using disposable records.
3. **Settings and symptoms.** Journal settings → Section order/Pinned symptoms. Reorder all seven sections. Pinning must not log anything; each daily chip appears once. Unpin a logged symptom and confirm it remains visible. Check custom symptoms, hidden perimenopause labels already logged, optional ratings, lock/restart and backup/restore preferences.
4. **History.** Recorded charts appear first, with units, unknown/incomplete values and statistics intact. Expand observations, symptoms and sleep; open a date and close it to return to the same History view. Verify a date from Saved nights likewise returns to wearable sleep.
5. **Wearable sleep.** Verify permission status and chosen source are truthful. Import on unlock remains off until explicitly enabled. Sync the Inspire 3, load nights, choose the source, batch-review/import, then open Saved nights. Incomplete stage data must show Unknown as its total, not zero. Retest last-result/Check sleep now, permissions, failures, corrections/overlaps and manual values using the 0.20.0 checklist below. Browser fictional imports are not hardware validation.
6. **Appearance and access.** Check light/dark and approved backgrounds, 320 px-class narrow layouts, large system text, TalkBack, keyboard, rotation and Flip5 fold/reopen. Explore remains reachable beneath the calendar; its cycle context/experimental estimate and the three-hormone guide retain their qualifications.

Physical-device results are pending. Continue the consolidated local-Android regression, including encrypted retention, biometrics, reminders, backup/restore and exports. No store-release or 1.0 decision is implied.

## 0.20.1 navigation repair

Install `artifacts/android/cycle-tracker-preview-0.20.1-arm64-v8a.apk` as an update. Version **0.20.1 / code 25** keeps journal **format 10**, package and signing certificate. The proposed layout redesign is not part of this build.

1. Choose Year view. Its controls and grid should stay visible. Choose a previous year, then January; January must appear first, not March. Repeat with December and the current year.
2. Switch Month/Year/Day. Month and Year reveal their controls; Day reveals the selected journal. Previous/next day and date jump should reveal the requested destination. Check Today and the Calendar tab separately.
3. Expand the hormone guide, then open observations, symptoms/pins, order, sleep or medications. The selected form must be visible immediately. Return to the journal; it should be visible without scrolling past the guide again.
4. Open a historical day from a scrolled month, change a sample symptom, then close using both the close button and Android Back. The same part of the calendar should remain visible. Repeat with days having very different amounts of content and with the guide expanded/collapsed.
5. Check earlier/later month scrolling, date jumps across years, narrow/large text, keyboard opening, TalkBack and Flip5 folding/rotation. Lock/background/reopen during navigation and check that no delayed action opens the wrong screen.

Browser checks and signed compilation passed; physical Android validation is pending. Continue the 0.20.0/consolidated checklist below without treating this patch as a full phone pass.

## 0.20.0 Journal first and foreground sleep import

Preview **0.20.0 / code 24**, journal **format 10**. Install as an update, retaining the existing preview journal. Export a backup first; restoring a new backup requires 0.20.0+. Use fictional records for destructive/permission/failure checks. No real records, passphrases or private attachments need to be sent to the developer.

1. **Journal first.** Confirm a compact current-cycle day/last-period summary and Add period, then daily tasks. Reorder all seven sections; lock/reopen and restart. Pin/unpin catalog and custom symptoms without changing the logged count. Logged symptoms stay visible when unpinned; full browsing/search still works and shows pins first. Verify order and pins on encrypted backup restore.
2. **Daily regression.** Log observations, medication doses, manual sleep, flow/products/clots/flooding, sexual details and notes. Check autosave/error/Undo visibility, existing data and the Entry options deletion safeguard. Check Add period ranges. Explore must still reach cycle context and the unchanged experimental period-estimate controls/disclaimer.
3. **Calendar scrolling.** Scroll down into the first visible month, then upward to preceding months; earlier months should insert without losing the visible day. Continue across years and long histories. Open/close a day with different amounts of content and retain the calendar position. Use Today, date jump, year and day modes; tap the Calendar tab to return to the top. Check text scaling, TalkBack, rotation/folding and gesture smoothness on Pixel 7 and Flip5. Browser checks do not establish native frame timing.
4. **Hormone guide.** Initially collapsed. Confirm all three legends (estrogen, progesterone, testosterone), different line styles, relative-pattern label, individual-variation wording and medical-advice qualification. No individual concentration or personal marker appears. Check light/dark palettes and large text.
5. **Opt-in sleep.** Default off. Sync the Inspire 3 in its phone app, grant Sleep access, load nights, verify source and explicitly enable that source. Lock/unlock with genuinely new shared records; only new non-overlapping sessions should save. Verify last-check time/count, Saved nights, manual values retained, repeat check without duplicates and absent/late source data. A check cannot force Fitbit to publish a night. Check sleep now should retry without prompting for new access.
6. **Review/removal.** A corrected source record or overlap should stay for review, with Load nights to review leading to the manual batch flow. Compare saved values before approving replacements. Remove a copy, then check again: it must stay removed. Undo or deliberately reimport restores it. Repeat with full-entry deletion. Source deletion must not silently erase retained journal copies.
7. **Lifecycle and failures.** Start a read and immediately background/lock/disconnect; late data must not apply. Test rapid unlocks, revoked permission, unavailable Health Connect, empty results, offline/delayed tracker sync, interrupted/failed storage and explicit retry. Manual journaling remains usable. Only a persisted import reports saved; no background permission or closed-app job is present.
8. **Restore and full regression.** Restore a backup with automation previously on: pins/order persist but automation is off. Re-enable only deliberately after verifying this device's source. Complete the earlier consolidated local-Android checklist (0.18 and 0.19), with the automatic-import exception above replacing older assertions that all imports are manual. Confirm biometrics, reminders, exports, attachments and offline access.

Record device/OS, build, pass/fail and concise reproduction steps. This checklist is pending until actual results are supplied; no 1.0 decision is implied.

## 0.19.0 period ranges and bulk sleep import

Install `artifacts/android/cycle-tracker-preview-0.19.0-arm64-v8a.apk` over the existing preview after making an encrypted backup. Do not uninstall or clear storage. Code **23** retains the preview package/signature; screenshots remain enabled. Journal **format 9** migrates formats 1–8. New backups need **0.19.0+** on the receiving app. The October 12 feedback reports update, entry and backup creation, but not a full device pass or verified restore.

1. **Period catch-up:** from Calendar → Add period, choose a past start and finish on the same screen, using month/year navigation. Leave Add details later selected, review the span and Save. All selected days should show bleeding with an unspecified flow level; only the first/last get boundary markers. Add another period should clear the form and retain the month. Back to calendar should select the added start. Try a single day, start only, a cross-month range, a leap day and Cancel without saving.
2. **Preservation and conflicts:** use fictional dates with notes, sleep, symptoms or a known flow level. Adding a range must retain these. Repeating the same span must not duplicate it. Existing no-flow/spotting, a conflicting boundary or an overlapping recorded period should stop the whole operation. Check future/reversed dates cannot save. Edit individual daily flow afterward and check start/end/history still agree.
3. **Batch sleep:** sync the Inspire 3 in its paired app, then load recent sessions in Your data → Import wearable sleep. A single source should show nights immediately; with multiple sources choose explicitly. Select all new nights or individual nights, deselect one, review the selected list, go back without importing, then import several together. Only selected sessions should appear. View saved sleep nights should take you directly to their history; manual sleep stays separate.
4. **Repeat and update:** reload: already-imported nights must not duplicate and must be excluded from Select all new nights. A changed source record needs explicit selection and a warning that the copy will be replaced/moved. Review overlap and incomplete-stage wording. Switching source/range, backing out, backgrounding or locking must not import pending choices. Check permission denial/revocation and offline saved-history access using the existing 0.17.0 checks.
5. **Storage and phone usability:** verify old records survive the upgrade and lock/restart. Round-trip a format-9 backup into a disposable updated journal, including unspecified-flow days and several sleep imports; keep the original backup. Check CSV/PDF wording, larger text, TalkBack order/labels, Android Back, folding and rotation. Continue the consolidated 0.18.0 checklist below on this build.

Record device/OS, build and specific pass/fail results. No 0.19.0 hardware pass is claimed by the automated/build/browser checks.

## 0.18.1 prediction disclaimer patch

Install `artifacts/android/cycle-tracker-preview-0.18.1-arm64-v8a.apk` over the existing preview after saving an encrypted backup. **Do not uninstall or clear app storage.** Version code **22** retains the preview package and signing identity. No journal-format, prediction-method or eligibility-rule change accompanies this patch. Screenshots remain enabled for testing.

Use the current preview for the full **0.18.0 consolidated checklist below**, including these focused checks introduced in 0.18.1 on Pixel 7 / Android 17 and Galaxy Z Flip5:

1. Open **Explore period estimate**. Before enabling estimates, confirm that the full “Predictions are not medical advice” paragraph is visible before the controls and readable with larger text.
2. With a suitable fictional sample history, select the comparable-pattern context and completeness confirmation. Confirm the offered date also says **“Estimate only. Not medical advice.”** The experimental label, contraception warning and historical-range limitations should remain.
3. Select unknown or changing-cycle context: the estimate should still be withheld. Return to the calendar and reopen: the estimate should start off, with the disclaimer present.
4. Check scrolling and wrapping, TalkBack reading order, folding/rotation and offline reopening. Keep the real journal intact; sample changes remain temporary.

Automated tests, browser checks and APK verification are recorded separately in [validation evidence](validation.md). No 0.18.1 hardware pass has yet been reported.

## 0.18.0 consolidated local Android test build

Install `artifacts/android/cycle-tracker-preview-0.18.0-arm64-v8a.apk` over the existing preview after saving an encrypted backup. **Do not uninstall or clear app storage.** Code **21** retains the existing package/signature. Format **8** migrates formats 1–7; new backups need 0.18.0+ on the receiving device. Screenshots remain enabled for testing. Latest reported phone pass is 0.15.0; this is the combined new-feature and regression pass for Pixel 7 / Android 17, Galaxy Z Flip5 and Fitbit Inspire 3 on its paired phone. Record the Flip5 OS and which phone is paired with the wearable.

Use fictional entries and disposable attachments for destructive/recovery tests. [Exact scope and remaining dependencies](android-completion.md).

1. **Upgrade, lock and recovery.** Check prior entries, medications, photos and theme survive the update. Create/unlock on Flip5 without a spinner stall; show/hide passphrases, biometric cancellation/fallback, background lock and offline restart still work. New fields on old entries must be blank. Round-trip a new encrypted backup with all new fields and attachments; restore an older backup into a disposable test journal. Notification opt-ins reset on restore; stored care plans remain. Verify source permissions remain OS-managed.
2. **Daily observations.** Open a past day's optional form. Save pain locations, hot flashes including 0, ratings, activity, weight/unit, one or both blood-pressure fields, temperature/unit and test/mucus observations. Check blank versus zero, invalid input, changing units, Cancel after Clear, switching days and locking with a draft. Dated history must show the right units and open the correct day. Missed/skipped markers must not create bleeding or a cycle length; relevant experimental estimates should be withheld. Whole-day deletion/Undo restores observations.
3. **Medical records.** Under Your data, save/edit two fictional same-test/unit numeric labs and one qualified text result; inspect dated chart, reference text and recorded cycle day. Check different units stay separate, long names, unknown dates for medical history, future appointment/time, doctor questions/completion, search, calendar/day presentation, confirmed deletion/Undo and leaving unsaved drafts. Future appointments should remain visible without enabling future daily health logs.
4. **Attachments.** Choose small PDF/JPEG/PNG fixtures, cancel a picker, try an oversized/wrong-type file and the two-file limit. Background/lock during picking/sharing must not apply late data. Save, restart offline and export a readable copy; compare it to the original. Verify full backup/restore retains files and medical deletion/Undo restores them. PDF/CSV must include only attachment counts, not file contents. Confirm native temporary share cleanup and interruption recovery using disposable files.
5. **Care reminders.** In Medications, add journal/patch/ring/injection/refill/appointment/custom plans using your own test dates/intervals. Saving alone must not enable alerts. Deny then grant notifications, enable one plan, verify generic lock-screen content, once/every-N-days/end-date rules, pause/resume, completion/Undo and cancellation after plan removal. A journal entry suppresses that day's journal reminder. No care action logs a medication dose. Recheck timezone/DST, shared queue/deadline, offline delivery, battery restrictions, restart and refresh. Keep the 0.9.0 checklist below for detailed delivery checks.
6. **Past medication corrections.** Save a dose, add a later/future plan, then use Correct past schedule. Review the affected dates and record count, Cancel first, then apply a fictional correction. Later boundaries must remain, recorded doses must retain their original names/amounts/times, and current upcoming alerts should refresh only after save. Correct actual dose facts in the daily dose editor. Check normal future schedule editing and CSV/PDF history too.
7. **Earlier history/import.** Review a remembered start/end; Cancel first and verify nothing applied. Apply and check only the supplied dates are logged. Download the CSV template, replace its fictional row and choose it. Check preview, deselection, duplicate reimport, a conflicting existing note/flow, invalid/future date, multiline quoted text, native picker cancel and leaving while loading. Only selected valid rows apply; unrelated observations remain. This does not import arbitrary vendor files.
8. **Fitbit and older history.** Run the complete 0.17.0 Inspire 3 checklist below plus manual sleep regression. Initial permission asks only for Sleep. Where supported, separately request older history, deny then grant it; 90/365-day choices should follow the grant. Compare genuinely older source sessions with Health Connect, review before importing and reimport without duplicates. Revoke history while keeping Sleep and check recent reads still work. Disconnect revokes access but preserves copies. No background permission or automatic import should occur.
9. **Widget.** Add Cycle journal from both launchers, resize, rotate/fold, increase text, restart the phone and tap it while the app is locked. It must show only the static title/open prompt and enter through the normal lock flow. No health information should appear in the launcher.
10. **Exports and usability.** Check CSV test opt-in starts off; context/free text stays included as explained. Preview selected Daily observations, Tests and Medical records PDF sections, limited dates and Notes off/on; undated medical history is labeled, future appointments beyond the end are excluded and attachments are not embedded. Open/share the final PDF and cancel another share. Check keyboards, Android Back, TalkBack, large text, 320-ish narrow layouts, desktop, folding, dark/light palettes and offline use. Recheck medications, products, sexual-field export choices and the established deletion safeguards.

Report the build, device/OS, pass/fail and any reproducible steps or testing screenshot. Do not send a real journal backup, medical attachment or passphrase. Hardware acceptance is separate from the automated/build evidence in the validation record.

The first native target is a standalone, release-mode APK for the Pixel 7 and Galaxy Z Flip5. JavaScript is bundled into the APK, so an installed preview does not need the development server or an Expo account.

## App identity and data

The test app is named **Cycle Tracker Preview** and uses `com.liambic.cycletracker.preview`. The future store app has a separate identifier. Each installation has its own journal; the browser's journal does not appear automatically. Use an encrypted backup to move a journal between them.

Start with the fictional sample journal. Use invented entries and a test-only passphrase when checking persistence and recovery. Real-device behavior and security validation are still in progress.

## 0.17.0 Fitbit Inspire 3 sleep import

Testing wearable: **Fitbit Inspire 3**, as specified by the owner on October 10. Start on the Android phone already paired with the tracker. Pixel 7 / Android 17 and Galaxy Z Flip5 remain the phone targets; record which phone is paired, its OS, Fitbit/Google Health app version and Inspire 3 firmware when reporting results. No new 0.16.0/0.17.0 phone pass has been reported yet.

Install `artifacts/android/cycle-tracker-preview-0.17.0-arm64-v8a.apk` over the existing preview after an encrypted backup; do not uninstall or clear storage. Code 20 and the existing preview signing identity allow an in-place update. Format 7 preserves earlier records; new backups require 0.17.0+ on the receiving app. Android minimum is API 26; Health Connect requires a supported Android 9+ phone. This remains a testing preview with screenshots enabled.

1. Wear the Inspire 3 for sleep, then sync it in Fitbit/Google Health on its paired phone. Confirm the sleep appears there. Search Android Settings for **Health Connect** (Android 14+); on older supported Android versions use Google's installed Health Connect app. In the source app's Health Connect permissions, allow it to **write Sleep**, then verify that a sleep record appears in Health Connect. No Cycle Tracker data is sent back. Menu labels vary by source-app version. [Google's connection instructions](https://support.google.com/googlehealth/answer/14506680?hl=en).
2. In a saved test journal, open **Your data → Import wearable sleep → Allow reading sleep**. The system permission sheet must request **Sleep read access only**. Initially deny/cancel; manual journaling must still work. Open the privacy information from the system permission sheet and from the app: it should show static sleep privacy text, including while the journal is locked. Grant Sleep when ready, return and check the status. No reading should occur until **Load recent sleep sessions** is pressed.
3. Load 7 days, choose the source that receives the Inspire 3 records (a package name may appear), then review one session. Compare start/end, waking day, full session span, recorded asleep stages and unknown time with Health Connect. Compare Fitbit's display too, but do not assume its proprietary total/score is identical. Missing stages must remain unknown, not turn the whole session into asleep time. Cancel a review and verify nothing was imported.
4. Import one session into a date with manual sleep already present. The manual hours/quality/wakings, symptoms, flow and notes must be unchanged. In History and the day's **Review imported sleep**, verify the separate source record. Load again and review the same session: it must say Already imported and offer no duplicate Import button. Test a daytime nap and more than one source/session if available; overlapping records must warn and stay separate.
5. With disposable source data or a harmless source correction, reload a changed session and review **Update imported copy**. Only its imported copy may change/move date; manual fields remain. Deleting a source record must not silently delete the local copy. Remove an imported copy from its daily entry, cancel first, then confirm, then Undo. Whole-day deletion/Undo should also restore imported stages and other daily fields. Do not delete real tracker data solely to run this test.
6. Revoke Sleep in Health Connect, return and check the connection; subsequent reads should fail safely without changing stored entries. Regrant to test **Disconnect Health Connect** inside the app. Disconnect must revoke access and retain existing copies. Back out during a read/review, background the app, and allow the normal lock to occur: late results must not import or show on the lock screen. Reload after returning. A phone restart or interrupted permission flow must remain recoverable through Check connection and system settings.
7. Read records already present in Health Connect while offline; Fitbit syncing itself may need its own network connection. Restart/unlock offline and confirm saved copies/manual values remain. Check that the sample journal uses only fictional data and requests no health permission. On a computer, transfer an encrypted 0.17.0 backup from a disposable test journal: imports should display, while real device connection stays Android-only.
8. Verify journal CSV source descriptions and Sleep-only PDF date filtering, and confirm excluding Sleep removes imported details. Test new encrypted backup/restore and an older backup: prior manual sleep/severity/medications must survive; source grants stay managed by the OS and are not copied in a backup. Test numeric/manual sleep regression from 0.16.0 below, keyboards, TalkBack, large text, rotation, Flip5 folding, biometric unlock, photos and reminders.

If no sessions appear, check that the tracker synced, the source app can write Sleep, Cycle Tracker can read Sleep, and the selected 7/30-day range contains a source record. Report the source name/package, permission state and whether stages are present; no health-record export or passphrase is needed to diagnose setup. Exact native permission behavior and real Inspire 3 metadata are hardware checks, not established by the automated/demo pass.

## 0.16.0 manual sleep details and history

Install `artifacts/android/cycle-tracker-preview-0.16.0-arm64-v8a.apk` over the existing preview after an encrypted backup. Version code is 19; package and signing identity are unchanged. Do not uninstall or clear storage. Journal format 6 preserves older records; new backups need preview 0.16.0 or later on the receiving device.

The owner reported “Phone tests passed. Keep going.” after 0.15.0 on October 10, in the established Pixel 7 / Android 17 and Galaxy Z Flip5 testing context. No per-device breakdown, Flip5 OS details, timings or individual checklist results accompanied it. Fitbit was selected as the first wearable integration; that connection is planned next and is not present in this APK. New sleep checks are pending:

1. On a fictional day, open **Sleep details · optional**. Record the main sleep on its waking date, including daytime sleep. Try 7 hours 30 minutes, Good and 1 waking; Save and reopen. Clear form fields then Cancel: the saved values must remain. Clear then Save: only sleep details clear, preserving symptoms, flow, notes and other fields.
2. Save quality alone, wakings alone, an explicit duration 0 and wakings 0. Blank values must remain Not logged; neither symptoms nor flow should be inferred. Hours/minutes use whole numbers: 25 hours, 60 minutes, 24 hours plus 1 minute and 101 wakings should fail without changing the saved record. Filling one duration component treats its blank partner as 0. Change date or leave without saving and confirm the draft is not applied to another date.
3. Under **History → Explore sleep history**, check 30/90/365-day ranges, newest-first dates, quality-only rows and zero-duration rows. Missing duration must not appear as zero. Tap a row and confirm its correct waking day and values. Sleep disruption symptom severity stays in symptom history. Confirm whole-entry deletion/Undo restores sleep with the other daily fields.
4. In a saved fictional journal, lock/unlock and fully restart offline; saved sleep must persist. Unsaved sleep changes should be discarded when the editor is dismissed or the journal locks. Update over 0.15.0 and confirm prior ratings, cramps, medications, doses and other records survive with sleep unlogged. Restore an older backup into a disposable test journal, then round-trip a new 0.16.0 backup; no sleep values should be invented or lost. Reminder/photo restore behavior remains unchanged.
5. Export journal CSV: verify Sleep duration (minutes), Sleep quality and Night wakings, including blanks versus zero. Preview a doctor summary with only Sleep selected and a limited date range, then exclude Sleep and include Symptoms. Only selected fields and dates should appear. Export/open the PDF, verify layout and values, and cancel a separate native share sheet safely.
6. On both phones check numeric keyboards, Save/Cancel, scrolling to errors, larger system text, TalkBack, rotation and Flip5 fold/reopen. The form must remain reachable without clipped controls. Recheck passphrase/biometric unlock, reminders, backgrounds and PDF sharing. Automated/browser results do not establish these native observations. No wearable data permission should be requested in this version.

## 0.15.0 symptom severity and dated history

Install `artifacts/android/cycle-tracker-preview-0.15.0-arm64-v8a.apk` over the existing preview after an encrypted backup. Version code is 18; package and signing identity are unchanged. Do not uninstall or clear storage. Journal format 5 preserves older records; new backups need preview 0.15.0 or later on the receiving device.

The owner reported “Phone test passed. Move on” after 0.14.0 on October 10, in the established Pixel 7 / Android 17 and Galaxy Z Flip5 testing context. The subsequent “Phone tests passed. Keep going.” records the reported 0.15.0 phone pass. No per-device breakdown, Flip5 OS details, timings or individual checklist results accompanied it. Retain the following checks for regression:

1. On a fictional day, log several symptoms and open **Rate symptoms · optional**. They start Not rated. Choose 0, 5 and 10 for different symptoms, return with Done, and verify the selected symptom chips show the ratings. Change one rating, clear another, and confirm clearing retains its symptom. Cramps has one shared rating in both the daily controls and this panel.
2. Remove a rated symptom, re-add it, and verify its previous rating is cleared. Rate a custom symptom and a perimenopause choice; hiding perimenopause choices must not hide or erase their existing ratings. Edit another date and confirm ratings stay attached to the correct day. Future entries remain unavailable. Confirm whole-entry deletion and Undo restore all ratings and unrelated fields.
3. Under **History → Explore symptom history**, inspect cramps and other symptoms. Search recorded labels and switch 30/90/365 days. All bars use 0–10; 0 says None, an unrated log says Not rated, and days without the selected symptom logged count as unknown. A note-only day must not become a zero. Tap a dated row and verify it opens that entry. Close/reopen the panel and navigate away/back.
4. In a saved fictional journal, lock/unlock and fully restart in airplane mode; ratings should persist. Install over 0.14.0 and confirm old cramps, products, sexual-health values, medications and doses survive. Restore an older encrypted backup into a disposable test journal: no new ratings should be invented. A new encrypted backup restored into 0.15.0 should retain every rating. Restore still turns off reminders and removes the saved personal-photo copy as documented.
5. Export journal CSV and inspect the new Other symptom severity column, plus the existing cramps column. Preview a doctor summary with Symptoms and severity only, then Mood and mind only, then neither: ratings must follow their section and date range. Export/open the PDF and verify numeric 0 and custom labels. Notes and structured sexual fields remain independently controlled; free-text symptom labels can themselves contain sensitive wording.
6. On both phones, check the number buttons, selected states, clear controls, search keyboard, scrolling, large text, TalkBack labels and Flip5 fold/reopen. Recheck passphrase/biometric unlock, backgrounds, reminder delivery and PDF sharing. Automated/browser checks do not establish native accessibility, delivery or update-in-place retention.

## 0.14.0 personal-photo backgrounds

Install `artifacts/android/cycle-tracker-preview-0.14.0-arm64-v8a.apk` over the existing preview after an encrypted journal backup. Version code is 17; package/signing identity and journal format 4 are unchanged. Do not uninstall or clear storage. This version continues the approved appearance scope and remains a 0.x preview.

The owner reported “Phone validations pass. Let's move forward” on October 10 following 0.13.0. Record that as an owner-reported phone pass in the existing Pixel 7 / Android 17 and Galaxy Z Flip5 context. No per-device checklist breakdown, Flip5 OS details, or timing measurements accompanied it. The older checklists remain useful regression instructions, rather than evidence that each old pending check failed or was independently witnessed.

New checks for **both phones**:

1. Under **Your data → Customize appearance → Your own photo**, choose a JPEG and a PNG, including a camera photo with orientation metadata. The preview must appear upright before **Use this photo**; cancel keeps the previous background. Only one file can be chosen; no broad photo-library permission is requested. HEIC, GIF, SVG and videos are outside this slice. Source limits: 12 MiB, 32 megapixels, 8192 pixels per side.
2. Apply, choose another, cancel its preview, then replace. Check portrait/landscape and Flip5 fold/reopen, light/dark mode, large text and TalkBack. The centered cover crop may differ by screen shape; records remain on opaque surfaces. Try visibility 0 and 60 percent, and switch to built-in art then **Use saved photo**.
3. Cancel the system picker, navigate away while processing, and background for over a minute with the picker open. Return to a usable screen without a late preview or applied photo after locking. Passphrase/biometric unlock, restart, and airplane-mode reopening should retain an applied photo, with none visible on the lock screen or privacy cover.
4. Try a too-large or damaged image on a disposable test installation. Expect a readable error and the previous photo intact. Processing is capped at 1600 pixels on the long side and 512 KiB; noisy images may be reduced further. Check operation time on each phone. Storage write/read failures are covered automatically; do not fill a phone with real records to simulate failure.
5. Remove the personal photo, then choose a new one and reset appearance. Only the app's copy disappears; the original remains in the device library/files. Reset returns to Plum/System/Plain/25%. In sample mode, photo changes/removal/reset remain temporary and never show or change the saved journal's photo.
6. With fictional data and recoverable journal backups, check restore/deletion: a valid journal restore (even the same journal) removes the saved photo; a wrong-passphrase or invalid backup preserves it. Deleting the journal also removes it. Photos never appear in encrypted journal backups, CSV or PDFs; choose them separately on another device. Restore can remove the photo before a later operation fails, so it may need choosing again after a failed replacement.
7. Recheck journal saving, backup sharing, passphrase/biometric unlock, medication reminder delivery and existing built-in images. Native image orientation, app-private temporary-file cleanup, cancellation and memory/performance need hardware observation; the browser and automated passes do not establish those results. Native iOS validation remains future work.

## 0.13.0 approved palettes and backgrounds

Preview 0.13.0 used version code 16 with unchanged signing identity and journal format 4. The owner reported its phone validations passed on October 10 in the **Pixel 7 / Android 17** and **Galaxy Z Flip5** testing context. Retain these checks for regression when installing a newer preview; the report did not provide individual measurements or checklist results.

1. Open **Your data → Customize appearance**. Try all nine palettes and both named images in each of the six collections. Pair an image with a different palette. Calendar flow states must keep their meaning, and all text, controls and selected states must remain readable. Android Back returns to Your data.
2. Try **Light**, **Dark**, and **System**. With System selected, change the phone's system appearance, background/reopen the app, and verify the new mode. With an explicit mode selected, it should remain selected. Check the keyboard, status/navigation bars, setup/unlock fields, entry sheet, symptoms, medication forms, history, education and reports.
3. Test **Plain**, **Soft wash**, both slider endpoints and intermediate values. Zero hides decoration; 60% is strongest. Text stays on opaque surfaces and artwork never intercepts taps. Reset restores Plum/System/Plain/25% without changing entries.
4. In a saved fictional journal, choose a palette/image/mode, lock and reopen, then fully restart the app: choices should persist. Artwork must not appear on the lock screen or background privacy cover. Journal content and biometric unlock must remain intact. Appearance is local and excluded from encrypted backups, CSV, and PDFs; restoring a journal retains this device's existing appearance.
5. Exit to sample mode, try different appearance choices and reset, then leave the sample: the saved journal's appearance must return. Sample appearance changes must disappear after restart. The sample must never request notification or biometric setup.
6. In airplane mode, open every artwork collection, select all twelve images, navigate entries and restart. The installed app needs no download for its backgrounds. Check scrolling and touch targets in portrait/landscape, Flip5 folded/reopened, large system text and TalkBack. The slider should announce percentages and permit adjustment.
7. Retest fictional record saving, passphrase/biometric unlock, backup/restore, PDF sharing, and medication notifications. Earlier hardware checklists remain outstanding; automated/browser validation is not a new device pass.

The original PNGs are bundled unchanged for this preview (about 26 MiB of artwork). Asset compression can be considered after appearance/device review without changing the approved art. Personal-photo selection follows in 0.14.0 above. The owner subsequently reported the phone validations passed on October 10.

## 0.12.0 experimental period estimates

Install `artifacts/android/cycle-tracker-preview-0.12.0-arm64-v8a.apk` over the existing preview after an encrypted backup. Version code is 15; package/signing identity and journal format 4 are unchanged. Do not uninstall or clear storage. These checks are pending on Pixel 7 / Android 17 and Galaxy Z Flip5.

1. Open **Calendar → Explore period estimate**. Estimates must start off, and no dates should appear until you enable the session switch, select a comparable situation, and confirm the displayed starts are complete. All other context choices keep dates unavailable. Context changes clear the completeness confirmation. Use the fictional sample to exercise a sufficient-history case without altering real records.
2. In sample mode, the latest start is ten days before today; six intervals alternate 30/29 days. After review, the median estimate should be 30 days after that start, with a 29–30-day historical spread and three earlier-entry checks. Open calculation details and inspect the comparisons. This is a demonstration, not clinical validation.
3. Return to the calendar, switch tabs, use Log today, lock/unlock, and use Android Back. Reopening must start off with no retained answers. The selected date and recorded entries must stay intact. No predicted bleeding colors or automatic period starts should appear.
4. With a fictional sparse journal, the view should explain that seven recent starts are needed. In a disposable test journal, a large gap/variable history or changed start should recalculate without trimming records or moving the estimate forward. Unit tests cover expiry and date boundaries; do not alter the phone's clock or real journal to simulate them.
5. In airplane mode, test first use, toggles, details, and navigation. Try TalkBack, large text, rotation, keyboard focus where applicable, and Flip5 folding/reopening. All context choices, dates, explanations, and history rows must remain readable and reachable.
6. Confirm existing journal retention, passphrase/biometric unlock, recording, backup, PDF sharing, and medication reminders. Earlier hardware checks below remain outstanding; approval to develop 0.12.0 is not a new hardware pass.

## 0.11.0 daily context and education

Install `artifacts/android/cycle-tracker-preview-0.11.0-arm64-v8a.apk` over the existing preview after an encrypted backup. Version code is 14; package/signing identity, journal format 4, passphrase, and biometric credentials are unchanged. Do not uninstall or clear storage. These checks are pending on Pixel 7 / Android 17 and Galaxy Z Flip5.

1. From **Calendar → Explore cycle context**, verify the selected date, most recent recorded start, cycle day, and flow. A missing start must show unknown context; an unlogged flow must differ from explicitly None. Personal phase must always say **not determined**. A future date must not project a cycle day or flow.
2. Open a daily entry and choose **Explore this day’s cycle context**. Check it in Month's sheet and Day view. Return with **Back to daily journal**; date, flow, symptoms, and notes must remain unchanged. Android Back in a phone sheet dismisses the sheet; Android Back in the full calendar context view returns to the calendar.
3. Browse all nine topics using both the horizontal topic strip and Previous/Next. Boundaries should disable the corresponding button. Selecting a hormone or ovulation topic must not change the selected date's unknown phase or assign hormone levels. Medication content must remain general regardless of your saved medication names.
4. Under **Your data**, turn off **Show perimenopause choices**, then reopen context. Only the dedicated perimenopause topic should be absent (eight topics); saved perimenopause symptoms must remain. Turn the preference back on afterward if desired.
5. In airplane mode after installing the APK, browse the cards, including first use. Text should be available without a download. When connected, tap a source: it should open the named public webpage and return normally to the app. If away for over a minute, the normal journal lock should apply. Source links contain no journal details.
6. Test large text, TalkBack reading order/selected topic/disabled buttons/link labels, rotation, the Flip5 folded/reopened layout, and horizontal scrolling without trapping vertical scrolling. Full text, navigation buttons, and sources must stay reachable. Lock/reopen should reset topic browsing while retaining the journal and visibility preference.
7. Continue pending 0.10.0 PDF-sharing/offline checks and 0.9.0 real notification-delivery checks below, plus the earlier Flip5 creation retest. No new hardware pass has been reported for these versions.

The education is source-checked general information, not independently clinically validated personal guidance. Personal predictions and phase-specific advice are not implemented in this build.

## 0.10.0 doctor summaries and PDF export

Install `artifacts/android/cycle-tracker-preview-0.10.0-arm64-v8a.apk` over the existing preview after making an encrypted backup. Version code is 13; package, signing certificate, journal format 4, passphrase, and biometric credentials are unchanged. Do not uninstall or clear storage. This remains a development preview, with screenshots enabled. The following checks are pending on Pixel 7 / Android 17 and Galaxy Z Flip5.

1. Confirm existing records, medication schedules, and unlock still work. Open **Your data → Create doctor summary**. The initial range is 90 days. Notes and all four sexual-health switches must be off; other general sections start on.
2. Try an invalid/reversed/future range, more than 366 days, and all sections off. Each must show an explanation without exporting. Then choose a short range containing fictional records and preview it.
3. Compare the preview with your records: unknown flow versus No, incomplete cycles, products/amounts, mood versus other symptoms, dated medication changes, and Taken/Skipped/Taken late. Future schedule changes outside the range must be absent. Unrecorded doses must not be called missed.
4. Verify excluded notes and sexual-health values are absent. Enable only Libido: explicit None/High should appear without activity/orgasm/intensity values or excluded-only dated rows. Notes require a separate choice. Free-text labels may still contain sensitive wording. Use **Change report choices**, then leave/reopen the report: new-report privacy defaults must reset.
5. Tap **Export readable PDF**, select a local file destination, and open the saved PDF. Compare all sections with the preview, including page numbers and long notes across pages. The PDF is deliberately readable and unencrypted. Confirm no text is clipped, hidden, or silently omitted. Cancel a separate share sheet and verify you return to a usable report; cancellation must not claim a file was saved.
6. In airplane mode, generate and open a PDF, including the first export after installing this APK. Fonts are bundled and should not require a network download. Use accented fictional text; emoji/unsupported scripts should show an explicit export error without changing the journal. Large reports may request a shorter range/fewer sections.
7. Lock or change tabs while generating a larger fictional report: generation must not open a later share sheet. Check background lock during sharing, cancellation, reopening after termination, and another export. Dedicated temporary export files should be cleaned after sharing and on next startup, without touching files saved elsewhere.
8. In sample mode, the preview and every PDF page must identify fictional sample data. Check phone keyboard scrolling, TalkBack labels/switches, larger text, rotation, and Flip5 fold/reopen. PDF tagging and broader script coverage remain release work.
9. Continue the **0.9.0 reminder checks below**, including actual delivery, permissions, cancellation, reboot, and time-zone changes. Earlier Flip5 creation and passphrase/biometric regressions remain pending; this build includes their fixes but does not establish a new device pass.

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
