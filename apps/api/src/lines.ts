export interface Line {
  id: string;
  trunk: string;
  color: string;
}

// official MTA trunk colors; shuttles left out on purpose
const trunks: [string, string, string[]][] = [
  ["8th Av", "#0039A6", ["A", "C", "E"]],
  ["6th Av", "#FF6319", ["B", "D", "F", "M"]],
  ["Crosstown", "#6CBE45", ["G"]],
  ["14th St", "#A7A9AC", ["L"]],
  ["Nassau St", "#996633", ["J", "Z"]],
  ["Broadway", "#FCCC0A", ["N", "Q", "R", "W"]],
  ["7th Av", "#EE352E", ["1", "2", "3"]],
  ["Lexington Av", "#00933C", ["4", "5", "6"]],
  ["Flushing", "#B933AD", ["7"]],
];

export const lines: Line[] = trunks.flatMap(([trunk, color, ids]) =>
  ids.map((id) => ({ id, trunk, color })),
);

const byId = new Map(lines.map((l) => [l.id, l]));

// diamond bullets (6X, 7X, FX) are express runs of the same line
export function findLine(raw: string): Line | undefined {
  const id = raw.trim().toUpperCase().replace(/X$|\s*EXPRESS$/, "");
  return byId.get(id);
}
