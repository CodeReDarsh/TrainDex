import { useRef } from "react";
import { cn } from "@/lib/utils";

interface Props<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * The MTA-style segmented switcher. Arrow keys move between options, as in a
 * native tab bar.
 */
export function Segmented<T extends string>({ label, options, value, onChange, className }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    const opt = options[next];
    if (opt === undefined) return;
    onChange(opt);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("grid rounded-[14px] border bg-surface p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt, i) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "min-h-10 rounded-[10px] px-2 text-[13px] font-semibold transition-colors duration-150",
              active
                ? "bg-raised text-foreground shadow-[0_1px_0_rgb(255_255_255/0.05)_inset,0_2px_6px_-2px_rgb(0_0_0/0.5)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
