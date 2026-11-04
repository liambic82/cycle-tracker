# Doctor-summary PDF performance

Preview **0.30.0 / build 37** improves local PDF generation without changing the approved report appearance, selected-record filtering, journal format, permissions or prediction behavior.

## Implementation

Font shaping was repeated for the same text during wrapping and drawing. Measurements and encoded strings now use caches scoped to one export, separately for regular and bold fonts. Each cache retains at most 2,048 entries / 131,072 string code units. Nothing is stored in a session-wide cache or added to the journal. Whole-string font shaping remains intact; character-width approximations could change ligatures and wrapping.

Each page reuses two font resources. Text operators, coordinates, colors, line spacing, headers and footers preserve the existing output. Generation yields between layout paragraphs/blocks and drawn lines when work has accumulated, and checks the originating screen's active state. Locking or leaving that screen cancels further work. Checks before and after serialization prevent an abandoned result from reaching the share/export path. A long individual paragraph or font serialization can still occupy a synchronous chunk; this is cooperative scheduling, not a strict frame-time guarantee or a native background PDF worker.

The existing 366-day, selected-content and 200-page limits remain. Unsupported glyphs and oversized reports fail clearly rather than omitting selected text. Android keeps handed-off readable copies until startup cleanup so a recipient can finish reading; an export cancelled before handoff creates no such file.

## Content and layout checks

- `pnpm check`: **347 passing tests**, including abandonment before font work, timer-driven cancellation after layout starts, and excessive pagination refusing a partial PDF. Existing Unicode, bounds, section privacy, snapshots and unsupported-glyph checks pass. The first sandboxed run hit Windows temporary-directory rename restrictions in unrelated research tests; the complete rerun outside that sandbox passed with none skipped.
- Production web, Android and iOS JavaScript exports pass. This does not constitute a new native iOS binary or iPhone test.
- A fixed 1,825-entry fictional journal produces a 366-day **36-page** report. Before/after text extraction is identical, and every page renders to identical PNG bytes at 72 dpi with the same Poppler version. Output shrinks from **59,952 to 43,509 bytes**. Instrumented text-measurement calls fall from **4,122 to 1,393**; text-encoding calls fall from **1,169 to 476**. Instrumentation timings include overhead and are not phone benchmarks.
- A separate **109-page** fictional stress report includes varied notes, precomposed and combining accents, ligature-bearing words, blank lines and long unbroken tokens. All extracted page text and all rendered PNG pages match. Output shrinks from **170,604 to 114,556 bytes**. Representative first/final and note pages were visually inspected.
- Generated PDFs, renders, fixtures and profiles remain in ignored local artifacts. Font/script coverage and tagged PDF accessibility are unchanged and remain follow-up work.

## Native comparison

The guarded `scripts/native-pdf-performance.py` uses the disposable rooted **TrifelleStoreAPI36**, Android 16 / API 36, x86_64 release preview. Its fixed fictional attachment journal supplies **November 2, 2025 through November 2, 2026**, with default selected sections. It measures from the export tap until a complete PDF is observed in app-private cache, opens and cancels the Android chooser without choosing a recipient, and verifies cache removal on restart. Polling/ADB overhead is included. These are emulator observations, not physical-phone performance or successful delivery to a chosen destination.

The fresh 0.29.0 baseline is **8.181 / 7.624 / 7.509 seconds**. Use this comparison instead of the older 18.355-second observation, which overlapped a native build. No native builds run during the new measured samples.

| Build       | Installed APK SHA-256                                              | Three file-ready observations |  Median |
| ----------- | ------------------------------------------------------------------ | ----------------------------- | ------: |
| 0.29.0 / 36 | `232467e97bdce2bd5b325e7f659088163823c8b537c9b2d0cff8fe3b4dbcd860` | 8.181 / 7.624 / 7.509 seconds | 7.624 s |
| 0.30.0 / 37 | `f3b4caf558d55d1a180ab63307006ec2578d432bfbb64bc902cadfe30d3c9b4e` | 5.380 / 5.404 / 5.276 seconds | 5.380 s |

The median falls about **29%**; this small before/after sample is descriptive, not a device-wide performance guarantee. The native file shrinks from about **59,941 to 43,499 bytes** (about 27%). All 36 pages retain their extracted text except the automatically prepared date, which changed from November 3 to November 4 across midnight. Rendered pages are identical outside that date's single changed digit on page 1. The selected record range is identical.

Starting a fourth export and tapping Lock leaves **no new readable PDF or delayed chooser** during the subsequent 20-second observation. The unlock screen is observed within 5.802 seconds of starting export, including input commands, UI Automator polling and scrolling to its control; this is not a frame-time or tap-response measurement. A cold restart removes the three completed report copies. Actual destination selection and recipient read completion remain phone checks.

## Reproduction and remaining work

Run `node --experimental-strip-types scripts/benchmark-report.mjs` for the fixed fictional profile and PDF under `artifacts/performance/report/`. For native checks, generate the guarded recovery fixtures, install the matching x86_64 preview, enable root only on the named disposable AVD, and run `python -X utf8 scripts/native-pdf-performance.py --cancel`. The harness refuses a different emulator/version and records the installed APK hash. Stop concurrent builds before measuring. Do not substitute real health data.

Physical Pixel 7 / Galaxy Z Flip5 timing, actual recipient/save behavior, background locking and report readability remain [phone checks](android-testing.md#0300-faster-doctor-summary-pdfs). The long on-screen report preview is unchanged; improving its navigation would need a separate concrete layout proposal. Consolidated device accessibility/reliability, public policy hosting, signing recovery, account verification and Play-delivered tests remain release work. This milestone does not authorize a public release or 1.0.
