import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { catalogQuery, collectionQuery, RARITY_RANK, type Rarity } from "@/lib/dex";
import { RARITY_BG, RARITY_LABEL } from "@/components/dex/RarityBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { PillButton, pillVariants } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Traindex" },
      { name: "description", content: "Your Traindex stats and account." },
      { property: "og:title", content: "Profile — Traindex" },
      { property: "og:description", content: "Your Traindex stats and account." },
    ],
  }),
  component: Profile,
});

const RARITIES: Rarity[] = ["legendary", "rare", "uncommon", "common"];

function Profile() {
  const { user, ready } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const catalogQ = useQuery(catalogQuery);
  const { data: owned = [] } = useQuery(collectionQuery(user?.id));
  const [signingOut, setSigningOut] = useState(false);

  if (!ready) return <ProfileSkeleton />;
  if (!user) {
    return (
      <EmptyState
        page
        icon={UserRound}
        title="Sign in to keep your cards"
        body="Your catches, sightings, and Dex progress are saved to your account."
        action={
          <Link to="/login" search={{ redirect: "/profile" }} className={pillVariants({ variant: "primary" })}>
            Sign in
          </Link>
        }
      />
    );
  }

  const catalog = catalogQ.data ?? [];
  const ids = new Set<string>(owned.map((o) => o.rollsign_id));
  const rarePlus = catalog.filter((s) => ids.has(s.id) && RARITY_RANK[s.rarity] >= 2).length;
  const best = Math.max(0, ...owned.map((o) => o.best_score ?? 0));

  const byRarity = RARITIES.map((r) => {
    const all = catalog.filter((s) => s.rarity === r);
    return { rarity: r, total: all.length, caught: all.filter((s) => ids.has(s.id)).length };
  }).filter((r) => r.total > 0);

  const signOut = async () => {
    setSigningOut(true);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="space-y-6 px-4 safe-top">
      <PageHeader title="Profile" subtitle={<span className="break-all">{user.email}</span>} />

      <dl className="grid grid-cols-3 gap-2">
        {[
          ["Caught", catalogQ.isPending ? null : `${ids.size}/${catalog.length}`],
          ["Rare or better", catalogQ.isPending ? null : String(rarePlus)],
          ["Best match", best ? `${best}%` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border bg-surface p-3.5">
            <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-xl font-extrabold tabular-nums">{v ?? <Skeleton className="h-6 w-12" />}</dd>
          </div>
        ))}
      </dl>

      {byRarity.length > 0 && (
        <section aria-labelledby="rarity-title" className="space-y-3 rounded-2xl border bg-surface p-4">
          <h2 id="rarity-title" className="caption">
            By rarity
          </h2>
          <ul className="space-y-3">
            {byRarity.map(({ rarity, total, caught }) => (
              <li key={rarity} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className={cn("size-2 rounded-full", RARITY_BG[rarity])} />
                    {RARITY_LABEL[rarity]}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {caught} of {total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-raised">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-700 ease-out", RARITY_BG[rarity])}
                    style={{ width: `${Math.round((caught / total) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PillButton block variant="secondary" onClick={signOut} busy={signingOut}>
        Sign out
      </PillButton>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 px-4 safe-top" role="status" aria-label="Loading profile">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
