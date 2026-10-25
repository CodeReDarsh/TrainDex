# TrainDex frontend

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
- Sample photography is loaded from Unsplash and needs internet access. The user-supplied VCR OSD Mono font is bundled locally; font provenance is recorded in `public/fonts/README.md`. Imported logos and application icons are local assets.
- The manifest and icons provide install metadata; there is no service worker or complete offline PWA support.

Continue UI work here. The original ZIP remains an unchanged design checkpoint. Changes in this repository do not automatically sync to Figma Make. No deployment or backend integration is implied by the import.
