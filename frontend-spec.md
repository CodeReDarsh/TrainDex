# TrainDex — Frontend Design Specification

**Status:** Design launchpad; product decisions below reflect the current direction, not implemented features.  
**Revision:** 2026-10-24 — camera-first, guest saving, personal cards grouped by route  
**Companion:** [Technical specification](./spec.md)

> This revision supersedes earlier frontend proposals for mandatory sign-in, a browseable reference catalog, and grouping collection tiles by variant. The technical spec now includes a proposed account/cloud-storage plan aligned with guest recognition, device saving, timestamp handling, and route-grouped personal cards.

## 1. Product direction and decisions

TrainDex opens directly to Capture so users can start photographing subway signs. Each saved encounter creates a separate personal trading card from the user's photograph, recognized route, matching SVG sign variant, and optional train model. Cards have a trading-card foil aesthetic and are grouped by subway route in My Collection.

**Primary journey:** Open app → Capture → Preview → Recognize → Review card → Save → Reveal.

For a guest, **Save** opens a choice: **Sign in**, **Create account**, or **Save on this device for now**. Authentication is optional at entry and during recognition. Its provider and detailed forms will be decided later.

### Confirmed direction

- Capture is the initial screen, with a separate **Home** button.
- Personal cards are generated when users take and save pictures. There is no pre-generated inventory of collectible cards.
- Every saved encounter is a separate card, including repeat sightings of a route/sign variant.
- My Collection groups cards by route. Uncollected supported routes have a question-mark placeholder.
- The matching SVG variant supplies sign shape, color, and display style. The reference library supports recognition behind the scenes; it is not a user-facing catalog screen.
- Gemini makes the final appearance-match assessment against available references; OCR remains part of the recognition flow. Results can remain uncertain.
- Train model is optional: show the identified model or **Unknown**. It can differentiate personal cards without changing the route/sign variant encounter-count definition.
- Capture timestamp uses EXIF when usable, with explicit fallback behavior.
- No rarity tiers, editions, collectible serial numbers, public sharing, reference publishing, actual trading, or battle screens are planned.

### Scope labels

- **Required direction:** A user-confirmed decision above.
- **Suggested:** Interaction details that can change during mockup review.
- **Open:** A remaining product decision; do not present it as implemented.

## 2. Card identity, fields, and counts

A personal card represents one saved encounter. A reference SVG represents a sign appearance. Many personal cards can match the same SVG, including photos of different train models.

| Card field | Display and behavior |
|---|---|
| Route designation | A, C, E, 7, etc.; use text as well as color |
| Rollsign variant | Matching SVG variant with its actual shape, color, and display style; do not render every sign as a circle or recolor historical appearances to current route colors |
| Train model (optional) | R160, R179, R211, etc., if supported by the recognition result; otherwise **Unknown** |
| User photograph | Main artwork; provide **View full photo** even when the card uses a cropped image |
| Capture timestamp | EXIF when usable, otherwise the fallback below; editable |
| Station (optional) | Coarse station label, with Skip/Remove; no required GPS |
| First collected date | When this user first saved/unlocked the route + matching sign variant |
| Encounter count | Number of saved sightings of the same route + matching sign variant; includes encounters across different train models |

Each card retains its own photo, capture time, optional station, and model. First-collected date and encounter count are shared collection information for that route + variant and can update as more cards are saved. Retrying one save must not create an additional encounter. A new photograph intentionally saved creates a new card.

**Suggested counting rules:** Count saved encounters in the currently visible collection; use first saved date for unlock time, not an older imported photo's EXIF date. Show whether the collection is device-local or account-backed. Unmatched variants do not receive invented variant encounter counts. Local/account reconciliation must deduplicate the same encounter if later account import is implemented.

### Timestamp fallback

