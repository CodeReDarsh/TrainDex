import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { findLine, type Line } from "./lines.ts";
import { findSigns, toRouteId, type SignMatch } from "./signs.ts";

const model = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const reading = z.object({
  is_subway: z.boolean().describe("true if the photo shows an NYC subway car"),
  sign_found: z.boolean().describe("true if a route sign or bullet is visible"),
  sign_text: z.string().describe("exact letters/numbers on the sign, empty if none"),
  sign_shape: z.enum(["circle", "diamond", "other", "none"]),
  background_color: z.string().describe("hex color of the bullet's background, like #0039A6; empty if unsure"),
  foreground_color: z.string().describe("hex color of the letter or number, like #FFFFFF; empty if unsure"),
  sign_technology: z
    .enum(["rollsign", "led", "lcd", "unknown"])
    .describe("rollsign = printed scroll lit from behind, led = dot-matrix lights, lcd = flat screen"),
  blurry: z.boolean().describe("true if the sign is too blurry or dark to read"),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().describe("one short sentence on anything unusual"),
});

export type Reading = z.infer<typeof reading>;

const prompt = `You identify New York City subway trains from phone photos.
Find the route sign on the train: the colored circle or diamond bullet on the
front, side window, or end of the car. Report exactly what it says. Do not
guess a line from the car's color, model, or station; only read the sign.
Old or unusual signs (two letters like "AA", "QB", "KK") are real; report them as written.`;

const mimes: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

// drop labeled photos in examples/ (A.jpg, 7-diamond.png, ...) and they get
// sent along as reference shots; the label is the filename up to the first dash or dot
function loadExamples(dir = join(import.meta.dirname, "../examples")) {
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => mimes[extname(f).toLowerCase()]);
  } catch {
    return [];
  }

  return files.flatMap((f) => [
    { type: "text" as const, text: `Example: this sign reads "${f.split(/[-.]/)[0]}".` },
    {
      type: "image" as const,
      data: readFileSync(join(dir, f)).toString("base64"),
      mime_type: mimes[extname(f).toLowerCase()],
    },
  ]);
}

const examples = loadExamples();

export type Result =
  | { status: "identified"; line: Line; matches: SignMatch[]; reading: Reading }
  | { status: "rare"; text: string; matches: SignMatch[]; reading: Reading }
  | { status: "retake"; reason: string; reading: Reading }
  | { status: "not_found"; reason: string; reading: Reading };

export async function identify(image: Buffer, mimeType: string): Promise<Result> {
  const res = await client.interactions.create({
    model,
    input: [
      { type: "text", text: prompt },
      ...examples,
      { type: "text", text: "Now read this photo." },
      { type: "image", data: image.toString("base64"), mime_type: mimeType },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: z.toJSONSchema(reading),
    },
    generation_config: { thinking_level: "low" },
  });

  const r = reading.parse(JSON.parse(res.output_text ?? "{}"));

  if (r.blurry) return { status: "retake", reason: "Photo is too blurry, try again", reading: r };
  if (!r.is_subway) return { status: "not_found", reason: "That doesn't look like a subway train", reading: r };
  if (!r.sign_found || !r.sign_text) {
    return { status: "not_found", reason: "No route sign visible, aim at the letter or number", reading: r };
  }

  const line = findLine(r.sign_text);
  const matches = await findSigns(r, line?.id ?? toRouteId(r.sign_text));
  if (line) return { status: "identified", line, matches, reading: r };

  // not a current line, e.g. a K or V rollsign on a museum train; matches has it if the catalog does
  return { status: "rare", text: r.sign_text, matches, reading: r };
}
