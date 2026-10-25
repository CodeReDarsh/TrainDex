import { PhotoPreview } from './photo'
import { useDialog } from "./dialog"
import { useEffect, useState } from "react"
import type { Card, Draft } from "./data"
import { fmtDateTime } from "./data"
import { Chip, Dialogue, Panel, PanelTitle, PxButton, ScreenHeader } from "./ui"
import { Confirm } from "./review"

export type AuthOutcome = "success" | "cancelled" | "error" | "expired"
export function AccountFlow({
  kind,
  outcome,
  hasCard,
  onClose,
  onSuccess,
}: {
  kind: "signin" | "signup"
  outcome: AuthOutcome
  hasCard: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const dialog = useDialog(true, onClose)
  const [step, setStep] = useState<"intro" | "loading" | AuthOutcome>("intro")
  useEffect(() => {
    if (step !== "loading") return
    const timer = window.setTimeout(() => setStep(outcome), 1000)
    return () => window.clearTimeout(timer)
  }, [step, outcome])
  return (
    <div
      ref={dialog}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/70 p-4"
    >
      <Panel
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        className="my-auto w-full max-w-[440px] !p-5"
      >
        <Chip tone="gold">Account prototype</Chip>
        <h2
          id="account-title"
          className="mt-3 font-pixel text-[26px] font-bold"
        >
          {kind === "signup" ? "Create an account" : "Welcome back"}
        </h2>
        <p className="my-3">
          Continue with Google is the proposed sign-in method. Your first
          sign-in creates an account; returning users open their existing
          account.
        </p>
        <p className="mb-4 text-ink/80">
          This demo does not connect to Google or store a session. No
          credentials are requested.{" "}
          {hasCard
            ? "Your photo, crop, and card details stay in this open session."
            : "Device cards stay separate until you choose to import them."}
        </p>
        {step === "loading" ? (
          <div role="status">
            <div className="prog-bar my-4" />
            <p>Simulating sign-in…</p>
          </div>
        ) : step === "success" ? (
          <>
            <Dialogue tone="ok" title="Demo account ready" live>
              Signed in as Demo collector for this session.{" "}
              {hasCard
                ? "Return to your card, then choose Save to my account. Signing in has not saved it."
                : "Nothing has been imported or synced."}
            </Dialogue>
            <PxButton v="primary" className="mt-4 w-full" onClick={onSuccess}>
              {hasCard ? "Return to preserved card" : "Continue to Settings"}
            </PxButton>
          </>
        ) : (
          <>
            {step !== "intro" && (
              <Dialogue
                tone="warn"
                live
                title={
                  step === "expired"
                    ? "Session expired"
                    : step === "cancelled"
                      ? "Sign-in cancelled"
                      : "Could not sign in"
                }
              >
                {step === "expired"
                  ? "The demo session expired. Sign in again to continue."
                  : step === "cancelled"
                    ? "No account was connected."
                    : "The simulated provider could not be reached."}{" "}
                {hasCard
                  ? "Your card is still here; device saving remains available."
                  : "Your device collection is unchanged."}
              </Dialogue>
            )}
            <PxButton
              v="primary"
              className="mt-4 w-full"
              onClick={() => setStep("loading")}
            >
              {step === "intro"
                ? "Continue with Google (demo)"
                : "Try sign-in again"}
            </PxButton>
          </>
        )}
        {step !== "success" && (
          <PxButton className="mt-2 w-full" onClick={onClose}>
            {hasCard ? "Back to card" : "Back to Settings"}
          </PxButton>
        )}
      </Panel>
    </div>
  )
}

export type ImportStatus = "waiting" | "uploading" | "complete" | "failed"
export function ImportCards({
  cards,
  imported,
  failOne,
  offline,
  onBusy,
  paused,
  onImported,
  onBack,
}: {
  cards: Card[]
  imported: string[]
  failOne: boolean
  offline: boolean
  paused: boolean
  onBusy: (busy: boolean) => void
  onImported: (id: string) => void
  onBack: () => void
}) {
  const [items, setItems] = useState(() =>
    cards
      .filter((c) => c.storage === "device")
      .map((c) => ({
        card: c,
        status: (imported.includes(c.id)
          ? "complete"
          : "waiting") as ImportStatus,
      })),
  )
  const [started, setStarted] = useState(false)
  const [running, setRunning] = useState(false)
  const [failedOnce, setFailedOnce] = useState(false)
  useEffect(() => { onBusy(running); return () => onBusy(false) }, [running, onBusy])
  const complete = items.filter((i) => i.status === "complete").length
  const failed = items.some((i) => i.status === "failed")
  useEffect(() => {
    if (paused || !running || items.some((i) => i.status === "uploading")) return
    const next = items.find((i) => i.status === "waiting")
    if (!next) {
      setRunning(false)
      return
    }
    setItems((list) =>
      list.map((i) =>
        i.card.id === next.card.id ? { ...i, status: "uploading" } : i,
      ),
    )
  }, [running, items, paused])
  const active = items.find((i) => i.status === "uploading")
  useEffect(() => {
    if (!active || paused) return
    const timer = window.setTimeout(() => {
      const fails = offline || (failOne && !failedOnce)
      if (fails) setFailedOnce(true)
      else onImported(active.card.id)
      setItems((list) =>
        list.map((i) =>
          i.card.id === active.card.id
            ? { ...i, status: fails ? "failed" : "complete" }
            : i,
        ),
      )
    }, 850)
    return () => window.clearTimeout(timer)
  }, [active, failOne, offline, failedOnce, onImported, paused])
  return (
    <>
      <ScreenHeader
        title="Add device cards"
        onBack={onBack}
      />
      <main className="flex flex-col gap-4 p-4">
        <Dialogue title="Import prototype">
          Destination: Demo collector. Import is simulated; no photos leave this
          browser. Local copies are retained, including after success. Reload
          clears all demo progress.
        </Dialogue>
        {offline && (
          <Dialogue tone="warn" title="Waiting for connection">
            Reconnect before importing. Local copies remain available.
          </Dialogue>
        )}
        <Panel>
          <PanelTitle>
            {!items.length
              ? "No device cards to add"
              : complete === items.length
                ? "Import complete"
                : running
                  ? "Adding cards…"
                  : !started
                    ? "Choose to import"
                    : failed
                      ? "Some cards need retry"
                      : "Import complete"}
          </PanelTitle>
          <p className="mb-3">
            {complete} of {items.length} demo cards added. The same encounter is
            shown once when local and account copies overlap.
          </p>
          <ul className="flex flex-col gap-3" aria-live="polite">
            {items.map(({ card, status }) => (
              <li key={card.id} className="px-inset p-3">
                <b>
                  Route {card.route} · {card.model ?? "Unknown"}
                </b>
                <p>{fmtDateTime(card.captureAt)}</p>
                <Chip
                  tone={
                    status === "failed"
                      ? "alert"
                      : status === "complete"
                        ? "ok"
                        : "paper"
                  }
                >
                  {status === "failed"
                    ? "Failed · local copy kept"
                    : status === "complete"
                      ? "Added (simulated) · local copy kept"
                      : status}
                </Chip>
              </li>
            ))}
          </ul>
        </Panel>
        {running && <PxButton onClick={onBack}>Stop and return to Settings</PxButton>}
        {!running && (
          <div className="flex flex-col">
            {items.some((i) => i.status !== "complete") && (
              <PxButton
                v="primary"
                disabled={offline}
                onClick={() => {
                  setStarted(true)
                  setItems((list) =>
                    list.map((i) =>
                      i.status === "failed" ? { ...i, status: "waiting" } : i,
                    ),
                  )
                  setRunning(true)
                }}
              >
                {failed
                  ? "Retry failed cards"
                  : `Add ${items.length - complete} device cards to my account`}
              </PxButton>
            )}
            <PxButton onClick={onBack}>
              {!started ? "Keep on device for now" : "Back to Settings"}
            </PxButton>
          </div>
        )}
      </main>
    </>
  )
}

export function PhotoDrafts({
  drafts,
  offline,
  onResume,
  onDiscard,
  onBack,
  onScan,
}: {
  drafts: Draft[]
  offline: boolean
  onResume: (d: Draft) => void
  onDiscard: (id: string) => void
  onBack: () => void
  onScan: () => void
}) {
  const [discard, setDiscard] = useState<string | null>(null)
  return (
    <>
      <ScreenHeader title="Photo drafts" onBack={onBack} />
      <main className="flex flex-col gap-4 p-4">
        <Dialogue title="Unrecognized photos">
          Drafts are separate from saved cards and route counts. This prototype
          keeps photos only in memory until refresh.{" "}
          {offline
            ? "Waiting for a connection to recognize."
            : "Open a draft to check the crop and resume recognition."}
        </Dialogue>
        {!drafts.length && (
          <Panel>
            <PanelTitle>No drafts yet</PanelTitle>
            <p>
              Keep a photo from Check photo to return to it later in this
              session.
            </p>
          </Panel>
        )}
        {drafts.map((d) => (
          <Panel key={d.id}>
            <PhotoPreview
              src={d.photo}
              alt="Unrecognized photo draft"
              className="mb-3 max-h-48 w-full object-contain"
            />
            <Chip tone="gold">
              {offline ? "Waiting for connection" : "Ready to resume"} · not a
              card
            </Chip>
            <p className="my-3">{fmtDateTime(d.captureAt)}</p>
            <PxButton
              className="w-full"
              v="primary"
              onClick={() => onResume(d)}
            >
              Open draft
            </PxButton>
            <PxButton
              className="w-full"
              icon="trash"
              onClick={() => setDiscard(d.id)}
            >
              Discard draft
            </PxButton>
          </Panel>
        ))}
        <PxButton icon="camera" onClick={onScan}>
          Scan a sign
        </PxButton>
      </main>
      {discard && (
        <Confirm
          title="Discard photo draft?"
          body="This removes this unrecognized photo from the demo session. Saved cards are unaffected."
          confirm="Discard draft"
          danger
          onCancel={() => setDiscard(null)}
          onConfirm={() => {
            onDiscard(discard)
            setDiscard(null)
          }}
        />
      )}
    </>
  )
}

export function LoadState({
  state,
  detail,
  onRetry,
  onBack,
}: {
  state: "loading" | "error"
  detail: boolean
  onRetry: () => void
  onBack: () => void
}) {
  return (
    <>
      <ScreenHeader title={detail ? "Card" : "My Collection"} onBack={onBack} />
      <main className="flex flex-col gap-4 p-4">
        <Panel>
          <PanelTitle>
            {state === "loading"
              ? "Loading…"
              : detail
                ? "Card could not load"
                : "Collection could not load"}
          </PanelTitle>
          {state === "loading" ? (
            <div role="status">
              <div className="prog-bar my-4" />
              Loading demo data…
            </div>
          ) : (
            <>
              <Dialogue live tone="error">
                Simulated load failure. Your cards have not been removed.
              </Dialogue>
              <PxButton className="mt-4 w-full" v="primary" onClick={onRetry}>
                Retry
              </PxButton>
            </>
          )}
        </Panel>
      </main>
    </>
  )
}
