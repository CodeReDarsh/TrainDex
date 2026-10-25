import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { Dialogue, PxButton } from "./ui"

export type PhotoStatus = "loading" | "ready" | "error"
export const PhotoPreviewContext = createContext<{
  state: PhotoStatus
  reset: () => void
}>({ state: "ready", reset: () => {} })

export async function decodePhoto(src: string): Promise<void> {
  const image = new Image()
  image.src = src
  await image.decode()
  if (!image.naturalWidth || !image.naturalHeight)
    throw new Error("Empty image")
}

/** Decode before enabling crop/recognition. A replaced photo cannot finish an older request. */
export function PhotoPreview({
  src,
  alt,
  className = "",
  children,
  onStatus,
}: {
  src: string
  alt: string
  className?: string
  children?: ReactNode
  onStatus?: (s: PhotoStatus) => void
}) {
  const fixture = useContext(PhotoPreviewContext)
  const [attempt, setAttempt] = useState(0)
  const [decoded, setDecoded] = useState<{ src: string; status: PhotoStatus }>({
    src,
    status: "loading",
  })
  const status =
    fixture.state !== "ready"
      ? fixture.state
      : decoded.src === src
        ? decoded.status
        : "loading"
  useEffect(() => {
    let live = true
    setDecoded({ src, status: "loading" })
    decodePhoto(src)
      .then(() => {
        if (live) setDecoded({ src, status: "ready" })
      })
      .catch(() => {
        if (live) setDecoded({ src, status: "error" })
      })
    return () => {
      live = false
    }
  }, [src, attempt])
  useEffect(() => {
    onStatus?.(status)
  }, [status, onStatus])
  if (status === "loading")
    return (
      <div className="min-h-36 bg-paper-2 p-4 text-ink" role="status">
        <b>Loading photo…</b>
        <div className="prog-bar my-4" />
        <p>Checking that this photo can be displayed.</p>
      </div>
    )
  if (status === "error")
    return (
      <div className="p-3">
        <Dialogue tone="error" live title="Photo could not open">
          The image may be damaged, unsupported, or unavailable. Your draft and
          card details have not been removed. Try again or choose a JPG or PNG
          photo.
        </Dialogue>
        <PxButton
          className="mt-4 w-full"
          onClick={() => {
            fixture.reset()
            setAttempt((n) => n + 1)
          }}
        >
          Retry opening photo
        </PxButton>
      </div>
    )
  return (
    <>
      <img src={src} alt={alt} className={className} draggable={false} />
      {children}
    </>
  )
}
