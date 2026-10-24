import { cn } from "@/lib/utils";
import { LineBullet } from "./LineBullet";

interface Props {
  line?: { letter: string; color: string } | null;
  destination: string;
  subtitle?: string | null;
  size?: "sm" | "md" | "lg";
  variant?: "clean" | "photo";
  className?: string;
}

const S = {
  sm: { box: "rounded-md border-2 px-1.5 py-1 gap-1.5", bullet: "xs", dest: "text-[11px]", sub: "text-[8px]" },
  md: { box: "rounded-lg border-[3px] px-3 py-2.5 gap-2.5", bullet: "md", dest: "text-lg", sub: "text-[11px]" },
  lg: { box: "rounded-xl border-4 px-4 py-3.5 gap-3.5", bullet: "lg", dest: "text-[28px]", sub: "text-sm" },
} as const;

/** The black rollsign box from the front of a subway car. */
export function RollSign({ line, destination, subtitle, size = "md", variant = "clean", className }: Props) {
  const s = S[size];
  return (
    <div
      role="img"
      aria-label={`${line ? `${line.letter} train to ` : ""}${destination}${subtitle ? `, ${subtitle}` : ""}`}
      className={cn(
        "flex w-full items-center border-sign-frame bg-sign text-sign-text shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
        s.box,
        variant === "photo" && "contrast-125 saturate-50",
        className,
      )}
    >
      {line && <LineBullet letter={line.letter} color={line.color} size={s.bullet} />}
      <div className={cn("min-w-0 flex-1", !line && "text-center")}>
        <div className={cn("sign-type truncate leading-tight", s.dest)}>{destination}</div>
        {subtitle && <div className={cn("truncate font-semibold leading-tight opacity-70", s.sub)}>{subtitle}</div>}
      </div>
    </div>
  );
}
