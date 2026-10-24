import type { Reading } from "./identify.ts";

// Aidan's catalog API (app/ on this branch); matching is skipped when it isn't set
const api = process.env.SIGNS_API_URL?.replace(/\/$/, "");

export interface SignMatch {
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

interface ApiMatch {
  sign_id: string;
  similarity_score: number;
  classification: { route_id: string | null; service_status: string; display_name: string };
  reference_images: { source_url: string; image_type: string; attribution: string | null }[];
  sign: {
    background_color: string | null;
    sign_technology: string;
    is_historical: boolean;
    verification_status: string;
  };
}

const hex = /^#[0-9A-F]{6}$/i;

// photos make colors and display type rough guesses, so they count for less than the route and shape
const confidence = { background_color: 0.5, foreground_color: 0.4, sign_technology: 0.6 };

export async function findSigns(r: Reading, route: string): Promise<SignMatch[]> {
  if (!api) return [];

  const query: Record<string, unknown> = { route, limit: 3, confidence };
  if (r.sign_shape === "circle" || r.sign_shape === "diamond") query.shape = r.sign_shape;
  if (hex.test(r.background_color)) query.background_color = r.background_color.toUpperCase();
  if (hex.test(r.foreground_color)) query.foreground_color = r.foreground_color.toUpperCase();
  if (r.sign_technology !== "unknown") query.sign_technology = r.sign_technology;

  let res: Response;
  try {
    res = await fetch(`${api}/signs/match`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error("sign catalog unreachable", err);
    return [];
  }
  if (!res.ok) {
    console.error("sign match failed", res.status, await res.text());
    return [];
  }

  const { matches } = (await res.json()) as { matches: ApiMatch[] };
  return matches.map((m) => {
    // prefer a real photo over the reconstructed artwork when a design has both
    const ref = m.reference_images.find((i) => i.image_type === "authentic_photograph") ?? m.reference_images[0];
    return {
      id: m.sign_id,
      name: m.classification.display_name,
      route: m.classification.route_id,
      score: m.similarity_score,
      color: m.sign.background_color,
      technology: m.sign.sign_technology,
      status: m.classification.service_status,
      historical: m.sign.is_historical,
      verified: m.sign.verification_status === "verified",
      image: ref?.source_url ?? null,
      credit: ref?.attribution ?? null,
    };
  });
}

// Aidan's route ids that don't match what's printed on the sign
const routeIds: Record<string, string> = { JFK: "JFK_EXPRESS" };

export const toRouteId = (text: string) => {
  const t = text.trim().toUpperCase();
  return routeIds[t] ?? t;
};
