# Approved Clover & cream Android artwork

October 31, 2026. The owner approved **A · Clover & cream**, its feature composition, six captions and ordering: “The cleaner A look is the way to go.” See [the decision](../approval.json). This pack uses actual **Trifelle 0.27.1 / build 33 Android emulator captures**, replacing the historical browser proposal sources. App theme defaults remain unchanged. Nothing has been uploaded or published.

Open the [gallery](index.html), [feature graphic](clover-cream-feature.png) or [six-screen sequence](clover-cream-sequence.png). The sequence and board are review aids; upload the seven individual artwork files, plus the existing approved 512-pixel icon, when submission is authorized.

| Order   | File                             | Dimensions  |
| ------- | -------------------------------- | ----------- |
| Feature | `clover-cream-feature.png`       | 1024 × 500  |
| 1       | `clover-cream-01-calendar.png`   | 1080 × 1920 |
| 2       | `clover-cream-02-period.png`     | 1080 × 1920 |
| 3       | `clover-cream-03-daily.png`      | 1080 × 1920 |
| 4       | `clover-cream-04-history.png`    | 1080 × 1920 |
| 5       | `clover-cream-05-appearance.png` | 1080 × 1920 |
| 6       | `clover-cream-06-backup.png`     | 1080 × 1920 |

[assets.json](assets.json) contains the approved copy, order, accessibility descriptions, sizes and SHA-256 hashes. The packaged icon is the existing opaque PNG export of the approved Trifelle icon. The local ZIP under ignored `artifacts/store-materials/` includes those eight images, listing draft, approval, source provenance and a checksum manifest. It contains no app binary, signing material or backup file. The verified ZIP is **1,091,037 bytes**, SHA-256 `8fe4b81dfb0e8d4ac0025bbbd23f7718d989e798981b7e13bcc42a979f3fb9c0`.

## Capture provenance

- Disposable AOSP **Android 16 / API 36**, x86_64 emulator; 1080 × 1920, 400 dpi (432 × 768 dp), system text 1.0, light appearance. This is emulator evidence, not a Pixel/Flip5, wearable, TalkBack or Play-delivered pass.
- Release-signed preview APK: `e2cc3817feac169aad41838ad86eb15a8e8949ac77f780df94507645aaf0e23f`. The existing preview screenshot allowance is used; production screenshot protection is unchanged.
- The built-in `demoJournal('2026-10-31')` supplies **42 fictional entries**, with Cramps, Fatigue and Bloating pinned. A fictional encrypted backup was restored through the normal picker, then retained across the 0.27.0 → 0.27.1 update. No tester journal or profile was read.
- Native captures use normal navigation, scrolling and `adb exec-out screencap -p`. Posters scale the entire screenshot, including system bars; only the feature graphic crops a calendar excerpt. App controls and records are not painted over, removed or restyled.
- The period screenshot shows an **unsaved** October 21–25 form, then Cancel. Daily journal is October 31; History shows recorded fictional cycle lengths. Appearance stays Plum. Backup is the actual export section, not a simulated confirmation.
- [Source provenance](captures/provenance.json) records every source PNG hash. Keep encrypted fixtures, XML dumps and temporary inspection captures in ignored `artifacts/`.

Render with Node 24+, the repository dependencies, Windows Georgia and Playwright Chrome:

```powershell
./scripts/pnpm.ps1 exec node --experimental-strip-types scripts/render-store-proposals.mjs --android
```

Set `TRIFELLE_PLAYWRIGHT_MODULE` if using the bundled Playwright runtime. The renderer requires the recorded A approval and uses the saved native sources; it does not access an existing phone or journal.

## Calendar correction found during capture

The 0.27.0 native month grid wrapped the seventh date cell because seven fractional percentage widths exceeded the available row. October 3 appeared under Sunday instead of Saturday. Both the month/year grid and period picker now render explicit seven-cell weeks, with equal flexible cells, in **0.27.1**. No date values, record interpretation or vault format changed.

See [validation](../../../validation.md) for automated/browser/emulator evidence and APK hashes, and the [physical-phone checklist](../../../android-testing.md#0271-calendar-weekday-alignment). Existing account verification, public policy hosting, upload-key recovery, declarations, pricing/countries and Play-delivered testing remain in the [release plan](../../../play-release-plan.md). The prior 0.27.0 store AAB needs rebuilding before submission to include this patch.
