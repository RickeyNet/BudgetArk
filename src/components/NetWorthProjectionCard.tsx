/**
 * BudgetArk - Net Worth Projection Card
 * File: src/components/NetWorthProjectionCard.tsx
 *
 * Bridge-tab card under the net-worth history: the same line carried
 * forward (utils/netWorthProjection - budget surplus grows the assets,
 * the minimums-only payoff schedule shrinks the debts) with an optional
 * goal: a target net worth by the end of a month (device-local, see
 * storage/netWorthGoalStorage). The chart draws the last year of monthly
 * snapshots solid, the projection dashed, and the goal as a marker; the
 * text says on/off track, the pace it would take, and when the current
 * pace gets there. The screen passes the entries / debts / totals it
 * already holds so this card and the history card agree on today's number.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutAnimation,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import type { BudgetEntry, Debt, NetWorthSnapshot } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import MonthYearPicker from "./MonthYearPicker";
import {
  buildNetWorthOutlook,
  MAX_GOAL_AMOUNT,
  suggestGoalMonth,
  type NetWorthGoal,
} from "../utils/netWorthProjection";
import { clearNetWorthGoal, getNetWorthGoal, saveNetWorthGoal } from "../storage/netWorthGoalStorage";
import { getMonthKey, getMonthKeyOffset } from "../utils/budgetMonths";
import { parseMoneyInput } from "../utils/parseMoneyInput";
import { triggerHaptic } from "../utils/haptics";
import { describeError } from "../utils/errorMessage";

interface NetWorthProjectionCardProps {
  entries: BudgetEntry[];
  debts: Debt[];
  snapshots: NetWorthSnapshot[];
  totalAssets: number;
  netWorth: number;
  formatCurrency: (value: number) => string;
  formatCompactCurrency: (value: number) => string;
}

const H = 170;
const PAD_L = 50;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 26;
const CHART_H = H - PAD_T - PAD_B;
const HISTORY_MONTHS = 12;

const shortMonth = (monthKey: string): string =>
  new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });

const longMonth = (monthKey: string): string =>
  new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

const NetWorthProjectionCard: React.FC<NetWorthProjectionCardProps> = ({
  entries,
  debts,
  snapshots,
  totalAssets,
  netWorth,
  formatCurrency,
  formatCompactCurrency,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(240, Math.min(320, windowWidth - 68));
  const innerWidth = chartWidth - PAD_L - PAD_R;

  const [goal, setGoal] = useState<NetWorthGoal | null>(null);
  const [editing, setEditing] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [targetMonth, setTargetMonth] = useState(() => suggestGoalMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getNetWorthGoal()
      .then((stored) => {
        if (!cancelled) setGoal(stored);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const outlook = useMemo(
    () => buildNetWorthOutlook({ entries, debts, currentAssets: totalAssets, goal }),
    [entries, debts, totalAssets, goal]
  );

  /* Last snapshot of each of the previous HISTORY_MONTHS months. */
  const history = useMemo(() => {
    const byMonth = new Map<string, NetWorthSnapshot>();
    for (const snapshot of snapshots) {
      const key = snapshot.dayKey.slice(0, 7);
      const existing = byMonth.get(key);
      if (!existing || existing.dayKey < snapshot.dayKey) byMonth.set(key, snapshot);
    }
    const out: { monthOffset: number; value: number }[] = [];
    for (let back = HISTORY_MONTHS; back >= 1; back--) {
      const key = getMonthKeyOffset(-back);
      const snapshot = byMonth.get(key);
      if (snapshot) out.push({ monthOffset: -back, value: snapshot.netWorth });
    }
    return out;
  }, [snapshots]);

  const chart = useMemo(() => {
    const projection = outlook.points.map((p) => ({ monthOffset: p.monthOffset, value: p.netWorth }));
    const historyLine = [...history, { monthOffset: 0, value: netWorth }];
    const minOffset = historyLine[0].monthOffset;
    const maxOffset = projection[projection.length - 1].monthOffset;
    const values = [...historyLine, ...projection].map((p) => p.value);
    if (outlook.goal) values.push(outlook.goal.targetAmount);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const pad = Math.max((max - min) * 0.12, Math.abs(max) * 0.05, 100);
    min -= pad;
    max += pad;
    const toX = (offset: number) =>
      PAD_L + ((offset - minOffset) / Math.max(maxOffset - minOffset, 1)) * innerWidth;
    const toY = (value: number) => PAD_T + CHART_H - ((value - min) / (max - min)) * CHART_H;
    const path = (points: { monthOffset: number; value: number }[]) =>
      points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.monthOffset)},${toY(p.value)}`).join(" ");
    return {
      historyPath: history.length > 0 ? path(historyLine) : null,
      projectionPath: path(projection),
      nowX: toX(0),
      nowY: toY(netWorth),
      endX: toX(maxOffset),
      endY: toY(projection[projection.length - 1].value),
      goalX: outlook.goal ? toX(Math.min(outlook.goal.monthsUntil, maxOffset)) : null,
      goalY: outlook.goal ? toY(outlook.goal.targetAmount) : null,
      zeroY: min <= 0 && max >= 0 ? toY(0) : null,
      ticks: [max, (max + min) / 2, min],
      toY,
      startLabel: minOffset < 0 ? shortMonth(getMonthKeyOffset(minOffset)) : "Now",
      endLabel: shortMonth(getMonthKeyOffset(maxOffset)),
    };
  }, [history, innerWidth, netWorth, outlook]);

  const beginEdit = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setError(null);
    setAmountText(goal ? String(goal.targetAmount) : "");
    setTargetMonth(goal?.targetMonth ?? suggestGoalMonth());
    setEditing(true);
  }, [goal]);

  const cancelEdit = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    const amount = parseMoneyInput(amountText, { allowNegative: true, max: MAX_GOAL_AMOUNT });
    if (amount === null) {
      setError("Enter a target amount.");
      return;
    }
    if (targetMonth < getMonthKey()) {
      setError("Pick a month that hasn't passed.");
      return;
    }
    try {
      const createdAt = goal ? goal.createdAt : new Date().toISOString();
      const saved = await saveNetWorthGoal({ targetAmount: amount, targetMonth, createdAt });
      if (!saved) {
        setError("That goal couldn't be saved.");
        return;
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setGoal(saved);
      setEditing(false);
      setError(null);
      triggerHaptic("success");
    } catch (err) {
      triggerHaptic("error");
      setError(describeError(err, "Couldn't save the goal."));
    }
  }, [amountText, goal, targetMonth]);

  const handleRemove = useCallback(async () => {
    try {
      await clearNetWorthGoal();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setGoal(null);
      setEditing(false);
      triggerHaptic("selection");
    } catch (err) {
      setError(describeError(err, "Couldn't remove the goal."));
    }
  }, []);

  const endPoint = outlook.points[outlook.points.length - 1];
  const surplusText =
    outlook.surplus.monthsTracked === 0
      ? "No budget history yet, so the line assumes nothing is added month to month - log a few months and it learns your pace."
      : `At your pace of ${outlook.surplus.monthly >= 0 ? "+" : "-"}${formatCurrency(
          Math.abs(outlook.surplus.monthly)
        )}/mo after spending and debt minimums (last ${outlook.surplus.monthsTracked} tracked ${
          outlook.surplus.monthsTracked === 1 ? "month" : "months"
        }), with debts paid down at their minimums.`;

  const goalAssessment = outlook.goal;
  const goalColor = goalAssessment?.onTrack ? colors.success : colors.warning;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Where This Is Heading</Text>
          <Text style={styles.subtext}>
            {formatCurrency(endPoint.netWorth)} by {longMonth(getMonthKeyOffset(outlook.horizonMonths))}
          </Text>
        </View>
        {goalAssessment ? (
          <View style={[styles.badge, { borderColor: goalColor, backgroundColor: `${goalColor}20` }]}>
            <Text style={[styles.badgeText, { color: goalColor }]}>
              {goalAssessment.onTrack ? "On track" : "Off track"}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.chartWrap}>
        <Svg width={chartWidth} height={H} viewBox={`0 0 ${chartWidth} ${H}`}>
          {chart.ticks.map((tick, index) => {
            const y = chart.toY(tick);
            return (
              <React.Fragment key={`tick-${index}`}>
                <Line
                  x1={PAD_L}
                  y1={y}
                  x2={chartWidth - PAD_R}
                  y2={y}
                  stroke={colors.textMuted}
                  strokeWidth={0.7}
                  opacity={0.3}
                />
                <SvgText x={PAD_L - 6} y={y + 3} fill={colors.textDim} fontSize={9} textAnchor="end">
                  {formatCompactCurrency(tick)}
                </SvgText>
              </React.Fragment>
            );
          })}
          {chart.zeroY !== null ? (
            <Line
              x1={PAD_L}
              y1={chart.zeroY}
              x2={chartWidth - PAD_R}
              y2={chart.zeroY}
              stroke={colors.cardBorder}
              strokeWidth={1}
            />
          ) : null}
          {chart.goalY !== null ? (
            <Line
              x1={PAD_L}
              y1={chart.goalY}
              x2={chartWidth - PAD_R}
              y2={chart.goalY}
              stroke={goalColor}
              strokeWidth={1}
              strokeDasharray="3,4"
              opacity={0.8}
            />
          ) : null}
          {chart.historyPath ? (
            <Path d={chart.historyPath} stroke={colors.accent} strokeWidth={2.5} fill="none" />
          ) : null}
          <Path
            d={chart.projectionPath}
            stroke={colors.teal}
            strokeWidth={2.5}
            strokeDasharray="6,5"
            fill="none"
          />
          <Line
            x1={chart.nowX}
            y1={PAD_T}
            x2={chart.nowX}
            y2={PAD_T + CHART_H}
            stroke={colors.textMuted}
            strokeWidth={0.7}
            opacity={0.5}
          />
          <Circle cx={chart.nowX} cy={chart.nowY} r={4} fill={colors.accent} />
          <Circle
            cx={chart.endX}
            cy={chart.endY}
            r={3.5}
            fill={colors.card}
            stroke={colors.teal}
            strokeWidth={2}
          />
          {chart.goalX !== null && chart.goalY !== null ? (
            <Circle cx={chart.goalX} cy={chart.goalY} r={5} fill={goalColor} />
          ) : null}
          <SvgText x={PAD_L} y={H - 5} fill={colors.textDim} fontSize={9} textAnchor="start">
            {chart.startLabel}
          </SvgText>
          {chart.historyPath ? (
            <SvgText x={chart.nowX} y={H - 5} fill={colors.textDim} fontSize={9} textAnchor="middle">
              Now
            </SvgText>
          ) : null}
          <SvgText x={chartWidth - PAD_R} y={H - 5} fill={colors.textDim} fontSize={9} textAnchor="end">
            {chart.endLabel}
          </SvgText>
        </Svg>
      </View>

      <Text style={styles.paceText}>{surplusText}</Text>

      {editing ? (
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Target net worth</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 100000"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            value={amountText}
            onChangeText={setAmountText}
            maxLength={14}
          />
          <Text style={styles.fieldLabel}>By the end of</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowMonthPicker(true)}
            accessibilityRole="button"
          >
            <Text style={styles.inputText}>{longMonth(targetMonth)}</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleSave()} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>Save goal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={cancelEdit} accessibilityRole="button">
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
            {goal ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => void handleRemove()} accessibilityRole="button">
                <Text style={[styles.secondaryBtnText, { color: colors.danger }]}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : goalAssessment ? (
        <View style={styles.goalBox}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>
              Goal: {formatCurrency(goalAssessment.targetAmount)} by {longMonth(goalAssessment.targetMonth)}
            </Text>
            <TouchableOpacity onPress={beginEdit} accessibilityRole="button">
              <Text style={styles.link}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.goalLine}>
            Projected then: {formatCurrency(goalAssessment.projectedAtTarget)} (
            {goalAssessment.gap >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(goalAssessment.gap))})
          </Text>
          {goalAssessment.onTrack ? (
            <Text style={[styles.goalLine, { color: colors.success }]}>
              {goalAssessment.reachMonths !== null && goalAssessment.reachMonths < goalAssessment.monthsUntil
                ? `At this pace you get there around ${longMonth(
                    getMonthKeyOffset(goalAssessment.reachMonths)
                  )} - early.`
                : "Right on pace."}
            </Text>
          ) : (
            <Text style={[styles.goalLine, { color: colors.warning }]}>
              Needs about {formatCurrency(Math.max(0, goalAssessment.requiredMonthly))}/mo to land on time
              {goalAssessment.reachDate
                ? `; at today's pace it arrives around ${longMonth(
                    getMonthKeyOffset(goalAssessment.reachMonths ?? 0)
                  )}.`
                : "; today's pace never reaches it."}
            </Text>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.primaryBtn} onPress={beginEdit} accessibilityRole="button">
          <Text style={styles.primaryBtnText}>Set a net worth goal</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.footerHint}>
        Solid: monthly history. Dashed: projection. Estimates, not promises - markets, raises and
        surprises all move the line.
      </Text>

      <MonthYearPicker
        visible={showMonthPicker}
        value={targetMonth}
        onSelect={setTargetMonth}
        onClose={() => setShowMonthPicker(false)}
        confirm
        title="Reach it by the end of"
        minYear={new Date().getFullYear()}
      />
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: `${colors.teal}40`,
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
      marginBottom: tokens.gapSm,
    },
    headerTextWrap: {
      flex: 1,
    },
    title: {
      fontSize: scale(18),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtext: {
      fontSize: scale(12),
      lineHeight: 18,
      color: colors.textDim,
      fontVariant: ["tabular-nums"],
    },
    badge: {
      borderWidth: 1,
      borderRadius: tokens.radiusPill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeText: {
      fontSize: scale(11),
      fontWeight: "700",
    },
    chartWrap: {
      alignItems: "center",
    },
    paceText: {
      fontSize: scale(12),
      lineHeight: scale(17),
      color: colors.textDim,
      marginTop: 6,
      marginBottom: tokens.gapSm,
    },
    goalBox: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: tokens.gapSm,
      gap: 4,
    },
    goalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: tokens.gapSm,
    },
    goalTitle: {
      flex: 1,
      fontSize: scale(14),
      fontWeight: "700",
      color: colors.text,
    },
    goalLine: {
      fontSize: scale(12),
      lineHeight: scale(17),
      color: colors.textDim,
      fontVariant: ["tabular-nums"],
    },
    link: {
      fontSize: scale(13),
      fontWeight: "600",
      color: colors.accent,
    },
    form: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: tokens.gapSm,
      gap: 6,
    },
    fieldLabel: {
      fontSize: scale(12),
      fontWeight: "600",
      color: colors.textDim,
    },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: scale(15),
      color: colors.text,
    },
    inputText: {
      fontSize: scale(15),
      color: colors.text,
    },
    actionRow: {
      flexDirection: "row",
      gap: tokens.gapSm,
      marginTop: 4,
    },
    primaryBtn: {
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.pad,
      paddingVertical: tokens.padSm,
    },
    primaryBtnText: {
      fontSize: scale(13),
      fontWeight: "700",
      color: colors.accentButtonText,
    },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.pad,
      paddingVertical: tokens.padSm,
    },
    secondaryBtnText: {
      fontSize: scale(13),
      fontWeight: "600",
      color: colors.textDim,
    },
    errorText: {
      fontSize: scale(12),
      color: colors.danger,
    },
    footerHint: {
      fontSize: scale(11),
      color: colors.textMuted,
      marginTop: tokens.gapSm,
      textAlign: "center",
    },
  });
};

export default React.memo(NetWorthProjectionCard);
