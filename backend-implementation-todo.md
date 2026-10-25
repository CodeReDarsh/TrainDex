# TrainDex backend and integration TODO

Last updated: October 25, 2026  
References: [spec.md](spec.md), [frontend-spec.md](frontend-spec.md), [UI progress](ui-progress.md)

## Agreed direction

- Keep the proposed architecture: existing React/Vite mobile website (Expo deferred) → public Fastify API → internal Python catalog; PostgreSQL for application data/jobs/sessions and private object storage for retained media. Google is the first optional account provider; email/password is later scope.
- **Hackathon demo first; accounts only if time remains.** Required: a real phone captures/selects a photo, recognizes it through the hosted backend, saves it on the device and reopens it after refresh/restart. Google, cloud collections, import and email/password do not block the showcase. Design ownership extension points now; create account tables when needed.
- Ownership is now assigned: **A = you, mobile-browser client/UI; B = your friend, backend including recognition**. These replace the earlier client-plus-recognition/server-platform split. No deadline has been supplied; the milestones below describe dependencies rather than date estimates.
- This file is an implementation checklist, not evidence that services are deployed or that a migration has run. Implementation items start unchecked; checked planning decisions/baselines are labeled explicitly.

The main web UI exists; it is React DOM, not React Native. No Expo client exists in this checkout. Agreed priority: optimize the existing website for mobile browsers and complete its real guest flow. Expo is deferred. Expo requires screen/device adapters, not just packaging the Vite project. Both clients use the same HTTPS backend.

Backend work should connect its current states to real outcomes rather than redesign the screens. Keyboard, layout, and component testing can still run independently; persistence, recognition, ownership, session, offline, and cross-device acceptance checks require integration.

## What already exists

| Area | Evidence in this checkout | What still needs work |
| --- | --- | --- |
| React frontend | `apps/web/src/App.tsx`, `apps/web/src/traindex/*` | Cards/drafts/auth/imports are simulations. Replace React-only storage and timers with repositories and API calls. |
| Node entry point | `apps/api/src/server.ts` | Existing `/healthz`, `/v1/lines`, synchronous multipart `/v1/identify`, and HTML test page. No application card/auth/job/media APIs found. |
| Gemini reading | `apps/api/src/identify.ts` | Reads photo features and validates structured output. Does not yet implement the intended OCR → shortlist → Gemini comparison against selected catalog references. |
| Catalog bridge | `apps/api/src/signs.ts` | Optional `SIGNS_API_URL` calls Python `/signs/match`. It returns heuristic candidates; those scores are not a final visual match or probability. |
| Catalog and database | `app/`, `alembic/`, `data/processed/`, `tests/` | Existing SQLAlchemy catalog, migrations, import/matching logic, and tests should be preserved. Application/auth/card/media tables are new work. |
| Local infrastructure | `docker-compose.yml` | PostgreSQL 17 with a persistent volume is configured. Source configuration does not prove that a database is running or populated. API/worker/proxy deployment remains work. |

### Resolve these mismatches before wiring real saves

- [ ] Replace the Node response label `rare` with a neutral supported outcome. Historical/unrecognized lettering does not imply rarity.
- [ ] Distinguish catalog-unavailable errors from a successful lookup with zero candidates. `findSigns()` currently returns `[]` for both.
- [ ] A route-level `identified` response must not automatically unlock the first candidate as a matched sign variant. Gemini must compare the supplied candidate references or explicitly abstain.
- [ ] Replace frontend sample IDs such as `a-circle` with actual stable catalog sign IDs and reference display data. Never insert sample fixtures into real user collections.
- [ ] Replace prototype `enc-...` IDs with a real encounter UUID created once per intentional capture/save. Retries reuse it.
- [ ] Replace photo URL strings as the storage model: durable local photos need app-document files on native or Blobs on web; account photos need asset IDs and authorized delivery. Blob preview URLs are temporary presentation values.
- [ ] Expand the UI timestamp representation so offset-free EXIF local time is not silently converted to UTC. Retain capture-time source and uncertainty separately from server timestamps.
- [ ] Agree how existing model editing maps to the API: store an explicit user override/provenance separately from immutable recognition evidence, or limit editing until that contract exists. Never let an edit manufacture recognized confidence or a new reference match.

