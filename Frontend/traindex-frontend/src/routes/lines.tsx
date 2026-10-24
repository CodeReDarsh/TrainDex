import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Camera, ChevronRight, Clock, TrainTrack } from "lucide-react";
import { cn } from "@/lib/utils";
import { catalogQuery, collectionQuery, dexNo, spottedModelsQuery, type Sign } from "@/lib/dex";
import { LINE_GROUPS, normalize, signsInGroup, specialSigns, type LineGroup } from "@/lib/lines";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/layout/PageHeader";
import { Segmented } from "@/components/layout/Segmented";
import { EmptyState } from "@/components/layout/EmptyState";
import { pillVariants } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { LineRow, LineRowSkeleton } from "@/components/dex/LineRow";
import { LineSheet } from "@/components/dex/LineSheet";
import { RollSign } from "@/components/dex/RollSign";
import { RARITY_BG } from "@/components/dex/RarityBadge";

export const Route = createFileRoute("/lines")({
  head: () => ({
    meta: [
      { title: "Lines — Traindex" },
      { name: "description", content: "Every NYC subway line, and how many of its rollsigns you've caught." },
      { property: "og:title", content: "Lines — Traindex" },
      { property: "og:description", content: "Every NYC subway line, and how many of its rollsigns you've caught." },
    ],
  }),
  component: Dashboard,
});

const TABS = ["Lines", "Recent"] as const;
type Tab = (typeof TABS)[number];

const NO_MODELS = new Set<string>();

/** Pseudo-group for signs with no route: Not In Service, test patterns, malfunctions. */
const SPECIAL: LineGroup = { id: "special", name: "Special signs", lines: [] };

function Dashboard() {
  const { user, ready } = useSession();
  const catalogQ = useQuery(catalogQuery);
  const { data: owned = [] } = useQuery(collectionQuery(user?.id));
  const { data: spotted } = useQuery(spottedModelsQuery(user?.id));
  const [tab, setTab] = useState<Tab>("Lines");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetGroup, setSheetGroup] = useState<LineGroup | null>(null);

  const catalog = catalogQ.data ?? [];
  const ownedIds = useMemo(() => new Set<string>(owned.map((o) => o.rollsign_id)), [owned]);

  const caughtLetters = useMemo(() => {
    const set = new Set<string>();
    for (const s of catalog) if (ownedIds.has(s.id) && s.line) set.add(normalize(s.line.letter));
    return set;
  }, [catalog, ownedIds]);

  const specials = specialSigns(catalog);
  const sheetSigns = sheetGroup ? (sheetGroup.id === SPECIAL.id ? specials : signsInGroup(catalog, sheetGroup)) : [];

  const openGroup = (g: LineGroup) => {
    setSheetGroup(g);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-5 px-4 safe-top">
      <PageHeader
        title="Lines"
        subtitle={
          catalogQ.isPending ? (
            <Skeleton className="mt-1 h-4 w-40" />
          ) : (
            <span className="tabular-nums">
              {ownedIds.size} of {catalog.length} rollsigns caught
            </span>
          )
        }
        action={
          <Link
            to="/scan"
            className="tap inline-flex items-center gap-2 rounded-full bg-foreground px-4 text-[15px] font-semibold text-background transition-[background-color,transform] duration-150 hover:bg-white active:scale-95"
          >
            <Camera className="size-[18px]" aria-hidden />
            Scan
          </Link>
        }
      />

      <Segmented label="Dashboard view" options={TABS} value={tab} onChange={setTab} />

      {tab === "Lines" ? (
        <section aria-label="Subway lines">
          {catalogQ.isError ? (
            <EmptyState
              icon={TrainTrack}
              title="Lines didn't load"
              body="Check your connection, then try again."
              action={
                <button type="button" onClick={() => catalogQ.refetch()} className={pillVariants({ variant: "secondary" })}>
                  Try again
                </button>
              }
            />
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-surface">
              {catalogQ.isPending
                ? LINE_GROUPS.map((g) => <LineRowSkeleton key={g.id} bullets={Math.min(g.lines.length, 4)} />)
                : LINE_GROUPS.map((g) => {
                    const signs = signsInGroup(catalog, g);
                    return (
                      <LineRow
                        key={g.id}
                        group={g}
                        total={signs.length}
                        caught={signs.filter((s) => ownedIds.has(s.id)).length}
                        caughtLetters={caughtLetters}
                        onOpen={() => openGroup(g)}
                      />
                    );
                  })}
              {!catalogQ.isPending && specials.length > 0 && (
                <SpecialRow
                  total={specials.length}
                  caught={specials.filter((s) => ownedIds.has(s.id)).length}
                  onOpen={() => openGroup(SPECIAL)}
                />
              )}
            </ul>
          )}
          {ready && !user && !catalogQ.isPending && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link to="/login" search={{ redirect: "/lines" }} className="font-semibold text-link hover:underline">
                Sign in
              </Link>{" "}
              to save what you catch.
            </p>
          )}
        </section>
      ) : (
        <Recent
          ready={ready}
          signedIn={!!user}
          loading={catalogQ.isPending}
          catalog={catalog}
          owned={owned}
        />
      )}

      <LineSheet
        open={sheetOpen}
        group={sheetGroup}
        signs={sheetSigns}
        ownedIds={ownedIds}
        spottedModels={spotted ?? NO_MODELS}
        signedIn={!!user}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

