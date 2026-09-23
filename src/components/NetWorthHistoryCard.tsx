/**
 * BudgetArk - Net Worth History Card
 * File: src/components/NetWorthHistoryCard.tsx
 *
 * Bridge-tab card that plots the monthly net-worth snapshots
 * (netWorthSnapshotStorage) as an SVG line with a selectable range, so the
 * user sees the trend rather than just today's number.
 */

import React, { useMemo, useState } from "react";
import {
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
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
import { useTranslation } from "react-i18next";
import { formatDayLabel } from "../utils/dateFormat";
import { scrubIndexForX } from "../utils/chartScrub";

type NetWorthHistoryCardProps = {
  snapshots: NetWorthSnapshot[];
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  formatCurrency: (value: number) => string;
  formatCompactCurrency: (value: number) => string;
  colors: ThemeColors;
};

const H = 182;
const PAD_L = 50;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 28;
const CHART_H = H - PAD_T - PAD_B;

type RangeId = "7D" | "30D" | "ALL";

type RangeOption = {
  id: RangeId;
  days?: number;
};

// Chip labels live in the locale tree under bridge.reports.history.ranges.<id>.
const RANGE_OPTIONS: readonly RangeOption[] = [
  { id: "7D", days: 7 },
  { id: "30D", days: 30 },
  { id: "ALL" },
] as const;

/** Axis day label in the app language (falls back to the shared util). */
const formatAxisDay = (iso: string, locale: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatDayLabel(iso);
  try {
    return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
  } catch {
    return formatDayLabel(iso);
  }
};

/** Full day label (with year) for the scrub readout. */
const formatScrubDay = (iso: string, locale: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatDayLabel(iso);
  try {
    return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return formatDayLabel(iso);
  }
};


const NetWorthHistoryCard: React.FC<NetWorthHistoryCardProps> = ({
  snapshots,
  netWorth,
  totalAssets,
  totalDebt,
  formatCurrency,
  formatCompactCurrency,
  colors,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [rangeId, setRangeId] = useState<RangeId>("30D");
  /** Index into the plotted points while a finger is on the chart. */
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
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

  const pointCount = chartModel?.points.length ?? 0;
  const panResponder = useMemo(() => {
    const indexAt = (x: number) => scrubIndexForX(x, chartInnerWidth, pointCount, PAD_L);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => pointCount > 0,
      onMoveShouldSetPanResponder: () => pointCount > 0,
      // Keep the gesture once we have it so the parent ScrollView does not
      // steal a horizontal scrub that drifts vertically.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => setScrubIndex(indexAt(event.nativeEvent.locationX)),
      onPanResponderMove: (event) => setScrubIndex(indexAt(event.nativeEvent.locationX)),
      onPanResponderRelease: () => setScrubIndex(null),
      onPanResponderTerminate: () => setScrubIndex(null),
    });
  }, [chartInnerWidth, pointCount]);

  const scrubbed =
    chartModel && scrubIndex != null ? (chartModel.points[scrubIndex] ?? null) : null;
  const scrubLabel = scrubbed ? formatCompactCurrency(scrubbed.snapshot.netWorth) : "";
  // SVG cannot measure text, so estimate the label width to keep it inside
  // the plot area when the finger is near either edge.
  const scrubLabelHalf = Math.max(14, scrubLabel.length * 3.3);
  const scrubLabelX = scrubbed
    ? Math.min(chartWidth - PAD_R - scrubLabelHalf, Math.max(PAD_L + scrubLabelHalf, scrubbed.x))
    : 0;
  const scrubLabelAbove = scrubbed ? scrubbed.y - 12 >= PAD_T + 8 : true;
  const scrubLabelY = scrubbed ? (scrubLabelAbove ? scrubbed.y - 12 : scrubbed.y + 18) : 0;

  const trend = useMemo(() => {
    if (visibleSnapshots.length === 0) {
      return { amount: 0, label: t("bridge.reports.history.change") };
    }
    const first = visibleSnapshots[0].netWorth;
    const last = visibleSnapshots[visibleSnapshots.length - 1].netWorth;
    return {
      amount: last - first,
      label:
        rangeId === "ALL"
          ? t("bridge.reports.history.sinceStart")
          : t("bridge.reports.history.rangeChange", {
              range: t(`bridge.reports.history.ranges.${rangeId}`),
            }),
    };
  }, [rangeId, t, visibleSnapshots]);

  const xLabels = useMemo(() => {
    if (visibleSnapshots.length === 0) return [];
    const first = visibleSnapshots[0];
    const middle = visibleSnapshots[Math.floor((visibleSnapshots.length - 1) / 2)];
    const last = visibleSnapshots[visibleSnapshots.length - 1];

    if (first.dayKey === last.dayKey) {
      return [
        {
          x: PAD_L + chartInnerWidth / 2,
          label: formatAxisDay(first.capturedAt, locale),
          anchor: "middle" as const,
        },
      ];
    }

    return [
      { x: PAD_L, label: formatAxisDay(first.capturedAt, locale), anchor: "start" as const },
      {
        x: PAD_L + chartInnerWidth / 2,
        label: formatAxisDay(middle.capturedAt, locale),
        anchor: "middle" as const,
      },
      { x: chartWidth - PAD_R, label: formatAxisDay(last.capturedAt, locale), anchor: "end" as const },
    ];
  }, [chartInnerWidth, chartWidth, locale, visibleSnapshots]);

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
          <Text style={[styles.title, { color: colors.text }]}>{t("bridge.reports.history.title")}</Text>
          <Text style={[styles.subtext, { color: colors.textDim }]}>
            {t("bridge.reports.history.subtext", {
              assets: formatCurrency(totalAssets),
              debt: formatCurrency(totalDebt),
            })}
          </Text>
        </View>

        <Text
          style={[
            styles.netWorthValue,
            { color: scrubbed ? (scrubbed.snapshot.netWorth >= 0 ? colors.success : colors.danger) : valueColor },
          ]}
        >
          {(scrubbed ? scrubbed.snapshot.netWorth : netWorth) >= 0 ? "" : "-"}
          {formatCurrency(Math.abs(scrubbed ? scrubbed.snapshot.netWorth : netWorth))}
        </Text>
      </View>

      <View style={styles.metaRow}>
        {scrubbed ? (
          <Text style={[styles.trendText, { color: colors.text }]} numberOfLines={1}>
            {formatScrubDay(scrubbed.snapshot.capturedAt, locale)}
          </Text>
        ) : (
          <Text style={[styles.trendText, { color: trend.amount >= 0 ? colors.success : colors.danger }]}>
            {trend.label} {trend.amount >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(trend.amount))}
          </Text>
        )}
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
                  {t(`bridge.reports.history.ranges.${option.id}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {chartModel ? (
        <View style={styles.chartWrap}>
          <View
            style={{ width: chartWidth, height: H }}
            accessible
            accessibilityLabel={t("bridge.reports.history.chartA11y")}
            {...panResponder.panHandlers}
          >
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

            {scrubbed ? (
              <>
                <Path
                  d={`M${scrubbed.x},${PAD_T} L${scrubbed.x},${H - PAD_B}`}
                  stroke={colors.textDim}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.8}
                />
                <Circle
                  cx={scrubbed.x}
                  cy={scrubbed.y}
                  r={5}
                  fill={colors.card}
                  stroke={chartColor}
                  strokeWidth={2.5}
                />
                <SvgText
                  x={scrubLabelX}
                  y={scrubLabelY}
                  fill={colors.text}
                  fontSize={11}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {scrubLabel}
                </SvgText>
              </>
            ) : null}

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
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.textDim }]}>{t("bridge.reports.history.empty")}</Text>
        </View>
      )}

      <Text style={[styles.footerHint, { color: colors.textMuted }]}>
        {t("bridge.reports.history.footer")}
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
      borderRadius: tokens.radiusPill,
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
