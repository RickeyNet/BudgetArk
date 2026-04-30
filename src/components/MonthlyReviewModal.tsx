import React, { useMemo } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import SparklineChart from "./SparklineChart";
import type { MonthlyReviewData } from "../utils/budgetInsights";

interface MonthlyReviewModalProps {
  visible: boolean;
  onClose: () => void;
  data: MonthlyReviewData | null;
}

const SHORT_MONTH: Record<string, string> = {};
const formatShortMonth = (monthKey: string): string => {
  if (SHORT_MONTH[monthKey]) return SHORT_MONTH[monthKey];
  const d = new Date(`${monthKey}-01T00:00:00`);
  const label = d.toLocaleDateString(undefined, { month: "short" });
  SHORT_MONTH[monthKey] = label;
  return label;
};

const formatFullMonth = (monthKey: string): string => {
  const d = new Date(`${monthKey}-01T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

const MonthlyReviewModal: React.FC<MonthlyReviewModalProps> = ({
  visible,
  onClose,
  data,
}) => {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!data) return null;

  const {
    summaries,
    categoryChanges,
    streaks,
    avgMonthlySpending,
    currentMonthSpending,
    spendingVsAvgPercent,
  } = data;

  const currentMonth =
    summaries.length > 0
      ? formatFullMonth(summaries[summaries.length - 1].monthKey)
      : "";

  const chartData = summaries
    .filter((s) => s.totalExpenses > 0 || s.totalIncome > 0)
    .map((s) => ({
      label: formatShortMonth(s.monthKey),
      value: s.totalExpenses,
    }));

  const incomeChartData = summaries
    .filter((s) => s.totalExpenses > 0 || s.totalIncome > 0)
    .map((s) => ({
      label: formatShortMonth(s.monthKey),
      value: s.net,
    }));

  const hasChartData = chartData.length >= 1;
  const hasChanges = categoryChanges.length > 0;
  const hasStreaks = streaks.length > 0;

  const isEmpty = !hasChartData && !hasChanges && !hasStreaks;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Monthly Review</Text>
              <Text style={styles.subtitle}>{currentMonth}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          {isEmpty ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Not enough data yet</Text>
              <Text style={styles.emptySubtext}>
                Add budget entries for at least 2 months to see trends, category
                changes, and streaks.
              </Text>
            </View>
          ) : (
            <>
              {/* Spending vs Average callout */}
              {spendingVsAvgPercent != null && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>This Month vs. Average</Text>
                  <View style={styles.vsRow}>
                    <View style={styles.vsStat}>
                      <Text style={styles.vsLabel}>This month</Text>
                      <Text
                        style={[
                          styles.vsValue,
                          {
                            color:
                              currentMonthSpending > avgMonthlySpending
                                ? colors.warning
                                : colors.success,
                          },
                        ]}
                      >
                        {formatCurrency(currentMonthSpending)}
                      </Text>
                    </View>
                    <View style={styles.vsStat}>
                      <Text style={styles.vsLabel}>Avg / month</Text>
                      <Text style={[styles.vsValue, { color: colors.textDim }]}>
                        {formatCurrency(avgMonthlySpending)}
                      </Text>
                    </View>
                    <View style={styles.vsStat}>
                      <Text style={styles.vsLabel}>Change</Text>
                      <Text
                        style={[
                          styles.vsValue,
                          {
                            color:
                              spendingVsAvgPercent > 0
                                ? colors.warning
                                : colors.success,
                          },
                        ]}
                      >
                        {spendingVsAvgPercent > 0 ? "+" : ""}
                        {spendingVsAvgPercent.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Spending trend chart */}
              {hasChartData && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Spending Trend</Text>
                  <SparklineChart
                    data={chartData}
                    width={320}
                    height={150}
                    lineColor={colors.warning}
                    dotColor={colors.warning}
                    labelColor={colors.textMuted}
                    gridColor={colors.cardBorder}
                    fillColor={colors.warningDim}
                  />
                </View>
              )}

              {/* Net income trend */}
              {hasChartData && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Net Income Trend</Text>
                  <SparklineChart
                    data={incomeChartData}
                    width={320}
                    height={150}
                    lineColor={colors.success}
                    dotColor={colors.success}
                    labelColor={colors.textMuted}
                    gridColor={colors.cardBorder}
                    fillColor={colors.successDim}
                  />
                </View>
              )}

              {/* Streaks */}
              {hasStreaks && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Streaks</Text>
                  {streaks.map((streak, i) => (
                    <View key={i} style={styles.streakRow}>
                      <View
                        style={[
                          styles.streakBadge,
                          {
                            backgroundColor:
                              streak.type === "positive"
                                ? colors.successDim
                                : colors.warningDim,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.streakBadgeText,
                            {
                              color:
                                streak.type === "positive"
                                  ? colors.success
                                  : colors.warning,
                            },
                          ]}
                        >
                          {streak.count} mo
                        </Text>
                      </View>
                      <Text style={styles.streakLabel}>{streak.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Category changes */}
              {hasChanges && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Category Changes</Text>
                  <Text style={styles.cardHint}>vs. previous month</Text>
                  {categoryChanges.map((change) => {
                    const isUp = change.delta > 0;
                    const isNew = change.previous === 0 && change.current > 0;
                    const isGone = change.current === 0 && change.previous > 0;
                    const changeColor = isUp ? colors.warning : colors.success;

                    return (
                      <View key={change.category} style={styles.changeRow}>
                        <View style={styles.changeLeft}>
                          <Text style={styles.changeCategory}>
                            {change.category}
                          </Text>
                          <Text
                            style={[styles.changeAmount, { color: colors.textDim }]}
                          >
                            {formatCurrency(change.current)}
                          </Text>
                        </View>
                        <View style={styles.changeRight}>
                          {isNew ? (
                            <Text style={[styles.changeDelta, { color: colors.accent }]}>
                              New
                            </Text>
                          ) : isGone ? (
                            <Text style={[styles.changeDelta, { color: colors.textMuted }]}>
                              Stopped
                            </Text>
                          ) : (
                            <>
                              <Text
                                style={[styles.changeDelta, { color: changeColor }]}
                              >
                                {isUp ? "+" : ""}
                                {formatCurrency(change.delta)}
                              </Text>
                              {change.percentChange != null && (
                                <Text
                                  style={[
                                    styles.changePercent,
                                    { color: changeColor },
                                  ]}
                                >
                                  {isUp ? "+" : ""}
                                  {change.percentChange.toFixed(0)}%
                                </Text>
                              )}
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingTop: 56,
      paddingBottom: 20,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
    },
    closeBtn: {
      marginTop: 4,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    closeBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.accent,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 18,
      marginBottom: 14,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    cardHint: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: -8,
      marginBottom: 12,
    },
    /* vs avg */
    vsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    vsStat: {
      flex: 1,
    },
    vsLabel: {
      fontSize: 11,
      color: colors.textDim,
      marginBottom: 3,
    },
    vsValue: {
      fontSize: 15,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    /* streaks */
    streakRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
    },
    streakBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      minWidth: 52,
      alignItems: "center",
    },
    streakBadgeText: {
      fontSize: 13,
      fontWeight: "700",
    },
    streakLabel: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    /* category changes */
    changeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    changeLeft: {
      flex: 1,
      marginRight: 12,
    },
    changeCategory: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "600",
      marginBottom: 2,
    },
    changeAmount: {
      fontSize: 12,
      fontVariant: ["tabular-nums"],
    },
    changeRight: {
      alignItems: "flex-end",
    },
    changeDelta: {
      fontSize: 14,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    changePercent: {
      fontSize: 11,
      fontWeight: "600",
      marginTop: 1,
    },
    /* empty state */
    emptyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 28,
      alignItems: "center",
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
  });

export default React.memo(MonthlyReviewModal);
