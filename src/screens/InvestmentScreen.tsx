/**
 * BudgetArk — Investment Screen
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path, Text as SvgText } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { calcInvestmentTimeline } from "../utils/calculations";
import { useCurrency } from "../currency/CurrencyProvider";
import SmoothSlider from "../components/SmoothSlider";

/* ── Slider Config ── */

type SliderConfig = {
  label: string;
  min: number;
  max: number;
  step: number;
};

const SLIDERS: Record<"contribution" | "returnRate" | "years", SliderConfig> = {
  contribution: { label: "Monthly Contribution", min: 50, max: 50000, step: 50 },
  returnRate: { label: "Annual Return", min: 1, max: 30, step: 0.5 },
  years: { label: "Time Horizon", min: 1, max: 50, step: 1 },
};

const YEAR_PRESETS = [10, 20, 30] as const;

/* ── Mini Area Chart (SVG-based, no Victory dependency issues) ── */

interface AreaChartProps {
  data: { year: number; total: number; contributed: number }[];
  accentColor: string;
  successColor: string;
  textDim: string;
  textMuted: string;
  formatCompactCurrency: (amount: number) => string;
}

const AreaChart: React.FC<AreaChartProps> = React.memo(
  ({ data, accentColor, successColor, textDim, textMuted, formatCompactCurrency }) => {
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
            {formatCompactCurrency(tick)}
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

/* ── Main Screen ── */

const InvestmentScreen: React.FC = () => {
  const { colors } = useTheme();
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [contribution, setContribution] = useState(500);
  const [returnRate, setReturnRate] = useState(7);
  const [years, setYears] = useState(20);

  /* Text-input editing state (shared across all sliders) */
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

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

  const handleValueFocus = useCallback(
    (key: "contribution" | "returnRate" | "years", value: number) => {
      setEditingKey(key);
      setEditingText(String(value));
    },
    []
  );

  const handleValueChange = useCallback(
    (key: "contribution" | "returnRate" | "years", text: string) => {
      if (key === "returnRate") {
        // Allow decimal point for return rate
        setEditingText(text.replace(/[^0-9.]/g, ""));
      } else {
        setEditingText(text.replace(/[^0-9]/g, ""));
      }
    },
    []
  );

  const handleValueSubmit = useCallback(
    (key: "contribution" | "returnRate" | "years") => {
      const cfg = SLIDERS[key];
      const parsed = parseFloat(editingText);
      if (!isNaN(parsed) && parsed >= cfg.min) {
        const setter =
          key === "contribution" ? setContribution : key === "returnRate" ? setReturnRate : setYears;
        if (key === "years") {
          setter(Math.max(cfg.min, Math.round(parsed)));
        } else if (key === "returnRate") {
          const snapped = Math.round(parsed / cfg.step) * cfg.step;
          setter(Math.max(cfg.min, Math.round(snapped * 100) / 100));
        } else {
          setter(Math.max(cfg.min, parsed));
        }
      }
      setEditingKey(null);
    },
    [editingText]
  );

  const handleSliderChange = useCallback(
    (key: "contribution" | "returnRate" | "years", val: number) => {
      const setter =
        key === "contribution" ? setContribution : key === "returnRate" ? setReturnRate : setYears;
      setter(val);
    },
    []
  );

  const renderSlider = (key: "contribution" | "returnRate" | "years", value: number) => {
    const cfg = SLIDERS[key];
    const displayValue =
      key === "contribution"
        ? formatCurrency(value)
        : key === "returnRate"
          ? `${value}%`
          : `${value} yr`;

    return (
      <View key={key} style={styles.sliderGroup}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>{cfg.label}</Text>
          {editingKey === key ? (
            <TextInput
              style={[styles.sliderValue, styles.sliderValueInput, styles.sliderValueInputActive]}
              value={editingText}
              onChangeText={(text) => handleValueChange(key, text)}
              onBlur={() => handleValueSubmit(key)}
              onSubmitEditing={() => handleValueSubmit(key)}
              keyboardType={key === "returnRate" ? "decimal-pad" : "numeric"}
              returnKeyType="done"
              selectTextOnFocus
              autoFocus
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TouchableOpacity
              style={styles.sliderValueDisplay}
              onPress={() => handleValueFocus(key, value)}
            >
              <Text style={styles.sliderValue}>{displayValue}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sliderRow}>
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => adjust(key, -1)}
            disabled={value <= cfg.min}
          >
            <Text style={[styles.sliderBtnText, value <= cfg.min && styles.sliderBtnDisabled]}>-</Text>
          </TouchableOpacity>
          <SmoothSlider
            value={value}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            onValueChange={(val) => handleSliderChange(key, val)}
            trackColor={colors.bg}
            fillColor={colors.accent}
            thumbColor={colors.accent}
            thumbBorderColor={colors.card}
          />
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
          <Text style={styles.appLabel}>BudgetArk</Text>
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
              formatCompactCurrency={formatCompactCurrency}
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
    sliderValueDisplay: {
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minWidth: 90,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    sliderValueInput: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minWidth: 90,
      textAlign: "right",
      textAlignVertical: "center",
    },
    sliderValueInputActive: {
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.bg,
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
