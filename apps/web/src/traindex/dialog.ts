import { useEffect, useRef } from "react"

const dialogs: { element: HTMLElement; close: () => void }[] = []
export function closeTopDialog(): boolean {
  const top = dialogs[dialogs.length - 1]
  if (!top) return false
  top.close()
  return true
}

/** Trap focus, hide background branches, and restore the launching control after cleanup. */
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const wasOpen = useRef(false)
  const opener = useRef<HTMLElement | null>(null)
  if (open && !wasOpen.current)
    opener.current = (document.activeElement as HTMLElement | null)
  wasOpen.current = open
  useEffect(() => {
    if (!open || !ref.current) return
    const el = ref.current
    const item = { element: el, close: () => close.current() }
    dialogs.push(item)
    const previous = opener.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const hidden: [HTMLElement, boolean][] = []
    let branch: HTMLElement = el
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (
          sibling !== branch &&
          sibling instanceof HTMLElement &&
          !["SCRIPT", "STYLE"].includes(sibling.tagName)
        ) {
          hidden.push([sibling, sibling.inert])
          sibling.inert = true
        }
      }
      branch = branch.parentElement
      if (branch === document.body) break
    }
    const controls = () =>
      [
        ...el.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        ),
      ].filter((e) => e.getClientRects().length && !e.closest("[inert]"))
    const focusFirst = () =>
      (
        el.querySelector<HTMLElement>("[data-initial-focus]") ??
        controls()[0] ??
        el
      ).focus()
    focusFirst()
    const key = (event: KeyboardEvent) => {
      if (dialogs[dialogs.length - 1] !== item) return
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        close.current()
        return
      }
      if (event.key !== "Tab") return
      const all = controls()
      const index = all.indexOf(document.activeElement as HTMLElement)
      if (!all.length) {
        event.preventDefault()
        el.focus()
      } else if (event.shiftKey && index <= 0) {
        event.preventDefault()
        all[all.length - 1].focus()
      } else if (
        !event.shiftKey &&
        (index === -1 || index === all.length - 1)
      ) {
        event.preventDefault()
        all[0].focus()
      }
    }
    const focus = (event: FocusEvent) => {
      if (
        dialogs[dialogs.length - 1] === item &&
        !el.contains(event.target as Node)
      )
        focusFirst()
    }
    const observer = new MutationObserver(() => {
      if (
        dialogs[dialogs.length - 1] === item &&
        !el.contains(document.activeElement)
      )
        focusFirst()
    })
    observer.observe(el, { childList: true, subtree: true })
    document.addEventListener("keydown", key, true)
    document.addEventListener("focusin", focus)
    return () => {
      observer.disconnect()
      dialogs.splice(dialogs.indexOf(item), 1)
      document.removeEventListener("keydown", key, true)
      document.removeEventListener("focusin", focus)
      for (const [node, inert] of hidden) node.inert = inert
      document.body.style.overflow = overflow
      requestAnimationFrame(() => {
        if (
          (!dialogs.length || dialogs[dialogs.length - 1].element.contains(previous)) &&
          previous?.isConnected &&
          !previous.closest("[inert]")
        )
          previous.focus({ preventScroll: true })
      })
    }
  }, [open])
  return ref
}
