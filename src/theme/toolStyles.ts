/**
 * BudgetArk - Charts Tool Styles
 * File: src/theme/toolStyles.ts
 *
 * The shared look of the Charts-tab calculators: the collapsible tool
 * header, the section card + title + hint, text inputs, selectable chips,
 * and the slider group (label, tap-to-type value, +/- steppers). Three
 * files carried byte-identical copies (ChartsScreen, PurchasePlannerCard,
 * TaxCalculatorCard - ~90 style lines each), so a tweak to one card
 * silently left the other two behind. Each tool keeps only the styles
 * unique to it; everything here reads from `useToolStyles()`.
 */

import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "./ThemeProvider";
import { useDensity } from "./DensityProvider";
import type { ThemeColors } from "./themes";
import type { DensityTokens } from "./density";

export const makeToolStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    /* Collapsible tool header */
    toolHeader: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: tokens.radius,
      paddingVertical: tokens.pad,
      paddingHorizontal: tokens.pad + 2,
      marginBottom: tokens.gapSm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    toolTitle: {
      fontSize: scale(16),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    toolHint: {
      fontSize: 12,
      color: colors.textMuted,
    },
    toolChevron: {
      fontSize: 18,
      color: colors.textMuted,
      fontWeight: "600",
      marginLeft: 12,
    },
    toolBody: {
      gap: tokens.gapSm,
    },

    /* Section card */
    efCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 16,
      gap: 8,
    },
    efSectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    efAutoHint: {
      fontSize: 12,
      color: colors.textDim,
    },

    /* Inputs */
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: scale(15),
      color: colors.text,
    },
    inputRow: {
      flexDirection: "row",
      gap: 10,
    },
    inputHalf: {
      flex: 1,
      gap: 4,
    },
    inputLabel: {
      fontSize: 12,
      color: colors.textDim,
      fontWeight: "500",
    },

    /* Selectable chips */
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: "center",
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}15`,
    },
    chipText: {
      fontSize: scale(13),
      color: colors.text,
      fontWeight: "600",
    },
    chipTextActive: {
      color: colors.accent,
    },

    /* Slider group (see components/SliderRow) */
    slidersCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad + 2,
      gap: tokens.gapLg,
    },
    sliderGroup: {
      gap: 8,
    },
    sliderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sliderLabel: {
      fontSize: 13,
      color: colors.textDim,
      fontWeight: "500",
    },
    sliderValue: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    sliderValueDisplay: {
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minWidth: 90,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    sliderValueInput: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minWidth: 90,
      textAlign: "right",
      textAlignVertical: "center",
    },
    sliderValueInputActive: {
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.bg,
    },
    sliderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sliderBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    sliderBtnText: {
      fontSize: 20,
      color: colors.text,
      fontWeight: "600",
      lineHeight: 22,
    },
    sliderBtnDisabled: {
      opacity: 0.2,
    },

    /* Result / breakdown / summary blocks shared by the calculators */
    resultCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: tokens.radius + 4,
      padding: tokens.padLg,
      alignItems: "center",
    },
    resultLabel: {
      fontSize: scale(10),
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    resultValue: {
      fontSize: scale(32),
      fontWeight: "700",
      color: colors.accent,
      fontVariant: ["tabular-nums"],
      marginBottom: 4,
    },
    resultSub: {
      fontSize: 13,
      color: colors.textDim,
      textAlign: "center",
    },
    insightCard: {
      backgroundColor: `${colors.accent}10`,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    insightText: {
      fontSize: 13,
      color: colors.textDim,
      textAlign: "center",
      lineHeight: 18,
    },
    presetRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    presetBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    presetBtnActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    presetBtnText: {
      fontSize: 13,
      color: colors.textDim,
      fontWeight: "600",
    },
    presetBtnTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    breakdownCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 18,
    },
    breakdownTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 14,
    },
    breakdownRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    breakdownItem: {
      flex: 1,
      alignItems: "center",
    },
    breakdownValue: {
      fontSize: 18,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      marginBottom: 4,
    },
    breakdownLabel: {
      fontSize: 12,
      color: colors.textDim,
    },
    breakdownDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.cardBorder,
    },
    ratioBar: {
      flexDirection: "row",
      height: 8,
      borderRadius: tokens.radiusPill,
      overflow: "hidden",
      marginTop: 16,
    },
    ratioFillContrib: {
      height: "100%",
      backgroundColor: colors.success,
    },
    ratioFillInterest: {
      height: "100%",
      backgroundColor: colors.accent,
    },
    ratioText: {
      fontSize: 12,
      color: colors.textDim,
      textAlign: "center",
      marginTop: 10,
    },
    refiEmptyText: {
      fontSize: 13,
      color: colors.textMuted,
      paddingVertical: 8,
    },
    refiSummaryRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    refiSummaryItem: {
      flex: 1,
      alignItems: "center",
    },
    refiSummaryLabel: {
      fontSize: 11,
      color: colors.textDim,
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    refiSummaryValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    efTimeEstimate: {
      fontSize: scale(12),
      color: colors.textMuted,
      textAlign: "center",
    },
  });
};

export type ToolStyles = ReturnType<typeof makeToolStyles>;

/** The shared calculator styles for the current theme + density. */
export const useToolStyles = (): ToolStyles => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  return useMemo(() => makeToolStyles(colors, tokens), [colors, tokens]);
};
