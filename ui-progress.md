# TrainDex UI progress

**Delivery priority (October 25, 2026):** mobile-browser optimization and real guest flow first; Expo is deferred. You own browser UI/storage/wiring; your friend owns the backend including recognition. Progress below describes the React DOM prototype, not a native app. See [backend implementation TODO](backend-implementation-todo.md).

Last reviewed: October 25, 2026  
Frontend: `apps/web`  
Design references: [frontend-spec.md](frontend-spec.md) and [spec.md](spec.md)

## Current status

The main screen inventory and the small recovery/navigation gaps are implemented as an interactive prototype. The UI follow-up includes browser history, keyboard/dialog behavior, and narrow/enlarged-text reflow fixes. Remaining UI work is deeper device/accessibility QA, stress cases, and automated regression coverage. Real camera capture, recognition, accounts, and durable storage are separate integration work.

**“Complete” below means prototype UI complete.** Cards, drafts, sign-in, saves, and import progress live in memory and reset on refresh. A working save animation does not satisfy the durable-save acceptance criteria in the specifications.

## Completed UI

| Area | Implemented behavior |
| --- | --- |
| Visual system | Uppercase Courier typography, larger bold headings, readable values, pixel buttons/icons, outlined Settings gear, floating logo, consistent card-detail layout. |
| Foil cards | User/sample photography, seeded interior patterns, moving color gradients, bright foil borders, restrained sparkles, 3.325-second animation cycles, reduced-motion support. |
| Capture | Initial screen, Home access, simulated shutter/viewfinder, real photo-picker input, sample photo, camera-denial recovery, invalid-file message, short AI-processing disclosure. |
| Preview and crop | Full-photo preview, draggable and keyboard-adjustable crop, crop-size control, reset, small-crop warning, retake, replacement photo. Crop shade stays within the image. |
| Recognition progress | Simulated stages, timeout and retry, back to photo, cancellation with preserved photo/crop. |
| Recognition review | First and repeat encounters, uncertain variant, unclear route, Unknown model, station/time editing, estimated/unknown time labels, sign details, full photo, retake/crop/retry recovery. |
| Additional recognition outcomes | No sign/non-train, unusable blur, upload failure, and cancelled-processing states with recovery actions. |
| Guest save choice | Sign in, create account, device-save choice, return to card, subsequent device-save shortcut. |
| Account flow | Shared optional Continue with Google demo from Settings and guest Save; creating/returning-user explanation, loading, success, cancellation, provider error, session expiry. Photo and details remain available. Signing in alone does not save the card. |
| Import | Explicit device-card import choice, destination explanation, per-card progress, completion, partial failure, retry, retained local copies, encounter-ID deduplication in the demo. |
| Photo drafts | Keep an unrecognized photo draft, list/open/resume/discard, discard confirmation, Home/Collection/Settings access, waiting-for-connection labels. Drafts do not count as cards or routes. |
| Save and reveal | Simulated device/account save, failure and retry, device fallback after account failure, first/repeat reveal, skip animation, clear prototype limitations. |
| Home | Session totals, recent cards, Capture/Collection/Settings access, optional sign-in. |
| Collection | All cards is the default and leftmost view button; Group by route is on the right, directly below search. All cards previews every separate encounter without extra route/sort dropdowns. Search, group-only status filters, question-mark placeholders, and empty states remain available. View/search preferences survive navigation within the session. |
| Card detail | Card fields, sign attribution, previous encounters, full photo with zoom, staged detail edits and explicit Apply, single-card delete confirmation. |
| Loading and photo failure | Collection/detail loading and error previews with retry; missing-photo fallback keeps metadata readable, with photo retry. |
| Unsaved work | Discard confirmation for retake/photo replacement and unapplied detail edits; browser refresh/leave warning for current work and session drafts. |
| Settings | Demo account/device status, shared sign-in, sign-out, import access, motion preference, basic help/privacy copy. |
| State previews | Existing States menu extended to cover the added outcomes, offline fixture, partial import failure, missing photo, and loading/error fixtures. |

## Remaining UI work

### Completed in the UI follow-up

- [x] **Collection view switching:** All cards / Group by route controls below search, with All cards first and selected by default; direct encounter grid and search recovery. Extra route/sort dropdowns were removed after design feedback. Cards opened from the direct grid return to the preserved collection view instead of forcing a route group.

