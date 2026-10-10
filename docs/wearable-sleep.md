# Wearable sleep integration

## Decision and status — October 10, 2026

The owner requested connection to devices that already record sleep and selected **Fitbit first**. Preview 0.16.0 implements manual sleep logging only. The next development priority is an Android Health Connect import; no health-data permission has been requested or granted to Cycle Tracker yet, and no wearable compatibility has been validated on hardware.

The planned path is **Fitbit device → Fitbit/Google Health app → Android Health Connect → Cycle Tracker**. Google's current documentation says Google Health can write sleep sessions and stages to Health Connect, subject to the user's choices. Cycle Tracker would read those on the phone and retain selected records in its encrypted journal. This architecture should require no Cycle Tracker hosting service or Fitbit credentials inside the journal. Fitbit/Google's own account, device sync and cloud practices remain separate; the presence and timing of data must be verified on a real test device. [Google Health / Health Connect data types and permissions](https://support.google.com/googlehealth/answer/14506680?hl=en).

Avoid starting a legacy Fitbit Web API integration: Google states those APIs cease support on October 30, 2026 and that Health Connect and Apple Health connections are unaffected. [Google's transition notice](https://support.google.com/googlehealth/answer/14236613?hl=en).

## First import slice

- Optional Android connection, with an explicit action to request **read sleep** permission only. No cycle, medication, location, broad health access or write-back permission. Recheck grants before reads; handle unavailable/outdated Health Connect, refusal, revocation and an empty result without blocking manual logging. Start with foreground imports rather than additional background access.
- Show available sources and sessions, with a review before applying an import. Check the actual Fitbit/Google Health source identity on hardware rather than hardcoding an unverified package name. A device sync may need to finish before new sleep appears.
- Store source, source record identity, modification information, session start/end and available zone offsets alongside imported values. Use stable identities to avoid duplicates and define behavior for source corrections/deletions. A failed or cancelled import must leave existing entries intact.
- Keep manual entries authoritative until the user explicitly chooses a replacement. Imported sessions need separate provenance and must retain naps/multiple sleeps without silently summing overlaps or replacing the main-sleep record. Define the waking-date mapping for midnight, travel and daylight-saving changes.
- Derive time asleep only from defensible sleep intervals. A session's full start/end span can contain awake time or unknown gaps, so it must not automatically become time asleep. Missing stages do not mean zero wakings. Preserve device estimates as estimates, keep subjective quality user-entered, and do not translate a vendor score into the manual quality scale.
- Include retained imported observations and provenance in encrypted backup/restore, readable exports, date filtering and deletion/Undo. Connection grants remain device-local. Disconnect should stop future reads and clearly distinguish permission removal from deleting previously imported copies.
- Verify permissions, source availability, repeated imports, edits/deletions, partial stages, overlaps, time zones, manual conflicts, lock/cancellation and offline behavior automatically and on the Pixel 7 / Galaxy Z Flip5 test setup with a real Fitbit source. Follow current Play health-permission declaration requirements before store submission.

Android's official sleep guide describes `SleepSessionRecord`, optional stages and the `android.permission.health.READ_SLEEP` permission. The SDK and system must be checked for feature availability rather than assuming a phone OS version guarantees usable records. [Health Connect sleep guide](https://developer.android.com/health-and-fitness/health-connect/experiences/sleep) · [SleepSessionRecord reference](https://developer.android.com/reference/android/health/connect/datatypes/SleepSessionRecord).

## Later platforms

Other Android providers may become available through the same Health Connect route, but each source needs validation. iOS would use a separate HealthKit adapter and its permission flow. The computer browser cannot directly query the Android phone's Health Connect store: it can display imported data after an encrypted journal backup is transferred, once the import/export schema exists. Automatic cross-device sync remains a separate roadmap feature, not a promise of this integration.

These are implementation requirements and source-checked feasibility findings, not a claim that Fitbit is already connected or that every device supplies every field.
