/**
 * BudgetArk — Theme Presets
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
    bg: "#0a1214",
    card: "#0f1e1a",
    cardBorder: "#1e3a2c",
    accent: "#5eada5",
    success: "#c3e88d",
    successDim: "rgba(195, 232, 141, 0.15)",
    warning: "#ffcb6b",
    warningDim: "rgba(255, 203, 107, 0.15)",
    danger: "#ff5370",
    dangerDim: "rgba(255, 83, 112, 0.15)",
    text: "#cdd3de",
    textDim: "#7e9a8a",
    textMuted: "#3e5a4a",
    white: "#e8ede9",
    teal: "#89ddff",
    tealDim: "rgba(137, 221, 255, 0.15)",
    accentButtonText: "#000000",
  },
};



export const THEME_PRESETS: readonly ThemePreset[] = [FOREST_GOLD, NEON_PURPLE, SLATE_DARK, ROSE_LIGHT, SYNTHWAVE, DEEPFOREST, ARK_PARCHMENT] as const;

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
