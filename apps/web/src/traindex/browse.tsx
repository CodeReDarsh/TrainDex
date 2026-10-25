import { useDialog } from './dialog'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  type Card,
  MODELS,
  ROUTES,
  TIME_SOURCE_LABEL,
  VARIANTS,
  encounterInfo,
  fmtDate,
  fmtDateTime,
} from './data'
import {
  CardPhoto,
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
import { Confirm } from './review'
import { Logo, PixelText } from './pixel'
import { LeafDrift } from './steam'
import { PetSprite, isExpress, species } from './pets'

const byCapture = (a: Card, b: Card) => (b.captureAt ?? b.savedAt).localeCompare(a.captureAt ?? a.savedAt)
const bySaved = (a: Card, b: Card) => b.savedAt.localeCompare(a.savedAt)

export function StorageChip({ signedIn }: { signedIn: boolean }) {
  return signedIn ? <Chip tone="ok">Demo session</Chip> : <Chip tone="paper">Device demo</Chip>
}

/* ---------- 7. Home ---------- */
export function Home({
  cards,
  signedIn,
  onScan,
  onCollection,
  onOpen,
  onSettings,
  onSignIn,
  onDex,
}: {
  cards: Card[]
  signedIn: boolean
  onScan: () => void
  onCollection: () => void
  onOpen: (id: string) => void
  onSettings: () => void
  onSignIn: () => void
  onDex: () => void
}) {
  const recent = [...cards].sort(bySaved).slice(0, 6)
  const pets = [...new Set([...cards].sort(bySaved).map((c) => c.route))]
  const routes = new Set(cards.map((c) => c.route)).size
  return (
    <main className="home-screen relative flex flex-col gap-4 p-4">
      <LeafDrift />
      <header className="flex items-center gap-3">
        <h1 className="flex-1">
          <Logo width={244} />
        </h1>
        <PxButton size="icon" aria-label="Settings" onClick={onSettings} className="!mb-2">
          <PixelIcon name="gear" size={24} />
        </PxButton>
      </header>

      <Panel>
        <PanelTitle right={<StorageChip signedIn={signedIn} />}>
          Session collection
        </PanelTitle>
        <dl className="grid grid-cols-2 gap-3">
          <div className="px-inset p-3">
            <dt className="font-pixel text-[16px] font-bold uppercase tracking-normal">Cards</dt>
            <dd><PixelText text={String(cards.length)} scale={6} /></dd>
          </div>
          <div className="px-inset p-3">
            <dt className="font-pixel text-[16px] font-bold uppercase tracking-normal">Routes</dt>
            <dd className="flex items-end gap-2"><PixelText text={String(routes)} scale={6} /><PixelText text={`/${ROUTES.length}`} scale={3} className="mb-0.5" /></dd>
          </div>
        </dl>
        <p className="mt-2 text-[0.9375rem] text-ink/80">Routes counted against a sample route list. Cards have no fixed total.</p>
      </Panel>

      <div className="flex flex-col">
        <PxButton v="primary" size="lg" icon="camera" onClick={onScan}>
          Scan a sign
        </PxButton>
      </div>

      <Panel>
        <PanelTitle right={<Chip tone="gold">{pets.length}/{ROUTES.length}</Chip>}>Traindex pets</PanelTitle>
        {pets.length ? (
          <ul className="no-sb -mx-1 flex gap-3 overflow-x-auto px-1 pb-1" aria-label="Your pets">
            {pets.slice(0, 8).map((r) => (
              <li key={r} className="flex shrink-0 flex-col items-center">
                <PetSprite route={r} size={48} />
                <span className="text-[0.75rem]">{species(r).name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[1rem]">Scan a train sign to hatch your first pet.</p>
        )}
        <PxButton icon="pet" className="mt-3 w-full" onClick={onDex}>Open Traindex</PxButton>
      </Panel>

      <section aria-labelledby="recent-h">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="recent-h" className="font-pixel text-[18px] font-bold text-paper">
            Recent cards
          </h2>
        </div>
        {recent.length === 0 ? (
          <Panel className="text-center">
            <PixelIcon name="ask" size={32} className="mx-auto mb-2" />
            <p className="font-pixel text-[18px] font-bold">No cards yet</p>
            <p className="text-[1rem]">Scan your first sign. Every photo you save becomes its own card.</p>
          </Panel>
        ) : (
          <ul className="no-sb -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 pt-1">
            {recent.map((c) => (
              <li key={c.id} className="w-[168px] shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className="block w-full text-left"
                  aria-label={`Open route ${c.route} card, ${c.model ?? 'unknown model'}`}
                >
                  <TrainCard card={c} cards={cards} size="sm" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col">
        <PxButton icon="cards" onClick={onCollection}>
          My Collection
        </PxButton>
        {!signedIn && (
          <button type="button" onClick={onSignIn} className="min-h-[44px] text-center text-paper underline underline-offset-4">
            Sign in to save to an account
          </button>
        )}
      </div>
    </main>
  )
}

/* ---------- 8. My Collection ---------- */
export type CollectionPreferences = {
  view: 'groups' | 'cards'
  filter: 'all' | 'collected' | 'missing'
  query: string
}

export const DEFAULT_COLLECTION_PREFERENCES: CollectionPreferences = {
  view: 'cards', filter: 'all', query: '',
}

export function Collection({ cards, signedIn, preferences, onPreferences, onScan, onRoute, onOpen, onBack }: {
  cards: Card[]
  signedIn: boolean
  preferences: CollectionPreferences
  onPreferences: (p: CollectionPreferences) => void
  onScan: () => void
  onRoute: (r: string) => void
  onOpen: (id: string) => void
  onBack: () => void
}) {
  const { view, filter, query } = preferences
  const patch = (p: Partial<CollectionPreferences>) => onPreferences({ ...preferences, ...p })
  const counts = new Map<string, number>()
  cards.forEach(c => counts.set(c.route, (counts.get(c.route) ?? 0) + 1))
  const variants = new Set(cards.filter(c => c.variantId).map(c => `${c.route}|${c.variantId}`)).size
  const matchesQuery = (r: string) => !query.trim() || r.toLowerCase().includes(query.trim().toLowerCase())
  const routes = [...new Set([...ROUTES, ...cards.map(c => c.route)])]
  const groups = routes.filter(r => {
    const has = counts.has(r)
    return !(filter === 'collected' && !has) && !(filter === 'missing' && has) && matchesQuery(r)
  })
  const encounters = cards.filter(c => matchesQuery(c.route)).sort(byCapture)
  const dirty = query !== '' || (view === 'groups' && filter !== 'all')
  const clear = () => patch({ filter: 'all', query: '' })

  return <div className="flex flex-col">
    <ScreenHeader title="My Collection" onBack={onBack} backLabel="Back to Home" />
    <main className="flex flex-col gap-4 p-4">
      <Panel>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <StorageChip signedIn={signedIn} />
          <span className="text-[0.9375rem]">Device + visible demo account cards</span>
        </div>
        <dl className="collection-summary grid grid-cols-3 gap-2 text-center">
          {[['Cards', cards.length], ['Routes', counts.size], ['Signs', variants]].map(([label, count]) => <div key={label} className="px-inset p-2">
            <dt className="font-pixel text-[16px] font-bold uppercase tracking-normal">{label}</dt>
            <dd><PixelText text={String(count)} scale={4} /></dd>
          </div>)}
        </dl>
      </Panel>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <label htmlFor="rq" className="sr-only">Search routes</label>
          <input id="rq" type="search" inputMode="text" enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="Search route, e.g. A, F, 3, Q" className="px-input !pl-11" value={query} onChange={e => patch({ query: e.target.value })} />
          <PixelIcon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
        <div role="group" aria-label="Collection view" className="grid grid-cols-2 gap-2">
          <PxButton size="sm" icon="cards" aria-pressed={view === 'cards'} onClick={() => patch({ view: 'cards' })} className="!mb-2 !px-2">All cards</PxButton>
          <PxButton size="sm" aria-pressed={view === 'groups'} onClick={() => patch({ view: 'groups' })} className="!mb-2 !px-2">Group by route</PxButton>
        </div>
        {view === 'groups' && <div role="group" aria-label="Filter routes" className="grid grid-cols-3 gap-2">
          {([['all', 'All routes'], ['collected', 'Collected'], ['missing', 'Not yet']] as const).map(([id, label]) => <PxButton key={id} size="sm" aria-pressed={filter === id} onClick={() => patch({ filter: id })} className="!mb-2 !px-1 text-[0.9375rem]">{label}</PxButton>)}
        </div>}
        {dirty && <PxButton size="sm" onClick={clear} className="!mb-1">{view === 'cards' ? 'Clear search' : 'Clear filters'}</PxButton>}
      </div>

      <p role="status" className="text-paper">{view === 'groups' ? `${groups.length} route groups` : `${encounters.length} card${encounters.length === 1 ? '' : 's'}${encounters.length ? ' · tap any card to open it' : ''}`}</p>
      {view === 'cards' ? encounters.length ? <ul aria-label="Collected cards" className="collection-cards grid grid-cols-2 gap-4">
        {encounters.map(c => <li key={c.id} className="min-w-0"><button type="button" className="block w-full text-left" onClick={() => onOpen(c.id)} aria-label={`Open card: route ${c.route}, ${c.model ?? 'unknown model'}, ${fmtDateTime(c.captureAt)}`}>
          <TrainCard card={c} cards={cards} size="sm" />
        </button></li>)}
      </ul> : <Dialogue tone="warn" title={cards.length ? 'No cards match' : 'No cards yet'}>
        {cards.length ? 'No saved cards match this search. Clear search to see all your cards.' : 'Scan a sign to create your first card. Group by route shows the routes you have not collected yet.'}
      </Dialogue> : groups.length ? <ul aria-label="Route groups" className="grid grid-cols-3 gap-3">
        {groups.map(r => {
          const count = counts.get(r) ?? 0
          const latest = [...cards].filter(c => c.route === r).sort(byCapture)[0]
          return <li key={r}><button type="button" onClick={() => onRoute(r)} aria-label={count ? `Route ${r}, ${count} card${count > 1 ? 's' : ''}` : `Route ${r}, not collected yet`} className={`${count ? 'px-panel' : 'px-inset'} flex min-h-[132px] w-[calc(100%-8px)] flex-col items-center justify-center gap-2 p-2 active:translate-y-0.5`}>
            <Sign route={r} variantId={latest?.variantId} muted={!count} size={45} />
            {count ? <><span className="font-pixel text-[16px] font-medium leading-none">×{count}</span><span className="text-[0.875rem] leading-none">card{count > 1 ? 's' : ''}</span></> : <><PixelIcon name="ask" size={22} /><span className="text-[0.875rem] leading-none">No cards yet</span></>}
          </button></li>
        })}
      </ul> : <Dialogue tone="warn" title="Nothing here">No routes match these filters.</Dialogue>}
      <p className="text-[0.9375rem] text-paper">{view === 'groups' ? 'Routes shown are a sample list. Counts are your own saved cards, not a catalog target.' : 'Every saved encounter is a separate card, including repeat sightings. Drafts are separate.'}</p>
      <PxButton v="primary" size="lg" icon="camera" onClick={onScan}>Scan</PxButton>
    </main>
  </div>
}

/* ---------- Route view ---------- */
export function RouteView({
  route,
  cards,
  onBack,
  onOpen,
  onScan,
}: {
  route: string
  cards: Card[]
  onBack: () => void
  onOpen: (id: string) => void
  onScan: () => void
}) {
  const [sort, setSort] = useState<'capture' | 'saved'>('capture')
  const mine = cards.filter((c) => c.route === route).sort(sort === 'capture' ? byCapture : bySaved)
  return (
    <div className="flex flex-col">
      <ScreenHeader
        title={`Route ${route}`}
        onBack={onBack}
        backLabel="Back to collection"
        right={<Sign route={route} variantId={mine[0]?.variantId} muted={!mine.length} size={45} />}
      />
      <main className="flex flex-col gap-4 p-4">
        {mine.length === 0 ? (
          <Panel className="flex flex-col items-center gap-3 text-center">
            <div className="px-inset flex h-28 w-28 items-center justify-center">
              <PixelIcon name="ask" size={48} />
            </div>
            <h2 className="font-pixel text-[24px] font-bold">No cards yet</h2>
            <p className="text-[1.0625rem]">
              You have not saved a route {route} sign. Scanning does not force a route: we recognize whatever you photograph.
            </p>
            <PxButton v="primary" icon="camera" onClick={onScan}>
              Scan a sign
            </PxButton>
          </Panel>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-paper">
              <p className="text-[1rem]">
                {mine.length} separate card{mine.length > 1 ? 's' : ''}
              </p>
              <div role="group" aria-label="Sort cards" className="flex gap-2">
                <PxButton size="sm" inline aria-pressed={sort === 'capture'} onClick={() => setSort('capture')} className="!mb-2">
                  Captured
                </PxButton>
                <PxButton size="sm" inline aria-pressed={sort === 'saved'} onClick={() => setSort('saved')} className="!mb-2">
                  Saved
                </PxButton>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-4">
              {mine.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => onOpen(c.id)}
                    aria-label={`Open card: route ${c.route}, ${c.model ?? 'unknown model'}, ${fmtDateTime(c.captureAt)}`}
                  >
                    <TrainCard card={c} cards={cards} size="sm" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-col">
              <PxButton v="primary" size="lg" icon="camera" onClick={onScan}>
                Scan a sign
              </PxButton>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

/* ---------- 9. Card detail ---------- */
export function Detail({
  card,
  cards,
  onBack,
  onScan,
  onOpen,
  onFullPhoto,
  onUpdate,
  onDelete,
  onDirty,
  onBusy,
  imported,
  photoMissing,
  backToCollection,
  onRetryPhoto,
  onPet,
}: {
  onPet: () => void
  card: Card
  cards: Card[]
  onBack: () => void
  onScan: () => void
  onOpen: (id: string) => void
  onFullPhoto: () => void
  onUpdate: (p: Partial<Card>) => Promise<boolean>
  onDelete: () => void
  onBusy: (busy: boolean) => void
  onDirty: (dirty: boolean) => void
  imported: boolean
  photoMissing: boolean
  backToCollection: boolean
  onRetryPhoto: () => void
}) {
  const backLabel = backToCollection ? 'Back to Collection' : `Back to route ${card.route}`
  const [edit, setEdit] = useState(false)
  const [changes, setChanges] = useState<Card>(card)
  const [applying, setApplying] = useState(false)
  const [editState, setEditState] = useState<'idle' | 'error' | 'success'>('idle')
  useEffect(() => {
    if (editState === 'error') document.getElementById('apply-details')?.focus()
    if (editState === 'success') document.getElementById('edit-success')?.focus()
  }, [editState])
  const dirty = edit && JSON.stringify(changes) !== JSON.stringify(card)
  useEffect(() => { onBusy(applying); return () => onBusy(false) }, [applying, onBusy])
  const apply = async () => {
    setApplying(true); setEditState('idle')
    const ok = await onUpdate(changes)
    setApplying(false)
    if (ok) { onDirty(false); setEdit(false); setEditState('success') }
    else setEditState('error')
  }
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])
  const [del, setDel] = useState(false)
  const v = card.variantId ? VARIANTS[card.variantId] : null
  const info = encounterInfo(cards, card)
  const others = cards
    .filter((c) => c.id !== card.id && c.route === card.route && c.variantId === card.variantId && card.variantId)
    .sort(byCapture)

  const rows: [string, string][] = [
    ['Route', card.route],
    ['Sign variant', v ? v.name : 'Not identified'],
    ['Train model', card.model ?? 'Unknown'],
    ['Station', card.station || 'Not added'],
    ['Captured', `${fmtDateTime(card.captureAt)} (${TIME_SOURCE_LABEL[card.timeSource].toLowerCase()})`],
    ['First collected', info ? fmtDate(info.first) : 'Not counted · variant unknown'],
    ['Encounters', info ? `${info.count} with this route + sign` : '—'],
    ['Saved', `${card.storage === 'device' ? 'On this device' : 'In your account'} · ${fmtDate(card.savedAt)}`],
  ]

  return (
    <div className="flex flex-col">
      <ScreenHeader title="Card" onBack={onBack} backLabel={backLabel} />
      <main className="flex flex-col gap-4 p-4">
        <div className="px-2">
          <TrainCard card={photoMissing ? { ...card, photo: '' } : card} cards={cards} sparkles />
          {photoMissing && <PxButton className="mt-4 w-full" onClick={onRetryPhoto}>Retry photo</PxButton>}
          {imported && <Dialogue className="mt-4" title="Imported in demo">Added to Demo collector in this session. Local copy retained; this encounter is shown once.</Dialogue>}
        </div>

        <div className="flex flex-col">
          <PxButton icon="photo" onClick={onFullPhoto}>
            View full photo
          </PxButton>
        </div>

        <Panel className="flex items-center gap-4">
          <PetSprite route={card.route} express={isExpress(card)} size={64} />
          <div className="min-w-0 flex-1">
            <p className="text-[0.875rem]">Companion</p>
            <p className="font-pixel text-[18px] font-bold leading-tight">{species(card.route).name}</p>
            <PxButton size="sm" inline className="!mb-1 mt-2" onClick={onPet}>Open in Traindex</PxButton>
          </div>
        </Panel>

        <Panel className="card-detail-panel">
          <PanelTitle right={<Chip tone={card.storage === 'device' ? 'paper' : 'ok'}>{card.storage === 'device' ? 'Device' : 'Account'}</Chip>}>
            Details
          </PanelTitle>
          <dl className="card-details">
            {rows.map(([k, val]) => (
              <div key={k} className="card-detail-row" data-wide={k === 'Captured' || k === 'Saved' ? '' : undefined}>
                <dt>{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
          {card.sample && <p className="sample-note"><Chip tone="gold">Sample</Chip><span>Prototype data, not a real encounter.</span></p>}
          {card.photoCredit && <p className="mt-2 text-[0.75rem] text-ink/75">{card.photoCredit}</p>}
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

        <Panel>
          <PanelTitle>Previous encounters</PanelTitle>
          {!v ? (
            <p>Sign variant unknown, so no encounter group is counted for this card.</p>
          ) : others.length === 0 ? (
            <p>This is your only sighting of {v.name}.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {others.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => onOpen(o.id)} className="previous-encounter px-inset grid w-[calc(100%-4px)] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-2 text-left">
                    <img src={o.photo} alt="" className="h-14 w-20 shrink-0 object-cover" />
                    <span className="col-span-2 row-start-2 min-w-0">
                      <span className="block font-medium">{fmtDateTime(o.captureAt)}</span>
                      <span className="block text-[0.9375rem]">
                        {o.model ?? 'Unknown'} · {o.station || 'No station'}
                      </span>
                    </span>
                    <PixelIcon name="chev" size={14} className="col-start-2 row-start-1" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[0.9375rem] text-ink/80">Counts follow route + sign variant, whatever the train model.</p>
        </Panel>

        {editState === 'success' && <div id="edit-success" tabIndex={-1}><Dialogue live tone="ok" title="Details updated (demo)">Changes are applied for this session. Reload still resets the prototype.</Dialogue></div>}
        {edit ? (
          <Panel className="flex flex-col gap-4">
            <PanelTitle>Edit capture details</PanelTitle>
            {applying && <div role="status"><div className="prog-bar my-3" />Applying changes (demo)…</div>}
            {editState === 'error' && <Dialogue live tone="error" title="Details were not updated">Your proposed changes are still in the form. Retry without re-entering them. Account edits need a connection.</Dialogue>}
            <Field label="Train model" id="e-model">
              <select
                id="e-model"
                disabled={applying}
                className="px-input"
                value={changes.model ?? ''}
                onChange={(e) => setChanges(c => ({ ...c, model: e.target.value || null }))}
              >
                <option value="">Unknown</option>
                {MODELS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Capture time" id="e-time">
              <input
                id="e-time"
                disabled={applying}
                type="datetime-local"
                className="px-input"
                value={changes.captureAt ?? ''}
                onChange={(e) => setChanges(c => ({ ...c, captureAt: e.target.value || null, timeSource: e.target.value ? 'user' : 'unknown' }))}
              />
            </Field>
            <Field label="Station (optional)" id="e-st">
              <input disabled={applying} id="e-st" className="px-input" value={changes.station} onChange={(e) => setChanges(c => ({ ...c, station: e.target.value }))} />
            </Field>
            <PxButton id="apply-details" v="primary" icon="check" disabled={applying || !dirty} onClick={apply}>
              {applying ? 'Applying…' : editState === 'error' ? 'Retry changes (demo)' : 'Apply changes (demo)'}
            </PxButton>
          </Panel>
        ) : (
          <div className="flex flex-col">
            <PxButton icon="pencil" onClick={() => { setChanges(card); setEditState('idle'); setEdit(true) }}>
              Edit capture details
            </PxButton>
          </div>
        )}

        <Disclosure title="Something looks wrong?">
          <p>
            If the route or sign was misread, the simple fixes are: edit the train model to Unknown above, or scan the
            sign again. This card keeps its own photo either way.
          </p>
        </Disclosure>

        <div className="flex flex-col">
          <PxButton v="primary" size="lg" icon="camera" onClick={onScan}>
            Scan another
          </PxButton>
          <PxButton icon="back" onClick={onBack}>
            {backLabel}
          </PxButton>
          <PxButton v="danger" icon="trash" disabled={applying} onClick={() => setDel(true)}>
            Delete card
          </PxButton>
        </div>
      </main>
      {del && (
        <Confirm
          title="Delete this card?"
          body={
            <>
              This removes only this encounter and its photo ({card.model ?? 'Unknown model'}, {fmtDate(card.captureAt ?? card.savedAt)}).
              {info && info.count > 1 ? ` Your other ${info.count - 1} route ${card.route} card(s) stay, and counts update.` : ''}
            </>
          }
          confirm="Delete card"
          danger
          onConfirm={() => {
            setDel(false)
            onDelete()
          }}
          onCancel={() => setDel(false)}
        />
      )}
    </div>
  )
}

/* ---------- Full photo viewer ---------- */
export function FullPhoto({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const dialog = useDialog(true, onClose)
  const [zoom, setZoom] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const previousStage = useRef({ width: 0, height: 0 })
  const [bounds, setBounds] = useState({ width: 0, height: 0 })
  const [natural, setNatural] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const element = viewport.current
    if (!element) return
    const measure = () => setBounds(current => {
      // Leave one pixel for fractional CSS-pixel rounding at browser zoom levels.
      const next = { width: Math.max(0, element.clientWidth - 1), height: Math.max(0, element.clientHeight - 1) }
      return current.width === next.width && current.height === next.height ? current : next
    })
    measure()
    const observer = new ResizeObserver(measure)
    // Scrollbar appearance must not change the 1× baseline during zoom.
    observer.observe(element, { box: 'border-box' })
    return () => observer.disconnect()
  }, [])
  const fit = natural.width && natural.height
    ? Math.min(bounds.width / natural.width, bounds.height / natural.height)
    : 0
  const width = natural.width * fit * (zoom ? 2 : 1)
  const height = natural.height * fit * (zoom ? 2 : 1)
  const stageWidth = Math.max(bounds.width, width)
  const stageHeight = Math.max(bounds.height, height)
  useLayoutEffect(() => {
    const element = viewport.current
    if (!element) return
    const previous = previousStage.current
    // Preserve the visible center when zooming; the scroll area owns all panning.
    const viewWidth = element.clientWidth
    const viewHeight = element.clientHeight
    const x = previous.width ? (element.scrollLeft + viewWidth / 2) / previous.width : .5
    const y = previous.height ? (element.scrollTop + viewHeight / 2) / previous.height : .5
    element.scrollLeft = x * stageWidth - viewWidth / 2
    element.scrollTop = y * stageHeight - viewHeight / 2
    previousStage.current = { width: stageWidth, height: stageHeight }
  }, [stageWidth, stageHeight, bounds.width, bounds.height])
  return (
    <div
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Full photo"
      className="photo-dialog fixed inset-0 z-[70] flex flex-col bg-ink"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 p-4">
        <PxButton icon="close" onClick={onClose} inline className="!mb-2">
          Close
        </PxButton>
        <PxButton aria-pressed={zoom} disabled={!fit} aria-controls="full-photo-viewport" onClick={() => setZoom((z) => !z)} inline className="!mb-2">
          {zoom ? 'Zoom: 2×' : 'Zoom: 1×'}
        </PxButton>
      </div>
      <p className="px-4 pb-2 text-sm text-paper" role="status">{zoom ? '2× zoom · swipe or scroll to explore the photo.' : 'Full photo · select 2× to see more detail.'}</p>
      <div ref={viewport} id="full-photo-viewport" tabIndex={0} role="region" aria-label="Photo; scroll to pan when zoomed" className="photo-viewport min-h-0 min-w-0 flex-1 overflow-auto">
        <div className="photo-stage" style={{ width: stageWidth || '100%', height: stageHeight || '100%', '--photo-width': `${width}px`, '--photo-height': `${height}px` } as React.CSSProperties}>
          <CardPhoto key={src} src={src} alt={alt} className="full-photo-image" onLoad={image => setNatural({ width: image.naturalWidth, height: image.naturalHeight })} />
        </div>
      </div>
    </div>
  )
}

/* ---------- 10. Settings ---------- */
export function Settings({
  signedIn,
  count,
  motion,
  onMotion,
  onSignIn,
  onSignOut,
  onImport,
  importedCount,
  onBack,
}: {
  signedIn: boolean
  count: number
  motion: 'system' | 'reduce' | 'full'
  onMotion: (m: 'system' | 'reduce' | 'full') => void
  onSignIn: () => void
  onSignOut: () => void
  onImport: () => void
  importedCount: number
  onBack: () => void
}) {
  const opts: { id: 'system' | 'reduce' | 'full'; label: string }[] = [
    { id: 'system', label: 'Match device' },
    { id: 'reduce', label: 'Reduce' },
    { id: 'full', label: 'Full' },
  ]
  return (
    <div className="flex flex-col">
      <ScreenHeader title="Settings" onBack={onBack} />
      <main className="flex flex-col gap-4 p-4">
        <Panel>
          <PanelTitle right={<StorageChip signedIn={signedIn} />}>Saving</PanelTitle>
          {signedIn ? (
            <>
              <p className="mb-3 text-[1.0625rem]">Signed in as <b>Demo collector</b> (simulated). Account saves are simulated.</p>
              <PxButton v="primary" onClick={onImport}>Add device cards to my account</PxButton>
              <p className="mb-3">{importedCount} of {count} device cards imported in this demo. Local copies kept.</p>
              <PxButton onClick={onSignOut}>Sign out</PxButton>
            </>
          ) : (
            <>
              <p className="mb-3 text-[1.0625rem]">
                {count} device cards in this demo session. You do not need an account. Nothing survives refresh.
              </p>
              <PxButton v="primary" onClick={onSignIn}>
                Sign in / Create account
              </PxButton>
            </>
          )}
          <p className="text-[0.9375rem] text-ink/80">
            Import is an explicit prototype choice. Nothing syncs automatically. Accounts, cards, and drafts are in-memory simulations.
          </p>
        </Panel>

        <Panel>
          <PanelTitle>Reduced motion</PanelTitle>
          <p className="mb-3 text-[1rem]">Turns off sparkles, foil shimmer, and the reveal animation.</p>
          <fieldset className="flex flex-wrap gap-4">
            <legend className="sr-only">Motion preference</legend>
            {opts.map(o => <label key={o.id} className="flex min-h-11 items-center gap-2"><input type="radio" name="motion" checked={motion === o.id} onChange={() => onMotion(o.id)} className="h-5 w-5 accent-ink" />{o.label}</label>)}
          </fieldset>
        </Panel>

        <Panel>
          <PanelTitle>Help & privacy</PanelTitle>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-[1rem]">
            <li>Recognition can send your photo or sign crop to an AI service.</li>
            <li>Photo location data is never turned into a station.</li>
            <li>Clearing site data can remove cards saved on this device.</li>
          </ul>
        </Panel>
      </main>
    </div>
  )
}
