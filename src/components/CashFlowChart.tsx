/**
 * BudgetArk - CashFlowChart
 * File: src/components/CashFlowChart.tsx
 *
 * Monthly income-vs-expense grouped bars with a "net wick" connecting the
 * two tops and a net trend line across months — the candlestick-style cash
 * flow panel from the ui concept. Presentational only; the caller derives
 * the monthly series.
 */

import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import type { ThemeColors } from "../theme/themes";
import { useDensity } from "../theme/DensityProvider";
import type { DensityTokens } from "../theme/density";

export type CashFlowPoint = {
  label: string;
  income: number;
  expense: number;
};

type CashFlowChartProps = {
  data: CashFlowPoint[];
  colors: ThemeColors;
  formatCompactCurrency: (value: number) => string;
};

const H = 168;
const PAD_T = 14;
const PAD_B = 22;
const CHART_H = H - PAD_T - PAD_B;

const CashFlowChart: React.FC<CashFlowChartProps> = ({
  data,
  colors,
  formatCompactCurrency,
}) => {
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(260, Math.min(340, windowWidth - 64));

  const model = useMemo(() => {
    if (data.length === 0) return null;
    const maxVal = Math.max(
      1,
      ...data.map((d) => Math.max(d.income, d.expense))
    );
    // Round the ceiling up so bars never touch the top edge.
    const ceil = maxVal * 1.12;
    const groupW = chartWidth / data.length;
    const barW = Math.min(16, groupW * 0.28);
    const gap = Math.max(2, barW * 0.25);

    const toY = (v: number) => PAD_T + CHART_H - (v / ceil) * CHART_H;

    const groups = data.map((d, i) => {
      const cx = groupW * i + groupW / 2;
      const incomeY = toY(d.income);
      const expenseY = toY(d.expense);
      return {
        label: d.label,
        cx,
        incomeX: cx - barW - gap / 2,
        expenseX: cx + gap / 2,
        incomeY,
        expenseY,
        barW,
        netY: (incomeY + expenseY) / 2,
      };
    });

    const baseY = PAD_T + CHART_H;
    const netPath = groups
      .map((g, i) => `${i === 0 ? "M" : "L"}${g.cx},${g.netY}`)
      .join(" ");

    return { groups, baseY, ceil, netPath };
  }, [data, chartWidth]);

  return (
    <View style={styles.card}>
      <View style={styles.topHairline} />
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Monthly Cash Flow</Text>
          <Text style={styles.subtitle}>Income vs Expenses</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>In</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendText}>Out</Text>
          </View>
        </View>
      </View>

      {model ? (
        <View style={styles.chartWrap}>
          <Svg width={chartWidth} height={H}>
            <Defs>
              <LinearGradient id="cfIncome" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.success} stopOpacity={0.6} />
                <Stop offset="1" stopColor={colors.success} stopOpacity={0.12} />
              </LinearGradient>
              <LinearGradient id="cfExpense" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.warning} stopOpacity={0.55} />
                <Stop offset="1" stopColor={colors.warning} stopOpacity={0.1} />
              </LinearGradient>
            </Defs>

            {[0, 1, 2, 3].map((i) => {
              const y = PAD_T + (CHART_H / 3) * i;
              return (
                <Line
                  key={i}
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke={colors.cardBorder}
                  strokeWidth={1}
                  opacity={0.5}
                />
              );
            })}

            {model.groups.map((g) => (
              <React.Fragment key={g.label}>
                <Rect
                  x={g.incomeX}
                  y={g.incomeY}
                  width={g.barW}
                  height={Math.max(0, model.baseY - g.incomeY)}
                  rx={3}
                  fill="url(#cfIncome)"
                />
                <Rect
                  x={g.incomeX}
                  y={g.incomeY}
                  width={g.barW}
                  height={2}
                  fill={colors.success}
                />
                <Rect
                  x={g.expenseX}
                  y={g.expenseY}
                  width={g.barW}
                  height={Math.max(0, model.baseY - g.expenseY)}
                  rx={3}
                  fill="url(#cfExpense)"
                />
                <Rect
                  x={g.expenseX}
                  y={g.expenseY}
                  width={g.barW}
                  height={2}
                  fill={colors.warning}
                />
                <Line
                  x1={g.cx}
                  y1={g.incomeY}
                  x2={g.cx}
                  y2={g.expenseY}
                  stroke={colors.textDim}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.4}
                />
              </React.Fragment>
            ))}

            <Path
              d={model.netPath}
              stroke={colors.accent}
              strokeWidth={1.5}
              fill="none"
              opacity={0.5}
            />
            {model.groups.map((g) => (
              <Circle
                key={`${g.label}-net`}
                cx={g.cx}
                cy={g.netY}
                r={2}
                fill={colors.accent}
              />
            ))}
          </Svg>
          <View style={[styles.xLabels, { width: chartWidth }]}>
            {model.groups.map((g) => (
              <Text key={g.label} style={styles.xLabel}>
                {g.label}
              </Text>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            Add a few months of income and expenses to see cash flow.
          </Text>
        </View>
      )}
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius + 2,
      padding: tokens.pad,
      marginBottom: tokens.gap,
      overflow: "hidden",
    },
    topHairline: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.accent,
      opacity: 0.18,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    title: {
      fontSize: scale(15),
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      fontSize: scale(11),
      color: colors.textDim,
      marginTop: 2,
    },
    legendRow: {
      flexDirection: "row",
      gap: 12,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    legendDot: {
      width: 7,
      height: 7,
      borderRadius: 2,
    },
    legendText: {
      fontSize: scale(10),
      color: colors.textDim,
      fontWeight: "600",
    },
    chartWrap: {
      alignItems: "center",
    },
    xLabels: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 2,
    },
    xLabel: {
      fontSize: scale(9),
      color: colors.textMuted,
      fontVariant: ["tabular-nums"] as any,
    },
    emptyWrap: {
      paddingVertical: 28,
      alignItems: "center",
    },
    emptyText: {
      fontSize: scale(12),
      color: colors.textDim,
      textAlign: "center",
    },
  });
};

export default React.memo(CashFlowChart);
