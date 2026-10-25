import type { ReactElement } from 'react'

/* 5x7 hand-built bitmap glyphs, drawn on whole-pixel grids so they never blur. */
export const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#.#.#', '#..##', '#...#'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '×': ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
}

export function glyphPath(ch: string, ox = 0, oy = 0) {
  const g = GLYPHS[ch.toUpperCase()]
  if (!g) return ''
  let d = ''
  g.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '#') d += `M${ox + x} ${oy + y}h1v1h-1z`
    }),
  )
  return d
}

export const textWidth = (t: string) => t.length * 6 - 1

/** Bitmap text: every cell is `scale` whole screen pixels. */
export function PixelText({
  text,
  scale = 3,
  shadow,
  className,
}: {
  text: string
  scale?: number
  shadow?: string
  className?: string
}) {
  const w = textWidth(text)
  const sh = shadow ? 1 : 0
  let d = ''
  ;[...text].forEach((ch, i) => (d += glyphPath(ch, i * 6)))
  return (
    <svg
      role="img"
      aria-label={text}
      viewBox={`0 0 ${w + sh} ${7 + sh}`}
      width={(w + sh) * scale}
      height={(7 + sh) * scale}
      shapeRendering="crispEdges"
      className={`inline-block align-middle ${className ?? ''}`}
    >
      {shadow && <path d={d} fill={shadow} transform="translate(1 1)" />}
      <path d={d} fill="currentColor" />
    </svg>
  )
}

/* ---------- Logo: pixel subway car + bitmap wordmark ---------- */
const PAL: Record<string, string> = {
  n: '#14233f',
  w: '#f7f0dc',
  y: '#f2c53d',
  t: '#8cc3b9',
  g: '#4e8f96',
  h: '#cfeae4',
}
const TRAIN = [
  '....nnnnnnnn....',
  '...nyyyyyyyyn...',
  '..nwwwwwwwwwwn..',
  '..nwnnnnnnnnwn..',
  '..nwnhgggggnwn..',
  '..nwnggggggnwn..',
  '..nwnnnnnnnnwn..',
  '..nwwwwwwwwwwn..',
  '..nwyywwwwyywn..',
  '..n' + 't'.repeat(10) + 'n..',
  '..nwwwwwwwwwwn..',
  '..nnnnnnnnnnnn..',
  '...nn......nn...',
  '...nn......nn...',
]

export function TrainSprite({ scale = 3 }: { scale?: number }) {
  const rects: ReactElement[] = []
  TRAIN.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (PAL[c]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PAL[c]} />)
    }),
  )
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 14"
      width={16 * scale}
      height={14 * scale}
      shapeRendering="crispEdges"
      className="shrink-0"
    >
      {rects}
    </svg>
  )
}

/* ---------- Logo: TRAIN spelled with subway bullets on a rail, then DEX in brass ---------- */

// 15x15 pixel disc with a one-pixel ink rim
const DISC = (() => {
  let rim = ''
  let fill = ''
  for (let y = 0; y < 15; y++)
    for (let x = 0; x < 15; x++) {
      const d = Math.hypot(x - 7, y - 7)
      if (d <= 6.2) fill += `M${x} ${y}h1v1h-1z`
      else if (d <= 7.4) rim += `M${x} ${y}h1v1h-1z`
    }
  return { rim, fill }
})()

// T is the Second Ave line's turquoise; there's no I train, so it gets copper
const BULLETS = [
  { ch: 'T', bg: '#00ADD0', ink: '#ffffff' },
  { ch: 'R', bg: '#FCCC0A', ink: '#14233f' },
  { ch: 'A', bg: '#0039A6', ink: '#ffffff' },
  { ch: 'I', bg: '#c65f24', ink: '#fff3d6' },
  { ch: 'N', bg: '#FCCC0A', ink: '#14233f' },
]

// DEX is drawn with 2x2 blocks per font pixel; `grow` widens each block for the outline
const dex = (grow: number, dx = 0, dy = 0) => {
  let d = ''
  ;['D', 'E', 'X'].forEach((ch, i) =>
    GLYPHS[ch].forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c !== '#') return
        const size = 2 + grow * 2
        d += `M${84 + i * 12 + x * 2 - grow + dx} ${2 + y * 2 - grow + dy}h${size}v${size}h-${size}z`
      }),
    ),
  )
  return d
}

export function Logo({ width = 244 }: { width?: number }) {
  return (
    <svg
      role="img"
      aria-label="TrainDex"
      viewBox="-1 -3 122 26"
      width={width}
      height={(width * 26) / 122}
      shapeRendering="crispEdges"
      className="traindex-logo block shrink-0"
    >
      {/* rail with sleepers */}
      <path d="M0 18h82v1h-82z" fill="#14233f" />
      <path d="M0 17h82v1h-82z" fill="#b8862f" />
      {Array.from({ length: 11 }, (_, i) => (
        <path key={i} d={`M${2 + i * 7.6} 19h3v2h-3z`} fill="#5e260c" />
      ))}

      {BULLETS.map((b, i) => (
        <g key={b.ch} className="logo-car" style={{ animationDelay: `${i * 0.12}s` }}>
          <g transform={`translate(${i * 16 + 1} 1)`}>
            <path d={DISC.rim} fill="#14233f" />
            <path d={DISC.fill} fill={b.bg} />
            {/* drawn twice, one pixel apart, so the letter is bold like a real bullet */}
            <path d={glyphPath(b.ch, 4, 4) + glyphPath(b.ch, 5, 4)} fill={b.ink} />
          </g>
        </g>
      ))}

      {/* DEX: drop shadow, ink outline, then a two-tone brass fill */}
      <path d={dex(1, 1, 2)} fill="#14233f" opacity=".4" />
      <path d={dex(1)} fill="#14233f" />
      <path d={dex(0)} fill="#e0a13a" />
      <clipPath id="dex-top">
        <rect x="80" y="0" width="40" height="9" />
      </clipPath>
      <path d={dex(0)} fill="#fff3d6" clipPath="url(#dex-top)" />

      <path className="logo-twinkle" d="M80 -3h1v2h2v1h-2v2h-1v-2h-2v-1h2z" fill="#f2c53d" />
      <path className="logo-twinkle" style={{ animationDelay: '.9s' }} d="M119 -3h1v1h1v1h-1v1h-1v-1h-1v-1h1z" fill="#fff3d6" />
    </svg>
  )
}