1. Use a valid photo EXIF capture timestamp when available. Preserve its source and any timezone uncertainty; do not assume missing timezone information is UTC.
2. For a photo taken inside the app without usable EXIF, use the shutter time recorded by the app.
3. For an uploaded photo without usable capture metadata, suggest the selection time with a small **Time estimated — edit** label. Let the user correct it or choose **Unknown**; retain upload/save time separately.
4. Extract needed capture metadata before stripping EXIF from stored derivatives. Do not silently import EXIF location as the optional station.

## 3. Navigation and screen inventory

**Initial destination:** Capture. Home is a secondary destination reached from the camera, not a welcome/sign-in gate.

**Suggested navigation:** Capture has a Home control, photo picker, and shutter. Home links to Collection and back to Capture. Collection and Card Detail retain a prominent Scan action. Bottom navigation, if used outside the camera, has Home, Scan, and Collection only.

| Screen or overlay | Purpose |
|---|---|
| Capture — initial screen | Immediately take/select a train photo; Home control |
| Photo preview / crop | Review framing and select the intended sign |
| Recognition progress | Show processing and recovery actions |
| Recognition review / card preview | Review the generated personal card and optional details |
| Guest save choice | Choose account save or local device save without losing the photo |
| Card reveal | Show the successfully saved foil-style card and its save destination |
| Home | Recent cards, collection summary, quick return to camera |
| My Collection | Route groups, separate encounter cards, uncollected-route placeholders |
| Personal card detail / full photo | View card information, original photo, related encounters |
| Minimal account/settings panel | Local/account status, optional sign-in, help, and later account controls |

There is no separate reference catalog, public variant browser, required onboarding screen, or admin-review screen in the current design scope.

## 4. Screen designs and actions

### 4.1 Guest save choice — shown only when saving without an account

Present a bottom sheet over the card preview, preserving the picture and entered details.

**Title:** “Save your card”

- **Sign in:** Continue to the selected authentication flow, then resume saving this card.
- **Create account:** Same preserved-card behavior through account creation.
- **Save on this device for now:** Persist the card and photo locally; no account required.
- **Back to card:** Close the sheet without discarding work.

**Suggested explanation:** “Device saves stay in this browser. Sign in to save to an account.” A short secondary note explains that clearing site data can remove local cards.

Design the choice and a generic sign-in placeholder now; provider-specific forms are deferred. If authentication fails or is cancelled, return to the card with local saving still available. After choosing device saving, offer a lightweight **Save on this device** action for subsequent cards rather than repeatedly forcing the account choice; retain an optional sign-in link.

**States:** Saving locally, saved locally, storage unavailable/full, signing in, account save in progress, failed save, authentication cancelled. Do not show a successful reveal until the selected storage destination confirms persistence.

### 4.2 Home

Home is available from Capture. Show recent personal cards, total saved cards, routes collected, and a prominent return-to-camera action. A guest can use Home and Collection immediately.

**Buttons/features:** **Scan a sign**, **My Collection**, recent-card links, and a small account/device-save indicator. A guest may see **Sign in to save to an account**, without blocking browsing or capture.

**States:** Empty collection, device-local collection, account collection, loading, failed load, offline. Label the collection being displayed. Route progress is against the supported route list; do not imply a finite total of possible personal cards.

### 4.3 Capture — app entry screen

Use a large camera view with a simple sign-framing guide. Keep the user photograph broad enough to show the train when desired; recognition can use a separate crop. Place a clearly labeled **Home** button away from the shutter.

**Buttons/features:** **Take photo**, **Choose photo**, **Home**, **Switch camera** when supported, and optional supported flash control. Include a short steady-photo/glare tip. Request camera permission when needed; no account prompt appears here.

**States:** Permission request/denial, camera unavailable, unsupported controls, invalid file, decode failure. Provide a working photo-picker fallback. A concise first-upload disclosure explains that image recognition can send the photo/crop to an AI service; it does not become a full onboarding gate.

### 4.4 Photo preview / crop

