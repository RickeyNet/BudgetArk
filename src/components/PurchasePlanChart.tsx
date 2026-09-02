/**
 * BudgetArk - Purchase Plan Chart
 * File: src/components/PurchasePlanChart.tsx
 *
 * Stacked cumulative-savings area chart for the Purchase Plans list: one
 * band per plan (bottom = first in the chosen order), stacked so the top
 * edge is everything saved across all plans, month by month, under the
 * list's combined set-aside and allocation. A dashed line marks the
 * combined target and a dot marks the month each plan reaches its own.
 * This is where the rollover method becomes visible: bands fill one after
 * another instead of all at once. Presentational only - the model comes
 * from utils/purchasePlanner.buildSavingsChart.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import type { ThemeColors } from "../theme/themes";
import { useDensity } from "../theme/DensityProvider";
import type { DensityTokens } from "../theme/density";
import type { SavingsChartModel } from "../utils/purchasePlanner";

type PurchasePlanChartProps = {
  model: SavingsChartModel;
  colors: ThemeColors;
  formatCompactCurrency: (value: number) => string;
  /** Label for a month offset from today (0 = now). */
  formatMonth: (monthsFromNow: number) => string;
};

const H = 150;
const PAD_T = 10;
const PAD_B = 6;
const CHART_H = H - PAD_T - PAD_B;

/** Band colours cycle through the theme's accents so every theme stays on-palette. */
const bandColors = (colors: ThemeColors): string[] => [
  colors.accent,
  colors.success,
  colors.teal,
  colors.warning,
  colors.danger,
];

const PurchasePlanChart: React.FC<PurchasePlanChartProps> = ({
  model,
  colors,
  formatCompactCurrency,
  formatMonth,
}) => {
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(240, Math.min(340, windowWidth - 80));
  const palette = bandColors(colors);

  const geometry = useMemo(() => {
    const ceiling = Math.max(model.totalTarget, model.peakTotal, 1);
    const xFor = (month: number) => (month / model.months) * chartWidth;
    const yFor = (value: number) => PAD_T + CHART_H - (value / ceiling) * CHART_H;

    // Stack bottom-up: band i sits on the cumulative total of bands < i.
    const base = new Array<number>(model.months + 1).fill(0);
    const bands = model.series.map((item, index) => {
      const top = base.map((value, m) => value + item.values[m]);
      const upper = top.map((value, m) => `${xFor(m).toFixed(1)},${yFor(value).toFixed(1)}`);
      const lower = base
        .map((value, m) => `${xFor(m).toFixed(1)},${yFor(value).toFixed(1)}`)
        .reverse();
      const d = `M${upper.join(" L")} L${lower.join(" L")} Z`;
      const ready =
        item.readyAtMonth !== null && item.readyAtMonth > 0
          ? { x: xFor(item.readyAtMonth), y: yFor(top[item.readyAtMonth]) }
          : null;
      for (let m = 0; m <= model.months; m++) base[m] = top[m];
      return { goalId: item.goalId, d, ready, color: palette[index % palette.length] };
    });

    return {
      bands,
      targetY: yFor(model.totalTarget),
      showTarget: model.totalTarget > 0 && model.totalTarget <= ceiling,
      ceiling,
    };
  }, [model, chartWidth, palette]);

  const mid = Math.round(model.months / 2);

  return (
    <View style={styles.wrap}>
      <View style={styles.axisRow}>
        <Text style={styles.axisText}>{formatCompactCurrency(geometry.ceiling)}</Text>
        {geometry.showTarget ? (
          <Text style={styles.axisText}>
            {`target ${formatCompactCurrency(model.totalTarget)}`}
          </Text>
        ) : null}
      </View>
      <Svg width={chartWidth} height={H}>
        {[0, 1, 2].map((i) => {
          const y = PAD_T + (CHART_H / 2) * i;
          return (
            <Line
              key={i}
              x1={0}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke={colors.cardBorder}
              strokeWidth={1}
            />
          );
        })}
        {geometry.bands.map((band) => (
          <Path
            key={band.goalId}
            d={band.d}
            fill={band.color}
            fillOpacity={0.55}
            stroke={band.color}
            strokeWidth={1}
          />
        ))}
        {geometry.showTarget ? (
          <Line
            x1={0}
            y1={geometry.targetY}
            x2={chartWidth}
            y2={geometry.targetY}
            stroke={colors.textDim}
            strokeWidth={1}
            strokeDasharray="5,4"
          />
        ) : null}
        {geometry.bands.map((band) =>
          band.ready ? (
            <Circle
              key={`${band.goalId}-ready`}
              cx={band.ready.x}
              cy={band.ready.y}
              r={4}
              fill={colors.card}
              stroke={band.color}
              strokeWidth={2}
            />
          ) : null,
        )}
      </Svg>
      <View style={[styles.xLabels, { width: chartWidth }]}>
        <Text style={styles.axisText}>{formatMonth(0)}</Text>
        <Text style={styles.axisText}>{formatMonth(mid)}</Text>
        <Text style={styles.axisText}>{formatMonth(model.months)}</Text>
      </View>
      <View style={styles.legendRow}>
        {model.series.map((item, index) => (
          <View key={item.goalId} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: palette[index % palette.length] }]}
            />
            <Text style={styles.legendText} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) =>
  StyleSheet.create({
    wrap: {
      marginTop: tokens.gap,
      marginBottom: 4,
      alignItems: "center",
    },
    axisRow: {
      alignSelf: "stretch",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 2,
    },
    xLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 2,
    },
    axisText: {
      fontSize: 10,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    legendRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 8,
      alignSelf: "stretch",
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      maxWidth: "48%",
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 11,
      color: colors.textDim,
      flexShrink: 1,
    },
  });

export default PurchasePlanChart;
