/**
 * BudgetArk — Utilities Screen
 * File: src/screens/UtilitiesScreen.tsx
 *
 * Hub for financial tools and calculators.
 * Currently includes the Compound Interest Calculator with
 * S&P 500 educational context and return rate presets.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Defs, LinearGradient, Stop, Path, Text as SvgText } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { calcInvestmentTimeline, calcPaymentForGoalDate } from "../utils/calculations";
import { useCurrency } from "../currency/CurrencyProvider";
import { getBudgetEntries } from "../storage/budgetStorage";
import { getSavingsGoals } from "../storage/savingsGoalStorage";
import type { BudgetEntry, SavingsGoal } from "../types";
import SmoothSlider from "../components/SmoothSlider";

/* Enable LayoutAnimation on Android */
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

/* ── Loan Calculator Config ── */

const LOAN_SLIDERS: Record<"loanAmount" | "loanRate" | "loanTerm", SliderConfig> = {
  loanAmount: { label: "Loan Amount", min: 1000, max: 1000000, step: 1000 },
  loanRate: { label: "Interest Rate (APR)", min: 0.5, max: 30, step: 0.25 },
  loanTerm: { label: "Loan Term", min: 1, max: 30, step: 1 },
};

const LOAN_TERM_PRESETS = [15, 20, 30] as const;

/* ── Emergency Fund Helpers ── */

const getMonthKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

const calcAvgMonthlyExpenses = (entries: BudgetEntry[]): number => {
  const now = new Date();
  const monthTotals: Record<string, number> = {};

  // Look at the last 6 months (excluding current since it may be incomplete)
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthTotals[getMonthKey(d)] = 0;
  }

  for (const entry of entries) {
    if (entry.type !== "expense") continue;
    const entryMonthKey = getMonthKey(new Date(entry.date));

    if (entry.recurring) {
      // Recurring entries apply to their start month and all future months
      for (const mk of Object.keys(monthTotals)) {
        if (mk >= entryMonthKey) {
          monthTotals[mk] += entry.amount;
        }
      }
    } else if (entryMonthKey in monthTotals) {
      monthTotals[entryMonthKey] += entry.amount;
    }
  }

  // Average only months that have data
  const monthsWithData = Object.values(monthTotals).filter((t) => t > 0);
  if (monthsWithData.length === 0) return 0;
  return Math.round(monthsWithData.reduce((s, v) => s + v, 0) / monthsWithData.length);
};

/* ── Return Rate Presets ── */

const RATE_PRESETS = [
  { label: "Savings", rate: 2, hint: "High-yield savings account" },
  { label: "Bonds", rate: 4, hint: "US Treasury / bond funds" },
  { label: "S&P 500", rate: 7, hint: "Historical avg, inflation-adjusted" },
  { label: "Aggressive", rate: 10, hint: "S&P 500 nominal (before inflation)" },
] as const;

/* ── Mini Area Chart ── */

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

    if (data.length < 2) {
      return (
        <View style={{ width: W, height: H, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: textMuted, fontSize: 13 }}>
            Adjust the sliders to see a projection chart.
          </Text>
        </View>
      );
    }

    const maxVal = Math.max(...data.map((d) => d.total), 1);
    const maxYears = data[data.length - 1].year;

    const toX = (year: number) => padL + (year / maxYears) * chartW;
    const toY = (val: number) => padT + chartH - (val / maxVal) * chartH;

    const totalPath =
      data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(d.year)},${toY(d.total)}`).join(" ");
    const totalAreaPath = `${totalPath} L${toX(maxYears)},${toY(0)} L${toX(0)},${toY(0)} Z`;

    const contribPath =
      data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(d.year)},${toY(d.contributed)}`).join(" ");
    const contribAreaPath = `${contribPath} L${toX(maxYears)},${toY(0)} L${toX(0)},${toY(0)} Z`;

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));
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

        <Path d={totalAreaPath} fill="url(#totalGrad)" />
        <Path d={contribAreaPath} fill="url(#contribGrad)" />

        <Path d={totalPath} stroke={accentColor} strokeWidth={2} fill="none" />
        <Path d={contribPath} stroke={successColor} strokeWidth={1.5} fill="none" strokeDasharray="4,3" />

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

