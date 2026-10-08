# Cycle Tracker App

A personal period and perimenopause tracker centered on a continuously scrolling calendar, daily symptoms, medication tracking, and useful records for doctor visits.

## Product brief

The [initial feature requirements](https://docs.google.com/document/d/1tOEpyA0x_Q6Up33TXy3rcdgS_-YiQC6e1BDU2acZduM/edit) are the starting point for planning. The document's version labels are suggestions, not a fixed release scope.

## Agreed direction

- Prioritize Android for the initial user.
- Plan for eventual publication in Google Play and the Apple App Store.
- Support use on a computer as well as on a phone.
- Launch with a modest upfront purchase price; the exact price is still to be decided.
- Keep the core app fully usable offline, without requiring cloud sync.
- Include export, backup, and restore so users can retain and transfer their records.
- Make automatic cross-device sync optional, with end-to-end encryption if enabled.
- Evaluate sync on a free hosting tier during development and measure actual usage.
- Decide how to fund ongoing sync costs before public release. An upfront app purchase does not yet promise unlimited hosted sync.

## Proposed technical approach

React Native with Expo and TypeScript is the current recommendation for sharing the app across Android, iOS, and a browser version for computers. The framework and browser delivery approach have not been finalized.

Storage should support the offline core independently of any sync provider. Sync design will need to address conflicting edits, device pairing, encryption keys, recovery, and deletion before it is ready for release.

## Decisions still open

- Final framework, local storage implementation, and sync provider.
- Whether automatic sync ships in the first release and how it is priced.
- Exact first-release feature scope, including the hormone estimates and clot logging dependencies noted in the brief.
- Attachment limits and hosting budget, informed by measured use of lab-report photos and PDFs.

No application scaffold or hosting service has been set up yet.