## Two-person ownership split

**A = you: mobile-browser client/UI. B = your friend: backend.** Your friend owns server-platform work plus recognition and does not need to wait for the UI to be finished.

| Lane | Owns | Primary files/modules | First independent assignment |
| --- | --- | --- | --- |
| **A — you: mobile-browser UI and wiring** | Responsive/touch screens, browser camera/picker/crop/time handling, IndexedDB photo/card/draft storage, client API adapters, device tests and web deployment | `apps/web/**`; client dependencies/configuration | Optimize the existing UI on a phone; build durable local saves and API wiring against agreed example responses. |
| **B — friend: backend and recognition** | Fastify routes, guest sessions, validation/private media, PostgreSQL/migrations/jobs, OCR → Python catalog shortlist → Gemini comparison, receipts, cleanup, Vultr deployment and backend tests; accounts only later | `apps/api/**` including `identify.ts`, `signs.ts` and proposed recognition/worker modules; `app/**`, `alembic/**`, Compose/deployment | Verify catalog DB/seed and existing recognition path, publish contract fixtures and HTTPS health/upload/status skeleton; build the worker independently with test photos. |
| **Together** | Versioned API agreement, first-phone smoke test, result/ownership semantics and release acceptance | Proposed `docs/contracts/` and integration tests | Agree on upload/crop/time fields, session transport, job/result/error examples and stable catalog IDs before independently wiring them. |

**Recognition boundary:** all OCR, retrieval, Gemini calls, evidence/version tracking and result publication belong to B on the server. A sends the photo/crop metadata, renders returned states and saves the resulting card locally. A does not edit recognition internals or need Gemini credentials.

**Database boundary:** B owns application migrations and catalog changes. Catalog maintenance stays Alembic-owned; never introduce competing migration owners or a second catalog.

**Where the lanes meet:** the API contract, not the screen implementation. B can test requests through API tests/scripts while A uses explicit fixtures. Screen layouts, animations and navigation should not affect database or worker design. Crop orientation, upload bytes/checksums, result fields, guest credentials and retry semantics do affect both and must be agreed first. B owns the initial contract draft; A reviews browser usability. Version breaking changes and update fixtures together.

### How to work without blocking or overwriting each other

- [x] Prior UI/backend-plan baseline committed and pushed as `1ff73f1`. Use the latest reviewed shared revision for new branches; this documentation update is not itself a new commit.
- [ ] Use separate clones/worktrees and branches. Do not have both people or multiple agents edit this same checkout concurrently.
- [ ] Assign one owner per shared file: B owns `server.ts`, API dependencies/lockfile, migration setup, Compose, and deployment configuration. A owns client dependencies/lockfile and mobile-browser UI adapters. Submit dependency requests to the relevant owner.
- [ ] Keep contract examples/types in one agreed location. One person merges contract changes; the other reviews them. Do not silently rename fields or enum values.
- [ ] Use contract fixtures so A can implement the client while B implements real routes. Keep fixture mode explicit; real API errors must never fall back to fake success or sample cards.
- [ ] Use separate disposable test databases for each person's destructive tests. Never point test fixtures or migration round-trip tests at the populated catalog or another person's development database.
- [ ] Integrate small vertical changes regularly: upload + polling, then recognition review, then local save/reload. Review each other's migrations and ownership/idempotency changes before merging.

## D0 — first physical phone and sharing decision (start here)

- [ ] Both: name the first test phone/OS and record the hackathon deadline. Open the existing site in its browser and test camera/picker, touch controls and a persistent-photo fixture.
- [ ] A: test camera permission/selection, image orientation, crop coordinates, full-photo rendering and local-save/reload on that device. Prove a minimal local fixture first, then replace it with a live result.
- [ ] B: expose staging health/guest/upload routes through public HTTPS on Vultr; phone configuration must use the public URL, never localhost or private Python/PostgreSQL ports.
- [x] User chose mobile-browser-first; Expo is deferred. You own client/UI and your friend owns the complete backend including recognition. Accounts remain optional.
- [ ] A: verify responsive layouts at 320–480px and on the actual test phone, safe areas/bottom navigation, touch targets, text wrapping, virtual keyboard/search, image orientation, reduced motion and loading/error recovery. Width/text lab controls do not replace physical-device tests.
- [ ] Deferred Expo work only: pin a compatible SDK and implement native screens/navigation, camera/picker, SQLite/files and secure credential adapters. Do not make this a browser MVP prerequisite.
- [ ] Deferred Expo distribution only: test iPhone access rules before a future native demo. Current Expo docs require the same Expo account in CLI and physical-iOS Expo Go for development-server access. Do not give judges team credentials; use a team-owned demonstration phone and the web link for audience devices.

