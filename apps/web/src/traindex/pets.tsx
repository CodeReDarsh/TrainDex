import { memo, useMemo } from 'react'
import { type Card, ROUTES, VARIANTS, fmtDate, routeColor } from './data'
import { Chip, Panel, PanelTitle, PixelIcon, PxButton, ScreenHeader } from './ui'
import { PixelText } from './pixel'
import { Gear, SteamPuffs } from './steam'

/* ---------- Species ---------- */

// one species per route; diamond (express) signs hatch the express form
const NAMES: Record<string, string> = {
  '1': 'Unicog', '2': 'Duoflue', '3': 'Trivalve',
  '4': 'Quadrapuff', '5': 'Pentapiston', '6': 'Hexaburr', '7': 'Septuspark',
  A: 'Axlebolt', C: 'Cindercub', E: 'Embersnout',
  B: 'Boilerbun', D: 'Dynamole', F: 'Fluxfinch', M: 'Mosspipe',
  G: 'Gearsprout', J: 'Jouleboar', Z: 'Zinkwhistle', L: 'Lugnut',
  N: 'Nozzlenewt', Q: 'Quillsteam', R: 'Rivetroo', W: 'Wattwhisk',
  S: 'Shuttlebug', K: 'Kettlewraith', V: 'Vaporvex', '9': 'Ninebolt',
}

const TYPES: [string, string[], string][] = [
  ['Hydro', ['A', 'C', 'E'], 'Paddles through the deep 8th Av tunnels. Its boiler hums whenever an express thunders past.'],
  ['Ember', ['B', 'D', 'F', 'M'], 'Glows like a firebox on cold platforms. Commuters warm their hands near it in winter.'],
  ['Sprout', ['G'], 'Grows tiny brass leaves along the Crosstown. Never goes into Manhattan, and is proud of it.'],
  ['Steel', ['L'], 'Polished to a mirror shine. Runs the 14th St line on a perfectly tight schedule.'],
  ['Rust', ['J', 'Z'], 'Old soul of the Nassau St line. Creaks when it laughs, which is often.'],
  ['Volt', ['N', 'Q', 'R', 'W'], 'Crackles with stray current from the third rail. Its fur stands up near Canal St.'],
  ['Furnace', ['1', '2', '3'], 'Stokes itself with coal dust from the 7th Av line. Very warm, very loyal.'],
  ['Piston', ['4', '5', '6'], 'Pumps along Lexington Av at rush hour. Loves crowds more than any other pet.'],
  ['Aether', ['7'], 'Floats over Queens on the elevated tracks, trailing purple steam.'],
  ['Shuttle', ['S'], 'Goes back and forth, back and forth. Never gets dizzy.'],
]

export interface Species {
  route: string
  no: number
  name: string
  type: string
  blurb: string
  color: string
  retired: boolean
}

