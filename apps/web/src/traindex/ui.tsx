import { useState } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { glyphPath } from './pixel'
import {
  type Card,
  VARIANTS,
  encounterInfo,
  fmtDate,
  fmtDateTime,
} from './data'

/* Primary actions share a 24px outline grid with open, legible silhouettes. */
const ACTION_ICONS = {
  gear: [
    'M9.48 4.41L9.73 1.85L14.27 1.85L14.52 4.41L15.59 4.85L17.57 3.22L20.78 6.43L19.15 8.41L19.59 9.48L22.15 9.73L22.15 14.27L19.59 14.52L19.15 15.59L20.78 17.57L17.57 20.78L15.59 19.15L14.52 19.59L14.27 22.15L9.73 22.15L9.48 19.59L8.41 19.15L6.43 20.78L3.22 17.57L4.85 15.59L4.41 14.52L1.85 14.27L1.85 9.73L4.41 9.48L4.85 8.41L3.22 6.43L6.43 3.22L8.41 4.85Z',
    'M15.2 12a3.2 3.2 0 1 1-6.4 0a3.2 3.2 0 1 1 6.4 0Z',
  ],
  home: [
    'M3 11h3V8h3V5h3V3h1v2h3v3h3v3h3',
    'M5 11v10h14V11',
    'M10 21v-7h4v7',
  ],
  camera: [
    'M8 6V4h8v2h4v2h2v12H2V8h2V6h4Z',
    'M10 9h4v1h2v2h1v3h-1v2h-2v1h-4v-1H8v-2H7v-3h1v-2h2V9Z',
    'M18 9h1',
  ],
  cards: [
    'M8 3h13v14',
    'M5 6h13v14',
    'M2 9h13v13H2V9Z',
    'M5 12h7v4H5v-4Z',
    'M5 19h5',
  ],
} as const

/* ---------- Supporting bitmap icons ---------- */
const ICONS = {
  photo: ['############', '#..........#', '#......##..#', '#......##..#', '#...#......#', '#..###..#..#', '#.#####.##.#', '#.########.#', '#..........#', '############'],
  back: ['....#.......', '...##.......', '..###.......', '.###########', '############', '.###########', '..###.......', '...##.......', '....#.......'],
  check: ['..........##', '.........###', '........###.', '##.....###..', '###...###...', '.###.###....', '..#####.....', '...###......', '....#.......'],
  close: ['###.....###', '####...####', '.####.####.', '..#######..', '...#####...', '....###....', '...#####...', '..#######..', '.####.####.', '####...####', '###.....###'],
  trash: ['...######...', '############', '............', '..########..', '..#.#..#.#..', '..#.#..#.#..', '..#.#..#.#..', '..#.#..#.#..', '..#.#..#.#..', '..########..'],
  pencil: ['.........##.', '........####', '.......#####', '......#####.', '.....#####..', '....#####...', '...#####....', '..#####.....', '.######.....', '.#####......', '.##.........'],
  search: ['..######....', '.########...', '###....###..', '##......##..', '##......##..', '###....###..', '.########...', '..#######...', '.......###..', '........###.', '.........###', '..........##'],
  ask: ['.######.', '########', '##....##', '.....###', '....###.', '...###..', '...##...', '...##...', '........', '...##...', '...##...'],
  spark: ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'],
  chev: ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],
  flask: ['...####.....', '....##......', '....##......', '...####.....', '..######....', '.########...', '############'],
} satisfies Record<string, string[]>

export type IconName = keyof typeof ICONS | keyof typeof ACTION_ICONS

