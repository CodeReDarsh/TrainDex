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

type Cell = '' | 'o' | 'b' | 'h' | 's' | 'l' | 'a' | 'w' | 'e' | 'c'

// half-widths of the body for rows 4..13
const PROFILES = [
  [3, 5, 6, 6, 7, 7, 7, 6, 6, 4], // round
  [2, 3, 4, 4, 5, 6, 7, 7, 7, 5], // pear
  [3, 4, 4, 5, 5, 5, 5, 5, 5, 4], // tall
  [5, 6, 6, 6, 6, 6, 6, 6, 6, 6], // boiler
  [4, 6, 7, 7, 7, 7, 7, 7, 6, 5], // wide
]

type Hat = 'tophat' | 'chimney' | 'gear' | 'ears' | 'none'
const HATS: Hat[] = ['tophat', 'chimney', 'gear', 'ears', 'none', 'chimney']

export function design(route: string, express: boolean) {
  const r = rng(`pet:${route}`)
  const profile = PROFILES[Math.floor(r() * PROFILES.length)]
  const hat = HATS[Math.floor(r() * HATS.length)]
  const pattern = Math.floor(r() * 3) // 0 plain, 1 stripes, 2 rivets
  const feet = r() > 0.5 ? 'wheels' : 'legs'
  return { profile, hat, pattern, feet, goggles: express || r() > 0.8 }
}

function build(route: string, express: boolean): Cell[][] {
  const { profile, hat, pattern, feet, goggles } = design(route, express)
  const g: Cell[][] = Array.from({ length: 16 }, () => Array<Cell>(16).fill(''))
  const set = (y: number, x: number, c: Cell) => {
    if (y < 0 || y > 15 || x < 0 || x > 15) return
    g[y][x] = c
    g[y][15 - x] = c
  }

  profile.forEach((w, i) => {
    const y = 4 + i
    for (let x = 8 - w; x < 8; x++) {
      const edge = x === 8 - w
      let c: Cell = 'b'
      if (i < 2 && !edge) c = 'h'
      if (i >= 8) c = 's'
      if (i >= 4 && i <= 8 && x >= 6) c = 'l'
      if (pattern === 1 && edge && i % 2 === 0 && i < 8) c = 's'
      set(y, x, c)
    }
  })
  if (pattern === 2) {
    set(9, 8 - profile[5] + 1, 'a')
    set(11, 8 - profile[7] + 1, 'a')
  }

  // eyes look toward the middle; goggles get a brass rim
  if (goggles) for (const [y, x] of [[5, 3], [5, 4], [5, 5], [5, 6], [8, 3], [8, 4], [8, 5], [8, 6], [6, 3], [7, 3], [6, 6], [7, 6]]) set(y, x, 'a')
  set(6, 4, 'w'); set(6, 5, 'e'); set(7, 4, 'e'); set(7, 5, 'e')
  if (profile[5] >= 5) set(8, 3, goggles ? 'a' : 'c')
  set(9, 7, 'o')

  if (feet === 'wheels') {
    set(14, 3, 'o'); set(14, 4, 'a'); set(14, 5, 'o'); set(15, 4, 'o')
  } else {
    set(14, 4, 's'); set(14, 5, 's'); set(15, 3, 'o'); set(15, 4, 'o'); set(15, 5, 'o')
  }

  if (hat === 'tophat') {
    for (let x = 5; x < 8; x++) { set(0, x, 'o'); set(1, x, 'o'); set(2, x, 'a') }
    for (let x = 3; x < 8; x++) set(3, x, 'o')
  } else if (hat === 'gear') {
    set(3, 7, 'o'); set(2, 7, 'o'); set(1, 6, 'a'); set(1, 7, 'a'); set(0, 7, 'a'); set(2, 6, 'a')
  } else if (hat === 'ears') {
    const x = 8 - profile[0]
    set(3, x, 'b'); set(2, x, 'b'); set(3, x + 1, 'b')
  }

  if (hat === 'chimney') {
    // off to one side, so it skips the mirror
    for (let y = 1; y < 4; y++) { g[y][10] = 'a'; g[y][11] = 'a' }
    g[0][9] = 'a'; g[0][10] = 'a'; g[0][11] = 'a'; g[0][12] = 'a'
  }

  // ink outline around everything that isn't already ink
  const out = g.map((row) => [...row])
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (g[y][x]) continue
      const near = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]].some(([a, b]) => g[a]?.[b] && g[a][b] !== 'o')
      if (near) out[y][x] = 'o'
    }
  return out
}

const mix = (hex: string, to: string, t: number) => {
  const a = parseInt(hex.slice(1), 16)
  const b = parseInt(to.slice(1), 16)
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t)
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`
}

function palette(color: string, express: boolean): Record<Exclude<Cell, ''>, string> {
  const base = express ? mix(color, '#ffffff', 0.12) : color
  return {
    o: '#14233f',
    b: base,
    h: mix(base, '#ffffff', 0.35),
    s: mix(base, '#000000', 0.3),
    l: mix(base, '#f7f0dc', 0.55),
    a: '#d9a441',
    w: '#fffdf4',
    e: '#14233f',
    c: '#ff8fa3',
  }
}

const cache = new Map<string, { d: Record<string, string>; chimney: boolean }>()

function paths(route: string, express: boolean) {
  const key = `${route}:${express}`
  let hit = cache.get(key)
  if (!hit) {
    const d: Record<string, string> = {}
    build(route, express).forEach((row, y) =>
      row.forEach((c, x) => {
        if (c) d[c] = (d[c] ?? '') + `M${x} ${y}h1v1h-1z`
      }),
    )
    hit = { d, chimney: design(route, express).hat === 'chimney' }
    cache.set(key, hit)
  }
  return hit
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
  const { d, chimney } = paths(route, express)
  const colors = palette(routeColor(route), express)
  const scale = Math.max(1, Math.round(size / 16))
  const px = 16 * scale
  return (
    <span className={`pet ${idle && !hidden ? 'pet-idle' : ''}`} style={{ width: px, height: px }} role="img" aria-label={label ?? (hidden ? 'Unknown pet' : `${species(route).name} pet`)}>
      {chimney && !hidden && idle && <SteamPuffs className="pet-steam" style={{ left: `${(10.5 / 16) * 100}%` }} />}
      <svg viewBox="0 0 16 16" width={px} height={px} shapeRendering="crispEdges" aria-hidden="true">
        {Object.entries(d).map(([c, path]) =>
          <path key={c} d={path} fill={hidden ? '#14233f' : colors[c as keyof typeof colors]} opacity={hidden ? 0.55 : 1} />,
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
