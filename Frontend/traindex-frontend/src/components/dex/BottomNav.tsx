import { Link } from "@tanstack/react-router";
import { Camera, LayoutGrid, TrainFront, User } from "lucide-react";

const items = [
  { to: "/scan", label: "Camera", icon: Camera, exact: true },
  { to: "/lines", label: "Lines", icon: TrainFront, exact: true },
  { to: "/dex", label: "Dex", icon: LayoutGrid, exact: false },
  { to: "/profile", label: "Profile", icon: User, exact: true },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-[480px] justify-around px-2">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="group tap flex flex-1 flex-col items-center justify-center gap-1 py-2 text-muted-foreground transition-colors duration-150 hover:text-foreground data-[status=active]:text-link"
          >
            <Icon className="size-[22px] transition-transform duration-150 group-active:scale-90" aria-hidden />
            <span className="text-[11px] font-semibold">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
