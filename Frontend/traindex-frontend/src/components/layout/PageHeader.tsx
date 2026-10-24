import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: Props) {
  return (
    <header className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="display-wide truncate text-[32px] leading-none">{title}</h1>
        {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
