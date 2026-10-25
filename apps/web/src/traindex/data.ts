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
  /** Reference picture from the sign catalog, when there is one. */
  image?: string
}

/** Sample variants plus every catalog design recognized in this session. */
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
  '3-circle': {
    id: '3-circle',
    route: '3',
    name: '3 circle bullet',
    shape: 'circle',
    color: '#EE352E',
    ink: '#ffffff',
    style: 'Circle bullet, white numeral on red',
    credit: 'Sample artwork drawn for this prototype',
  },
  'g-circle': {
    id: 'g-circle',
    route: 'G',
    name: 'G circle bullet',
    shape: 'circle',
    color: '#6CBE45',
    ink: '#ffffff',
    style: 'Circle bullet, white letter on lime green',
    credit: 'Sample artwork drawn for this prototype',
  },
  'z-circle': {
    id: 'z-circle',
    route: 'Z',
    name: 'Z circle bullet',
    shape: 'circle',
    color: '#996633',
    ink: '#ffffff',
    style: 'Circle bullet, white letter on brown',
    credit: 'Sample artwork drawn for this prototype',
  },
}

export function registerVariant(v: Variant) {
  VARIANTS[v.id] = v
}

/** MTA trunk-line colors. Retired lines fall back to grey. */
export const ROUTE_COLORS: Record<string, string> = {
  A: '#0039A6', C: '#0039A6', E: '#0039A6',
  B: '#FF6319', D: '#FF6319', F: '#FF6319', M: '#FF6319',
  G: '#6CBE45', L: '#A7A9AC', J: '#996633', Z: '#996633',
  N: '#FCCC0A', Q: '#FCCC0A', R: '#FCCC0A', W: '#FCCC0A',
  '1': '#EE352E', '2': '#EE352E', '3': '#EE352E',
  '4': '#00933C', '5': '#00933C', '6': '#00933C',
  '7': '#B933AD', S: '#808183',
}

export const routeColor = (route: string) => ROUTE_COLORS[route] ?? '#808183'

export const ROUTES = [
  '1', '2', '3', '4', '5', '6', '7',
  'A', 'C', 'E', 'B', 'D', 'F', 'M',
  'G', 'J', 'Z', 'L', 'N', 'Q', 'R', 'W', 'S',
]

export const MODELS = ['R46', 'R62A', 'R68', 'R142A', 'R160', 'R179', 'R188', 'R211']

/* Real rollsign photos from Wikimedia Commons, resized for the app. Each one was
   checked end to end: Gemini reads the line and the catalog matches the design. */
export interface SamplePhoto {
  id: string
  route: string
  title: string
  blurb: string
  photo: string
  /** Where the crop box starts, so the sign is already framed. */
  crop: { x: number; y: number; s: number }
  credit: string
}

const sample = (file: string) => `${import.meta.env.BASE_URL}samples/${file}.jpg`
const commons = (who: string, license: string) => `Photo: ${who}, ${license}, via Wikimedia Commons (resized)`

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: 'k-circle-museum',
    route: 'K',
    title: 'K train',
    blurb: 'Legendary. Retired in 1988, seen on a museum car.',
    photo: sample('k-circle-museum'),
    crop: { x: 0.45, y: 0.42, s: 0.62 },
    credit: commons('Billie Grace Ward', 'CC BY 2.0'),
  },
  {
    id: 'r-diamond-brown',
    route: 'R',
    title: 'Brown R diamond',
    blurb: 'Rare old Nassau St rollsign.',
    photo: sample('r-diamond-brown'),
    crop: { x: 0.36, y: 0.77, s: 0.42 },
    credit: commons('The All-Nite Images', 'CC BY-SA 2.0'),
  },
  {
    id: '6-diamond-led',
    route: '6',
    title: '6 express',
    blurb: 'LED diamond on an R62A.',
    photo: sample('6-diamond-led'),
    crop: { x: 0.64, y: 0.38, s: 0.5 },
    credit: commons('JoesphBarbaro', 'CC BY-SA 4.0'),
  },
  {
    id: 'w-r68',
    route: 'W',
    title: 'W train',
    blurb: 'R68 rollsign, Astoria bound.',
    photo: sample('w-r68'),
    crop: { x: 0.6, y: 0.4, s: 0.55 },
    credit: commons('Kidfly182', 'CC BY-SA 4.0'),
  },
  {
    id: 'g-r68a',
    route: 'G',
    title: 'G train',
    blurb: 'R68A rollsign, Court Square.',
    photo: sample('g-r68a'),
    crop: { x: 0.55, y: 0.42, s: 0.5 },
    credit: commons('Kidfly182', 'CC BY 4.0'),
  },
  {
    id: '3-r62',
    route: '3',
    title: '3 train',
    blurb: 'R62 rollsign at Franklin Ave.',
    photo: sample('3-r62'),
    crop: { x: 0.5, y: 0.37, s: 0.62 },
    credit: commons('Gafas naranjas', 'CC BY-SA 4.0'),
  },
  {
    id: 'z-r32',
    route: 'Z',
    title: 'Z train',
    blurb: 'R32 rollsign, Broad St.',
    photo: sample('z-r32'),
    crop: { x: 0.32, y: 0.66, s: 0.38 },
    credit: commons('SubwayIguana', 'CC BY 4.0'),
  },
]

