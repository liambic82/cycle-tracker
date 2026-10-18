# Preview 0.20.0 layout review — October 17, 2026

**Follow-up:** the owner authorized repair. The three navigation findings below are addressed in **0.20.1 / code 25** and passed production browser checks; native phone validation remains pending. [Repair evidence](validation.md#navigation-repair--october-17-2026) · [Layout proposal awaiting approval](layout-proposal-2026-10-17.md). The 31 px anchor observation below used a locator click that could scroll before tapping; a later direct-tap check returned to the same position and corrects that measurement's interpretation. The remainder records the original review, not the patch's current status.

The owner reported that a tester's first impression was that the app looked broken. This review found three reproducible navigation problems and presentation choices that plausibly contribute to that impression. It does not identify which screen the tester saw. **These findings remain open; this is a review, not a repaired build.**

Reviewed source: `7bfd7b1`, preview 0.20.0 / Android code 24. Browser inspection used the production export, fictional sample records, 390 × 844 and 320 × 740 phone-sized viewports, and 1280 × 900 desktop. Light and dark rendering were inspected. These are browser checks, not validation on Pixel 7, Galaxy Z Flip5 or Fitbit Inspire 3.

## Confirmed navigation problems

### 1. Opening a month from the year grid can show the wrong month

Reproduction: choose Year view, Previous year to 2025, then Open January 2025. The visible month was **March 2025**, with April below it. January 1 was above the viewport at y = −870 px. Reproduced in light and dark mode at 390 px. The target month exists in the list; the viewport lands in the wrong place.

Relevant code: `src/ui/Calendar.tsx:443–454`. The year-to-month transition requests a scroll using `headerHeight.current` while replacing the taller year-grid header. This is a likely stale-layout/scroll-coordination problem; a repair must verify the final measured layout, not merely that the requested month exists in the list.

Acceptance: selecting any month from Year view brings its heading and first week into view, including past/future years, narrow/desktop layouts and text scaling. The general header-height adjustment must not override an intentional navigation target.

Evidence under `artifacts/qa/layout-review-2026-10-17/`: `january-opens-march-390.png`, `year-grid-before-selecting-january-390.png`, `january-opens-march-light-390.png`.

### 2. Switching calendar views hides the result

Month/Year/Day controls sit below the complete daily journal. `chooseView()` in `src/ui/Calendar.tsx:251–255` scrolls to offset zero. Clicking Year view returns to the cycle summary; the year grid is below the viewport. The selected state changed, but its result is invisible. Day view behaves similarly; in the exercised historical-day state, Previous day was at y = 2178 px after switching.

Acceptance: switching views brings the selected view and its controls into view. Keep an intentional Today shortcut separate. Bringing day navigation beside the daily date is a proposed layout improvement, not an implemented change.

Evidence: `year-switch-returns-to-top-390.png` in the same screenshot directory.

### 3. Opening a daily detail form can leave it entirely off-screen

From the home journal, expand Hormone guide, then open Daily observations. The app returns to the top of the expanded guide. The observation form's first control was at y = 1087 px in an 844 px viewport, so none of the form was visible. With the guide collapsed, the summary and Add period still precede the form and consume much of the first screen.

Relevant code: the non-modal `DayEditor.onViewChange` handler in `App.tsx:176–179` calls `calendarScroll.current?.top()`, targeting the entire home list. The modal path targets its own editor scroll view. Pins and other detail views use the same home transition.

Acceptance: opening a detail view brings its heading and first control into view, regardless of guide expansion, selected date or section order. Returning should reveal the daily journal rather than make the user rediscover it.

Evidence: `opened-form-hidden-below-guide-390.png` and `observations-under-summary-390.png`.

## Presentation concerns

- **Calendar is hard to find despite being the selected tab.** In the initial 390 px sample layout, Earlier months was at y = 1983 px and the first month below it. The initial screen mostly shows the cycle summary, Add period, the journal heading and Edit section order. The calendar is also below the desktop fold. This follows the documented Journal first implementation, but the tab name and lack of a nearby calendar shortcut set a different expectation.
- **Configuration competes with daily use.** Edit section order is a full-width button before logging sections. Pin symptoms, Browse all symptoms and optional ratings add more large buttons. Logged pinned symptoms appear in both the logged and pinned groups. These controls work, but repetition and equal emphasis make the screen busy.
- **Save feedback is far from common taps on the home journal.** Its status is at the end of the daily entry (`src/ui/DayEditor.tsx:671`), below the first viewport. The modal has a top status. A chip changes immediately, but the home layout provides less visible persistence feedback. This concerns placement; sample mode cannot establish real encrypted-save behavior.
- **Calendar space can look empty.** Months use a fixed 550 px row at ordinary text scale and always reserve six weeks. Shorter months leave substantial blank space. Cycle-day annotations are small, unlogged dates show dots, and future dates are faded. These are deliberate representations, not missing data or failed rendering, but can look unfinished without context.
- **Simplification is uneven.** At 320 px, Your history's first screen is mostly an observation-history button, a large introductory card and the next section heading; charts are further down. Sleep import has a long introduction and a source-enable control that appears above the load/results area. Batch import works, but still requires substantial reading and scrolling. Incomplete sleep stages can show “0 h 0 min” beside “total time asleep is unknown”; the qualification is present, but the leading zero can be misread.

Evidence: `home-390.png`, `home-desktop-light.png`, `history-320.png`. All screenshots are local, ignored artifacts with fictional data.

A compact visual proposal should put a useful daily action or the calendar in the first viewport, reduce the prominence of configuration/help, keep save feedback visible and align the tab label with its content. Preserve approved palettes, backgrounds and the soft feminine direction. **Obtain approval for that concrete proposal before implementing beautification/customization changes.** This review is not new design approval.

## What worked and what remains unverified

- Pinning Back pain added a quick choice without increasing the logged symptom count. Moving Daily observations above symptoms changed the displayed order.
- The period form accepted start/finish selection and enabled Save period. The draft was cancelled; this review did not perform a period persistence roundtrip.
- Two fictional sleep sessions were selected, reviewed and imported together, and appeared in Saved sleep nights. Existing manual sleep remained separately displayed. No phone permissions or real wearable reads were attempted.
- Earlier months opened the earlier list. Opening/closing July 11 retained July rather than resetting the month list. The observed cell shifted from y = 295 to y = 264 px, so this is **not** evidence of exact pixel-anchor retention. Keep native gesture and anchor checks open.
- Three hormone lines and legends rendered at 320 px in dark mode, with no document horizontal overflow. Main navigation and the inspected history, medication, settings and period-form screens rendered without the old single-character-column failure. Browser warning/error logs were empty during the exercised flows.
- `pnpm check`: typecheck and **260/260 tests passed**, no skips. The first sandboxed run encountered blocked temporary-file operations in research fixture tests; rerunning outside the sandbox passed. Log: `artifacts/qa/layout-review-2026-10-17/check.log`. No production research records, plans or results changed.

No app code, version, APK or visual design changed. Automated checks do not cover these viewport/scroll failures; passing tests do not close them. Android text scaling, keyboard behavior, folding, TalkBack, biometric/lifecycle behavior and actual wearable import remain separate device checks.

## Recommended next work

Repair the three navigation defects, with production browser checks and focused Android validation. Present a compact layout proposal addressing the first-screen hierarchy and repeated controls. Recheck the exact scroll anchor after opening/closing dates. Complete outstanding Android checks before the iOS port; this is not a 1.0 release decision.
