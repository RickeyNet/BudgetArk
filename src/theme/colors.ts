/**
 * BudgetArk — Theme Constants
 * File: src/theme/colors.ts
 *
 * Single source of truth for all colors used throughout the app.
 * Import this file instead of hardcoding hex values in components.
 *
 * Benefits:
 * - Change the entire app's look by editing one file
 * - Prevents color drift (slightly different shades across screens)
 * - Enables future dark/light theme toggle support
 *
 * Usage:
 *   import { COLORS } from "../theme/colors";
 *   backgroundColor: COLORS.bg
 */

export const COLORS = {
  /* ── Backgrounds ── */
  /** Main app background — near-black with blue undertone */
  bg: "#0a0e1a",

  /** Card/surface background — slightly lighter than bg */
  card: "#131829",

  /** Border color for cards and dividers */
  cardBorder: "#1e2642",

  /* ── Primary Accent ── */
  /** Main interactive color — purple */
  accent: "#6c5ce7",

  /** Glow/shadow version of accent for elevation effects */
  accentGlow: "rgba(108, 92, 231, 0.3)",

  /** Lighter accent for hover/pressed states */
  accentLight: "#8b7cf7",

  /* ── Semantic Colors ── */
  /** Positive/success — bright green */
  success: "#00e676",

  /** Success with transparency — for badge backgrounds */
  successDim: "rgba(0, 230, 118, 0.15)",

  /** Warning/caution — amber yellow */
  warning: "#ffc107",

  /** Warning with transparency */
  warningDim: "rgba(255, 193, 7, 0.15)",

  /** Error/danger — bright red */
  danger: "#ff5252",

  /** Danger with transparency */
  dangerDim: "rgba(255, 82, 82, 0.15)",

  /* ── Text Colors ── */
  /** Primary text — high contrast on dark bg */
  text: "#e8eaf6",

  /** Secondary text — labels, descriptions */
  textDim: "#7986cb",

  /** Tertiary text — placeholders, disabled */
  textMuted: "#3d4566",

  /** Pure white — for text on colored buttons */
  white: "#ffffff",

  /* ── Investment Screen Specific ── */
  /** Growth/profit indicator — teal */
  teal: "#00bcd4",

  /** Teal with transparency */
  tealDim: "rgba(0, 188, 212, 0.15)",
} as const;

/**
 * Type-safe color key accessor.
 * Ensures only valid color keys are used throughout the app.
 */
export type ColorKey = keyof typeof COLORS;
