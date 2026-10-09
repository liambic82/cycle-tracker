# Architecture and security notes

## Boundaries

- `src/domain`: date-only arithmetic, journal schema, history calculations, CSV serialization, and vault encryption. No React Native imports.
- `src/data`: ordered persistence, cross-tab edit lease, session lifecycle, fictional demo data, and platform file export/import.
- `src/ui`: shared React Native views that adapt to phone and desktop widths.
- `App.tsx`: navigation, current-day context, responsive composition, and daily editor.
- `scripts/prepare-web.mjs`: production service worker generation. Only public application assets are cached; journal contents never pass through the service worker.

## Journal rules

Dates are local calendar keys (`YYYY-MM-DD`), not midnight UTC timestamps. Cycle intervals use UTC day numbers to avoid daylight-saving errors. A new cycle requires an explicit period-start marker. Changing flow to none or spotting clears that day's start/end markers. Bleeding duration requires a recorded end before the next period start. Unfinished cycles have no inferred length.

## Calendar and visual history (0.5.0)

Entries now include `flowRecorded`. Choosing any flow option sets it to true; explicitly choosing None is a saved observation. Clearing flow sets it to false, removes period boundaries, and retains symptoms and notes. An otherwise empty unlogged entry is removed. On import, older positive-flow and spotting entries infer true; older None entries infer false because previous versions did not distinguish an explicit choice from the default. Inconsistent or malformed flags are rejected. Journal format 1 and the vault envelope remain compatible for old-to-new imports; the passphrase and biometric key are unchanged. Downgrading to an older app is not a supported way to preserve new fields. CSV adds a final `Flow recorded` column so consumers can distinguish None from unknown.

Year, month, and day views share the journal's selected date. Annual month tiles open a continuous month calendar without changing selection; selecting a date opens the editor. Miniature dates are visual context within a single accessible month button, not tiny individual touch targets. The daily view has previous/next controls and a full editor; compact month view retains its daily sheet. Calendar labels show recorded cycle-day counts only through today. There are no prediction overlays.

History statistics use all recorded cycles and exclude unknown lengths/durations. Charts show the latest twelve cycles oldest to newest with date, year, numeric value, and accessible labels; an incomplete value is a dash, not zero. Bleeding duration is the inclusive span from period start to the first recorded end within the same cycle, not a claim that every intervening day had bleeding. History rows initially show twelve cycles, with an option to reveal older rows.

Each chronological flow strip ends before the next start or at today. It distinguishes bleeding, spotting, explicit None, and missing flow observations, with accompanying text counts. Notes or symptoms alone do not supply flow information. Sparse dates become compact runs so long gaps do not generate a UI element per day. Cycle-day lookup uses sorted starts; history scans sorted entries once for end markers.

## Symptom catalog and preferences (0.4.0)

`src/domain/symptoms.ts` contains 99 curated choices covering all four symptom reference lists in the source brief. Compound source items are split where useful (for example oily/dry skin), while all 30 original labels remain unchanged. Search includes a small set of alternate terms. Categories describe browsing organization, not a diagnosis; selecting a symptom called Spotting or Skipped periods does not create flow or cycle markers.

Entry symptom arrays remain strings. Unknown/imported labels are retained. Search and selection compare trimmed, case-insensitive identities without rewriting saved values; existing custom labels take precedence over new catalog matches in the browser. Curated categories and user-created labels stay distinct. Logging is capped at 200 symptoms per day, including custom labels, matching backup validation; adding a definition and logging it fail together at the limit. New custom definitions retain the 100-label limit, while older valid imports remain readable.

Journal format 1 now includes `preferences.showPerimenopause`. Imports without preferences default to `true`; a supplied malformed preference is rejected. This preference lives inside the encrypted snapshot and encrypted backups, not separate plain storage. Hiding the curated category affects its browse/search choices only: selected symptoms remain in the daily summary, CSV, and backups, and custom labels remain available even if their wording overlaps that category. Sample preferences remain session-only. The vault envelope, passphrase, and biometric key do not change.

The daily editor shows selected symptoms and compact quick choices. Its symptom browser replaces the editor content within the existing phone sheet or desktop card, so there is no second native modal. Changing views resets the parent scroll position. Checkbox/pressed states are explicit for browser accessibility as well as native accessibility state. Native keyboard, Android Back, large text, and TalkBack behavior still require device checks.

