# Native large-journal performance and recovery — 0.29.0

November 2, 2026 · preview 0.29.0 / build 36. All native records used here are generated fiction in a disposable Android 16 / API 36 AOSP emulator. These results are separate from physical Pixel 7 / Galaxy Z Flip5 validation.

## What changed

The distributed 0.28.0 release APK was slow when saving large journals. A local, undistributed diagnostic build attributed substantial time to whole-envelope JavaScript SHA-256 and AES-GCM work. The diagnostic build was used for attribution only; the before/after table uses the ordinary signed release APKs.

On Android, the existing local crypto module now runs SHA-256 and AES-GCM with the platform Java cryptography implementation on a background dispatcher. Native encryption also serves backup export and confirmed restore. The portable implementation remains in use on web/iOS. The envelope, PBKDF2 parameters, AES-GCM authenticated data, 12-byte nonce, 128-bit tag, 8 MiB limit and journal schema are unchanged. No migration or network access is added.

The save queue owns each accepted snapshot and a temporary key copy until asynchronous encryption completes. Pending edits still coalesce, writes remain serialized, and encryption failures reject the batch without writing. Private-file readback, the committed slot pointer, integrity comparison, recovery intents and no-silent-rollback behavior remain enforced. Opening the already-selected date no longer saves the entire journal. Lock waits for accepted edits and retries unsaved changes; a clean journal is not encrypted and written again. An export screen that unmounts while backup encryption is pending does not open a share sheet when that work finishes.

This reduces the measured costs; it does not make capacity unlimited or promise instant unlocking. JSON serialization, validation, decryption and rendering still have costs. Buffer cleanup is best effort within the JavaScript/Java runtimes, not a claim of forensic memory erasure.

## Measurement method

`scripts/native-journal-fixtures.mjs` creates four fictional journals and valid synthetic PDF attachments under ignored `artifacts/qa/native-recovery/`. `scripts/native-journal-qa.py` refuses to run unless it finds the named disposable AVD, an emulator, root access, the preview package and the current source version. It never selects a physical tester phone. Fixtures are seeded only while the app is stopped; subsequent unlock, navigation, editing, locking and reopening use the installed app UI and real native storage.

Each case has three fresh-process unlock samples, one History navigation and one note replacement. UI values include adb injection and UI Automator readiness polling (roughly two seconds per poll), so they are upper bounds, not input-to-paint measurements or device SLAs. SQLite polling observes the durable pointer commit. One text injection can produce multiple save batches; the final observed commit is reported. Baseline measurements precede candidate measurements rather than being randomized, so differences include run-to-run noise. No diagnostic instrumentation is present in the candidate.

After each edit and force-stop/reopen, the pulled ciphertext is decrypted with the portable implementation and the entire parsed journal is compared with the expected fixture. This compares all records and all attachment bytes, not just counts or the edited note. Opening the selected date and locking a saved journal also assert an unchanged storage pointer.

All four candidate cases pass those comparisons and unchanged-pointer assertions. Seconds below show **0.28.0 → 0.29.0**; unlock is the median of three samples, other actions are one observed operation per case.

| Fictional journal                                | Encrypted bytes before edit | Unlock UI upper bound | Final save commit observed | Saved UI upper bound | Lock UI upper bound |
| ------------------------------------------------ | --------------------------: | --------------------: | -------------------------: | -------------------: | ------------------: |
| 365 entries / 53 medical records                 |                     589,247 |         4.604 → 4.344 |              1.151 → 0.634 |        3.294 → 2.813 |       4.942 → 4.607 |
| 3,650 entries / 522 medical records              |                   5,879,667 |         6.912 → 4.833 |              7.832 → 1.667 |       10.281 → 3.724 |       7.716 → 4.638 |
| 4,900 entries / 700 medical records              |                   7,892,605 |         8.194 → 5.425 |             10.631 → 2.110 |       12.729 → 4.215 |       8.581 → 4.628 |
| 1,825 entries / 264 medical records / three PDFs |                   7,660,777 |         7.163 → 5.419 |              9.652 → 2.000 |       11.765 → 4.019 |       8.361 → 4.629 |

Each synthetic PDF is 393,216 bytes; all three attachment hashes match after native save/reopen. History navigation remains at the roughly 2.2-second readiness-poll floor in both builds. Candidate reopen-after-edit upper bounds are 4.386, 4.904, 5.339 and 5.510 seconds in table order. The near-limit final commit is about five times faster in this run; that is not a promised phone speedup. Other builds/browser jobs were not running during candidate comparative measurements.

Comparative timing and the initial recovery runs use x86_64 candidate SHA-256 `9c71aa48d4718ffe0f605c126555f8941cefb21e5902022cb4764f02aa561460`, retained locally as `measured-0.29.0-x86_64.apk`. The subsequent final rebuild adds only the export-screen cancellation guard described above; the crypto/storage/lock implementation is identical. Final-build checks are identified separately in the validation record, and later native events record the installed APK hash. The diagnostic APK is neither of these candidates and is never distributed.