function hash(s: string) {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

function rng(seed: string) {
  let state = hash(seed) || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
}

const SYLLABLES = [['Cog', 'Bolt', 'Rivet', 'Piston', 'Brass', 'Spark', 'Gauge', 'Valve', 'Coal', 'Smoke', 'Whistle', 'Tender'], ['ling', 'mon', 'bun', 'ster', 'puff', 'wick', 'nub', 'kin']]

export function species(route: string): Species {
  const known = ROUTES.indexOf(route)
  const type = TYPES.find(([, routes]) => routes.includes(route))
  const r = rng(route)
  const name = NAMES[route] ?? SYLLABLES[0][Math.floor(r() * 12)] + SYLLABLES[1][Math.floor(r() * 8)]
  return {
    route,
    no: known >= 0 ? known + 1 : ROUTES.length + 1 + (hash(route) % 900),
    name,
    type: type?.[0] ?? 'Phantom',
    blurb: type?.[2] ?? 'Rides lines that no longer run. Only appears to riders who notice old signs.',
    color: routeColor(route),
    retired: known < 0,
  }
}

/** Routes the user has caught, in dex order: current lines first, then retired ones. */
export function dexEntries(cards: Card[]) {
  const caught = new Set(cards.map((c) => c.route))
  const extra = [...caught].filter((r) => !ROUTES.includes(r)).sort()
  return [...ROUTES, ...extra].map((route) => ({ ...species(route), caught: caught.has(route) }))
}

export const isExpress = (card: Card) => (card.variantId ? VARIANTS[card.variantId]?.shape === 'diamond' : false)

export function stats(route: string, express: boolean) {
  const r = rng(`${route}:stats`)
  const roll = () => 30 + Math.floor(r() * 66)
  const speed = Math.min(99, roll() + (express ? 12 : 0))
  return [['Speed', speed], ['Steam', roll()], ['Grit', roll()], ['Charm', roll()]] as const
}

/* ---------- Sprite ---------- */

// Front views of little train characters, 16x16. The cab windows are the eyes.
// o outline  b body  h highlight  s shade  w glass  e pupil  l headlight  c cheek
// m mouth  a brass  G dark metal  k headsign  d headsign dot (line color)
type Model = 'subway' | 'steam' | 'trolley' | 'bullet' | 'switcher'

const MODELS: Record<Model, string[]> = {
  subway: [
    '...oooooooooo...',
    '...okkkddkkko...',
    '..oooooooooooo..',
    '.obbbbbbbbbbbbo.',
    '.obwwwbbbbwwwbo.',
    '.obwwebbbbewwbo.',
    '.obwwwbbbbwwwbo.',
    '.obbbcbbbbcbbbo.',
    '.obbbbbmmbbbbbo.',
    '.ohhhhhhhhhhhho.',
    '.olbbbbbbbbbblo.',
    '.osssssssssssso.',
    '..oGGGGGGGGGGo..',
    '...oGo....oGo...',
    '...ooo....ooo...',
    '................',
  ],
  steam: [
    '......oooo......',
    '......oGGo......',
    '......oGGo......',
    '...oooooooooo...',
    '..obbbbbbbbbbo..',
    '.obbwwbbbbwwbbo.',
    '.obbwebbbbewbbo.',
    '.obbbbbbbbbbbbo.',
    '.obcbbbmmbbbcbo.',
    '.obbbbbbbbbbbbo.',
    '..oaaaallaaaao..',
    '..osssssssssso..',
    '.oGGGGGGGGGGGGo.',
    '..oGoGoGoGoGoo..',
    '...oooooooooo...',
    '................',
  ],
  trolley: [
    '.....oooooo.....',
    '......o..o......',
    '.......oo.......',
    '...oooooooooo...',
    '..ohhhhhhhhhho..',
    '.obbbbbbbbbbbbo.',
    '.obwwwwbbwwwwbo.',
    '.obwwewbbwewwbo.',
    '.obwwwwbbwwwwbo.',
    '.obbbbbmmbbbbbo.',
    '.obcbbbbbbbbcbo.',
    '.osssssssssssso.',
    '.olsssssssssslo.',
    '..oGGGGGGGGGGo..',
    '...oGo....oGo...',
    '...ooo....ooo...',
  ],
  bullet: [
    '................',
    '.....oooooo.....',
    '...oohhhhhhoo...',
    '..ohhbbbbbbhho..',
    '.obbbbbbbbbbbbo.',
    '.owwwwwwwwwwwwo.',
    '.owwwewwwwewwwo.',
    '.owwwwwwwwwwwwo.',
    '.obbbbbmmbbbbbo.',
    '.obcbbbbbbbbcbo.',
    '.oaaaaaaaaaaaao.',
    '.olbbbbbbbbbblo.',
    '..osssssssssso..',
    '...oGGGGGGGGo...',
    '...oGo....oGo...',
    '...ooo....ooo...',
  ],
  switcher: [
    '......oaao......',
    '......oaao......',
    '..oooooooooooo..',
    '..oGGGGGGGGGGo..',
    '.obbbbbbbbbbbbo.',
    '.obwwwbbbbwwwbo.',
    '.obweebbbbeewbo.',
    '.obwwwbbbbwwwbo.',
    '.obbbbbbbbbbbbo.',
    '.obbbbbmmbbbbbo.',
    '.oaGaGaGaGaGaGo.',
    '.olbbbbbbbbbblo.',
    '.osssssssssssso.',
    '..oGGGGGGGGGGo..',
    '..oGo......oGo..',
    '..ooo......ooo..',
  ],
}

const ORDER: Model[] = ['subway', 'steam', 'trolley', 'bullet', 'switcher']

export const MODEL_NAMES: Record<Model, string> = {
  subway: 'Subway car',
  steam: 'Steam engine',
  trolley: 'Trolley',
  bullet: 'Bullet train',
  switcher: 'Switcher',
}

/** Lines that share a color get different train models, so siblings never look alike. */
export function model(route: string): Model {
  const group = TYPES.find(([, routes]) => routes.includes(route))
  if (!group) return ORDER[hash(route) % ORDER.length]
  return ORDER[(group[1].indexOf(route) + hash(group[0])) % ORDER.length]
}

const mix = (hex: string, to: string, t: number) => {
  const a = parseInt(hex.slice(1), 16)
  const b = parseInt(to.slice(1), 16)
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t)
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`
}

function palette(color: string, express: boolean): Record<string, string> {
  return {
    o: '#14233f',
    b: color,
    h: express ? '#ffd84d' : mix(color, '#ffffff', 0.38),
    s: mix(color, '#000000', 0.32),
    w: '#dff3ff',
    e: '#14233f',
    l: '#ffe27a',
    c: express ? '#ffd84d' : '#ff8fa3',
    m: '#14233f',
    a: '#d9a441',
    G: '#4e5d6c',
    k: '#14233f',
    d: mix(color, '#ffffff', 0.15),
  }
}

const cache = new Map<string, Record<string, string>>()

function paths(route: string) {
  let d = cache.get(route)
  if (!d) {
    d = {}
    MODELS[model(route)].forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c !== '.') d![c] = (d![c] ?? '') + `M${x} ${y}h1v1h-1z`
      }),
    )
    cache.set(route, d)
  }
  return d
}

export const PetSprite = memo(function PetSprite({
  route,
  express = false,
  size = 64,
  hidden,
  idle = true,
  label,
}: {
  route: string
  express?: boolean
  size?: number
  hidden?: boolean
  idle?: boolean
  label?: string
}) {
  const d = paths(route)
  const colors = palette(routeColor(route), express)
  const chimney = model(route) === 'steam'
  const scale = Math.max(1, Math.round(size / 16))
  const px = 16 * scale
  return (
    <span className={`pet ${idle && !hidden ? 'pet-idle' : ''}`} style={{ width: px, height: px }} role="img" aria-label={label ?? (hidden ? 'Unknown pet' : `${species(route).name} pet`)}>
      {chimney && !hidden && idle && <SteamPuffs className="pet-steam" style={{ left: '44%' }} />}
      <svg viewBox="0 0 16 16" width={px} height={px} shapeRendering="crispEdges" aria-hidden="true">
        {Object.entries(d).map(([c, path]) =>
          <path key={c} d={path} fill={hidden ? '#14233f' : colors[c]} opacity={hidden ? 0.55 : 1} />,
        )}
      </svg>
    </span>
  )
})

/* ---------- Screens ---------- */

export function PetDex({ cards, onOpen, onBack, onScan }: { cards: Card[]; onOpen: (route: string) => void; onBack: () => void; onScan: () => void }) {
  const entries = useMemo(() => dexEntries(cards), [cards])
  const found = entries.filter((e) => e.caught).length
  const current = entries.filter((e) => !e.retired).length
  return (
    <div className="flex flex-col">
      <ScreenHeader title="Traindex" onBack={onBack} backLabel="Back to Home" right={<Gear size={40} teeth={10} className="gear-spin" />} />
      <main className="flex flex-col gap-4 p-4">
        <Panel>
          <PanelTitle right={<Chip tone="gold">Pets</Chip>}>Discovered</PanelTitle>
          <div className="flex items-end gap-2">
            <PixelText text={String(found)} scale={6} />
            <PixelText text={`/${current}`} scale={3} className="mb-0.5" />
          </div>
          <div className="dex-meter mt-3" aria-hidden="true"><span style={{ width: `${Math.min(100, (found / current) * 100)}%` }} /></div>
          <p className="mt-2 text-[0.9375rem] text-ink/80">Every line has its own pet. Scan a train sign to hatch it. Diamond signs hatch the express form.</p>
        </Panel>
        <ul aria-label="Traindex entries" className="grid grid-cols-3 gap-3">
          {entries.map((e) => {
            const count = cards.filter((c) => c.route === e.route).length
            return (
              <li key={e.route}>
                <button
                  type="button"
                  disabled={!e.caught}
                  onClick={() => onOpen(e.route)}
                  aria-label={e.caught ? `${e.name}, number ${e.no}, caught ${count} times` : `Number ${e.no}, not discovered yet`}
                  className={`dex-tile ${e.caught ? 'px-panel' : 'px-inset'} flex w-[calc(100%-8px)] flex-col items-center gap-1 p-2`}
                  data-retired={e.retired ? '' : undefined}
                >
                  <span className="self-start font-pixel text-[13px] font-bold">#{String(e.no).padStart(3, '0')}</span>
                  <PetSprite route={e.route} size={56} hidden={!e.caught} idle={e.caught} />
                  <span className="max-w-full truncate text-[0.8125rem] font-bold">{e.caught ? e.name : '???'}</span>
                  <span className="text-[0.75rem]">{e.caught ? `Line ${e.route} · ×${count}` : `Line ${e.route}`}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <PxButton v="primary" size="lg" icon="camera" onClick={onScan}>Scan to hatch</PxButton>
      </main>
    </div>
  )
}

export function PetDetail({ route, cards, onBack, onOpenCard }: { route: string; cards: Card[]; onBack: () => void; onOpenCard: (id: string) => void }) {
  const sp = species(route)
  const mine = cards.filter((c) => c.route === route).sort((a, b) => a.savedAt.localeCompare(b.savedAt))
  const express = mine.some(isExpress)
  const local = mine.some((c) => !isExpress(c))
  const level = Math.min(99, mine.length * 5)
  return (
    <div className="flex flex-col">
      <ScreenHeader title={`#${String(sp.no).padStart(3, '0')}`} onBack={onBack} backLabel="Back to Traindex" />
      <main className="flex flex-col gap-4 p-4">
        <Panel dark className="pet-stage relative flex flex-col items-center overflow-hidden pb-6 pt-8">
          <Gear size={120} teeth={14} className="gear-spin pet-stage-gear" />
          <Gear size={70} teeth={9} className="gear-spin-rev pet-stage-gear2" />
          <div className="flex items-end gap-6">
            {(local || !express) && <PetSprite route={route} size={160} label={`${sp.name}, local form`} />}
            {express && <PetSprite route={route} express size={local ? 112 : 160} label={`${sp.name}, express form`} />}
          </div>
          <div className="pet-plinth" aria-hidden="true" />
        </Panel>
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-pixel text-[24px] font-bold">{sp.name}</h2>
            <Chip tone="gold">Lv {level}</Chip>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip tone="teal">{sp.type} type</Chip>
            <Chip>{MODEL_NAMES[model(route)]}</Chip>
            <Chip>Line {route}</Chip>
            {express && <Chip tone="ok">Express form</Chip>}
            {sp.retired && <Chip tone="alert">Retired line</Chip>}
          </div>
          <p className="mt-3 text-[1rem]">{sp.blurb}</p>
        </Panel>
        <Panel>
          <PanelTitle>Stats</PanelTitle>
          <dl className="flex flex-col gap-2">
            {stats(route, express).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
                <dt className="font-bold">{k}</dt>
                <dd className="stat-bar" aria-hidden="true"><span style={{ width: `${v}%`, background: sp.color }} /></dd>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel>
          <PanelTitle>Hatched from</PanelTitle>
          {mine.length ? (
            <ul className="flex flex-col gap-2">
              {mine.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => onOpenCard(c.id)} className="px-inset grid w-[calc(100%-4px)] grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-3 p-2 text-left">
                    <img src={c.photo} alt="" className="h-12 w-20 object-cover" />
                    <span className="min-w-0">
                      <span className="block font-bold">{fmtDate(c.captureAt ?? c.savedAt)}</span>
                      <span className="block truncate text-[0.875rem]">{isExpress(c) ? 'Express sign' : 'Local sign'} · {c.station || 'No station'}</span>
                    </span>
                    <PixelIcon name="chev" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : <p>Not caught yet.</p>}
          <p className="mt-3 text-[0.9375rem] text-ink/80">Every card you save for line {route} levels {sp.name} up.</p>
        </Panel>
      </main>
    </div>
  )
}

/** "A pet hatched" moment for the reveal screen. */
export function Hatch({ card, cards, onDex }: { card: Card; cards: Card[]; onDex: () => void }) {
  const sp = species(card.route)
  const count = cards.filter((c) => c.route === card.route).length
  const express = isExpress(card)
  return (
    <Panel className="hatch flex items-center gap-4">
      <div className="hatch-pop relative shrink-0">
        <PetSprite route={card.route} express={express} size={80} />
        <SteamPuffs className="hatch-steam" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-pixel text-[18px] font-bold leading-tight">{count > 1 ? `${sp.name} leveled up!` : `${sp.name} hatched!`}</p>
        <p className="text-[0.9375rem]">{count > 1 ? `Lv ${Math.min(99, count * 5)} · ${count} cards on line ${card.route}` : `New Traindex entry #${String(sp.no).padStart(3, '0')}${express ? ' · express form' : ''}`}</p>
        <PxButton size="sm" inline className="!mb-1 mt-2" onClick={onDex}>Open in Traindex</PxButton>
      </div>
    </Panel>
  )
}