Vultr hosting solves backend availability. Expo bundle delivery is a separate service: Expo Go still needs a supported reachable bundle/development server. A remote Metro/tunnel is a supervised development option, not a standalone app. A preview Android APK can bundle JS and use the hosted API without Metro. Do not assume EAS Update makes any Expo Go project publicly shareable.

## Milestones and dependencies

| Milestone | A can work on | B can work on | Exit condition |
| --- | --- | --- | --- |
| **D0 — phone spike** | Mobile-browser layout/camera/picker and local fixture | HTTPS staging/API reachability and request fixtures | Site opens on a real phone, retains a photo after refresh and reaches hosted API. |
| **G0 — contract and bootstrap** | Client data interfaces and review of response fixtures | DB/migration boundaries, API bootstrap, storage/job interfaces | Both agree on payloads and can run their lane independently. |
| **G1 — durable device path** | IndexedDB and real photo/crop/time lifecycle | Guest session, validated uploads, durable jobs | A browser fixture card/draft survives refresh; server uploads/jobs survive process restart. This is an intermediate checkpoint, not live recognition completion. |
| **G2 — working guest flow** | Browser API wiring and honest review/local-save states | Recognition engine + worker/result/receipt/media API integration | Real photo → honest recognition result → device save → refresh → reopen full photo. No account required. |
| **D1 — judge-ready guest demo** | Shared website URL/QR and phone/network rehearsal | Hosted services, limits, cleanup, diagnostics and restart checks | Browser guest flow works on a physical phone without a developer laptop. Required before accounts. |
| **A1 — optional accounts and cloud cards** | Sign-in return, account collection and save wiring | Google sessions, claim, private account cards/media | A real account card can be opened in a second signed-in browser. |
| **A2 — optional explicit import** | Durable per-card import client/progress/dedup display | Resumable import validation and idempotent writes | Retry/reload imports without duplicates or deleting local copies. |
| **A3 — later email/password** | Sign-up/verification/reset/settings screens | Library credential schema, email delivery/recovery/rate limits/linking | Verified sign-up and safe recovery/linking pass integration tests. |
| **R1 — release checks throughout** | Phone/offline integration tests | HTTPS, quotas, cleanup, recovery and monitoring | Guest subset gates D1; account/import checks only gate their releases. |

## G0 — shared contract and database foundation

### Shared contract — both

Field definitions and examples now live in [guest capture API contract v1](docs/contracts/guest-capture-v1.md). It defines multipart `image` + JSON `metadata`, native/web guest transport, crop/time conventions, idempotency, run-based crop retries, polling/results and errors. This is a written contract, not an implemented endpoint or executable schema.

- [ ] Create a versioned OpenAPI/JSON-schema contract plus success/failure examples, shared types where practical, and a stable error envelope: `code`, safe `message`, `retryable`, optional retry delay, request ID.
- [ ] Choose transport by client: web HttpOnly cookie first; deferred native opaque bearer token/SecureStore adapter. Use the agreed transport consistently. Same owner checks apply; never pass credentials in URLs or logs.
- [ ] Agree on encounter UUID, capture/job/run/card/asset IDs, catalog sign IDs, route identifiers, and idempotency-conflict behavior. IDs locate resources; they do not authorize access.
- [ ] Define crop coordinates relative to the correctly oriented full image, including the prototype's crop aspect ratio. Ensure browser and worker crop the same pixels.
- [ ] Define capture-time source, original local timestamp, offset/timezone when known, uncertainty, station, optional model override, and independent server upload/save timestamps.
- [ ] Keep job status (`queued/processing/complete/failed/cancelled`), recognition outcome, and save/storage status separate. Map backend outcomes into existing UI states explicitly.
- [ ] Define a reference display payload with stable ID, actual shape/colors/style, artwork URL or packaged asset, provenance, attribution, and catalog version. Do not depend on the frontend's three sample variants.
- [ ] Decide pagination, supported-route ordering, collection count rules, and private-media URL refresh behavior. A network error must not appear as an empty collection.
- [ ] Decide receipt/checksum semantics before local storage and upload implementations diverge: the photo bytes retained locally must correspond to the bytes the receipt verifies on later import. Track source-upload and normalized-derivative checksums separately where they differ.

