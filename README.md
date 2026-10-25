# TrainDex — NYC subway rollsign reference backend

An evidence-based reference catalog for a future train-spotting Dex. The reference backend contains PostgreSQL storage, reproducible imports, FastAPI access, and feature-based candidate retrieval. The independent marketing website lives alongside the backend in `apps/landing`.

## Advertisement website

The one-page TrainDex landing page is in [`apps/landing`](apps/landing/README.md), separate from the API. It introduces the app and includes an illustrative phone preview and interactive bullet gallery. No build or dependency installation is needed.

Private review link: <https://traindex-field-guide.orangemule18.chatgpt.site>.

```bash
python3 -m http.server 5173 --bind 127.0.0.1 --directory apps/landing/dist
```

Open <http://127.0.0.1:5173>. Edit `apps/landing/dist/index.html`, `styles.css`, and `script.js`. The advertisement and API can be deployed independently from this same repository.

The fixed catalog includes **all 647 listings / 275 unique graphics** on the [NYC Subway Bullets specimen website](https://nyumathclinic.github.io/nyc-subway-bullets-font/specimen/), across eight sections. The populated database also retains 48 photographic design records with 92 reference photographs. The website graphics remain explicitly labeled reconstructed reference candidates. See the exact [website coverage audit](reports/specimen-coverage.md), [overall coverage](reports/coverage.md), and [research notes](docs/research.md).

## Fixed specimen database

The complete, portable website-only seed is **`data/processed/specimen_catalog.json`**. It contains the 275 unique graphics, all 647 section/key memberships, source metadata, colors, shape, typography/style labels, reference URLs and checksums. Normal application operation does not scrape the website or call Gemini.

```bash
alembic upgrade head
python -m scripts.import_data data/processed/specimen_catalog.json
python -m scripts.audit_specimen
```

The default `data/processed/catalog.json` additionally retains the photographic catalog, for 323 total entries. Existing data is preserved when importing the website-only seed. Repeated imports do not duplicate graphics or section memberships.

| Section ID | Website section | Listings |
|---|---|---:|
| std | Standard | 106 |
| helv | Helvetica | 57 |
| nycta | NYCTA | 52 |
| r62a | R62A | 18 |
| r32 | R32 | 36 |
| retired | Retired | 99 |
| legacy | Legacy | 4 |
| all | All | 275 |

Some graphics occur in several sections; `specimen_entries` links each original key and code point to one stable `sign_id`. `specimen_sets` preserves style-family names and font filenames. Every source listing has its original description, service label, filename, ordering, and `listing_status` (`listed`, `unassigned`, `proposed`, or `blank`). A style-set name does not automatically establish physical train compatibility.

```bash
curl 'http://127.0.0.1:8000/specimen-sets'
curl 'http://127.0.0.1:8000/specimen-entries?set_id=r62a&key=6d'
curl 'http://127.0.0.1:8000/specimen-sets/all/signs?limit=100'
curl 'http://127.0.0.1:8000/signs?specimen_set=helv&route_id=6'
curl -X POST 'http://127.0.0.1:8000/signs/match' \
  -H 'Content-Type: application/json' \
  -d '{"route":"6","shape":"diamond","specimen_set":"r62a"}'
```

Sign responses expose `reference_kind`, `style_families`, `specimen_entries`, and `feature_provenance`. Matching includes artwork by default; set `include_artwork=false` to search only physical design records. `specimen_set` selects a website style family. It is separate from `train_model` and equipment evidence.

All 275 artwork backgrounds and 273 foregrounds have sourced HEX values; the two blank bullets have no foreground character. Fonts declared in the SVG are recorded for 44 graphics. Other glyphs are outlines without an exact font declaration; their website style families remain available. SVG font declarations describe how the reconstruction was authored, not a verified typeface used on a manufactured train sign. Matching therefore treats artwork font declarations and physical technology as uncertain evidence. Approximate photographic color/style descriptors are labeled `visual_estimate` and receive half feature weight.

The checked-in curated files are `data/curated/artwork_patterns.json` and `data/curated/specimen_entries.json`. Rebuild both full and website-only import bundles offline:

```bash
python -m scripts.build_catalog
python -m scripts.build_catalog --specimen-only --output data/processed/specimen_catalog.json
```

`data/raw/specimen_inventory.json` retains every source listing and the source page checksum. To deliberately refresh the website audit, download the HTML and run `python -m scripts.import_specimen --page /path/to/specimen.html`; the script fails if the website and pinned TSV mappings disagree. No source change is silently converted to a verified physical design. Licensed original SVGs and their per-file attribution/checksums are retained in `data/raw/svg/` and `data/raw/svg-index.json`; the local development database also links checked copies under `data/references/artwork/`.

## Architecture and schema

Python 3.12+, SQLAlchemy 2, Alembic, Pydantic 2, FastAPI, and PostgreSQL 17. SQLite is available for deterministic tests and offline development; PostgreSQL is the production target. All requested endpoints are implemented. The initial migrations have been executed against PostgreSQL 17.6.

```mermaid
erDiagram
    ROUTE_GROUPS ||--o{ ROUTES : classifies
    ROUTES o|--o{ SIGN_DESIGNS : identifies
    ROUTES ||--o{ ROUTE_GROUP_HISTORY : preserves
    SIGN_DESIGNS ||--o{ REFERENCE_IMAGES : illustrates
    SIGN_DESIGNS ||--o{ SIGN_OBSERVATIONS : observed
    SIGN_DESIGNS ||--o{ SIGN_SOURCES : supports
    SOURCES ||--o{ SIGN_SOURCES : documents
    SIGN_DESIGNS ||--o{ SIGN_EQUIPMENT : compatible
    TRAIN_MODELS ||--o{ SIGN_EQUIPMENT : equipment
    SOURCES ||--o{ REFERENCE_IMAGES : attributes
    SIGN_DESIGNS ||--o{ REVIEW_ISSUES : flags
```

| Table | Responsibility |
|---|---|
| `sign_designs` | Stable `sign_id` and unique curated `identity_key`; displayed text, shape, physical colors, typography, proportions, border, layout, aspect ratio, technology, service type, family, era, dates, features, verification, timestamps, and sourced category overrides |
| `routes` | Route designation, current status, current classification group, order, description, source |
| `route_groups` | Stable classification identifiers and sourced official digital colors; distinct operational classifications can share a color |
| `route_group_history` | Sourced historical route/group relationships with optional documented dates; initially empty |
| `train_models` | Sourced equipment identity, division, manufacturer, years, status, description |
| `sign_equipment` | Many-to-many compatibility, evidence source, verification, notes |
| `reference_images` | Multiple photographs/artworks per design; relative file path or remote-only metadata, type, perspective, dimensions, SHA-256, licensing and attribution |
| `sources` / `sign_sources` | Reusable citations, source type, access date, and per-sign evidence claims |
| `sign_observations` | Actual sign settings; separate from design identity and scheduled operating service |
| `review_issues` | Conflicting or incomplete evidence; exposed in sign responses |
| `specimen_sets` / `specimen_entries` | Eight website sections and all 647 aliases/memberships linked to 275 unique graphics |

Foreign keys prevent orphan records; composite foreign keys ensure an observation's image belongs to the same design. Unique keys prevent duplicate source URLs, design identities, repeated sign/equipment pairs, and repeated sign/image-source pairs. Enums, dates, positive dimensions, and override evidence have constraints. Pydantic additionally validates HEX syntax and import fields. Files stay outside PostgreSQL.

## Installation and PostgreSQL setup

Install Python 3.12+ and Docker Compose. The development run used Python 3.13.4.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env
```

Edit `.env`: choose a local `POSTGRES_PASSWORD` and use the same password in `DATABASE_URL`. URL-encode special characters in the connection URL. `.env` is ignored by Git. For the exact tested dependency set, install `requirements.lock.txt` before installing this project with `python -m pip install -e . --no-deps`.

```bash
docker compose up -d --wait db
alembic upgrade head
alembic check
python -m scripts.import_data
python -m scripts.validate_signs
python -m scripts.generate_coverage_report
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

OpenAPI: <http://127.0.0.1:8000/docs> and <http://127.0.0.1:8000/openapi.json>. The app does not create tables or import data on startup: migrations and imports are explicit.

This workspace was also populated in an isolated PostgreSQL 17.6 cluster at `127.0.0.1:55432`, database `traindex`, local development role `traindex`. Its files are in `/tmp/traindex-pgdata`, so it is temporary and is not the Docker-managed database. No system PostgreSQL installation was required. To inspect that database during this session:

```bash
DATABASE_URL=postgresql+psycopg://traindex@127.0.0.1:55432/traindex \
  uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Environment configuration

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | SQLAlchemy URL, normally `postgresql+psycopg://...` |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Docker Compose database configuration |
| `REFERENCE_ROOT` | Local image root; default `data/references` |
| `MATCH_COLOR_DELTA_E` | Positive Gaussian scale for CIELAB color similarity; default 35 |
| `MATCH_MAX_CANDIDATES` | Maximum designs scored per request; default 5,000; response reports truncation |

For offline experimentation, set `DATABASE_URL=sqlite:///data/traindex.db`, migrate, then run the same imports. SQLite foreign keys are enabled. This does not replace PostgreSQL integration verification.

## Reproducible data collection and imports

The retained reviewed seed imports without network access or downloaded images:

```bash
python -m scripts.import_data data/processed/catalog.json
```

Imports are transactional and repeatable. Stable keys are reused, unknown incoming values preserve existing enrichment, and conflicting non-null values fail with an explanation. Run imports serially. Apply a deliberately reviewed update with `--allow-updates`; substantive conflicting sign changes create persistent review issues. Changing a design identity is a curation decision, not a photograph import operation.

To rebuild the seed from retained snapshots:

```bash
python -m scripts.build_catalog
```

To fetch public source snapshots and optionally download the allowlisted, freely licensed original photos:

```bash
python -m scripts.collect_sources
python -m scripts.collect_sources --download-images
python -m scripts.build_catalog --include-local-files --output data/processed/catalog.local.json
python -m scripts.import_data data/processed/catalog.local.json --sections reference_images --allow-updates
```

The collector pins the font repository to commit `1d2a6b05bf5ea7ec43c6ed608d1eb739f16089e4`; it records source URLs, retrieval times, checksums, and original per-file metadata. It waits between image requests and leaves successfully downloaded files intact if an upstream request fails. Respect a rate-limit response and resume later. `--refresh` re-fetches mutable source data and requires reviewing the rebuilt catalog before import. There is no automatic promotion from the artwork review queue into production designs.

| Script (`python -m scripts.<name>`) | Sections / action |
|---|---|
| `import_sources` | Source records |
| `import_routes` | Groups, routes, and historical relationships |
| `import_train_models` | Equipment metadata |
| `import_signs` | Designs, evidence, review issues |
| `import_equipment` | Sourced compatibility relationships |
| `import_reference_images` | Reference metadata; local files must exist and pass SHA-256 validation |
| `import_observations` | Photograph observations |
| `validate_signs` | Integrity errors, incomplete evidence, unknown classification, missing or modified files |
| `deduplicate_signs` | Advisory potential-duplicate report; never merges designs automatically |
| `generate_coverage_report` | Database-derived Markdown and JSON reports; `--output` selects directory |

Section scripts accept a bundle filename, `--sections`, and `--allow-updates`. Import sources and parent records before dependent sections. The combined importer handles the dependency order automatically and rejects verified designs without a verified supporting claim.

`data/raw/` retains source metadata and curation decisions. `data/raw/downloads/` keeps larger original downloads locally. `data/processed/catalog.json` is the portable normalized seed. `data/processed/artwork_review_queue.json` is staged reconstruction metadata. `data/references/commons/<page_id>.jpg` contains licensed original assets locally and is excluded from Git. Paths cannot escape the configured reference root. The default seed contains remote metadata so a fresh checkout can import without those files; locally attached references are an optional enrichment.

## API

List endpoints return `{items, total, limit, offset}` with `1 <= limit <= 200` and `offset >= 0`. Matching/search return ranked candidates, with a limit of 100. Missing parents return 404, invalid requests 422, and database failures 503 without SQL diagnostics or credentials.

| Method | Path | Behavior |
|---|---|---|
| GET | `/signs` | Paginated designs; filters: `route_id`, `shape`, `sign_technology`, `verification_status`, `color_group_id`, `train_model` |
| GET | `/signs/search` | Scalar feature query parameters; same retrieval logic as matching |
| GET | `/signs/{sign_id}` | Complete design, classification, references, evidence, compatibility and review issues |
| POST | `/signs/match` | Validated extracted features and configurable matching options |
| GET | `/routes`, `/route-groups` | Classification metadata |
| GET | `/routes/{route_id}/signs` | Designs associated with that route |
| GET | `/train-models` | Equipment metadata |
| GET | `/train-models/{train_model_id}/signs` | Documented equipment associations; inspect link verification before treating as confirmed |
| GET | `/signs/{sign_id}/references` | Paginated image metadata |
| GET | `/sources` | Paginated source records |
| GET | `/health` | Database connectivity and migration-table availability |
| GET | `/stats` | Current database coverage |

```bash
curl 'http://127.0.0.1:8000/signs?route_id=6&limit=10'
curl 'http://127.0.0.1:8000/signs/IRT_6_GREEN_CIRCLE_END'
curl 'http://127.0.0.1:8000/signs/search?route=6&shape=diamond'
curl -X POST 'http://127.0.0.1:8000/signs/match' \
  -H 'Content-Type: application/json' \
  -d '{"route":"6","shape":"diamond","train_model":"R62A","background_color":"#00933C"}'
```

The last request ranks candidates across the available physical and artwork references. Use `include_artwork=false` to restrict it to photographed designs, or `specimen_set` to select a website family. Exact manufacturing colors remain unknown; photographic swatches are explicitly labeled estimates, while artwork colors come from the SVG declarations.

## Matching behavior and future Gemini integration

Another developer can submit Gemini's extracted JSON directly to `POST /signs/match` after mapping its vocabulary to the OpenAPI enums. No Gemini credentials or calls are needed here. Ignore unknown extra vision fields or transform them before submission: the endpoint deliberately rejects unexpected keys. Use `null` for unknown colors, typefaces, or technology. Do not substitute route-group color for the observed sign's color.

Accepted features are `route` (displayed character or route ID), `shape`, `background_color`, `foreground_color`, `font_family`, `font_variant`, `layout`, `sign_technology`, `train_model`, `historical_era`, and `service_type`.

```json
{
  "route": "6",
  "shape": "diamond",
  "train_model": "R62A",
  "font_family": null,
  "confidence": {"route": 0.95, "shape": 0.8, "train_model": 0.4},
  "weights": {"route": 5, "shape": 3, "train_model": 1},
  "strict_route": true,
  "min_score": 0.25,
  "limit": 5
}
```

Omitted weights retain their defaults. Default weights: route 5, shape 3, background 2, foreground 1, typeface 2, font variant 2, layout 2, technology 2, equipment 1, historical era 1, service type 1. Confidence values must be between 0 and 1 and multiply these weights. Confidence below 0.8 disables hard route exclusion; use `strict_route=false` when several route readings remain plausible. An empty query, unknown-only query, or query with all supplied features disabled returns 422.

Reference colors are converted from sRGB to CIELAB under D65. ΔE76 is converted to a Gaussian similarity using a configurable scale; stored HEX values remain unchanged. Categorical attributes use normalized exact comparison. Unknown reference attributes are excluded from the score denominator. Equipment adds support only for a verified matching association; absence is unknown, never a confirmed incompatibility. No candidates with zero positive evidence are returned.

Responses include `similarity_score`, `evidence_coverage`, matching/conflicting/uncertain features, per-feature explanations, classification, reference images, and full design details. Unknown fields can leave a high similarity score based on little evidence, so inspect **both score and coverage**. These scores are heuristics, not probabilities. A zero score threshold is intentionally permissive for candidate retrieval; the future application must choose an abstention policy using validated photograph evaluations. No scientifically calibrated accuracy is claimed.

For scale, route candidates are filtered in SQL and the number scored is bounded. `candidates_available`, `candidates_considered`, and `truncated` expose that bound. The initial implementation uses deterministic ordering; a large corpus should add a measured SQL pre-ranking stage before raising the cap. It currently compares scalar extracted features, not embeddings or image pixels.

## Classification contract

Every sign response exposes `sign_id`, `route_id`, `color_group_id`, `dex_category`, `service_status`, `display_name`, `display_order`, `requires_manual_review`, and reasons under `classification`.

- Active route → `active`; discontinued/historical route → `not_in_service`.
- Historical design on a current route stays under the active route. Equipment retirement does not change this.
- Physical sign colors do not determine classification: the brown diamond R remains in current R's yellow group.
- Unknown route/status leaves the category null and requests review. Unused 10/13 signs are not called discontinued routes.
- A category override requires a source and reason. The API still exposes the underlying route status.
- Canarsie (`gray`) and the shuttle designation (`shuttle_gray`) have separate identifiers even though the current official color matches. S is explicitly an umbrella designation, not a claim that all three shuttle services are one operational line.
- `historical_jfk` preserves a separate historical classification without inventing a precise historical HEX value.

The nine familiar group identifiers are supported. Their current official digital HEX values differ from the prompt's preliminary historical values; see [research notes](docs/research.md). Historical group relationships are supported by the schema and importer, but no unsupported dated history rows were seeded.

## Testing and verification

```bash
python -m pytest -q
ruff check app scripts tests
ruff format --check app scripts tests alembic
```

To run the entire suite against PostgreSQL, create **two disposable, empty test databases** and set:

```bash
TEST_BACKEND_URL=postgresql+psycopg://USER:PASSWORD@localhost/traindex_tests \
TEST_DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost/traindex_migrations \
  python -m pytest -q
```

`TEST_BACKEND_URL` is recreated by test fixtures; `TEST_DATABASE_URL` is upgraded, downgraded, and upgraded by migration tests. Never point either at your populated catalog. Without these variables, tests use temporary SQLite databases and explicitly skip the PostgreSQL migration test. Synthetic test designs live only in `tests/` and cannot be imported as production seeds. The suite covers relationships, constraints, migration round trips, import failures and rollback, attribution and files, classification, ranking, perceptual colors, uncertain features, pagination, serialization, and actual seed-data curation invariants.

## Limits and remaining research

The catalog is small and mostly contains side rollsigns. Front/rear identification coverage is especially limited. It does not yet establish a manufacturer-level taxonomy of typography or every physical rollsign generation. Photographic verification means the source supports the visible design and listed claims; it does not verify manufacture dates, original paint values, scheduled operating service, or every equipment variant.

Exact physical font families and sign validity dates remain unknown. Forty-three physical records have approximate photographic color swatches, explicitly separated from manufacturer specifications by `feature_provenance`. The website graphics have source SVG colors and style-family labels. Most equipment manufacturer/year/status fields remain unknown because the official car inventory has conflicting records. R32 metadata uses a separate official retirement announcement. R211A/R211T are represented explicitly rather than creating an unsupported generic R211 design association.

Unused-number, special, historical H/T and film-prop records retain review flags where route identity is uncertain. One hybrid 7 display requires LED/LCD subtype review. Historical route classifications use a clearly labeled community history source. Observation timestamps remain null where only date-only, ambiguous, or timezone-free descriptions are available; original date text is preserved. Historical operational route reuse, such as different K services, needs additional route-identity research.

The website is the bounded reference scope; it is not a census of every physical sign ever manufactured. Proposed/unassigned graphics remain labeled candidates, and no reconstruction is labeled an authentic photograph. The backend retrieves metadata candidates; visual comparison of the user's photo with candidate images still needs Gemini integration and evaluation on held-out photos. No accuracy guarantee is claimed. The backend does not call Gemini, expose image uploads, serve local image files, implement authentication, or deploy publicly. Reference `file_path` values are backend-relative; consumers can use `source_url` or add an asset-serving layer later. SVG references will need suitable raster previews for a vision API that does not accept SVG input.

Code remains under [MIT](LICENSE). Data and photographs retain their original terms and attribution; see [data notices](data/NOTICE.md). This project is not affiliated with the MTA.
