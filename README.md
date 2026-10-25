# TrainDex

**Spot a subway train. Scan its sign. Build your collection.**

TrainDex turns NYC subway sightings into collectible cards. Take a photo or choose one from your phone, and let Gemini find the route sign in the full photo. Save the encounter with its photo, browse your collection, and hatch a pixel pet for each route you discover.

[Open TrainDex](https://traindex.wiki/) · [Local setup](#run-locally) · [How recognition works](docs/recognition-hardening.md)

## What you can do

- **Scan real train signs.** Use your camera, photo library or the bundled sample gallery.
- **Collect individual sightings.** Every saved encounter gets its own card, including repeat sightings of the same route.
- **Keep cards on your device.** Saved cards and photos stay in the browser after a refresh through IndexedDB.
- **Explore the routes.** Browse current services, historical designations and other catalog references, with pixel pets and express forms.
- **Check live service.** See train counts and alerts from MTA feeds for supported active routes.

## How it works

1. Pick a photo. The full frame is used by default; you can optionally crop the sign.
2. Gemini reads the visible text, shape and colors.
3. The catalog returns candidate sign designs. Gemini compares available reference images before confirming a variant.
4. Review the result, add encounter details and save the card locally.

A readable route can still have an **Unknown sign variant**. Ambiguous results stay uncertain; a metadata match alone does not confirm a design. Sample cards are labeled and include photo credits.

## Project status

TrainDex is a working browser prototype under active development. Live recognition and durable device cards are implemented. Google sign-in, account saves and import screens are demos; cloud sync and durable server-side capture jobs are not implemented. Unsaved photos remain in the current session. Real-phone testing and broader recognition evaluation are still in progress.

The public site may lag the latest code in this repository. See [the implementation checklist](backend-implementation-todo.md) for remaining work.

## Run locally

You need **Node.js 22.12+**, **Python 3.12+**, and a **Gemini API key**. Use PostgreSQL for the full database setup, or the isolated SQLite option below for local development.

### 1. Install dependencies

```bash
npm --prefix apps/api ci
cd apps/web
corepack pnpm install --frozen-lockfile
cd ../..
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env
```

Set `GEMINI_API_KEY` in the root `.env`. Keep it server-side. Set `SIGNS_API_URL=http://127.0.0.1:8001` to connect the catalog started below.

### 2. Prepare a local catalog

For a fresh local SQLite database, set this in `.env`:

```dotenv
DATABASE_URL=sqlite:///data/traindex.db
```

Then migrate and load the bundled catalog:

```bash
alembic upgrade head
python -m scripts.import_data data/processed/catalog.json
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

For PostgreSQL, follow the [catalog setup guide](docs/catalog-guide.md#installation-and-postgresql-setup). Use an existing database's configuration when applicable.

### 3. Start the API and website

In separate terminals, from the repository root:

```bash
npm --prefix apps/api run dev
```

```bash
npm --prefix apps/web run dev
```

Open **[localhost:5173](http://localhost:5173)**. The website forwards `/v1` requests to the API on port 3000. Without the catalog, Gemini can still read routes, but sign variants remain Unknown.

For a phone on the same network, run `npm --prefix apps/web run phone` and use the printed network URL. Camera access requires HTTPS; the local development certificate may need to be trusted on the phone. The published HTTPS site avoids that local setup.

## Inside the repo

| Path             | Purpose                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| `apps/web`       | React, TypeScript and Vite app: capture, cards, collection and pixel pets |
| `apps/api`       | Fastify API: Gemini recognition, image validation and live MTA status     |
| `app`, `alembic` | Internal FastAPI catalog, database models and migrations                  |
| `data`           | Curated catalog, reference artwork and attribution                        |
| `shared`         | Route groups shared by the app and API                                    |
| `apps/landing`   | Standalone promotional website                                            |

## Checks

```bash
npm --prefix apps/api run typecheck
npm --prefix apps/api test
npm --prefix apps/web run typecheck
npm --prefix apps/web run build
node apps/web/scripts/crop-gesture.test.mjs
node apps/web/scripts/photo-upload.test.mjs
node apps/web/scripts/recognition-result.test.mjs
python -m pytest -q
```

API tests use mocked providers and feeds. They do not measure real-photo recognition accuracy. See the [browser regression checklist](apps/web/scripts/ui-regression.md) for manual checks.

## Data and credits

The catalog combines photographed sign records with reconstructed reference artwork from the NYC Subway Bullets project. Reconstructed artwork is labeled as such. Photos and reference assets retain their original licenses and attribution; see [data notices](data/NOTICE.md), [sample photo credits](apps/web/public/samples/README.md) and the [catalog guide](docs/catalog-guide.md).

Code is licensed under [MIT](LICENSE). TrainDex is an independent project and is not affiliated with the MTA.
