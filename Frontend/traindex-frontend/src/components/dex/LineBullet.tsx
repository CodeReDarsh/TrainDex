import { cn } from "@/lib/utils";
import { bulletTextColor } from "@/lib/lines";

const SIZES = {
  xs: "size-5 text-[11px]",
  sm: "size-6 text-[13px]",
  md: "size-7 text-[15px]",
  lg: "size-12 text-2xl",
} as const;

interface Props {
  letter: string;
  color: string;
  size?: keyof typeof SIZES;
  /** Not caught yet: drawn as a dim, desaturated outline of the bullet. */
  faded?: boolean;
  className?: string;
}

/** A subway route bullet: coloured circle, route letter in Helvetica-style type. */
export function LineBullet({ letter, color, size = "md", faded = false, className }: Props) {
  const long = letter.length > 1;
  return (
    <span
      aria-hidden
      className={cn(
        "sign-type inline-grid shrink-0 place-items-center rounded-full leading-none transition-[opacity,filter] duration-200",
        SIZES[size],
        long && "tracking-[-0.06em]",
        faded && "opacity-30 grayscale-[60%]",
        className,
      )}
      style={{ backgroundColor: color, color: bulletTextColor(color) }}
    >
      <span className={cn(long && (letter.length > 2 ? "text-[0.55em]" : "text-[0.72em]"))}>{letter}</span>
    </span>
  );
}
