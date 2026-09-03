/**
 * BudgetArk - Purchase Plan Chart
 * File: src/components/PurchasePlanChart.tsx
 *
 * Progress-to-target chart for the Purchase Plans list: one line per
 * unfunded plan (colour matches its legend dot) showing what share of its
 * own target it has saved, month by month, under the list's combined
 * set-aside and allocation. Every plan shares the 0-100% axis whatever its
 * price, and a dot marks the month each plan reaches 100%. This is where
 * the allocation method becomes visible: under "one at a time" the lines
 * climb in sequence, under "split evenly" they all rise together.
 * Deliberately NOT a stacked chart - stacking floated every plan's band up
 * as the one below it filled, so plans getting no money looked like they
 * were growing, and the combined-target line always sat on the top edge.
 * Presentational only - the model comes from
 * utils/purchasePlanner.buildSavingsChart.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import type { ThemeColors } from "../theme/themes";
import { useDensity } from "../theme/DensityProvider";
import type { DensityTokens } from "../theme/density";
import type { SavingsChartModel } from "../utils/purchasePlanner";

type PurchasePlanChartProps = {
  model: SavingsChartModel;
  colors: ThemeColors;
  /** Label for a month offset from today (0 = now). */
  formatMonth: (monthsFromNow: number) => string;
};

const H = 150;
const PAD_T = 10;
const PAD_B = 6;
/** Room for the percentage tick labels left of the plot. */
const PAD_L = 34;
const CHART_H = H - PAD_T - PAD_B;

/** Gridlines + labels at 100 / 50 / 0 % of each plan's target. */
const TICKS = [1, 0.5, 0] as const;

/** Line colours cycle through the theme's accents so every theme stays on-palette. */
const lineColors = (colors: ThemeColors): string[] => [
  colors.accent,
  colors.success,
  colors.teal,
  colors.warning,
  colors.danger,
];

const PurchasePlanChart: React.FC<PurchasePlanChartProps> = ({ model, colors, formatMonth }) => {
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(240, Math.min(340, windowWidth - 80));
  const palette = lineColors(colors);

  const geometry = useMemo(() => {
    const plotWidth = chartWidth - PAD_L;
    const xFor = (month: number) => PAD_L + (month / model.months) * plotWidth;
    const yFor = (fraction: number) => PAD_T + CHART_H - fraction * CHART_H;

    // Plans already at their target would be a flat line along the top;
    // the list marks those as funded, so the chart only draws the rest.
    const lines = model.series
      .map((item, index) => ({ item, color: palette[index % palette.length] }))
      .filter(({ item }) => item.target > 0 && item.readyAtMonth !== 0)
      .map(({ item, color }) => {
        const points = item.progress.map(
          (fraction, m) => `${xFor(m).toFixed(1)},${yFor(fraction).toFixed(1)}`,
        );
        const ready =
          item.readyAtMonth !== null ? { x: xFor(item.readyAtMonth), y: yFor(1) } : null;
        return { goalId: item.goalId, name: item.name, d: `M${points.join(" L")}`, ready, color };
      });

    return { lines, yFor, plotRight: PAD_L + plotWidth };
  }, [model, chartWidth, palette]);

  const mid = Math.round(model.months / 2);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.axisText, styles.caption]}>
        How much of each plan's target is saved, month by month
      </Text>
      <Svg width={chartWidth} height={H}>
        {TICKS.map((tick) => {
          const y = geometry.yFor(tick);
          return (
            <React.Fragment key={tick}>
              <Line
                x1={PAD_L}
                y1={y}
                x2={geometry.plotRight}
                y2={y}
                stroke={colors.cardBorder}
                strokeWidth={1}
                strokeDasharray={tick === 1 ? "5,4" : undefined}
              />
              <SvgText
                x={PAD_L - 6}
                y={y + 3}
                fill={colors.textDim}
                fontSize={9}
                textAnchor="end"
              >
                {`${Math.round(tick * 100)}%`}
              </SvgText>
            </React.Fragment>
          );
        })}
        {geometry.lines.map((line) => (
          <Path
            key={line.goalId}
            d={line.d}
            fill="none"
            stroke={line.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {geometry.lines.map((line) =>
          line.ready ? (
            <Circle
              key={`${line.goalId}-ready`}
              cx={line.ready.x}
              cy={line.ready.y}
              r={4}
              fill={colors.card}
              stroke={line.color}
              strokeWidth={2}
            />
          ) : null,
        )}
      </Svg>
      <View style={[styles.xLabels, { width: chartWidth, paddingLeft: PAD_L }]}>
        <Text style={styles.axisText}>{formatMonth(0)}</Text>
        <Text style={styles.axisText}>{formatMonth(mid)}</Text>
        <Text style={styles.axisText}>{formatMonth(model.months)}</Text>
      </View>
      <View style={styles.legendRow}>
        {geometry.lines.map((line) => (
          <View key={line.goalId} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: line.color }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {line.name}
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
    caption: {
      alignSelf: "stretch",
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
