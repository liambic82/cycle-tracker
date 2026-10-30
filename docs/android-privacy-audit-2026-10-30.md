# Android privacy and SDK audit — October 30, 2026

Scope: Trifelle **0.24.0 / code 29**, native Android Release preview and production identities. This is source, dependency, manifest and packaged-artifact review. It is not a penetration test, device traffic capture, clinical validation or Google approval. No health records were used. Web and iOS are described separately where their behavior differs.

## Findings and changes

1. **Remote push infrastructure was bundled with local reminders.** `expo-notifications` 57.0.22 includes Firebase Messaging 25.0.1 and transitive installation/transport components. The prior merged manifest included Firebase startup and remote-message services. No app code requests a push token, initializes a Firebase project or supplies a Google services configuration. This does not establish that prior builds transmitted data. Version 0.24.0 explicitly disables messaging/analytics/default collection metadata and removes Firebase's initialization provider and remote push services/receiver in Release. Local `NotificationsService` is retained. [Firebase's initialization guidance](https://firebase.google.com/docs/cloud-messaging/android/get-started#prevent-auto-init).
2. **Packaged Android code had an unnecessary direct network capability.** Release-only manifest overlays now remove `INTERNET`, `ACCESS_NETWORK_STATE`, remote-message receipt and install-referrer permissions. The app uses Health Connect via Android IPC, bundled assets and local notifications. Education links, email, document providers and share destinations are separate user-invoked apps. Development Metro networking remains available; the local Release APK and store AAB both enforce the offline permission boundary.
3. **Backup intent was not fully expressed by `allowBackup=false`.** The SecureStore defaults included shared preferences, and Android documents OEM differences for device transfer. Custom rules now exclude all nine supported storage domains from both cloud backup and Android device-to-device transfer, with legacy exclusions too. `allowBackup=false` remains set. This preserves manual encrypted backup as the transfer route. Actual OEM behavior is still a device test. [Android backup guidance](https://developer.android.com/identity/data/autobackup).
4. **Launcher badge permissions were unused.** The app explicitly sets `shouldSetBadge=false`, does not call the badge APIs and supplies no badge counts. Sixteen dependency-added launcher/badge permissions are removed in Release. The notification UI and widget remain unchanged.
5. **Privacy information was split across screens and lacked the confirmed contact.** A single source, `src/content/privacy.json`, now supplies the offline in-app policy, native Health Connect rationale and generated web policy. The same contact, **plowdendigital.apps@gmail.com**, appears on the support page. Access does not require journal creation/unlock. Opening the email app does not send a message or attach a journal.

## Data and library inventory

| Area                                   | Data handled and boundary                                                                                                  | Evidence                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Journal and preferences                | Local encrypted records; no online account or server sync                                                                  | `useJournal`, Android file store, journal schema and vault; no app upload code                |
| Background photo                       | Separate encrypted local store; original remains; excluded from journal backup                                             | `PersonalBackgroundStore`, photo picker/cache                                                 |
| Cryptography                           | On-device PBKDF2/AES-GCM with native passphrase helper; no network service                                                 | Local crypto modules, Noble libraries, vault/biometric compatibility tests                    |
| Biometric key                          | OS-protected convenience key, not fingerprint/face samples                                                                 | SecureStore options require authentication; Android Keystore/iOS Keychain                     |
| Sleep                                  | Read-only Health Connect Sleep plus optional older history; source/device/time-zone metadata; copied only on chosen import | Local `cycle-health` module, foreground importer, permissions and native rationale            |
| Reminders                              | Local generic notifications, bounded queue, local opt-ins                                                                  | `reminders.ts`, reminder service and retained native receiver; no push-token call             |
| Text/PDF/attachments                   | Explicit readable exports or encrypted backup; unique temporary share files                                                | File/report/attachment exporters; startup cleanup; PDF fonts bundled                          |
| React Native/Expo                      | UI, local storage, file selection/sharing, screen protection and bundled assets                                            | Pinned package/lockfile, generated native config and artifact manifest                        |
| Firebase/Google transport dependencies | Transitive SDK code remains in the binary; auto-init/remote entry points disabled and direct internet permission absent    | Release manifest, disabled metadata and artifact audit                                        |
| Store and source apps                  | Play distribution/purchases, Fitbit or other source syncing and Health Connect storage operate outside Trifelle            | No purchase backend, Fitbit credentials, billing flow or source-app upload in app code        |
| Support                                | User may compose email in an external app; no automatic attachments or send                                                | Static `mailto:` action with a generic subject only                                           |
| Web preview                            | Host serves public app/font/policy assets; browser stores local encrypted records                                          | Only application `fetch` is for a report font; service worker caches app assets, not journals |

No advertising, analytics or crash-reporting service is configured by app code. This statement is bounded by the reviewed source and final Release permissions; it is not a network-observation result. Store/system diagnostics and external providers have their own practices. The Android result must not be generalized to every future SDK change or the still-unvalidated iOS preview.

## Retained permissions

The artifact auditor rejects any permission outside the reviewed allowlist:

- `VIBRATE`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`: local reminders and rescheduling.
- `USE_BIOMETRIC`, legacy `USE_FINGERPRINT`: optional OS authentication.
- `DETECT_SCREEN_CAPTURE`: required by the installed Expo module's callback registration on Android 14+; preview/store screenshot policies remain distinct.
- Health Connect `READ_SLEEP` and optional `READ_HEALTH_DATA_HISTORY`: the two declared read scopes. No background health permission.
- `WAKE_LOCK`: retained notification/SDK wake support; real delivery and battery behavior remain device checks.
- The app-specific signature permission for AndroidX non-exported dynamic receivers.

The allowlist and artifact checks are in `scripts/audit-android-artifact.py`. It verifies the actual bundle/APK configuration, release flags, removed startup provider, local notification receiver, health scopes and every native library's load alignment. APK checks also decode the compiled backup exclusions and run ZIP alignment verification. Signing verification is performed separately with JDK/SDK tools.

## Declaration preparation

Google distinguishes local-only processing from off-device collection and recognizes specific user-initiated sharing. Based on this build, the **candidate** Data safety position is no app/SDK collection of journal data and no non-user-directed sharing. Review optional support email handling and the actual Console questions before submitting; never infer a blanket “we receive no information” statement when support correspondence exists. The policy expressly describes emails, external destinations and hosting. [Data safety definitions](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

Health declarations should cover the implemented period/symptom, sleep and medication-recording/reminder features, plus any applicable medical-record functionality. Do not select “no health features.” Request only Sleep and older-history access with the purpose below. The app does not conduct a prospective research study, interpret test results, diagnose conditions or provide treatment recommendations. Its internal statistical review is not clinical validation.

**Sleep purpose:** “Trifelle lets users review sleep sessions and stages alongside their period and wellbeing journal. Users choose which nights to copy, or separately enable imports from a chosen source when they unlock. Read access to older sleep history supports the optional 90/365-day import ranges. Imported copies stay in the local encrypted journal and can be removed by the user. Trifelle does not write Health Connect data or read it while locked or in the background.”

This is prepared submission material, not a submitted declaration or permission approval. Recheck the [health-permission guidance](https://support.google.com/googleplay/android-developer/answer/12991134?hl=en) against the final production package.

## Remaining evidence

- Real Pixel/Samsung startup, generic reminder delivery, biometric fallback, Health Connect access and PDF font/export operation with network permission absent.
- Real 16 KiB-page device/emulator execution; ELF and ZIP checks are necessary build evidence, not runtime validation.
- OEM backup/device-transfer behavior and local recovery checks; the iOS preview has not received equivalent backup hardening.
- Play-delivered split APK installation and pre-launch report after account and signing setup.
- Public policy hosting URL and final Console declarations. The prepared HTML files have not been published to a hosting service.

See [release build guide](android-store-build.md), [device checklist](android-testing.md#0240-privacy-and-store-preparation) and [validation record](validation.md).
