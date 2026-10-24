import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Status = "active" | "reserve" | "retired";

export interface CarRange {
  class: string;
  company: string;
  division: string;
  first: number;
  last: number;
  step: number;
  builder: string;
  built: string;
  status: Status;
  notes: string;
}

const csvPath = fileURLToPath(new URL("../../data/railcars.csv", import.meta.url));

// fields are simple enough that we never need quoted commas
export function loadRanges(path = csvPath): CarRange[] {
  const [header, ...rows] = readFileSync(path, "utf8").trim().split("\n");
  const cols = header.split(",");

  return rows.map((line) => {
    const v = line.split(",");
    const row = Object.fromEntries(cols.map((c, i) => [c, v[i] ?? ""]));
    return {
      ...row,
      first: Number(row.first),
      last: Number(row.last),
      step: Number(row.step) || 1,
    } as CarRange;
  });
}

const rank: Record<Status, number> = { active: 0, reserve: 1, retired: 2 };

// numbers get reused across eras (1301 is both an R6-1 and an R62),
// so return every match with the cars still running first
export function lookup(input: string, ranges = loadRanges()): CarRange[] {
  const n = Number(input.replace(/\D/g, ""));
  if (!n) return [];

  return ranges
    .filter((r) => n >= r.first && n <= r.last && (n - r.first) % r.step === 0)
    .sort((a, b) => rank[a.status] - rank[b.status]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const num of process.argv.slice(2)) {
    const hits = lookup(num);
    if (!hits.length) {
      console.log(`${num}: no match`);
      continue;
    }
    for (const h of hits) {
      console.log(`${num}: ${h.class} (${h.company}, ${h.status}) ${h.notes}`.trim());
    }
  }
}
