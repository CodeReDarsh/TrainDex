import { useDialog } from './dialog'
import { useEffect, useRef, useState } from 'react'
import { usePicker } from './capture'
import { Hatch, HatchCutscene } from './pets'
import { SparkBurst } from './steam'
import type { ReactNode } from 'react'
import {
  type Card,
  type Draft,
  MODELS,
  TIME_SOURCE_LABEL,
  VARIANTS,
  encounterInfo,
  fmtDate,
  nowLocal,
} from './data'
import {
  Chip,
  Dialogue,
  Disclosure,
  Field,
  Panel,
  PanelTitle,
  PixelIcon,
  PxButton,
  ScreenHeader,
  Sign,
  TrainCard,
} from './ui'

/* ---------- Confirm dialog ---------- */
export function Confirm({
  title,
  body,
  confirm,
  cancel = 'Keep it',
  danger,
  onConfirm,
  onCancel,
}: {
  title: string
  body: ReactNode
  confirm: string
  cancel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialog = useDialog(true, onCancel)
  return (
    <div ref={dialog} tabIndex={-1} className="confirm-overlay fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-6">
      <div role="alertdialog" aria-modal="true" aria-labelledby="cf-t" className="px-panel w-full max-w-[420px] p-5">
        <h2 id="cf-t" className="font-pixel text-[24px] font-bold leading-tight">
          {title}
        </h2>
        <div className="mb-4 mt-2 text-[1.0625rem]">{body}</div>
        <div className="flex flex-col">
          <PxButton v={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirm}
          </PxButton>
          <PxButton data-initial-focus onClick={onCancel}>
            {cancel}
          </PxButton>
        </div>
      </div>
    </div>
  )
}

/* ---------- 4. Recognition review ---------- */
export function Review({
  draft,
  cards,
  signedIn,
  deviceDefault,
  onChange,
  onSave,
  onRetake,
  onAdjust,
  onTryAgain,
  onFullPhoto,
  onSignIn,
  onPhoto,
}: {
  draft: Draft
  cards: Card[]
  signedIn: boolean
  deviceDefault: boolean
  onChange: (p: Partial<Draft>) => void
  onSave: () => void
  onRetake: () => void
  onAdjust: () => void
  onTryAgain: () => void
  onFullPhoto: () => void
  onSignIn: () => void
  onPhoto: (url: string) => void
}) {
  const picker = usePicker(onPhoto)
  const [previous, setPrevious] = useState(false)
  const r = draft.result
  const timeId = 'cap-time'
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  if (!r || (r.kind !== 'matched' && r.kind !== 'uncertain')) {
    const reason = r?.kind === 'no-sign' ? ['No train sign found', 'We could not find a subway route sign in this photo. Frame the sign or choose another train photo.']
      : r?.kind === 'blurry' ? ['Photo too blurry', 'The sign is too blurred to read. Hold steady, move closer, and avoid glare.']
      : r?.kind === 'upload-failed' ? ['Upload did not finish', 'The simulated upload failed before recognition finished. Retry with this photo or choose another.']
      : r?.kind === 'unavailable' ? ['Recognition unavailable', 'The recognition service is temporarily unavailable. Your photo is still here. Retry later or adjust the crop.']
      : r?.kind === 'cancelled' ? ['Processing cancelled', 'Recognition stopped. No card was created. Your photo and crop are still here.']
      : ['Route unclear', 'We could not read the route lettering. Glare or a tight crop can hide it.']
    return (
      <div className="flex flex-1 flex-col">
        {picker.input}
        {picker.busy && <Dialogue live title="Opening photo">Checking your selected photo…</Dialogue>}
        <ScreenHeader title="Recognition result" onBack={onAdjust} />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <Dialogue tone={r?.kind === 'cancelled' ? 'info' : 'error'} live title={reason[0]}>
            <p>{reason[1]} This photo is only held in this demo session.</p>
          </Dialogue>
          <Panel className="!p-2">
            <img src={draft.photo} alt="Your photo" className="block max-h-[40dvh] w-full object-contain" />
          </Panel>
          <div className="mt-auto flex flex-col">
            <PxButton v="primary" size="lg" icon="camera" onClick={onRetake}>
              Retake
            </PxButton>
            <PxButton icon="photo" onClick={picker.open}>
              Choose another photo
            </PxButton>
            <PxButton onClick={onAdjust}>Adjust crop</PxButton>
            <PxButton onClick={onTryAgain}>Retry recognition</PxButton>
            {picker.error && <Dialogue tone="error">{picker.error}</Dialogue>}
          </div>
        </main>
      </div>
    )
  }

  const uncertain = r.kind === 'uncertain'
  const preview: Card = {
    id: draft.id,
    route: r.route,
    variantId: r.variantId,
    model: draft.model,
    photo: draft.photo,
    captureAt: draft.captureAt,
    timeSource: draft.timeSource,
    savedAt: nowLocal(),
    station: draft.station,
    storage: 'device',
  }
  const existing = encounterInfo(cards, preview)
  const v = r.variantId ? VARIANTS[r.variantId] : null
  const saveLabel = uncertain
    ? 'Save with variant unknown'
    : signedIn
      ? 'Save to my account'
      : deviceDefault
        ? 'Save on this device'
        : 'Save card'

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="Review card" onBack={onAdjust} backLabel="Back to crop" />
      <main className="flex flex-1 flex-col gap-4 p-4">
        <h2 ref={heading} tabIndex={-1} className="sr-only">
          Recognition finished. Route {r.route}.
        </h2>

        {uncertain ? (
          <Dialogue tone="warn" live title="Sign variant not identified">
            We can see route {r.route}, but not which sign appearance it is. You can try again, adjust the crop, or save
            with the variant left unknown. No encounter count is made up.
          </Dialogue>
        ) : existing ? (
          <Dialogue tone="ok" live title="Another encounter">
            This will be a <b>new personal card</b>. You already have {existing.count} saved with this sign (
            {v?.name}). After saving: {existing.count + 1}.
          </Dialogue>
        ) : (
          <Dialogue tone="ok" live title="New sign">
            First time collecting this sign.
          </Dialogue>
        )}

        {existing && <PxButton onClick={() => setPrevious(true)}>View previous encounters</PxButton>}
        <div className="px-1">
          <TrainCard card={preview} cards={[...cards, preview]} sparkles={!uncertain} />
        </div>

        <Panel className="flex flex-col gap-4">
          <PanelTitle>Card details</PanelTitle>

          <div className="flex items-center gap-3">
            <Sign route={r.route} variantId={r.variantId} unknown={!v} size={45} />
            <div className="min-w-0 flex-1">
              <div className="font-pixel text-[18px] font-bold">Route {r.route}</div>
              <div className="text-[1rem]">{v ? v.style : 'Sign appearance not matched'}</div>
            </div>
          </div>

          <Field
            label="Train model"
            id="model"
            hint={
              draft.modelSource === 'recognition'
                ? 'Suggested from your photo. Change it any time.'
                : 'Optional. Unknown never blocks saving.'
            }
          >
            <select
              id="model"
              className="px-input"
              value={draft.model ?? ''}
              onChange={(e) => onChange({ model: e.target.value || null, modelSource: e.target.value ? 'user' : 'unknown' })}
            >
              <option value="">Unknown</option>
              {MODELS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>

          <Field
            label="Capture time"
            id={timeId}
            hint={
              draft.timeSource === 'estimated' ? (
                <span>
                  <Chip tone="gold">Time estimated — edit</Chip> Uploaded photo had no usable date.
                </span>
              ) : (
                TIME_SOURCE_LABEL[draft.timeSource]
              )
            }
          >
            <input
              id={timeId}
              type="datetime-local"
              className="px-input"
              value={draft.captureAt ?? ''}
              onChange={(e) =>
                onChange({ captureAt: e.target.value || null, timeSource: e.target.value ? 'user' : 'unknown' })
              }
            />
            <div>
              <PxButton
                size="sm"
                inline
                className="!mb-2"
                onClick={() => onChange({ captureAt: null, timeSource: 'unknown' })}
              >
                Time unknown
              </PxButton>
            </div>
          </Field>

          <Field label="Station (optional)" id="station" hint="A coarse label only. Location data is never read from your photo.">
            <input
              id="station"
              className="px-input"
              placeholder="e.g. Jay St–MetroTech"
              value={draft.station}
              onChange={(e) => onChange({ station: e.target.value })}
            />
            {draft.station && (
              <div>
                <PxButton size="sm" inline className="!mb-2" onClick={() => onChange({ station: '' })}>
                  Remove station
                </PxButton>
              </div>
            )}
          </Field>

          <PxButton icon="photo" onClick={onFullPhoto}>
            View full photo
          </PxButton>
        </Panel>

        {v && (
          <Disclosure title="Sign details">
            <div className="flex items-center gap-3 pb-2">
              <Sign route={v.route} variantId={v.id} size={45} />
              <div>
                <b>{v.name}</b>
                <div>{v.style}</div>
              </div>
            </div>
            <dl className="mt-2 flex flex-col gap-2">
              <div><dt className="inline font-bold">Shape: </dt><dd className="inline">{v.shape}</dd></div>
              <div><dt className="inline font-bold">Color: </dt><dd className="inline">{v.color}</dd></div>
              <div><dt className="inline font-bold">Credit: </dt><dd className="inline">{v.credit}</dd></div>
            </dl>
            {v.image && <img src={v.image} alt={`Reference picture: ${v.name}`} loading="lazy" className="sign-ref mt-3" />}
            <p className="mt-3 text-[0.875rem] text-ink/80">The sign style does not prove which train model you photographed.</p>
          </Disclosure>
        )}

        <Disclosure title="Something looks wrong?">
          <p className="mb-2">Recognition can make mistakes. Pick a simple fix:</p>
          <div className="flex flex-col">
            <PxButton size="sm" icon="camera" onClick={onRetake}>
              Retake
            </PxButton>
            <PxButton size="sm" icon="search" onClick={onAdjust}>
              Adjust crop and retry
            </PxButton>
            <PxButton
              size="sm"
              disabled={draft.model === null}
              onClick={() => onChange({ model: null, modelSource: 'unknown' })}
            >
              Set train model to Unknown
            </PxButton>
          </div>
        </Disclosure>

        <div className="mt-2 flex flex-col">
          {uncertain && (
            <>
              <PxButton size="lg" icon="search" onClick={onTryAgain}>Try again</PxButton>
              <PxButton onClick={onAdjust}>Adjust crop</PxButton>
            </>
          )}
          <PxButton v="primary" size="lg" icon="check" onClick={onSave}>
            {saveLabel}
          </PxButton>
          {!signedIn && deviceDefault && (
            <button type="button" onClick={onSignIn} className="mb-3 min-h-[44px] text-center text-paper underline underline-offset-4">
              Sign in to save to an account instead
            </button>
          )}
          <PxButton icon="camera" onClick={onRetake}>
            Retake
          </PxButton>
        </div>
      </main>
      {previous && <PreviousEncounters cards={cards.filter(c => c.route === r.route && c.variantId === r.variantId)} allCards={cards} onClose={() => setPrevious(false)} />}
    </div>
  )
}

function PreviousEncounters({ cards, allCards, onClose }: { cards: Card[]; allCards: Card[]; onClose: () => void }) {
  const dialog = useDialog(true, onClose)
  const [selected, setSelected] = useState<Card | null>(null)
  return <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="previous-title" className="mobile-overlay fixed inset-0 z-50 overflow-y-auto bg-ink/80 p-4">
    <Panel className="mx-auto my-2 w-full max-w-[440px]">
      <h2 id="previous-title" className="mb-3 font-pixel text-[24px] font-bold">Previous encounters</h2>
      <p className="mb-4">Your new card is still unsaved. Its photo and entered details are kept while you look.</p>
      <PxButton className="w-full" onClick={onClose}>Return to unsaved card</PxButton>
      {selected ? <><TrainCard card={selected} cards={allCards} /><PxButton className="mt-4 w-full" onClick={() => setSelected(null)}>Back to encounter list</PxButton></> : <ul className="flex flex-col gap-3">{cards.map(c => <li key={c.id}><PxButton className="w-full" onClick={() => setSelected(c)}>Open {c.model ?? 'Unknown model'} · {fmtDate(c.captureAt ?? c.savedAt)}</PxButton><p>{c.station || 'Station not added'}</p></li>)}</ul>}
    </Panel>
  </div>
}

/* ---------- 5. Guest save sheet (+ saving states) ---------- */
export type SaveState =
  | { mode: 'closed' }
  | { mode: 'choose'; note?: string }
  | { mode: 'saving'; target: 'device' | 'account' }
  | { mode: 'failed'; target: 'device' | 'account'; message: string }

export function SaveSheet({
  state,
  onClose,
  onDevice,
  onAuth,
  onRetry,
}: {
  state: SaveState
  onClose: () => void
  onDevice: () => void
  onAuth: (k: 'signin' | 'signup') => void
  onRetry: () => void
}) {
  const busy = state.mode === 'saving'
  const dialog = useDialog(state.mode !== 'closed', () => { if (!busy) onClose() })
  if (state.mode === 'closed') return null
  return (
    <div ref={dialog} tabIndex={-1} className="mobile-overlay fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/70 p-1">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-t"
        className="px-panel sheet-in max-h-[95dvh] w-full max-w-[480px] overflow-y-auto !m-0 px-4 pb-6 pt-4"
        style={{ boxShadow: '0 -4px 0 0 #14233f, -4px 0 0 0 #14233f, 4px 0 0 0 #14233f' }}
      >
        {state.mode === 'choose' && (
          <>
            <h2 id="sheet-t" className="font-pixel text-[24px] font-bold">
              Save your card
            </h2>
            <p className="mb-1 mt-1 text-[1.0625rem]">Try a device or account save in this prototype.</p>
            <p className="mb-3 text-[0.9375rem] text-ink/80">
              Device saves stay in this browser after a refresh. Account saves are a demo for now. Your photo and details stay here while you choose.
            </p>
            {state.note && (
              <Dialogue tone="warn" live className="mb-3">
                {state.note}
              </Dialogue>
            )}
            <div className="flex flex-col">
              <PxButton v="primary" onClick={() => onAuth('signin')}>
                Sign in
              </PxButton>
              <PxButton onClick={() => onAuth('signup')}>Create account</PxButton>
              <PxButton v="teal" icon="check" onClick={onDevice}>
                Save on this device for now
              </PxButton>
              <PxButton v="dark" onClick={onClose}>
                Back to card
              </PxButton>
            </div>
          </>
        )}
        {state.mode === 'saving' && (
          <div role="status" aria-live="polite" className="py-4">
            <h2 id="sheet-t" className="font-pixel text-[24px] font-bold">
              {state.target === 'device' ? 'Saving on this device…' : 'Saving to your account…'}
            </h2>
            <div className="prog-bar my-4" />
            <p className="text-[1rem]">Keep this screen open. The card is revealed only after saving is confirmed.</p>
          </div>
        )}
        {state.mode === 'failed' && (
          <>
            <h2 id="sheet-t" className="font-pixel text-[24px] font-bold">
              Save did not work
            </h2>
            <Dialogue tone="error" live className="my-3">
              {state.message} Your photo and details are still here. Retrying keeps the same encounter, so nothing is
              duplicated.
            </Dialogue>
            <div className="flex flex-col">
              <PxButton v="primary" onClick={onRetry}>
                Retry save
              </PxButton>
              {state.target === 'account' && <PxButton onClick={onDevice}>Save on this device instead</PxButton>}
              <PxButton v="dark" onClick={onClose}>
                Back to card
              </PxButton>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- 6. Card reveal ---------- */
export function Reveal({
  card,
  cards,
  firstEncounter,
  onView,
  onScan,
  onCollection,
  onDex,
}: {
  card: Card
  cards: Card[]
  firstEncounter: boolean | null
  onView: () => void
  onScan: () => void
  onCollection: () => void
  onDex: () => void
}) {
  const [skip, setSkip] = useState(false)
  // the first card on a line hatches a new pet, which gets its own little scene
  const [cutscene, setCutscene] = useState(() => cards.filter((c) => c.route === card.route).length === 1)
  const info = encounterInfo(cards, card)
  const device = card.storage === 'device'
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <div className="text-center">
          <div aria-live="polite">
            <Chip tone="ok">
              <PixelIcon name="check" size={14} />
              {device ? 'Saved on this device' : 'Saved to your account'}
            </Chip>
          </div>
          <h1 className="mt-2 font-pixel text-[26px] font-bold leading-none text-paper">
            {firstEncounter === null ? 'Card saved!' : firstEncounter ? 'New sign!' : `Encounter #${info?.count}`}
          </h1>
          <p className="mt-1 text-[1rem] text-paper">
            {firstEncounter === null
              ? 'Saved with variant unknown. No count is made up.'
              : firstEncounter
                ? 'First time collecting this sign.'
                : `Another encounter with ${VARIANTS[card.variantId!].name}.`}
          </p>
        </div>

        {cutscene && <HatchCutscene card={card} onDone={() => setCutscene(false)} />}
        <div className="relative px-3 [perspective:900px]" key={`${skip}-${cutscene}`}>
          <TrainCard card={card} cards={cards} sparkles reveal={!skip} />
          {!skip && <SparkBurst />}
        </div>

        <Hatch card={card} cards={cards} onDex={onDex} />

        <Dialogue tone="ok" title={device ? 'On this device' : 'In your account'}>
          {device
            ? 'Saved in this browser. It stays after a refresh, on this device only.'
            : 'Account saving is a demo for now, so this card is kept in this browser.'}
          {info && <div className="mt-1">First collected {fmtDate(info.first)} · seen ×{info.count}</div>}
        </Dialogue>

        <div className="mt-auto flex flex-col">
          <PxButton v="primary" size="lg" onClick={onView}>
            View card
          </PxButton>
          <div className="grid grid-cols-2 gap-2">
            <PxButton icon="camera" onClick={onScan}>
              Scan another
            </PxButton>
            <PxButton icon="cards" onClick={onCollection}>
              My Collection
            </PxButton>
          </div>
          {!skip && (
            <button type="button" onClick={() => setSkip(true)} className="min-h-[44px] text-center text-paper underline underline-offset-4">
              Skip animation
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
