import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Camera, ChevronLeft, ImageOff, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { captureUrl, catalogQuery, collectionQuery, dexNo, sightingsQuery } from "@/lib/dex";
import { useSession } from "@/hooks/use-session";
import { RollSign } from "@/components/dex/RollSign";
import { RarityBadge } from "@/components/dex/RarityBadge";
import { MatchScore } from "@/components/dex/MatchScore";
import { Segmented } from "@/components/layout/Segmented";
import { EmptyState } from "@/components/layout/EmptyState";
import { PillButton, pillVariants } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dex/$number")({
  head: ({ params }) => ({
    meta: [
      { title: `Dex #${params.number} — Traindex` },
      { name: "description", content: "Rollsign details, your sightings, and the reference sign." },
      { property: "og:title", content: `Dex #${params.number} — Traindex` },
      { property: "og:description", content: "Rollsign details, your sightings, and the reference sign." },
    ],
  }),
  component: Entry,
});

const VIEWS = ["Side by side", "Yours", "Reference"] as const;

function BackLink() {
  return (
    <Link
      to="/dex"
      className="tap -ml-3 inline-flex items-center gap-0.5 rounded-full pr-3 text-[15px] font-semibold text-link transition-colors hover:bg-surface"
    >
      <ChevronLeft className="size-5" aria-hidden /> Dex
    </Link>
  );
}

function Entry() {
  const { number } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: catalog } = useQuery(catalogQuery);
  const sign = catalog?.find((s) => s.dex_number === Number(number));
  const { data: owned = [] } = useQuery(collectionQuery(user?.id));
  const sightingsQ = useQuery(sightingsQuery(user?.id, sign?.id));
  const sightings = sightingsQ.data ?? [];
  const entry = owned.find((o) => o.rollsign_id === sign?.id);
  const bestPath = sightings.find((s) => s.id === entry?.best_capture_id)?.storage_path ?? sightings[0]?.storage_path;
  const bestQ = useQuery({
    queryKey: ["capture-url", bestPath],
    enabled: !!bestPath,
    queryFn: () => captureUrl(bestPath!),
    staleTime: 30 * 60_000,
  });
  const [view, setView] = useState<(typeof VIEWS)[number]>("Side by side");

  if (!catalog) return <EntrySkeleton />;
  if (!sign) {
    return (
      <div className="px-4 safe-top">
        <BackLink />
        <EmptyState
          page
          icon={SearchX}
          title={`There's no sign ${dexNo(Number(number) || 0)}`}
          body="Pick a sign from your Dex instead."
          action={
            <Link to="/dex" className={pillVariants({ variant: "primary" })}>
              Open Dex
            </Link>
          }
        />
      </div>
    );
  }

  const caught = !!entry;
  const bestUrl = bestQ.data;

  const yours = bestUrl ? (
    <img src={bestUrl} alt="Your best photo of this sign" className="aspect-[4/3] w-full rounded-2xl border object-cover" />
  ) : caught && (sightingsQ.isLoading || bestQ.isLoading) ? (
    <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
  ) : (
    <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl border border-dashed p-3 text-center text-[13px] text-muted-foreground">
      <span className="flex flex-col items-center gap-1.5">
        <ImageOff className="size-5" aria-hidden />
        {caught ? "Photo unavailable" : "Not caught yet"}
      </span>
    </div>
  );

  const reference = (
    <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl border bg-surface p-3">
      <RollSign
        line={sign.line}
        destination={sign.destination}
        subtitle={view === "Side by side" ? null : sign.subtitle}
        size={view === "Side by side" ? "sm" : "lg"}
      />
    </div>
  );

  return (
    <div className="space-y-5 px-4 safe-top">
      <BackLink />

      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">{dexNo(sign.dex_number)}</span>
          <RarityBadge rarity={sign.rarity} />
        </div>
        <h1 className={cn("display-wide text-[30px] leading-tight", !caught && "text-muted-foreground")}>
          {caught ? sign.destination : "Not caught yet"}
        </h1>
        {sign.car_models.length > 0 && (
          <p className="text-sm text-muted-foreground">Runs on {sign.car_models.join(", ")}</p>
        )}
      </header>

      <Segmented label="Photo view" options={VIEWS} value={view} onChange={setView} />

      {view === "Side by side" ? (
        <div className="grid grid-cols-2 gap-2">
          {yours}
          {reference}
        </div>
      ) : view === "Yours" ? (
        yours
      ) : (
        reference
      )}

      {entry?.best_score != null && (
        <div className="rounded-2xl border bg-surface p-4">
          <MatchScore score={entry.best_score} label="Best match" />
        </div>
      )}

      <section aria-labelledby="sightings-title" className="space-y-2">
        <h2 id="sightings-title" className="caption">
          Your sightings
        </h2>
        {!user ? (
          <p className="text-sm text-muted-foreground">
            <Link to="/login" search={{ redirect: `/dex/${number}` }} className="font-semibold text-link hover:underline">
              Sign in
            </Link>{" "}
            to see your sightings.
          </p>
        ) : sightingsQ.isLoading ? (
          <div className="space-y-px overflow-hidden rounded-2xl border bg-surface">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        ) : sightings.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
            No sightings yet. Catch this sign to log the first one.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-surface">
            {sightings.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">{s.station ?? "Unknown station"}</div>
                  <time dateTime={s.created_at} className="text-xs tabular-nums text-muted-foreground">
                    {format(new Date(s.created_at), "MMM d, yyyy, h:mm a")}
                  </time>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {s.match_score != null ? `${s.match_score}%` : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sign.description && (
        <section aria-labelledby="about-title" className="space-y-2">
          <h2 id="about-title" className="caption">
            About this sign
          </h2>
          <p className="max-w-[60ch] text-[15px] leading-relaxed">{sign.description}</p>
        </section>
      )}

      <div className="pb-4">
        <PillButton block onClick={() => navigate({ to: "/scan", search: { target: sign.id } })}>
          <Camera className="size-4" aria-hidden /> {caught ? "Catch it again" : "Catch this sign"}
        </PillButton>
      </div>
    </div>
  );
}

function EntrySkeleton() {
  return (
    <div className="space-y-5 px-4 safe-top" role="status" aria-label="Loading sign">
      <Skeleton className="h-6 w-16" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-11 w-full rounded-[14px]" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      </div>
    </div>
  );
}
