import { decodePhoto, PhotoPreview, type PhotoStatus } from './photo'
import { boundCrop, cropFromGesture, type CropPoint } from './crop'
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent, KeyboardEvent as RKeyboardEvent } from 'react'
import { type Draft, type Result, type SamplePhoto, type Scenario, SAMPLE_PHOTOS, resolveScenario, routeColor } from './data'
import { useDialog } from './dialog'
import { Chip, Dialogue, Panel, PanelTitle, PixelIcon, PxButton, ScreenHeader } from './ui'
import { recognize } from './live'
import { EngineRoom } from './steam'

type CameraState = 'starting' | 'live' | 'denied' | 'unavailable'

/** Rear camera stream for the viewfinder; stops as soon as Capture unmounts. */
function useCamera(enabled: boolean) {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<CameraState>('starting')
  useEffect(() => {
    if (!enabled) return
    if (!navigator.mediaDevices?.getUserMedia) { setState('unavailable'); return }
    let stream: MediaStream | null = null
    let live = true
    setState('starting')
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (!live) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (video.current) {
          video.current.srcObject = s
          video.current.play().catch(() => {})
        }
        setState('live')
      })
      .catch((e: DOMException) => {
        if (live) setState(e.name === 'NotAllowedError' || e.name === 'SecurityError' ? 'denied' : 'unavailable')
      })
    return () => {
      live = false
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [enabled])

  const snap = () =>
    new Promise<string>((resolve, reject) => {
      const v = video.current
      if (!v?.videoWidth) return reject(new Error('camera not ready'))
      const c = document.createElement('canvas')
      c.width = v.videoWidth
      c.height = v.videoHeight
      c.getContext('2d')!.drawImage(v, 0, 0)
      c.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('snapshot failed'))), 'image/jpeg', 0.92)
    })

  return { video, state: enabled ? state : 'denied', snap }
}

/* ---------- Photo picker hook ---------- */
export function usePicker(onPhoto: (url: string) => void) {
  const ref = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const attempt = useRef(0)
  useEffect(() => () => { attempt.current += 1 }, [])
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      className="hidden"
      aria-label="Choose a photo from your device"
      onChange={async (e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return
        const request = ++attempt.current
        setBusy(false)
        if (!f.type.startsWith('image/')) {
          setError('That file is not a photo. Choose a JPG or PNG image supported by your browser.')
          return
        }
        setError(null)
        setBusy(true)
        const url = URL.createObjectURL(f)
        try {
          await decodePhoto(url)
          if (request === attempt.current) onPhoto(url)
          else URL.revokeObjectURL(url)
        } catch {
          URL.revokeObjectURL(url)
          if (request === attempt.current) setError('This photo could not be opened. It may be damaged or unsupported. Choose a JPG or PNG; your current work is unchanged.')
        } finally { if (request === attempt.current) setBusy(false) }
      }}
    />
  )
  return { input, open: () => ref.current?.click(), error, busy }
}

