/**
 * BudgetArk - Theme Color Math tests
 *
 * Pins the status bar icon style for every theme preset, so a new or retuned
 * theme can't silently end up with invisible status bar icons.
 */

import { parseColorToRgb, relativeLuminance, statusBarStyleForBackground } from "../colorMath";
import { THEME_PRESETS } from "../themes";

const LIGHT_THEME_IDS = ["ark_parchment", "rose_light", "chart_room", "harbor_dawn", "ledger"];

describe("parseColorToRgb", () => {
  it("parses hex and rgb()/rgba() forms", () => {
    expect(parseColorToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColorToRgb(" #0a0E1a ")).toEqual({ r: 10, g: 14, b: 26 });
    expect(parseColorToRgb("rgb(1, 2, 3)")).toEqual({ r: 1, g: 2, b: 3 });
    expect(parseColorToRgb("rgba(250, 245, 247, 0.8)")).toEqual({ r: 250, g: 245, b: 247 });
  });

  it("returns null for anything else", () => {
    expect(parseColorToRgb("transparent")).toBeNull();
    expect(parseColorToRgb("#12345")).toBeNull();
    expect(parseColorToRgb("")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("spans 0 (black) to 1 (white)", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 10);
  });
});

describe("statusBarStyleForBackground", () => {
  it("uses dark icons on light backgrounds and light icons on dark ones", () => {
    expect(statusBarStyleForBackground("#ffffff")).toBe("dark-content");
    expect(statusBarStyleForBackground("#000000")).toBe("light-content");
  });

  it("falls back to light icons when the color can't be parsed", () => {
    expect(statusBarStyleForBackground("transparent")).toBe("light-content");
  });

  it.each(THEME_PRESETS.map((preset) => [preset.id, preset.colors.bg] as const))(
    "picks the expected style for theme %s",
    (id, bg) => {
      expect(statusBarStyleForBackground(bg)).toBe(
        LIGHT_THEME_IDS.includes(id) ? "dark-content" : "light-content"
      );
    }
  );

  it("covers every light theme id that exists", () => {
    const ids = THEME_PRESETS.map((preset) => preset.id as string);
    for (const id of LIGHT_THEME_IDS) expect(ids).toContain(id);
  });
});
