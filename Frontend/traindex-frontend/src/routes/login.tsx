import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { PillButton } from "@/components/ui/pill-button";

const safePath = (p: unknown) => (typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : "/dex");

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Traindex" },
      { name: "description", content: "Sign in with a magic link to save your catches." },
      { property: "og:title", content: "Sign in — Traindex" },
      { property: "og:description", content: "Sign in with a magic link to save your catches." },
    ],
  }),
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  const { user } = useSession();
  const navigate = useNavigate();
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const dest = safePath(redirect);

  useEffect(() => {
    if (user) navigate({ to: dest, replace: true });
  }, [user, dest, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${dest}` },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else setSent(true);
  };

  return (
    <div className="flex min-h-[80dvh] flex-col justify-center gap-8 px-6">
      <div className="space-y-3">
        <div className="w-fit rounded-xl border-4 border-sign-frame bg-sign px-4 py-2">
          <span className="display-wide text-2xl text-sign-text">Traindex</span>
        </div>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-sm text-muted-foreground">We'll email you a sign-in link. No password needed.</p>
      </div>

      {sent ? (
        <div role="status" className="space-y-3 rounded-2xl border bg-surface p-5">
          <MailCheck className="size-6 text-success" aria-hidden />
          <p className="font-semibold">Check your email</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Open the link we sent to <span className="font-semibold text-foreground">{email.trim()}</span> on this device.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="tap -mx-2 rounded-full px-2 text-sm font-semibold text-link transition-colors hover:bg-raised"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor={emailId} className="caption block">
            Email
          </label>
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={busy}
            className="tap w-full rounded-full border bg-surface px-5 text-base outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/60 hover:border-muted-foreground/50 focus:border-link focus:shadow-[0_0_0_3px_rgb(138_180_255/0.25)] focus-visible:outline-none disabled:opacity-50"
          />
          <PillButton block type="submit" busy={busy} disabled={!email.trim()}>
            {busy ? "Sending link" : "Email me a link"}
          </PillButton>
        </form>
      )}
    </div>
  );
}