### Database foundation — B, reviewed by A

- [ ] Verify existing Alembic migrations and catalog seed/import locally. Record baseline revisions and test results; do not edit already-applied migrations or drop the existing catalog.
- [ ] Pick one migration runner for new application tables and adopt the pinned auth library's generated schema into that ownership process. Resolve the library's actual user-ID type before adding application foreign keys.
- [ ] Prefer a separate application schema when supported by the chosen auth/database tooling; otherwise use explicit table mappings and strict migration include/exclude rules. Alembic autogeneration must not attempt to remove Node-owned tables.
- [ ] Add the guest/upload/media/capture/job/run/candidate/cleanup tables needed for G2. Add account-card/import tables when their milestones start. Use the table groups in spec §9 as a design guide, not a requirement to build every optional table immediately.
- [ ] Enforce exactly one owner for temporary resources (guest or user), owner-consistent links, stable catalog references, unique owner + encounter identity, and one card per capture. Derive collection counts from saved, visible encounters.
- [ ] Add job claim/lease, expiry/cleanup, owner/route/save-time, and encounter lookup indexes. Test transaction races against PostgreSQL, not only SQLite.
- [ ] Introduce validated configuration, development environment examples with no secrets, DB pools, process liveness and DB/schema readiness checks. Add local API/worker/catalog commands or Compose services.

## G1 — durable device path and guest server skeleton

### Client data — A

- [ ] Define repository interfaces for cards, drafts, media, preferences, and pending operations. Keep the foil/card components independent of storage implementation.
- [ ] Web: implement versioned IndexedDB stores for photo Blobs, crops/thumbnails, card metadata, reference display assets, receipts, drafts, and pending save/auth/import context.
- [ ] Web: commit each local card's required data transactionally. Reveal only after success; keep the current work on quota/denied/transaction errors.
- [ ] Web: reload the collection and full photo from IndexedDB after refresh. Create/revoke preview object URLs as views open/close instead of persisting those URLs.
- [ ] Deferred native: use SQLite metadata plus app-document photo files. Copy temporary picker/cache photos before confirming Save; publish metadata after files are ready and recover partial writes/orphans. Native persistence needs its own restart/uninstall tests.
- [ ] Implement actual camera selection/capture with photo-picker fallback; extract capture metadata before normalization and do not turn GPS EXIF into station data.
- [ ] Persist unrecognized offline drafts separately from recognized cards. Resume recognition only with connectivity; permit already-recognized local saves offline.
- [ ] Preserve in-progress photos and review details before auth redirects or navigation that destroys component state. Keep guest/device and account caches separate.
- [ ] Test browser refresh recovery and denied/full storage. A fixture-based durable save is an intermediate test, clearly labeled until G2 is connected.

### Guest API, media and jobs — B

- [ ] Implement short-lived guest sessions: browser HttpOnly cookies first; opaque bearer transport/SecureStore only for a future native client. Hash server-side tokens and enforce expiry, ownership checks and bounded recognition admission.
- [ ] Stream uploads into private staging rather than keeping every image in API memory. Existing MIME checks and `toBuffer()` are not the final validation/storage pipeline.
- [ ] Enforce configurable byte and decoded-pixel limits; decode/verify format, normalize orientation, extract allowed metadata, strip unnecessary EXIF, and create full-frame/crop/thumbnail derivatives in a bounded worker.
- [ ] Provide a storage adapter: private filesystem for explicit local development; private S3-compatible object storage for hosted media. No public-read user bucket or unauthenticated filesystem media route.
- [ ] Persist capture/media state and PostgreSQL jobs. Implement atomic claims, leases/heartbeat, bounded attempts, retry/backoff, and restart recovery. Do not perform all image processing in the API event loop.
- [ ] Implement owner-only status/result/media access, retry, and explicit cancellation. Ignore late completion of cancelled/deleted jobs.
- [ ] Implement abandoned-upload/guest-expiry/orphan cleanup with retained-media guards. Object storage and PostgreSQL are not one transaction; use explicit states and retryable cleanup.

