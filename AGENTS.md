# Project collaboration

The owner has authorized routine development, version control, and project documentation. Commit and push completed, verified changes to the configured repository.

When the owner says that things look good, treat that as approval to continue to the next planned milestone. Do not stop solely to ask whether to proceed.

Before implementing any beautification or customization options, present concrete visual proposals and the proposed options to the owner for approval. Wait for approval of those proposals before changing the app. General approval to continue development does not replace this design approval; positive feedback on a presented proposal approves that proposal's scope.

Maintain the distinction between implemented features, automated checks, and validation performed on real devices. Keep health records, signing credentials, and local build outputs out of Git.

For future testing APK handoffs, read the owner's preferred folder from the ignored local file `.tools/android-preview-destination.json` (`directory`). Copy the verified, versioned testing APK there and verify the destination SHA-256, retaining the build copy under `artifacts/`. Do not overwrite a different existing file. If the destination is unavailable, report that and provide the retained local build. Keep the personal path in local configuration; never copy signing credentials or health records with an APK.

The owner declined independent prediction review on October 12, 2026. Use assistant-led statistical review and an explicit in-app medical-advice disclaimer. Do not make external clinical/statistical sign-off a project gate or describe the internal review as independent or clinical validation. Keep prediction claims proportionate to the evidence.

Use `pnpm check` for domain/storage changes and `pnpm typecheck` plus the relevant production build and visual checks for layout changes. The Windows helper `scripts/pnpm.ps1` can use the bundled runtime when pnpm is not on PATH.
