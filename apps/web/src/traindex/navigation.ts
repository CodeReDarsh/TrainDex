import { useCallback, useEffect, useRef, useState } from "react"

export type Nav = {
  name: "capture" | "preview" | "recognizing" | "review" | "home" | "collection" | "settings" | "import" | "drafts"
} | { name: "reveal"; cardId: string; first: boolean | null } | {
  name: "route"
  route: string
} | { name: "detail"; cardId: string; from?: "collection" }

export function leavesCapture(from: Nav, to: Nav): boolean {
  return (
    ["preview", "recognizing", "review"].includes(from.name) &&
    !["preview", "recognizing", "review"].includes(to.name)
  )
}

/** Browser history carries destinations only; photos and credentials never enter history. */
export function useScreenHistory(
  onBack: (next: Nav, apply: () => void) => void,
) {
  const [nav, setNav] = useState<Nav>({ name: "capture" })
  const session = useRef(`traindex-${Date.now()}-${Math.random()}`)
  const current = useRef({
    session: session.current,
    index: 0,
    nav: { name: "capture" } as Nav,
  })
  const request = useRef(onBack)
  request.current = onBack
  const restore = useRef<(() => void) | null>(null)
  const applying = useRef(false)
  useEffect(() => {
    window.history.replaceState({ trainDex: current.current }, "")
    const pop = (event: PopStateEvent) => {
      if (applying.current) {
        applying.current = false
        return
      }
      if (restore.current) {
        const next = restore.current
        restore.current = null
        next()
        return
      }
      const target = event.state?.trainDex as typeof current.current | undefined
      if (!target || target.session !== session.current) {
        // A history entry from before a refresh has no recoverable prototype state.
        current.current = {
          session: session.current,
          index: 0,
          nav: { name: "capture" },
        }
        window.history.replaceState({ trainDex: current.current }, "")
        setNav({ name: "capture" })
        return
      }
      const delta = current.current.index - target.index
      if (!delta) return
      // Restore the current entry before showing a discard/overlay decision.
      restore.current = () =>
        request.current(target.nav, () => {
          applying.current = true
          window.history.go(-delta)
          current.current = target
          setNav(target.nav)
          window.scrollTo(0, 0)
        })
      window.history.go(delta)
    }
    window.addEventListener("popstate", pop)
    return () => window.removeEventListener("popstate", pop)
  }, [])
  const navigate = useCallback((next: Nav, replace = false) => {
    const entry = {
      session: session.current,
      index: current.current.index + (replace ? 0 : 1),
      nav: next,
    }
    window.history[replace ? "replaceState" : "pushState"](
      { trainDex: entry },
      "",
    )
    current.current = entry
    setNav(next)
    window.scrollTo(0, 0)
  }, [])
  return [nav, navigate] as const
}