## Encrypted vault format 1

The envelope contains format/version, fixed KDF parameters, a 16-byte random salt, a 12-byte random nonce, and hex-encoded authenticated ciphertext. The cipher is AES-256-GCM from `@noble/ciphers`. PBKDF2-SHA256 (`@noble/hashes`) uses 600,000 iterations and produces a 32-byte key. Additional authenticated data binds ciphertext to the application format. Every save uses a fresh nonce from Expo's `getRandomValues`; the development helper with a weak-random fallback is intentionally not used.

Journal content enters AsyncStorage only as encrypted snapshots. A non-secret reference is also stored when biometric unlock is enabled; the optional protected key is stored separately as described below. The in-memory key is overwritten on lock; JavaScript garbage collection does not guarantee erasure of every historical string or memory copy. Passphrases are not persisted. Incorrect keys, modified ciphertext, unsupported KDF parameters, and invalid journal structures are rejected. Restore input is limited to 8 MB and validated before replacement. The UI requires explicit replacement acknowledgment when a local journal exists.

Writes are serialized. A failed write is reported in the UI and keeps the edited in-memory journal available for retry or backup. Locking attempts to save before releasing the key. On web, a Web Locks lease prevents simultaneous unlocked editors on the same origin. Other origins and other devices are independent until an explicit restore; there is no sync implementation.

The background view is obscured and a one-minute background interval triggers locking, including a resume-time check when the operating system suspends timers. From 0.2.0, native startup waits for Expo screen-capture prevention before mounting the journal or passphrase form. Android uses `FLAG_SECURE`; the installed React Native modal implementation inherits that flag. iOS also enables Expo's app-switcher blur. Failure presents a retry screen without journal content. Protection remains active in sample mode. The browser retains its visibility overlay but cannot block screenshots. Native task-switcher snapshots, screenshot blocking, and fold transitions still require device validation of this version.

## Biometric convenience unlock (0.3.0)

Biometrics are opt-in from an unlocked real journal and absent from sample mode's controls. `expo-secure-store` holds a small versioned payload containing the existing 32-byte derived key, vault salt, and a random activation token. Every native read/write uses `requireAuthentication: true` and a dedicated authenticated-only keychain service. Android uses an authentication-bound Keystore cipher with `BIOMETRIC_STRONG`; iOS uses the current biometric set with `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`. No fingerprint/face template or passphrase is stored by this app. A successful OS prompt is necessary to retrieve the protected credential; there is no separate prompt followed by an unguarded stored key.

AsyncStorage receives only `{ version, salt, token }` after secure storage accepts the key. Unlock requires a matching local opt-in reference, matching payload, and successful authenticated vault decryption. It cannot use a stale key from another vault or a leftover iOS Keychain entry without the current reference. Cancellation retains the setting for retry. Missing/invalidated credentials are cleared and direct the user to their passphrase; damaged or mismatched payloads never open a session. The fixed secure slot also allows explicit cleanup of interrupted setup and reinstall remnants. If cleanup fails, the UI reports the failure and preserves passphrase access.

Disabling, new-journal creation, validated backup restore, and whole-journal deletion remove the protected credential and reference before proceeding. A failed backup passphrase does not change either. If subsequent journal persistence fails after cleanup, biometric access may be off while the original vault remains; passphrase access is preserved. Encrypted backups retain the existing portable vault format and never include the biometric credential/reference. The SecureStore config plugin excludes its preferences from Android backup/device-transfer rules; the app also retains `allowBackup: false`.

An actual background transition invalidates an in-flight unlock, wiping the returned key instead of opening the journal. An iOS authentication prompt's brief inactive state is distinguished from backgrounding. A lock request during a settings/storage operation is deferred until it finishes, so a lengthy prompt does not discard the existing background-lock request. Browser builds use a separate adapter with no SecureStore import or biometric persistence.

These controls do not protect against a compromised OS or someone whose biometrics are already enrolled on the device. Native prompt behavior, enrollment invalidation, and app lifecycle integration require device tests; mocked protected storage tests are not a substitute for them. See [Expo SecureStore documentation](https://docs.expo.dev/versions/latest/sdk/securestore/) for platform behavior and limitations.

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
