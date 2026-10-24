import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { dexNo, type Sign } from "@/lib/dex";
import { LINE_GROUPS } from "@/lib/lines";
import { LineBullet } from "./LineBullet";
import { RollSign } from "./RollSign";
import { RARITY_BORDER, RARITY_TEXT, RARITY_LABEL } from "./RarityBadge";

interface CardProps {
  sign: Sign;
  photoUrl: string;
  station: string;
  capturedAt?: string | undefined;
  carModel: string | null;
  score: number;
  className?: string;
}

/**
 * The collectible: your photo framed under the rollsign it matched, stamped
 * with where and when you caught it. Frame colour follows rarity.
 */
export function TradingCard({ sign, photoUrl, station, capturedAt, carModel, score, className }: CardProps) {
  const when = capturedAt ? new Date(capturedAt) : null;
  const legendary = sign.rarity === "legendary";

  return (
    <article
      aria-label={`${dexNo(sign.dex_number)} ${sign.destination}, ${RARITY_LABEL[sign.rarity]}`}
      className={cn(
        "relative overflow-hidden rounded-[22px] border-2 bg-sign p-3.5 text-sign-text",
        "shadow-[0_24px_48px_-20px_rgb(0_0_0/0.8)]",
        RARITY_BORDER[sign.rarity],
        className,
      )}
    >
      <div className="flex items-center justify-between pb-2.5">
        <span className="text-sm font-bold tabular-nums">{dexNo(sign.dex_number)}</span>
        <span className={cn("text-xs font-bold", RARITY_TEXT[sign.rarity])}>{RARITY_LABEL[sign.rarity]}</span>
      </div>

      <RollSign line={sign.line} destination={sign.destination} subtitle={sign.subtitle} size="md" />

      <img
        src={photoUrl}
        alt={`Your photo of the ${sign.destination} sign`}
        className="mt-2.5 aspect-[16/10] w-full rounded-xl object-cover"
      />

      <h2 className="display-wide mt-3 truncate text-[22px] leading-tight">{sign.destination}</h2>

      <dl className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2.5 border-t border-white/10 pt-3 text-[13px]">
        <div className="col-span-3 min-w-0">
          <dt className="text-[11px] font-semibold text-white/50">Station</dt>
          <dd className="truncate font-semibold">{station}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] font-semibold text-white/50">Caught</dt>
          <dd className="font-semibold tabular-nums">
            {when ? (
              <time dateTime={when.toISOString()}>
                {format(when, "MMM d, yyyy")}
                <span className="block text-white/60">{format(when, "h:mm a")}</span>
              </time>
            ) : (
              "Just now"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold text-white/50">Car</dt>
          <dd className="font-semibold">{carModel ?? "Unknown"}</dd>
        </div>
        <div className="text-right">
          <dt className="text-[11px] font-semibold text-white/50">Match</dt>
          <dd className="font-semibold tabular-nums">{score}%</dd>
        </div>
      </dl>

      {/* Legendary cards catch the light once, just after they're turned over. */}
      {legendary && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-0 bg-linear-to-r from-transparent via-white/20 to-transparent [animation-delay:700ms] group-data-[revealed=true]/card:animate-sheen"
        />
      )}
    </article>
  );
}

/** The face-down side: every line's bullet, dimmed, around the wordmark. */
export function CardBack({ className }: { className?: string }) {
  const bullets = LINE_GROUPS.flatMap((g) => g.lines).filter((l) => l.letter.length === 1);
  return (
    <div
      className={cn(
        "relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[22px] border-2 border-sign-frame bg-sign",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0 grid grid-cols-5 place-items-center gap-2 p-5 opacity-25">
        {bullets.concat(bullets).slice(0, 35).map((l, i) => (
          <LineBullet key={`${l.letter}-${i}`} letter={l.letter} color={l.color} size="sm" />
        ))}
      </div>
      <div className="relative rounded-xl border-4 border-sign-frame bg-sign px-5 py-3">
        <span className="display-wide text-3xl text-sign-text">Traindex</span>
      </div>
    </div>
  );
}
