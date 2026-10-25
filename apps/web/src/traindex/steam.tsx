import { memo } from 'react'
import type { CSSProperties } from 'react'

/* Decorative steampunk bits. Everything animates with transform/opacity only,
   so it stays on the compositor; reduced-motion settings stop all of it. */

function gearPath(teeth: number) {
  const outer = 46
  const root = 37
  const hole = 15
  const step = (Math.PI * 2) / teeth
  let d = ''
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const pts = [a, a + step * 0.18, a + step * 0.5, a + step * 0.68].map((t, j) => {
      const r = j === 1 || j === 2 ? outer : root
      return `${(Math.cos(t) * r).toFixed(1)} ${(Math.sin(t) * r).toFixed(1)}`
    })
    d += `${i ? 'L' : 'M'}${pts[0]}L${pts[1]}L${pts[2]}L${pts[3]}`
  }
  return `${d}Z M${hole} 0A${hole} ${hole} 0 1 0 ${-hole} 0A${hole} ${hole} 0 1 0 ${hole} 0Z`
}

const paths = new Map<number, string>()

export const Gear = memo(function Gear({
  size = 48,
  teeth = 10,
  className = '',
  color = '#b8862f',
  style,
}: {
  size?: number
  teeth?: number
  className?: string
  color?: string
  style?: CSSProperties
}) {
  if (!paths.has(teeth)) paths.set(teeth, gearPath(teeth))
  return (
    <svg
      aria-hidden="true"
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      className={`gear ${className}`}
      // bigger gears turn slower, so meshed gears look like they drive each other
      style={{ '--gear-dur': `${teeth * 0.9}s`, ...style } as CSSProperties}
    >
      <path d={paths.get(teeth)} fill={color} stroke="#14233f" strokeWidth="5" fillRule="evenodd" strokeLinejoin="round" />
      <circle r="27" fill="none" stroke="#14233f" strokeOpacity=".35" strokeWidth="3" />
      <circle r="6" fill="#14233f" />
    </svg>
  )
})

export function SteamPuffs({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <span aria-hidden="true" className={`steam ${className}`} style={style}>
      <i />
      <i />
      <i />
    </span>
  )
}

/* ---------- Little locomotive that crosses the rails above the nav ---------- */

const LOCO = [
  '...............aaa....',
  '...ooooo.......oao....',
  '...owwwo.......oao....',
  '...owwwo.......oao....',
  '..oooooooooooooooooooo',
  '..obbbbbbbbbbbbbbbbbbo',
  '..obhhhhhhhhhhhhhhhhbo',
  '..obbbbbbbbbbbbbbbbbbo',
  '..oooooooooooooooooooo',
  '...ooo....ooo....ooo..',
  '...oao....oao....oao..',
  '...ooo....ooo....ooo..',
]

const LOCO_COLORS: Record<string, string> = { o: '#14233f', b: '#4e5d6c', h: '#8a9bab', a: '#d9a441', w: '#f2c53d' }

const locoPaths = (() => {
  const d: Record<string, string> = {}
  LOCO.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (LOCO_COLORS[c]) d[c] = (d[c] ?? '') + `M${x} ${y}h1v1h-1z`
    }),
  )
  return Object.entries(d)
})()

export const RailStrip = memo(function RailStrip() {
  return (
    <div className="rail-strip" aria-hidden="true">
      <div className="rail-run">
        <div className="rail-loco">
          <svg viewBox="0 0 22 12" width={44} height={24} shapeRendering="crispEdges">
            {locoPaths.map(([c, d]) => <path key={c} d={d} fill={LOCO_COLORS[c]} />)}
          </svg>
          <SteamPuffs className="loco-steam" />
          <span className="loco-sparks">
            <i /><i /><i /><i />
          </span>
        </div>
      </div>
    </div>
  )
})

/* ---------- Engine room shown while Gemini is working ---------- */

export function EngineRoom({ working }: { working: boolean }) {
  return (
    <div className="engine" data-working={working ? '' : undefined} aria-hidden="true">
      <Gear size={92} teeth={12} className="gear-spin engine-g1" />
      <Gear size={60} teeth={8} className="gear-spin-rev engine-g2" />
      <Gear size={44} teeth={6} className="gear-spin engine-g3" color="#9aa7b4" />
      <div className="gauge">
        <span className="needle" />
      </div>
      <SteamPuffs className="engine-steam" />
    </div>
  )
}

/* ---------- One-shot spark burst for the card reveal ---------- */

const BURST = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2
  return { x: Math.cos(a) * 130, y: Math.sin(a) * 150, delay: (i % 3) * 0.06 }
})

export function SparkBurst() {
  return (
    <span className="burst" aria-hidden="true">
      {BURST.map((b, i) => (
        <i key={i} style={{ '--bx': `${b.x}px`, '--by': `${b.y}px`, animationDelay: `${b.delay}s` } as CSSProperties} />
      ))}
    </span>
  )
}

/** Big slow gears in the page margins; only shown on wide screens. */
export const BackdropGears = memo(function BackdropGears() {
  return (
    <div className="bg-gears" aria-hidden="true">
      <Gear size={260} teeth={16} className="gear-spin bg-g1" color="#1d4248" />
      <Gear size={170} teeth={11} className="gear-spin-rev bg-g2" color="#1d4248" />
      <Gear size={220} teeth={14} className="gear-spin-rev bg-g3" color="#1d4248" />
    </div>
  )
})
