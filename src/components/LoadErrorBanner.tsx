/**
 * BudgetArk - Load error banner
 * File: src/components/LoadErrorBanner.tsx
 *
 * Shown at the top of a tab when its read from device storage failed (the
 * storage timeout on a near-full phone, a decrypt failure). Without it a
 * failed read is indistinguishable from "you have no data": the tab just
 * renders empty, which reads as everything being gone, with no way to try
 * again short of leaving the tab. The banner says what happened, says that
 * nothing was deleted, and offers the retry.
 *
 * One shared component so Debts, Budget and Bridge word it identically.
 */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";

type LoadErrorBannerProps = {
  /** Re-run the tab's loader. */
  onRetry: () => void;
  /** Safe-area top inset; the banner sits above the tab's own header. */
  topInset: number;
};

const LoadErrorBanner: React.FC<LoadErrorBannerProps> = ({ onRetry, topInset }) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.banner,
        {
          marginTop: topInset + 8,
          marginHorizontal: tokens.pad,
          padding: tokens.pad,
          borderRadius: tokens.radius,
          backgroundColor: colors.card,
          borderColor: colors.danger,
        },
      ]}
      accessibilityRole="alert"
    >
      <Text style={[styles.message, { color: colors.text }]}>
        {t("common.loadError.message")}
      </Text>
      <TouchableOpacity
        style={[styles.retry, { borderColor: colors.accent, borderRadius: tokens.radiusSm }]}
        onPress={onRetry}
        accessibilityRole="button"
      >
        <Text style={[styles.retryText, { color: colors.accent }]}>
          {t("common.loadError.retry")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    gap: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 16,
    borderWidth: 1,
    justifyContent: "center",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

export default LoadErrorBanner;
