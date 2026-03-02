/**
 * BudgetBuddy — Investment Screen
 * File: src/screens/InvestmentScreen.tsx
 *
 * Placeholder screen for the Investments tab.
 * Will be expanded in Phase 3 to include:
 * - Monthly contribution input with "what if" sliders
 * - Compound interest growth projection chart
 * - Investment vs contribution breakdown
 * - Multiple portfolio tracking
 * - Timeline projections (10yr, 20yr, 30yr)
 *
 * Currently displays a styled placeholder with feature previews.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";

const InvestmentScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.titleSection}>
        <Text style={styles.appLabel}>BUDGETBUDDY</Text>
        <Text style={styles.screenTitle}>Investments</Text>
        <Text style={styles.screenSubtitle}>
          Project your wealth growth over time.
        </Text>
      </View>

      {/* ── Coming Soon Card ── */}
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderEmoji}>📈</Text>
        <Text style={styles.placeholderTitle}>Coming Soon</Text>
        <Text style={styles.placeholderText}>
          This screen will include investment tracking, compound interest
          projections, and interactive "what if" sliders to explore different
          contribution scenarios.
        </Text>

        {/* Feature preview pills */}
        <View style={styles.featureRow}>
          {[
            "Growth Projections",
            "What-If Sliders",
            "Portfolio Tracking",
          ].map((feature) => (
            <View key={feature} style={styles.featurePill}>
              <Text style={styles.featurePillText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Quick Preview: Compound Interest Teaser ── */}
      <View style={styles.teaserCard}>
        <Text style={styles.teaserLabel}>QUICK PREVIEW</Text>
        <Text style={styles.teaserTitle}>The Power of Compound Interest</Text>
        <View style={styles.teaserRow}>
          <View style={styles.teaserStat}>
            <Text style={styles.teaserValue}>$500/mo</Text>
            <Text style={styles.teaserCaption}>Contribution</Text>
          </View>
          <View style={styles.teaserArrow}>
            <Text style={styles.teaserArrowText}>→</Text>
          </View>
          <View style={styles.teaserStat}>
            <Text style={[styles.teaserValue, { color: colors.success }]}>
              $379,684
            </Text>
            <Text style={styles.teaserCaption}>After 20 years @ 7%</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: colors.bg,
  },
  titleSection: {
    paddingTop: 56,
    paddingBottom: 20,
  },
  appLabel: {
    fontSize: 12,
    color: colors.textDim,
    letterSpacing: 2,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  placeholderCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textDim,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  featurePill: {
  backgroundColor: `${colors.accent}20`,
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 20,
  },
  featurePillText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "600",
  },

  /* Compound Interest Teaser */
  teaserCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: `${colors.success}20`,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  teaserLabel: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  teaserTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  teaserRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teaserStat: {
    alignItems: "center",
    flex: 1,
  },
  teaserValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    marginBottom: 2,
  },
  teaserCaption: {
    fontSize: 11,
    color: colors.textDim,
  },
  teaserArrow: {
    paddingHorizontal: 8,
  },
  teaserArrowText: {
    fontSize: 20,
    color: colors.textMuted,
  },
});

export default InvestmentScreen;
