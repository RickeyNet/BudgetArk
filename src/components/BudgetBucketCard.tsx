import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  BUDGET_BUCKET_LABELS,
  BUDGET_BUCKET_ORDER,
  BUDGET_BUCKET_TARGETS,
} from "../data/categoryBuckets";
import type { BudgetBucket } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  clamp01,
  pctOfIncome,
  targetForBucket,
  varianceForBucket,
} from "../utils/budgetBucketMath";

export interface BucketCategoryRowItem {
  category: string;
  amount: number;
  hasOverride: boolean;
}

interface BudgetBucketCardProps {
  takeHomeIncome: number;
  bucketTotals: Record<BudgetBucket, number>;
  categoriesByBucket: Record<BudgetBucket, BucketCategoryRowItem[]>;
  formatCurrency: (value: number) => string;
  onLongPressCategory: (category: string) => void;
}

const BudgetBucketCard: React.FC<BudgetBucketCardProps> = ({
  takeHomeIncome,
  bucketTotals,
  categoriesByBucket,
  formatCurrency,
  onLongPressCategory,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const [expandedBucket, setExpandedBucket] = useState<BudgetBucket | null>(null);

  if (takeHomeIncome <= 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>50/30/20</Text>
          <Text style={styles.takeHomeLabel}>Take-home this month: {formatCurrency(0)}</Text>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Add income to see the 50/30/20 split</Text>
          <Text style={styles.emptySubtext}>Log Salary or Freelance income for this month.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>50/30/20</Text>
        <Text style={styles.takeHomeLabel}>
          Take-home this month: {formatCurrency(takeHomeIncome)}
        </Text>
      </View>

      {BUDGET_BUCKET_ORDER.map((bucket) => {
        const actualAmount = bucketTotals[bucket] ?? 0;
        const targetAmount = targetForBucket(bucket, takeHomeIncome);
        const actualPct = pctOfIncome(actualAmount, takeHomeIncome);
        const targetPct = BUDGET_BUCKET_TARGETS[bucket] * 100;
        const ratio = targetAmount > 0 ? actualAmount / targetAmount : 0;
        const variance = varianceForBucket(actualAmount, targetAmount);
        const isExpanded = expandedBucket === bucket;
        const categories = categoriesByBucket[bucket] ?? [];

        const barColor =
          ratio > 1.02
            ? colors.warning
            : ratio >= 0.85
              ? colors.accent
              : colors.success;

        const varianceText =
          Math.abs(variance) < 0.01
            ? `On target for ${BUDGET_BUCKET_LABELS[bucket]}`
            : `${formatCurrency(Math.abs(variance))} ${
                variance > 0 ? "over" : "under"
              } target on ${BUDGET_BUCKET_LABELS[bucket]}`;

        return (
          <View key={bucket}>
            <TouchableOpacity
              style={styles.bucketRow}
              activeOpacity={0.75}
              onPress={() => setExpandedBucket(isExpanded ? null : bucket)}
            >
              <View style={styles.rowTop}>
                <View style={styles.rowTopLeft}>
                  <Text style={styles.bucketLabel}>{BUDGET_BUCKET_LABELS[bucket]}</Text>
                  <View style={styles.targetChip}>
                    <Text style={styles.targetChipText}>{Math.round(targetPct)}% target</Text>
                  </View>
                </View>
                <Text style={styles.actualPct}>{actualPct.toFixed(0)}%</Text>
              </View>

              <View style={styles.rowMid}>
                <Text style={styles.actualAmount}>{formatCurrency(actualAmount)}</Text>
                <Text style={styles.expandHint}>{isExpanded ? "Hide" : "Show"}</Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${clamp01(ratio) * 100}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.variance,
                  { color: variance > 0 ? colors.warning : colors.success },
                ]}
              >
                {varianceText}
              </Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.expandedList}>
                {categories.length === 0 ? (
                  <Text style={styles.emptyBucketText}>No spending in this bucket this month.</Text>
                ) : (
                  categories.map((item) => (
                    <TouchableOpacity
                      key={item.category}
                      style={styles.expandedRow}
                      activeOpacity={0.8}
                      delayLongPress={280}
                      onLongPress={() => onLongPressCategory(item.category)}
                    >
                      <Text style={styles.expandedName} numberOfLines={1}>
                        {item.category}
                        {item.hasOverride ? " (override)" : ""}
                      </Text>
                      <View style={styles.expandedRight}>
                        <Text style={styles.expandedAmount}>{formatCurrency(item.amount)}</Text>
                        <Text style={styles.expandedPct}>
                          {pctOfIncome(item.amount, takeHomeIncome).toFixed(0)}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
                <Text style={styles.expandedHint}>Long-press a category to reassign its bucket.</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) =>
  StyleSheet.create({
    card: {
      marginTop: tokens.gapSm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      overflow: "hidden",
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      gap: 10,
    },
    title: {
      fontSize: Math.round(18 * tokens.fontScale),
      fontWeight: "800",
      color: colors.text,
    },
    takeHomeLabel: {
      fontSize: 12,
      color: colors.textDim,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
      flexShrink: 1,
      textAlign: "right",
    },
    emptyWrap: {
      paddingVertical: 14,
      alignItems: "center",
    },
    emptyTitle: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 14,
      marginBottom: 4,
    },
    emptySubtext: {
      color: colors.textDim,
      fontSize: 12,
      textAlign: "center",
    },
    bucketRow: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingVertical: 10,
      gap: 6,
    },
    rowTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    rowTopLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 1,
    },
    bucketLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    targetChip: {
      borderWidth: 1,
      borderColor: `${colors.accent}55`,
      backgroundColor: `${colors.accent}1f`,
      borderRadius: tokens.radiusPill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    targetChipText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "700",
    },
    actualPct: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    rowMid: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    actualAmount: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    expandHint: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "600",
    },
    progressTrack: {
      height: 8,
      borderRadius: tokens.radiusPill,
      overflow: "hidden",
      backgroundColor: `${colors.textMuted}33`,
    },
    progressFill: {
      height: "100%",
      borderRadius: tokens.radiusPill,
      minWidth: 2,
    },
    variance: {
      fontSize: 11,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    expandedList: {
      backgroundColor: colors.bg,
      borderRadius: tokens.radiusSm,
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginBottom: 10,
      gap: 6,
    },
    emptyBucketText: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    expandedRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingVertical: 4,
    },
    expandedName: {
      color: colors.text,
      fontSize: 13,
      flex: 1,
    },
    expandedRight: {
      alignItems: "flex-end",
      minWidth: 96,
    },
    expandedAmount: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    expandedPct: {
      color: colors.textMuted,
      fontSize: 11,
      fontVariant: ["tabular-nums"],
    },
    expandedHint: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
  });

export default React.memo(BudgetBucketCard);
