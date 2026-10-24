import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dataUrlToBlob } from "./capture-store";
import { supabaseConfigured } from "./supabase-config";
import type { MatchResult } from "./match-mock";

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export interface Sign {
  id: string;
  dex_number: number;
  destination: string;
  subtitle: string | null;
  rarity: Rarity;
  car_models: string[];
  description: string;
  line: { letter: string; color: string } | null;
}

export interface OwnedEntry {
  rollsign_id: string;
  first_caught_at: string;
  best_capture_id: string | null;
  best_score: number | null;
}

export interface Sighting {
  id: string;
  station: string | null;
  created_at: string;
  match_score: number | null;
  storage_path: string;
}

export const dexNo = (n: number) => `#${String(n).padStart(3, "0")}`;
export const RARITY_RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: async (): Promise<Sign[]> => {
    if (!supabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("rollsigns")
      .select("id, dex_number, destination, subtitle, rarity, car_models, description, line:lines(letter, color)")
      .order("dex_number");
    if (error) throw error;
    return data as unknown as Sign[];
  },
  staleTime: 5 * 60_000,
});

export const collectionQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["collection", userId],
    enabled: !!userId,
    queryFn: async (): Promise<OwnedEntry[]> => {
      const { data, error } = await supabase
        .from("collection")
        .select("rollsign_id, first_caught_at, best_capture_id, best:captures(match_score)")
        .order("first_caught_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        rollsign_id: r.rollsign_id,
        first_caught_at: r.first_caught_at,
        best_capture_id: r.best_capture_id,
        best_score: (r.best as { match_score: number | null } | null)?.match_score ?? null,
      }));
    },
  });

export const sightingsQuery = (userId: string | undefined, rollsignId: string | undefined) =>
  queryOptions({
    queryKey: ["sightings", userId, rollsignId],
    enabled: !!userId && !!rollsignId,
    queryFn: async (): Promise<Sighting[]> => {
      const { data, error } = await supabase
        .from("captures")
        .select("id, station, created_at, match_score, storage_path")
        .eq("rollsign_id", rollsignId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/** Car models the user has spotted, read back from their captures' quality flags. */
export const spottedModelsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["spotted-models", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase.from("captures").select("quality_flags");
      if (error) throw error;
      const models = new Set<string>();
      for (const row of data ?? []) {
        const f = row.quality_flags;
        if (f && typeof f === "object" && !Array.isArray(f)) {
          const m = f["spotted_car_model"];
          if (typeof m === "string" && m) models.add(m);
        }
      }
      return models;
    },
  });

export async function captureUrl(path: string) {
  const { data } = await supabase.storage.from("captures").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Saves a capture and adds it to the collection (or records a new sighting). */
export async function saveCatch(dataUrl: string, match: MatchResult) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Sign in to save your catch");

  const path = `${uid}/${crypto.randomUUID()}.jpg`;
  const blob = await dataUrlToBlob(dataUrl);
  const up = await supabase.storage.from("captures").upload(path, blob, { contentType: "image/jpeg" });
  if (up.error) throw up.error;

  // quality_flags is free-form JSON: check statuses keyed by check, plus the
  // identified car model and how the sign was read, so the Train models grid
  // can show which cars you've spotted.
  const flags: Record<string, string | null> = {
    ...Object.fromEntries(match.checks.map((c) => [c.key, c.status])),
    spotted_car_model: match.car_model,
    match_method: match.method,
  };
  const { data: cap, error: capErr } = await supabase
    .from("captures")
    .insert({
      user_id: uid,
      rollsign_id: match.rollsign_id,
      storage_path: path,
      match_score: match.score,
      quality_flags: flags,
      station: match.station,
    })
    .select("id")
    .single();
  if (capErr) throw capErr;

  const { data: existing } = await supabase
    .from("collection")
    .select("rollsign_id, best:captures(match_score)")
    .eq("rollsign_id", match.rollsign_id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from("collection")
      .insert({ user_id: uid, rollsign_id: match.rollsign_id, best_capture_id: cap.id });
    if (error) throw error;
    return { alreadyOwned: false };
  }
  const best = (existing.best as { match_score: number | null } | null)?.match_score ?? 0;
  if (match.score > best) {
    await supabase
      .from("collection")
      .update({ best_capture_id: cap.id })
      .eq("rollsign_id", match.rollsign_id)
      .eq("user_id", uid);
  }
  return { alreadyOwned: true };
}
