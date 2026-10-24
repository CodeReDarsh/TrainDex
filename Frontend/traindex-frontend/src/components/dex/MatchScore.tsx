import { cn } from "@/lib/utils";

export function MatchScore({ score, label = "Match", className }: { score: number; label?: string; className?: string }) {
  const tone = score >= 88 ? "bg-success" : score >= 80 ? "bg-foreground" : "bg-warning";
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between">
        <span className="caption">{label}</span>
        <span className="text-2xl font-extrabold tabular-nums">
          {score}
          <span className="text-base text-muted-foreground">%</span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="h-1.5 overflow-hidden rounded-full bg-raised"
      >
        <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tone)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
