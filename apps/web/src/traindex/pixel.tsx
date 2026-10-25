import logoUrl from '../assets/traindex-logo.png'
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

export function Logo({ width = 150 }: { width?: number }) {
  return (
    <img
      src={logoUrl}
      alt="TrainDex"
      width={width}
      style={{ height: 'auto' }}
      className="traindex-logo block shrink-0"
    />
  )
}
