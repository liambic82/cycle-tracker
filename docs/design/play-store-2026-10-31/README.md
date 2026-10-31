# Trifelle Play presentation — Clover & cream approved

October 31, 2026. **A · Clover & cream is approved.** The owner selected it with “The cleaner A look is the way to go.” Approval covers the presented feature graphic, portrait compositions, captions and six-screen order. B remains an unselected alternative. The [finished Android artwork](android/README.md) uses 0.27.1 / build 33; this decision does not change app theme defaults or authorize publication. The original proposal and browser-capture evidence below remain design history.

The owner authorized continuing to concrete Play screenshot and feature-graphic proposals after the browser-storage milestone. The existing [approved Trifelle identity](../trifelle-2026-10-27/README.md) supplies the four-leaf geometry, contrasting leaf and wordmark direction. These are code-authored compositions of the existing vectors and captured app UI, not generated substitutes for app screens.

## Historical proposals

| Direction              | Treatment                                                                         | Recommendation                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **A · Clover & cream** | Ivory and sage surroundings, plum text, restrained leaf shapes at the edges.      | Recommended: the quieter background leaves the journal legible and connects the name to the clover. |
| **B · Plum & petal**   | A deep plum feature graphic, rose portrait backgrounds and the same app captures. | A warmer, more emphatic alternative that closely matches the launcher tile.                         |

Review [both complete sets](index.html), [A's board](clover-cream-board.png), [B's board](plum-petal-board.png) or [A's six-screen sequence](clover-cream-sequence.png). The gallery buttons switch directions; each asset opens at full size. The six captions and order are identical between the two directions so the color treatment can be compared directly. These names identify marketing treatments, not new app palettes.

## Approved sequence and copy

| Position | Heading                       | Supporting line                             | Actual interface shown                                                                                    |
| -------- | ----------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1        | Your cycle, clearly recorded. | Calendar, flow and daily notes.             | Month navigation, recorded flow and journal dates.                                                        |
| 2        | Log a period in one go.       | Start and finish. Details can wait.         | An unsaved October 21–25 range with optional flow and the existing Save period control.                   |
| 3        | Space for how you feel.       | Keep symptoms and observations together.    | Today's journal, pinned symptoms, a fictional rating and daily sections.                                  |
| 4        | See your recorded patterns.   | Review cycle lengths over time.             | Historical intervals from recorded starts, not predicted hormone measurements or clinical interpretation. |
| 5        | A little more you.            | Choose colors that feel like yours.         | Existing palette choices with the existing Plum option selected.                                          |
| 6        | Keep a copy. Keep control.    | Export your journal as an encrypted backup. | Backup export and its passphrase/recovery limitations.                                                    |

Both feature graphics say **“Your cycle. Your space.”** and **“A period & wellbeing journal”**, with a crop of the actual fictional calendar. The icon remains the already approved 512-pixel export. No price, ranking, endorsement, testimonial, medical outcome, direct Fitbit connection or cloud/background-sync claim is added. The listing's existing medical-advice and experimental-prediction qualifications remain applicable.

## Historical browser provenance and publication limits

The six source PNGs in `captures/` come from the **production mobile web bundle of 0.27.0**, at a 390 × 700 CSS viewport with 3× pixel density, Windows Chrome, light appearance and reduced motion. An isolated non-persistent context uses the app's built-in fictional journal with Cramps, Fatigue and Bloating pinned. The clock is fixed to October 31, 2026. No tester records or existing browser profile are read. Captures use normal app navigation and scrolling; no controls or copy are painted over, removed or restyled. Scrolling frames complete sections; content farther down remains outside the viewport, as in ordinary use.

`captures/provenance.json` records source/image hashes, dimensions, version and zero page errors. The working encrypted fixture is memory-only and uses a deliberately fictional passphrase; it is never committed. Native system bars, keyboards, biometric prompts, Health Connect consent, reminder delivery and receiving-app sharing are not established by these web images. Before uploading, replace these proposal sources with checked Android captures of the same states and repeat crop, copy and format verification. Use approved testing screenshot access; do not weaken the production privacy setting for marketing captures.

The original boards identify the proposal stage; the archive gallery links to the completed Android pack. The individual compositions are kept in this dated design folder, separate from store upload artifacts. **Do not upload these draft browser compositions as verified Android screenshots.** No additional tablet, foldable, Wear OS, Chromebook or iOS listing is implied.

## Format and verification

The [official Google Play preview-asset guide](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en), checked October 31, 2026, specifies a 1024 × 500 feature graphic and PNG/JPEG without alpha. Its recommendation criteria use at least four 1080 × 1920 portrait screenshots. This proposal supplies six per direction; captions stay in the top 20%, with the actual interface dominant. Feature-graphic focal content is inset, with decorative shapes at edges. Accessibility descriptions are recorded in `assets.json`, each at most 140 characters.

- `scripts/capture-store-proposals.cjs`: repeatable isolated fictional capture, using `TRIFELLE_PLAYWRIGHT_MODULE` and optionally `TRIFELLE_QA_URL` (default localhost:4174). Run with Node 24 and `--experimental-strip-types` against a production preview.
- `scripts/render-store-proposals.mjs`: renders both sets from the capture PNGs, the shared clover geometry, bundled OFL Noto Sans fonts and the existing Georgia wordmark direction. The render requires Windows Georgia for the reviewed typography. No additional font or artwork is downloaded.
- The renderer verifies all **14 individual assets** have the intended dimensions, no alpha and concise alt text. The two boards and sequence sheet are review aids, not additional store uploads.
- All six source-capture hashes match their provenance record. All 14 individual assets are below 8 MiB and pass dimensions, RGB/no-alpha and alt-text length checks. The review gallery passes both directions, image loading, keyboard arrow switching and no horizontal overflow at widths **320, 736 and 1280**, without page errors. Source captures, the two feature graphics, review boards and six-screen sequence were visually inspected; temporary gallery QA evidence remains in ignored `artifacts/`.
- For the original browser proposal only, application source/configuration were unchanged and no new app build or device pass was claimed. The subsequent 0.27.1 calendar correction and Android artwork have separate [evidence](android/README.md).

## Approval and next step

The owner approved **A, its feature-graphic composition, six portrait compositions, captions and ordering**. The exact decision is recorded in `approval.json`. It does not change the app's appearance choices or authorize publication. This satisfies the visual approval requested by [AGENTS.md](../../../AGENTS.md); no further approval of the same direction is needed.

The [approved Android pack](android/README.md) is complete. Review it alongside the outstanding physical-device results. Public policy hosting, recoverable upload credentials, account verification, content declarations, pricing/countries and Play-delivered tests remain in the [release plan](../../play-release-plan.md). None is marked complete by design approval.
