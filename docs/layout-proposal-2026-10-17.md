# Layout refinement proposal — October 17, 2026

**Approved October 18, 2026; implemented in preview 0.21.0 / Android code 26.** The owner explicitly approved **Calendar & journal**, including the History and wearable sleep changes. This follows the navigation-only repair in 0.20.1. The alternative below remains unimplemented. Existing palette/background approvals remain in force; further visual changes still require approval.

## Implementation

Calendar opens with a compact cycle summary and month grid. Dates open a focused journal with adjacent-day controls and visible persistence feedback. Explicit-save forms identify their pending form state; system Back cancels the current form before closing the journal. History and saved-sleep links retain their originating screen. Journal settings contains order and pin management; the daily symptom list combines visible pins with all logged symptoms without duplicates.

Continuous scrolling retains measured navigation and calendar return positions. Months use their actual number of weeks and readable cells, with recorded cycle-day context retained in accessibility labels and the dated journal. Month arrows and Find date replace the separate Day-view toolbar; tapping a date opens that same daily editor. Explore stays collapsed beneath the scrolling calendar so it remains reachable without chasing an extending list. The calendar is the only vertical scroll owner on its screen.

History leads with recorded charts. Wearable sleep groups permission/source, explicit opt-in, last result, checking and saved nights; connection help is expandable. Missing sleep totals lead with Unknown. All seven journal sections, detailed fields, safeguards, existing appearance options and prediction qualifications remain. No schema, permission, automatic-import policy or prediction changes. See [validation](validation.md#calendar--journal--october-18-2026) and [device checks](android-testing.md#0210-calendar--journal).

## Calendar & journal — recommended

- Keep Calendar as the first primary destination and place the month grid immediately after the compact current-cycle summary. Add period remains prominent. Year/month selection and Today stay with the calendar; earlier/later navigation remains available. The mock shows one navigable month; production continuous scrolling remains in scope rather than being removed by implication.
- Open a selected date in a focused daily editor. Put previous/next day beside its date and save feedback near the top. Keep the cycle summary and hormone education outside the active form.
- Put section order and symptom pins behind a labeled Journal settings action. Show pinned and logged symptoms together without duplicate chips; unpinning must not hide a logged symptom. Keep optional ratings and full symptom browsing reachable.

## Today & calendar — alternative

- Rename the first primary destination Journal. Put a compact daily entry first, with explicit Today/Calendar controls near the top instead of burying the calendar beneath the whole journal.
- Use the same focused detail forms, quieter configuration controls and visible save status. Selecting a calendar day still opens its dated journal.

## Shared proposed changes

- Sans-serif section headings, compact spacing, smaller card corners and restrained separators. Retain the soft plum/feminine direction, serif brand, existing palettes and background options. Light/dark preview controls demonstrate existing appearance choices, not new user preferences.
- Shorten History's introduction so recorded charts and summaries are visible sooner. Preserve unknown values, units and the distinction between completed and incomplete cycles.
- Put wearable connection/source, import-on-unlock choice, last result, Check now and Saved nights together. Move detailed connection/privacy help behind an expansion while retaining meaningful consent and error states. Missing duration should lead with Unknown, rather than a prominent zero. This changes presentation, not permission scope or background behavior.
- Keep Explore collapsed after the main task. Retain all seven daily sections and existing detailed fields, the deletion safeguard, persistence/error feedback, backup behavior, experimental prediction restrictions and medical-advice disclaimer.
- The hormone guide remains optional and includes estrogen, progesterone and testosterone as schematic educational patterns, without personal levels or markers.

The interactive mock uses fictional data. Forms show representative fields and do not replace the existing schema or validation requirements. Its saved/connected indicators are sample states, not evidence of real persistence or a wearable connection. It demonstrates calendar/year selection, dated editing, symptom logging versus pinning, section reordering, history and sleep navigation. It does not implement or validate native continuous-list performance, encrypted saving or Health Connect.

Proposal source: `C:/Users/liamb/.codex/visualizations/2026/10/08/01a11caf-e281-7720-8db9-0ac41ed8a07b/cycle-layout-refinement.html`. Browser checks covered both variants, primary interactions and narrow wrapping. Approval came from the owner's explicit message, not a carousel selection.

## Acceptance after approval

1. A useful daily action or the current calendar appears in the first phone viewport; the first tab accurately names its contents. At large text sizes prioritize readable reflow over forcing everything above the fold.
2. A tap opens the requested view/form visibly. Date navigation, back/close, keyboard appearance and system Back preserve context. No nested competing vertical scroll area is introduced on phones.
3. Configuration is reachable but visually secondary. Logged symptoms stay visible, pins remain preferences, and section ordering survives locking/restarting/restoring.
4. Save failures and pending writes are visible near the active entry; never show a successful-save state before persistence succeeds.
5. Existing fields/features and approved appearance choices remain reachable. Verify 320 px, ordinary phone widths, desktop, Android text scaling, TalkBack and Flip5 folding separately from sample-browser checks.
