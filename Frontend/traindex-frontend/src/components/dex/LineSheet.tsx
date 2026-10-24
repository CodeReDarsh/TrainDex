import { Link } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { dexNo, type Sign } from "@/lib/dex";
import { carModelsFor, type LineGroup } from "@/lib/lines";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { pillVariants } from "@/components/ui/pill-button";
import { LineBullet } from "./LineBullet";
import { RollSign } from "./RollSign";
import { RARITY_BG, RARITY_LABEL } from "./RarityBadge";

interface Props {
  open: boolean;
  /** Kept set while the sheet animates closed, so its content doesn't vanish mid-slide. */
  group: LineGroup | null;
  signs: Sign[];
  ownedIds: Set<string>;
  spottedModels: Set<string>;
  signedIn: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Bottom sheet for one line group: its rollsigns and the car models that run on it. */
export function LineSheet({ open, group, signs, ownedIds, spottedModels, signedIn, onOpenChange }: Props) {
  const models = carModelsFor(signs);
  const caught = signs.filter((s) => ownedIds.has(s.id)).length;
  const spotted = models.filter((m) => spottedModels.has(m)).length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto max-h-[88dvh] max-w-[480px] rounded-t-[28px] border-x-0 border-b-0 bg-surface">
        {group && (
          <div className="overflow-y-auto px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <header className="space-y-2">
              <div className="flex items-center gap-1.5">
                {group.lines.map((l) => (
                  <LineBullet key={l.letter} letter={l.letter} color={l.color} size="lg" />
                ))}
              </div>
              <DrawerTitle className="display-wide text-2xl">{group.name}</DrawerTitle>
              <DrawerDescription className="text-sm text-muted-foreground">
                {caught} of {signs.length} signs caught
              </DrawerDescription>
            </header>

            <section aria-labelledby="sheet-signs" className="mt-6 space-y-2">
              <h3 id="sheet-signs" className="caption">
                Rollsigns
              </h3>
              <ul className="divide-y overflow-hidden rounded-2xl border bg-background/40">
                {signs.map((s) => {
                  const have = ownedIds.has(s.id);
                  return (
                    <li key={s.id}>
                      <Link
                        to="/dex/$number"
                        params={{ number: String(s.dex_number) }}
                        onClick={() => onOpenChange(false)}
                        className="flex min-h-[52px] items-center gap-3 px-3 py-2 transition-colors duration-150 hover:bg-raised/60"
                      >
                        <span className="w-10 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                          {dexNo(s.dex_number)}
                        </span>
                        <span className="min-w-0 flex-1">
                          {have ? (
                            <RollSign line={s.line} destination={s.destination} size="sm" className="max-w-[220px]" />
                          ) : (
                            <span className="text-sm text-muted-foreground">Not caught yet</span>
                          )}
                        </span>
                        <span
                          className={cn("size-2 shrink-0 rounded-full", RARITY_BG[s.rarity], !have && "opacity-40")}
                          title={RARITY_LABEL[s.rarity]}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="sheet-models" className="mt-6 space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 id="sheet-models" className="caption">
                  Train models
                </h3>
                {models.length > 0 && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {spotted} of {models.length} spotted
                  </span>
                )}
              </div>
              {models.length === 0 ? (
                <p className="text-sm text-muted-foreground">No car models are listed for these lines yet.</p>
              ) : (
                <ul className="grid grid-cols-3 gap-3">
                  {models.map((m) => {
                    const seen = spottedModels.has(m);
                    return (
                      <li
                        key={m}
                        aria-label={`${m}, ${seen ? "spotted" : "not spotted yet"}`}
                        className={cn(
                          "grid aspect-square place-items-center rounded-full border-2 text-center transition-colors",
                          seen
                            ? "border-foreground bg-raised text-foreground"
                            : "border-dashed border-border text-muted-foreground/60",
                        )}
                      >
                        <span className="sign-type text-lg">{m}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!signedIn && models.length > 0 && (
                <p className="text-xs text-muted-foreground">Sign in to keep track of the cars you spot.</p>
              )}
            </section>

            <Link
              to="/scan"
              onClick={() => onOpenChange(false)}
              className={cn(pillVariants({ variant: "primary", block: true }), "mt-7")}
            >
              <Camera className="size-4" aria-hidden /> Scan a sign
            </Link>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
