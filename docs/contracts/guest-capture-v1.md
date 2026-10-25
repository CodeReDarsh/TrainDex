# Guest capture API contract — v1

Defined October 25, 2026. **Proposed implementation contract, not an implemented API.** The existing `/v1/identify` development route does not support this contract yet. B (friend) owns the server and initial contract changes; A (you) owns mobile-browser adapters (Expo deferred) and reviews changes. Build explicit client fixtures from these examples; never turn a real request failure into fake success.

## Current client priority

Mobile browser first: implement the web HttpOnly-cookie flow and IndexedDB photo storage now. Native/SecureStore examples document a deferred adapter; Expo is not part of the current milestone.

## First shared vertical slice

Establish guest session → upload full photo + metadata → poll result → review → save on device. Recognition does not require an account. Local card creation is a client operation, not `POST /v1/cards`. Google, import and email/password are deferred.

## 1. Establish guest session

`POST /v1/guest-session` with JSON `{ "client": "native" }` or `{ "client": "web" }`. Rate-limit issuance. This field selects transport, not trust or permission.

Native response (`201`):

```json
{
  "guestSession": {
    "expiresAt": "2026-10-26T16:00:00Z",
    "token": "<opaque-secret-issued-by-server>"
  }
}
```

For a future native client, A stores the native token in SecureStore and sends `Authorization: Bearer <token>` on subsequent requests. B stores its hash, expiry and ownership record. Web uses an HttpOnly session cookie with credentialed requests; its response omits `token`. Use the same ownership rules for both. A session is temporary recognition access, not a recoverable account. Expiry is authoritative; re-establishing a session does not grant access to jobs owned by the old one. Do not log tokens or expose them in URLs.

## 2. Upload fields

`POST /v1/captures`, authenticated by the guest session, as `multipart/form-data` with exactly two parts:

| Part | Required | Content | Rule |
| --- | --- | --- | --- |
| `image` | Yes | One binary full-frame photo with filename and MIME type | Not base64, a device URI, screenshot of a card, or just the crop. Filename is not an identity or storage path. |
| `metadata` | Yes | UTF-8 JSON text matching the object below | Send as a text field so browsers and a future Expo client can use the same format. Maximum 16 KiB. |

Let the HTTP client set the multipart Content-Type and boundary. A sends the native file contents through its upload adapter; a `file://` URI alone is not an upload. Do not manually set a bare multipart Content-Type header.

### Metadata

| Field | Required | Type | Meaning |
| --- | --- | --- | --- |
| `schemaVersion` | Yes | Integer `1` | Version of this request contract. |
| `encounterId` | Yes | UUID string | A creates once per intentional photo encounter. Upload retries reuse it. |
| `imageWidth` / `imageHeight` | Yes | Positive integers | Full image dimensions **after orientation correction**, not UI preview size. B verifies after decoding. |
| `crop` | Yes | Rectangle object or `null` | Sign region in the oriented full photo. `null` requests full-frame recognition. See coordinate rules. |
| `captureTime` | Yes | Object | Capture time and uncertainty. Use the Unknown object if unavailable. |
| `station` | No | String or `null` | Optional user-entered coarse station label, 1–120 characters after trimming. Omit/null for Unknown. No GPS is required. |

Example (all IDs and times are illustrative):

```json
{
  "schemaVersion": 1,
  "encounterId": "6a6adfaa-f642-4a65-83ec-e42b75218d91",
  "imageWidth": 3000,
  "imageHeight": 2000,
  "crop": { "x": 0.25, "y": 0.3, "width": 0.5, "height": 0.5 },
  "captureTime": {
    "source": "shutter",
    "localDateTime": "2026-10-25T12:00:00",
    "utcOffsetMinutes": -240,
    "timeZone": "America/New_York",
    "precision": "second"
  },
  "station": "Jay St–MetroTech"
}
```

### Image and crop rules

- Maximum image part: 8 MiB (8,388,608 bytes); maximum decoded image: 24,000,000 pixels. B enforces a separate bounded multipart overhead/field limit and exactly one image part.
- v1 baseline formats: JPEG, PNG and WebP. HEIC/HEIF only when server decoding is actually enabled and tested; otherwise return `415 UNSUPPORTED_IMAGE_TYPE`. A converts supported picker photos to JPEG when needed, or offers reselection. MIME/extension alone is not validation.
- A obtains timestamp metadata before any conversion. Orientation correction/re-encoding must preserve the full framing. Report dimensions and crop for the **actual submitted image**; do not rotate twice. B normalizes orientation once and validates dimensions before cropping.
- Crop values are finite fractions of width/height, origin **top-left**: `0 <= x,y < 1`, `0 < width,height <= 1`, `x + width <= 1`, `y + height <= 1`. Reject invalid rectangles rather than silently moving them. Coordinates address pixels after orientation correction and before server resizing.
- For the existing web preview `{x, y, s}` (center, width fraction), with oriented aspect ratio `r = imageWidth / imageHeight`, map to `{x: x-s/2, y: y-s*r/3, width: s, height: s*r/1.5}`. This yields its 3:2 pixel crop. The example above is also 3:2 in pixels. Expo can use the same rectangle contract without copying the browser component.
- B derives pixel bounds with `left=floor(x*W)`, `top=floor(y*H)`, `right=min(W,ceil((x+width)*W))`, `bottom=min(H,ceil((y+height)*H))`. Reject an empty result. Both test a rotated portrait photo and a landscape photo against the same expected region.
- Preserve the full photo locally; a crop is for recognition, not the only saved image.