Show the user photograph and an adjustable sign crop. Preserve the full photo for the card's full-photo viewer and for optional train-model analysis when available. Cropping for recognition must not destroy the full image.

**Buttons/features:** **Recognize sign**, **Retake**, **Choose another**, **Adjust crop**, optional **Rotate**, and **Back**. If multiple signs appear, let the user choose the intended area.

**States:** Preview loading, crop too small, blur warning, multiple signs, processing error. Changing the crop or retaking does not create a saved card.

### 4.5 Recognition progress

Show the photo thumbnail and actual stages such as “Reading the sign,” “Matching its appearance,” and “Preparing your card.” Use an indeterminate indicator unless progress can be measured. Do not expose raw JSON or claim stages that were not performed.

**Buttons/features:** **Back to photo**, **Cancel**, and **Retry** after failure. Ignore late responses from cancelled or replaced captures so an older result cannot overwrite the current photo.

**States:** Reading, comparing, timeout, provider unavailable, upload failure, no connection. Online recognition works for guests without account sign-in. If offline before recognition, offer **Keep photo on this device** as an unrecognized draft; do not invent a completed match.

### 4.6 Recognition review / card preview

Show a foil-style preview generated from this photo, with route, matched sign SVG, and optional model. Station and time editing are secondary and do not interrupt the normal successful path. Reference artwork may appear here as the matched sign emblem or in a small **Sign details** disclosure, not as a browseable collection of future cards.

| Result | Presentation | Actions |
|---|---|---|
| Matched variant, first encounter | Card preview; “First time collecting this sign” | **Save card**, Retake |
| Matched variant, repeat encounter | A new personal card preview; existing route + variant encounter count | **Save card**, View previous encounters, Retake |
| Route known, variant uncertain/unmatched | Preserve route/photo; “Sign variant not identified” | **Try again**, Adjust crop; proposed **Save with variant unknown** |
| Route unclear | Explain the unclear lettering | **Retake**, Choose another photo |
| No sign / unusable photo | Clear, short reason | **Retake**, Adjust crop |

**Secondary controls:** **Add station**, **Edit capture time**, **View full photo**, **Sign details**, and **Something looks wrong**. Unknown train model does not block saving or require the user to identify it.

“Something looks wrong” means a recognition mistake: for example, the app reads A as R, chooses a circular sign when the photo shows a diamond, or labels an uncertain model as R160. The simplest proposed actions are **Retake**, **Adjust crop and retry**, and **Set train model to Unknown**. Manual route/variant correction is optional and still undecided; the user does not need to understand catalog maintenance.

A card's uniqueness comes from its encounter/photo and attributes. Do not call an unmatched sign rare or assume it establishes a new SVG reference variant. Saving unresolved cards and their later handling remain open decisions; design one neutral uncertain state without requiring a moderation workflow.

**Save behavior:** Signed-in users save to their account. Guests see section 4.1. Show disabled/loading save controls while persisting; retain the same encounter ID on retry.

### 4.7 Card reveal

Reveal the personal card after a successful account or device save. Use a foil border, restrained reflective accents, and optional short tilt/shimmer animation. Keep the actual photo and sign legible. Foil is the shared visual theme, not a rarity level.

**Buttons/features:** **View card**, **Scan another**, **My Collection**, optional **Skip animation**.

Show **Saved on this device** or **Saved to your account**. “First encounter” and “Another encounter” can celebrate progress without implying different rarity. Device-local cards receive the same visual treatment as account cards. Respect reduced motion and provide a static reveal.

### 4.8 My Collection — grouped by route

Use a route overview with route labels and counts. Opening a collected route shows a grid of its separate personal cards. Different photos, sign appearances, and train models remain separately visible; repeat variants are not collapsed into one collectible tile.

For an uncollected supported route, show its route label with a **question-mark placeholder** and “No cards yet.” This represents an uncollected route, not a hidden pre-generated card or a promise of a known number of variants. Tapping it opens a simple empty-route state with **Scan a sign**. Do not force recognition to the selected route.