## G2 — connect the real guest flow

### Recognition engine — B (friend)

- [ ] Implement worker-side OCR for the first demo so web/native clients do not need a custom native OCR module; client OCR is optional. Return hypotheses/tool scores without making OCR or a route color proof of sign appearance. Weak hypotheses must allow broader candidate retrieval.
- [ ] Use the existing Python catalog for a bounded shortlist. Preserve actual shape/colors, stable IDs, reference provenance, and uncertain equipment associations.
- [ ] Prepare selected trusted reference images, rasterizing SVGs where needed; send the query crop and the exact candidate references/IDs to Gemini for the final appearance decision.
- [ ] Validate output against supplied candidate IDs and allowed outcomes. Return Unknown for unsupported train-model claims; support abstention and unusable/not-a-sign results.
- [ ] Record selected candidates and pipeline/catalog/model/prompt versions. Treat catalog outages as errors, not invented unmatched signs.
- [ ] Keep a small held-out set of real phone photos covering first/repeat, glare/blur, diamond/circle, historical signs, and non-trains. Separate retrieval scores from calibrated confidence claims.

### Publish results and wire the UI — B + A

- [ ] B persists immutable runs/candidates and issues a verifiable receipt binding encounter, photo checksum, result and versions. Design verification to work after temporary guest uploads expire.
- [ ] A connects guest-session establishment, upload, polling, retry/cancel and reference display through typed API adapters; B supplies the agreed endpoints and errors. Client fixtures remain explicitly labeled until live integration.
- [ ] Bound retries and use cancellation/request identity so late results cannot overwrite a different photo. Handle timeout, service unavailable, upload/decode failure, no sign and uncertainty honestly.
- [ ] Compute device counts from actual local cards, independent of model and EXIF chronology. Retrying a save must not add an encounter.
- [ ] Remove normal-path dependence on sample cards, simulated sign IDs, fake account booleans and timers. Keep demo mode separate for design/recovery testing.
- [ ] Verify web guest cookie establishment/expiry/retry and CORS in HTTPS staging with credentialed requests and exact permitted origins. Defer native credential adapters.

**Guest milestone acceptance:** open Capture without login; recognize a real photo; review a real matched reference or an explicit uncertain outcome; save photo + metadata + receipt locally; refresh the browser; open the same card/full photo; save a second encounter; retry a save without duplication; keep/resume an offline unrecognized draft. Also test invalid images, quota errors, provider failure, cancelled jobs, and guest-owner isolation.

## D1 — required showcase and distribution gate

- [ ] B: deploy API/worker/catalog/PostgreSQL on Vultr with private staging/media and Caddy HTTPS; provide a stable public API URL. Backend availability must not depend on a laptop.
- [ ] A: optimize/deploy the web frontend on Vercel and provide a tested URL/QR. Complete the browser vertical slice on a physical phone; do not start a second client during this milestone.
- [ ] Both: complete real photo → real recognition → local save → refresh/restart → full photo on at least one named physical phone. Test denied camera permission, HEIC/rotation, API failure, storage failure and duplicate retries.
- [ ] Both: rehearse from the judging venue/network or mobile data; confirm CORS/cookies, API URL, permissions, readiness, bounded paid AI work, guest-owner isolation and cleanup. Keep account/import UI hidden or clearly unavailable in the guest release.
- [ ] Both: prepare consented real subway photos for picker-based live recognition when no train is available at judging; distinguish this from separately labeled fixture/demo mode. Keep a recorded walkthrough as an outage fallback, never claim it is live.
- [ ] Deferred native release only: prove Expo launch/JS bundle access on the chosen iPhone/Android and record the required account/server/network steps. Hosted backend alone is insufficient. Prefer a rehearsed sharing path independent of a laptop; if using supervised Expo Go with Metro, explicitly record that dependency and provide the hosted web fallback when ready.
- [ ] Optional Android: create an EAS preview/internal APK with bundled JS, install and cold-launch it without Metro, and test the same hosted backend. Do not use a development-client build as the independent install artifact.
- [ ] No TestFlight/App Store submission is required. Do not spend the demo-critical path setting up iOS standalone distribution.

