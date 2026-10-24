import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, ChevronLeft, Minus, ScanText, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCapture, updateCapture, setCapture } from "@/lib/capture-store";
import { matchRollsign } from "@/lib/match.functions";
import { catalogQuery, collectionQuery, dexNo, type Sign } from "@/lib/dex";
import type { CheckStatus, MatchResult } from "@/lib/match-mock";
import { useSession } from "@/hooks/use-session";
import { RollSign } from "@/components/dex/RollSign";
import { MatchScore } from "@/components/dex/MatchScore";
import { RarityBadge } from "@/components/dex/RarityBadge";
import { EmptyState } from "@/components/layout/EmptyState";
import { PillButton, pillVariants } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Check your photo — Traindex" },
      { name: "description", content: "See how your photo was read and which rollsign it matched." },
      { property: "og:title", content: "Check your photo — Traindex" },
      { property: "og:description", content: "See how your photo was read and which rollsign it matched." },
    ],
  }),
  component: Compare,
});

function Compare() {
  const capture = useCapture();
  const navigate = useNavigate();
  const match = useServerFn(matchRollsign);
  const { user } = useSession();
  const { data: catalog } = useQuery(catalogQuery);
  const { data: owned } = useQuery(collectionQuery(user?.id));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // each photo costs a Gemini call; StrictMode runs effects twice in dev
  const sent = useRef<string | null>(null);

  useEffect(() => {
    // A capture saved by an older build has a match without `method`; match it again.
    if (!capture || capture.match?.method) return;
    const key = `${attempt}:${capture.capturedAt ?? capture.dataUrl.length}`;
    if (sent.current === key) return;
    sent.current = key;
    setError(null);
    match({ data: { image: capture.dataUrl, targetId: capture.targetId } })
      .then((m) => updateCapture({ match: m }))
      .catch((e) => setError(e instanceof Error ? e.message : "Matching failed"));
  }, [capture, match, attempt]);

  if (!capture) {
    return (
      <EmptyState
        page
        icon={Camera}
        title="No photo to check"
        body="Take a photo of a rollsign and it will show up here."
        action={
          <Link to="/scan" className={pillVariants({ variant: "primary" })}>
            <Camera className="size-4" aria-hidden /> Open camera
          </Link>
        }
      />
    );
  }

  const result = capture.match;
  const sign = result ? (catalog?.find((s) => s.id === result.rollsign_id) ?? result.sign) : undefined;
  const missing = !!result && !!catalog && !sign;
  const alreadyOwned = !!sign && !!owned?.some((o) => o.rollsign_id === sign.id);

  const retake = () => {
    setCapture(null);
    navigate({ to: "/scan", search: { target: capture.targetId } });
  };

  return (
    <div className="space-y-5 px-4 safe-top">
      <header className="flex items-center gap-2">
        <button type="button" onClick={retake} aria-label="Retake photo" className="tap -ml-3 grid place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-foreground">
          <ChevronLeft className="size-6" />
        </button>
        <h1 className="display-wide text-2xl">Check your photo</h1>
      </header>

      <figure className="relative overflow-hidden rounded-2xl border bg-surface">
        <img src={capture.dataUrl} alt="Your photo" className="aspect-[4/3] w-full object-cover" />
        <figcaption className="absolute bottom-2 left-2 rounded-full bg-scrim px-3 py-1 text-xs font-semibold backdrop-blur-md">
          Your photo
        </figcaption>
      </figure>

      <section aria-labelledby="reference-title" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 id="reference-title" className="caption">
            {sign ? `Matched ${dexNo(sign.dex_number)}` : "Reference sign"}
          </h2>
          {sign && <RarityBadge rarity={sign.rarity} />}
        </div>
        <div className="grid min-h-[120px] place-items-center rounded-2xl border bg-surface p-4">
          {sign ? (
            <RollSign line={sign.line} destination={sign.destination} subtitle={sign.subtitle} size="lg" />
          ) : missing ? (
            <p className="text-center text-sm text-muted-foreground">
              The matched sign isn't in the catalog any more. Retake the photo to try again.
            </p>
          ) : error ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <PillButton variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </PillButton>
            </div>
          ) : (
            <div className="w-full space-y-2" role="status" aria-label="Reading the sign">
              <Skeleton className="h-16 w-full rounded-xl" />
              <p className="text-center text-sm text-muted-foreground">Reading the sign…</p>
            </div>
          )}
        </div>
        {sign && (
          <p className={cn("text-sm", alreadyOwned ? "text-muted-foreground" : "font-semibold text-success")}>
            {alreadyOwned ? "Already in your Dex. Saving it adds a new sighting." : "New to your Dex"}
          </p>
        )}
      </section>

      {result && sign && <HowItWasRead result={result} sign={sign} />}

      {result && (
        <section aria-labelledby="checks-title" className="space-y-4 rounded-2xl border bg-surface p-4">
          <h2 id="checks-title" className="sr-only">
            Photo checks
          </h2>
          <MatchScore score={result.score} />
          <ul className="space-y-3">
            {result.checks.map((c) => (
              <li key={c.key} className="flex items-start gap-3">
                <StatusIcon status={c.status} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{c.label}</div>
                  <div className="text-[13px] text-muted-foreground">{c.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 flex gap-3 bg-linear-to-t from-background via-background to-transparent px-4 pt-6 pb-4">
        <PillButton variant="secondary" className="flex-1" onClick={retake}>
          Retake
        </PillButton>
        <PillButton className="flex-1" disabled={!sign} onClick={() => navigate({ to: "/catch" })}>
          That's the one
        </PillButton>
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<CheckStatus, { icon: typeof Check; className: string; label: string }> = {
  pass: { icon: Check, className: "bg-success/15 text-success", label: "Passed" },
  warn: { icon: AlertTriangle, className: "bg-warning/15 text-warning", label: "Warning" },
  fail: { icon: X, className: "bg-destructive/15 text-destructive", label: "Failed" },
};

function StatusIcon({ status }: { status: CheckStatus }) {
  const { icon: Icon, className, label } = STATUS_STYLE[status];
  return (
    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", className)}>
      <Icon className="size-3.5" aria-label={label} />
    </span>
  );
}

/**
 * The identification pipeline, in the order it runs: OCR first, Gemini only
 * when OCR can't settle it, then the match against reference signs.
 */
function HowItWasRead({ result, sign }: { result: MatchResult; sign: Sign }) {
  const usedGemini = result.method === "gemini";
  const steps: { icon: typeof Check; title: string; detail: string; state: "done" | "warn" | "skipped" }[] = [
    {
      icon: ScanText,
      title: "Read the sign text",
      detail: result.ocr_text
        ? usedGemini
          ? `Partial read: “${result.ocr_text}”`
          : `Read “${result.ocr_text}”`
        : "No readable text in the photo",
      state: usedGemini ? "warn" : "done",
    },
    {
      icon: Sparkles,
      title: "Ask Gemini",
      detail: usedGemini ? `Identified the sign as “${sign.destination}”` : "Not needed, the text was clear",
      state: usedGemini ? "done" : "skipped",
    },
    {
      icon: Check,
      title: "Match a reference sign",
      detail: `${dexNo(sign.dex_number)} ${sign.destination}`,
      state: "done",
    },
  ];

  return (
    <section aria-labelledby="pipeline-title" className="space-y-3 rounded-2xl border bg-surface p-4">
      <h2 id="pipeline-title" className="caption">
        How we identified it
      </h2>
      <ol className="relative space-y-4">
        {steps.map((step, i) => {
          const Icon = step.state === "skipped" ? Minus : step.icon;
          return (
            <li key={step.title} className="relative flex items-start gap-3">
              {i < steps.length - 1 && (
                <span aria-hidden className="absolute top-7 left-[13px] h-[calc(100%-4px)] w-0.5 bg-border" />
              )}
              <span
                className={cn(
                  "relative grid size-7 shrink-0 place-items-center rounded-full border",
                  step.state === "done" && "border-foreground/30 bg-raised text-foreground",
                  step.state === "warn" && "border-warning/40 bg-warning/10 text-warning",
                  step.state === "skipped" && "border-dashed text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0 pt-0.5">
                <div className={cn("text-sm font-semibold", step.state === "skipped" && "text-muted-foreground")}>
                  {step.title}
                </div>
                <div className="truncate text-[13px] text-muted-foreground">{step.detail}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
