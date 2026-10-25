import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent, KeyboardEvent as RKeyboardEvent } from 'react'
import { type Draft, type Result, type Scenario, PHOTO, resolveScenario } from './data'
import { Chip, Dialogue, Panel, PanelTitle, PixelIcon, PxButton, ScreenHeader } from './ui'

/* ---------- Photo picker hook ---------- */
export function usePicker(onPhoto: (url: string) => void) {
  const ref = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      className="hidden"
      aria-label="Choose a photo from your device"
      onChange={(e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return
        if (!f.type.startsWith('image/')) {
          setError('That file is not a photo. Choose a JPG, PNG, or HEIC image.')
          return
        }
        setError(null)
        onPhoto(URL.createObjectURL(f))
      }}
    />
  )
  return { input, open: () => ref.current?.click(), error }
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
    <main className="flex flex-1 flex-col gap-2 p-4 pb-3">
      {picker.input}
      <div className="px-panel relative flex-1 overflow-hidden !bg-ink" style={{ minHeight: 380 }}>
        {cameraDenied ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-paper">
            <PixelIcon name="ask" size={40} />
            <h2 className="font-pixel text-[24px] font-medium">Camera is blocked</h2>
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
            <div className="absolute right-3 top-4">
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

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
        <PxButton icon="photo" onClick={picker.open} className="!px-2 text-[1rem]">
          Choose photo
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
}: {
  draft: Draft
  onCrop: (c: Draft['crop']) => void
  onRecognize: () => void
  onRetake: () => void
  onBack: () => void
  onPhoto: (url: string) => void
}) {
  const picker = usePicker(onPhoto)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const { x, y, s } = draft.crop
  const clamp = (n: number) => Math.min(0.96, Math.max(0.04, n))

  const move = (e: RPointerEvent) => {
    if (!drag.current || !box.current) return
    const r = box.current.getBoundingClientRect()
    onCrop({ x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height), s })
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
      onCrop({ x: clamp(x + d[e.key][0]), y: clamp(y + d[e.key][1]), s })
    }
  }
  const tooSmall = s < 0.2

  return (
    <div className="flex flex-1 flex-col">
      {picker.input}
      <ScreenHeader title="Check photo" onBack={onBack} />
      <main className="flex flex-1 flex-col gap-3 p-4">
        <Panel className="!p-2">
          <div ref={box} className="relative mx-auto w-fit max-w-full touch-none select-none bg-ink">
            <img src={draft.photo} alt="Your photo, full frame" className="block max-h-[46dvh] max-w-full" draggable={false} />
            <div
              role="slider"
              tabIndex={0}
              aria-label="Sign crop position. Use arrow keys to move."
              aria-valuetext={`Centered ${Math.round(x * 100)}% across, ${Math.round(y * 100)}% down`}
              aria-valuenow={Math.round(x * 100)}
              onKeyDown={key}
              onPointerDown={(e) => {
                drag.current = true
                e.currentTarget.setPointerCapture(e.pointerId)
                move(e)
              }}
              onPointerMove={move}
              onPointerUp={() => (drag.current = false)}
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
          </div>
        </Panel>

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
          <p className="text-[1rem]">Drag the box over the sign. Your full photo is always kept.</p>
          <label className="flex flex-col gap-1">
            <span className="font-pixel text-[16px] font-medium uppercase tracking-normal">Crop size</span>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.01}
              value={s}
              onChange={(e) => onCrop({ x, y, s: Number(e.target.value) })}
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
          <PxButton v="primary" size="lg" icon="search" onClick={onRecognize}>
            Recognize sign
          </PxButton>
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
}: {
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
        <Panel className="flex gap-4">
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
            <h2 className="font-pixel text-[16px] font-medium leading-tight">
              {failed ? 'No answer yet' : 'Working on it'}
            </h2>
            <p className="mt-1 text-[1rem]">
              {failed ? 'The recognition service timed out. Your photo is safe.' : 'This takes a few seconds. You can cancel anytime.'}
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
                  <span className={state === 'now' ? 'font-medium' : ''}>{label}</span>
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
            <PxButton onClick={onCancel}>Back to photo</PxButton>
            <PxButton onClick={onCancel}>Cancel</PxButton>
          </div>
        </div>
      </main>
    </div>
  )
}
