# Implementation status — October 24, 2026

The fixed website reference database is implemented and populated. It contains every listing on the retained [specimen page](https://nyumathclinic.github.io/nyc-subway-bullets-font/specimen/).

- **275 unique website graphics**, deduplicated across **647 listings in eight sections**.
- **Zero missing, unexpected, or mismatched listings** in the database audit; see [website coverage](specimen-coverage.md).
- All original keys, code points, descriptions, service labels, set memberships, filenames, source credits and checksums retained.
- Colors recorded for all 275 backgrounds and 273 foregrounds; the two blank graphics have no foreground character. SVG font declarations are present for 44 graphics; all graphics retain named style families.
- Proposed, unassigned and blank labels are preserved. Artwork candidates are distinct from physical photographs, actual equipment compatibility and manufacturer specifications.
- The prior photographic catalog is retained: 48 design records, 92 photo references, 37 photographically verified designs and 11 candidates. There are 323 total catalog entries, 27 routes, 11 route groups, 19 train models, 373 sources and 367 reference-image records.
- All 158 files in the Commons snapshot have a review disposition: 92 photographic references, five excluded photos, and 61 archival graphics recorded for review.
- **78 tests passed against PostgreSQL 17.6**, including migration round trips, exact source coverage, duplicate prevention, API retrieval and matching. Ruff lint/format checks pass. One installed Starlette/HTTPX deprecation warning remains.

## Reproducible artifacts

`data/processed/specimen_catalog.json` is the complete, standalone website-only seed. `data/processed/catalog.json` additionally retains the photographic designs. Normal imports need no network access. `scripts/import_specimen.py` verifies source HTML against pinned TSV mappings; `scripts/audit_specimen.py` audits actual database contents. The source HTML checksum, complete mapping and pinned repository commit are retained in `data/raw/specimen_inventory.json`.

Schema migrations include per-feature provenance and normalized specimen-set memberships. SQLAlchemy, Pydantic, Alembic, FastAPI and PostgreSQL remain the backend stack. API additions expose `/specimen-sets`, `/specimen-entries`, `/specimen-sets/{set_id}/signs`, and a `specimen_set` filter for listing and matching.

All 275 original SVGs are retained under `data/raw/svg/`, with local copies under `data/references/artwork/` linked by SHA-256. Source SVGs retain their original licenses. Large original photo collections and local image copies remain excluded from Git. Fifteen original photo files are linked locally; additional photos retain source URLs and research previews.

## Practical limits

This is complete coverage of the specified website, not a census of every physical sign ever manufactured. Approximate photographic colors are labeled and receive reduced matching weight. SVG font declarations describe the reconstructed artwork and are not asserted as original physical train typefaces. Exact manufacturing dates, most equipment details and some historical identities remain unknown.

The backend retrieves and explains candidates. Gemini calls, image uploads and visual reranking are not implemented. Identification accuracy still requires evaluation on held-out user-style photographs; no calibration or accuracy guarantee is claimed. SVG artwork may need raster previews before use with a vision API.

Docker was unavailable, so Compose itself was not executed. Real migrations, imports and tests used temporary native PostgreSQL 17.6 on localhost port 55432 (`traindex` database, cluster files at `/tmp/traindex-pgdata`). Use the README's Compose/migration/import commands for a durable setup. No frontend, accounts, collections or public deployment were added.
