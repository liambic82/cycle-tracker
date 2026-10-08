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

The background view is obscured and a one-minute background interval triggers locking, including a resume-time check when the operating system suspends timers. Native task-switcher snapshots and fold transitions still require device testing; do not equate a JavaScript privacy overlay with an OS-level screenshot prevention guarantee.

## Exports and recovery

Encrypted backups can restore on another supported platform with the same passphrase. There is no server-held recovery key, account, or password reset. A readable CSV export needs a separate explicit action and neutralizes spreadsheet formula prefixes. Native export/import cache files are cleaned up after use. File-sharing completion, dismissal, and access behavior must be checked on the target Android devices.

This preview has no delete-vault or change-passphrase UI yet. Browser data can be removed by clearing site data, and native data by uninstalling the app; an independent backup is necessary before either action. Android automatic OS backup is disabled in app configuration; iOS backup policy still needs review before a store release.

## Release work

The cryptographic libraries are established implementations; this app's integration has not received an independent security audit. Review lifecycle behavior, import handling, key recovery UX, native backup behavior, accessibility, browser storage limits, and performance before real health data or public release. No remote service has been provisioned.

## References

- [Expo platform support](https://docs.expo.dev/)
- [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/)
- [Noble ciphers](https://github.com/paulmillr/noble-ciphers)
- [Noble hashes](https://github.com/paulmillr/noble-hashes)
- [Android foldable guidance](https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables/learn-about-foldables)
