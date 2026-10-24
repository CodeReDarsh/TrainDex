import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCapture, setCapture } from "@/lib/capture-store";
import { catalogQuery, collectionQuery, dexNo, saveCatch } from "@/lib/dex";
import { useSession } from "@/hooks/use-session";
import { CardReveal } from "@/components/dex/CardReveal";
import { TradingCard } from "@/components/dex/TradingCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { PillButton, pillVariants } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/catch")({
  head: () => ({
    meta: [
      { title: "New card — Traindex" },
      { name: "description", content: "Reveal the card for the rollsign you caught." },
      { property: "og:title", content: "New card — Traindex" },
      { property: "og:description", content: "Reveal the card for the rollsign you caught." },
    ],
  }),
  component: Catch,
});

function Catch() {
  const capture = useCapture();
  const { user, ready } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: catalog, isPending: catalogPending } = useQuery(catalogQuery);
  const { data: owned } = useQuery(collectionQuery(user?.id));
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const result = capture?.match;
  const sign = result ? catalog?.find((s) => s.id === result.rollsign_id) : undefined;

  if (!capture || !result) {
    return (
      <EmptyState
        page
        icon={Camera}
        title="Nothing to reveal yet"
        body="Catch a rollsign with the camera and its card appears here."
        action={
          <Link to="/scan" className={pillVariants({ variant: "primary" })}>
            <Camera className="size-4" aria-hidden /> Open camera
          </Link>
        }
      />
    );
  }

  if (!sign) {
    if (catalogPending) return <CatchSkeleton />;
    return (
      <EmptyState
        page
        title="This sign isn't in the catalog"
        body="Retake the photo to match it again."
        action={
          <Link to="/scan" className={pillVariants({ variant: "primary" })}>
            Retake photo
          </Link>
        }
      />
    );
  }

  const already = !!owned?.some((o) => o.rollsign_id === sign.id);

  const save = async () => {
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/catch" } });
      return;
    }
    setSaving(true);
    try {
      const r = await saveCatch(capture.dataUrl, result);
      await qc.invalidateQueries();
      toast.success(r.alreadyOwned ? "New sighting saved" : `${sign.destination} added to your Dex`);
      setCapture(null);
      navigate({ to: "/dex/$number", params: { number: String(sign.dex_number) } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save your catch. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    const text = `I caught ${dexNo(sign.dex_number)} ${sign.destination} (${result.score}% match) on Traindex`;
    try {
      const file = new File([await (await fetch(capture.dataUrl)).blob()], "catch.jpg", { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ text, files: [file] });
      else if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    } catch {
      /* Share sheet dismissed. */
    }
  };

  const onReveal = () => {
    setRevealed(true);
    // Move focus to the next action once the flip has settled.
    window.setTimeout(() => primaryRef.current?.focus({ preventScroll: true }), 750);
  };

  return (
    <div className="space-y-6 px-4 safe-top">
      <header className="space-y-1 text-center">
        <h1 className="display-wide text-2xl">{revealed ? (already ? "Another sighting" : "New card") : "You caught a sign"}</h1>
        <p className="text-sm text-muted-foreground">
          {revealed
            ? already
              ? "You already have this one. Saving adds it as a sighting."
              : "This one isn't in your Dex yet."
            : "Your card is ready."}
        </p>
      </header>

      <CardReveal rarity={sign.rarity} onReveal={onReveal}>
        <TradingCard
          sign={sign}
          photoUrl={capture.dataUrl}
          station={result.station}
          capturedAt={capture.capturedAt}
          carModel={result.car_model}
          score={result.score}
        />
      </CardReveal>

      <div
        className={cn(
          "space-y-3 pb-4 transition-[opacity,transform] duration-300",
          revealed ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
        aria-hidden={!revealed}
      >
        {ready && !user && (
          <p className="text-center text-sm text-muted-foreground">
            Sign in to keep this card. Your photo waits here until you do.
          </p>
        )}
        <PillButton ref={primaryRef} block onClick={save} busy={saving} tabIndex={revealed ? 0 : -1}>
          {saving ? "Saving" : !user ? "Sign in to keep this card" : already ? "Save sighting" : "Add to Dex"}
        </PillButton>
        <PillButton block variant="secondary" onClick={share} tabIndex={revealed ? 0 : -1}>
          <Share2 className="size-4" aria-hidden /> Share card
        </PillButton>
      </div>
    </div>
  );
}

function CatchSkeleton() {
  return (
    <div className="space-y-6 px-4 safe-top" role="status" aria-label="Loading your card">
      <div className="space-y-2">
        <Skeleton className="mx-auto h-7 w-48" />
        <Skeleton className="mx-auto h-4 w-32" />
      </div>
      <Skeleton className="mx-auto aspect-[5/7] w-full max-w-[330px] rounded-[22px]" />
    </div>
  );
}
