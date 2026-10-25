import { type Draft, type Result, type Variant, registerVariant, routeColor } from './data'
import { saveVariant } from './storage'

// same origin by default: the dev server proxies /v1 to apps/api and the deployed server routes it there too.
// Set VITE_TRAINDEX_API_URL only when the API lives on another host.
const API = (import.meta.env.VITE_TRAINDEX_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

interface Reading {
  sign_text: string
  sign_shape: 'circle' | 'diamond' | 'other' | 'none'
  confidence: 'high' | 'medium' | 'low'
  notes: string
}

interface SignMatch {
  id: string
  name: string
  route: string | null
  score: number
  shape: string
  color: string | null
  ink: string | null
  status: string
  historical: boolean
  image: string | null
  credit: string | null
}

type Identify =
  | { status: 'identified'; line: { id: string; color: string }; matches: SignMatch[]; reading: Reading }
  | { status: 'rare'; text: string; matches: SignMatch[]; reading: Reading }
  | { status: 'retake'; reason: string; reading: Reading }
  | { status: 'not_found'; reason: string; reading: Reading }

// below this the catalog's top pick is a guess, so the variant stays unknown
const SURE = 0.8

/**
 * Cuts the draft's crop box out of the photo, with some margin so a slightly
 * off crop still includes the whole sign. The crop box is 1.5:1 and its size is
 * a fraction of the photo's width (see Preview in capture.tsx).
 */
async function cropped(draft: Draft): Promise<Blob> {
  const img = new Image()
  img.src = draft.photo
  await img.decode()
  const W = img.naturalWidth
  const H = img.naturalHeight
  const { x, y, s } = draft.crop

  const pad = 1.6
  const w = Math.min(W, s * W * pad)
  const h = Math.min(H, (s * W / 1.5) * pad)
  const left = Math.max(0, Math.min(W - w, x * W - w / 2))
  const top = Math.max(0, Math.min(H - h, y * H - h / 2))

  // Gemini doesn't need more than this, and it keeps uploads small on phones
  const scale = Math.min(1, 1280 / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d')!.drawImage(img, left, top, w, h, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('crop failed'))), 'image/jpeg', 0.88),
  )
}

function variantFrom(m: SignMatch, route: string) {
  const variant = m.name.split(' — ').slice(1).join(' — ')
  const v: Variant = {
    id: m.id,
    route,
    name: m.name.split(' — ')[0] || `${route} sign`,
    shape: m.shape === 'diamond' ? 'diamond' : 'circle',
    color: m.color ?? routeColor(route),
    ink: m.ink ?? '#ffffff',
    style: variant || 'Catalog sign design',
    credit: m.credit ?? 'TrainDex sign catalog',
    image: m.image ?? undefined,
  }
  registerVariant(v)
  // cards saved in this browser need the design back after a refresh
  saveVariant(v)
  return m.id
}

export async function recognize(draft: Draft, signal: AbortSignal): Promise<Result> {
  let photo: Blob
  try {
    photo = await cropped(draft)
  } catch {
    return { kind: 'upload-failed' }
  }

  const form = new FormData()
  form.append('image', photo, 'sign.jpg')

  let res: Response
  try {
    res = await fetch(`${API}/v1/identify`, { method: 'POST', body: form, signal })
  } catch {
    if (signal.aborted) return (signal.reason as Error)?.name === 'TimeoutError' ? { kind: 'timeout' } : { kind: 'cancelled' }
    return { kind: 'unavailable' }
  }
  if (res.status === 413 || res.status === 415) return { kind: 'upload-failed' }
  if (!res.ok) return { kind: 'unavailable' }

  const data = (await res.json()) as Identify
  if (data.status === 'retake') return { kind: 'blurry' }
  if (data.status === 'not_found') return { kind: 'no-sign' }

  const route = data.status === 'identified' ? data.line.id : data.text.toUpperCase()
  const best = data.matches[0]
  if (!best || best.score < SURE || data.reading.confidence === 'low') {
    return { kind: 'uncertain', route, variantId: null, model: null }
  }
  return { kind: 'matched', route, variantId: variantFrom(best, route), model: null }
}

export const liveLabel = API ? 'Gemini via hosted API' : 'Gemini'
