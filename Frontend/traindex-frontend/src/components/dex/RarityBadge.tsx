import { cn } from "@/lib/utils";
import type { Rarity } from "@/lib/dex";

export const RARITY_TEXT: Record<Rarity, string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  legendary: "text-rarity-legendary",
};
export const RARITY_BG: Record<Rarity, string> = {
  common: "bg-rarity-common",
  uncommon: "bg-rarity-uncommon",
  rare: "bg-rarity-rare",
  legendary: "bg-rarity-legendary",
};
export const RARITY_BORDER: Record<Rarity, string> = {
  common: "border-rarity-common",
  uncommon: "border-rarity-uncommon",
  rare: "border-rarity-rare",
  legendary: "border-rarity-legendary",
};
export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-current/30 px-2.5 py-0.5 text-xs font-semibold",
        RARITY_TEXT[rarity],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", RARITY_BG[rarity])} />
      {RARITY_LABEL[rarity]}
    </span>
  );
}
