# Approved built-in backgrounds — October 9, 2026

**Status: all twelve images and six named palettes approved by the owner on October 9, 2026:** “Looks good, these are approved.” Bundled unchanged in preview 0.13.0. These extend the original Plum, Sage, and Ocean choices.

The artwork was generated with the built-in `image_gen` tool. Exact prompts, names, and identifiers are in [prompts.json](prompts.json). The PNG masters below are saved unchanged from generation. The app includes exact copies in `assets/backgrounds/`, verified against the SHA-256 manifest. They work offline in the installed app and introduce no image-hosting requirement.

## Review pairs

### Buttercup Morning — yellow

| A — Meadow Light                                                          | B — Sunlit Petals                                                           |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| ![Buttercup Morning: Meadow Light](buttercup-morning-01-meadow-light.png) | ![Buttercup Morning: Sunlit Petals](buttercup-morning-02-sunlit-petals.png) |

### Apricot Blossom — orange

| A — Orchard Bloom                                                       | B — Apricot Dawn                                                      |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| ![Apricot Blossom: Orchard Bloom](apricot-blossom-01-orchard-bloom.png) | ![Apricot Blossom: Apricot Dawn](apricot-blossom-02-apricot-dawn.png) |

### Lavender Haze — lavender

| A — Lavender Whisper                                                      | B — Lilac Dusk                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| ![Lavender Haze: Lavender Whisper](lavender-haze-01-lavender-whisper.png) | ![Lavender Haze: Lilac Dusk](lavender-haze-02-lilac-dusk.png) |

### Rosewater — pink

| A — Petal Ripples                                           | B — Garden Reverie                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| ![Rosewater: Petal Ripples](rosewater-01-petal-ripples.png) | ![Rosewater: Garden Reverie](rosewater-02-garden-reverie.png) |

### Bluebell Mist — pastel blue

| A — Bluebell Garden                                                     | B — Morning Dew                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| ![Bluebell Mist: Bluebell Garden](bluebell-mist-01-bluebell-garden.png) | ![Bluebell Mist: Morning Dew](bluebell-mist-02-morning-dew.png) |

### Silver Moon — light charcoal

| A — Moonlit Magnolia                                                  | B — Moonveil                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------- |
| ![Silver Moon: Moonlit Magnolia](silver-moon-01-moonlit-magnolia.png) | ![Silver Moon: Moonveil](silver-moon-02-moonveil.png) |

## Design and implementation notes

- Each palette pairs two distinct compositions within a soft painted style. The images have subdued central areas and stronger detail toward the edges, leaving room for opaque journal surfaces.
- The owner approved the palette names and both images in every pair. All twelve are included; users can choose either image and pair it with any palette.
- These are square masters with centered cover cropping in the app. Browser checks cover phone and desktop sizing, image visibility, and light/dark reading surfaces. Native cropping, larger text, folding and performance remain device checks.
- Keep text and records on opaque surfaces and keep flow/spotting/no-flow/unlogged meanings independent of the decorative palette. Built-in artwork does not replace Plain, Soft wash, or the proposed personal-image option.
- The generation/review step did not change the app. Following approval, preview 0.13.0 bundles unchanged copies and adds appearance controls. Optimized derivatives and personal-photo selection are not part of this first implementation.
- Visual inspection confirmed all twelve outputs are present, fit their requested color families, contain no interface or lettering, and provide two visually distinct options per palette. Image dimensions and integrity are recorded in [assets.json](assets.json). This does not claim native-device or accessibility validation.

Related: [appearance proposal](../appearance-proposal.md), [development roadmap](../../development-plan.md).
