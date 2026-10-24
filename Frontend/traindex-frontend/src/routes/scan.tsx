import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { CameraOff, RefreshCw, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { setCapture } from "@/lib/capture-store";
import { pillVariants } from "@/components/ui/pill-button";

export const Route = createFileRoute("/scan")({
  validateSearch: (s: Record<string, unknown>): { target?: string | undefined } => ({
    target: typeof s["target"] === "string" ? s["target"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Scan — Traindex" },
      { name: "description", content: "Point your camera at a subway rollsign to catch it." },
      { property: "og:title", content: "Scan — Traindex" },
      { property: "og:description", content: "Point your camera at a subway rollsign to catch it." },
    ],
  }),
  component: Scan,
});

type CamState = "starting" | "live" | "denied" | "unavailable";

const BRACKETS = [
  "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-2xl",
  "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-2xl",
  "left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-2xl",
  "right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-2xl",
];

const iconButton =
  "tap grid size-11 place-items-center rounded-full bg-scrim text-foreground backdrop-blur-md transition-[background-color,transform] duration-150 hover:bg-raised active:scale-90";

function Scan() {
  const { target } = Route.useSearch();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [cam, setCam] = useState<CamState>("starting");
  const [steady, setSteady] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setCam("starting");
    setSteady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam("unavailable");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        setCam("live");
      })
      .catch((e: DOMException) => {
        setCam(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "denied" : "unavailable");
      });
    const t = setTimeout(() => setSteady(true), 1400);
    return () => {
      cancelled = true;
      clearTimeout(t);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [facing]);

  const shoot = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setFlash(true);
    const scale = Math.min(1, 1280 / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    setCapture({
      dataUrl: c.toDataURL("image/jpeg", 0.82),
      match: null,
      targetId: target,
      capturedAt: new Date().toISOString(),
    });
    // Let the shutter flash land before the screen changes.
    window.setTimeout(() => navigate({ to: "/compare" }), 140);
  }, [navigate, target]);

  const blocked = cam === "denied" || cam === "unavailable";
  const ready = cam === "live" && steady;
  const status = cam === "starting" ? "Starting camera" : ready ? "Ready" : "Fit the sign inside the frame";

  return (
    <div className="relative h-full overflow-hidden bg-sign">
      <video
        ref={videoRef}
        playsInline
        muted
        aria-label="Camera preview"
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity duration-300",
          cam === "live" ? "opacity-100" : "opacity-0",
        )}
      />

      {flash && (
        <span
          aria-hidden
          onAnimationEnd={() => setFlash(false)}
          className="animate-shutter pointer-events-none absolute inset-0 z-20 bg-white"
        />
      )}

      <div className="safe-top absolute inset-x-0 top-0 z-10 flex items-start justify-between px-4">
        <Link to="/lines" aria-label="Close camera" className={iconButton}>
          <X className="size-5" />
        </Link>
        {!blocked && (
          <span
            role="status"
            className="mt-1.5 flex items-center gap-2 rounded-full bg-scrim px-3.5 py-2 text-[13px] font-semibold backdrop-blur-md"
          >
            <span
              className={cn("size-2 rounded-full transition-colors", ready ? "bg-success" : "animate-pulse bg-warning")}
            />
            {status}
          </span>
        )}
        <span className="size-11" aria-hidden />
      </div>

      {blocked ? (
        <CameraBlocked denied={cam === "denied"} />
      ) : (
        <>
          <div className="pointer-events-none absolute top-[40%] left-1/2 h-[20%] w-[86%] -translate-x-1/2 -translate-y-1/2">
            {BRACKETS.map((c) => (
              <span
                key={c}
                className={cn(
                  "absolute size-10 transition-colors duration-300",
                  ready ? "border-foreground" : "border-foreground/50",
                  c,
                )}
              />
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-6 bg-linear-to-t from-black/70 to-transparent px-6 pt-16 pb-6">
            <p className="flex items-center gap-2 text-[13px] text-white/80">
              <Sun className="size-4" aria-hidden /> Shoot at an angle to avoid glare on the glass
            </p>
            <div className="relative flex w-full items-center justify-center">
              <button
                type="button"
                onClick={shoot}
                disabled={cam !== "live"}
                aria-label="Take photo"
                className="group grid size-20 place-items-center rounded-full border-4 border-white transition-opacity duration-150 focus-visible:outline-offset-4 disabled:opacity-40"
              >
                <span className="size-[62px] rounded-full bg-white transition-transform duration-100 group-active:scale-90" />
              </button>
              <button
                type="button"
                onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
                aria-label={facing === "environment" ? "Switch to front camera" : "Switch to back camera"}
                className={cn(iconButton, "absolute right-2 size-12")}
              >
                <RefreshCw className="size-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CameraBlocked({ denied }: { denied: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background px-8 text-center">
      <span className="grid size-14 place-items-center rounded-full border bg-surface text-muted-foreground">
        <CameraOff className="size-6" aria-hidden />
      </span>
      <h1 className="text-xl font-bold">{denied ? "Camera access is off" : "No camera found"}</h1>
      {denied ? (
        <ol className="max-w-[34ch] list-decimal space-y-2 pl-5 text-left text-sm leading-relaxed text-muted-foreground">
          <li>Tap the lock or “aA” icon in your browser’s address bar.</li>
          <li>Set Camera to “Allow”.</li>
          <li>On iPhone, you can also open Settings, then Safari, then Camera, and choose Allow.</li>
          <li>Reload this page.</li>
        </ol>
      ) : (
        <p className="max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
          Traindex needs a live camera to catch signs. Open it on a phone, or connect a camera and reload.
        </p>
      )}
      <button
        type="button"
        onClick={() => location.reload()}
        className={pillVariants({ variant: "primary", className: "mt-2" })}
      >
        Reload page
      </button>
    </div>
  );
}
