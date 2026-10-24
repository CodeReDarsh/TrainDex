import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/lib/dex";
import { RARITY_BG } from "./RarityBadge";
import { CardBack } from "./TradingCard";

interface Props {
  rarity: Rarity;
  /** The card face; rendered underneath and turned over on reveal. */
  children: ReactNode;
  onReveal?: () => void;
  className?: string;
}

const BURST: Record<Rarity, string> = {
  common: "opacity-40",
  uncommon: "opacity-60",
  rare: "opacity-80",
  legendary: "opacity-100",
};

/**
 * Face-down card that flips when tapped, with a flash in the rarity colour.
 * With reduced motion the flip becomes a crossfade.
 */
export function CardReveal({ rarity, children, onReveal, className }: Props) {
  const [revealed, setRevealed] = useState(false);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    onReveal?.();
  };

  return (
    <div className={cn("card-stage relative mx-auto w-full max-w-[330px]", className)}>
      {revealed && (
        <span
          aria-hidden
          className={cn(
            "animate-reveal-burst pointer-events-none absolute -inset-10 rounded-full blur-3xl",
            RARITY_BG[rarity],
            BURST[rarity],
          )}
        />
      )}

      <div className="card-flipper group/card" data-revealed={revealed}>
        <div className="card-face card-face-front" aria-hidden={!revealed}>
          {children}
        </div>
        <button
          type="button"
          onClick={reveal}
          disabled={revealed}
          aria-label="Reveal your card"
          className="card-face card-face-back group block rounded-[22px] text-left transition-transform duration-150 enabled:hover:-translate-y-1 enabled:active:scale-[0.98] disabled:pointer-events-none"
        >
          <CardBack />
        </button>
      </div>

      <p
        aria-live="polite"
        className={cn(
          "mt-4 text-center text-sm text-muted-foreground transition-opacity duration-200",
          revealed && "opacity-0",
        )}
      >
        {revealed ? "Card revealed" : "Tap the card to reveal it"}
      </p>
    </div>
  );
}
