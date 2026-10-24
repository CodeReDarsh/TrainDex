import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LineGroup } from "@/lib/lines";
import { Skeleton } from "@/components/ui/skeleton";
import { LineBullet } from "./LineBullet";

interface Props {
  group: LineGroup;
  total: number;
  caught: number;
  /** Route letters with at least one caught sign; the rest are drawn faded. */
  caughtLetters: Set<string>;
  onOpen: () => void;
}

/** One row of the dashboard, in the shape of an MTA status row. */
export function LineRow({ group, total, caught, caughtLetters, onOpen }: Props) {
  const empty = total === 0;
  const complete = !empty && caught === total;

  const status = empty ? "No signs listed" : complete ? "All caught" : `${caught} of ${total} caught`;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        disabled={empty}
        aria-label={`${group.name}: ${status}`}
        className={cn(
          "group flex min-h-[54px] w-full items-center gap-3 px-4 text-left transition-colors duration-150",
          "hover:bg-raised/60 active:bg-raised focus-visible:-outline-offset-2 disabled:cursor-default disabled:hover:bg-transparent",
        )}
      >
        <span className="flex items-center gap-1">
          {group.lines.map((line) => (
            <LineBullet
              key={line.letter}
              letter={line.letter}
              color={line.color}
              size="md"
              faded={!caughtLetters.has(line.letter)}
            />
          ))}
        </span>
        <span
          className={cn(
            "ml-auto text-[15px] tabular-nums",
            empty ? "text-muted-foreground/60" : complete ? "font-semibold text-success" : caught > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {status}
        </span>
        <ChevronRight
          aria-hidden
          className={cn(
            "size-5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5",
            empty && "invisible",
          )}
        />
      </button>
    </li>
  );
}

export function LineRowSkeleton({ bullets }: { bullets: number }) {
  return (
    <li className="flex min-h-[54px] items-center gap-3 px-4">
      <span className="flex gap-1">
        {Array.from({ length: bullets }, (_, i) => (
          <Skeleton key={i} className="size-7 rounded-full" />
        ))}
      </span>
      <Skeleton className="ml-auto h-4 w-24" />
    </li>
  );
}
