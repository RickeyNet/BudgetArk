/**
 * BudgetBuddy — Investment Screen
 * File: src/screens/InvestmentScreen.tsx
 *
 * Interactive investment growth calculator with:
 * - Adjustable sliders for monthly contribution, return rate, and years
 * - Timeline preset buttons (10yr, 20yr, 30yr)
 * - Area chart showing growth over time
 * - Contribution vs interest earned breakdown
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import {
  calcInvestmentTimeline,
  formatCurrency,
} from "../utils/calculations";

/* ── Slider Config ── */

type SliderConfig = {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
};

const SLIDERS: Record<"contribution" | "returnRate" | "years", SliderConfig> = {
  contribution: { label: "Monthly Contribution", unit: "$", min: 50, max: 5000, step: 50 },
  returnRate: { label: "Annual Return", unit: "%", min: 1, max: 15, step: 0.5 },
  years: { label: "Time Horizon", unit: "yr", min: 1, max: 40, step: 1 },
};

const YEAR_PRESETS = [10, 20, 30] as const;

/* ── Mini Area Chart (SVG-based, no Victory dependency issues) ── */

interface AreaChartProps {
  data: { year: number; total: number; contributed: number }[];
  accentColor: string;
  successColor: string;
  textDim: string;
  textMuted: string;
}

const AreaChart: React.FC<AreaChartProps> = React.memo(
  ({ data, accentColor, successColor, textDim, textMuted }) => {
    const W = 340;
    const H = 180;
    const padL = 50;
    const padR = 10;
    const padT = 10;
    const padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    if (data.length < 2) return null;

    const maxVal = Math.max(...data.map((d) => d.total), 1);
    const maxYears = data[data.length - 1].year;

    const toX = (year: number) => padL + (year / maxYears) * chartW;
    const toY = (val: number) => padT + chartH - (val / maxVal) * chartH;

    // Build paths
    const totalPath =
      data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(d.year)},${toY(d.total)}`).join(" ");
    const totalAreaPath = `${totalPath} L${toX(maxYears)},${toY(0)} L${toX(0)},${toY(0)} Z`;

    const contribPath =
      data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(d.year)},${toY(d.contributed)}`).join(" ");
    const contribAreaPath = `${contribPath} L${toX(maxYears)},${toY(0)} L${toX(0)},${toY(0)} Z`;

    // Y-axis labels (4 ticks)
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));
    // X-axis labels
    const xStep = maxYears <= 10 ? 2 : maxYears <= 20 ? 5 : 10;
    const xTicks: number[] = [];
    for (let x = 0; x <= maxYears; x += xStep) xTicks.push(x);
    if (xTicks[xTicks.length - 1] !== maxYears) xTicks.push(maxYears);

    const formatShort = (n: number) => {
      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
      return `$${n}`;
    };

    return (
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accentColor} stopOpacity={0.35} />
            <Stop offset="1" stopColor={accentColor} stopOpacity={0.05} />
          </LinearGradient>
          <LinearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={successColor} stopOpacity={0.3} />
            <Stop offset="1" stopColor={successColor} stopOpacity={0.05} />
          </LinearGradient>
        </Defs>

        {/* Y-axis grid lines */}
        {yTicks.map((tick) => (
          <React.Fragment key={`y-${tick}`}>
            <Path
              d={`M${padL},${toY(tick)} L${W - padR},${toY(tick)}`}
              stroke={textMuted}
              strokeWidth={0.5}
              opacity={0.3}
            />
          </React.Fragment>
        ))}

        {/* Filled areas */}
        <Path d={totalAreaPath} fill="url(#totalGrad)" />
        <Path d={contribAreaPath} fill="url(#contribGrad)" />

        {/* Lines */}
        <Path d={totalPath} stroke={accentColor} strokeWidth={2} fill="none" />
        <Path d={contribPath} stroke={successColor} strokeWidth={1.5} fill="none" strokeDasharray="4,3" />

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <SvgText
            key={`yl-${tick}`}
            x={padL - 6}
            y={toY(tick) + 3}
            fill={textDim}
            fontSize={9}
            textAnchor="end"
          >
            {formatShort(tick)}
          </SvgText>
        ))}

        {/* X-axis labels */}
        {xTicks.map((tick) => (
          <SvgText
            key={`xl-${tick}`}
            x={toX(tick)}
            y={H - 4}
            fill={textDim}
            fontSize={9}
            textAnchor="middle"
          >
            {tick}yr
          </SvgText>
        ))}
      </Svg>
    );
  }
);

/* Need SvgText import */
import { Text as SvgText } from "react-native-svg";

/* ── Main Screen ── */

const InvestmentScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [contribution, setContribution] = useState(500);
  const [returnRate, setReturnRate] = useState(7);
  const [years, setYears] = useState(20);

  const timeline = useMemo(
    () => calcInvestmentTimeline(contribution, returnRate, years),
    [contribution, returnRate, years]
  );

  const finalData = timeline[timeline.length - 1];
  const totalValue = finalData?.total ?? 0;
  const totalContributed = finalData?.contributed ?? 0;
  const totalInterest = finalData?.interest ?? 0;

  const adjust = useCallback(
    (key: "contribution" | "returnRate" | "years", delta: number) => {
      const cfg = SLIDERS[key];
      const setter =
        key === "contribution" ? setContribution : key === "returnRate" ? setReturnRate : setYears;
      setter((prev) => {
        const next = Math.round((prev + delta * cfg.step) * 100) / 100;
        return Math.max(cfg.min, Math.min(cfg.max, next));
      });
    },
    []
  );

  const renderSlider = (key: "contribution" | "returnRate" | "years", value: number) => {
    const cfg = SLIDERS[key];
    const displayValue =
      key === "contribution"
        ? `$${value.toLocaleString()}`
        : key === "returnRate"
          ? `${value}%`
          : `${value} yr`;
    const pct = ((value - cfg.min) / (cfg.max - cfg.min)) * 100;

    return (
      <View key={key} style={styles.sliderGroup}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>{cfg.label}</Text>
          <Text style={styles.sliderValue}>{displayValue}</Text>
        </View>
        <View style={styles.sliderRow}>
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => adjust(key, -1)}
            disabled={value <= cfg.min}
          >
            <Text style={[styles.sliderBtnText, value <= cfg.min && styles.sliderBtnDisabled]}>-</Text>
          </TouchableOpacity>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${pct}%` }]} />
          </View>
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => adjust(key, 1)}
            disabled={value >= cfg.max}
          >
            <Text style={[styles.sliderBtnText, value >= cfg.max && styles.sliderBtnDisabled]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.titleSection}>
          <Text style={styles.appLabel}>BUDGETBUDDY</Text>
          <Text style={styles.screenTitle}>Investments</Text>
          <Text style={styles.screenSubtitle}>
            Project your wealth growth over time.
          </Text>
        </View>

        {/* Result Card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>PROJECTED VALUE</Text>
          <Text style={styles.resultValue}>{formatCurrency(totalValue)}</Text>
          <Text style={styles.resultSub}>
            after {years} years at {returnRate}% annual return
          </Text>
        </View>

        {/* Sliders */}
        <View style={styles.slidersCard}>
          {renderSlider("contribution", contribution)}
          {renderSlider("returnRate", returnRate)}
          {renderSlider("years", years)}

          {/* Timeline Presets */}
          <View style={styles.presetRow}>
            {YEAR_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[styles.presetBtn, years === preset && styles.presetBtnActive]}
                onPress={() => setYears(preset)}
              >
                <Text style={[styles.presetBtnText, years === preset && styles.presetBtnTextActive]}>
                  {preset}yr
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Growth Over Time</Text>
          <View style={styles.chartWrap}>
            <AreaChart
              data={timeline}
              accentColor={colors.accent}
              successColor={colors.success}
              textDim={colors.textDim}
              textMuted={colors.textMuted}
            />
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.legendText}>Total Value</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success, borderRadius: 2 }]} />
              <Text style={styles.legendText}>Contributions</Text>
            </View>
          </View>
        </View>

        {/* Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Breakdown</Text>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownValue, { color: colors.success }]}>
                {formatCurrency(totalContributed)}
              </Text>
              <Text style={styles.breakdownLabel}>You Contribute</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownValue, { color: colors.accent }]}>
                {formatCurrency(totalInterest)}
              </Text>
              <Text style={styles.breakdownLabel}>Interest Earned</Text>
            </View>
          </View>
          {totalContributed > 0 && (
            <View style={styles.ratioBar}>
              <View
                style={[
                  styles.ratioFillContrib,
                  { width: `${(totalContributed / totalValue) * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.ratioFillInterest,
                  { width: `${(totalInterest / totalValue) * 100}%` },
                ]}
              />
            </View>
          )}
          {totalContributed > 0 && (
            <Text style={styles.ratioText}>
              Your money earned {((totalInterest / totalContributed) * 100).toFixed(0)}% more
              through compound interest
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 110,
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

    /* Result Card */
    resultCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      marginBottom: 16,
    },
    resultLabel: {
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    resultValue: {
      fontSize: 32,
      fontWeight: "700",
      color: colors.accent,
      fontVariant: ["tabular-nums"],
      marginBottom: 4,
    },
    resultSub: {
      fontSize: 13,
      color: colors.textDim,
    },

    /* Sliders */
    slidersCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      gap: 18,
    },
    sliderGroup: {
      gap: 8,
    },
    sliderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sliderLabel: {
      fontSize: 13,
      color: colors.textDim,
      fontWeight: "500",
    },
    sliderValue: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    sliderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sliderBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    sliderBtnText: {
      fontSize: 20,
      color: colors.text,
      fontWeight: "600",
      lineHeight: 22,
    },
    sliderBtnDisabled: {
      opacity: 0.2,
    },
    sliderTrack: {
      flex: 1,
      height: 8,
      backgroundColor: colors.bg,
      borderRadius: 999,
      overflow: "hidden",
    },
    sliderFill: {
      height: "100%",
      backgroundColor: colors.accent,
      borderRadius: 999,
      minWidth: 4,
    },
    presetRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    presetBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    presetBtnActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    presetBtnText: {
      fontSize: 13,
      color: colors.textDim,
      fontWeight: "600",
    },
    presetBtnTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },

    /* Chart */
    chartCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    chartTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    chartWrap: {
      alignItems: "center",
    },
    legendRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 20,
      marginTop: 12,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 12,
      color: colors.textDim,
    },

    /* Breakdown */
    breakdownCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
    },
    breakdownTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 14,
    },
    breakdownRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    breakdownItem: {
      flex: 1,
      alignItems: "center",
    },
    breakdownValue: {
      fontSize: 18,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      marginBottom: 4,
    },
    breakdownLabel: {
      fontSize: 12,
      color: colors.textDim,
    },
    breakdownDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.cardBorder,
    },
    ratioBar: {
      flexDirection: "row",
      height: 8,
      borderRadius: 999,
      overflow: "hidden",
      marginTop: 16,
    },
    ratioFillContrib: {
      height: "100%",
      backgroundColor: colors.success,
    },
    ratioFillInterest: {
      height: "100%",
      backgroundColor: colors.accent,
    },
    ratioText: {
      fontSize: 12,
      color: colors.textDim,
      textAlign: "center",
      marginTop: 10,
    },
  });

export default InvestmentScreen;
