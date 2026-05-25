/**
 * BudgetArk - Theme Presets
 * File: src/theme/themes.ts
 *
 * Defines all user-selectable color scheme presets.
 * These are pure data objects (no React), making them fast and easy to reuse.
 */

export type ThemeColors = Readonly<{
  bg: string;
  card: string;
  cardBorder: string;
  accent: string;
  success: string;
  successDim: string;
  warning: string;        
  warningDim: string;     
  danger: string;         
  dangerDim: string;      
  text: string;
  textDim: string;
  textMuted: string;
  white: string;
  teal: string;           
  tealDim: string;
  accentButtonText: string;
}>;

export type ThemePreset = Readonly<{
  id: string;
  name: string;
  colors: ThemeColors;
}>;

const ARK_PARCHMENT: ThemePreset = {
  id: "ark_parchment",
  name: "The Ark",
  colors: {
    bg: "#F2E6D0",
    card: "#FAF3E8",
    cardBorder: "#D4B896",
    accent: "#7C4A2E",
    success: "#5A7A3A",
    successDim: "rgba(90, 122, 58, 0.15)",
    warning: "#C48A2A",
    warningDim: "rgba(196, 138, 42, 0.15)",
    danger: "#A0392A",
    dangerDim: "rgba(160, 57, 42, 0.15)",
    text: "#3E2010",
    textDim: "#8A6A50",
    textMuted: "#C4A888",
    white: "#F2E6D0",
    teal: "#5A8A7A",
    tealDim: "rgba(90, 138, 122, 0.15)",
    accentButtonText: "#D4B896",
  },
};

const FOREST_GOLD: ThemePreset = {
  id: "forest_gold",
  name: "Forest Gold",
  colors: {
    bg: "#111410",
    card: "#1a1e18",
    cardBorder: "#3a4a2a",
    accent: "#d4a020",
    success: "#5cb85c",
    successDim: "rgba(92, 184, 92, 0.15)",
    warning: "#e8b84a",
    warningDim: "rgba(232, 184, 74, 0.15)",
    danger: "#d45050",
    dangerDim: "rgba(212, 80, 80, 0.15)",
    text: "#d4c8a0",
    textDim: "#8a9a6a",
    textMuted: "#4a5a3a",
    white: "#e8e0c8",
    teal: "#3aaa8a",
    tealDim: "rgba(58, 170, 138, 0.15)",
    accentButtonText: "#000000",
  },
};

const NEON_PURPLE: ThemePreset = {
  id: "neon_purple",
  name: "Neon Purple",
  colors: {
    bg: "#0a0e1a",
    card: "#131829",
    cardBorder: "#1e2642",
    accent: "#6c5ce7",
    success: "#00e676",
    successDim: "rgba(0, 230, 118, 0.15)",
    warning: "#ffc107",                      
    warningDim: "rgba(255, 193, 7, 0.15)",   
    danger: "#ff5252",                       
    dangerDim: "rgba(255, 82, 82, 0.15)",    
    text: "#e8eaf6",
    textDim: "#7986cb",
    textMuted: "#3d4566",
    white: "#ffffff",
    teal: "#00bcd4",                         
    tealDim: "rgba(0, 188, 212, 0.15)",
    accentButtonText: "#000000",
  },
};

const SLATE_DARK: ThemePreset = {
  id: "slate_dark",
  name: "Easy",
  colors: {
    bg: "#1a1915",
    card: "#2b2a26",
    cardBorder: "#3d3b34",
    accent: "#da7756",
    success: "#7dac65",
    successDim: "rgba(125, 172, 101, 0.15)",
    warning: "#d4a249",
    warningDim: "rgba(212, 162, 73, 0.15)",
    danger: "#c95d50",
    dangerDim: "rgba(201, 93, 80, 0.15)",
    text: "#e8e4dd",
    textDim: "#a39e93",
    textMuted: "#6b6560",
    white: "#f5f0e8",
    teal: "#7aaca0",
    tealDim: "rgba(122, 172, 160, 0.15)",
    accentButtonText: "#000000",
  },
};

const ROSE_LIGHT: ThemePreset = {
  id: "rose_light",
  name: "Rose",
  colors: {
    bg: "#faf5f7",
    card: "#fff9f6",
    cardBorder: "#e9d3c8",
    accent: "#d29a80",
    success: "#6abf8a",
    successDim: "rgba(106, 191, 138, 0.15)",
    warning: "#e8a44a",
    warningDim: "rgba(232, 164, 74, 0.15)",
    danger: "#e25c6a",
    dangerDim: "rgba(226, 92, 106, 0.15)",
    text: "#4a3040",
    textDim: "#9a7088",
    textMuted: "#c4a0b4",
    white: "#4a3040",
    teal: "#5aafb0",
    tealDim: "rgba(90, 175, 176, 0.15)",
    accentButtonText: "#000000",
  },
};

