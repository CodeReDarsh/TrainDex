import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  icon?: LucideIcon;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Fill most of the viewport, for whole-page empty states. */
  page?: boolean;
}

export function EmptyState({ icon: Icon, title, body, action, className, page = false }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        page && "min-h-[70dvh]",
        className,
      )}
    >
      {Icon && (
        <span className="mb-1 grid size-14 place-items-center rounded-full border bg-surface text-muted-foreground">
          <Icon className="size-6" aria-hidden />
        </span>
      )}
      <h2 className="text-lg font-bold">{title}</h2>
      {body && <p className="max-w-[32ch] text-sm leading-relaxed text-muted-foreground">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
