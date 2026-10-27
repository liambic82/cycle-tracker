# Trifelle application assets

The owner approved the [Trifelle clover and motion proposal](../../docs/design/trifelle-2026-10-27/README.md) on October 27, 2026 and requested integration followed by an iOS test version.

`src/brand/trifelle.ts` is the shared vector geometry/color source. `pnpm assets:brand` reproducibly exports these PNG/SVG assets and the web icons using the development-only Sharp dependency. The artwork is code-authored vector work derived from the approved clover direction, not a crop of a generated board.

- `icon`: opaque 1024-pixel plum tile; no baked-in rounded corners. Used for iOS and legacy Android icons.
- `adaptive-foreground`: transparent Android layer with the mark inside the central safe area; plum background is configured separately.
- `monochrome`: white silhouette for Android themed icons. Color accents cannot carry through a monochrome system treatment.
- `notification.png`: transparent white notification silhouette.
- `splash-light` / `splash-dark`: transparent launch marks; matching native background colors are configured in `app.json`.
- Web PNGs at 192, 512, 180 and 48 pixels are under `public/`, alongside the scalable icon.

The native OS launch mark is static. `TrifelleLogo` animates the accent clockwise only during genuine in-app loading, pauses when backgrounded and honors Reduce Motion. Static uses hold the upper-right accent. No launch-delay timer is added.

Builds, screenshots and packaged binaries belong under ignored `artifacts/`; keep source assets here. App identifiers, URL schemes, signing keys, storage keys and encrypted backup identifiers retain their established names for compatibility.
