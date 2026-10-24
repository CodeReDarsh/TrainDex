import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { mockMatch, type MatchResult } from "./match-mock";

/**
 * match-rollsign: the single matching entry point used by the UI.
 * Currently returns a realistic mock. The real pipeline is: OCR the sign text
 * and match it against reference_images; when OCR finds no text or text that
 * matches nothing, ask Gemini. Replace the body without changing callers;
 * report which path was taken in MatchResult.method.
 */
export const matchRollsign = createServerFn({ method: "POST" })
  .inputValidator((input: { captureId?: string | undefined; targetId?: string | undefined }) => ({
    captureId: typeof input?.captureId === "string" ? input.captureId.slice(0, 100) : undefined,
    targetId: typeof input?.targetId === "string" ? input.targetId.slice(0, 64) : undefined,
  }))
  .handler(async ({ data }): Promise<MatchResult> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: signs, error } = await sb
      .from("rollsigns")
      .select("id, destination, rarity, car_models");
    if (error || !signs) {
      console.error("matchRollsign", error);
      throw new Error("Matching is unavailable right now");
    }
    return mockMatch(signs, { targetId: data.targetId });
  });
