# Android store build and reviewer handoff

Updated October 31, 2026. These commands build locally; none upload to Play. Current app version **0.27.0 / code 32** remains a pre-release version.

## Identities and signing

| Artifact                              | App ID                             | Signing                       | Intended use                                                  |
| ------------------------------------- | ---------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| Preview APK                           | `com.liambic.cycletracker.preview` | Existing preview key          | Updates existing testers; screenshots enabled                 |
| Store AAB                             | `com.liambic.cycletracker`         | Dedicated Trifelle upload key | Candidate for a future Play test track                        |
| Store local-test APK / bundletool APK | `com.liambic.cycletracker`         | Upload key                    | Local production-configuration testing; screenshots protected |
| Future Play-delivered APKs            | `com.liambic.cycletracker`         | Play App Signing key          | Must be tested through Play separately                        |

The upload certificate SHA-256 is `8de0364d01ee09b7f1343a535229393a5beeaf5ce3cace4b756b072de5843ede`. It is distinct from the preview certificate. Google Play App Signing has not been configured for Trifelle; do not describe the upload key as the future Play signing key.

Both release variants remove direct internet, remote-push and unused launcher badge permissions. Development networking remains available in Debug. The store variant keeps screenshot protection enabled; the preview preserves the owner's testing screenshot setting.

The owner's testing-APK handoff folder is recorded locally in ignored `.tools/android-preview-destination.json`, under `directory`. After verification, copy the versioned test APK to that folder and compare its SHA-256 with the build copy. Keep the original under `artifacts/`, preserve different existing files, and report an unavailable destination. This is a handoff step; the build scripts still output to `artifacts/`. The personal path and APKs are not committed, and signing material is never part of the handoff.

## Build

Use Node 24+, the repository pnpm helper, Android SDK and JDK 22. The short build caches have source markers and guarded replacement paths. They exclude credentials and health records from copied build inputs.

```powershell
./scripts/pnpm.ps1 privacy:generate
./scripts/pnpm.ps1 check
./scripts/build-android-preview.ps1
./scripts/build-android-store.ps1
```

The initial upload key has already been generated on the development machine. `-CreateUploadKey` is only for first setup on a machine with no existing pair; the helper refuses a partially missing pair and does not replace an existing key. Store output goes under ignored `artifacts/android-store/`: a signed AAB, local-test APK, SHA-256 files and public upload certificate. The store Gradle init script rejects the preview app ID and missing upload credentials instead of falling back to a debug key.

**Credential recovery remains an owner step before the first upload.** The upload keystore and `password.dpapi` stay under ignored `.tools/android-signing/store-upload/`. Windows DPAPI protects the password for the current user/machine; copying those two files alone is not a portable recovery backup. Arrange a separate recoverable backup of the key and password in an owner-controlled secure vault. Do not commit or email either. The build does not provision cloud secrets or change the shared Play account.

## Validate the actual output

Download [Google bundletool 1.18.3](https://github.com/google/bundletool/releases/tag/1.18.3) as `.tools/bundletool-all-1.18.3.jar`. Expected SHA-256: `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`. The validation helper checks this hash, passes the keystore password through stdin and creates an ignored universal APK from the AAB for inspection.

```powershell
./scripts/validate-store-bundle.ps1 -Bundle artifacts/android-store/trifelle-0.27.0-upload.aab
python scripts/audit-android-artifact.py artifacts/android-store/trifelle-0.27.0-upload.aab --version 0.27.0 --code 32 --java '<JDK>/bin/java.exe'
python scripts/audit-android-artifact.py artifacts/android-store/trifelle-0.27.0-upload-bundletool-universal.apk --version 0.27.0 --code 32 --aapt '<SDK>/build-tools/36.0.0/aapt.exe' --zipalign '<SDK>/build-tools/36.0.0/zipalign.exe'
```

Use actual local SDK/JDK paths in place of the placeholders. Verify the AAB signature with `jarsigner -verify`; self-signed upload-certificate and missing timestamp notices are expected, but unsigned payload entries or invalid signatures are not acceptable. Verify APK signatures with `apksigner verify --print-certs`. The auditor checks CRCs, identity/version, embedded screenshot setting, release privacy controls, health scope, allowed permissions, 64-bit ABIs and 16 KiB ELF alignment. APKs additionally verify ZIP alignment and backup rules. It does not install the app or claim a real 16 KiB device pass.

## Reviewer walkthrough

There is no online app account or supplied shared credential. On a fresh installation:

1. Open **Privacy & support** before creating a journal; the full policy works offline.
2. Choose **Explore with sample data** to inspect the calendar, history and fictional records without touching a saved journal. Sample mode does not send reminders or connect to a wearable.
3. To test persistence, choose **Make it yours** and create a disposable journal with a reviewer-chosen passphrase of at least 12 characters. Keep it for that installation; do not send it to the developer.
4. Record a fictional period/date, reopen it, lock/unlock and make an encrypted backup. Use a disposable installation for restore/deletion checks.
5. Optional biometrics require supported device authentication. Optional local reminders require notification permission. Sleep import requires a compatible Health Connect installation and a source app that has written sleep records; existing sample sleep is not proof of a device connection.

The Play listing/reviewer instructions must explain these prerequisites. Do not provide a real tester's account, records or passphrase to Google reviewers. The production-identity local APK and eventual Play-signed build may not update over one another because their signing certificates differ; keep backups and validate the actual Play installation separately.

## Policy/support site handoff

`src/content/privacy.json` is the policy source. `pnpm privacy:generate` produces `public/privacy.html`, `public/support.html` and the Android native policy string. `pnpm check` detects drift. The functional in-app screen reads the JSON directly and uses existing app styling; no new appearance options are introduced.

The local `artifacts/site/trifelle-support-site-0.25.0.zip` includes only the public HTML/CSS and approved icon, not the journal app or health records. Its `index.html` is a copy of the support page. It is ready for anonymous HTTPS hosting. Hosting has not been configured, and there is no live Trifelle policy URL to submit yet. Finalize the hosting provider details in the policy before publication, then check the public policy directly without authentication and enter that exact URL in Play Console. In-app text already works without a hosted URL. The approved 512-pixel icon copy is at `artifacts/store-materials/trifelle-play-icon-512.png`.

Account organization verification, upload-key recovery, final price/countries, Play App Signing, declarations, hardware testing and owner publication approval remain separate release requirements in the [release plan](play-release-plan.md).
