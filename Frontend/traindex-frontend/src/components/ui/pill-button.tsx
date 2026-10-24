import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The app's one button shape. Primary is rollsign white on black; secondary
 * sits quietly on a surface. Export `pillVariants` to style a <Link> the same way.
 */
export const pillVariants = cva(
  [
    "tap inline-flex select-none items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold",
    "transition-[background-color,border-color,color,transform,opacity] duration-150 ease-out",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  ],
  {
    variants: {
      variant: {
        primary: "bg-foreground text-background hover:bg-white",
        secondary: "border bg-surface text-foreground hover:border-muted-foreground/50 hover:bg-raised",
        quiet: "text-link hover:bg-surface",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", block: false },
  },
);

export interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pillVariants> {
  /** Shows a spinner and blocks clicks while an action runs. */
  busy?: boolean;
}

export const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ className, variant, block, busy = false, disabled, children, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(pillVariants({ variant, block }), className)}
      {...props}
    >
      {busy && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  ),
);
PillButton.displayName = "PillButton";
