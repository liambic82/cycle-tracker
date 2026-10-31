# Journal recovery and large histories — preview 0.26.0

October 30, 2026 · app 0.26.0 / build 31. This is a development preview, not a release or a new phone-validation pass.

Final verification and the checksum-matched APK handoff completed October 31, 2026. The build copy remains under `artifacts/`; the destination is the owner's locally configured testing folder. Local copy verification does not establish completion of Drive's cloud sync.

Follow-up completed in [0.27.0](browser-storage-migration-2026-10-31.md): verified browser migration to IndexedDB supports the previously rejected 5,879,667-byte fixture and a 7,892,605-byte fixture through restore/save/reload/unlock/export. The dated findings below describe 0.26.0; its browser quota result remains useful baseline evidence. The current browser integration script now tests the IndexedDB backend and writes evidence under `artifacts/qa/0.27.0/`.

## Recovery behavior

Before this change, validated restore and whole-journal deletion cleared the saved background photo, biometric access and reminder opt-ins before committing the journal change. A failed journal write could therefore leave the original journal with some convenience settings already removed.

`JournalRecovery` now persists and reads back a small intent before changing the journal. It contains an operation kind and SHA-256 of the intended encrypted replacement, or a null target for deletion. A repair of a malformed marker also carries a flag requiring a successful replacement before ordinary access can resume. It contains no health records, passphrase or decryption key. After the operation, it reads the actual journal: a matching replacement (or completed deletion) permits cleanup; a different journal abandons the uncommitted intent and preserves its settings. A rejected native reply is not assumed to mean the write failed to commit.

Cleanup cancels reminders, removes biometric convenience access and drains/removes the personal-photo slot. Only then is the intent removed. A failure retains the intent and presents **Finish journal recovery**, with a retry action. Normal passphrase/biometric unlock, sample mode and journal edits remain unavailable until recovery finishes. Startup retries unfinished cleanup. Reminder alerts can continue while cancellation is failing; the recovery screen says so. Color and appearance preferences remain unchanged.

Recovery holds the existing exclusive browser edit lease, so another tab cannot reconcile an operation still being performed by its owner. A newly decrypted and explicitly confirmed backup may supersede an unreadable recovery record, preserving the existing corruption-recovery route. Wrong-passphrase and unconfirmed restores cannot do so. A valid pending cleanup must finish before another restore can replace its intent; a failed repair of a malformed marker remains gated until a replacement commits. The data format and encryption parameters are unchanged.

This is resumable sequencing across separate storage/services, not an atomic transaction across Android notifications, secure storage, photos and journal files. A process interruption before a save commits can still lose unsaved edits. Deletion is logical deletion, not a forensic-erasure guarantee.

## Save performance

`JournalWriter` snapshots JSON at each save request, then encrypts and writes only the newest waiting snapshot. An already running write completes before the next batch. Every request represented by a batch resolves only after that batch is saved, or rejects if it fails. Failed batches do not discard newer waiting edits. Flush/lock and deletion still wait for accepted work; deletion rejects late saves. Caller mutations after `save` cannot alter its captured snapshot. Each waiting batch owns a temporary key copy until encryption finishes, then zeroes it; clearing the session key cannot corrupt an already accepted save.

The measured bottleneck was redundant encryption of rapid queued saves. Calendar lookup, history preparation and filtered report preparation did not show a comparable cost in this experiment, so their implementation is unchanged.

### Reproducible desktop benchmark

Run `./scripts/pnpm.ps1 benchmark:journal`. It creates only fictional records and writes timing metadata under ignored `artifacts/performance/`. Runtime: Windows, Node 24.22.1, Intel Core i7-12700K. Operation timings below are medians of seven runs after one warm-up. The save burst is one 20-request run, including reopening/validating the final saved snapshot, with an in-memory storage sink. It is not Android disk latency, an input-to-render measurement or a phone performance claim. Backup reopen excludes passphrase derivation.

