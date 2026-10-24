import { describe, expect, it } from "vitest";
import { mockMatch, type MockSign } from "./match-mock";

const signs: MockSign[] = [
  { id: "a", destination: "Far Rockaway", rarity: "common", car_models: ["R211"] },
  { id: "b", destination: "Not In Service", rarity: "legendary", car_models: [] },
];

describe("mockMatch", () => {
  it("keeps the lowest score at 78", () => {
    expect(mockMatch(signs, { rand: () => 0 }).score).toBe(78);
  });
  it("keeps the highest score at 97", () => {
    expect(mockMatch(signs, { rand: () => 0.999999 }).score).toBe(97);
  });
  it("matches the requested sign when comparing from a Dex entry", () => {
    expect(mockMatch(signs, { targetId: "b", rand: () => 0 }).rollsign_id).toBe("b");
  });
  it("uses OCR when the sign text reads cleanly", () => {
    const r = mockMatch(signs, { targetId: "a", rand: () => 0 });
    expect(r.method).toBe("ocr");
    expect(r.ocr_text).toBe("FAR ROCKAWAY");
  });
  it("falls back to Gemini when OCR finds no text", () => {
    const r = mockMatch(signs, { targetId: "a", rand: () => 0.8 });
    expect(r.method).toBe("gemini");
    expect(r.ocr_text).toBeNull();
  });
});