### Capture-time rules

`source` is `exif | shutter | estimated | user | unknown`. `localDateTime` is an ISO local date/time **without** a timezone suffix, or `null`. `utcOffsetMinutes` is integer minutes east of UTC or `null`; `timeZone` is a known IANA zone or `null`. Never infer a timezone from a station or silently append `Z` to offset-free EXIF. B validates field consistency; server upload timestamps remain separate.

`precision` is `second | minute | day | unknown`. For `day`, use `YYYY-MM-DD`; otherwise use `YYYY-MM-DDTHH:mm:ss` (seconds `00` for minute precision). Do not invent midnight as a known capture instant. A missing zone/offset is valid uncertainty. A provided zone and offset must agree for the stated local time.

Unknown representation:

```json
{
  "source": "unknown",
  "localDateTime": null,
  "utcOffsetMinutes": null,
  "timeZone": null,
  "precision": "unknown"
}
```

### Fields deliberately excluded

Do not send account/user IDs, saved-card counts, first/repeat flags, recognized route/sign IDs, AI confidence, API secrets or photo URLs as upload authority. B derives the owner from the session and computes recognition. User model overrides belong to local review metadata initially, separately from returned recognition evidence. No client OCR field is required: B owns worker-side OCR.

### Upload retries and identity

B computes SHA-256 of the actual received image bytes and a canonical fingerprint of accepted metadata. Uniqueness is `(guest owner, encounterId)`; enforce it transactionally. Identical resubmission returns the existing capture without queuing duplicate work (`200`); first acceptance returns `202`. Same encounter with changed bytes/metadata returns `409 ENCOUNTER_CONFLICT`. Do not use filenames, multipart boundaries or signed URLs in fingerprints. Do not deduplicate across different guest owners.

A retains the submitted photo bytes for a potentially verifiable future import. Server-normalized derivatives can have different checksums: return both roles explicitly, never treat a derivative hash as the source hash.

After an accepted upload, retry processing through the retry endpoint instead of uploading again. Crop adjustment is a new processing run on the existing capture (below), not a second saved encounter. Replacing the photo creates a new encounter UUID; unsaved old work may be abandoned/cancelled. A double-tap on Save must still create one local card for that encounter.

## 3. Accepted upload and polling

`202 Accepted` (same body shape for idempotent `200`):

```json
{
  "captureId": "e2303408-af34-4cf6-bf64-46fa130efeb7",
  "encounterId": "6a6adfaa-f642-4a65-83ec-e42b75218d91",
  "runId": "fa2f2416-2c01-4ead-95aa-35a71ce15006",
  "status": "queued",
  "pollAfterMs": 1500,
  "expiresAt": "2026-10-26T16:00:00Z"
}
```

Poll `GET /v1/captures/:captureId` with the same session. B checks ownership on every request. Response includes the fields above plus `result` and `error`, both `null` while queued/processing. `status` is `queued | processing | complete | failed | cancelled`; no invented percentage. Completed/cancelled responses use `pollAfterMs: null`. A stops polling on terminal state, screen cancellation or session expiry and ignores stale capture/run responses. B returns the current run ID; A applies results only for its current expected run.

A complete result uses the following shape. This uncertain fixture deliberately does not invent a real catalog ID:

```json
{
  "outcome": "uncertain",
  "route": { "id": "A", "label": "A" },
  "sign": null,
  "trainModel": null,
  "observedText": "A",
  "message": "The route is readable, but the sign variant is uncertain.",
  "versions": {
    "catalog": "<published-catalog-version>",
    "pipeline": "<pipeline-version>",
    "model": "<actual-provider-model-version>",
    "prompt": "<prompt-version>"
  },
  "sourceImageSha256": "<64-lowercase-hex-digits>",
  "receipt": "<opaque-server-verifiable-recognition-receipt>"
}
```

`outcome` is `matched | unmatched | uncertain | unusable | not_a_sign`. Route/model/sign can be `null`; Unknown is not a fabricated reference. For `matched`, `sign` is `{id, label, shape, backgroundColor, foregroundColor, technology, artworkUrl, attribution, provenance}`. B supplies an **actual stable catalog ID**, not the prototype's `a-circle`; no sign is matched merely because it was the first retrieval candidate. `shape` is `circle | diamond | other | unknown`; `technology` is `rollsign | led | lcd | unknown`; colors are hex strings or null. `artworkUrl` is a display asset, not a user photo or an API credential. `attribution` and `provenance` are nullable text from the catalog, not invented claims. A null artwork URL must have a client fallback. `trainModel` is a nullable string such as `R179`; it is independent of sign style-family names.

