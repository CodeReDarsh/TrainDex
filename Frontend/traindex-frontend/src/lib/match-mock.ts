// Pure mock matcher. Swap matchRollsign's implementation for real OCR + image
// similarity later; the MatchResult contract stays the same.

import type { Sign } from "./dex";

export type CheckStatus = "pass" | "warn" | "fail";
export interface MatchCheck {
  key: "sign_text" | "lettering" | "car_model" | "glare" | "tilt" | "blur";
  label: string;
  detail: string;
  status: CheckStatus;
}
/**
 * How the sign was identified.
 * - "ocr": OCR read the sign text and it matched a reference rollsign.
 * - "gemini": OCR found no usable text, or text that matched nothing
 *   (unusual lettering, a malfunctioning sign), so Gemini made the call.
 */
export type MatchMethod = "ocr" | "gemini";

export interface MatchResult {
  rollsign_id: string;
  score: number;
  checks: MatchCheck[];
  car_model: string | null;
  station: string;
  method: MatchMethod;
  /** Raw text OCR pulled from the photo, or null when it found none. */
  ocr_text: string | null;
  /** Card to show when the sign isn't in the catalog, e.g. a rare old rollsign. */
  sign?: Sign | undefined;
}

export interface MockSign {
  id: string;
  destination: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  car_models: string[];
}

export const MIN_SCORE = 78;
export const MAX_SCORE = 97;

const RARITY_WEIGHT = { common: 8, uncommon: 4, rare: 2, legendary: 1 } as const;
const STATIONS = [
  "Jay St–MetroTech",
  "W 4 St–Wash Sq",
  "Broadway Junction",
  "Rockaway Blvd",
  "Hoyt–Schermerhorn",
  "Forest Hills–71 Av",
  "Columbus Circle",
];

export function mockMatch(
  signs: MockSign[],
  opts: { targetId?: string | undefined; rand?: () => number } = {},
): MatchResult {
  if (signs.length === 0) throw new Error("No rollsigns to match against");
  const rand = opts.rand ?? Math.random;

  let sign: MockSign | undefined = opts.targetId ? signs.find((s) => s.id === opts.targetId) : undefined;
  if (!sign) {
    const total = signs.reduce((n, s) => n + RARITY_WEIGHT[s.rarity], 0);
    let r = rand() * total;
    sign = signs[signs.length - 1]!;
    for (const s of signs) {
      r -= RARITY_WEIGHT[s.rarity];
      if (r <= 0) {
        sign = s;
        break;
      }
    }
  }

  if (!sign) throw new Error("No rollsign selected");
  const score = Math.round(MIN_SCORE + rand() * (MAX_SCORE - MIN_SCORE));
  const glare = rand() < 0.3;
  const tilt = rand() < 0.25;
  const car = sign.car_models.length
    ? (sign.car_models[Math.floor(rand() * sign.car_models.length)] ?? null)
    : null;

  // OCR handles most photos. The rest fall through to Gemini: either OCR read
  // nothing usable, or it read text that matched no reference sign.
  const ocrRoll = rand();
  const method: MatchMethod = ocrRoll < 0.75 ? "ocr" : "gemini";
  const ocr_text =
    method === "ocr" ? sign.destination.toUpperCase() : ocrRoll < 0.88 ? null : garble(sign.destination);

  return {
    rollsign_id: sign.id,
    method,
    ocr_text,
    score,
    car_model: car,
    station: STATIONS[Math.floor(rand() * STATIONS.length)] ?? STATIONS[0]!,
    checks: [
      {
        key: "sign_text",
        label: "Sign text",
        detail:
          method === "ocr"
            ? `Reads "${sign.destination}"`
            : ocr_text
              ? `Partly readable, confirmed by Gemini as "${sign.destination}"`
              : `No readable text, identified by Gemini as "${sign.destination}"`,
        status: method === "ocr" ? "pass" : "warn",
      },
      {
        key: "lettering",
        label: "Lettering & spacing",
        detail: score >= 88 ? "Matches reference" : "Close, minor differences",
        status: score >= 88 ? "pass" : "warn",
      },
      {
        key: "car_model",
        label: "Likely car model",
        detail: car ?? "Unknown",
        status: car ? "pass" : "warn",
      },
      {
        key: "glare",
        label: "Glare",
        detail: glare ? "Some glare on the sign" : "No glare",
        status: glare ? "warn" : "pass",
      },
      {
        key: "tilt",
        label: "Tilt",
        detail: tilt ? "Slightly tilted" : "Level",
        status: tilt ? "warn" : "pass",
      },
    ],
  };
}

/** Simulates a partial OCR read: drops every third letter. */
function garble(text: string): string {
  return text
    .toUpperCase()
    .split("")
    .map((c, i) => (i % 3 === 2 && c !== " " ? "·" : c))
    .join("");
}
