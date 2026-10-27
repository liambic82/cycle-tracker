# Trifelle — approved identity and loading motion

## Approval and integration

The owner approved this concrete proposal on October 27, 2026: “Looks good. After you package that up and integrate it, go ahead and produce an iOS version of the app for testing.” Preview **0.22.0 / build 27** integrates this identity, the 2.4-second clockwise accent, reduced-motion fallback, native static launch marks and app/web icons. The [reproducible asset pack](../../../assets/brand/README.md) shares geometry with the runtime component. Existing identifiers, credentials, formats, layout and appearance choices are retained. Native OS launch screens stay static; no minimum display timer is introduced. [Validation](../../validation.md) and [iOS build/testing status](../../ios-testing.md) distinguish compilation from device evidence.

The original proposal and its review-only verification below are retained as design history; statements that integration is pending describe that earlier stage.

## Decision and scope

The owner selected **Trifelle** on October 27, 2026: “Trifelle works. With a clover logo. I like what you did with one leaf different.” They also requested an animated loading logo in which the difference moves around the leaves in a circle.

The name, clover concept and requested clockwise motion are the accepted direction. This proposal makes the exact geometry, colors and timing reviewable before app integration, as required by [AGENTS.md](../../../AGENTS.md): “Before implementing any beautification or customization options, present concrete visual proposals and the proposed options to the owner for approval.”

The app is still Cycle Tracker preview 0.21.0 / Android code 26. No native build, app rename or app loading-screen change is included in this proposal. Name selection is not trademark clearance, store publication approval or a 1.0 decision.

## Artwork and motion

- Four soft heart-shaped leaves, a small open center and a short curved stem, refined as vector paths from the earlier [plum-and-rose board](../branding-2026-10-27/01-cloverelle.png). This is original code-authored vector artwork; it is not a raster crop or a new generated image.
- The whole mark stays stationary. The contrasting leaf passes clockwise: **upper right → lower right → lower left → upper left → upper right**. The stem never participates in the color change.
- Proposed loop: **2.4 seconds**. Each leaf leads for 600 ms, with a 150 ms crossfade to the next. Briefly blending two neighboring leaves is intentional; there is no rotating shape, scaling, bounce or flash.
- Light: ivory `#FBF7F5`, plum leaves `#604054`, deeper rose accent `#C47D9E`. The rose is darker than the generated board to retain definition against ivory.
- Dark: plum surface `#261F28`, ivory leaves `#FBF7F5`, rose accent `#E4BACB`. A launcher tile can use the same light mark on warm plum `#604054`.
- The Trifelle wordmark uses the existing Georgia serif direction. “Opening your journal…” demonstrates loading context; no private record is exposed.
- Reduced motion holds the static upper-right accent. The system preference takes precedence over preview controls and updates when the preference changes. The animation must not create an artificial launch delay or imply a percentage complete.

## Review files

- [motion-preview.html](motion-preview.html): self-contained HTML fragment for the inline animated review. Local preview controls select System/Light/Dark, pause/resume and simulate reduced motion. These controls are not proposed app settings. No network resources are required by the fragment.
- [trifelle-mark.svg](trifelle-mark.svg): static light-surface master proposal with exactly the same geometry as the animated fragment. This is a review master, not a completed set of native icon/splash exports.

The inline copy shown in the conversation is identical to the tracked fragment. The visualization skill's `scripts/render.py` can wrap this fragment for standalone browser inspection.

## App integration after motion review

Use a shared vector component for static branding and in-app loading, with animation active only while work is pending and the screen is visible. Keep real operation labels, error/retry handling and current loading state; changing the indicator must not hide a failed or stalled operation. Respect React Native accessibility reduced-motion changes and stop animation on unmount/background. Static branding, launcher icons and report branding retain one fixed accent leaf.

The native OS launch screen precedes React Native. Start with the same static mark and matching surface, then show the animated component only if the app still has real work to do. Android 12+ supports an animated vector launch icon, but that requires a separate native drawable/configuration and release-build verification; the browser prototype does not validate it. Android recommends native icon animations of at most 1,000 ms. Any native animation must dismiss as soon as content is ready. See [Android splash-screen guidance](https://developer.android.com/develop/ui/views/launch/splash-screen) and [Expo splash-screen guidance](https://docs.expo.dev/versions/latest/sdk/splash-screen/). The iOS launch treatment remains part of the later iOS work.

The chosen identity can then replace user-facing welcome/unlock/header branding, launcher label/icons, web metadata and report branding within the [existing marketing implementation scope](../branding-2026-10-20/README.md#what-approval-would-cover). Preserve app IDs, signing identity, schemes, storage keys, backup formats, approved Calendar & journal layout and all user-selected appearance options. There is no timer to guarantee that a full accent loop is seen.

## Verification

- Fragment JavaScript syntax and referenced control IDs checked; literal HTML verified, with no escaped markup or external resources.
- Vector geometry rasterized for visual inspection: four distinct leaves, clockwise accent positions, stationary stem, light/dark/plum treatments. Those are design renders, not app screenshots.
- Animation keyframe offsets and crossfade timing checked directly from the fragment source.
- Documentation formatting, SVG XML, link targets and Git whitespace checked.
- Browser UI automation was unavailable in this session (browser inventory was empty); no browser interaction, responsive screenshot or system accessibility pass is claimed. The inline preview remains available for owner review.
- No application code changed, so application typecheck/build/domain tests were not rerun. No Android or iOS device validation is claimed.