**Buttons/features:** **Scan**, route search/filter, **All routes / Collected / Not yet collected**, sort cards by recent capture/save, and **Clear filters**. Train-model or variant filtering within a route is optional. Tap a personal card to open that exact encounter.

**Counts:** Total personal cards, routes with cards, and optional distinct matched route + variant count. Encounter counts use route + variant regardless of model. Do not present the reference SVG inventory as a finite personal-card completion target.

**States:** Entirely empty collection with route placeholders, populated route, empty route, filtered-empty results, loading/error, local save status, account save status, offline local browsing. Unrecognized drafts have their own small section and do not count as identified routes. Local card/photo storage must survive refresh before calling the feature “saved.”

### 4.9 Personal card detail / full-photo viewer

Display a large foil-style card and readable details using the eight fields in section 2. Show its exact matched SVG shape/color/style and identified model or Unknown. **View full photo** opens the preserved photo with close/back and accessible zoom where supported.

**Buttons/features:** **View full photo**, **Previous encounters** (same route + variant), **Edit capture details**, **Something looks wrong**, **Delete card**, **Back to route**, **Scan another**.

**Sign details** may expand brief reference information and source credits needed for the SVG used on this card. Attribution is secondary information within the card view; there is no reference-catalog destination. Train model remains separate from the SVG style-family name: a reference labeled R62A does not by itself prove the photographed train is an R62A.

Deletion describes the affected card/photo and asks for confirmation. It removes that encounter, not every card on the route. Preserve separate cards if a match is later corrected. Suggested behavior: recompute grouping/counts and explain the correction in detail view; formal pending approval/rejection rules remain open.

**States:** Device-local or account-backed, unknown model, estimated/unknown time, unmatched variant if supported, image unavailable, save/edit failure, deletion confirmation.

### 4.10 Minimal account / settings panel

This replaces the earlier reference-catalog screen in the inventory; account setup is secondary to capture and collection.

**Guest:** Show “Cards saved on this device,” optional **Sign in / Create account**, help/privacy, and reduced-animation preference. Do not suggest a guest already has a recoverable online account.

**Signed in:** Show account identity and **Sign out** when authentication is implemented. Detailed provider settings can be designed later. Public sharing and trading controls are outside current scope.

**Open:** Whether signing in offers a one-time import of existing device cards. Proposed UI: explicit **Add device cards to my account** with progress and retry. Do not promise automatic synchronization until implemented; preserve local copies until confirmed saved, and deduplicate retries by encounter ID.

## 5. Device saves, connectivity, and frontend data needs

“Save on this device” means durable browser storage for the photo, card metadata, and needed matched-sign asset/thumbnail; a temporary preview URL is insufficient. It is available without an account and can work without a connection after the recognition result is already available. Storage failure must preserve the current preview and provide retry rather than claim success.

If the user starts a new capture offline, keep the photograph as a draft for later recognition. Full offline AI identification is not assumed. Account saves and online recognition need a connection. Do not call a local card account-backed or synced merely because the user later signs in.

Suggested separate frontend fields:

```text
encounterId / cardId: stable per personal encounter, reused on retry
routeId: string | null
variantId: stable matching SVG/sign ID | null
variantArtwork: displayable SVG/thumbnail + shape/color/style + attribution
trainModel: string | null (display null as Unknown)
trainModelSource: recognition | user | unknown
photo / signCrop: separate image references
capturedAt: timestamp or timezone-uncertain local time | null
captureTimeSource: exif | shutter | estimated | user | unknown
savedAt: timestamp
station: optional coarse station label
firstCollectedAt / encounterCount: derived for route + variant
recognitionState: matched | uncertain | unmatched | unusable | not_a_sign
collectionStatus: first_encounter | repeat_encounter | unknown
storageState: unsaved | saving_device | saved_device | saving_account | saved_account | save_failed
evidence: supported traits and limitations, separate from storage state
```

