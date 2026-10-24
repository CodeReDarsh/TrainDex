# Implementation status — October 24, 2026

The backend baseline is implemented and populated. This is not a completed census of every NYC subway sign design.

| Phase | Actual result |
|---|---|
| Workspace and architecture | Original workspace contained README, MIT license, and Git metadata; no existing backend, dependencies or AGENTS.md. Backend added without frontend components. Eleven domain tables separate design, route classification, equipment, observations, references, evidence and review issues. |
| Infrastructure | PostgreSQL 17 Compose configuration, SQLAlchemy models, indexes, constraints, explicit Alembic migration and standalone PostgreSQL DDL in `docs/schema.sql`. Upgrade/downgrade/upgrade and schema parity checked against PostgreSQL 17.6. |
| Research | Official MTA colors, route listing, rolling-stock inventory, R32 retirement announcement, Commons photographs, actual pinned font-repository mappings and licensing inspected. Research and conflicts recorded in `docs/research.md`. |
| Collection and import | 15 real photographic designs imported, including 13 verified and 2 candidates; 15 references and observations, 9 evidenced equipment links, 20 sources. Importing the same bundle again does not create duplicates or erase local reference enrichment. |
| Classification | 27 route designations and 11 groups. Brown R stays under active yellow R; K/V/JFK are Not in Service. Unused 10/13 remain unassigned and flagged. Three designs require review, including the hybrid 7 technology subtype. |
| Matching | Partial features, confidence and weights, CIELAB ΔE76 colors, route filtering, non-exclusive equipment support, uncertainty/conflict explanations, evidence coverage and explicit candidate truncation. No accuracy or probability calibration claim. |
| API | All 13 requested endpoint paths implemented with OpenAPI, validated requests, typed design/list/match responses, bounded pagination, 404/422/503 handling. Live endpoint results in `api-smoke.json`. |
| Tests and documentation | Full PostgreSQL suite: **69 passed**. SQLite run: **68 passed, 1 PostgreSQL-specific test skipped**. Ruff lint and formatting checks passed. README, source/licensing notices, coverage JSON/Markdown, research and schema documentation supplied. |

## Actual database coverage

- 15 distinct curated designs: 13 photographically verified, 2 candidates.
- 15 authentic photographic references, all attached to checked local original files.
- 27 route designations, including 23 current designations and four former designations.
- 16 inventory model identifiers; nine verified design/equipment links across five models.
- 20 sources; no manufactured sign has been fabricated from a reconstruction.
- 3 Not in Service designs; 5 historical designs, including historical variants of active routes.
- 275 distinct reconstructed artwork filenames staged for review; zero automatically promoted into production design counts.
- Zero potential design duplicates found by the advisory metadata check. This does not prove there are no undiscovered duplicates.

Detailed route/group/technology/equipment breakdowns and remaining review IDs are in `coverage.md` and `coverage.json`. Reference photograph counts are separate from design counts.

## Environment and outstanding work

Docker was unavailable in this workspace, so Docker Compose itself was not executed. A temporary native PostgreSQL 17.6 binary was obtained from the public Zonky embedded-PostgreSQL distribution, extracted under `/tmp`, and used for actual database execution and testing. It is not a project runtime dependency. The development server is bound to localhost; no deployment was performed.

The populated database is `traindex` on localhost port 55432, with temporary cluster files at `/tmp/traindex-pgdata`. Recreate a durable local environment using the documented Compose/migration/import commands. The FastAPI server is available at `http://127.0.0.1:8000`, with documentation at `/docs`.

The reference images are freely licensed originals with per-file attribution and checksums, available locally under `data/references/commons/`. They are deliberately excluded from Git. Source metadata and the reproducible downloader are included. A Wikimedia 403 metadata refresh and subsequent 429 image-rate limit were handled by retaining the earlier successful metadata snapshot and resuming image downloads after a pause at a lower rate. All selected image downloads completed.

Exact physical HEX colors, verified font families/variants, manufacturer-level sign taxonomy, sign manufacturing/validity dates, broader front/rear coverage, historical route reuse and dated classification history remain research work. Most train manufacturer/year/current-status fields are unknown because the inventory is insufficient or contradictory. No historical group-history rows were invented. A documented scheduled R32 retirement and first-service/manufacturer facts come from a separately cited official announcement.

The installed Starlette TestClient emits one deprecation warning about its HTTPX adapter. Tests pass; this is recorded as dependency maintenance work, not hidden as a clean warning-free run. The Gemini integration, frontend, accounts, uploads and collection tracking remain intentionally outside the requested scope.
