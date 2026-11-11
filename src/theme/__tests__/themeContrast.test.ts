/**
 * BudgetArk - Theme contrast tests
 *
 * textMuted carries roughly 200 text styles (captions, hints, placeholders).
 * It used to sit between 1.8:1 and 3.6:1 on cards in 14 themes. These tests
 * pin the floor so a new or retuned preset can't regress it.
 */

import { contrastRatio } from "../colorMath";
import { THEME_PRESETS } from "../themes";

const AA_TEXT = 4.5;

/**
 * Classic's desktop bg is #008080, where even pure black only reaches about
 * 4.4:1, so no dark grey can hit AA there. Its cards are held to the floor
 * like everyone else's; the bg check is skipped for it alone.
 */
const BG_EXEMPT = new Set(["classic"]);

const ratio = (a: string, b: string): number => {
  const value = contrastRatio(a, b);
  if (value === null) throw new Error(`Unparseable color: ${a} / ${b}`);
  return value;
};

describe("contrastRatio", () => {
  it("matches the WCAG reference points", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
    expect(contrastRatio("#767676", "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("returns null for an unparseable color", () => {
    expect(contrastRatio("transparent", "#ffffff")).toBeNull();
  });
});

describe.each(THEME_PRESETS.map((preset) => [preset.id, preset.colors] as const))(
  "theme %s",
  (id, colors) => {
    it("textMuted reaches AA on cards", () => {
      expect(ratio(colors.textMuted, colors.card)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    (BG_EXEMPT.has(id) ? it.skip : it)("textMuted reaches AA on the screen background", () => {
      expect(ratio(colors.textMuted, colors.bg)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it("keeps the text > textDim > textMuted hierarchy on cards and background", () => {
      for (const surface of [colors.card, colors.bg]) {
        const muted = ratio(colors.textMuted, surface);
        const dim = ratio(colors.textDim, surface);
        const text = ratio(colors.text, surface);
        expect(dim).toBeGreaterThan(muted);
        expect(text).toBeGreaterThan(dim);
      }
    });
  }
);
