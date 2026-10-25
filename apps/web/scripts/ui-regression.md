# TrainDex UI regression checklist

Last run: October 25, 2026. Use `pnpm dev` from `apps/web`, then the **States** menu. All accounts, recognition, saves, imports, and drafts below are simulations. Reload resets data.

This is a repeatable manual browser suite. It does not replace automated browser tests or real-device testing.

## Core recovery checks

| Test | Steps | Expected result | Latest run |
| --- | --- | --- | --- |
| Invalid image bytes | Choose a file named `.png` containing plain text. | Decode error; stay on Capture; picker remains usable. | Passed with a corrupt-file fixture. |
| Photo loading/error | Sample photo → States → Photo preview state: Loading, then Error. | Explicit status/error; Recognize disabled; Retry opening photo restores the image. | Passed. |
| Crop keyboard | On Check photo, focus the crop and use arrow keys. Increase crop size and move toward edges. | Position announced; crop constrained to photo; no horizontal page overflow. | Keyboard movement and image-bound check passed; physical touch review pending. |
| Browser Back/discard | Sample photo → browser Back → Keep working/Escape. | Confirmation; remain on the same photo and crop; controls work afterward. Tab wraps within confirmation. | Passed. |
| Previous encounters | Choose Repeat encounter → recognize → enter a station → View previous encounters → open a prior card → browser Back. | Close inspection, return to unsaved review with station/photo/crop unchanged; focus returns to launch button. | Passed. |
| Uncertain match | Choose Uncertain variant → recognize → Adjust crop. | Dedicated crop shortcut; photo retained; no invented variant count. | Passed. |
| Service unavailable | Choose Recognition service unavailable → recognize. | Separate service-error explanation, retry/photo/crop recovery. | Passed. |
| Detail edit failure | Open a saved card; enable Next detail edit fails once; edit station and Apply. | Applying state; fields disabled; failure leaves proposed station in form; saved metadata unchanged. | Passed. |
| Detail retry/Back | After failed edit, browser Back → Keep working → Retry changes. | Discard confirmation protects edits; retry applies the same values and announces success. | Passed. |
| Deleted history entry | Delete one demo card, then browser Back. | Card unavailable recovery screen; other encounters remain. | Passed. |
| Interrupted import | Simulated sign-in → Settings → import → Start → Stop and return. | Confirmation pauses processing; Stop retains local cards and completed import IDs; re-enter to retry unfinished cards. | Stop/re-entry passed; completed-ID retention also covered by earlier partial-import run. |
| Local dialogs | Open Delete card or Discard draft; Tab, Shift+Tab, Escape. | Only dialog exposed in accessibility tree; safe cancel focused first; keyboard stays within dialog; background active after close. | Delete and global discard checked; draft uses the same dialog. |

## Collection view switching

1. Open Collection: **All cards** is selected by default and is the left button. All three sample encounters appear separately, including both route A cards.
2. Verify **Group by route** is the right button, and no Filter by route or Sort cards dropdown is present.
3. Search A: two cards. Open a card. Back to Collection restores All cards and the search query.
4. Search F: no matching cards and a Clear search action. Clear search returns all cards.
5. Choose Group by route: route placeholders and group-only All routes/Collected/Not yet filters appear. Search is shared between views.
6. Check 320px content width: the view buttons and direct card grid stay within the page.

View/search preferences are in-memory and reset on reload. Cards use recent capture order; only the separate route-detail screen retains its existing capture/save sorting controls.

## Layout and accessibility

Use States → **Preview width**: 320, 375, 480px. Use **Text size**: 100%, 150%, 200%. These controls change app content width and root text size; they do not emulate mobile hardware or its keyboard.

- Inspect Capture, Check photo, recognition recovery, Review, Collection, Detail, Settings, and dialogs. Scroll to all recovery actions.
- Choose photo stays on one line; the small-screen shutter and photo buttons reflow. The simulated-viewfinder label must not cover Home.
- Long station names wrap inside the card and metadata rows. Buttons and status chips wrap without clipping.
- Check loading text against the preview background. Check foreground/background contrast and visible keyboard focus.
- Confirm route labels do not rely on color. Unknown route/sign/model/time remain explicit.
- Settings → Reduced motion uses native radio behavior (Tab into group, arrow keys between options). Confirm card and loading animations stop.
- Browser Back closes the top dialog before attempting page navigation. Browser Forward must not restart old recognition without a current draft.
- Check history after sign-out: account-only cards must show an unavailable/session recovery screen rather than their detail data.

At 320px with 200% text, a DOM check confirmed the detail screen scroll width equals its 320px content width and no detail panels overflow horizontally after the encounter-row/error-copy fixes. Browser checks covered narrow content widths, enlarged text, keyboard focus containment/restoration, crop position semantics, and accessibility-tree isolation. Native motion radios responded to arrow keys; computed styles confirmed `animation-name: none` for card, interior, sheen, and interior pseudo-element in Reduce mode. Primary palette contrast calculations passed 4.5:1 for the sampled normal-text pairs: ink/paper 13.75, paper/teal 5.40, white/error 6.66, white/success 6.02, ink/gold 9.56, ink/teal button 7.92. These calculations are not a full audit of photos, translucent layers, or every state.

## Remaining release checks

- Real phone portrait/landscape, touch crop/zoom, virtual keyboard, camera permission UI.
- Actual screen-reader speech with VoiceOver/TalkBack/NVDA, including native date controls.
- A large collection/draft list and high encounter counts.
- Automated browser regression coverage and full contrast/accessibility audit.
- Integration tests for persistent storage, network conditions, real OAuth, and cross-device accounts.