## A1 — optional accounts and cloud collections (only after D1)

### Server — B

- [ ] Integrate pinned Better Auth + Google using its supported Fastify/session integration and generated tables. Verify callback/state/PKCE behavior through the library rather than implementing OAuth manually.
- [ ] If native ships, prove the library-supported native auth/secure storage/deep-link flow separately; do not reuse browser callback/cookie assumptions.
- [ ] Configure trusted origins, Secure/HttpOnly cookies, CSRF/Origin checks, exact callback URLs, session persistence, expiry and logout. Do not put long-lived session credentials in browser localStorage.
- [ ] Claim a temporary guest capture only with both the current guest-session proof and a verified account session. Transfer related ownership atomically; reject claim by another account.
- [ ] Implement idempotent account save with ready full-photo/thumbnail assets before card commit. Same encounter + changed content is a conflict, not another card.
- [ ] Implement private card list/detail/edit/delete, collection summaries and authorized short-lived photo delivery. Enforce ownership on every lookup, not just list endpoints.
- [ ] Revoke sessions on logout; implement retryable unused-media deletion and the required account-deletion path before a public account release.

### Client — A

- [ ] Replace simulated sign-in with the real flow, preserving the pending card across redirects. Follow the current UI behavior: return to the preserved review and perform an explicit save; login alone must not create a card.
- [ ] Wire `/me`, account saves, collection loading/pagination, edits/deletes and media URL renewal. Keep save/edit failures recoverable.
- [ ] Clear account-specific cached data on sign-out or account switch while retaining separate device cards. Do not show a previous account's cards or auto-import local photos.
- [ ] Verify sign-in cancellation/expiry and failed cloud saves preserve the photo and device-save option. Confirm a saved card opens in a second authenticated browser.

The spec's “resume the pending save” must not bypass the current UI's explicit save confirmation or claim persistence merely because authentication succeeded.

## A2 — optional device-to-account import

- [ ] B: persist per-item import state, original encounter identity, checksum/receipt verification and idempotent card creation. Re-upload expired temporary media; recheck recognition when evidence is absent/invalid.
- [ ] A: keep import an explicit choice for the selected account. Persist progress and account/card mappings, show per-item checking/uploading/failure/completion, and resume after refresh/interruption.
- [ ] Keep local copies until success is confirmed and until the user separately chooses removal. Completed local/account copies of the same encounter render once.
- [ ] Test duplicate submits, worker/API restarts, changed-content UUID reuse, expired receipts/catalog versions, partial failure, and account switching.

## A3 — later email/password (not needed for the hackathon)

- [ ] B: enable Better Auth's supported email/password flow alongside Google; adopt its generated credential schema and secure salted hashing. No plaintext/reversible passwords or separate custom password table. Google-only users have no local password.
- [ ] B: configure transactional email provider, verified sending domain, email ownership verification, expiring single-use reset links, password change and session revocation. Never log passwords or recovery tokens.
- [ ] B: implement auth/recovery rate limits and generic responses; define verified identity linking and duplicate-email behavior without letting an unverified email take over a Google account.
- [ ] A: add sign-up/sign-in, verify/resend, forgot/reset password and settings flows; preserve pending device work through navigation.
- [ ] Both: test verification expiry/reuse, reset expiry/reuse, incorrect passwords, duplicate signup, linking, session invalidation and delivery failures. Do not publicly enable this method until recovery works.

## API checklist

These are **planned** contract endpoints from spec §10 unless marked as an addition. Existing Node routes are `/healthz`, `/v1/lines`, and `/v1/identify`; Python has its own internal catalog routes.

| Stage | Planned endpoints |
| --- | --- |
| Guest | `POST /v1/guest-session`; `POST /v1/captures`; `GET /v1/captures/:id`; `POST /v1/captures/:id/retry`; owner-authorized `GET /v1/media/:id`; `GET /v1/routes`; `/readyz`. |
| Cancellation | `POST /v1/captures/:id/cancel` (now included in spec); finalize semantics in the contract; late completion must not become a usable result. |
| Optional accounts | `/api/auth/*`; `GET /v1/me`; `POST /v1/captures/:id/claim`; `POST/GET /v1/cards`; `GET/PATCH/DELETE /v1/cards/:id`; `GET /v1/collection`; `DELETE /v1/me`. |
| Optional station choices | `GET /v1/stations` when a maintained coarse station source is available; optional free-text/Skip must still work. |
| Optional import | `POST /v1/imports`; `GET /v1/imports/:id`; agree retry/resume requests and any additional routes before implementation. |

