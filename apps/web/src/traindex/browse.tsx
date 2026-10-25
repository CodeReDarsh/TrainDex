import { useState } from 'react'
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

const byCapture = (a: Card, b: Card) => (b.captureAt ?? b.savedAt).localeCompare(a.captureAt ?? a.savedAt)
const bySaved = (a: Card, b: Card) => b.savedAt.localeCompare(a.savedAt)

export function StorageChip({ signedIn }: { signedIn: boolean }) {
  return signedIn ? <Chip tone="ok">Account</Chip> : <Chip tone="paper">On this device</Chip>
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
}: {
  cards: Card[]
  signedIn: boolean
  onScan: () => void
  onCollection: () => void
  onOpen: (id: string) => void
  onSettings: () => void
  onSignIn: () => void
}) {
  const recent = [...cards].sort(bySaved).slice(0, 6)
  const routes = new Set(cards.map((c) => c.route)).size
  return (
    <main className="flex flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        <h1 className="flex-1">
          <Logo width={250} />
        </h1>
        <PxButton size="icon" aria-label="Settings" onClick={onSettings} className="!mb-2">
          <PixelIcon name="gear" size={24} />
        </PxButton>
      </header>

      <Panel>
        <PanelTitle right={<StorageChip signedIn={signedIn} />}>
          {signedIn ? 'Your account' : 'This device'}
        </PanelTitle>
        <dl className="grid grid-cols-2 gap-3">
          <div className="px-inset p-3">
            <dt className="font-pixel text-[16px] font-medium uppercase tracking-normal">Cards</dt>
            <dd><PixelText text={String(cards.length)} scale={6} /></dd>
          </div>
          <div className="px-inset p-3">
            <dt className="font-pixel text-[16px] font-medium uppercase tracking-normal">Routes</dt>
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

      <section aria-labelledby="recent-h">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="recent-h" className="font-pixel text-[16px] font-medium text-paper">
            Recent cards
          </h2>
        </div>
        {recent.length === 0 ? (
          <Panel className="text-center">
            <PixelIcon name="ask" size={32} className="mx-auto mb-2" />
            <p className="font-pixel text-[16px] font-medium">No cards yet</p>
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
type Filter = 'all' | 'collected' | 'missing'

export function Collection({
  cards,
  signedIn,
  onScan,
  onRoute,
  onBack,
}: {
  cards: Card[]
  signedIn: boolean
  onScan: () => void
  onRoute: (r: string) => void
  onBack: () => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const counts = new Map<string, number>()
  cards.forEach((c) => counts.set(c.route, (counts.get(c.route) ?? 0) + 1))
  const variants = new Set(cards.filter((c) => c.variantId).map((c) => `${c.route}|${c.variantId}`)).size
  const list = ROUTES.filter((r) => {
    const has = counts.has(r)
    if (filter === 'collected' && !has) return false
    if (filter === 'missing' && has) return false
    return !q.trim() || r.toLowerCase().includes(q.trim().toLowerCase())
  })
  const dirty = filter !== 'all' || q !== ''
  const segs: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All routes' },
    { id: 'collected', label: 'Collected' },
    { id: 'missing', label: 'Not yet' },
  ]

  return (
    <div className="flex flex-col">
      <ScreenHeader title="My Collection" onBack={onBack} backLabel="Back to Home" />
      <main className="flex flex-col gap-4 p-4">
        <Panel>
          <div className="mb-2 flex items-center justify-between">
            <StorageChip signedIn={signedIn} />
            <span className="text-[0.9375rem]">{signedIn ? 'Account cards' : 'Saved on this device'}</span>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Cards', cards.length],
              ['Routes', counts.size],
              ['Signs', variants],
            ].map(([l, n]) => (
              <div key={l} className="px-inset p-2">
                <dt className="font-pixel text-[16px] font-medium uppercase tracking-normal">{l}</dt>
                <dd><PixelText text={String(n)} scale={4} /></dd>
              </div>
            ))}
          </dl>
        </Panel>

        <div className="flex flex-col gap-3">
          <div role="group" aria-label="Filter routes" className="grid grid-cols-3 gap-2">
            {segs.map((s) => (
              <PxButton
                key={s.id}
                size="sm"
                aria-pressed={filter === s.id}
                onClick={() => setFilter(s.id)}
                className="!mb-2 !px-1 text-[0.9375rem]"
              >
                {s.label}
              </PxButton>
            ))}
          </div>
          <div className="relative">
            <label htmlFor="rq" className="sr-only">
              Search routes
            </label>
            <input
              id="rq"
              type="search"
              inputMode="text"
              placeholder="Search route, e.g. A"
              className="px-input !pl-11"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <PixelIcon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
          {dirty && (
            <PxButton
              size="sm"
              onClick={() => {
                setFilter('all')
                setQ('')
              }}
              className="!mb-1"
            >
              Clear filters
            </PxButton>
          )}
        </div>

        {list.length === 0 ? (
          <Dialogue tone="warn" live title="Nothing here">
            No routes match these filters.
          </Dialogue>
        ) : (
          <ul className="grid grid-cols-3 gap-3">
            {list.map((r) => {
              const n = counts.get(r) ?? 0
              const latest = [...cards].filter((c) => c.route === r).sort(byCapture)[0]
              return (
                <li key={r}>
                  <button
                    type="button"
                    onClick={() => onRoute(r)}
                    aria-label={n ? `Route ${r}, ${n} card${n > 1 ? 's' : ''}` : `Route ${r}, not collected yet`}
                    className={`${n ? 'px-panel' : 'px-inset'} flex min-h-[132px] w-[calc(100%-8px)] flex-col items-center justify-center gap-2 p-2 active:translate-y-0.5`}
                  >
                    <Sign route={r} variantId={latest?.variantId} muted={!n} size={45} />
                    {n ? (
                      <>
                        <span className="font-pixel text-[16px] font-medium leading-none">×{n}</span>
                        <span className="text-[0.875rem] leading-none">card{n > 1 ? 's' : ''}</span>
                      </>
                    ) : (
                      <>
                        <PixelIcon name="ask" size={22} />
                        <span className="text-[0.875rem] leading-none">No cards yet</span>
                      </>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <p className="text-[0.9375rem] text-paper">
          Routes shown are a sample list. Counts are your own saved cards, not a catalog target.
        </p>
        <PxButton v="primary" size="lg" icon="camera" onClick={onScan}>
          Scan
        </PxButton>
      </main>
    </div>
  )
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
            <h2 className="font-pixel text-[24px] font-medium">No cards yet</h2>
            <p className="text-[1.0625rem]">
              You have not saved a route {route} sign. Scanning does not force a route: we recognize whatever you photograph.
            </p>
            <PxButton v="primary" icon="camera" onClick={onScan}>
              Scan a sign
            </PxButton>
          </Panel>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 text-paper">
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
}: {
  card: Card
  cards: Card[]
  onBack: () => void
  onScan: () => void
  onOpen: (id: string) => void
  onFullPhoto: () => void
  onUpdate: (p: Partial<Card>) => void
  onDelete: () => void
}) {
  const [edit, setEdit] = useState(false)
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
      <ScreenHeader title="Card" onBack={onBack} backLabel={`Back to route ${card.route}`} />
      <main className="flex flex-col gap-4 p-4">
        <div className="px-2">
          <TrainCard card={card} cards={cards} sparkles />
        </div>

        <div className="flex flex-col">
          <PxButton icon="photo" onClick={onFullPhoto}>
            View full photo
          </PxButton>
        </div>

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
            <p>Shape: {v.shape}. Credit: {v.credit}. The sign style is not proof of the photographed train model.</p>
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
                  <button type="button" onClick={() => onOpen(o.id)} className="px-inset flex w-[calc(100%-4px)] items-center gap-3 p-2 text-left">
                    <img src={o.photo} alt="" className="h-14 w-20 shrink-0 object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{fmtDateTime(o.captureAt)}</span>
                      <span className="block text-[0.9375rem]">
                        {o.model ?? 'Unknown'} · {o.station || 'No station'}
                      </span>
                    </span>
                    <PixelIcon name="chev" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[0.9375rem] text-ink/80">Counts follow route + sign variant, whatever the train model.</p>
        </Panel>

        {edit ? (
          <Panel className="flex flex-col gap-4">
            <PanelTitle>Edit capture details</PanelTitle>
            <Field label="Train model" id="e-model">
              <select
                id="e-model"
                className="px-input"
                value={card.model ?? ''}
                onChange={(e) => onUpdate({ model: e.target.value || null })}
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
                type="datetime-local"
                className="px-input"
                value={card.captureAt ?? ''}
                onChange={(e) => onUpdate({ captureAt: e.target.value || null, timeSource: e.target.value ? 'user' : 'unknown' })}
              />
            </Field>
            <Field label="Station (optional)" id="e-st">
              <input id="e-st" className="px-input" value={card.station} onChange={(e) => onUpdate({ station: e.target.value })} />
            </Field>
            <PxButton v="primary" icon="check" onClick={() => setEdit(false)}>
              Done
            </PxButton>
          </Panel>
        ) : (
          <div className="flex flex-col">
            <PxButton icon="pencil" onClick={() => setEdit(true)}>
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
            Back to route {card.route}
          </PxButton>
          <PxButton v="danger" icon="trash" onClick={() => setDel(true)}>
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
  const [zoom, setZoom] = useState(false)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full photo"
      className="fixed inset-0 z-[70] flex flex-col bg-ink"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="flex items-center justify-between gap-2 p-4">
        <PxButton autoFocus icon="close" onClick={onClose} inline className="!mb-2">
          Close
        </PxButton>
        <PxButton aria-pressed={zoom} onClick={() => setZoom((z) => !z)} inline className="!mb-2">
          {zoom ? 'Zoom: 2×' : 'Zoom: 1×'}
        </PxButton>
      </div>
      <div className="flex-1 overflow-auto px-2 pb-6">
        <img src={src} alt={alt} className={`mx-auto block ${zoom ? 'max-w-none' : 'max-h-full max-w-full object-contain'}`} style={zoom ? { width: '200%' } : undefined} />
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
  onBack,
}: {
  signedIn: boolean
  count: number
  motion: 'system' | 'reduce' | 'full'
  onMotion: (m: 'system' | 'reduce' | 'full') => void
  onSignIn: () => void
  onSignOut: () => void
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
              <p className="mb-3 text-[1.0625rem]">Signed in as <b>sample.user@example.com</b> (simulated). New cards save to your account.</p>
              <PxButton onClick={onSignOut}>Sign out</PxButton>
            </>
          ) : (
            <>
              <p className="mb-3 text-[1.0625rem]">
                Cards are saved on this device in your browser ({count} in this prototype). You do not need an account.
              </p>
              <PxButton v="primary" onClick={onSignIn}>
                Sign in / Create account
              </PxButton>
            </>
          )}
          <p className="text-[0.9375rem] text-ink/80">
            Whether device cards can be added to an account later is still undecided. Nothing syncs automatically.
          </p>
        </Panel>

        <Panel>
          <PanelTitle>Reduced motion</PanelTitle>
          <p className="mb-3 text-[1rem]">Turns off sparkles, foil shimmer, and the reveal animation.</p>
          <div role="radiogroup" aria-label="Motion" className="grid grid-cols-3 gap-2">
            {opts.map((o) => (
              <PxButton
                key={o.id}
                size="sm"
                role="radio"
                aria-checked={motion === o.id}
                aria-pressed={motion === o.id}
                onClick={() => onMotion(o.id)}
                className="!mb-2 !px-1 text-[0.9375rem]"
              >
                {o.label}
              </PxButton>
            ))}
          </div>
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