/* ---------- 1. Capture ---------- */
export function Capture({
  onHome,
  onShutter,
  onPhoto,
  onSample,
  cameraDenied,
  disclosed,
  onDisclose,
}: {
  onHome: () => void
  onShutter: (url: string) => void
  onPhoto: (url: string) => void
  onSample: (sample: SamplePhoto) => void
  cameraDenied: boolean
  disclosed: boolean
  onDisclose: () => void
}) {
  const picker = usePicker(onPhoto)
  const cam = useCamera(!cameraDenied)
  const blocked = cam.state === 'denied' || cam.state === 'unavailable'
  const [flash, setFlash] = useState(false)
  const [picking, setPicking] = useState(false)
  const shoot = () => {
    setFlash(true)
    cam.snap().then(onShutter).catch(() => setFlash(false))
  }
  return (
    <main className="capture-screen flex flex-1 flex-col gap-2 p-4 pb-3">
      {picker.input}
      {picker.busy && <Dialogue live title="Opening photo">Checking your selected photo…</Dialogue>}
      <div className="px-panel relative flex-1 overflow-hidden !bg-ink" style={{ minHeight: 380 }}>
        {blocked ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-paper">
            <PixelIcon name="ask" size={40} />
            <h2 className="font-pixel text-[24px] font-bold">{cam.state === 'denied' ? 'Camera is blocked' : 'No camera found'}</h2>
            <p className="max-w-[28ch] text-[1.0625rem]">
              {cam.state === 'denied'
                ? 'Allow camera access in your browser, or choose a photo you already took. No account needed.'
                : 'This device or browser has no camera we can use. The camera also needs https or localhost. Choose a photo instead.'}
            </p>
            <PxButton v="primary" icon="photo" onClick={picker.open}>
              Choose photo
            </PxButton>
          </div>
        ) : (
          <>
            <video
              ref={cam.video}
              playsInline
              muted
              aria-label="Live camera view"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {cam.state === 'starting' && (
              <div className="absolute inset-0 flex items-center justify-center text-paper" role="status">
                Starting camera…
              </div>
            )}
            {flash && <span aria-hidden="true" className="shutter-flash" onAnimationEnd={() => setFlash(false)} />}
            <div className="absolute left-3 top-3">
              <PxButton icon="home" onClick={onHome} size="sm">
                Home
              </PxButton>
            </div>
            <div className="absolute bottom-4 right-3">
              <Chip tone="paper">{cam.state === 'live' ? 'Live camera' : 'Waiting for camera'}</Chip>
            </div>
          </>
        )}
        {blocked && (
          <div className="absolute left-3 top-3">
            <PxButton icon="home" onClick={onHome} size="sm">
              Home
            </PxButton>
          </div>
        )}
      </div>

      {picker.error && (
        <Dialogue tone="error" live title="Invalid file">
          {picker.error}
        </Dialogue>
      )}

      {!disclosed ? (
        <Dialogue tone="info" title="Before you scan">
          Recognition can send your photo or sign crop to an AI service.
          <div className="mt-2">
            <PxButton size="sm" v="teal" inline onClick={onDisclose} className="!mb-1">
              Got it
            </PxButton>
          </div>
        </Dialogue>
      ) : (
        <p className="px-2 text-center text-[0.9375rem] text-paper">
          Hold steady and tilt away from glare. You can crop the sign after taking your photo.
        </p>
      )}

      <div className="capture-controls grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 pt-1">
        <PxButton icon="photo" onClick={picker.open} className="capture-picker">
          <span>Choose photo</span>
        </PxButton>
        <PxButton
          size="icon"
          className="shutter"
          aria-label="Take photo"
          disabled={cam.state !== 'live'}
          onClick={shoot}
        >
          <PixelIcon name="camera" size={40} />
        </PxButton>
        <PxButton v="teal" onClick={() => setPicking(true)} className="!px-2 text-[1rem]">
          Sample signs
        </PxButton>
      </div>
      {picking && <SamplePicker onPick={(p) => { setPicking(false); onSample(p) }} onClose={() => setPicking(false)} />}
    </main>
  )
}

