import type { Sign } from "./dex";

export interface LineDef {
  letter: string;
  color: string;
}

export interface LineGroup {
  id: string;
  /** Spoken name, used for accessible labels: "A, C and E lines". */
  name: string;
  lines: LineDef[];
}

/**
 * Subway services grouped by trunk line, in the order the MTA status screen
 * lists them. Colours are the MTA's published line colours.
 */
export const LINE_GROUPS: LineGroup[] = [
  { id: "ace", name: "A, C and E lines", lines: [l("A", "#0039A6"), l("C", "#0039A6"), l("E", "#0039A6")] },
  {
    id: "bdfm",
    name: "B, D, F and M lines",
    lines: [l("B", "#FF6319"), l("D", "#FF6319"), l("F", "#FF6319"), l("M", "#FF6319")],
  },
  { id: "g", name: "G line", lines: [l("G", "#6CBE45")] },
  { id: "l", name: "L line", lines: [l("L", "#A7A9AC")] },
  { id: "jz", name: "J and Z lines", lines: [l("J", "#996633"), l("Z", "#996633")] },
  {
    id: "nqrw",
    name: "N, Q, R and W lines",
    lines: [l("N", "#FCCC0A"), l("Q", "#FCCC0A"), l("R", "#FCCC0A"), l("W", "#FCCC0A")],
  },
  { id: "123", name: "1, 2 and 3 lines", lines: [l("1", "#EE352E"), l("2", "#EE352E"), l("3", "#EE352E")] },
  { id: "456", name: "4, 5 and 6 lines", lines: [l("4", "#00933C"), l("5", "#00933C"), l("6", "#00933C")] },
  { id: "7", name: "7 line", lines: [l("7", "#B933AD")] },
  { id: "s", name: "Shuttles", lines: [l("S", "#808183"), l("SF", "#808183"), l("SR", "#808183")] },
  { id: "sir", name: "Staten Island Railway", lines: [l("SIR", "#0039A6")] },
];

function l(letter: string, color: string): LineDef {
  return { letter, color };
}

const ALIASES: Record<string, string> = {
  FS: "SF",
  H: "SR",
  GS: "S",
  SI: "SIR",
  "6X": "6",
  "7X": "7",
  FX: "F",
};

/** Maps catalog spellings (FS, H, 6X…) onto the letters used in LINE_GROUPS. */
export const normalize = (letter: string) => {
  const up = letter.trim().toUpperCase();
  return ALIASES[up] ?? up;
};

/** The group a catalog line letter belongs to, or undefined for special signs. */
export function groupForLetter(letter: string | undefined | null): LineGroup | undefined {
  if (!letter) return undefined;
  const key = normalize(letter);
  return LINE_GROUPS.find((g) => g.lines.some((x) => x.letter === key));
}

/** Catalog signs that run on a given group. */
export function signsInGroup(catalog: Sign[], group: LineGroup): Sign[] {
  return catalog.filter((s) => groupForLetter(s.line?.letter)?.id === group.id);
}

/** Signs with no line (Not In Service, test signs, malfunctions). */
export function specialSigns(catalog: Sign[]): Sign[] {
  return catalog.filter((s) => !groupForLetter(s.line?.letter));
}

/** Unique car models listed across a set of signs, in a stable order. */
export function carModelsFor(signs: Sign[]): string[] {
  const set = new Set<string>();
  signs.forEach((s) => s.car_models.forEach((m) => set.add(m)));
  return [...set].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

/**
 * Black or white text for a bullet, whichever reads better on its colour.
 * The N, Q, R, W yellow is the only MTA colour that needs black text.
 */
export function bulletTextColor(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => {
    const v = parseInt(c ?? "0", 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#000000" : "#ffffff";
}
