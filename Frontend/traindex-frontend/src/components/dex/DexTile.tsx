import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { dexNo, type Sign } from "@/lib/dex";
import { Skeleton } from "@/components/ui/skeleton";
import { RollSign } from "./RollSign";
import { RARITY_BG, RARITY_LABEL } from "./RarityBadge";

export function DexTile({ sign, caught, newest }: { sign: Sign; caught: boolean; newest?: boolean }) {
  return (
    <Link
      to="/dex/$number"
      params={{ number: String(sign.dex_number) }}
      aria-label={`${dexNo(sign.dex_number)}, ${caught ? sign.destination : "not caught yet"}, ${RARITY_LABEL[sign.rarity]}`}
      className={cn(
        "group relative flex aspect-[4/5] flex-col justify-between gap-2 overflow-hidden rounded-2xl border p-2.5",
        "transition-[border-color,background-color,transform] duration-150 ease-out active:scale-[0.97]",
        caught
          ? "bg-surface hover:border-muted-foreground/40 hover:bg-raised"
          : "border-dashed bg-transparent hover:border-muted-foreground/40",
        newest && "border-foreground/80",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{dexNo(sign.dex_number)}</span>
          {newest && (
            <span className="rounded-full bg-foreground px-1.5 text-[10px] leading-4 font-bold text-background">New</span>
          )}
        </span>
        <span className={cn("size-2 rounded-full", RARITY_BG[sign.rarity], !caught && "opacity-40")} />
      </div>

      {caught ? (
        <RollSign line={sign.line} destination={sign.destination} size="sm" />
      ) : (
        <div className="rounded-md border-2 border-dashed border-border px-1.5 py-1.5">
          <div className="h-2 w-3/4 rounded-full bg-raised" />
        </div>
      )}

      <span className={cn("truncate text-xs font-semibold", !caught && "text-muted-foreground/70")}>
        {caught ? sign.destination : "Not caught"}
      </span>
    </Link>
  );
}

export function DexTileSkeleton() {
  return (
    <div className="flex aspect-[4/5] flex-col justify-between rounded-2xl border bg-surface p-2.5">
      <Skeleton className="h-3 w-8" />
      <Skeleton className="h-7 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}