- [x] **Photo loading/decode failure:** selected files are decoded before replacing current work. Capture reports real decode errors; Preview/drafts show loading/error/retry. Recognition waits for a readable preview. States provides loading/error fixtures.
- [x] **Detail edit saving/failure:** applying state, disabled repeated submission, retained edits on failure, retry, explicit session-only success feedback, and keyboard focus feedback.
- [x] **Previous encounters from recognition review:** inspect prior encounter cards in a dialog without leaving or saving the current review; browser Back/Escape returns to the preserved card.
- [x] **Uncertain-result crop shortcut:** direct Adjust crop alongside Try again and Save with variant unknown.
- [x] **Recognition failure distinctions:** provider unavailable is separate from timeout and upload failure, with existing recovery actions reused.
- [x] **Navigation audit/fixes:** browser Back/Forward connected to screen history; unsaved-work and busy-edit guards; top-dialog dismissal; unavailable/deleted/account-hidden card recovery; explicit import-stop confirmation with processing paused during the decision. History stores destinations, not photo data.
- [x] **Copy consistency:** keep demo/session limits explicit, show service/decode/edit failures distinctly, and retain local/account/import distinctions.

### Then: polish and verification

- [x] Add repeatable 320/375/480px content-width and 100/150/200% text controls; inspect key flows in the desktop browser. Fix capture-label overlap, narrow-control wrapping, and loading-text contrast.
- [ ] Finish real-phone landscape/short-viewport/virtual-keyboard checks; the width controls do not emulate a device.
- [x] Check long station labels and unknown/missing metadata in the reviewed flows; fix previous-encounter and error-message overflow at 320px with doubled text.
- [ ] Stress-test high encounter counts and collections with many cards/drafts.
- [x] Improve keyboard/modal behavior: trap focus at document level, hide background branches, restore launcher focus, handle replaced modal controls, use native motion radios, and describe the two-dimensional crop as a keyboard-adjustable group rather than a one-dimensional slider. Verify key dialogs and browser navigation in the accessibility tree.
- [ ] Confirm actual screen-reader speech on supported devices, including native date inputs.
- [x] Measure primary palette normal-text contrast (sampled pairs 5.40:1–13.75:1), fix photo-loading text contrast, and verify native motion-radio keyboard behavior and stopped card/interior/sheen animations in Reduce mode.
- [ ] Complete the full contrast/translucent-photo and device accessibility audit; verify all motion states on target devices.
- [x] Record a [repeatable manual browser regression suite](apps/web/scripts/ui-regression.md) and follow-up results.
- [ ] Add automated browser regression coverage. Current execution remains manual plus typecheck/build.
- [ ] Recheck touch crop positioning and full-photo zoom on real mobile browsers.

These are follow-up items, not a requirement to rebuild the existing screens.

## Integration-dependent work

These features still prevent the prototype from being a production-ready app. They should not be counted as missing screen designs.

- [ ] Real camera permission/capture behavior; show switch-camera or flash controls only when supported.
- [ ] Broader photo-format/HEIC support and real EXIF extraction, including timezone uncertainty and timestamp fallbacks. Browser-supported photo decoding and invalid-image recovery are implemented.
- [ ] Real recognition/upload requests, job progress, cancellation, and errors driven by service responses.
- [ ] Real matched SVG artwork, source credits, supported routes, and train-model results. The current route list and sign artwork are samples.
- [ ] Durable device cards and drafts, including photos and sign assets; refresh recovery and actual storage-full/unavailable handling.
- [ ] Google authentication and real session handling, including preserving the card through a redirect and restoring the intended next step.
- [ ] Durable account saves, photo storage, account collections, and confirmed-success receipts.
- [ ] Real import with saved per-item progress, restart/resume, duplicate handling, and retained local copies until success is confirmed.
- [ ] Actual network detection, offline photo availability, and PWA caching. The current offline control is a fixture; remote sample photos still need internet.
- [ ] Persist preferences and replace prototype controls/sample data for release.

## Product decisions still open

| Decision | Current prototype behavior |
| --- | --- |
| Save a readable route with an unknown sign variant? | Allowed; variant encounter counts are omitted. Final policy remains open. |
| Manual route/variant correction? | Retake, adjust crop/retry, or set model to Unknown. Manual route/variant selection is deferred. |
| Explain a corrected saved match? | No correction-history/change-notice UI yet; depends on the correction policy. |
| Supported routes, historical signs, shuttles? | Hard-coded sample route list; final scope needs agreement. |
| Preserve first-unlock history after deleting all encounters? | Counts and first-collected date derive from remaining cards. A permanent history rule is undecided. |
| Extra account controls? | Minimal sign-in/sign-out/import only. Account deletion/export and detailed privacy controls need scope before additional screens. |

