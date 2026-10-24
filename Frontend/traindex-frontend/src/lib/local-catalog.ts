import type { Sign } from "./dex";
import { LINE_GROUPS } from "./lines";

// stand-in catalog until the real one is in a database: one card per line
export function localCatalog(): Sign[] {
  return LINE_GROUPS.flatMap((g) => g.lines.map((line) => ({ line, group: g.name }))).map(
    ({ line, group }, i) => ({
      id: `line-${line.letter}`,
      dex_number: i + 1,
      destination: `${line.letter} train`,
      subtitle: group,
      rarity: line.letter.startsWith("S") ? "uncommon" : "common",
      car_models: [],
      description: `The ${line.letter} line.`,
      line,
    }),
  );
}
