# TrainDex frontend

See [UI progress](../../ui-progress.md) for completed screens, remaining UI work, integration dependencies, and verification status.

Imported from the user's Figma Make `ui-update.zip` export on 2026-10-24. React 19, TypeScript, Vite 8, and Tailwind CSS 4. The pixel-art components, logo, icons, manifest, and sample interactions are retained. Figma-only preview/deployment plugins were replaced with a standard Vite configuration.

## Run locally

Use Node.js 22.12+ (Node 24 recommended) and pnpm.

```sh
cd apps/web
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:5173. The app opens on Capture. Use the sample photograph and the States menu to explore first/repeat encounters, uncertainty, timeouts, save failure, and empty collections.

```sh
pnpm typecheck
pnpm build
pnpm preview
```

For Vercel, set the project root to `apps/web`, build command to `pnpm build`, and output directory to `dist`. Navigation currently uses React state, not URL routes.

## Prototype boundaries

- Camera view and shutter use a sample photo. The photo picker accepts a real local image for preview.
- Recognition, authentication, and device/account saves are simulated. Cards live in React state; refreshing resets them. No connection to `apps/api` or the Python catalog is configured yet.
- Capture times and models in the sample scenarios are fixtures, not actual image analysis or EXIF extraction.
- Sample photography is loaded from Unsplash and needs internet access. The UI currently uses Courier New with Courier/monospace fallbacks. The user-supplied VCR font is retained in `public/fonts/` as a design asset but is not loaded. Imported logos and application icons are local assets.
- The manifest and icons provide install metadata; there is no service worker or complete offline PWA support.

Continue UI work here. The original ZIP remains an unchanged design checkpoint. Changes in this repository do not automatically sync to Figma Make. No deployment or backend integration is implied by the import.

## New prototype flows

- Settings and the guest save sheet use the same optional **Continue with Google (demo)** flow. The States menu selects success, cancellation, provider error, or session expiry. Successful sign-in returns to the preserved card; saving is a separate action.
- In signed-in Settings, **Add device cards to my account** offers an explicit import choice with per-card progress. Enable **One import item fails once** to preview partial failure and retry. Successful demo imports retain local copies and reuse encounter IDs.
- Check photo offers **Keep photo draft (demo)**. Home, Collection, and Settings link to the separate draft list. Open a draft to resume recognition or discard it with confirmation. Offline mode disables recognition and account save/import; it does not simulate offline AI.
- States includes no sign/non-train, unusable blur, upload failure, cancelled processing, collection/detail loading or error, and missing detail photo. Retry restores loading errors and missing-photo fixtures. Retake and replacing an unsaved photo ask before discarding work.
- Detail edits are staged until **Apply changes (demo)**. Leaving with unapplied edits asks for confirmation. Dialogs contain keyboard focus and support Escape; background controls are inactive while an overlay is open.

All account, import, photo-draft, and card state remains in memory. These screens do not implement OAuth, IndexedDB, cloud storage, OCR, APIs, synchronization, or a service worker. Reload discards demo progress. Real offline photo availability still requires local storage and packaged/cached assets.

## UI follow-up and regression checks

Photo inputs now decode before replacing current work. Preview/drafts have loading/error recovery; detail edits have applying/failure/retry feedback. Repeat recognition can inspect previous encounters without leaving the unsaved card, and uncertain results have a direct crop shortcut. Browser Back/Forward uses the same discard guards as app navigation; interrupted imports ask before stopping.

States adds **Next detail edit fails once**, **Photo preview state**, **Preview width** (320/375/480px), and **Text size** (100/150/200%). Width/text controls preview reflow; they do not emulate mobile hardware. Follow [the manual browser regression checklist](scripts/ui-regression.md) for repeatable checks and remaining device/accessibility testing.
