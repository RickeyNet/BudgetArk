/**
 * BudgetArk - Theme Color Math
 * File: src/theme/colorMath.ts
 *
 * Pure color helpers for decisions the theme has to derive from a preset's
 * colors instead of storing per theme. Kept free of React / React Native
 * imports so the Jest (Node) suite can pin the results for every preset.
 *
 * Why it exists: the status bar icons were hardcoded to "light-content", so
 * the clock, signal and battery were white-on-near-white in the light themes
 * (Rose, Ark Parchment, Chart Room, Harbor Dawn, Ledger). The style is now
 * derived from the theme background, so a new preset is right by default.
 */

export type Rgb = Readonly<{ r: number; g: number; b: number }>;

export type StatusBarStyle = "light-content" | "dark-content";

/** Parses `#rgb`, `#rrggbb`, `rgb()` and `rgba()`; null for anything else. */
export const parseColorToRgb = (color: string): Rgb | null => {
  const trimmed = color.trim();
  const hexMatch = trimmed.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hexMatch) {
    const raw = hexMatch[1];
    const normalized =
      raw.length === 3
        ? raw
            .split("")
            .map((part) => `${part}${part}`)
            .join("")
        : raw;
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }

  const rgbMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i
  );
  if (!rgbMatch) return null;

  return {
    r: Number(rgbMatch[1]),
    g: Number(rgbMatch[2]),
    b: Number(rgbMatch[3]),
  };
};

const linearize = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** WCAG 2.x relative luminance, 0 (black) to 1 (white). */
export const relativeLuminance = ({ r, g, b }: Rgb): number =>
  0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);

/**
 * Picks the status bar icon style that contrasts best with the screen
 * background: dark icons when black out-contrasts white on it, light icons
 * otherwise. Ties and unparseable colors fall back to "light-content", the
 * style every theme shipped with before this was derived.
 */
export const statusBarStyleForBackground = (bg: string): StatusBarStyle => {
  const rgb = parseColorToRgb(bg);
  if (!rgb) return "light-content";
  const luminance = relativeLuminance(rgb);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithBlack > contrastWithWhite ? "dark-content" : "light-content";
};
