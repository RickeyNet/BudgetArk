/**
 * BudgetBuddy — Theme Presets
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
}>;

export type ThemePreset = Readonly<{
  id: string;
  name: string;
  colors: ThemeColors;
}>;

const FOREST_GOLD: ThemePreset = {
  id: "forest_gold",
  name: "Forest Gold",
  colors: {
    bg: "#232424",
    card: "#1c1d20",
    cardBorder: "#765812",
    accent: "#0b440c",
    success: "#165d0e",
    successDim: "rgba(22, 93, 14, 0.15)",
    warning: "#d4a00c",                      
    warningDim: "rgba(212, 160, 12, 0.15)",
    danger: "#a83232",                       
    dangerDim: "rgba(168, 50, 50, 0.15)",    
    text: "#795c0c",
    textDim: "#085c1a",
    textMuted: "#23603b",
    white: "#ffffff54",
    teal: "#0c8a7a",                         
    tealDim: "rgba(12, 138, 122, 0.15)",  
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
  },
};

const SLATE_DARK: ThemePreset = {
  id: "slate_dark",
  name: "Slate",
  colors: {
    bg: "#15181e",
    card: "#1e222a",
    cardBorder: "#2e3440",
    accent: "#5b8def",
    success: "#4caf84",
    successDim: "rgba(76, 175, 132, 0.15)",
    warning: "#e0a856",
    warningDim: "rgba(224, 168, 86, 0.15)",
    danger: "#e05565",
    dangerDim: "rgba(224, 85, 101, 0.15)",
    text: "#cdd5e0",
    textDim: "#8892a4",
    textMuted: "#4a5468",
    white: "#f0f2f5",
    teal: "#56c2b8",
    tealDim: "rgba(86, 194, 184, 0.15)",
  },
};

const ROSE_LIGHT: ThemePreset = {
  id: "rose_light",
  name: "Rose",
  colors: {
    bg: "#faf5f7",
    card: "#ffffff",
    cardBorder: "#f0d4e0",
    accent: "#d4618c",
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
  },
};

const SYNTHWAVE: ThemePreset = {
  id: "synthwave",
  name: "Synthwave",
  colors: {
    bg: "#0d0221",
    card: "#150535",
    cardBorder: "#ff2975",
    accent: "#ff6ec7",
    success: "#00ffc8",
    successDim: "rgba(0, 255, 200, 0.15)",
    warning: "#ffe44d",
    warningDim: "rgba(255, 228, 77, 0.15)",
    danger: "#ff2975",
    dangerDim: "rgba(255, 41, 117, 0.15)",
    text: "#f0e4ff",
    textDim: "#c77dff",
    textMuted: "#5c2d82",
    white: "#fff0fc",
    teal: "#00e5ff",
    tealDim: "rgba(0, 229, 255, 0.15)",
  },
};

export const THEME_PRESETS: readonly ThemePreset[] = [FOREST_GOLD, NEON_PURPLE, SLATE_DARK, ROSE_LIGHT, SYNTHWAVE] as const;

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