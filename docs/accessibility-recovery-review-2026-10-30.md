# Accessibility and recovery review — October 30, 2026

Follow-up: [preview 0.26.0](journal-recovery-performance-2026-10-30.md) adds resumable convenience cleanup after journal commit and the fictional large-history measurements. The findings below preserve the 0.25.0 review scope; actual device performance and native accessibility checks remain open.

Scope: preview **0.25.0 / code 30**, following the owner's approval of the accessibility/recovery milestone. This is an assistant-led code review, automated failure injection and isolated browser verification with fictional records. It is not a complete accessibility certification, penetration test or physical-device validation. The approved visual design and prediction behavior remain unchanged.

## Reproduced failures and repairs

### Restore could damage the saved journal before a replacement committed

When Android's metadata read failed, the confirmed restore path assumed there was no active file and wrote slot A. If A actually held the current journal, a subsequent file-write or metadata-commit failure could leave the old pointer referring to changed or truncated bytes. A new test reproduced an unreadable original journal after this sequence; a second reproduced replacement proceeding when both occupied files were ambiguous.

Restore now distinguishes a failed database read from malformed metadata that was successfully read. After a read failure it uses only an empty file slot. If neither slot is empty, it stops without changing either file or the pointer and asks for a restart/retry. This preserves the explicit recovery route for oversized legacy database rows when a safe empty slot exists. Ordinary saving and the backup format are unchanged.

Three new regression tests cover failed write/commit with the original retained, successful replacement into an empty slot, and refusal when both slots are occupied. Existing tests still cover truncated writes, ambiguous commits, interrupted deletion, large journals, corrupt metadata and queued writes. The tests model failure behavior; they do not establish physical power-loss durability.

### Browser navigation could discard unsaved changes without a warning

A synthetic quota failure left the note visible with Not saved, but a browser unload event was allowed. The browser now receives a before-unload warning while a real journal's latest revision is pending or failed. Successful saving removes the reason for the warning; sample journals do not trigger it.

The browser controls the warning text and may suppress it without prior interaction. This does not protect against force-stop, process termination, loss of power or a browser that skips the event. The recovery test dismisses an actual reload warning, verifies the unsaved note remains, retries saving and round-trips an encrypted backup. Wrong-passphrase and failed replacement attempts leave the browser's existing encrypted journal unchanged.

### The privacy cover hid pixels but left controls accessible

The baseline browser check found all four navigation tabs still exposed behind the privacy cover. `InteractionBoundary` now hides covered content from native accessibility navigation and sets web DOM `inert` so keyboard focus cannot enter it. The desktop sidebar and main content are covered consistently, including while the daily editor or a blocking operation is active. The daily modal is hidden while obscured or busy. Mounted content and drafts remain available when the cover is removed.

The browser check verifies zero exposed tabs behind the cover, keyboard exclusion, contained forward/backward tabbing in the daily modal, and usable navigation after closing it. Native TalkBack and OS biometric/picker transitions still require hardware checks.

### Status, headings and larger text needed attention

Shared action buttons now expose busy and disabled states explicitly. Main page titles, the daily title and section labels have heading semantics; period-range date buttons expose their selected state on web. The privacy header wraps its close control instead of clipping it at larger text sizes, and save-status content can shrink around the daily close button. No palette, background or decorative design changed.

Browser coverage includes 320 × 740, 390 × 844 and 1280 × 900 viewports, light/dark screens, modal keyboard navigation and a policy text stress check at twice its CSS size. This CSS check does not substitute for Android's actual font-scale setting. Existing palette tests verify the defined body, selected, semantic and button text color pairs across all nine palettes in light/dark modes; they are not a full rendered contrast audit.

## Remaining limitations and phone checks

- No connected Android device or configured emulator was available. TalkBack announcements/order, real large text, keyboard/IME interaction, Flip5 folding, lifecycle timing and 16 KiB-page execution remain open.
- A failed save retains the in-memory journal for retry/backup. Locking also attempts to save and stays open with an error if it cannot; this is not a successful lock. Do not force-stop a journal with unsaved edits as a recovery strategy.
- Restore/deletion cleanup of the separate background photo, biometric key and reminders is not one atomic transaction with journal replacement. A valid restore that fails later can already have removed the saved background photo or convenience settings; the original photo outside Trifelle is untouched. This existing behavior is described in the architecture. Wrong-passphrase validation occurs before cleanup.
- Browser failure injection verifies UI recovery; the Android file-store tests verify the storage algorithm. Neither proves a real full-disk, OEM transfer or process-death scenario.
- The older PDF tagging/accessibility limitations, long-history performance checks and actual Play-delivered installation remain release work. No Play upload, public publication or 1.0 decision occurred.

See the [phone checklist](android-testing.md#0250-accessibility-and-recovery), [validation record](validation.md) and [Play release plan](play-release-plan.md).