The final x86_64 APK (`232467e97bdce2bd5b325e7f659088163823c8b537c9b2d0cff8fe3b4dbcd860`) repeats the near-limit case after builds finish: unlock samples **5.422 / 5.325 / 5.335 seconds**, final observed save commit **2.118 seconds**, Saved UI **4.156 seconds**, History **2.197 seconds**, lock UI **5.084 seconds**, and reopen **5.297 seconds**. Every record matches after reopen, and selected-date opening/clean locking still leave the pointer unchanged. The harness now uses slower overlapping swipes, so the lock-screen navigation upper bound is not an exact gesture-for-gesture comparison with the first table.

## Recovery and exports

The native recovery harness introduces bounded faults in this disposable app's own filesystem/SQLite state. A denied directory write is an I/O failure check, not a full-device ENOSPC simulation. A killed process is not a power-loss or storage-controller durability test. A seeded restore intent tests restart cleanup, not an actual interruption during the restore UI. These distinctions must remain explicit in the validation record.

The export harness opens the system share chooser and cancels it; it never chooses a recipient. It verifies files from the app-private cache and checks their removal on a subsequent cold start. An exported file being ready does not prove a user-selected destination received it.

The following native faults pass with the 4,900-entry journal:

- An incomplete uncommitted candidate is ignored and removed while the committed journal remains exact.
- Directory write denial produces “Not saved,” preserves the old committed journal, and succeeds through the visible Retry action once write access returns. Restart retains the edit.
- The process is stopped after **3,309,568 candidate bytes** have been written and before its pointer commits, then killed. Restart opens the previous complete journal with every record intact. An earlier stop at candidate creation (zero bytes) also passes, but is a separate, weaker boundary check.
- A seeded postcommit restore intent with a denied photo-cleanup deletion remains gated across restart; removing the fault completes cleanup and opens the exact journal.
- Actual UI deletion with the same cleanup fault removes both vault files, retains the recovery gate across restart, then finishes cleanup. Another restart does not resurrect the journal.
- A truncated active file with an older valid inactive file shows a read error; it does not silently use the older journal or offer new-journal setup as if storage were empty.

Harness corrections are not app fixes: polling waits for an actual committed pointer before accepting “Saved”; SQLite reads use a busy timeout; short overlapping swipes avoid skipping the CSV control. Long report previews require deliberately reaching the end before locating their export action.

Final APK checks also pass a failed-lock retry: denied storage keeps the unsaved journal open, restoring access lets Lock save the edit before closing, and restart retains that edit. The exported attachment backup is an exact journal match, CSV is an exact content match, and the 366-day PDF is valid with 36 pages matching the desktop report's page dimensions/count. Private text/report export caches are removed on cold start. Through the actual Android document picker, a wrong-passphrase restore preserves the old journal and photo sentinel; a correct restore preserves every new record and attachment across restart. The picker harness selects the exact filename, not Android's separate file-preview affordance.

Final-build file-ready observations are 0.648 seconds for the 7,660,777-byte backup, 0.333 seconds for the 320,821-byte CSV, and **18.355 seconds** for the 59,953-byte PDF. These single observations include tool overhead and a concurrent native build; they are not isolated export benchmarks. A full-year report's long preview and PDF generation remain performance/usability follow-up work. The PDF verification is structural, not a new page-by-page visual or accessibility certification.

## Automated compatibility checks

- `pnpm check`: 344 passing tests, including asynchronous encryption rejection/key lifetime, asynchronous fingerprint failure, and recovery after a postcommit digest failure.
- `node --experimental-strip-types scripts/check-android-vault-crypto.mjs`: six exact AES-GCM/UTF-8/SHA-256 vectors agree between the Android Java helper, Node/OpenSSL and the portable cipher. Includes Unicode, unpaired surrogates, a 4,000,000-byte plaintext, byte-size rejection and key/nonce buffer cleanup. This helper run is on a desktop JVM; the APK checks establish the Android bridge path separately.
- Production web/Android/iOS JavaScript exports pass. This is not a new native iOS binary.
- Existing browser recovery integration passes: competing-tab lease, rejected/aborted restores, convenience preservation, resumable cleanup/deletion, damaged-marker repair, 3,650-entry navigation and 4,900-entry restore/save/reload/export. No page errors.

## Reproduction and limits

Generate fixtures for the emulator's current date, build/install the matching x86_64 preview, enable root on **TrifelleStoreAPI36 / emulator-5580**, then run the performance cases, recovery actions and export/restore scripts. Set `TRIFELLE_NODE` if Node is not on PATH. Python should use UTF-8 mode on Windows. The Java compatibility script accepts `JAVA_HOME`. Retain fixtures, encrypted snapshots, logs and screenshots only under ignored `artifacts/`; never substitute real health data.

The phone checklist covers retained-journal update, normal editing, immediate lock/reopen, backup/restore, attachments, biometrics and responsiveness. Physical-device power loss/full storage, OEM background restrictions, TalkBack, reminders, Health Connect, true 16 KiB runtime and Play delivery remain separate evidence. No new styling, customization, prediction method, cloud sync, closed-app sleep import, public release or 1.0 decision is introduced.
