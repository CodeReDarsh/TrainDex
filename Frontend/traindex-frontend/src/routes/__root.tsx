import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabaseConfigured } from "../lib/supabase-config";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/dex/BottomNav";
import { pillVariants } from "@/components/ui/pill-button";

/** Routes that fill the screen above the tab bar. */
const CAMERA = new Set(["/scan"]);

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto w-64 rounded-xl border-4 border-sign-frame bg-sign px-4 py-3">
          <span className="sign-type text-2xl text-sign-text">Not in service</span>
        </div>
        <h1 className="mt-6 text-xl font-bold">This page doesn't exist</h1>
        <p className="mt-2 text-sm text-muted-foreground">The link may be old, or the address has a typo.</p>
        <Link to="/lines" className={pillVariants({ variant: "primary", className: "mt-6" })}>
          Go to Lines
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-bold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our side. Reload the page to try again.
        </p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className={pillVariants({ variant: "primary", className: "mt-6" })}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#15171A" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "Traindex" },
      { name: "description", content: "Photograph NYC subway rollsigns, collect them as cards, and fill your Dex." },
      { property: "og:title", content: "Traindex" },
      { property: "og:description", content: "Photograph NYC subway rollsigns, collect them as cards, and fill your Dex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (!supabaseConfigured()) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const camera = CAMERA.has(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <main
        className={
          camera
            ? "relative mx-auto h-dvh max-w-[480px] overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
            : "mx-auto min-h-dvh max-w-[480px] pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
        }
      >
        <Outlet />
      </main>
      <BottomNav />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
