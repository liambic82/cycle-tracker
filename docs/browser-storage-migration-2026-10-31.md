# Verified browser journal migration — preview 0.27.0

October 31, 2026 · app 0.27.0 / build 32. This completes the owner's approved follow-up to the [0.26.0 browser-quota finding](journal-recovery-performance-2026-10-30.md#browser-quota-finding). It primarily improves the computer/browser app, without establishing a new phone pass or a public release.

## Implemented behavior

The browser's full encrypted journal now lives in IndexedDB. Encryption, passphrases, the portable backup format and the existing 8 MiB encrypted-envelope cap are unchanged. Photos, appearance choices, recovery intents and other small settings retain their existing stores. Nothing is uploaded or synchronized.

Startup reads never migrate or repair records. After obtaining the exclusive journal edit lease, unlock prepares storage: validate the legacy envelope, commit an exact encrypted copy to IndexedDB, read the committed copy back, then replace the old localStorage value with a small compatibility guard. Another unlocked tab prevents migration. Other keys are untouched. A wrong passphrase can still leave this lossless storage upgrade completed, but cannot decrypt the journal.

Active database records contain the encrypted envelope and its SHA-256 integrity check. Writes verify a readback inside the transaction and resolve only on transaction completion; a fresh committed read also precedes legacy cleanup. An interrupted migration retains the old copy until verification. If the database commits but replacing the old entry fails, reads report that migration must finish and the next unlock retries it. There is no automatic fallback to stale legacy records once the database becomes authoritative.

The small guard keeps earlier builds from interpreting migration as an empty journal and prevents current builds from offering new setup if only the database is missing. A malformed record or unavailable database remains an error. An explicitly confirmed encrypted backup restore remains the repair path for damaged/missing records. Close other tabs and use the current app after migration; do not downgrade the browser build.

Deletion commits a data-free tombstone and retains the guard. A leftover legacy copy cannot silently resurrect deleted records; cleanup must finish before absence is reported. A new journal replaces the tombstone. The 0.26.0 reminder, biometric and personal-photo cleanup protocol still follows the committed journal change.

Connections are short-lived, close on completion/version change, and have bounded connection/transaction waits. Late opens after rejection close without doing work. Put-request success alone never reports a saved journal; aborts during readback are handled. The driver requests strict transaction durability. This is resumable sequencing, not an atomic transaction across IndexedDB and localStorage or a guarantee against hardware failure, browser eviction, private-session cleanup or clearing site data. Export backups separately.

References: [IndexedDB transaction completion](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event) and the [Indexed Database API specification](https://w3c.github.io/IndexedDB/). Transaction completion signals a successful commit; the extra readback/guard checks are Trifelle's own recovery protocol.

## Evidence

- **340/340 tests pass**, including 19 browser-storage tests and five driver tests: migration interruption, read/commit/reply failures, changed readback, stale legacy copies, missing/corrupt data, restore, deletion, queues, blocked/late connections and commit-versus-request success.
- Production web, Android and iOS JavaScript exports pass. Browser integration uses the production web bundle in fresh isolated Chrome contexts and fictional records only.
- `scripts/check-browser-migration.cjs` passes: another editor blocks migration; failed migration preserves legacy ciphertext; next unlock completes it; ciphertext and unrelated settings remain unchanged; denied/missing storage never offers empty setup; failed saves retain the saved record and actual browser reload warning; retry, encrypted export and backup repair work.
- `scripts/check-journal-recovery.cjs` now exercises IndexedDB. Rejected writes and aborted transactions preserve the prior journal/settings; interrupted cleanup resumes after reload; a second tab cannot discard recovery; confirmed backup repair, failed-repair gating and deletion recovery pass.
- The **5,879,667-byte** ten-year fictional vault that exceeded Chrome's previous localStorage quota now imports and opens. Earlier calendar navigation and History render correctly. A **7,892,605-byte**, **4,900-entry** fictional vault also restores, saves, reloads, unlocks and exports through the real app. The exported backup decrypts with all entries present. Both suites finish without page errors.
- Existing recovery styling was checked at 320/390/1280 widths, including dark appearance and doubled browser CSS text. The missing-database screen was inspected. These are not Android font-scaling or TalkBack results.

Reproduce with Node 24, installed Chrome and Playwright. Set `TRIFELLE_PLAYWRIGHT_MODULE` to an installed Playwright module and optionally `TRIFELLE_QA_URL` (default localhost:4174), then run the two scripts with `--experimental-strip-types` against a production preview server. Output remains in ignored `artifacts/qa/0.27.0/`. Never inject faults into a real journal/profile.

The previous localStorage ceiling no longer limits the vault itself. IndexedDB still has browser/device-dependent quotas and availability; the app's 8 MiB cap remains. This is not unlimited storage. Firefox/Safari, real disk exhaustion, OS/browser process termination and eviction are unverified. Android retains encrypted-file storage; iOS retains its existing backend. Neither native backend migrates to IndexedDB.

The preview APK, local store APK, AAB and bundle-derived universal APK pass the existing package/privacy/alignment/signature audits, with unchanged certificate identities. All 194 checked native-build inputs match both caches. [Final hashes and sizes](validation.md#browser-storage-migration--october-31-2026) are recorded separately. The versioned preview was copied to the owner's configured testing folder with a matching SHA-256; the build copy remains under `artifacts/`. This verifies the local copy, not completion of Drive cloud sync. No Play upload or native iOS rebuild occurred.

## Update checks and next work

1. Export an encrypted backup before updating. Close other browser tabs, refresh to 0.27.0 and unlock at the same address. Compare older/recent records, save, lock and reload. Migration does not transfer records between browsers, addresses, ports or devices.
2. Verify appearance, saved photo and settings remain. Export another backup and verify it separately. Do not clear real site data or downgrade to manufacture a recovery failure.
3. The matching Android APK updates the preview to build 32. Continue the [0.26.0 native checks](android-testing.md#0260-interrupted-recovery-and-large-histories); browser evidence does not establish phone results.

Next: consolidate Pixel/Flip5 accessibility, persistence, reminder and wearable validation; prepare concrete Play screenshot/feature-graphic proposals for approval; finish policy/account/signing and Play-delivery preparation. Publication, 1.0, cloud sync and closed-app sleep importing remain separate decisions.
