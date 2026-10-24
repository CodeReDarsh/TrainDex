import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Camera, LayoutGrid } from "lucide-react";
import { catalogQuery, collectionQuery, RARITY_RANK } from "@/lib/dex";
import { useSession } from "@/hooks/use-session";
import { DexTile, DexTileSkeleton } from "@/components/dex/DexTile";
import { PageHeader } from "@/components/layout/PageHeader";
import { Segmented } from "@/components/layout/Segmented";
import { EmptyState } from "@/components/layout/EmptyState";
import { pillVariants } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dex/")({
  head: () => ({
    meta: [
      { title: "Your Dex — Traindex" },
      { name: "description", content: "Every NYC subway rollsign you've caught, and the ones still out there." },
      { property: "og:title", content: "Your Dex — Traindex" },
      { property: "og:description", content: "Every NYC subway rollsign you've caught, and the ones still out there." },
    ],
  }),
  component: Dex,
});

const FILTERS = ["All", "Caught", "Missing", "Rare+"] as const;
type Filter = (typeof FILTERS)[number];

const EMPTY_COPY: Record<Filter, { title: string; body: string }> = {
  All: { title: "The catalog is empty", body: "No rollsigns have been added yet." },
  Caught: { title: "Nothing caught yet", body: "Scan the sign on the front of a train to start your Dex." },
  Missing: { title: "You've caught them all", body: "Every rollsign in the catalog is in your Dex." },
  "Rare+": { title: "No rare signs listed", body: "Rare and legendary signs will show up here." },
};

function Dex() {
  const { user } = useSession();
  const catalogQ = useQuery(catalogQuery);
  const { data: owned = [] } = useQuery(collectionQuery(user?.id));
  const [filter, setFilter] = useState<Filter>("All");

  const catalog = catalogQ.data ?? [];
  const ownedIds = new Set<string>(owned.map((o) => o.rollsign_id));
  const newestId = owned[0]?.rollsign_id;
  const pct = catalog.length ? Math.round((ownedIds.size / catalog.length) * 100) : 0;

  const shown = catalog.filter((s) =>
    filter === "Caught"
      ? ownedIds.has(s.id)
      : filter === "Missing"
        ? !ownedIds.has(s.id)
        : filter === "Rare+"
          ? RARITY_RANK[s.rarity] >= 2
          : true,
  );

  return (
    <div className="space-y-5 px-4 safe-top">
      <PageHeader
        title="Dex"
        subtitle={
          catalogQ.isPending ? (
            <Skeleton className="mt-1 h-4 w-28" />
          ) : (
            <span className="tabular-nums">
              {ownedIds.size} of {catalog.length} caught
            </span>
          )
        }
      />

      <div
        role="progressbar"
        aria-label="Dex completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1.5 overflow-hidden rounded-full bg-raised"
      >
        <div className="h-full rounded-full bg-foreground transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>

      <Segmented label="Filter signs" options={FILTERS} value={filter} onChange={setFilter} />

      {catalogQ.isError ? (
        <EmptyState
          icon={LayoutGrid}
          title="Your Dex didn't load"
          body="Check your connection, then try again."
          action={
            <button type="button" onClick={() => catalogQ.refetch()} className={pillVariants({ variant: "secondary" })}>
              Try again
            </button>
          }
        />
      ) : catalogQ.isPending ? (
        <div className="grid grid-cols-3 gap-2.5 pb-4" aria-label="Loading signs" role="status">
          {Array.from({ length: 9 }, (_, i) => (
            <DexTileSkeleton key={i} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={filter === "Caught" ? Camera : LayoutGrid}
          title={EMPTY_COPY[filter].title}
          body={EMPTY_COPY[filter].body}
          action={
            filter === "Caught" ? (
              <Link to="/scan" className={pillVariants({ variant: "primary" })}>
                <Camera className="size-4" aria-hidden /> Scan a sign
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-3 gap-2.5 pb-4">
          {shown.map((s) => (
            <li key={s.id}>
              <DexTile sign={s} caught={ownedIds.has(s.id)} newest={s.id === newestId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
