# App accessibility pass — November 2, 2026

Preview **0.28.0 / build 35** improves access to the existing approved interface. This is a bounded engineering review, not an accessibility certification or a physical-phone sign-off. It changes no journal format, encryption, prediction method, permissions or signing identity.

## Reproduced problems and repairs

- In the 0.27.2 browser build, opening Daily observations removed the focused opener and left focus on the document body. Several other nested forms exposed no heading. A shared screen heading now receives context focus when a form opens or its review state changes; ordinary edits do not keep stealing focus. On native platforms the focus request is conditional on an enabled screen reader. Section headings across the journal, history, medications, data tools and appearance now expose heading semantics.
- The daily browser dialog had no accessible name. It now includes its date; Privacy & support also has a named dialog. Existing keyboard containment and privacy boundaries remain in place.
- Daily action rows exposed their name but omitted the visible summary from their accessible description. Their descriptions/hints now include that summary.
- At 320 CSS pixels with text and line heights doubled, the Rate symptoms action extended beyond the viewport. Shared buttons now wrap within their available width. Buttons/chips, daily date arrows, lock/close controls and period-marker rows have a minimum 48-unit target; marker labels and section headings can wrap without displacing their icons. This does not claim every calendar cell is 48 units.
- The daily journal slide transition now follows the platform's reduced-motion preference, initially keeping motion off until the preference is known. The approved logo retains its existing still fallback.

The approved colors, imagery, typography and navigation order are preserved. Programmatically focused noninteractive browser headings do not draw a control outline; interactive controls retain their keyboard indicators.

## Repeatable checks

`pnpm typecheck` and production web/Android/iOS JavaScript exports pass. The named appearance test **all palettes keep body, selected, semantic and button text at least 4.5:1 in light and dark** passes for the defined color pairs across all nine palettes in light/dark modes. This checks tokens, not every rendered pixel or arbitrary personal background photo. No domain/storage code changed; the older 340-test result is not a new run for this milestone.

`scripts/accessibility-ui-qa.cjs` passes **72 screen checks**: 24 screens at 320-pixel light, 390-pixel dark and 1280-pixel light widths, with no page errors. It verifies destination-heading focus, typing focus retention, named fields, action-row descriptions, named dialogs, keyboard containment and navigation through daily observations, sleep, sexual health, products, doses, symptoms/pins/order, medication and care-reminder forms, data import, medical records, reports, appearance, wearable sleep and privacy. At 320 pixels it also doubles CSS text and line heights on inspected screens except the long Your data overview, checking horizontal containment outside intentional horizontal scrollers. This stress check is not native Android font scaling or a complete browser-zoom audit. Reduced-motion browser contexts are used; spoken assistive-technology output is not simulated.

Run against a production preview with Playwright available:

```powershell
$env:TRIFELLE_QA_URL = 'http://127.0.0.1:4177/'
# If Playwright is provided by a separate local runtime:
$env:TRIFELLE_PLAYWRIGHT_MODULE = '<runtime>/node_modules/playwright'
node scripts/accessibility-ui-qa.cjs
```

Results and fictional screenshots remain in ignored `artifacts/qa/accessibility/`. The observation, care-reminder, medical-form, dark appearance and desktop appearance captures were visually inspected.

## Remaining device work

The signed x86_64 preview installs over 0.27.2 on the disposable **Android 16 / API 36 emulator** without clearing storage. At **480 dpi / 360 dp width / 200% system text**, the sample journal opens, daily observations accept injected fictional text, the observation and sleep Save actions are reachable by scrolling, Cancel returns to the day, symptom ratings open/return and the medication schedule form opens/cancels. Native captures were inspected. The navigation geometry checker verifies full labels, 48 dp targets, two-row order and one selected tab; returning to **400 dpi / 432 dp / 100% text** restores the one-row layout and passes the same audit. These checks use fictional sample data; they are not a saved-journal comparison or a new backup round-trip. The input check confirms native focus/text handling, not the ergonomics of a physical phone keyboard. Initial harness attempts matched a text label before its field or used an incorrect Save label; the actual labeled controls passed after correcting the harness.

Use the [0.28.0 phone checklist](android-testing.md#0280-accessible-forms-and-controls). The AOSP emulator has no TalkBack service installed: heading roles and native focus calls do not establish spoken focus, reading order or announcement quality. Actual Pixel/Flip5 TalkBack, folding/rotation, keyboard behavior, personal-photo readability, reminders, biometric and Health Connect checks remain separate. Tagged PDF output and full report reading order are also outside this pass. No iOS native rebuild, Play delivery or public-release approval is claimed.
