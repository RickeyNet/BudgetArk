/**
 * BudgetArk - Net Worth Histogram
 * File: src/components/NetWorthHistogram.tsx
 *
 * Three-bar assets / debt / net-worth comparison for the Bridge tab. Pure
 * presentational: takes the totals and the theme colors as props so the
 * screen owns all the math.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ThemeColors } from "../theme/themes";

type NetWorthHistogramProps = {
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  formatCurrency: (value: number) => string;
  colors: ThemeColors;
};

type HistogramDatum = {
  label: string;
  value: number;
  color: string;
};

const CHART_HEIGHT = 144;
const HALF_CHART_HEIGHT = 52;

const NetWorthHistogram: React.FC<NetWorthHistogramProps> = ({
  netWorth,
  totalAssets,
  totalDebt,
  formatCurrency,
  colors,
}) => {
  const data = useMemo<HistogramDatum[]>(
    () => [
      {
        label: "Assets",
        value: totalAssets,
        color: colors.success,
      },
      {
        label: "Debt",
        value: -totalDebt,
        color: colors.danger,
      },
      {
        label: "Net",
        value: netWorth,
        color: netWorth >= 0 ? colors.accent : colors.warning,
      },
    ],
    [colors.accent, colors.danger, colors.success, colors.warning, netWorth, totalAssets, totalDebt]
  );

  const maxMagnitude = useMemo(
    () => Math.max(1, ...data.map((item) => Math.abs(item.value))),
    [data]
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: `${colors.accent}30`,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: colors.text }]}>Net Worth</Text>
          <Text style={[styles.subtext, { color: colors.textDim }]}>
            Assets {formatCurrency(totalAssets)} · Debt {formatCurrency(totalDebt)}
          </Text>
        </View>

        <Text
          style={[
            styles.netWorthValue,
            { color: netWorth >= 0 ? colors.success : colors.danger },
          ]}
        >
          {netWorth >= 0 ? "" : "-"}
          {formatCurrency(Math.abs(netWorth))}
        </Text>
      </View>

      <View style={styles.chartWrap}>
        <View style={styles.chartArea}>
          <View style={[styles.baseline, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.barsRow}>
            {data.map((item) => {
              const magnitude = Math.abs(item.value);
              const height =
                magnitude === 0 ? 0 : Math.max(8, (magnitude / maxMagnitude) * HALF_CHART_HEIGHT);
              const isPositive = item.value >= 0;

              return (
                <View key={item.label} style={styles.barGroup}>
                  <View style={styles.barStack}>
                    <View style={styles.barHalfTop}>
                      {isPositive ? (
                        <View
                          style={[
                            styles.bar,
                            {
                              height,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                    <View style={styles.barHalfBottom}>
                      {!isPositive ? (
                        <View
                          style={[
                            styles.bar,
                            {
                              height,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.chartLabelsRow}>
          {data.map((item) => (
            <View key={`${item.label}-label`} style={styles.barGroup}>
              <Text style={[styles.barLabel, { color: colors.textDim }]}>{item.label}</Text>
              <Text style={[styles.barValue, { color: item.color }]} numberOfLines={1}>
                {item.value < 0 ? "-" : ""}
                {formatCurrency(Math.abs(item.value))}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtext: {
    fontSize: 12,
    lineHeight: 18,
  },
  netWorthValue: {
    fontSize: 24,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    flexShrink: 1,
  },
  chartWrap: {
    height: CHART_HEIGHT,
  },
  chartArea: {
    height: HALF_CHART_HEIGHT * 2 + 8,
    justifyContent: "center",
  },
  baseline: {
    position: "absolute",
    left: 0,
    right: 0,
    top: HALF_CHART_HEIGHT + 4,
    height: 1,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  barGroup: {
    flex: 1,
    alignItems: "center",
  },
  barStack: {
    width: "100%",
    alignItems: "center",
  },
  barHalfTop: {
    height: HALF_CHART_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  barHalfBottom: {
    height: HALF_CHART_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  bar: {
    width: 34,
    borderRadius: 10,
    maxHeight: HALF_CHART_HEIGHT - 4,
  },
  chartLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 3,
  },
  barValue: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
});

export default React.memo(NetWorthHistogram);