function SpecialRow({ total, caught, onOpen }: { total: number; caught: number; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex min-h-[54px] w-full items-center gap-3 px-4 text-left transition-colors duration-150 hover:bg-raised/60 active:bg-raised focus-visible:-outline-offset-2"
      >
        <span className="rounded-md border-2 border-sign-frame bg-sign px-2 py-0.5">
          <span className="sign-type text-[12px] text-sign-text">Not in service</span>
        </span>
        <span className={cn("ml-auto text-[15px] tabular-nums", caught ? "text-foreground" : "text-muted-foreground")}>
          {caught} of {total} caught
        </span>
        <ChevronRight
          aria-hidden
          className="size-5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </button>
    </li>
  );
}

interface RecentProps {
  ready: boolean;
  signedIn: boolean;
  loading: boolean;
  catalog: Sign[];
  owned: { rollsign_id: string; first_caught_at: string }[];
}

function Recent({ ready, signedIn, loading, catalog, owned }: RecentProps) {
  if (!ready || loading) {
    return (
      <ul className="space-y-2" aria-label="Loading recent catches">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl border bg-surface p-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="ml-auto h-3 w-14" />
          </li>
        ))}
      </ul>
    );
  }

  if (!signedIn) {
    return (
      <EmptyState
        icon={Clock}
        title="Your catches show up here"
        body="Sign in to keep every rollsign you photograph."
        action={
          <Link to="/login" search={{ redirect: "/lines" }} className={pillVariants({ variant: "primary" })}>
            Sign in
          </Link>
        }
      />
    );
  }

  const bySign = new Map(catalog.map((s) => [s.id, s]));
  const rows = owned.flatMap((o) => {
    const sign = bySign.get(o.rollsign_id);
    return sign ? [{ sign, at: o.first_caught_at }] : [];
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        title="No catches yet"
        body="Point your camera at the sign on the front of a train to catch your first one."
        action={
          <Link to="/scan" className={pillVariants({ variant: "primary" })}>
            <Camera className="size-4" aria-hidden /> Scan a sign
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-surface" aria-label="Recent catches">
      {rows.slice(0, 20).map(({ sign, at }) => (
        <li key={sign.id}>
          <Link
            to="/dex/$number"
            params={{ number: String(sign.dex_number) }}
            className="flex min-h-[60px] items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-raised/60 focus-visible:-outline-offset-2"
          >
            <div className="w-[170px] shrink-0">
              <RollSign line={sign.line} destination={sign.destination} size="sm" />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center justify-end gap-1.5 text-xs font-semibold tabular-nums text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", RARITY_BG[sign.rarity])} />
                {dexNo(sign.dex_number)}
              </div>
              <time dateTime={at} className="text-[13px] tabular-nums">
                {format(new Date(at), "MMM d")}
              </time>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
