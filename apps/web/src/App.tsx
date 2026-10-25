import { useCallback, useEffect, useRef, useState } from 'react'
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
  registerVariant,
} from './traindex/data'
import { BottomNav, Dialogue, PixelIcon, PxButton, type NavTab } from './traindex/ui'
import { PetDetail, PetDex } from './traindex/pets'
import { BackdropGears, Gate } from './traindex/steam'
import { Capture, Preview, Recognizing } from './traindex/capture'
import { type SaveState, Confirm, Review, Reveal, SaveSheet } from './traindex/review'
import { DEFAULT_COLLECTION_PREFERENCES, type CollectionPreferences, Collection, Detail, FullPhoto, Home, RouteView, Settings } from './traindex/browse'

import { AccountFlow, ImportCards, PhotoDrafts, LoadState, type AuthOutcome } from './traindex/flows'

import { useScreenHistory, leavesCapture, type Nav } from './traindex/navigation'
import { closeTopDialog } from './traindex/dialog'
import { liveLabel } from './traindex/live'
import { clearCards, deleteCard, loadSaved, saveCard, updateCard } from './traindex/storage'
import { PhotoPreviewContext, type PhotoStatus } from './traindex/photo'

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
  const [nav, setNav] = useScreenHistory((next, apply) => {
    if (closeTopDialog()) return
    const safe: Nav = ['preview', 'recognizing', 'review'].includes(next.name) && !draft ? { name: 'capture' } : next.name === 'recognizing' ? { name: 'preview' } : next
    requestNavigation(safe, () => { apply(); if (safe !== next) setNav(safe, true) })
  })
  const [cards, setCards] = useState<Card[]>(SAMPLE_CARDS)
  // sample cards only show until this browser has saved cards of its own
  useEffect(() => {
    let live = true
    loadSaved().then(({ cards: saved, variants }) => {
      if (!live) return
      variants.forEach(registerVariant)
      if (saved.length) setCards(saved)
    })
    return () => { live = false }
  }, [])
  const [collectionPreferences, setCollectionPreferences] = useState<CollectionPreferences>(DEFAULT_COLLECTION_PREFERENCES)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [deviceDefault, setDeviceDefault] = useState(false)
  const [scenario, setScenario] = useState<Scenario>('live')
  const [failSave, setFailSave] = useState(false)
  const [failEdit, setFailEdit] = useState(false)
  const [detailBusy, setDetailBusy] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [photoState, setPhotoState] = useState<PhotoStatus>('ready')
  const [previewWidth, setPreviewWidth] = useState('480')
  const [textSize, setTextSize] = useState('100')
  useEffect(() => {
    const previous = document.documentElement.style.fontSize
    document.documentElement.style.fontSize = `${textSize}%`
    return () => { document.documentElement.style.fontSize = previous }
  }, [textSize])
  const [camDenied, setCamDenied] = useState(false)
  const [disclosed, setDisclosed] = useState(false)
  const [motion, setMotion] = useState<'system' | 'reduce' | 'full'>('system')
  const [full, setFull] = useState<{ src: string; alt: string } | null>(null)
  const [save, setSave] = useState<SaveState>({ mode: 'closed' })
  const [auth, setAuth] = useState<{ kind: 'signin' | 'signup'; card: boolean } | null>(null)
  const [authOutcome, setAuthOutcome] = useState<AuthOutcome>('success')
  const [imported, setImported] = useState<string[]>([])
  const markImported = useCallback((id: string) => setImported(ids => ids.includes(id) ? ids : [...ids, id]), [])
  const [failImport, setFailImport] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [offline, setOffline] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null)
  const [loadState, setLoadState] = useState<'ready' | 'loading' | 'error'>('ready')
  const [detailDirty, setDetailDirty] = useState(false)
  const [missingPhoto, setMissingPhoto] = useState(false)
  const visibleCards = cards.filter(c => c.storage === 'device' || signedIn)
  const [lab, setLab] = useState(false)
  const timer = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const requestNavigation = (next: Nav, apply: () => void) => {
    if (detailBusy) { setNotice('Applying your changes. Please wait before leaving this card.'); return }
    const leaveDraft = !!draft && leavesCapture(nav, next)
    const finish = () => {
      if (leaveDraft) setDraft(null)
      setDetailDirty(false)
      setImportBusy(false)
      setNotice('')
      apply()
    }
    if (detailDirty || leaveDraft || importBusy) setDiscardAction(() => finish)
    else finish()
  }
  const go = (n: Nav) => requestNavigation(n, () => setNav(n))
  const discardThen = (action: () => void) => {
    if (detailBusy) { setNotice('Applying your changes. Please wait.'); return }
    if (detailDirty || draft || importBusy) setDiscardAction(() => () => { setDetailDirty(false); action() })
    else action()
  }
  const toCapture = () => go({ name: 'capture' })
  const keepDraft = () => {
    if (!draft) return
    const unrecognized = { ...draft, result: undefined, model: null, modelSource: 'unknown' as const }
    setDrafts(list => [unrecognized, ...list.filter(d => d.id !== draft.id)])
    setDraft(null)
    setNav({ name: 'drafts' })
  }
  const recognize = () => { if (!offline) { setCancelled(false); go({ name: 'recognizing' }) } }
  const retryLoad = () => {
    setLoadState('loading')
    window.setTimeout(() => setLoadState('ready'), 750)
  }
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (draft || drafts.length || detailDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [draft, drafts.length, detailDirty])
  useEffect(() => {
    if (offline && nav.name === 'recognizing') { setCancelled(true); setNav({ name: 'preview' }) }
  }, [offline, nav.name])
  const begin = (photo: string, at: string | null, src: Draft['timeSource']) => {
    setCancelled(false)
    setDraft(newDraft(photo, at, src))
    setNav({ name: 'preview' })
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

  const buildCard = (target: 'device' | 'account'): Card | null => {
    if (!draft?.result || (draft.result.kind !== 'matched' && draft.result.kind !== 'uncertain')) return null
    const r = draft.result
    return {
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
  }

  const finalize = (card: Card) => {
    const first = card.variantId ? !encounterInfo(visibleCards, card) : null
    setCards((cs) => (cs.some((c) => c.id === card.id) ? cs : [card, ...cs]))
    setSave({ mode: 'closed' })
    setDrafts(list => list.filter(d => d.id !== card.id))
    setDraft(null)
    setNav({ name: 'reveal', cardId: card.id, first })
  }

  const commit = (target: 'device' | 'account') => {
    if (target === 'account' && (offline || !signedIn)) { setSave({ mode: 'failed', target, message: offline ? 'Account saving needs a connection.' : 'Session expired. Return to your card and sign in again.' }); return }
    const card = buildCard(target)
    if (!card) return
    setSave({ mode: 'saving', target })
    window.clearTimeout(timer.current)
    if (failSave) {
      timer.current = window.setTimeout(() => {
        setFailSave(false)
        setSave({ mode: 'failed', target, message: target === 'device' ? 'Device storage is full or unavailable.' : 'We could not reach your account.' })
      }, 1100)
      return
    }
    // account saves are still a demo, so they are kept in this browser too
    saveCard(card)
      .then(() => {
        if (target === 'device') setDeviceDefault(true)
        finalize(card)
      })
      .catch(() =>
        setSave({ mode: 'failed', target, message: 'This browser could not store the card. Storage may be full, or this may be a private window.' }),
      )
  }

  const onSave = () => {
    if (signedIn && offline) { setSave({ mode: 'failed', target: 'account', message: 'Account saving needs a connection. You can still try a device save.' }); return }
    if (signedIn) commit('account')
    else if (deviceDefault) commit('device')
    else setSave({ mode: 'choose' })
  }

  const card = (id: string) => visibleCards.find((c) => c.id === id)
  const resetData = (empty: boolean) => {
    window.clearTimeout(timer.current)
    setCards(empty ? [] : SAMPLE_CARDS)
    clearCards()
    setImported([])
    setDrafts([])
    setDraft(null)
    setSave({ mode: 'closed' })
    setDetailDirty(false)
    setNav({ name: 'capture' })
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (document.querySelector('[aria-modal="true"]')) return
      const heading = document.querySelector<HTMLElement>('h1')
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) }
    })
    return () => cancelAnimationFrame(frame)
  }, [nav])

  const flow = ['capture', 'preview', 'recognizing', 'review', 'reveal'].includes(nav.name)
  const navActive = nav.name === 'home' ? 'home' : nav.name === 'collection' || nav.name === 'route' ? 'collection' : nav.name === 'dex' || nav.name === 'pet' ? 'dex' : 'none'
  const [gate, setGate] = useState<{ to: NavTab; phase: 'closing' | 'opening' } | null>(null)
  const switchTab = (n: NavTab) => (n === 'scan' ? toCapture() : go({ name: n }))
  const navTo = (n: NavTab) => {
    const reduced = motion === 'reduce' || (motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    // anything that might pop a "discard?" dialog skips the gate, so the dialog isn't hidden behind it
    const busy = !!draft || detailDirty || detailBusy || importBusy
    if (reduced || busy || gate || n === navActive) switchTab(n)
    else setGate({ to: n, phase: 'closing' })
  }

  let body: React.ReactNode = null
  switch (nav.name) {
    case 'capture':
      body = (
        <Capture
          cameraDenied={camDenied}
          disclosed={disclosed}
          onDisclose={() => setDisclosed(true)}
          onHome={() => navTo('home')}
          onShutter={(u) => begin(u, nowLocal(), 'shutter')}
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
          offline={offline}
          cancelled={cancelled}
          onKeep={keepDraft}
          onRecognize={recognize}
          onRetake={toCapture}
          onBack={toCapture}
          onPhoto={(u) => discardThen(() => begin(u, nowLocal(), 'estimated'))}
        />
      )
      break
    case 'recognizing':
      body = draft && (
        <Recognizing draft={draft} scenario={scenario} onDone={onResult} onBack={() => go({ name: 'preview' })} onCancel={() => { setCancelled(true); go({ name: 'preview' }) }} />
      )
      break
    case 'review':
      body = draft && (
        <Review
          draft={draft}
          cards={visibleCards}
          signedIn={signedIn}
          deviceDefault={deviceDefault}
          onChange={patchDraft}
          onSave={onSave}
          onRetake={toCapture}
          onAdjust={() => go({ name: 'preview' })}
          onTryAgain={() => { if (scenario !== 'live' && (draft.result?.kind === 'upload-failed' || draft.result?.kind === 'cancelled' || draft.result?.kind === 'unavailable')) setScenario('first'); recognize() }}
          onPhoto={(u) => discardThen(() => begin(u, nowLocal(), 'estimated'))}
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
          cards={visibleCards}
          firstEncounter={nav.first}
          onView={() => go({ name: 'detail', cardId: c.id })}
          onScan={toCapture}
          onCollection={() => go({ name: 'collection' })}
          onDex={() => go({ name: 'pet', route: c.route })}
        />
      )
      break
    }
    case 'home':
      body = (
        <Home
          cards={visibleCards}
          signedIn={signedIn}
          onScan={toCapture}
          onCollection={() => go({ name: 'collection' })}
          onOpen={(id) => go({ name: 'detail', cardId: id })}
          onSettings={() => go({ name: 'settings' })}
          onSignIn={() => { go({ name: 'settings' }); setAuth({ kind: 'signin', card: false }) }}
          onDex={() => go({ name: 'dex' })}
        />
      )
      break
    case 'collection':
      body = (
        <Collection
          preferences={collectionPreferences}
          onPreferences={setCollectionPreferences}
          onOpen={id => go({ name: 'detail', cardId: id, from: 'collection' })}
          cards={visibleCards}
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
          cards={visibleCards}
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
          photoMissing={missingPhoto}
          cards={visibleCards}
          backToCollection={nav.from === 'collection'}
          onBack={() => go(nav.from === 'collection' ? { name: 'collection' } : { name: 'route', route: c.route })}
          onScan={toCapture}
          onOpen={(id) => go({ name: 'detail', cardId: id, from: nav.from })}
          onFullPhoto={() => setFull({ src: missingPhoto ? '' : c.photo, alt: `Full photo of your route ${c.route} train` })}
          imported={signedIn && imported.includes(c.id)}
          onRetryPhoto={() => setMissingPhoto(false)}
          onPet={() => go({ name: 'pet', route: c.route })}
          onDirty={setDetailDirty}
          onBusy={setDetailBusy}
          onUpdate={async (p) => {
            await new Promise(resolve => window.setTimeout(resolve, 800))
            if (failEdit || (offline && c.storage === 'account')) { setFailEdit(false); return false }
            setCards(cs => cs.map(x => x.id === c.id ? { ...x, ...p } : x))
            updateCard({ ...c, ...p }).catch(() => {})
            setNotice('')
            return true
          }}
          onDelete={() => {
            setCards((cs) => cs.filter((x) => x.id !== c.id))
            deleteCard(c.id)
            setImported(ids => ids.filter(id => id !== c.id))
            setDetailDirty(false)
            setNav(nav.from === 'collection' ? { name: 'collection' } : { name: 'route', route: c.route })
          }}
        />
      ) : <div className="p-4"><h1 className="mb-4 font-pixel font-bold text-paper">Card unavailable</h1><Dialogue live tone="warn" title="Card unavailable">This card was deleted, is no longer in this session, or belongs to a signed-out account. Your other cards are still available.</Dialogue><PxButton className="mt-4 w-full" onClick={() => go({ name: 'collection' })}>Back to Collection</PxButton></div>
      break
    }
    case 'dex':
      body = <PetDex cards={visibleCards} onOpen={(route) => go({ name: 'pet', route })} onBack={() => go({ name: 'home' })} onScan={toCapture} />
      break
    case 'pet':
      body = <PetDetail route={nav.route} cards={visibleCards} onBack={() => go({ name: 'dex' })} onOpenCard={(id) => go({ name: 'detail', cardId: id })} />
      break
    case 'drafts':
      body = <PhotoDrafts drafts={drafts} offline={offline} onBack={() => go({ name: 'home' })} onScan={toCapture} onResume={d => { setDraft(d); setCancelled(false); go({ name: 'preview' }) }} onDiscard={id => setDrafts(list => list.filter(d => d.id !== id))} />
      break
    case 'import':
      body = signedIn ? <ImportCards paused={!!discardAction} onBusy={setImportBusy} cards={cards} offline={offline} imported={imported} failOne={failImport} onImported={markImported} onBack={() => go({ name: 'settings' })} /> : <div className="p-4"><Dialogue tone="warn" title="Session expired">Sign in before importing device cards. Your local copies are unchanged.</Dialogue><PxButton className="mt-4 w-full" onClick={() => setAuth({ kind: 'signin', card: false })}>Sign in</PxButton><PxButton className="w-full" onClick={() => go({ name: 'settings' })}>Back to Settings</PxButton></div>
      break
    case 'settings':
      body = (
        <Settings
          signedIn={signedIn}
          count={cards.filter(c => c.storage === 'device').length}
          motion={motion}
          onMotion={setMotion}
          onSignIn={() => { go({ name: 'settings' }); setAuth({ kind: 'signin', card: false }) }}
          onImport={() => go({ name: 'import' })}
          importedCount={imported.length}
          onSignOut={() => setSignedIn(false)}
          onBack={() => go({ name: 'home' })}
        />
      )
      break
  }

  if (['home', 'collection', 'route', 'detail'].includes(nav.name) && loadState !== 'ready') {
    body = <LoadState state={loadState} detail={nav.name === 'detail'} onRetry={retryLoad} onBack={() => { setLoadState('ready'); go({ name: 'home' }) }} />
  }

  return (
    <PhotoPreviewContext.Provider value={{ state: photoState, reset: () => setPhotoState('ready') }}>
    <div data-motion={motion} className="min-h-dvh">
      <BackdropGears />
      {gate && (
        <Gate
          phase={gate.phase}
          width={Number(previewWidth)}
          onClosed={() => { switchTab(gate.to); setGate({ ...gate, phase: 'opening' }) }}
          onOpened={() => setGate(null)}
        />
      )}
      <div style={{ maxWidth: `${previewWidth}px` }} className="screen-shell mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-teal shadow-[0_0_0_4px_#14233f]">
        <div className="prototype-bar sticky top-0 z-40 bg-ink text-paper">
          <div className="flex min-h-[44px] items-center justify-between gap-2 px-3">
            <span className="font-body text-[14px] font-medium uppercase tracking-normal">
              {scenario === 'live' ? `Live · ${liveLabel}` : 'Design prototype · sample data'}
            </span>
            <button
              type="button"
              aria-expanded={lab}
              onClick={() => setLab((l) => !l)}
              className="flex min-h-[44px] items-center gap-1.5 px-2 font-body text-[13px] font-medium uppercase text-gold"
            >
              <PixelIcon name="flask" size={14} />
              States
            </button>
          </div>
          {lab && (
            <div className="max-h-[70dvh] overflow-y-auto border-t-2 border-paper/20 px-3 pb-3 pt-2 text-[0.9375rem]">
              <fieldset className="mb-2">
                <legend className="mb-1 font-body text-[14px] font-medium uppercase tracking-normal text-gold">
                  Next recognition result
                </legend>
                <div className="flex flex-col">
                  {SCENARIOS.map((s) => (
                    <label key={s.id} className="flex min-h-[44px] items-center gap-2">
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
                    ['Next detail edit fails once', failEdit, setFailEdit],
                    ['Camera permission denied', camDenied, setCamDenied],
                    ['Signed in (simulated)', signedIn, setSignedIn],
                    ['Offline (simulated)', offline, setOffline],
                    ['One import item fails once', failImport, setFailImport],
                    ['Detail photo missing', missingPhoto, setMissingPhoto],
                  ] as const
                ).map(([l, v, set]) => (
                  <label key={l} className="flex min-h-[44px] items-center gap-2">
                    <input
                      type="checkbox"
                      checked={v}
                      onChange={(e) => { const checked = e.target.checked; if (set === setSignedIn) discardThen(() => set(checked)); else set(checked) }}
                      className="h-5 w-5 accent-[#f2c53d]"
                    />
                    {l}
                  </label>
                ))}
              </div>
              <label className="my-3 flex flex-col gap-2">Sign-in outcome
                <select aria-label="Sign-in outcome" className="px-input" value={authOutcome} onChange={e => setAuthOutcome(e.target.value as AuthOutcome)}>
                  <option value="success">Success</option><option value="cancelled">Cancelled</option><option value="error">Provider error</option><option value="expired">Session expired</option>
                </select>
              </label>
              <label className="my-3 flex flex-col gap-2">Collection / detail state
                <select aria-label="Collection / detail state" className="px-input" value={loadState} onChange={e => { const value = e.target.value as typeof loadState; discardThen(() => setLoadState(value)) }}>
                  <option value="ready">Ready</option><option value="loading">Loading</option><option value="error">Load error with retry</option>
                </select>
              </label>
              <label className="my-3 flex flex-col gap-2">Photo preview state
                <select aria-label="Photo preview state" className="px-input" value={photoState} onChange={e => setPhotoState(e.target.value as PhotoStatus)}><option value="ready">Normal photo</option><option value="loading">Photo loading</option><option value="error">Photo decode error</option></select>
              </label>
              <label className="my-3 flex flex-col gap-2">Preview width
                <select aria-label="Preview width" className="px-input" value={previewWidth} onChange={e => setPreviewWidth(e.target.value)}><option value="480">480px · default</option><option value="375">375px · phone</option><option value="320">320px · narrow phone</option></select>
              </label>
              <label className="my-3 flex flex-col gap-2">Text size
                <select aria-label="Text size" className="px-input" value={textSize} onChange={e => setTextSize(e.target.value)}><option value="100">100%</option><option value="150">150%</option><option value="200">200%</option></select>
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <PxButton size="sm" onClick={() => discardThen(() => resetData(false))} className="!mb-2">
                  Reset samples
                </PxButton>
                <PxButton size="sm" onClick={() => discardThen(() => resetData(true))} className="!mb-2">
                  Empty collection
                </PxButton>
              </div>
              <p className="text-paper/80">Cards are saved in this browser and stay after a refresh. Reset samples or Empty collection also clears them. Sign-in and account saves are simulated.</p>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col" key={nav.name === 'detail' ? nav.cardId : nav.name}>
          {['home', 'collection', 'settings'].includes(nav.name) && <div className="px-4 pt-4"><PxButton className="w-full" onClick={() => go({ name: 'drafts' })}>Photo drafts · {drafts.length}</PxButton></div>}
          {offline && <div className="px-4 pt-3"><Dialogue tone="warn" title="Offline demo">Browse session cards and drafts. Recognition and account saves wait for a connection.</Dialogue></div>}
          {notice && <div className="p-4"><Dialogue live title="Please wait">{notice}</Dialogue></div>}
          {body}
        </div>
        {!flow && nav.name !== 'import' && <BottomNav active={navActive} go={navTo} />}
      </div>

      <SaveSheet
        state={save}
        onClose={() => setSave({ mode: 'closed' })}
        onDevice={() => commit('device')}
        onAuth={(kind) => { setSave({ mode: 'closed' }); setAuth({ kind, card: true }) }}
        onRetry={() => commit(save.mode === 'failed' ? save.target : 'device')}
      />
      {auth && <AccountFlow kind={auth.kind} outcome={offline ? 'error' : authOutcome} hasCard={auth.card} onClose={() => { if (auth.card) setSave({ mode: 'choose', note: 'Sign-in cancelled. Your photo and details are still here.' }); setAuth(null) }} onSuccess={() => { setSignedIn(true); if (!auth.card) go({ name: 'settings' }); setAuth(null) }} />}
      {discardAction && <Confirm title={importBusy ? "Stop this import?" : "Discard unsaved work?"} body={importBusy ? "Completed demo imports and local copies are kept. Unfinished cards can be retried from Settings." : detailDirty ? "Your capture-detail edits have not been applied. Leaving discards these changes." : "Your current photo, crop, and card details have not been saved. Stay here to keep working or keep a photo draft from Check photo."} confirm={importBusy ? "Stop and continue" : "Discard and continue"} cancel="Keep working" danger onCancel={() => setDiscardAction(null)} onConfirm={() => { const action = discardAction; setDiscardAction(null); action() }} />}
      {full && <FullPhoto src={full.src} alt={full.alt} onClose={() => setFull(null)} />}
    </div>
    </PhotoPreviewContext.Provider>
  )
}