| Fictional daily entries | Encrypted bytes | Seal backup | Reopen + validate | Calendar year calculations | History + 12 flow rows | 366-day report preparation | 36-page PDF |
| ----------------------- | --------------: | ----------: | ----------------: | -------------------------: | ---------------------: | -------------------------: | ----------: |
| 365                     |         589,247 |     8.29 ms |          11.84 ms |                    0.63 ms |                0.28 ms |                    0.97 ms |   562.09 ms |
| 1,825                   |       2,940,247 |    37.03 ms |          53.16 ms |                    1.30 ms |                1.68 ms |                    1.21 ms |   530.31 ms |
| 3,650                   |       5,879,667 |   145.33 ms |         105.22 ms |                    2.31 ms |                4.12 ms |                    1.49 ms |   520.29 ms |
| 4,900                   |       7,892,605 |   173.85 ms |         146.85 ms |                    2.94 ms |                5.55 ms |                    1.38 ms |   537.05 ms |

| Entries | 20 queued saves + verification, before |     After | Encrypted writes, before → after |
| ------- | -------------------------------------: | --------: | -------------------------------: |
| 365     |                              166.04 ms |  32.68 ms |                           20 → 1 |
| 1,825   |                              815.90 ms | 148.10 ms |                           20 → 1 |
| 3,650   |                            2,843.37 ms | 340.54 ms |                           20 → 1 |
| 4,900   |                            3,600.24 ms | 522.34 ms |                           20 → 1 |

These are approximately 1, 5, 10 and 13.4 years of daily synthetic entries with notes, regular period boundaries and weekly fictional medical questions. The last case is close to the existing 8 MiB encrypted-envelope limit. Different records, attachments, hardware and runtime produce different costs. One large encryption operation can still take significant time; batching does not eliminate that cost. No full-disk or process-kill test on a real phone was performed.

## Automated and browser evidence

- `pnpm check`: 316 tests pass, including 33 recovery tests and five save-queue tests. Injected faults cover intent creation, journal commit before/after a bridge rejection, journal readback, each convenience cleanup stage, marker removal, restarts, malformed markers and Android deletion tombstones.
- Existing save-failure, unsaved-reload warning, privacy-cover and restore regression passes in an isolated Chrome profile using fictional data.
- `scripts/check-journal-recovery.cjs` supplies browser integration checks for interrupted restore/deletion, reload/retry, another tab's edit lease, damaged-marker restore and larger calendar/history navigation. Use `TRIFELLE_PLAYWRIGHT_MODULE` to point to an installed Playwright module, installed Chrome, and `TRIFELLE_QA_URL` for the production preview server (default localhost:4174). Results and screenshots stay under `artifacts/qa/0.26.0/`.

### Browser quota finding

Chrome rejected the 5,879,667-byte fictional encrypted journal under its actual local-storage quota. The previous journal, photo slot and reminder opt-ins remained intact, with a visible restore error. Browser storage is still AsyncStorage/localStorage and may be lower than the app's 8 MiB envelope limit; the photo slot also consumes that quota. The successful browser stress/recovery case uses 1,825 entries (2,940,247 encrypted bytes). The larger Node round-trips are not proof that those journals fit browser storage.

An IndexedDB migration with verified legacy transfer is follow-up desktop work. Do not increase the encrypted-envelope cap or claim unlimited browser history. Android's encrypted-file adapter is unchanged and has separate tests for larger vaults; its actual phone performance remains to be measured.

## Handoff and remaining work

Back up before updating. Install the versioned 0.26.0 preview over the current preview; do not uninstall or downgrade after the earlier Android file-storage migration. Follow the [focused phone checklist](android-testing.md#0260-interrupted-recovery-and-large-histories). The designated testing-APK folder remains local configuration; no signing credentials or health records are included in the handoff.

Next: collect Pixel/Flip5 save/reopen, biometrics, reminder cleanup and native accessibility evidence; address any failures; complete desktop storage migration and remaining Play preparation. Public policy hosting, account verification, portable signing recovery, Play-delivered testing and a release decision remain separate. No new store imagery, customization, prediction method, cloud sync or background wearable syncing is introduced here.