export function PixelIcon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  if (name === 'home' || name === 'camera' || name === 'cards' || name === 'gear') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="square"
        strokeLinejoin="miter"
        className={`shrink-0 ${className ?? ''}`}
      >
        {ACTION_ICONS[name].map((d) => <path key={d} d={d} />)}
      </svg>
    )
  }
  const rows: string[] = ICONS[name]
  const w = Math.max(...rows.map((r) => r.length))
  const h = rows.length
  const scale = Math.max(1, Math.round(size / Math.max(w, h)))
  let d = ''
  rows.forEach((r, y) =>
    [...r].forEach((c, x) => {
      if (c === '#') d += `M${x} ${y}h1v1h-1z`
    }),
  )
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${w} ${h}`}
      width={w * scale}
      height={h * scale}
      shapeRendering="crispEdges"
      fill="currentColor"
      className={`shrink-0 ${className ?? ''}`}
    >
      <path d={d} />
    </svg>
  )
}

/* ---------- Subway sign: 15x15 pixel grid, bitmap glyph inside ---------- */
const CIRCLE = [5, 9, 11, 13, 13, 15, 15, 15, 15, 15, 13, 13, 11, 9, 5]
const DIAMOND = [1, 3, 5, 7, 9, 11, 13, 15, 13, 11, 9, 7, 5, 3, 1]

export function Sign({
  route,
  variantId,
  size = 45,
  unknown,
  muted,
}: {
  route: string
  variantId?: string | null
  size?: number
  unknown?: boolean
  muted?: boolean
}) {
  const v = variantId ? VARIANTS[variantId] : null
  const shape = v?.shape ?? 'circle'
  const fill = muted ? '#cfc4a2' : v?.color ?? '#6b7a8f'
  const text = muted ? '#14233f' : v?.ink ?? '#ffffff'
  const widths = shape === 'circle' ? CIRCLE : DIAMOND
  const d = widths.map((w, y) => `M${(15 - w) / 2} ${y}h${w}v1h-${w}z`).join('')
  const label = muted
    ? `Route ${route}, not yet collected`
    : v
      ? `Route ${route}, ${v.shape} sign`
      : `Route ${route}, sign variant unknown`
  const scale = Math.max(1, Math.round(size / 15))
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 15 15"
      width={15 * scale}
      height={15 * scale}
      shapeRendering="crispEdges"
      className="inline-block shrink-0"
    >
      <path d={d} fill={fill} />
      <path d={glyphPath(unknown ? '?' : route.slice(0, 1), 5, 4)} fill={text} />
    </svg>
  )
}

/* ---------- Buttons & text ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  v?: 'primary' | 'secondary' | 'dark' | 'teal' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  icon?: IconName
  inline?: boolean
}

export function PxButton({ v = 'secondary', size = 'md', icon, inline, children, className = '', ...p }: BtnProps) {
  return (
    <button
      type="button"
      data-v={v}
      data-size={size}
      data-inline={inline ? '' : undefined}
      className={`px-btn ${className}`}
      {...p}
    >
      {icon && <PixelIcon name={icon} size={size === 'lg' ? 26 : 20} />}
      {children}
    </button>
  )
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'gold' | 'teal' | 'alert' | 'ok' | 'paper' }) {
  return (
    <span className="px-chip" data-tone={tone}>
      {children}
    </span>
  )
}

export function Panel({
  children,
  className = '',
  dark,
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode
  className?: string
  dark?: boolean
  as?: 'section' | 'div' | 'article'
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`px-panel p-4 ${className}`} data-dark={dark ? '' : undefined} {...rest}>
      {children}
    </Tag>
  )
}

export function PanelTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-pixel text-[18px] font-bold uppercase leading-snug tracking-normal">{children}</h2>
      {right}
    </div>
  )
}

const TONES = {
  info: { tag: 'Tip', tone: 'teal' as const },
  warn: { tag: 'Heads up', tone: 'gold' as const },
  error: { tag: 'Problem', tone: 'alert' as const },
  ok: { tag: 'Saved', tone: 'ok' as const },
}

export function Dialogue({
  tone = 'info',
  title,
  children,
  live,
  className = '',
}: {
  tone?: keyof typeof TONES
  title?: string
  children: ReactNode
  live?: boolean
  className?: string
}) {
  const t = TONES[tone]
  return (
    <div
      className={`px-panel relative p-3 pb-4 ${className}`}
      role={live ? (tone === 'error' ? 'alert' : 'status') : undefined}
    >
      <div className="mb-1.5">
        <Chip tone={t.tone}>{title ?? t.tag}</Chip>
      </div>
      <div className="text-[1rem] leading-snug">{children}</div>
    </div>
  )
}

export function Field({ label, hint, children, id }: { label: string; hint?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-pixel text-[16px] font-bold uppercase tracking-normal">
        {label}
      </label>
      {children}
      {hint && <div className="text-[0.9375rem] text-ink/80">{hint}</div>}
    </div>
  )
}

export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="px-inset">
      <summary className="px-sum">
        {title}
        <PixelIcon name="chev" size={14} className="chev" />
      </summary>
      <div className="px-3 pb-3 text-[1rem]">{children}</div>
    </details>
  )
}

/* ---------- Screen chrome ---------- */
export function ScreenHeader({
  title,
  onBack,
  backLabel = 'Back',
  right,
}: {
  title: string
  onBack?: () => void
  backLabel?: string
  right?: ReactNode
}) {
  return (
    <header className="flex items-center gap-3 px-4 pt-4">
      {onBack && (
        <PxButton size="icon" aria-label={backLabel} onClick={onBack} className="!mb-2 shrink-0">
          <PixelIcon name="back" size={24} />
        </PxButton>
      )}
      <h1 className="flex-1 font-pixel text-[26px] font-bold uppercase leading-snug tracking-normal text-paper">{title}</h1>
      {right}
    </header>
  )
}

export function BottomNav({ active, go }: { active: 'home' | 'scan' | 'collection' | 'none'; go: (n: 'home' | 'scan' | 'collection') => void }) {
  const items: { id: 'home' | 'scan' | 'collection'; label: string; icon: IconName }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'scan', label: 'Scan', icon: 'camera' },
    { id: 'collection', label: 'Collection', icon: 'cards' },
  ]
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-30 mt-auto grid grid-cols-3 gap-2 border-t-4 border-ink bg-paper px-3 pb-3 pt-3"
    >
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          onClick={() => go(i.id)}
          aria-current={active === i.id ? 'page' : undefined}
          className={`flex min-h-[56px] flex-col items-center justify-center gap-1 font-body text-[0.9375rem] font-medium uppercase tracking-normal ${
            i.id === 'scan'
              ? 'bg-gold shadow-[inset_0_-4px_0_#c99a10,0_0_0_3px_#14233f]'
              : active === i.id
                ? 'bg-ink text-gold'
                : 'text-ink'
          }`}
        >
          <PixelIcon name={i.icon} size={24} />
          {i.label}
        </button>
      ))}
    </nav>
  )
}

/* ---------- Sparkles ---------- */
const SPARKS: [string, string, number, number, string][] = [
  ['1%', '18%', 8, 0, '#ffffff'],
  ['98%', '76%', 8, 0.8, '#ffffff'],
  ['-1%', '48%', 12, 1.1, '#fff5bc'],
  ['30%', '-1%', 10, 2.8, '#c9f8ff'],
  ['99%', '22%', 12, 3.7, '#fff5bc'],
  ['33%', '99%', 10, 0.6, '#dceaff'],
  ['58%', '99%', 12, 3.4, '#ffffff'],
  ['-1%', '4%', 10, 2.1, '#ffffff'],
  ['99%', '95%', 10, 4.7, '#c9f8ff'],
  ['85%', '-1%', 8, 4.3, '#fff5bc'],
]

export function Sparkles({ n = 10 }: { n?: number }) {
  return (
    <>
      {SPARKS.slice(0, n).map(([t, l, s, d, c], i) => (
        <span key={i} className="spark" style={{ top: t, left: l, color: c, animationDelay: `-${d}s` }}>
          <PixelIcon name="spark" size={s} />
        </span>
      ))}
    </>
  )
}

/** Seeded, code-native artwork: stable for each encounter; no generated image needed. */
function CardPattern({ seed, shape }: { seed: string; shape: 'circle' | 'diamond' }) {
  let state = 2166136261
  for (const ch of seed) state = Math.imul(state ^ ch.charCodeAt(0), 16777619)
  const next = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
  const motifs = Array.from({ length: 108 }, (_, i) => ({
    x: (i % 9) * 30 - 12 + Math.round(next() * 12),
    y: Math.floor(i / 9) * 33 - 8 + Math.round(next() * 12),
    r: 4 + Math.round(next() * 7),
    opacity: .16 + next() * .17,
    filled: next() > .74,
    inset: next() > .55,
  }))
  const tracks = Array.from({ length: 7 }, (_, i) => {
    const y = 18 + i * 55 + Math.round(next() * 12)
    const bend = 55 + Math.round(next() * 100)
    return { y, bend }
  })
  return (
    <svg className="tc-pattern" viewBox="0 0 240 360" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth=".8">
        {tracks.map(({ y, bend }, i) => (
          <g key={i} opacity=".25">
            <path d={`M-20 ${y}H${bend}l24 24H260M-20 ${y+4}H${bend-2}l24 24H260`} />
            <circle cx={bend} cy={y} r="2.3" fill="currentColor" />
            <circle cx={bend+24} cy={y+24} r="2.3" fill="#fff9e9" />
          </g>
        ))}
        {motifs.map(({ x, y, r, opacity, filled, inset }, i) => (
          <g key={i} opacity={opacity} transform={`translate(${x} ${y})`}>
            {shape === 'diamond' ? (
              <>
                <path d={`M0 ${-r}L${r} 0 0 ${r} ${-r} 0Z`} fill={filled ? 'currentColor' : 'none'} fillOpacity=".28" />
                {inset && <path d={`M0 ${-r/2}L${r/2} 0 0 ${r/2} ${-r/2} 0Z`} />}
              </>
            ) : (
              <>
                <circle r={r} fill={filled ? 'currentColor' : 'none'} fillOpacity=".28" />
                {inset && <circle r={r/2} />}
              </>
            )}
            {i % 4 === 0 && <path d={`M${r+3} -2v4m-2-2h4`} />}
          </g>
        ))}
      </g>
    </svg>
  )
}

export function CardPhoto({ src, alt, className = '', retry = true }: { src: string; alt: string; className?: string; retry?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  if (!src || failed) return <div className="flex min-h-32 flex-col items-center justify-center gap-2 bg-paper-2 p-3 text-center text-ink" role="status">
    <PixelIcon name="photo" size={24} /><b>Photo unavailable</b><p className="text-sm">Card details are still available.</p>
    {src && retry && <button type="button" className="min-h-11 underline" onClick={(e) => { e.stopPropagation(); setFailed(false); setAttempt(n => n + 1) }}>Retry photo</button>}
  </div>
  return <img key={attempt} src={src} alt={alt} loading="lazy" className={className} onError={() => setFailed(true)} />
}

/* ---------- Trading card ---------- */
export function TrainCard({
  card,
  cards,
  size = 'lg',
  sparkles,
  reveal,
  showSample = true,
}: {
  card: Card
  cards: Card[]
  size?: 'lg' | 'sm'
  sparkles?: boolean
  reveal?: boolean
  showSample?: boolean
}) {
  const v = card.variantId ? VARIANTS[card.variantId] : null
  const info = encounterInfo(cards, card)
  const lg = size === 'lg'
  return (
    <div className="tc" data-size={size}>
      <article
        className={`tc-card foil ${reveal ? 'reveal-in' : ''}`}
        style={{ '--route-color': v?.color ?? '#527780' } as CSSProperties}
        data-shift={lg ? '' : undefined}
        aria-label={`Card: route ${card.route}, ${v?.name ?? 'sign variant unknown'}, train model ${card.model ?? 'Unknown'}`}
      >
        <div className="tc-inner">
          <CardPattern seed={`${card.id}:${card.route}:${card.variantId}:${card.model}:${card.station}:${card.captureAt}:${v?.color}:${v?.style}`} shape={v?.shape ?? 'circle'} />
          <div className="tc-head">
            <Sign
              route={card.route}
              variantId={card.variantId}
              unknown={!v}
              size={lg ? 60 : 30}
            />
            <div className="min-w-0 flex-1">
              <div className="tc-title">ROUTE {card.route}</div>
              <div className="tc-sub truncate">{v?.name ?? 'Sign variant not identified'}</div>
            </div>
            {lg && info && (
              <span className="px-chip shrink-0" data-tone="gold">
                Seen ×{info.count}
              </span>
            )}
          </div>
          <div className="tc-photo">
            <CardPhoto key={card.photo} retry={lg} src={card.photo} alt={`Your photo of a route ${card.route} train`} />
            {card.sample && showSample && (
              <span className="px-chip absolute bottom-1 left-1 !text-[0.6875rem]" data-tone="paper">
                Sample
              </span>
            )}
          </div>
          {lg ? (
            <dl className="tc-info">
              <div>
                <dt>Train model</dt>
                <dd>{card.model ?? 'Unknown'}</dd>
              </div>
              <div>
                <dt>Station</dt>
                <dd>{card.station || '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt>Captured</dt>
                <dd>
                  {fmtDateTime(card.captureAt)}
                  {card.timeSource === 'estimated' && <span className="font-normal"> · estimated</span>}
                </dd>
              </div>
              <div className="col-span-2">
                <dt>First collected</dt>
                <dd>{info ? fmtDate(info.first) : 'Not counted · variant unknown'}</dd>
              </div>
            </dl>
          ) : (
            <div className="tc-info !grid-cols-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{card.model ?? 'Unknown'}</span>
                <span>{card.captureAt ? fmtDate(card.captureAt) : '—'}</span>
              </div>
            </div>
          )}
        </div>
        <div aria-hidden="true" className="tc-shine" data-run={reveal ? '' : undefined} />
        {sparkles && <Sparkles />}
      </article>
    </div>
  )
}