const photoOf = (id: string) => SAMPLE_PHOTOS.find((p) => p.id === id)!

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
  /** Attribution when the photo isn't the user's own. */
  photoCredit?: string
}

export const SAMPLE_CARDS: Card[] = [
  {
    id: 'sample-3-1',
    route: '3',
    variantId: '3-circle',
    model: 'R62',
    photo: photoOf('3-r62').photo,
    photoCredit: photoOf('3-r62').credit,
    captureAt: '2026-10-18T08:42',
    timeSource: 'shutter',
    savedAt: '2026-10-18T09:05',
    station: 'Franklin Av',
    storage: 'device',
    sample: true,
  },
  {
    id: 'sample-g-1',
    route: 'G',
    variantId: 'g-circle',
    model: 'R68A',
    photo: photoOf('g-r68a').photo,
    photoCredit: photoOf('g-r68a').credit,
    captureAt: '2026-09-30T18:11',
    timeSource: 'exif',
    savedAt: '2026-09-30T18:20',
    station: 'Court Sq',
    storage: 'device',
    sample: true,
  },
  {
    id: 'sample-z-1',
    route: 'Z',
    variantId: 'z-circle',
    model: 'R32',
    photo: photoOf('z-r32').photo,
    photoCredit: photoOf('z-r32').credit,
    captureAt: '2026-10-12T17:25',
    timeSource: 'exif',
    savedAt: '2026-10-12T17:40',
    station: 'Broad St',
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
  photoCredit?: string
}

export type Result =
  | { kind: 'matched'; route: string; variantId: string; model: string | null }
  | { kind: 'uncertain'; route: string; variantId: null; model: null }
  | { kind: 'unclear' }
  | { kind: 'timeout' }
  | { kind: 'no-sign' }
  | { kind: 'blurry' }
  | { kind: 'upload-failed' }
  | { kind: 'cancelled' }
  | { kind: 'unavailable' }

export type Scenario = 'live' | 'first' | 'repeat' | 'uncertain' | 'unclear' | 'timeout' | 'no-sign' | 'blurry' | 'upload-failed' | 'cancelled' | 'unavailable'

export const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: 'live', label: 'Live: real photo to Gemini' },
  { id: 'first', label: 'First encounter (Q diamond)' },
  { id: 'repeat', label: 'Repeat encounter (A circle)' },
  { id: 'uncertain', label: 'Uncertain variant (N)' },
  { id: 'unclear', label: 'Route unclear' },
  { id: 'no-sign', label: 'No sign / not a train' },
  { id: 'blurry', label: 'Unusable blurry photo' },
  { id: 'upload-failed', label: 'Upload failure' },
  { id: 'cancelled', label: 'Processing cancelled' },
  { id: 'unavailable', label: 'Recognition service unavailable' },
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
    case 'no-sign': return { kind: 'no-sign' }
    case 'blurry': return { kind: 'blurry' }
    case 'upload-failed': return { kind: 'upload-failed' }
    case 'unavailable': return { kind: 'unavailable' }
    case 'cancelled': return { kind: 'cancelled' }
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
