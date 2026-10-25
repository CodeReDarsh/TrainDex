import { useRef, useState } from 'react'
import {
  type Card,
  type Draft,
  type Result,
  type Scenario,
  PHOTO,
  SAMPLE_CARDS,
  SCENARIOS,
  encounterInfo,
  nowLocal,
} from './traindex/data'
import { BottomNav, PixelIcon, PxButton } from './traindex/ui'
import { Capture, Preview, Recognizing } from './traindex/capture'
import { type SaveState, Review, Reveal, SaveSheet } from './traindex/review'
import { Collection, Detail, FullPhoto, Home, RouteView, Settings } from './traindex/browse'

type Nav =
  | { name: 'capture' }
  | { name: 'preview' }
  | { name: 'recognizing' }
  | { name: 'review' }
  | { name: 'reveal'; cardId: string; first: boolean | null }
  | { name: 'home' }
  | { name: 'collection' }
  | { name: 'route'; route: string }
  | { name: 'detail'; cardId: string }
  | { name: 'settings' }

const newDraft = (photo: string, captureAt: string | null, timeSource: Draft['timeSource']): Draft => ({
  id: `enc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  photo,
  crop: { x: 0.5, y: 0.4, s: 0.38 },
  captureAt,
  timeSource,
  station: '',
  model: null,
  modelSource: 'unknown',
})

export default function App() {
  const [nav, setNav] = useState<Nav>({ name: 'capture' })
  const [cards, setCards] = useState<Card[]>(SAMPLE_CARDS)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [deviceDefault, setDeviceDefault] = useState(false)
  const [scenario, setScenario] = useState<Scenario>('first')
  const [failSave, setFailSave] = useState(false)
  const [camDenied, setCamDenied] = useState(false)
  const [disclosed, setDisclosed] = useState(false)
  const [motion, setMotion] = useState<'system' | 'reduce' | 'full'>('system')
  const [full, setFull] = useState<{ src: string; alt: string } | null>(null)
  const [save, setSave] = useState<SaveState>({ mode: 'closed' })
  const [lab, setLab] = useState(false)
  const timer = useRef<number>(0)

  const go = (n: Nav) => {
    window.scrollTo(0, 0)
    setNav(n)
  }
  const toCapture = () => {
    setDraft(null)
    go({ name: 'capture' })
  }
  const begin = (photo: string, at: string | null, src: Draft['timeSource']) => {
    setDraft(newDraft(photo, at, src))
    go({ name: 'preview' })
  }
  const patchDraft = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d))

  const onResult = (r: Result) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            result: r,
            model: r.kind === 'matched' ? r.model : null,
            modelSource: r.kind === 'matched' && r.model ? 'recognition' : 'unknown',
          }
        : d,
    )
    go({ name: 'review' })
  }

  const finalize = (target: 'device' | 'account') => {
    if (!draft?.result || (draft.result.kind !== 'matched' && draft.result.kind !== 'uncertain')) return
    const r = draft.result
    const card: Card = {
      id: draft.id,
      route: r.route,
      variantId: r.variantId,
      model: draft.model,
      photo: draft.photo,
      captureAt: draft.captureAt,
      timeSource: draft.timeSource,
      savedAt: nowLocal(),
      station: draft.station,
      storage: target,
    }
    const first = r.variantId ? !encounterInfo(cards, card) : null
    setCards((cs) => (cs.some((c) => c.id === card.id) ? cs : [card, ...cs]))
    setSave({ mode: 'closed' })
    go({ name: 'reveal', cardId: card.id, first })
  }

  const commit = (target: 'device' | 'account') => {
    setSave({ mode: 'saving', target })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (failSave) {
        setFailSave(false)
        setSave({
          mode: 'failed',
          target,
          message:
            target === 'device'
              ? 'Device storage is full or unavailable.'
              : 'We could not reach your account.',
        })
        return
      }
      if (target === 'device') setDeviceDefault(true)
      finalize(target)
    }, 1100)
  }

  const onSave = () => {
    if (signedIn) commit('account')
    else if (deviceDefault) commit('device')
    else setSave({ mode: 'choose' })
  }

  const card = (id: string) => cards.find((c) => c.id === id)
  const resetData = (empty: boolean) => {
    setCards(empty ? [] : SAMPLE_CARDS)
    toCapture()
  }

  const flow = ['capture', 'preview', 'recognizing', 'review', 'reveal'].includes(nav.name)
  const navActive = nav.name === 'home' ? 'home' : nav.name === 'collection' || nav.name === 'route' ? 'collection' : 'none'
  const navTo = (n: 'home' | 'scan' | 'collection') =>
    n === 'scan' ? toCapture() : go({ name: n })

  let body: React.ReactNode = null
  switch (nav.name) {
    case 'capture':
      body = (
        <Capture
          cameraDenied={camDenied}
          disclosed={disclosed}
          onDisclose={() => setDisclosed(true)}
          onHome={() => go({ name: 'home' })}
          onShutter={() => begin(PHOTO.finder, nowLocal(), 'shutter')}
          onPhoto={(u) => begin(u, nowLocal(), 'estimated')}
          onSample={() => begin(PHOTO.sample, '2026-10-12T17:25', 'exif')}
        />
      )
      break
    case 'preview':
      body = draft && (
        <Preview
          draft={draft}
          onCrop={(crop) => patchDraft({ crop })}
          onRecognize={() => go({ name: 'recognizing' })}
          onRetake={toCapture}
          onBack={toCapture}
          onPhoto={(u) => begin(u, nowLocal(), 'estimated')}
        />
      )
      break
    case 'recognizing':
      body = draft && (
        <Recognizing draft={draft} scenario={scenario} onDone={onResult} onCancel={() => go({ name: 'preview' })} />
      )
      break
    case 'review':
      body = draft && (
        <Review
          draft={draft}
          cards={cards}
          signedIn={signedIn}
          deviceDefault={deviceDefault}
          onChange={patchDraft}
          onSave={onSave}
          onRetake={toCapture}
          onAdjust={() => go({ name: 'preview' })}
          onTryAgain={() => go({ name: 'recognizing' })}
          onFullPhoto={() => setFull({ src: draft.photo, alt: 'Your full photo' })}
          onSignIn={() => setSave({ mode: 'choose' })}
        />
      )
      break
    case 'reveal': {
      const c = card(nav.cardId)
      body = c && (
        <Reveal
          card={c}
          cards={cards}
          firstEncounter={nav.first}
          onView={() => go({ name: 'detail', cardId: c.id })}
          onScan={toCapture}
          onCollection={() => go({ name: 'collection' })}
        />
      )
      break
    }
    case 'home':
      body = (
        <Home
          cards={cards}
          signedIn={signedIn}
          onScan={toCapture}
          onCollection={() => go({ name: 'collection' })}
          onOpen={(id) => go({ name: 'detail', cardId: id })}
          onSettings={() => go({ name: 'settings' })}
          onSignIn={() => go({ name: 'settings' })}
        />
      )
      break
    case 'collection':
      body = (
        <Collection
          cards={cards}
          signedIn={signedIn}
          onScan={toCapture}
          onRoute={(r) => go({ name: 'route', route: r })}
          onBack={() => go({ name: 'home' })}
        />
      )
      break
    case 'route':
      body = (
        <RouteView
          route={nav.route}
          cards={cards}
          onBack={() => go({ name: 'collection' })}
          onOpen={(id) => go({ name: 'detail', cardId: id })}
          onScan={toCapture}
        />
      )
      break
    case 'detail': {
      const c = card(nav.cardId)
      body = c ? (
        <Detail
          card={c}
          cards={cards}
          onBack={() => go({ name: 'route', route: c.route })}
          onScan={toCapture}
          onOpen={(id) => go({ name: 'detail', cardId: id })}
          onFullPhoto={() => setFull({ src: c.photo, alt: `Full photo of your route ${c.route} train` })}
          onUpdate={(p) => setCards((cs) => cs.map((x) => (x.id === c.id ? { ...x, ...p } : x)))}
          onDelete={() => {
            setCards((cs) => cs.filter((x) => x.id !== c.id))
            go({ name: 'route', route: c.route })
          }}
        />
      ) : null
      break
    }
    case 'settings':
      body = (
        <Settings
          signedIn={signedIn}
          count={cards.length}
          motion={motion}
          onMotion={setMotion}
          onSignIn={() => {
            setSignedIn(true)
          }}
          onSignOut={() => setSignedIn(false)}
          onBack={() => go({ name: 'home' })}
        />
      )
      break
  }

  return (
    <div data-motion={motion} className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-teal shadow-[0_0_0_4px_#14233f]">
        <div className="sticky top-0 z-40 bg-ink text-paper">
          <div className="flex min-h-[40px] items-center justify-between gap-2 px-3">
            <span className="font-body text-[14px] font-medium uppercase tracking-normal">
              Design prototype · sample data
            </span>
            <button
              type="button"
              aria-expanded={lab}
              onClick={() => setLab((l) => !l)}
              className="flex min-h-[40px] items-center gap-1.5 px-2 font-body text-[13px] font-medium uppercase text-gold"
            >
              <PixelIcon name="flask" size={14} />
              States
            </button>
          </div>
          {lab && (
            <div className="border-t-2 border-paper/20 px-3 pb-3 pt-2 text-[0.9375rem]">
              <fieldset className="mb-2">
                <legend className="mb-1 font-body text-[14px] font-medium uppercase tracking-normal text-gold">
                  Next recognition result
                </legend>
                <div className="flex flex-col">
                  {SCENARIOS.map((s) => (
                    <label key={s.id} className="flex min-h-[40px] items-center gap-2">
                      <input
                        type="radio"
                        name="sc"
                        checked={scenario === s.id}
                        onChange={() => setScenario(s.id)}
                        className="h-5 w-5 accent-[#f2c53d]"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-col">
                {(
                  [
                    ['Next save fails once', failSave, setFailSave],
                    ['Camera permission denied', camDenied, setCamDenied],
                    ['Signed in (account saves)', signedIn, setSignedIn],
                  ] as const
                ).map(([l, v, set]) => (
                  <label key={l} className="flex min-h-[40px] items-center gap-2">
                    <input
                      type="checkbox"
                      checked={v}
                      onChange={(e) => set(e.target.checked)}
                      className="h-5 w-5 accent-[#f2c53d]"
                    />
                    {l}
                  </label>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <PxButton size="sm" onClick={() => resetData(false)} className="!mb-2">
                  Reset samples
                </PxButton>
                <PxButton size="sm" onClick={() => resetData(true)} className="!mb-2">
                  Empty collection
                </PxButton>
              </div>
              <p className="text-paper/80">Saves here are simulated. Nothing is stored; reload resets everything.</p>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col" key={nav.name === 'detail' ? nav.cardId : nav.name}>
          {body}
        </div>
        {!flow && <BottomNav active={navActive} go={navTo} />}
      </div>

      <SaveSheet
        state={save}
        onClose={() => setSave({ mode: 'closed' })}
        onDevice={() => commit('device')}
        onAuth={(kind) => setSave({ mode: 'auth', kind })}
        onAuthCancel={() =>
          setSave({ mode: 'choose', note: 'Sign-in was cancelled. You can still save on this device.' })
        }
        onAuthContinue={() => {
          setSignedIn(true)
          commit('account')
        }}
        onRetry={() => commit(save.mode === 'failed' ? save.target : 'device')}
      />
      {full && <FullPhoto src={full.src} alt={full.alt} onClose={() => setFull(null)} />}
    </div>
  )
}