Keep `/v1/identify` as an explicitly limited development bridge while migrating; do not expose a paid, unlimited synchronous bypass of the guest job limits. Web and native clients talk to Node, not directly to the private Python catalog or database.

## R1 — deployment, privacy and release tests (start during G1; guest subset gates D1)

- [ ] B: agree domain/subdomain or same-origin proxy strategy before depending on Google/cookie behavior. Use local development adapters until the hosting details are settled.
- [ ] B: configure Caddy HTTPS, internal-only Python/PostgreSQL, persistent DB/proxy state, private object storage, secrets outside Git, and controlled migration execution.
- [ ] B: implement guest/IP/account limits, bounded worker concurrency, storage quotas and a global Gemini budget/kill switch. Do not rely on frontend controls to limit paid work.
- [ ] B: schedule cleanup, DB backups and an independent retained-media backup/export; prove restore with a manifest/checksum drill. Document retention and existing signed-URL expiry behavior.
- [ ] Both: add redacted request/job diagnostics and readiness checks without logging photos, tokens, signed media URLs or detailed travel history.
- [ ] Both: test unauthorized access, cross-account/guest claim attempts, malformed/oversized images, duplicate saves/imports, crash recovery, cancellation races and deletion/cleanup races.
- [ ] A: run mobile camera/HEIC/reselection, offline draft/local-save, keyboard/layout and actual screen-reader checks against real service responses. Continue independent UI regression checks in parallel.
- [ ] Both: run the existing catalog tests and add API/worker/PostgreSQL/SQLite/device-files/IndexedDB/integration tests appropriate to each milestone. Existing PostgreSQL migration tests require separate disposable databases; do not reuse a populated development DB.
- [ ] Both: run the guest-only judging demo before D1. Run guest → account → explicit import only if those optional milestones ship; review prototype labels for each release.

## Decisions to resolve during implementation

These do not block drafting the plan or starting G0/G1:

- [ ] Deadline and weekly availability for the assigned lanes: A/client = you; B/backend + recognition = friend. B should finish guest APIs/recognition before optional account work.
- [ ] First test phone/OS, deadline and audience sharing route. Mobile-browser-first is agreed; Expo is deferred; do not build two full frontends in parallel.
- [ ] Who owns deployment credentials, which domain/storage region to use, and the actual hosting/Gemini budget. Google and email-provider credentials are needed only for optional account milestones. Do not provision resources until these are agreed.
- [ ] Final supported routes, historical signs and shuttle identifiers. Return the agreed list from Node instead of keeping a sample denominator in the client.
- [ ] Confirm readable-route/unknown-variant saves versus draft-only handling. The current UI allows an unknown-variant card; do not silently remove that option during wiring.
- [ ] Confirm whether first-collected history survives deleting all matching encounters. Current prototype/spec default derives it from remaining saved cards.
- [ ] Final model-override/edit policy and how any later recognition correction is explained. Manual route/variant correction and public submission are not implicit backend requirements.

No accounts, trading, rarity, public catalog, social card sharing, Kubernetes, vector database or direct-to-bucket upload optimization is required for these first milestones.

## Reference notes

The linked conversation, “Sharing React Native MVP,” supplies the goals of phone access, hosted Vultr services, possible Expo Go/iPhone and Android APK sharing, and getting at least one phone working. Its retrieved assistant replies contained reference markers rather than readable explanations; this plan does not treat those missing replies as verified technical advice.

Official Expo references checked October 25, 2026: [development server/iOS access](https://docs.expo.dev/get-started/start-developing/), [Expo Go runtime limits](https://docs.expo.dev/develop/development-builds/introduction/), [internal distribution/APK and iOS provisioning](https://docs.expo.dev/build/internal-distribution/), [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) and [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/). Recheck the selected SDK/sharing workflow at implementation time.
