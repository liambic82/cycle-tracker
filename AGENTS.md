# Project collaboration

The owner has authorized routine development, version control, and project documentation. Commit and push completed, verified changes to the configured repository.

When the owner says that things look good, treat that as approval to continue to the next planned milestone. Do not stop solely to ask whether to proceed.

Maintain the distinction between implemented features, automated checks, and validation performed on real devices. Keep health records, signing credentials, and local build outputs out of Git.

Use `pnpm check` for domain/storage changes and `pnpm typecheck` plus the relevant production build and visual checks for layout changes. The Windows helper `scripts/pnpm.ps1` can use the bundled runtime when pnpm is not on PATH.
