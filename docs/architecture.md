# Architecture and security notes

## Boundaries

- `src/domain`: date-only arithmetic, journal schema, history calculations, CSV serialization, and vault encryption. No React Native imports.
- `src/data`: ordered persistence, cross-tab edit lease, session lifecycle, fictional demo data, and platform file export/import.
- `src/ui`: shared React Native views that adapt to phone and desktop widths.
- `App.tsx`: navigation, current-day context, responsive composition, and daily editor.
- `scripts/prepare-web.mjs`: production service worker generation. Only public application assets are cached; journal contents never pass through the service worker.

## Journal rules

Dates are local calendar keys (`YYYY-MM-DD`), not midnight UTC timestamps. Cycle intervals use UTC day numbers to avoid daylight-saving errors. A new cycle requires an explicit period-start marker. Changing flow to none or spotting clears that day's start/end markers. Bleeding duration requires a recorded end before the next period start. Unfinished cycles have no inferred length. The first symptom catalog is a subset of the brief, with custom symptoms available.

## Encrypted vault format 1

The envelope contains format/version, fixed KDF parameters, a 16-byte random salt, a 12-byte random nonce, and hex-encoded authenticated ciphertext. The cipher is AES-256-GCM from `@noble/ciphers`. PBKDF2-SHA256 (`@noble/hashes`) uses 600,000 iterations and produces a 32-byte key. Additional authenticated data binds ciphertext to the application format. Every save uses a fresh nonce from Expo's `getRandomValues`; the development helper with a weak-random fallback is intentionally not used.

Only encrypted snapshots enter AsyncStorage. The key is held in the unlocked session and overwritten on lock; JavaScript garbage collection does not guarantee erasure of every historical string or memory copy. Passphrases are not persisted. Incorrect keys, modified ciphertext, unsupported KDF parameters, and invalid journal structures are rejected. Restore input is limited to 8 MB and validated before replacement. The UI requires explicit replacement acknowledgment when a local journal exists.

Writes are serialized. A failed write is reported in the UI and keeps the edited in-memory journal available for retry or backup. Locking attempts to save before releasing the key. On web, a Web Locks lease prevents simultaneous unlocked editors on the same origin. Other origins and other devices are independent until an explicit restore; there is no sync implementation.

The background view is obscured and a one-minute background interval triggers locking, including a resume-time check when the operating system suspends timers. From 0.2.0, native startup waits for Expo screen-capture prevention before mounting the journal or passphrase form. Android uses `FLAG_SECURE`; the installed React Native modal implementation inherits that flag. iOS also enables Expo's app-switcher blur. Failure presents a retry screen without journal content. Protection remains active in sample mode. The browser retains its visibility overlay but cannot block screenshots. Native task-switcher snapshots, screenshot blocking, and fold transitions still require device validation of this version.

## Exports and recovery

Encrypted backups can restore on another supported platform with the same passphrase. There is no server-held recovery key, account, or password reset. A readable CSV export needs a separate explicit action and neutralizes spreadsheet formula prefixes. Native export/import cache files are cleaned up after use. File-sharing completion, dismissal, and access behavior must be checked on the target Android devices.

Deleting a day removes all of that entry's fields and recalculates derived history. Only the most recently deleted entry is retained in memory for Undo; locking, dismissal, another deletion, or writing a new entry on that date clears it. Undo never overwrites a newer entry. The Undo record is not serialized into the vault or backups.

Whole-journal deletion requires an unlocked real journal and typing `DELETE`. The writer rejects new saves immediately, drains previous writes (including failed ones), and removes only the vault storage key. Successful deletion clears the session key, journal, Undo record, and web edit lease. Failure reopens the writer for retry/backup and retains the in-memory journal. This is logical app-storage deletion, not a guarantee of forensic erasure of flash storage or historical memory copies. Exported backups/CSVs and journals on other devices/origins remain separate. The sample journal cannot invoke whole-vault deletion.

There is no change-passphrase UI yet. Android automatic OS backup is disabled in app configuration; iOS backup policy still needs review before a store release.

## Release work

`app.config.ts` selects a separate native preview app identity when `APP_VARIANT=preview`. The Windows build script produces an ARM64 release APK from a dedicated short-path build cache and signs it with a private preview key outside Git. A Gradle guard prevents this signing configuration from being used with the store identifier. This separates test installations and credentials from a future public release; it does not replace device or security validation.

The cryptographic libraries are established implementations; this app's integration has not received an independent security audit. Review lifecycle behavior, import handling, key recovery UX, native backup behavior, accessibility, browser storage limits, and performance before real health data or public release. No remote service has been provisioned.

## References

- [Expo platform support](https://docs.expo.dev/)
- [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/)
- [Expo screen capture and app-switcher protection](https://docs.expo.dev/versions/latest/sdk/screen-capture/)
- [Noble ciphers](https://github.com/paulmillr/noble-ciphers)
- [Noble hashes](https://github.com/paulmillr/noble-hashes)
- [Android foldable guidance](https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables/learn-about-foldables)