This is a UI data outline, not a new implemented API. Adapt the actual recognition response to it. Keep internal IDs for persistence and matching without displaying collectible serial numbers. Status fields describe match/storage behavior; they do not imply a confirmed current train trip, rarity, or manufacturer certification.

## 6. Shared design requirements

- Trading-card foil aesthetic throughout cards and reveals; route grouping remains easy to scan.
- Large one-handed controls, clear labels, keyboard access, visible focus, and sufficient contrast.
- Route identity appears as a letter/number as well as color. Distinguish circle/diamond shapes accurately.
- Plain readable card details and useful photo descriptions support screen readers.
- Announce recognition completion, save success, and errors accessibly; keep motion optional.
- Camera/permission failures always have a photo-picker path.
- Preserve unsaved work through account prompts, retries, and navigation where possible; warn before discarding meaningful work.
- Keep recognition uncertainty, repeat encounters, and device/account saving visually separate.
- Explain AI photo processing concisely; do not expose API keys, raw model output, or filesystem paths.
- Source credits for displayed reference artwork can live inside Sign details; no public reference-publication flow is needed.

## 7. Design acceptance criteria

- Launch reaches Capture without an account/welcome gate; Home is reachable from the camera.
- A guest can photograph, recognize, preview, and save a card on the device, then retrieve it and its photo after refresh.
- Guest Save offers sign-in, account creation, or device save without losing the current card.
- Each saved encounter creates its own card; route groups contain all corresponding personal cards.
- Uncollected routes have question-mark placeholders, with no invented pre-generated card previews.
- Matching SVG shape, color, and style are distinguishable; model can remain Unknown.
- All eight requested card fields are represented; full-photo viewing works independently of the sign crop.
- EXIF, shutter-time fallback, and estimated/unknown upload time have distinguishable behavior.
- Route + variant encounter counts are unaffected by a different train model or a repeated save request.
- No rarity, editions, public sharing, trading, or catalog-browsing screens appear in the core mockups.
- Offline draft, saved-device, saved-account, failed-save, and uncertain-recognition states are distinct.
- Reduced-motion, keyboard, screen-reader, camera-denial, and storage-failure designs are included.

## 8. Remaining decisions

1. Can a readable route with an unmatched variant be saved as a card with variant Unknown, or only as a draft? Suggested: preserve the photo either way; do not force a made-up match.
2. If a saved match is later corrected, how should the card explain it? Suggested: preserve the encounter/photo, update metadata and counts, and show a short change notice. Formal approval/rejection/merge workflows are not yet agreed.
3. Should “Something looks wrong” include manual route/variant selection, or just retake/crop/retry and Unknown model? Suggested starting point: the simpler recovery actions.
4. Which authentication provider and account/device import behavior will be used? Defer provider-specific screen design.
5. What supported route list drives placeholders, including historical routes and shuttles? Derive it from agreed product scope rather than a hard-coded count.
6. Should a first-unlocked date survive deletion of all cards for that variant? Current suggested calculation uses remaining saved encounters; a permanent unlock history would be a separate rule.

## 9. Mockup handoff priority

1. Design one foil personal card with its photo, route/sign artwork, model/Unknown, and readable detail view.
2. Build Capture as the entry screen with Home navigation, then Preview and Recognition Review.
3. Design the guest save-choice sheet and successful device/account reveal states.
4. Build My Collection with route groups, multiple separate cards within one route, and question-mark empty routes.
5. Add Card Detail/full photo and a simple Home using the same components.
6. Add uncertain recognition, no connection, storage failure, and failed account-save examples. Authentication-provider screens can wait.

The prototype should demonstrate a first capture saved locally, another card for the same route/sign variant on a different train model, an uncollected route placeholder, and a failed recognition recovery. Notes incorporate the user's current decisions and readable messages from “Explain status fields and attribution”; assistant replies in that chat were unavailable content references.