No numerical probability is required. A generic human-readable `message` supports review; the enum drives behavior. Matched results can be saved; uncertain/unmatched readable-route save policy remains an explicit product decision (current prototype allows Unknown variant). Unusable/no-sign remain drafts. Provider/catalog failure is `failed`, never a fake uncertain/matched result. B must add a real matched fixture from the seeded catalog before client live-result integration; angle-bracket values above are fixture placeholders, not valid production data.

Keep first/repeat detection and route/variant counts in A's device repository for guest users. Recognition does not know the phone's saved collection.

## 4. Retry, crop adjustment and cancellation

- `POST /v1/captures/:id/retry` accepts JSON `{ "requestId": "<new UUID>", "crop": null }` or a valid crop rectangle. `crop` is required and denotes the intended next run, not an incremental delta. Keep the encounter and source photo; B returns `202` with a new run ID. Allow only complete/failed/cancelled captures with retained valid media and bounded attempts; active runs return `409 CAPTURE_BUSY`. Repeating the same request ID/content returns the same run; changed content under that ID is `409 IDEMPOTENCY_CONFLICT`. Original upload fingerprint is unchanged; each run records its crop. Receipts bind the run/crop/result. Re-upload is needed when source media has expired.
- `POST /v1/captures/:id/cancel` is owner-only and idempotent; returns `200` with `status: cancelled` when cancellation wins. For an already complete/failed capture, return its terminal status without rewriting history. Never apply late worker output after cancellation. A checks the returned status; it must not assume cancellation won a race.
- `GET /v1/media/:assetId` is owner-only and returns an authorized short-lived URL/expiry or a proxied photo per server adapter. Never expose arbitrary filesystem paths. Device-saved full photos do not depend on this temporary URL.

## 5. Error format and recovery

All non-2xx responses use:

```json
{
  "error": {
    "code": "IMAGE_TOO_LARGE",
    "message": "Choose a photo smaller than 8 MiB.",
    "retryable": false,
    "retryAfterMs": null,
    "requestId": "<server-request-id>"
  }
}
```

| HTTP | Code | Client behavior |
| --- | --- | --- |
| 400 | `INVALID_METADATA`, `INVALID_CROP`, `IMAGE_DIMENSIONS_MISMATCH`, `INVALID_IMAGE` | Keep the photo; correct input/reselect. |
| 401 | `GUEST_SESSION_EXPIRED` | Preserve local work; establish a new guest session and re-upload under it. Old jobs are not claimable with a new token. |
| 404 | `CAPTURE_NOT_FOUND`, `MEDIA_NOT_FOUND` | Missing or not owned; do not disclose another guest's resource. |
| 409 | `ENCOUNTER_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `CAPTURE_BUSY` | Do not auto-loop; reconcile current request/run or create a new photo encounter when appropriate. |
| 410 | `CAPTURE_EXPIRED` | Owned capture expired; re-upload retained local photo, preserving encounter identity under a new session if needed. |
| 413 | `IMAGE_TOO_LARGE` | Resize/reselect before sending again. |
| 415 | `UNSUPPORTED_IMAGE_TYPE` | Convert or reselect; never claim HEIC support without decoding it. |
| 429 | `RATE_LIMITED`, `CAPACITY_LIMITED` | Honor retry delay; preserve draft. |
| 503 | `SERVICE_UNAVAILABLE` | Bounded retry with backoff; preserve photo. |

A `failed` job can arrive in an HTTP `200` polling response: use the same `error` shape for `PROVIDER_UNAVAILABLE`, `CATALOG_UNAVAILABLE`, `PROCESSING_FAILED` or decoded-image validation failure. `result` is null; retryable describes whether a new run may help. Temporary outages should not erase the current photo or saved collection. Do not expose stack traces, provider keys, tokens or signed media URLs in error text/logs.

## 6. Responsibilities and first agreement test

- **A (you):** supply real bytes/dimensions/time/crop, persist browser photo Blobs and use the HttpOnly guest cookie, map processing/outcome states, ignore stale responses, and save locally without duplicates. Native files/SecureStore adapters are deferred; start with the web transport/storage adapter.
- **B (friend):** validate multipart/metadata, establish ownership/idempotency, create jobs, run OCR/catalog/Gemini, publish result/receipt, enforce expiry/limits, and deploy HTTPS. Test independently using fixture photos; UI completion is not required.
- **Together:** test the same rotated photo/crop, exact upload retry, adjusted-crop run, provider failure and expired guest session. Confirm one real matched catalog fixture and the source checksum round trip. Add executable schemas/API tests before live integration; this Markdown defines the agreement but does not validate requests automatically.

This contract chooses the previously unspecified retry/crop-run behavior. Update the spec and both adapters together if it changes; do not silently change a wire field, outcome or coordinate convention.