const SYNTHWAVE: ThemePreset = {
  id: "synthwave",
  name: "Synthwave",
  colors: {
    bg: "#0e0e20",
    card: "#161633",
    cardBorder: "#2a2050",
    accent: "#c44a90",
    success: "#4ac9a0",
    successDim: "rgba(74, 201, 160, 0.15)",
    warning: "#d4a04a",
    warningDim: "rgba(212, 160, 74, 0.15)",
    danger: "#c44a5a",
    dangerDim: "rgba(196, 74, 90, 0.15)",
    text: "#e8e0f0",
    textDim: "#8878a8",
    textMuted: "#4a3a6a",
    white: "#ede6f4",
    teal: "#6aadcc",
    tealDim: "rgba(106, 173, 204, 0.15)",
    accentButtonText: "#000000",
  },
};

const DEEPFOREST: ThemePreset = {
  id: "deepforest",
  name: "Deep Forest",
  colors: {
    bg: "#06100d",
    card: "#0c1914",
    cardBorder: "#26483a",
    accent: "#67b8a2",
    success: "#a6d98d",
    successDim: "rgba(166, 217, 141, 0.15)",
    warning: "#d6b05c",
    warningDim: "rgba(214, 176, 92, 0.15)",
    danger: "#c96b6b",
    dangerDim: "rgba(201, 107, 107, 0.15)",
    text: "#e2ece2",
    textDim: "#8aa79a",
    textMuted: "#49665a",
    white: "#f4f8f3",
    teal: "#7bd7c6",
    tealDim: "rgba(123, 215, 198, 0.15)",
    accentButtonText: "#000000",
  },
};



const OCEAN_CORAL: ThemePreset = {
  id: "ocean_coral",
  name: "Coral",
  colors: {
    bg: "#0b1e24",
    card: "#112e35",
    cardBorder: "#1a4450",
    accent: "#f08a65",
    success: "#8abb6a",
    successDim: "rgba(138, 187, 106, 0.15)",
    warning: "#f0a050",
    warningDim: "rgba(240, 160, 80, 0.15)",
    danger: "#e05555",
    dangerDim: "rgba(224, 85, 85, 0.15)",
    text: "#e0d4bc",
    textDim: "#7a9a8a",
    textMuted: "#3e6058",
    white: "#f0e8d8",
    teal: "#5abaa0",
    tealDim: "rgba(90, 186, 160, 0.15)",
    accentButtonText: "#000000",
  },
};

/**
 * Deep Space - the "trading terminal" concept palette.
 *
 * Cards are defined as opaque base colors here; the separate surface-style
 * layer can turn them into glass so the starfield still works when users
 * choose the Glass design option, while Deep Space + Solid remains possible.
 */
const DEEP_SPACE: ThemePreset = {
  id: "deep_space",
  name: "Deep Space",
  colors: {
    bg: "#04060f",
    card: "#0a1020",
    cardBorder: "#24477f",
    accent: "#5b9ef0",
    success: "#34d399",
    successDim: "rgba(52, 211, 153, 0.14)",
    warning: "#f0a050",
    warningDim: "rgba(240, 160, 80, 0.14)",
    danger: "#ef6060",
    dangerDim: "rgba(239, 96, 96, 0.14)",
    text: "#e4ecf8",
    textDim: "#8fa6c8",
    textMuted: "#5a6d8c",
    white: "#ffffff",
    teal: "#2dd4bf",
    tealDim: "rgba(45, 212, 191, 0.14)",
    accentButtonText: "#ffffff",
  },
};

export const THEME_PRESETS: readonly ThemePreset[] = [FOREST_GOLD, NEON_PURPLE, SLATE_DARK, ROSE_LIGHT, SYNTHWAVE, DEEPFOREST, ARK_PARCHMENT, OCEAN_CORAL, DEEP_SPACE] as const;

/** Default theme the app uses on first launch */
export const DEFAULT_THEME_ID: ThemePreset["id"] = "forest_gold";

/**
 * Fast lookup map (O(1)) to avoid scanning arrays.
 */
export const THEME_BY_ID: Readonly<Record<string, ThemePreset>> = THEME_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  },
  {} as Record<string, ThemePreset>
);