/** Real rollsign photos for trying the scanner without a train nearby. */
function SamplePicker({ onPick, onClose }: { onPick: (p: SamplePhoto) => void; onClose: () => void }) {
  const dialog = useDialog(true, onClose)
  return (
    <div ref={dialog} tabIndex={-1} className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/70 p-3 sm:items-center">
      <Panel role="dialog" aria-modal="true" aria-labelledby="samples-title" className="sample-sheet my-auto w-full max-w-[460px] !p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 id="samples-title" className="font-pixel text-[22px] font-bold leading-tight">Sample signs</h2>
            <p className="text-[0.875rem] text-ink/80">Real rollsign photos. Pick one and scan it like you took it.</p>
          </div>
          <PxButton size="icon" aria-label="Close" onClick={onClose}>
            <PixelIcon name="close" size={20} />
          </PxButton>
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {SAMPLE_PHOTOS.map((p) => (
            <li key={p.id}>
              <button type="button" className="sample-tile" onClick={() => onPick(p)}>
                <span className="sample-photo">
                  <img src={p.photo} alt="" loading="lazy" />
                  <span
                    className="sample-bullet"
                    style={{ background: routeColor(p.route), color: ['N', 'Q', 'R', 'W'].includes(p.route) ? '#14233f' : '#fff' }}
                  >
                    {p.route}
                  </span>
                </span>
                <b>{p.title}</b>
                <span>{p.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
        <details className="mt-3 text-[0.75rem] text-ink/75">
          <summary className="cursor-pointer">Photo credits</summary>
          <ul className="mt-1 flex flex-col gap-1">
            {SAMPLE_PHOTOS.map((p) => <li key={p.id}>{p.title}: {p.credit.replace('Photo: ', '')}</li>)}
          </ul>
        </details>
      </Panel>
    </div>
  )
}

/* ---------- 2. Preview / crop ---------- */
export function Preview({
  draft,
  onCrop,
  onRecognize,
  onRetake,
  onBack,
  onPhoto,
  offline,
  onKeep,
  cancelled,
}: {
  offline: boolean
  onKeep: () => void
  cancelled: boolean
  draft: Draft
  onCrop: (c: Draft['crop']) => void
  onRecognize: () => void
  onRetake: () => void
  onBack: () => void
  onPhoto: (url: string) => void
}) {
  const picker = usePicker(onPhoto)
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>('loading')
  const box = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, CropPoint>())
  const gesture = useRef<{ crop: Draft['crop']; points: CropPoint[] } | null>(null)
  const currentCrop = useRef(draft.crop)
  currentCrop.current = draft.crop
  const { x, y, s } = draft.crop
  const [ratio, setRatio] = useState(1.5)
  const bounded = (nx: number, ny: number, size = s) => boundCrop({ x: nx, y: ny, s: size }, ratio)
  const rebase = () => {
    gesture.current = pointers.current.size
      ? { crop: currentCrop.current, points: [...pointers.current.values()] }
      : null
  }
  useEffect(() => {
    pointers.current.clear()
    gesture.current = null
  }, [draft.photo])
  useEffect(() => {
    if (photoStatus !== 'ready' || !box.current) return
    const image = box.current.querySelector('img')
    if (image?.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight)
  }, [photoStatus, draft.photo])
  useEffect(() => {
    const crop = bounded(x, y)
    if (crop.x !== x || crop.y !== y || crop.s !== s) onCrop(crop)
  }, [ratio, x, y, s])

  const startGesture = (e: RPointerEvent<HTMLDivElement>) => {
    if (photoStatus !== 'ready' || (e.pointerType === 'mouse' && e.button !== 0) || pointers.current.size >= 2) return
    e.preventDefault()
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture(e.pointerId)
    rebase()
  }
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current || !box.current) return
    e.preventDefault()
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const frame = box.current.getBoundingClientRect()
    const crop = boundCrop(cropFromGesture(gesture.current.crop, gesture.current.points, [...pointers.current.values()], frame), ratio)
    currentCrop.current = crop
    onCrop(crop)
  }
  const endGesture = (e: RPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    rebase()
  }
  const key = (e: RKeyboardEvent) => {
    const step = 0.03
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    if (d[e.key]) {
      e.preventDefault()
      onCrop(bounded(x + d[e.key][0], y + d[e.key][1]))
    }
  }
  const tooSmall = s < 0.2

  return (
    <div className="flex flex-1 flex-col">
      {picker.input}
      {picker.busy && <Dialogue live title="Opening photo">Checking your selected photo…</Dialogue>}
      <ScreenHeader title="Check photo" onBack={onBack} />
      <main className="flex flex-1 flex-col gap-3 p-4">
        {cancelled && <Dialogue live title="Processing cancelled">Your photo and crop are still here. Resume when ready.</Dialogue>}
        {offline && <Dialogue tone="warn" live title="Waiting for connection">Recognition needs a connection. Keep an unrecognized photo draft for later in this demo session.</Dialogue>}
        <Panel className="!p-2">
          <div ref={box} onPointerDown={startGesture} onPointerMove={move} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture} className="relative isolate mx-auto w-fit max-w-full overflow-hidden touch-none select-none bg-ink">
            <PhotoPreview key={draft.photo} src={draft.photo} alt="Your photo, full frame" className="block max-h-[46dvh] max-w-full" onStatus={setPhotoStatus}>
            <div
              role="group"
              tabIndex={0}
              aria-label="Sign crop position. Drag to move, pinch to resize, or use arrow keys."
              aria-describedby="crop-position"
              onKeyDown={key}
              className="absolute cursor-move"
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                width: `${s * 100}%`,
                aspectRatio: '1.5',
                transform: 'translate(-50%,-50%)',
                boxShadow: '0 0 0 999px rgba(20,35,63,0.55)',
                outline: '4px dashed #f2c53d',
                outlineOffset: '-2px',
              }}
            />
            </PhotoPreview>
          </div>
        </Panel>
        <p id="crop-position" role="status" className="text-paper">Crop center: {Math.round(x * 100)}% across, {Math.round(y * 100)}% down. Drag to move, pinch with two fingers to resize, or focus the crop and use arrow keys.</p>

        <Panel className="flex flex-col gap-3">
          <PanelTitle
            right={
              <PxButton size="sm" inline className="!mb-3" onClick={() => onCrop({ x: 0.5, y: 0.4, s: 0.38 })}>
                Reset
              </PxButton>
            }
          >
            Adjust crop
          </PanelTitle>
          <p className="text-[1rem]">Drag the box over the sign. Spread two fingers to enlarge it; pinch together to shrink it. You can also use the size slider. Your full photo is always kept.</p>
          <label className="flex flex-col gap-1">
            <span className="font-pixel text-[16px] font-bold uppercase tracking-normal">Crop size</span>
            <input
              type="range"
              min={Math.min(0.1, 1.5 / ratio)}
              max={Math.min(0.9, 1.5 / ratio)}
              step={0.01}
              value={s}
              onChange={(e) => onCrop(bounded(x, y, Number(e.target.value)))}
              className="h-10 w-full accent-ink"
            />
          </label>
          {tooSmall && (
            <Dialogue tone="warn" live>
              Crop is very small. Recognition may miss the sign. Make the box a little larger.
            </Dialogue>
          )}
        </Panel>

        {picker.error && (
          <Dialogue tone="error" live title="Invalid file">
            {picker.error}
          </Dialogue>
        )}

        <div className="mt-auto flex flex-col">
          <PxButton v="primary" size="lg" icon="search" disabled={offline || photoStatus !== 'ready' || picker.busy} onClick={onRecognize}>
            Recognize sign
          </PxButton>
          <PxButton onClick={onKeep}>Keep photo draft (demo)</PxButton>
          <div className="grid grid-cols-2 gap-2">
            <PxButton icon="camera" onClick={onRetake}>
              Retake
            </PxButton>
            <PxButton icon="photo" onClick={picker.open}>
              Choose another
            </PxButton>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ---------- 3. Recognition progress ---------- */