const UtilitiesScreen: React.FC = () => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  /* Compound interest calculator state */
  const [calcOpen, setCalcOpen] = useState(true);
  const [contribution, setContribution] = useState(500);
  const [returnRate, setReturnRate] = useState(7);
  const [years, setYears] = useState(20);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showWhyCard, setShowWhyCard] = useState(false);

  /* Loan calculator state */
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState(300000);
  const [loanRate, setLoanRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [loanEditingKey, setLoanEditingKey] = useState<string | null>(null);
  const [loanEditingText, setLoanEditingText] = useState("");

  /* Emergency fund calculator state */
  const [efOpen, setEfOpen] = useState(false);
  const [avgExpenses, setAvgExpenses] = useState(0);
  const [efExpenseOverride, setEfExpenseOverride] = useState("");
  const [efMonthlySavings, setEfMonthlySavings] = useState(500);
  const [currentEfAmount, setCurrentEfAmount] = useState(0);
  const [efTargetAmount, setEfTargetAmount] = useState(0);
  const [efDataLoaded, setEfDataLoaded] = useState(false);

  const timeline = useMemo(
    () => calcInvestmentTimeline(contribution, returnRate, years),
    [contribution, returnRate, years]
  );

  const finalData = timeline[timeline.length - 1];
  const totalValue = finalData?.total ?? 0;
  const totalContributed = finalData?.contributed ?? 0;
  const totalInterest = finalData?.interest ?? 0;

  /* Rule of 72 */
  const doublingYears = returnRate > 0 ? Math.round(72 / returnRate) : 0;

  const toggleCalc = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCalcOpen((prev) => !prev);
  }, []);

  const toggleWhyCard = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowWhyCard((prev) => !prev);
  }, []);

  /* ── Loan calculator logic ── */

  const toggleLoan = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoanOpen((prev) => !prev);
  }, []);

  const loanMonthlyPayment = useMemo(
    () => calcPaymentForGoalDate(loanAmount, loanRate, loanTerm * 12),
    [loanAmount, loanRate, loanTerm]
  );
  const loanTotalPaid = isFinite(loanMonthlyPayment)
    ? loanMonthlyPayment * loanTerm * 12
    : 0;
  const loanTotalInterest = Math.max(0, loanTotalPaid - loanAmount);

  const adjustLoan = useCallback(
    (key: "loanAmount" | "loanRate" | "loanTerm", delta: number) => {
      const cfg = LOAN_SLIDERS[key];
      const setter =
        key === "loanAmount" ? setLoanAmount : key === "loanRate" ? setLoanRate : setLoanTerm;
      setter((prev) => {
        const next = Math.round((prev + delta * cfg.step) * 100) / 100;
        return Math.max(cfg.min, Math.min(cfg.max, next));
      });
    },
    []
  );

  const handleLoanValueFocus = useCallback(
    (key: "loanAmount" | "loanRate" | "loanTerm", value: number) => {
      setLoanEditingKey(key);
      setLoanEditingText(String(value));
    },
    []
  );

  const handleLoanValueChange = useCallback(
    (key: "loanAmount" | "loanRate" | "loanTerm", text: string) => {
      if (key === "loanRate") {
        setLoanEditingText(text.replace(/[^0-9.]/g, ""));
      } else {
        setLoanEditingText(text.replace(/[^0-9]/g, ""));
      }
    },
    []
  );

  const handleLoanValueSubmit = useCallback(
    (key: "loanAmount" | "loanRate" | "loanTerm") => {
      const cfg = LOAN_SLIDERS[key];
      const parsed = parseFloat(loanEditingText);
      if (!isNaN(parsed) && parsed >= cfg.min) {
        const setter =
          key === "loanAmount" ? setLoanAmount : key === "loanRate" ? setLoanRate : setLoanTerm;
        if (key === "loanRate") {
          const snapped = Math.round(parsed / cfg.step) * cfg.step;
          setter(Math.max(cfg.min, Math.round(snapped * 100) / 100));
        } else {
          setter(Math.max(cfg.min, Math.round(parsed)));
        }
      }
      setLoanEditingKey(null);
    },
    [loanEditingText]
  );

  const handleLoanSliderChange = useCallback(
    (key: "loanAmount" | "loanRate" | "loanTerm", val: number) => {
      const setter =
        key === "loanAmount" ? setLoanAmount : key === "loanRate" ? setLoanRate : setLoanTerm;
      setter(val);
    },
    []
  );

  const renderLoanSlider = (key: "loanAmount" | "loanRate" | "loanTerm", value: number) => {
    const cfg = LOAN_SLIDERS[key];
    const displayValue =
      key === "loanAmount"
        ? formatCurrency(value)
        : key === "loanRate"
          ? `${value}%`
          : `${value} yr`;

    return (
      <View key={key} style={styles.sliderGroup}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>{cfg.label}</Text>
          {loanEditingKey === key ? (
            <TextInput
              style={[styles.sliderValue, styles.sliderValueInput, styles.sliderValueInputActive]}
              value={loanEditingText}
              onChangeText={(text) => handleLoanValueChange(key, text)}
              onBlur={() => handleLoanValueSubmit(key)}
              onSubmitEditing={() => handleLoanValueSubmit(key)}
              keyboardType={key === "loanRate" ? "decimal-pad" : "numeric"}
              returnKeyType="done"
              selectTextOnFocus
              autoFocus
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TouchableOpacity
              style={styles.sliderValueDisplay}
              onPress={() => handleLoanValueFocus(key, value)}
            >
              <Text style={styles.sliderValue}>{displayValue}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sliderRow}>
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => adjustLoan(key, -1)}
            disabled={value <= cfg.min}
          >
            <Text style={[styles.sliderBtnText, value <= cfg.min && styles.sliderBtnDisabled]}>-</Text>
          </TouchableOpacity>
          <SmoothSlider
            value={value}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            onValueChange={(val) => handleLoanSliderChange(key, val)}
            trackColor={colors.bg}
            fillColor={colors.accent}
            thumbColor={colors.accent}
            thumbBorderColor={colors.card}
          />
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => adjustLoan(key, 1)}
            disabled={value >= cfg.max}
          >
            <Text style={[styles.sliderBtnText, value >= cfg.max && styles.sliderBtnDisabled]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* ── Emergency fund logic ── */

  const toggleEf = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEfOpen((prev) => !prev);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadEfData = async () => {
        const [entries, goals] = await Promise.all([
          getBudgetEntries(),
          getSavingsGoals(),
        ]);

        const avg = calcAvgMonthlyExpenses(entries);
        setAvgExpenses(avg);

        const efGoal = goals.find((g) => g.category === "emergency_fund");
        setCurrentEfAmount(efGoal?.currentAmount ?? 0);
        setEfTargetAmount(efGoal?.targetAmount ?? 0);
        setEfDataLoaded(true);
      };
      loadEfData();
    }, [])
  );

  const efMonthlyExpenses = efExpenseOverride
    ? parseFloat(efExpenseOverride) || 0
    : avgExpenses;
  const efThreeMonth = efMonthlyExpenses * 3;
  const efSixMonth = efMonthlyExpenses * 6;
  const efThreeProgress = efThreeMonth > 0 ? Math.min(1, currentEfAmount / efThreeMonth) : 0;
  const efSixProgress = efSixMonth > 0 ? Math.min(1, currentEfAmount / efSixMonth) : 0;
  const efThreeRemaining = Math.max(0, efThreeMonth - currentEfAmount);
  const efSixRemaining = Math.max(0, efSixMonth - currentEfAmount);
  const efMonthsToThree = efMonthlySavings > 0 && efThreeRemaining > 0
    ? Math.ceil(efThreeRemaining / efMonthlySavings)
    : 0;
  const efMonthsToSix = efMonthlySavings > 0 && efSixRemaining > 0
    ? Math.ceil(efSixRemaining / efMonthlySavings)
    : 0;

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

        {/* Return rate presets — shown only for the returnRate slider */}
        {key === "returnRate" && (
          <View style={styles.ratePresetRow}>
            {RATE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.ratePresetBtn,
                  returnRate === preset.rate && styles.ratePresetBtnActive,
                ]}
                onPress={() => setReturnRate(preset.rate)}
              >
                <Text
                  style={[
                    styles.ratePresetLabel,
                    returnRate === preset.rate && styles.ratePresetLabelActive,
                  ]}
                >
                  {preset.label}
                </Text>
                <Text
                  style={[
                    styles.ratePresetRate,
                    returnRate === preset.rate && styles.ratePresetRateActive,
                  ]}
                >
                  {preset.rate}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
          <Text style={styles.screenTitle}>Utilities</Text>
          <Text style={styles.screenSubtitle}>
            Financial tools and calculators.
          </Text>
        </View>

        {/* ── Compound Interest Calculator Tool ── */}
        <TouchableOpacity style={styles.toolHeader} onPress={toggleCalc} activeOpacity={0.7}>
          <View>
            <Text style={styles.toolTitle}>Compound Interest Calculator</Text>
            <Text style={styles.toolHint}>Project your investment growth over time</Text>
          </View>
          <Text style={styles.toolChevron}>{calcOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {calcOpen && (
          <View style={styles.toolBody}>
            {/* Result Card */}
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>PROJECTED VALUE</Text>
              <Text style={styles.resultValue}>{formatCurrency(totalValue)}</Text>
              <Text style={styles.resultSub}>
                in today's dollars · after {years} years at {returnRate}%
              </Text>
            </View>

            {/* Rule of 72 insight */}
            {returnRate > 0 && (
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
                  At {returnRate}%, your money doubles roughly every ~{doublingYears} years (Rule of 72)
                </Text>
              </View>
            )}

            {/* "Why 7%?" educational card */}
            <TouchableOpacity
              style={styles.whyCardToggle}
              onPress={toggleWhyCard}
              activeOpacity={0.7}
            >
              <Text style={[styles.whyCardToggleText, { color: colors.accent }]}>
                {showWhyCard ? "Hide: Why 7%?" : "Why 7%?"}
              </Text>
            </TouchableOpacity>

            {showWhyCard && (
              <View style={styles.whyCard}>
                <Text style={styles.whyCardTitle}>S&P 500 and Inflation</Text>
                <Text style={styles.whyCardBody}>
                  The S&P 500 is an index of the 500 largest US companies. It has returned an average of ~10% per year since 1926.
                </Text>
                <Text style={styles.whyCardBody}>
                  However, inflation (the rising cost of goods) historically averages ~3% per year. That means $100 today buys less in the future.
                </Text>
                <Text style={styles.whyCardBody}>
                  When we subtract inflation (10% - 3%), the real return is about 7%. This calculator uses inflation-adjusted returns by default, so the projected value represents what your money can actually buy in today's dollars.
                </Text>
                <View style={styles.whyCardDivider} />
                <Text style={styles.whyCardFooter}>
                  Past performance does not guarantee future results. Actual returns vary year to year.
                </Text>
              </View>
            )}

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
          </View>
        )}

        {/* ── Loan / Mortgage Calculator Tool ── */}
        <TouchableOpacity style={styles.toolHeader} onPress={toggleLoan} activeOpacity={0.7}>
          <View>
            <Text style={styles.toolTitle}>Loan / Mortgage Calculator</Text>
            <Text style={styles.toolHint}>See your monthly payment and total interest</Text>
          </View>
          <Text style={styles.toolChevron}>{loanOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {loanOpen && (
          <View style={styles.toolBody}>
            {/* Result */}
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>MONTHLY PAYMENT</Text>
              <Text style={styles.resultValue}>
                {isFinite(loanMonthlyPayment) ? formatCurrency(loanMonthlyPayment) : "--"}
              </Text>
              <Text style={styles.resultSub}>
                {formatCurrency(loanAmount)} loan · {loanRate}% APR · {loanTerm} years
              </Text>
            </View>

            {/* Sliders */}
            <View style={styles.slidersCard}>
              {renderLoanSlider("loanAmount", loanAmount)}
              {renderLoanSlider("loanRate", loanRate)}
              {renderLoanSlider("loanTerm", loanTerm)}

              <View style={styles.presetRow}>
                {LOAN_TERM_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetBtn, loanTerm === preset && styles.presetBtnActive]}
                    onPress={() => setLoanTerm(preset)}
                  >
                    <Text style={[styles.presetBtnText, loanTerm === preset && styles.presetBtnTextActive]}>
                      {preset}yr
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Breakdown */}
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Cost Breakdown</Text>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.success }]}>
                    {formatCurrency(loanAmount)}
                  </Text>
                  <Text style={styles.breakdownLabel}>Principal</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.danger }]}>
                    {formatCurrency(loanTotalInterest)}
                  </Text>
                  <Text style={styles.breakdownLabel}>Total Interest</Text>
                </View>
              </View>
              {loanTotalPaid > 0 && (
                <View style={styles.ratioBar}>
                  <View
                    style={[
                      styles.ratioFillContrib,
                      { width: `${(loanAmount / loanTotalPaid) * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.ratioFillInterest,
                      { width: `${(loanTotalInterest / loanTotalPaid) * 100}%`, backgroundColor: colors.danger },
                    ]}
                  />
                </View>
              )}
              {loanTotalPaid > 0 && (
                <Text style={styles.ratioText}>
                  You'll pay {formatCurrency(loanTotalPaid)} total over {loanTerm} years
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── Emergency Fund Calculator Tool ── */}
        <TouchableOpacity style={styles.toolHeader} onPress={toggleEf} activeOpacity={0.7}>
          <View>
            <Text style={styles.toolTitle}>Emergency Fund Calculator</Text>
            <Text style={styles.toolHint}>Track your safety net progress</Text>
          </View>
          <Text style={styles.toolChevron}>{efOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {efOpen && (
          <View style={styles.toolBody}>
            {/* Monthly expenses */}
            <View style={styles.efCard}>
              <Text style={styles.efSectionTitle}>Your Monthly Expenses</Text>
              {efDataLoaded && avgExpenses > 0 ? (
                <Text style={styles.efAutoHint}>
                  Based on your budget: {formatCurrency(avgExpenses)}/mo average
                </Text>
              ) : efDataLoaded ? (
                <Text style={styles.efAutoHint}>
                  No budget data yet — enter your monthly expenses below
                </Text>
              ) : null}
              <TextInput
                style={styles.efInput}
                placeholder={avgExpenses > 0 ? String(avgExpenses) : "Monthly expenses"}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={efExpenseOverride}
                onChangeText={setEfExpenseOverride}
              />
            </View>

            {efMonthlyExpenses > 0 && (
              <>
                {/* 3-month target */}
                <View style={styles.efCard}>
                  <View style={styles.efTargetHeader}>
                    <Text style={styles.efTargetTitle}>3-Month Fund</Text>
                    <Text style={[styles.efTargetAmount, { color: colors.accent }]}>
                      {formatCurrency(efThreeMonth)}
                    </Text>
                  </View>
                  <View style={styles.efProgressTrack}>
                    <View
                      style={[
                        styles.efProgressFill,
                        {
                          width: `${efThreeProgress * 100}%`,
                          backgroundColor: efThreeProgress >= 1 ? colors.success : colors.accent,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.efProgressRow}>
                    <Text style={styles.efProgressLabel}>
                      {formatCurrency(currentEfAmount)} saved
                    </Text>
                    <Text style={styles.efProgressLabel}>
                      {Math.round(efThreeProgress * 100)}%
                    </Text>
                  </View>
                  {efThreeProgress < 1 && efMonthsToThree > 0 && (
                    <Text style={styles.efTimeEstimate}>
                      ~{efMonthsToThree} {efMonthsToThree === 1 ? "month" : "months"} to reach at {formatCurrency(efMonthlySavings)}/mo
                    </Text>
                  )}
                  {efThreeProgress >= 1 && (
                    <Text style={[styles.efTimeEstimate, { color: colors.success }]}>
                      3-month fund reached!
                    </Text>
                  )}
                </View>

                {/* 6-month target */}
                <View style={styles.efCard}>
                  <View style={styles.efTargetHeader}>
                    <Text style={styles.efTargetTitle}>6-Month Fund</Text>
                    <Text style={[styles.efTargetAmount, { color: colors.accent }]}>
                      {formatCurrency(efSixMonth)}
                    </Text>
                  </View>
                  <View style={styles.efProgressTrack}>
                    <View
                      style={[
                        styles.efProgressFill,
                        {
                          width: `${efSixProgress * 100}%`,
                          backgroundColor: efSixProgress >= 1 ? colors.success : colors.teal,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.efProgressRow}>
                    <Text style={styles.efProgressLabel}>
                      {formatCurrency(currentEfAmount)} saved
                    </Text>
                    <Text style={styles.efProgressLabel}>
                      {Math.round(efSixProgress * 100)}%
                    </Text>
                  </View>
                  {efSixProgress < 1 && efMonthsToSix > 0 && (
                    <Text style={styles.efTimeEstimate}>
                      ~{efMonthsToSix} {efMonthsToSix === 1 ? "month" : "months"} to reach at {formatCurrency(efMonthlySavings)}/mo
                    </Text>
                  )}
                  {efSixProgress >= 1 && (
                    <Text style={[styles.efTimeEstimate, { color: colors.success }]}>
                      6-month fund reached!
                    </Text>
                  )}
                </View>

                {/* Monthly savings slider */}
                <View style={styles.slidersCard}>
                  <View style={styles.sliderGroup}>
                    <View style={styles.sliderHeader}>
                      <Text style={styles.sliderLabel}>Monthly Savings</Text>
                      <Text style={styles.sliderValue}>{formatCurrency(efMonthlySavings)}</Text>
                    </View>
                    <View style={styles.sliderRow}>
                      <TouchableOpacity
                        style={styles.sliderBtn}
                        onPress={() => setEfMonthlySavings((p) => Math.max(50, p - 50))}
                        disabled={efMonthlySavings <= 50}
                      >
                        <Text style={[styles.sliderBtnText, efMonthlySavings <= 50 && styles.sliderBtnDisabled]}>-</Text>
                      </TouchableOpacity>
                      <SmoothSlider
                        value={efMonthlySavings}
                        min={50}
                        max={10000}
                        step={50}
                        onValueChange={setEfMonthlySavings}
                        trackColor={colors.bg}
                        fillColor={colors.accent}
                        thumbColor={colors.accent}
                        thumbBorderColor={colors.card}
                      />
                      <TouchableOpacity
                        style={styles.sliderBtn}
                        onPress={() => setEfMonthlySavings((p) => Math.min(10000, p + 50))}
                        disabled={efMonthlySavings >= 10000}
                      >
                        <Text style={[styles.sliderBtnText, efMonthlySavings >= 10000 && styles.sliderBtnDisabled]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Educational note */}
                <View style={styles.insightCard}>
                  <Text style={styles.insightText}>
                    Financial experts recommend saving 3-6 months of living expenses. This covers job loss, medical emergencies, or unexpected repairs without going into debt.
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: tokens.pad,
      paddingBottom: 110,
    },
    titleSection: {
      paddingTop: 56,
      paddingBottom: tokens.gap,
      alignItems: "center",
    },
    appLabel: {
      fontSize: scale(12),
      color: colors.textDim,
      letterSpacing: 2,
      marginBottom: 4,
      textAlign: "center",
    },
    screenTitle: {
      fontSize: scale(28),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
      textAlign: "center",
    },
    screenSubtitle: {
      fontSize: scale(14),
      color: colors.textMuted,
      textAlign: "center",
    },

    /* Tool header — collapsible */
    toolHeader: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: tokens.radius,
      paddingVertical: tokens.pad,
      paddingHorizontal: tokens.pad + 2,
      marginBottom: tokens.gapSm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    toolTitle: {
      fontSize: scale(16),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    toolHint: {
      fontSize: 12,
      color: colors.textMuted,
    },
    toolChevron: {
      fontSize: 18,
      color: colors.textMuted,
      fontWeight: "600",
      marginLeft: 12,
    },
    toolBody: {
      gap: tokens.gapSm,
    },

    /* Result Card */
    resultCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: tokens.radius + 4,
      padding: tokens.padLg,
      alignItems: "center",
    },
    resultLabel: {
      fontSize: scale(10),
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    resultValue: {
      fontSize: scale(32),
      fontWeight: "700",
      color: colors.accent,
      fontVariant: ["tabular-nums"],
      marginBottom: 4,
    },
    resultSub: {
      fontSize: 13,
      color: colors.textDim,
      textAlign: "center",
    },

    /* Rule of 72 insight */
    insightCard: {
      backgroundColor: `${colors.accent}10`,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    insightText: {
      fontSize: 13,
      color: colors.textDim,
      textAlign: "center",
      lineHeight: 18,
    },

    /* "Why 7%?" toggle + card */
    whyCardToggle: {
      alignSelf: "center",
      paddingVertical: 4,
    },
    whyCardToggleText: {
      fontSize: 14,
      fontWeight: "700",
    },
    whyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius - 2,
      padding: tokens.pad,
      gap: tokens.gapSm,
    },
    whyCardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    whyCardBody: {
      fontSize: 13,
      color: colors.textDim,
      lineHeight: 19,
    },
    whyCardDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
    },
    whyCardFooter: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: "italic",
    },

    /* Sliders */
    slidersCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad + 2,
      gap: tokens.gapLg,
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

    /* Return rate presets */
    ratePresetRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: 4,
    },
    ratePresetBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    ratePresetBtnActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    ratePresetLabel: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
    },
    ratePresetLabelActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    ratePresetRate: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      marginTop: 1,
    },
    ratePresetRateActive: {
      color: colors.accent,
    },

    /* Year presets */
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

    /* Emergency Fund */
    efCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 16,
      gap: 8,
    },
    efSectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    efAutoHint: {
      fontSize: 12,
      color: colors.textDim,
    },
    efInput: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
    },
    efTargetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    efTargetTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    efTargetAmount: {
      fontSize: 16,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    efProgressTrack: {
      height: 10,
      backgroundColor: colors.bg,
      borderRadius: 999,
      overflow: "hidden",
    },
    efProgressFill: {
      height: "100%",
      borderRadius: 999,
      minWidth: 2,
    },
    efProgressRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    efProgressLabel: {
      fontSize: 12,
      color: colors.textDim,
      fontVariant: ["tabular-nums"],
    },
    efTimeEstimate: {
      fontSize: scale(12),
      color: colors.textMuted,
      textAlign: "center",
    },
  });
};

export default UtilitiesScreen;
