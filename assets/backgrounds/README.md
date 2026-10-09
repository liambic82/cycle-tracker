# Approved bundled artwork

These twelve PNGs are unchanged copies of the owner-approved images in
`docs/design/backgrounds/`. Approval: October 9, 2026, “Looks good, these are approved.”

Names, generation prompts, dimensions and SHA-256 values are kept in the design
directory. `tests/appearance.test.ts` verifies the bundled copies against that manifest.
`src/ui/backgroundAssets.ts` uses static requires so all images are available offline
in installed apps. They add approximately 26 MiB of source artwork to the preview.

The original approved image files remain the review source. No external image service,
hosting, photo-library access, or health data is involved.
