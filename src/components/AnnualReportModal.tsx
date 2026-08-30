/**
 * BudgetArk - Annual Financial Report
 * File: src/components/AnnualReportModal.tsx
 *
 * Full-screen modal summarizing one calendar year: debt paid, money set
 * aside, net-worth change, top spending category, and months under budget.
 * Year is selectable (any year that has data). A "Share summary" button
 * sends an aggregates-only text recap via the OS share sheet - no PII.
 *
 * Loads its own storage on open (mirrors AchievementsScreen), so the host
 * screen only has to toggle `visible`.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import SparklineChart from "./SparklineChart";
import { getBudgetEntries, getAllLimitsByMonth } from "../storage/budgetStorage";
import { getPayments } from "../storage/debtStorage";
import { getNetWorthSnapshots } from "../storage/netWorthSnapshotStorage";
import {
  buildAnnualReport,
  listReportYears,
  formatAnnualReportShareText,
  type AnnualReportData,
} from "../utils/annualReport";

interface AnnualReportModalProps {
  visible: boolean;
  onClose: () => void;
}

const AnnualReportModal: React.FC<AnnualReportModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [years, setYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [report, setReport] = useState<AnnualReportData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load all source data once per open, recompute the selected year locally.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    (async () => {
      try {
        const [entries, payments, snapshots, limitsByMonth] = await Promise.all([
          getBudgetEntries(),
          getPayments(),
          getNetWorthSnapshots(),
          getAllLimitsByMonth(),
        ]);
        if (cancelled) return;

        const availableYears = listReportYears({ entries, payments, snapshots });
        const year = availableYears.includes(selectedYear)
          ? selectedYear
          : availableYears[0];

        setYears(availableYears);
        setSelectedYear(year);
        setReport(
          buildAnnualReport(year, { entries, payments, snapshots, limitsByMonth })
        );
        setIsLoaded(true);
      } catch (error) {
        if (cancelled) return;
        if (__DEV__) console.warn("Annual report load failed:", error);
        setReport(null);
        setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // selectedYear is intentionally excluded - year switches recompute via
    // handleSelectYear below without re-reading storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSelectYear = useCallback(async (year: number) => {
    setSelectedYear(year);
    try {
      const [entries, payments, snapshots, limitsByMonth] = await Promise.all([
        getBudgetEntries(),
        getPayments(),
        getNetWorthSnapshots(),
        getAllLimitsByMonth(),
      ]);
      setReport(
        buildAnnualReport(year, { entries, payments, snapshots, limitsByMonth })
      );
    } catch (error) {
      if (__DEV__) console.warn("Annual report year switch failed:", error);
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!report) return;
    try {
      await Share.share({
        message: formatAnnualReportShareText(report, formatCurrency),
      });
    } catch (error) {
      if (__DEV__) console.warn("Annual report share failed:", error);
    }
  }, [report, formatCurrency]);

  const netWorthChange = report?.netWorth.change ?? null;
  const netWorthColor =
    netWorthChange == null
      ? colors.textDim
      : netWorthChange >= 0
        ? colors.success
        : colors.danger;

  const chartData = report?.monthlySpending ?? [];
  const hasChart = chartData.some((p) => p.value > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.title}>Annual Report</Text>
              <Text style={styles.subtitle}>Your {selectedYear} in review</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close annual report"
            >
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Year picker */}
          {years.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearRow}
            >
              {years.map((year) => {
                const isSelected = year === selectedYear;
                return (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearChip,
                      {
                        borderColor: isSelected
                          ? colors.accent
                          : colors.cardBorder,
                        backgroundColor: isSelected
                          ? `${colors.accent}20`
                          : colors.card,
                      },
                    ]}
                    onPress={() => handleSelectYear(year)}
                  >
                    <Text
                      style={[
                        styles.yearChipText,
                        { color: isSelected ? colors.accent : colors.textDim },
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {!isLoaded ? null : !report || !report.hasData ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nothing logged for {selectedYear}</Text>
              <Text style={styles.emptySubtext}>
                Add budget entries, record debt payments, or track accounts and
                your {selectedYear} report will fill in automatically.
              </Text>
            </View>
          ) : (
            <>
              {/* Headline stat tiles */}
              <View style={styles.tileGrid}>
                <View style={styles.tile}>
                  <Text style={styles.tileLabel}>Debt paid</Text>
                  <Text style={[styles.tileValue, { color: colors.success }]}>
                    {formatCurrency(report.debtPaid)}
                  </Text>
                  <Text style={styles.tileHint}>
                    {report.paymentCount}{" "}
                    {report.paymentCount === 1 ? "payment" : "payments"}
                  </Text>
                </View>

                <View style={styles.tile}>
                  <Text style={styles.tileLabel}>Set aside</Text>
                  <Text style={[styles.tileValue, { color: colors.teal }]}>
                    {formatCurrency(report.totalContributed)}
                  </Text>
                  <Text style={styles.tileHint}>Savings · Retire · Invest</Text>
                </View>

                <View style={styles.tile}>
                  <Text style={styles.tileLabel}>Net worth change</Text>
                  <Text style={[styles.tileValue, { color: netWorthColor }]}>
                    {netWorthChange == null
                      ? "-"
                      : `${netWorthChange >= 0 ? "+" : "−"}${formatCurrency(
                          Math.abs(netWorthChange)
                        )}`}
                  </Text>
                  <Text style={styles.tileHint}>
                    {netWorthChange == null
                      ? "Not enough history"
                      : "Start vs. end of year"}
                  </Text>
                </View>

                <View style={styles.tile}>
                  <Text style={styles.tileLabel}>Savings rate</Text>
                  <Text
                    style={[
                      styles.tileValue,
                      {
                        color:
                          report.savingsRate == null
                            ? colors.textDim
                            : report.savingsRate >= 0
                              ? colors.success
                              : colors.danger,
                      },
                    ]}
                  >
                    {report.savingsRate == null
                      ? "-"
                      : `${Math.round(report.savingsRate)}%`}
                  </Text>
                  <Text style={styles.tileHint}>Income kept, not spent</Text>
                </View>
              </View>

              {/* Cash flow */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Cash Flow</Text>
                <View style={styles.flowRow}>
                  <Text style={styles.flowLabel}>Income</Text>
                  <Text style={[styles.flowValue, { color: colors.success }]}>
                    {formatCurrency(report.totalIncome)}
                  </Text>
                </View>
                <View style={styles.flowRow}>
                  <Text style={styles.flowLabel}>Expenses</Text>
                  <Text style={[styles.flowValue, { color: colors.warning }]}>
                    {formatCurrency(report.totalExpenses)}
                  </Text>
                </View>
                <View style={[styles.flowRow, styles.flowRowLast]}>
                  <Text style={[styles.flowLabel, styles.flowLabelStrong]}>
                    Net saved
                  </Text>
                  <Text
                    style={[
                      styles.flowValue,
                      styles.flowValueStrong,
                      {
                        color:
                          report.netSaved >= 0 ? colors.success : colors.danger,
                      },
                    ]}
                  >
                    {report.netSaved >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(report.netSaved))}
                  </Text>
                </View>
              </View>

              {/* Months under budget */}
              {report.monthsWithLimits > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Months Under Budget</Text>
                  <Text style={styles.bigStat}>
                    {report.monthsUnderBudget}
                    <Text style={styles.bigStatDen}>
                      {" "}
                      / {report.monthsWithLimits}
                    </Text>
                  </Text>
                  <Text style={styles.cardHint}>
                    Months where every category with a limit stayed under it.
                    A full year of limits is kept, so the current year is
                    fully covered; older years may have aged-out limits.
                  </Text>
                </View>
              )}

              {/* Top spending categories */}
              {report.topCategories.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Top Spending Categories</Text>
                  {report.topCategories.map((cat, i) => {
                    const max = report.topCategories[0].amount || 1;
                    const pct = Math.max(4, (cat.amount / max) * 100);
                    return (
                      <View key={cat.category} style={styles.catRow}>
                        <View style={styles.catHeader}>
                          <Text style={styles.catName}>
                            {i === 0 ? "🏆 " : ""}
                            {cat.category}
                          </Text>
                          <Text style={styles.catAmount}>
                            {formatCurrency(cat.amount)}
                          </Text>
                        </View>
                        <View style={styles.catTrack}>
                          <View
                            style={[
                              styles.catFill,
                              {
                                width: `${pct}%`,
                                backgroundColor:
                                  i === 0 ? colors.accent : colors.cardBorder,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Monthly spending trend */}
              {hasChart && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Spending by Month</Text>
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

              {/* Share */}
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share annual summary"
              >
                <Text style={styles.shareBtnText}>Share summary</Text>
              </TouchableOpacity>
              <Text style={styles.shareNote}>
                Shares totals and percentages only - no names or details.
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      paddingHorizontal: tokens.pad,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingTop: 16,
      paddingBottom: tokens.gap,
    },
    headerTextBlock: {
      flex: 1,
      marginRight: 12,
    },
    title: {
      fontSize: scale(26),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: scale(14),
      color: colors.textMuted,
    },
    closeBtn: {
      marginTop: 4,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: tokens.radiusSm + 2,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    closeBtnText: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.accent,
    },
    yearRow: {
      gap: tokens.gapSm + 2,
      paddingBottom: tokens.gap,
    },
    yearChip: {
      borderWidth: 1,
      borderRadius: tokens.radiusPill,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    yearChipText: {
      fontSize: scale(13),
      fontWeight: "700",
    },
    tileGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.gapSm + 4,
      marginBottom: tokens.gap,
    },
    tile: {
      flexGrow: 1,
      flexBasis: "46%",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
    },
    tileLabel: {
      fontSize: scale(11),
      color: colors.textDim,
      marginBottom: 6,
      letterSpacing: 0.3,
    },
    tileValue: {
      fontSize: scale(20),
      fontWeight: "700",
      fontVariant: ["tabular-nums"] as any,
    },
    tileHint: {
      fontSize: scale(11),
      color: colors.textMuted,
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gap,
    },
    cardTitle: {
      fontSize: scale(16),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    cardHint: {
      fontSize: scale(11),
      color: colors.textMuted,
      marginTop: 8,
      lineHeight: scale(16),
    },
    flowRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    flowRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    flowLabel: {
      fontSize: scale(14),
      color: colors.textDim,
    },
    flowLabelStrong: {
      color: colors.text,
      fontWeight: "700",
    },
    flowValue: {
      fontSize: scale(15),
      fontWeight: "600",
      fontVariant: ["tabular-nums"] as any,
    },
    flowValueStrong: {
      fontSize: scale(17),
      fontWeight: "700",
    },
    bigStat: {
      fontSize: scale(34),
      fontWeight: "800",
      color: colors.text,
      fontVariant: ["tabular-nums"] as any,
    },
    bigStatDen: {
      fontSize: scale(20),
      fontWeight: "600",
      color: colors.textDim,
    },
    catRow: {
      marginBottom: 12,
    },
    catHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 5,
    },
    catName: {
      fontSize: scale(13),
      color: colors.text,
      fontWeight: "600",
      flex: 1,
      marginRight: 8,
    },
    catAmount: {
      fontSize: scale(13),
      color: colors.textDim,
      fontWeight: "600",
      fontVariant: ["tabular-nums"] as any,
    },
    catTrack: {
      height: 6,
      backgroundColor: colors.bg,
      borderRadius: 3,
      overflow: "hidden",
    },
    catFill: {
      height: "100%",
      borderRadius: 3,
    },
    shareBtn: {
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusSm + 2,
      paddingVertical: tokens.padSm + 2,
      alignItems: "center",
      marginTop: 4,
    },
    shareBtnText: {
      color: colors.white,
      fontSize: scale(15),
      fontWeight: "700",
    },
    shareNote: {
      fontSize: scale(11),
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: 28,
      alignItems: "center",
    },
    emptyTitle: {
      fontSize: scale(16),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: scale(13),
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: scale(20),
    },
  });
};

export default React.memo(AnnualReportModal);
