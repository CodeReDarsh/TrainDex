export type Shape = 'circle' | 'diamond'

export interface Variant {
  id: string
  route: string
  name: string
  shape: Shape
  color: string
  ink: string
  style: string
  credit: string
}

export const VARIANTS: Record<string, Variant> = {
  'a-circle': {
    id: 'a-circle',
    route: 'A',
    name: 'A circle bullet',
    shape: 'circle',
    color: '#0039A6',
    ink: '#ffffff',
    style: 'Circle bullet, white letter on blue',
    credit: 'Sample artwork drawn for this prototype',
  },
  '7-diamond': {
    id: '7-diamond',
    route: '7',
    name: '7 express diamond',
    shape: 'diamond',
    color: '#B933AD',
    ink: '#ffffff',
    style: 'Express diamond, white numeral on purple',
    credit: 'Sample artwork drawn for this prototype',
  },
  'q-diamond': {
    id: 'q-diamond',
    route: 'Q',
    name: 'Q express diamond',
    shape: 'diamond',
    color: '#FCCC0A',
    ink: '#111111',
    style: 'Express diamond, black letter on yellow',
    credit: 'Sample artwork drawn for this prototype',
  },
}

export const ROUTES = [
  '1', '2', '3', '4', '5', '6', '7',
  'A', 'C', 'E', 'B', 'D', 'F', 'M',
  'G', 'J', 'Z', 'L', 'N', 'Q', 'R', 'W', 'S',
]

export const MODELS = ['R46', 'R62A', 'R68', 'R142A', 'R160', 'R179', 'R188', 'R211']

const u = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&auto=format&fit=crop&q=75`

export const PHOTO = {
  a: u('1521075821520-ae40128c1ea0'),
  b: u('1470133294210-94114cf67cc6'),
  c: u('1502666308545-76d8a0c5602f'),
  finder: u('1551050004-8d7f30baac7d', 1100),
  sample: u('1508619209906-bfca41e2286e'),
}

export type TimeSource = 'exif' | 'shutter' | 'estimated' | 'user' | 'unknown'

export interface Card {
  id: string
  route: string
  variantId: string | null
  model: string | null
  photo: string
  captureAt: string | null
  timeSource: TimeSource
  savedAt: string
  station: string
  storage: 'device' | 'account'
  sample?: boolean
}

export const SAMPLE_CARDS: Card[] = [
  {
    id: 'sample-a-1',
    route: 'A',
    variantId: 'a-circle',
    model: 'R179',
    photo: PHOTO.a,
    captureAt: '2026-10-18T08:42',
    timeSource: 'shutter',
    savedAt: '2026-10-18T09:05',
    station: 'Jay St–MetroTech',
    storage: 'device',
    sample: true,
  },
  {
    id: 'sample-a-2',
    route: 'A',
    variantId: 'a-circle',
    model: 'R46',
    photo: PHOTO.b,
    captureAt: '2026-09-30T18:11',
    timeSource: 'exif',
    savedAt: '2026-09-30T18:20',
    station: 'Fulton St',
    storage: 'device',
    sample: true,
  },
  {
    id: 'sample-7-1',
    route: '7',
    variantId: '7-diamond',
    model: 'R188',
    photo: PHOTO.c,
    captureAt: '2026-10-12T17:25',
    timeSource: 'exif',
    savedAt: '2026-10-12T17:40',
    station: 'Grand Central–42 St',
    storage: 'device',
    sample: true,
  },
]

export interface Draft {
  id: string
  photo: string
  crop: { x: number; y: number; s: number }
  captureAt: string | null
  timeSource: TimeSource
  station: string
  model: string | null
  modelSource: 'recognition' | 'user' | 'unknown'
  result?: Result
}

export type Result =
  | { kind: 'matched'; route: string; variantId: string; model: string | null }
  | { kind: 'uncertain'; route: string; variantId: null; model: null }
  | { kind: 'unclear' }
  | { kind: 'timeout' }

export type Scenario = 'first' | 'repeat' | 'uncertain' | 'unclear' | 'timeout'

export const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: 'first', label: 'First encounter (Q diamond)' },
  { id: 'repeat', label: 'Repeat encounter (A circle)' },
  { id: 'uncertain', label: 'Uncertain variant (N)' },
  { id: 'unclear', label: 'Route unclear' },
  { id: 'timeout', label: 'Provider timeout, then retry' },
]

export function resolveScenario(s: Scenario): Result {
  switch (s) {
    case 'first':
      return { kind: 'matched', route: 'Q', variantId: 'q-diamond', model: 'R160' }
    case 'repeat':
      return { kind: 'matched', route: 'A', variantId: 'a-circle', model: 'R211' }
    case 'uncertain':
      return { kind: 'uncertain', route: 'N', variantId: null, model: null }
    case 'unclear':
      return { kind: 'unclear' }
    default:
      return { kind: 'timeout' }
  }
}

export function nowLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Time unknown'

export function encounterInfo(
  cards: Card[],
  c: { route: string; variantId: string | null },
): { count: number; first: string } | null {
  if (!c.variantId) return null
  const same = cards.filter((x) => x.route === c.route && x.variantId === c.variantId)
  if (!same.length) return null
  return { count: same.length, first: same.map((x) => x.savedAt).sort()[0] }
}

export const TIME_SOURCE_LABEL: Record<TimeSource, string> = {
  exif: 'From photo metadata',
  shutter: 'Shutter time',
  estimated: 'Time estimated',
  user: 'Edited by you',
  unknown: 'Time unknown',
}
