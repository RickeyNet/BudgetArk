import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import type { NetWorthSnapshot } from "../types";
import type { ThemeColors } from "../theme/themes";
import { useDensity } from "../theme/DensityProvider";
import type { DensityTokens } from "../theme/density";
import { formatDayLabel } from "../utils/dateFormat";

type NetWorthHistoryCardProps = {
  snapshots: NetWorthSnapshot[];
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  formatCurrency: (value: number) => string;
  formatCompactCurrency: (value: number) => string;
  colors: ThemeColors;
};

type RangeId = "7D" | "30D" | "ALL";

type RangeOption = {
  id: RangeId;
  label: string;
  days?: number;
};

const RANGE_OPTIONS: readonly RangeOption[] = [
  { id: "7D", label: "7D", days: 7 },
  { id: "30D", label: "30D", days: 30 },
  { id: "ALL", label: "All" },
] as const;

const H = 182;
const PAD_L = 50;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 28;
const CHART_H = H - PAD_T - PAD_B;


const NetWorthHistoryCard: React.FC<NetWorthHistoryCardProps> = ({
  snapshots,
  netWorth,
  totalAssets,
  totalDebt,
  formatCurrency,
  formatCompactCurrency,
  colors,
}) => {
  const [rangeId, setRangeId] = useState<RangeId>("30D");
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(240, Math.min(320, windowWidth - 68));
  const chartInnerWidth = chartWidth - PAD_L - PAD_R;
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  const sortedSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => a.dayKey.localeCompare(b.dayKey)),
    [snapshots]
  );

  const visibleSnapshots = useMemo(() => {
    if (sortedSnapshots.length === 0) return [];
    const range = RANGE_OPTIONS.find((item) => item.id === rangeId) ?? RANGE_OPTIONS[1];
    if (!range.days) return sortedSnapshots;

    const latest = new Date(sortedSnapshots[sortedSnapshots.length - 1].capturedAt);
    const cutoff = new Date(latest);
    cutoff.setDate(cutoff.getDate() - (range.days - 1));

    return sortedSnapshots.filter((snapshot) => new Date(snapshot.capturedAt) >= cutoff);
  }, [rangeId, sortedSnapshots]);

  const plottedSnapshots = useMemo(() => {
    if (visibleSnapshots.length === 0) return [];
    if (visibleSnapshots.length === 1) {
      return [visibleSnapshots[0], visibleSnapshots[0]];
    }
    return visibleSnapshots;
  }, [visibleSnapshots]);

  const chartColor = netWorth >= 0 ? colors.accent : colors.danger;
  const valueColor = netWorth >= 0 ? colors.success : colors.danger;

  const chartModel = useMemo(() => {
    if (plottedSnapshots.length === 0) {
      return null;
    }

    const values = plottedSnapshots.map((snapshot) => snapshot.netWorth);
    let minValue = Math.min(...values);
    let maxValue = Math.max(...values);

    if (minValue === maxValue) {
      const pad = Math.max(Math.abs(minValue) * 0.1, 100);
      minValue -= pad;
      maxValue += pad;
    } else {
      const pad = Math.max((maxValue - minValue) * 0.12, 100);
      minValue -= pad;
      maxValue += pad;
    }

    const toX = (index: number) =>
      PAD_L + (index / Math.max(plottedSnapshots.length - 1, 1)) * chartInnerWidth;
    const toY = (value: number) =>
      PAD_T + CHART_H - ((value - minValue) / (maxValue - minValue)) * CHART_H;

    const points = plottedSnapshots.map((snapshot, index) => ({
      x: toX(index),
      y: toY(snapshot.netWorth),
      snapshot,
    }));

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ");
    const areaPath = `${linePath} L${points[points.length - 1].x},${H - PAD_B} L${points[0].x},${H - PAD_B} Z`;
    const yTicks = [maxValue, (maxValue + minValue) / 2, minValue];
    const zeroY = minValue <= 0 && maxValue >= 0 ? toY(0) : null;

    return {
      points,
      linePath,
      areaPath,
      yTicks,
      zeroY,
    };
  }, [chartInnerWidth, plottedSnapshots]);

  const trend = useMemo(() => {
    if (visibleSnapshots.length === 0) {
      return { amount: 0, label: "Change" };
    }
    const first = visibleSnapshots[0].netWorth;
    const last = visibleSnapshots[visibleSnapshots.length - 1].netWorth;
    return {
      amount: last - first,
      label: rangeId === "ALL" ? "Since start" : `${rangeId} change`,
    };
  }, [rangeId, visibleSnapshots]);

  const xLabels = useMemo(() => {
    if (visibleSnapshots.length === 0) return [];
    const first = visibleSnapshots[0];
    const middle = visibleSnapshots[Math.floor((visibleSnapshots.length - 1) / 2)];
    const last = visibleSnapshots[visibleSnapshots.length - 1];

    if (first.dayKey === last.dayKey) {
      return [
        {
          x: PAD_L + chartInnerWidth / 2,
          label: formatDayLabel(first.capturedAt),
          anchor: "middle" as const,
        },
      ];
    }

    return [
      { x: PAD_L, label: formatDayLabel(first.capturedAt), anchor: "start" as const },
      {
        x: PAD_L + chartInnerWidth / 2,
        label: formatDayLabel(middle.capturedAt),
        anchor: "middle" as const,
      },
      { x: chartWidth - PAD_R, label: formatDayLabel(last.capturedAt), anchor: "end" as const },
    ];
  }, [chartInnerWidth, chartWidth, visibleSnapshots]);

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

        <Text style={[styles.netWorthValue, { color: valueColor }]}>
          {netWorth >= 0 ? "" : "-"}
          {formatCurrency(Math.abs(netWorth))}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.trendText, { color: trend.amount >= 0 ? colors.success : colors.danger }]}>
          {trend.label} {trend.amount >= 0 ? "+" : "-"}
          {formatCurrency(Math.abs(trend.amount))}
        </Text>
        <View style={styles.rangeRow}>
          {RANGE_OPTIONS.map((option) => {
            const isSelected = rangeId === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.rangeChip,
                  {
                    borderColor: isSelected ? colors.accent : colors.cardBorder,
                    backgroundColor: isSelected ? `${colors.accent}20` : colors.bg,
                  },
                ]}
                onPress={() => setRangeId(option.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.rangeChipText,
                    { color: isSelected ? colors.accent : colors.textDim },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {chartModel ? (
        <View style={styles.chartWrap}>
          <Svg width={chartWidth} height={H} viewBox={`0 0 ${chartWidth} ${H}`}>
            <Defs>
              <LinearGradient id="netWorthArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={chartColor} stopOpacity={0.3} />
                <Stop offset="1" stopColor={chartColor} stopOpacity={0.04} />
              </LinearGradient>
            </Defs>

            {chartModel.yTicks.map((tick) => {
              const y = PAD_T + CHART_H - ((tick - chartModel.yTicks[2]) / (chartModel.yTicks[0] - chartModel.yTicks[2])) * CHART_H;
              return (
                <React.Fragment key={`tick-${tick}`}>
                  <Path
                    d={`M${PAD_L},${y} L${chartWidth - PAD_R},${y}`}
                    stroke={colors.textMuted}
                    strokeWidth={0.7}
                    opacity={0.3}
                  />
                  <SvgText
                    x={PAD_L - 6}
                    y={y + 3}
                    fill={colors.textDim}
                    fontSize={9}
                    textAnchor="end"
                  >
                    {formatCompactCurrency(tick)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {chartModel.zeroY != null ? (
              <Path
                d={`M${PAD_L},${chartModel.zeroY} L${chartWidth - PAD_R},${chartModel.zeroY}`}
                stroke={colors.cardBorder}
                strokeWidth={1}
                opacity={0.9}
              />
            ) : null}

            <Path d={chartModel.areaPath} fill="url(#netWorthArea)" />
            <Path d={chartModel.linePath} stroke={chartColor} strokeWidth={3} fill="none" />

            {chartModel.points.map((point, index) => {
              const isLast = index === chartModel.points.length - 1;
              return (
                <Circle
                  key={`${point.snapshot.dayKey}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={isLast ? 4 : 2.8}
                  fill={isLast ? chartColor : colors.card}
                  stroke={chartColor}
                  strokeWidth={2}
                />
              );
            })}

            {xLabels.map((label) => (
              <SvgText
                key={`${label.x}-${label.label}`}
                x={label.x}
                y={H - 5}
                fill={colors.textDim}
                fontSize={9}
                textAnchor={label.anchor}
              >
                {label.label}
              </SvgText>
            ))}
          </Svg>
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.textDim }]}>Tracking starts when first snapshot saves.</Text>
        </View>
      )}

      <Text style={[styles.footerHint, { color: colors.textMuted }]}>
        Daily snapshots. History starts now.
      </Text>
    </View>
  );
};

const makeStyles = (tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: tokens.radius + 4,
      padding: tokens.pad + 2,
      marginBottom: tokens.gap,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    headerTextWrap: {
      flex: 1,
    },
    title: {
      fontSize: scale(18),
      fontWeight: "700",
      marginBottom: 4,
    },
    subtext: {
      fontSize: scale(12),
      lineHeight: 18,
    },
    netWorthValue: {
      fontSize: scale(24),
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      textAlign: "right",
      flexShrink: 1,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 14,
      marginBottom: tokens.gapSm,
    },
    trendText: {
      fontSize: scale(12),
      fontWeight: "700",
      flex: 1,
    },
    rangeRow: {
      flexDirection: "row",
      gap: 8,
    },
    rangeChip: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    rangeChipText: {
      fontSize: scale(11),
      fontWeight: "700",
    },
    chartWrap: {
      alignItems: "center",
    },
    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 24,
    },
    emptyText: {
      fontSize: scale(13),
      textAlign: "center",
    },
    footerHint: {
      fontSize: scale(11),
      marginTop: 8,
      textAlign: "center",
    },
  });
};

export default React.memo(NetWorthHistoryCard);
