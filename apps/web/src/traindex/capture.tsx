import { decodePhoto, PhotoPreview, type PhotoStatus } from './photo'
import { boundCrop, cropFromGesture, type CropPoint } from './crop'
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent, KeyboardEvent as RKeyboardEvent } from 'react'
import { type Draft, type Result, type Scenario, PHOTO, resolveScenario } from './data'
import { Chip, Dialogue, Panel, PanelTitle, PixelIcon, PxButton, ScreenHeader } from './ui'

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
  onShutter: () => void
  onPhoto: (url: string) => void
  onSample: () => void
  cameraDenied: boolean
  disclosed: boolean
  onDisclose: () => void
}) {
  const picker = usePicker(onPhoto)
  return (
    <main className="capture-screen flex flex-1 flex-col gap-2 p-4 pb-3">
      {picker.input}
      {picker.busy && <Dialogue live title="Opening photo">Checking your selected photo…</Dialogue>}
      <div className="px-panel relative flex-1 overflow-hidden !bg-ink" style={{ minHeight: 380 }}>
        {cameraDenied ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-paper">
            <PixelIcon name="ask" size={40} />
            <h2 className="font-pixel text-[24px] font-bold">Camera is blocked</h2>
            <p className="max-w-[28ch] text-[1.0625rem]">
              Allow camera access in your browser, or choose a photo you already took. No account needed.
            </p>
            <PxButton v="primary" icon="photo" onClick={picker.open}>
              Choose photo
            </PxButton>
          </div>
        ) : (
          <>
            <img
              src={PHOTO.finder}
              alt="Simulated camera view of a subway platform"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <div
                className="relative h-[26%] w-[74%]"
                style={{ boxShadow: '0 0 0 999px rgba(20,35,63,0.5)' }}
              >
                {[
                  'left-0 top-0 border-l-[6px] border-t-[6px]',
                  'right-0 top-0 border-r-[6px] border-t-[6px]',
                  'bottom-0 left-0 border-b-[6px] border-l-[6px]',
                  'bottom-0 right-0 border-b-[6px] border-r-[6px]',
                ].map((c) => (
                  <span key={c} className={`absolute h-7 w-7 border-gold ${c}`} />
                ))}
              </div>
            </div>
            <div className="absolute inset-x-0 top-[calc(50%+17%)] flex justify-center" aria-hidden="true">
              <Chip tone="gold">Frame the sign</Chip>
            </div>
            <div className="absolute left-3 top-3">
              <PxButton icon="home" onClick={onHome} size="sm">
                Home
              </PxButton>
            </div>
            <div className="absolute bottom-4 right-3">
              <Chip tone="paper">Simulated viewfinder</Chip>
            </div>
          </>
        )}
        {cameraDenied && (
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
          Hold steady and tilt away from glare. Sign fills the frame.
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
          disabled={cameraDenied}
          onClick={onShutter}
        >
          <PixelIcon name="camera" size={40} />
        </PxButton>
        <PxButton v="teal" onClick={onSample} className="!px-2 text-[1rem]">
          Sample photo
        </PxButton>
      </div>
    </main>
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

  useEffect(() => {
    let live = true
    setStage(0)
    setFailed(false)
    const t1 = setTimeout(() => live && setStage(1), 1000)
    const t2 = setTimeout(() => live && setStage(2), 2000)
    const t3 = setTimeout(() => {
      if (!live) return
      const eff: Scenario = scenario === 'timeout' && attempt > 0 ? 'first' : scenario
      const r = resolveScenario(eff)
      if (r.kind === 'timeout') setFailed(true)
      else done.current(r)
    }, 3000)
    return () => {
      live = false
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [attempt, scenario])

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
              {failed ? 'The recognition service timed out. Your photo is safe.' : 'Simulated recognition; no photo is uploaded. You can cancel anytime.'}
            </p>
          </div>
        </Panel>

        <Panel>
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