const STAGES = ['Reading the sign', 'Matching its appearance', 'Preparing your card']

export function Recognizing({
  draft,
  scenario,
  onDone,
  onCancel,
  onBack,
}: {
  onBack: () => void
  draft: Draft
  scenario: Scenario
  onDone: (r: Result) => void
  onCancel: () => void
}) {
  const [stage, setStage] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const done = useRef(onDone)
  done.current = onDone
  const photo = useRef(draft)
  photo.current = draft
  const real = scenario === 'live'

  useEffect(() => {
    let live = true
    setStage(0)
    setFailed(false)
    const t1 = setTimeout(() => live && setStage(1), real ? 1500 : 1000)
    const t2 = setTimeout(() => live && setStage(2), real ? 3500 : 2000)
    const finish = (r: Result) => {
      if (!live) return
      if (r.kind === 'timeout') setFailed(true)
      else done.current(r)
    }

    let t3 = 0
    const request = new AbortController()
    if (real) {
      const limit = setTimeout(() => request.abort(new DOMException('Recognition timed out', 'TimeoutError')), 30000)
      recognize(photo.current, request.signal).then(finish).finally(() => clearTimeout(limit))
    } else {
      t3 = window.setTimeout(() => finish(resolveScenario(scenario === 'timeout' && attempt > 0 ? 'first' : scenario)), 3000)
    }
    return () => {
      live = false
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      request.abort()
    }
  }, [attempt, scenario, real])

  const { x, y, s } = draft.crop
  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="Recognizing" />
      <main className="flex flex-1 flex-col gap-4 p-4">
        <Panel className="flex flex-wrap gap-4">
          <div className="relative w-32 shrink-0 self-start bg-ink">
            <img src={draft.photo} alt="Photo being recognized" className="block w-full" />
            <div
              className="absolute"
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                width: `${s * 100}%`,
                aspectRatio: '1.5',
                transform: 'translate(-50%,-50%)',
                outline: '3px solid #f2c53d',
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-pixel text-[18px] font-bold leading-tight">
              {failed ? 'No answer yet' : 'Working on it'}
            </h2>
            <p className="mt-1 text-[1rem]">
              {failed
                ? 'The recognition service timed out. Your photo is safe.'
                : real
                  ? 'Sending the area around your crop to Gemini. You can cancel anytime.'
                  : 'Simulated recognition; no photo is uploaded. You can cancel anytime.'}
            </p>
          </div>
        </Panel>

        <Panel>
          <EngineRoom working={!failed} />
          {!failed && <div className="prog-bar mb-4" role="progressbar" aria-label="Recognition in progress" />}
          <ol className="flex flex-col gap-3" aria-live="polite">
            {STAGES.map((label, i) => {
              const state = failed ? (i <= stage ? (i === stage ? 'fail' : 'done') : 'todo') : i < stage ? 'done' : i === stage ? 'now' : 'todo'
              return (
                <li key={label} className={`flex items-center gap-3 text-[1.0625rem] ${state === 'todo' ? 'opacity-55' : ''}`}>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center ${
                      state === 'done' ? 'bg-ok text-paper' : state === 'fail' ? 'bg-alert text-paper' : state === 'now' ? 'bg-gold' : 'bg-paper-2'
                    }`}
                  >
                    {state === 'done' && <PixelIcon name="check" size={16} />}
                    {state === 'fail' && <PixelIcon name="close" size={14} />}
                    {state === 'now' && <span className="blink block h-3 w-3 bg-ink" />}
                  </span>
                  <span className={state === 'now' ? 'font-bold' : ''}>{label}</span>
                </li>
              )
            })}
          </ol>
          <span className="sr-only" role="status">
            {failed ? 'Recognition timed out' : STAGES[stage]}
          </span>
        </Panel>

        <div className="mt-auto flex flex-col">
          {failed && (
            <PxButton v="primary" size="lg" onClick={() => setAttempt((a) => a + 1)}>
              Retry
            </PxButton>
          )}
          <div className="grid grid-cols-2 gap-2">
            <PxButton onClick={onBack}>Back to photo</PxButton>
            <PxButton onClick={onCancel}>Cancel</PxButton>
          </div>
        </div>
      </main>
    </div>
  )
}