The technical spec proposes Google sign-in and explicit import; their prototype screens now exist even though older frontend-spec text defers provider-specific design.

## Validation recorded so far

The implementation session completed:

- [x] `pnpm typecheck` in `apps/web`.
- [x] `pnpm build` in `apps/web`.
- [x] `git diff --check`.
- [x] Local browser inspection of account and draft layouts.
- [x] Sign-in from Home/Settings and guest Save; return to the card with entered station details preserved; explicit account save afterward.
- [x] Import partial failure, retry of the failed item, and completion with local copies retained.
- [x] Draft creation/opening, offline recognition blocking, and cancelling unsaved-photo discard.
- [x] Upload-failure recovery screen, recognition timeout/retry, and camera-denial photo-picker fallback UI.
- [x] Account-save failure followed by device-save fallback and reveal.
- [x] Staged detail editing, navigation discard confirmation, keeping edits, and Apply.
- [x] Missing-photo fallback/retry and detail load-error/loading/retry.
- [x] Collection route placeholders, empty-route recovery, and existing delete confirmation.

Follow-up checks also covered an actual corrupt-image file, browser Back/discard cancellation, keyboard dialog wrapping and focus restoration, previous-encounter inspection with entered details retained, edit applying/failure/retry, deleted-card history, provider-unavailable recovery, and import stop/re-entry. See the [regression checklist](apps/web/scripts/ui-regression.md) for steps and limitations.

This is not exhaustive device/accessibility testing. All recognition fixtures and every authentication error variant have not been individually exercised end to end. Durable storage, real OAuth, offline persistence, and cross-device account behavior remain unverified because they are not connected.

## Scope boundaries

No public catalog, trading, rarity, sharing, battle, or reference-publishing screens are planned. Optional crop rotation, train-model filters, and additional camera controls should not be treated as required missing screens without a product need.

## Updating this tracker

Check off remaining items only after implementing and verifying them. Keep prototype completion separate from integration completion, record verification limitations, and update the review date. Do not use a single percentage that mixes UI coverage with production readiness.

## Mobile-browser optimization pass — October 25, 2026

- [x] Add viewport cutout support without disabling pinch zoom; request keyboard-aware viewport resizing where supported.
- [x] Add safe-area spacing for the prototype bar, bottom navigation, save/confirmation overlays and full-photo viewer.
- [x] Keep navigation in normal document flow while a text field is focused, reducing sticky keyboard overlap.
- [x] Reflow collection cards to one column when two readable previews cannot fit; retain two columns at wider phone widths.
- [x] Tighten narrow collection summary spacing and navigation labels; expand prototype controls to 44px touch targets.
- [x] Add mobile search keyboard hints and disable route-search autocorrection/spell checking.
- [x] Bound confirmation/sheet height and allow scrolling in short viewports or enlarged text.
- [ ] Verify Safari/iOS and Chrome/Android camera permissions, browser chrome/virtual keyboard, cutouts and landscape on actual phones. Desktop width previews do not prove these device behaviors.

Recognition, account flows and saved collections are still simulated/in memory; this layout pass does not implement backend wiring or durable IndexedDB storage.

Validation for this pass: web typecheck/build passed; browser content previews checked at 320px and 375px, including 320px with 200% text, search-focus navigation behavior, grouping and opening/cancelling a confirmation. Real-phone behavior remains pending.

Full-photo viewer fix: explicit fitted image dimensions replace the old 200%-wide wrapper. 2× enlarges the actual photo, preserves the visible center, and provides a contained scroll/pan region; 1× restores the fitted frame. Zoom waits for image dimensions; resize observation recomputes fitting. Browser verification and typecheck/build cover the fix; physical touch/rotation validation remains pending.

Crop touch interaction: two-pointer pinch/spread now resizes the 3:2 crop while one-pointer dragging moves it. Gestures can start anywhere on the photo; pointer capture keeps tracking outside the crop, and lifting/cancelling a finger rebases the remaining drag. Size/position use the same photo bounds as the slider/keyboard controls. Six geometry tests cover translation, pinch in/out, combined movement, one-finger continuation, edge/size bounds and coincident pointers. Actual two-finger iOS/Android verification remains pending.
