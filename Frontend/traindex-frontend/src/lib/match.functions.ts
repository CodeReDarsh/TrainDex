import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Rarity, Sign } from "./dex";
import { normalize } from "./lines";
import { localCatalog } from "./local-catalog";
import type { MatchCheck, MatchResult } from "./match-mock";
import { supabaseConfigured } from "./supabase-config";

const API_URL = process.env["TRAINDEX_API_URL"] ?? "http://localhost:3000";

interface Reading {
  sign_text: string;
  sign_shape: "circle" | "diamond" | "other" | "none";
  blurry: boolean;
  confidence: "high" | "medium" | "low";
  notes: string;
}

/** A design from Aidan's sign catalog, ranked by how well it fits what Gemini saw. */
interface SignMatch {
  id: string;
  name: string;
  route: string | null;
  score: number;
  color: string | null;
  technology: string;
  status: string;
  historical: boolean;
  verified: boolean;
  image: string | null;
  credit: string | null;
}

type Identify =
  | {
      status: "identified";
      line: { id: string; color: string };
      matches?: SignMatch[];
      reading: Reading;
    }
  | { status: "rare"; text: string; matches?: SignMatch[]; reading: Reading }
  | { status: "retake" | "not_found"; reason: string; reading: Reading }
  | { error: { message: string } };

const SCORE = { high: 94, medium: 83, low: 70 } as const;

function rarityFor(m: SignMatch): Rarity {
  if (m.status === "discontinued") return "legendary";
  if (m.historical) return "rare";
  if (m.technology !== "artwork") return "uncommon";
  return "common";
}

// "A blue circle — R32-labeled set, Standard set" -> "R32-labeled set, Standard set"
const variantOf = (name: string) => name.split(" — ").slice(1).join(" — ") || null;

async function catalog(): Promise<Sign[]> {
  if (!supabaseConfigured()) return localCatalog();

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
  const { data, error } = await sb
    .from("rollsigns")
    .select(
      "id, dex_number, destination, subtitle, rarity, car_models, description, line:lines(letter, color)",
    );
  if (error) throw new Error("Matching is unavailable right now");
  return data as unknown as Sign[];
}

/**
 * Sends the photo to the TrainDex API (apps/api on Backend/OCRGemini), which has
 * Gemini read the route bullet, then maps that onto a catalog sign.
 */
export const matchRollsign = createServerFn({ method: "POST" })
  .inputValidator((input: { image: string; targetId?: string | undefined }) => {
    if (typeof input?.image !== "string" || !input.image.startsWith("data:image/")) {
      throw new Error("Missing photo");
    }
    return { image: input.image, targetId: input.targetId };
  })
  .handler(async ({ data }): Promise<MatchResult> => {
    const photo = await (await fetch(data.image)).blob();
    const form = new FormData();
    form.append("image", photo, "capture.jpg");

    let res: Identify;
    try {
      res = await (await fetch(`${API_URL}/v1/identify`, { method: "POST", body: form })).json();
    } catch {
      throw new Error("Can't reach the TrainDex API. Is it running?");
    }

    if ("error" in res) throw new Error(res.error.message);
    if (res.status === "retake" || res.status === "not_found") throw new Error(res.reason);

    const r = res.reading;
    const best = "matches" in res ? res.matches?.[0] : undefined;
    const signs = await catalog();
    let sign: Sign | undefined;

    if (res.status === "identified") {
      const id = res.line.id;
      sign =
        signs.find((s) => s.id === data.targetId && s.line && normalize(s.line.letter) === id) ??
        signs.find((s) => s.line && normalize(s.line.letter) === id);
      sign ??= {
        id: `line-${id}`,
        dex_number: 0,
        destination: `${id} train`,
        subtitle: null,
        rarity: "common",
        car_models: [],
        description: "",
        line: { letter: id, color: res.line.color },
      };
      if (best) {
        sign = {
          ...sign,
          id: best.id,
          subtitle: variantOf(best.name) ?? sign.subtitle,
          rarity: rarityFor(best),
          description: best.name,
        };
      }
    } else if (best) {
      sign = {
        id: best.id,
        dex_number: 0,
        destination: `${r.sign_text} train`,
        subtitle: variantOf(best.name) ?? "Retired line",
        rarity: rarityFor(best),
        car_models: [],
        description: best.name,
        line: { letter: r.sign_text, color: best.color ?? "#808183" },
      };
    } else {
      sign = {
        id: `rare-${r.sign_text}`,
        dex_number: 0,
        destination: `${r.sign_text} (rare sign)`,
        subtitle: "Not a current line",
        rarity: "legendary",
        car_models: [],
        description: r.notes,
        line: { letter: r.sign_text, color: "#808183" },
      };
    }

    const checks: MatchCheck[] = [
      {
        key: "sign_text",
        label: "Sign text",
        detail: `Reads "${r.sign_text}"`,
        status: res.status === "identified" ? "pass" : "warn",
      },
      {
        key: "lettering",
        label: "Bullet shape",
        detail:
          r.sign_shape === "diamond"
            ? "Diamond (express)"
            : r.sign_shape === "circle"
              ? "Circle"
              : "Unusual",
        status: r.sign_shape === "circle" || r.sign_shape === "diamond" ? "pass" : "warn",
      },
      {
        key: "design",
        label: "Sign design",
        detail: best ? best.name : "No matching design in the catalog",
        status: best && best.score >= 0.8 ? "pass" : "warn",
      },
      {
        key: "blur",
        label: "Sharpness",
        detail: r.confidence === "high" ? "Clear" : "A bit hard to read",
        status: r.confidence === "high" ? "pass" : "warn",
      },
    ];

    return {
      rollsign_id: sign.id,
      score: best ? Math.round(best.score * SCORE[r.confidence]) : SCORE[r.confidence],
      checks,
      car_model: null,
      station: "Unknown station",
      method: "gemini",
      ocr_text: r.sign_text,
      sign,
    };
  });
