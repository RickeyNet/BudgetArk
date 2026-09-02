/**
 * BudgetArk - Purchase Plan List
 * File: src/components/PurchasePlanList.tsx
 *
 * The shared "your purchase plans" list: a summary header (everything
 * added up, the ranking method, the combined monthly set-aside and how it
 * flows down the list), ranked progress rows with projected ready dates,
 * plus the contribute and delete modals that manage them. Ranking and
 * allocation math is utils/purchasePlanner (pure, unit-tested); the
 * method / mode / amount persist device-locally via
 * storage/purchasePlanSettingsStorage, the hand-set order on the goals.
 * Rendered in two places - the Bridge's always-visible Purchase Plans
 * card (the tracking home) and the Charts tab's Plan a Purchase tool
 * (the planning wizard) - so both surfaces stay in lockstep instead of
 * drifting copies. Mutations go through savingsGoalStorage (tombstoned,
 * synced, exported); the fresh array is handed back via onGoalsChanged.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareModalOverlay } from "./KeyboardAwareModalOverlay";
import SliderRow from "./SliderRow";
import PurchasePlanChart from "./PurchasePlanChart";
import { describeError } from "../utils/errorMessage";
import { parseMoneyInput } from "../utils/parseMoneyInput";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type { Debt, SavingsGoal, SavingsGoalCategory } from "../types";
import {
  deleteSavingsGoal,
  updateSavingsGoal,
  updateSavingsGoalPriorities,
} from "../storage/savingsGoalStorage";
import {
  assessPurchaseFit,
  buildSavingsChart,
  calcCombinedSliderMax,
  calcCostPerUse,
  calcDebtOpportunityCost,
  calcPlanNudges,
  calcRequiredMonthly,
  describeCostPerUse,
  describeDebtOpportunityCost,
  MAX_USEFUL_LIFE_YEARS,
  MAX_USES_PER_MONTH,
  movePlanInOrder,
  orderPurchasePlans,
  pickOpportunityDebt,
  PLAN_ALLOCATION_LABELS,
  PLAN_ALLOCATION_MODES,
  PLAN_PRIORITY_METHOD_HINTS,
  PLAN_PRIORITY_METHOD_LABELS,
  PLAN_PRIORITY_METHODS,
  projectPurchasePlans,
  suggestCombinedMonthly,
  summarizePurchasePlans,
  type MonthlyCashFlow,
  type PlanProjection,
} from "../utils/purchasePlanner";
import {
  getPurchasePlanSettings,
  updatePurchasePlanSettings,
} from "../storage/purchasePlanSettingsStorage";
import {
  DEFAULT_PURCHASE_PLAN_SETTINGS,
  type PurchasePlanSettings,
} from "../utils/purchasePlanSettings";
import { triggerHaptic } from "../utils/haptics";

/** Purchase-friendly labels for the existing SavingsGoal categories. */
export const PLAN_CATEGORIES: readonly {
  key: SavingsGoalCategory;
  label: string;
  icon: string;
}[] = [
  { key: "car", label: "Car", icon: "🚗" },
  { key: "home", label: "Home", icon: "🏠" },
  { key: "travel", label: "Travel", icon: "✈️" },
  { key: "education", label: "Education", icon: "🎓" },
  { key: "other", label: "Other", icon: "🎁" },
];

export const iconForPlanCategory = (category: SavingsGoalCategory): string =>
  PLAN_CATEGORIES.find((c) => c.key === category)?.icon ?? "🎁";

/** Parse a user-typed amount; NaN-safe, returns 0 for junk. */
/** Shared money rule (utils/parseMoneyInput); negative = withdraw from the plan. */
export const parsePlanAmount = (text: string): number =>
  parseMoneyInput(text, { allowNegative: true }) ?? 0;

export const formatPlanMonthYear = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: "short", year: "numeric" });

/**
 * The goals this list manages: everything except the emergency fund
 * (which has its own row/calculator surfaces), newest first.
 */
export const filterPurchasePlans = (goals: SavingsGoal[]): SavingsGoal[] =>
  goals
    .filter((goal) => goal.category !== "emergency_fund")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

type PurchasePlanListProps = {
  /** Full goals array; the EF filter happens here. */
  savingsGoals: SavingsGoal[];
  /** Receives the live goals array after any mutation this list makes. */
  onGoalsChanged: (goals: SavingsGoal[]) => void;
  /** Rendered when there are no plans; omit to render nothing at all. */
  emptyText?: string;
  /**
   * Free-cash-flow context for the combined set-aside's fits / tight / over
   * verdict and the slider ceiling. Optional: without it the header still
   * adds up and projects, it just can't say whether the amount fits.
   */
  cashFlow?: MonthlyCashFlow | null;
  /**
   * Live debts, for each row's opportunity-cost line ("$150/mo on Chase
   * Visa instead would clear it 4 months sooner..."). Optional: without
   * them the line is simply absent.
   */
  debts?: Debt[];
};

/** Debounce for persisting slider drags. */
const SETTINGS_SAVE_DELAY_MS = 400;

const PurchasePlanList: React.FC<PurchasePlanListProps> = ({
  savingsGoals,
  onGoalsChanged,
  emptyText,
  cashFlow = null,
  debts,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const styles = React.useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [contributeText, setContributeText] = useState("");
  /** Cost-per-use inputs edited in the contribute dialog. */
  const [usesText, setUsesText] = useState("");
  const [yearsText, setYearsText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);
  /** Last failed contribute/delete, shown inside the plan dialog. */
  const [actionError, setActionError] = useState<string | null>(null);

  const plans = filterPurchasePlans(savingsGoals);

  /* ── Ranking, allocation, and the summary header ── */

  const [settings, setSettings] = useState<PurchasePlanSettings>(
    DEFAULT_PURCHASE_PLAN_SETTINGS,
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Fields changed since the last write - saved as one merged patch. */
  const pendingPatch = useRef<Partial<PurchasePlanSettings>>({});
  useEffect(() => {
    let cancelled = false;
    void getPurchasePlanSettings().then((stored) => {
      if (!cancelled) setSettings(stored);
    });
    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  /**
   * Update + persist (debounced, so a slider drag is one write). Only the
   * changed fields are written: the planner card owns the analysis fields
   * of the same record and must not be overwritten with stale copies.
   */
  const changeSettings = useCallback((patch: Partial<PurchasePlanSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      const toSave = pendingPatch.current;
      pendingPatch.current = {};
      void updatePurchasePlanSettings(toSave);
    }, SETTINGS_SAVE_DELAY_MS);
  }, []);

  const summary = useMemo(() => summarizePurchasePlans(plans), [plans]);
  const ordered = useMemo(
    () => orderPurchasePlans(plans, settings.method),
    [plans, settings.method],
  );
  // Never-set amount: suggest one from the dated plans / free cash flow.
  const combinedMonthly =
    settings.combinedMonthly ?? suggestCombinedMonthly(summary, cashFlow);
  const sliderMax = useMemo(
    () => Math.max(calcCombinedSliderMax(summary, cashFlow), combinedMonthly),
    [summary, cashFlow, combinedMonthly],
  );
  const projection = useMemo(
    () => projectPurchasePlans(ordered, combinedMonthly, settings.allocation),
    [ordered, combinedMonthly, settings.allocation],
  );
  // Stacked cumulative-savings chart; only worth drawing once money flows.
  const chartModel = useMemo(
    () =>
      combinedMonthly > 0 && summary.fundedCount < summary.planCount
        ? buildSavingsChart(ordered, combinedMonthly, settings.allocation)
        : null,
    [ordered, combinedMonthly, settings.allocation, summary],
  );
  const formatChartMonth = useCallback((monthsFromNow: number) => {
    if (monthsFromNow === 0) return "Now";
    const date = new Date();
    return formatPlanMonthYear(new Date(date.getFullYear(), date.getMonth() + monthsFromNow, 1));
  }, []);

  const projectionById = useMemo(() => {
    const map = new Map<string, PlanProjection>();
    for (const item of projection.projections) map.set(item.goalId, item);
    return map;
  }, [projection]);
  const fit = cashFlow ? assessPurchaseFit(combinedMonthly, cashFlow) : "unknown";
  const lateCount = projection.projections.filter(
    (item) => item.lateByMonths !== null && item.lateByMonths > 0,
  ).length;

  // The debt this list's money would otherwise attack (highest rate, the
  // avalanche target); each row measures its this-month share against it.
  const opportunityDebt = useMemo(
    () => pickOpportunityDebt((debts ?? []).filter((debt) => !debt.deletedAt)),
    [debts],
  );

  const [reorderError, setReorderError] = useState<string | null>(null);
  const movePlan = useCallback(
    async (goalId: string, direction: -1 | 1) => {
      const assignments = movePlanInOrder(ordered, goalId, direction);
      if (!assignments) return;
      setReorderError(null);
      try {
        const updated = await updateSavingsGoalPriorities(assignments);
        triggerHaptic("selection");
        onGoalsChanged(updated);
      } catch (error) {
        setReorderError(describeError(error, "Couldn't save the new order."));
      }
    },
    [onGoalsChanged, ordered],
  );

  const fitLine =
    !cashFlow || fit === "unknown"
      ? cashFlow && cashFlow.monthsTracked === 0 && combinedMonthly > 0
        ? "Track a full month of income and spending and this will say whether the amount fits."
        : null
      : fit === "fits"
        ? `Fits: about ${formatCurrency(cashFlow.freeCashFlow)}/mo is free after your average spending.`
        : fit === "tight"
          ? `Tight: this takes most of the ~${formatCurrency(cashFlow.freeCashFlow)}/mo free after your average spending.`
          : cashFlow.freeCashFlow > 0
            ? `Over: more than the ~${formatCurrency(cashFlow.freeCashFlow)}/mo free after your average spending.`
            : "Over: your average spending already exceeds your income, so any set-aside comes from somewhere else.";

  /** Open the contribute dialog, optionally with an amount prefilled (nudges). */
  const openContribute = useCallback((goal: SavingsGoal, presetAmount?: number) => {
    setContributeText(presetAmount !== undefined ? String(presetAmount) : "");
    setUsesText(goal.usesPerMonth !== undefined ? String(goal.usesPerMonth) : "");
    setYearsText(goal.usefulLifeYears !== undefined ? String(goal.usefulLifeYears) : "");
    setActionError(null);
    setContributeGoal(goal);
  }, []);

  const closeContribute = useCallback(() => {
    setContributeGoal(null);
    setContributeText("");
    setUsesText("");
    setYearsText("");
  }, []);

  const handleContribute = useCallback(async () => {
    if (!contributeGoal) return;
    const amount = parsePlanAmount(contributeText);
    // Cost-per-use fields: blank or junk clears the value.
    const parseUse = (text: string, max: number): number | undefined => {
      const value = parseMoneyInput(text);
      return value !== null && value > 0 && value <= max ? value : undefined;
    };
    const usesPerMonth = parseUse(usesText, MAX_USES_PER_MONTH);
    const usefulLifeYears = parseUse(yearsText, MAX_USEFUL_LIFE_YEARS);
    const usesChanged =
      usesPerMonth !== contributeGoal.usesPerMonth ||
      usefulLifeYears !== contributeGoal.usefulLifeYears;
    if (amount === 0 && !usesChanged) {
      closeContribute();
      return;
    }
    setActionError(null);
    try {
      const updated = await updateSavingsGoal(contributeGoal.id, {
        ...(amount !== 0
          ? { currentAmount: Math.max(0, contributeGoal.currentAmount + amount) }
          : {}),
        ...(usesChanged ? { usesPerMonth, usefulLifeYears } : {}),
      });
      triggerHaptic("success");
      closeContribute();
      onGoalsChanged(updated);
    } catch (error) {
      // Dialog stays open with the typed values so the user can retry.
      triggerHaptic("error");
      setActionError(describeError(error, "Couldn't save this plan."));
    }
  }, [closeContribute, contributeGoal, contributeText, onGoalsChanged, usesText, yearsText]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      const updated = await deleteSavingsGoal(deleteTarget.id);
      triggerHaptic("warning");
      setDeleteTarget(null);
      setContributeGoal(null);
      onGoalsChanged(updated);
    } catch (error) {
      // Back out of the confirm; the plan dialog underneath shows why.
      triggerHaptic("error");
      setDeleteTarget(null);
      setActionError(describeError(error, "Couldn't delete this plan."));
    }
  }, [deleteTarget, onGoalsChanged]);

  if (plans.length === 0 && !emptyText) return null;

  return (
    <>
      {plans.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        <>
          {/* ── Everything added up ── */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>SAVED</Text>
                <Text style={styles.summaryBig}>{formatCurrency(summary.totalSaved)}</Text>
              </View>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>STILL TO GO</Text>
                <Text style={styles.summaryBig}>{formatCurrency(summary.totalRemaining)}</Text>
              </View>
              <View style={styles.summaryColRight}>
                <Text style={styles.summaryLabel}>TOTAL</Text>
                <Text style={styles.summaryBig}>{formatCurrency(summary.totalTarget)}</Text>
              </View>
            </View>
            <View style={styles.planTrack}>
              <View
                style={[
                  styles.planFill,
                  {
                    width: `${Math.round(summary.progress * 100)}%`,
                    backgroundColor:
                      summary.progress >= 1 ? colors.success : colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={styles.summaryMeta}>
              {`${summary.planCount} plan${summary.planCount === 1 ? "" : "s"}`}
              {summary.fundedCount > 0 ? ` · ${summary.fundedCount} funded` : ""}
              {projection.allFundedDate
                ? projection.allFundedInMonths === 0
                  ? " · all funded"
                  : ` · all funded by ${formatPlanMonthYear(projection.allFundedDate)}`
                : combinedMonthly > 0
                  ? " · not all funded within 20 years at this pace"
                  : " · set a monthly amount below to see when"}
            </Text>
            {lateCount > 0 ? (
              <Text style={[styles.summaryMeta, { color: colors.warning }]}>
                {`${lateCount} plan${lateCount === 1 ? "" : "s"} would miss ${
                  lateCount === 1 ? "its" : "their"
                } need-by date at this pace.`}
              </Text>
            ) : null}
          </View>

          {/* ── Order ── */}
          <Text style={styles.controlLabel}>ORDER</Text>
          <View style={styles.chipRow}>
            {PLAN_PRIORITY_METHODS.map((method) => (
              <TouchableOpacity
                key={method}
                style={[styles.chip, settings.method === method && styles.chipActive]}
                onPress={() => changeSettings({ method })}
                accessibilityRole="button"
                accessibilityState={{ selected: settings.method === method }}
              >
                <Text
                  style={[
                    styles.chipText,
                    settings.method === method && styles.chipTextActive,
                  ]}
                >
                  {PLAN_PRIORITY_METHOD_LABELS[method]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hintText}>{PLAN_PRIORITY_METHOD_HINTS[settings.method]}</Text>

          {/* ── Combined set-aside + how it flows ── */}
          <SliderRow
            label="Set aside for all plans"
            value={combinedMonthly}
            min={0}
            max={sliderMax}
            step={5}
            displayValue={`${formatCurrency(combinedMonthly)}/mo`}
            onValueChange={(value) => changeSettings({ combinedMonthly: value })}
            onAdjust={(delta) =>
              changeSettings({
                combinedMonthly: Math.max(
                  0,
                  Math.min(sliderMax, combinedMonthly + delta * 25),
                ),
              })
            }
          />
          {fitLine ? (
            <Text
              style={[
                styles.hintText,
                fit === "over"
                  ? { color: colors.danger }
                  : fit === "tight"
                    ? { color: colors.warning }
                    : null,
              ]}
            >
              {fitLine}
            </Text>
          ) : null}
          <View style={styles.chipRow}>
            {PLAN_ALLOCATION_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.chip, settings.allocation === mode && styles.chipActive]}
                onPress={() => changeSettings({ allocation: mode })}
                accessibilityRole="button"
                accessibilityState={{ selected: settings.allocation === mode }}
              >
                <Text
                  style={[
                    styles.chipText,
                    settings.allocation === mode && styles.chipTextActive,
                  ]}
                >
                  {PLAN_ALLOCATION_LABELS[mode]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hintText}>
            {settings.allocation === "rollover"
              ? "The whole amount goes to the first plan; when it's funded, the money rolls into the next - like a debt snowball."
              : "The amount is split evenly across every unfunded plan, and a finished plan's share moves to the rest."}
          </Text>
          {chartModel ? (
            <PurchasePlanChart
              model={chartModel}
              colors={colors}
              formatCompactCurrency={formatCompactCurrency}
              formatMonth={formatChartMonth}
            />
          ) : null}
          {reorderError ? (
            <Text style={[styles.hintText, { color: colors.danger }]}>{reorderError}</Text>
          ) : null}

          {/* ── Ranked plans ── */}
          {ordered.map((goal, index) => {
            const funded =
              goal.currentAmount >= goal.targetAmount && goal.targetAmount > 0;
            const progress =
              goal.targetAmount > 0
                ? Math.min(1, goal.currentAmount / goal.targetAmount)
                : 0;
            const planRequired = goal.targetDate
              ? calcRequiredMonthly(
                  goal.targetAmount,
                  goal.currentAmount,
                  goal.targetDate.slice(0, 7)
                )
              : null;
            const projected = projectionById.get(goal.id);
            const late =
              projected && projected.lateByMonths !== null && projected.lateByMonths > 0;
            const projectionLine = funded
              ? null
              : !projected || combinedMonthly <= 0
                ? null
                : projected.readyDate
                  ? `Ready ${formatPlanMonthYear(projected.readyDate)}${
                      projected.monthlyNow > 0
                        ? ` · ${formatCurrency(projected.monthlyNow)}/mo now`
                        : " · waits its turn"
                    }${
                      late
                        ? ` · ${
                            projected.lateByMonths === Infinity
                              ? "misses"
                              : `${projected.lateByMonths} mo late for`
                          } ${goal.targetDate ? formatPlanMonthYear(new Date(`${goal.targetDate.slice(0, 7)}-15`)) : "its date"}`
                        : ""
                    }`
                  : "Not funded within 20 years at this pace";
            const opportunity =
              !funded && opportunityDebt && projected && projected.monthlyNow > 0
                ? calcDebtOpportunityCost(opportunityDebt, projected.monthlyNow)
                : null;
            const costPerUse = calcCostPerUse(
              goal.targetAmount,
              goal.usesPerMonth,
              goal.usefulLifeYears,
            );
            const nudges = funded
              ? null
              : calcPlanNudges(ordered, goal.id, combinedMonthly, settings.allocation);
            const describeSooner = (months: number): string =>
              months === Infinity ? "makes it happen" : `${months} mo sooner`;
            return (
              <View key={goal.id} style={styles.planRowWrap}>
              <View style={styles.planRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <TouchableOpacity
                  style={styles.planMain}
                  onPress={() => openContribute(goal)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Add funds to ${goal.name}`}
                >
                  <Text style={styles.planIcon}>
                    {iconForPlanCategory(goal.category)}
                  </Text>
                  <View style={styles.planBody}>
                    <Text style={styles.planName} numberOfLines={1}>
                      {goal.name}
                    </Text>
                    <View style={styles.planTrack}>
                      <View
                        style={[
                          styles.planFill,
                          {
                            width: `${Math.round(progress * 100)}%`,
                            backgroundColor: funded ? colors.success : colors.accent,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.planMeta}>
                      {funded
                        ? "Funded - ready to buy 🎉"
                        : `${formatCurrency(goal.currentAmount)} of ${formatCurrency(goal.targetAmount)}${
                            planRequired && planRequired > 0
                              ? ` · ${formatCurrency(planRequired)}/mo to hit ${formatPlanMonthYear(new Date(`${goal.targetDate?.slice(0, 7)}-15`))}`
                              : ""
                          }`}
                    </Text>
                    {projectionLine ? (
                      <Text
                        style={[
                          styles.planMeta,
                          late ? { color: colors.warning } : null,
                        ]}
                      >
                        {projectionLine}
                      </Text>
                    ) : null}
                    {opportunity ? (
                      <Text style={styles.planMeta}>
                        {describeDebtOpportunityCost(opportunity, formatCurrency)}
                      </Text>
                    ) : null}
                    {costPerUse !== null &&
                    goal.usesPerMonth !== undefined &&
                    goal.usefulLifeYears !== undefined ? (
                      <Text style={styles.planMeta}>
                        {describeCostPerUse(
                          costPerUse,
                          goal.usesPerMonth,
                          goal.usefulLifeYears,
                          formatCurrency,
                        )}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.planChevron}>›</Text>
                </TouchableOpacity>
                {settings.method === "custom" ? (
                  <View style={styles.arrowCol}>
                    <TouchableOpacity
                      style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
                      disabled={index === 0}
                      onPress={() => void movePlan(goal.id, -1)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${goal.name} up`}
                    >
                      <Text style={styles.arrowText}>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.arrowBtn,
                        index === ordered.length - 1 && styles.arrowBtnDisabled,
                      ]}
                      disabled={index === ordered.length - 1}
                      onPress={() => void movePlan(goal.id, 1)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${goal.name} down`}
                    >
                      <Text style={styles.arrowText}>▼</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
              {nudges && (nudges.extraMonthly || nudges.lumpSum) ? (
                <View style={styles.nudgeRow}>
                  {nudges.extraMonthly ? (
                    <TouchableOpacity
                      style={styles.nudgeChip}
                      onPress={() =>
                        changeSettings({
                          combinedMonthly: combinedMonthly + nudges.extraMonthly!.amount,
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${formatCurrency(nudges.extraMonthly.amount)} a month to all plans`}
                    >
                      <Text style={styles.nudgeText}>
                        {`+${formatCurrency(nudges.extraMonthly.amount)}/mo · ${describeSooner(nudges.extraMonthly.monthsSooner)}`}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {nudges.lumpSum ? (
                    <TouchableOpacity
                      style={styles.nudgeChip}
                      onPress={() => openContribute(goal, nudges.lumpSum!.amount)}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${formatCurrency(nudges.lumpSum.amount)} to ${goal.name} now`}
                    >
                      <Text style={styles.nudgeText}>
                        {nudges.lumpSum.finishes
                          ? `Finish it: ${formatCurrency(nudges.lumpSum.amount)} now`
                          : `+${formatCurrency(nudges.lumpSum.amount)} now · ${describeSooner(nudges.lumpSum.monthsSooner)}`}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
              </View>
            );
          })}
        </>
      )}

      {/* Contribute modal */}
      <Modal
        visible={contributeGoal !== null}
        animationType="fade"
        transparent
        onRequestClose={closeContribute}
      >
        <KeyboardAwareModalOverlay style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>
              {contributeGoal
                ? `${iconForPlanCategory(contributeGoal.category)} ${contributeGoal.name}`
                : ""}
            </Text>
            <Text style={styles.dialogMessage}>
              {contributeGoal
                ? `${formatCurrency(contributeGoal.currentAmount)} of ${formatCurrency(contributeGoal.targetAmount)} saved.`
                : ""}
            </Text>
            {actionError ? (
              <Text style={[styles.dialogMessage, { color: colors.danger }]}>
                {actionError}
              </Text>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Amount to add"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              value={contributeText}
              onChangeText={setContributeText}
              maxLength={12}
              autoFocus
            />
            <Text style={styles.inputHint}>
              Use a negative amount to correct a mistake.
            </Text>
            <Text style={styles.inputLabel}>COST PER USE (OPTIONAL)</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Uses per month"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={usesText}
                onChangeText={setUsesText}
                maxLength={6}
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Years you'll keep it"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={yearsText}
                onChangeText={setYearsText}
                maxLength={5}
              />
            </View>
            {contributeGoal &&
            (() => {
              const uses = parseMoneyInput(usesText);
              const years = parseMoneyInput(yearsText);
              const value =
                uses !== null && years !== null
                  ? calcCostPerUse(contributeGoal.targetAmount, uses, years)
                  : null;
              return value !== null && uses !== null && years !== null ? (
                <Text style={styles.inputHint}>
                  {describeCostPerUse(value, uses, years, formatCurrency)}
                </Text>
              ) : (
                <Text style={styles.inputHint}>
                  How often you'll use it, and for how long, turns the price
                  into a cost per use.
                </Text>
              );
            })()}
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={closeContribute}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={handleContribute}
              >
                <Text style={[styles.dialogBtnText, { color: colors.accentButtonText }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.deleteLink}
              onPress={() => {
                if (contributeGoal) setDeleteTarget(contributeGoal);
              }}
            >
              <Text style={[styles.deleteLinkText, { color: colors.danger }]}>
                Delete this plan
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareModalOverlay>
      </Modal>

      {/* Delete confirm */}
      <Modal
        visible={deleteTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Delete plan?</Text>
            <Text style={styles.dialogMessage}>
              {deleteTarget
                ? `"${deleteTarget.name}" and its ${formatCurrency(deleteTarget.currentAmount)} saved-so-far record will be removed. The money itself stays wherever you keep it.`
                : ""}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Keep it
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.danger }]}
                onPress={handleDelete}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    emptyText: {
      fontSize: scale(13),
      color: colors.textDim,
      textAlign: "center",
      paddingVertical: 8,
      lineHeight: 18,
    },
    planRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    planIcon: {
      fontSize: 22,
    },
    planBody: {
      flex: 1,
      gap: 4,
    },
    planName: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    planTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.bg,
      overflow: "hidden",
    },
    planFill: {
      height: "100%",
      borderRadius: 3,
    },
    planMeta: {
      fontSize: 12,
      color: colors.textDim,
      fontVariant: ["tabular-nums"],
    },
    planChevron: {
      fontSize: 18,
      color: colors.textMuted,
    },
    planMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    planRowWrap: {
      gap: 2,
    },
    nudgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      paddingLeft: 34,
      paddingBottom: 6,
    },
    nudgeChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.bg,
    },
    nudgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.accent,
      fontVariant: ["tabular-nums"],
    },
    inputLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginTop: 10,
      marginBottom: 6,
    },
    inputRow: {
      flexDirection: "row",
      gap: 8,
    },
    inputHalf: {
      flex: 1,
    },
    summaryCard: {
      backgroundColor: colors.bg,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      gap: 8,
      marginBottom: tokens.gap,
    },
    summaryTopRow: {
      flexDirection: "row",
      gap: tokens.gap,
    },
    summaryCol: {
      flex: 1,
    },
    summaryColRight: {
      flex: 1,
      alignItems: "flex-end",
    },
    summaryLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textMuted,
    },
    summaryBig: {
      fontSize: scale(16),
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    summaryMeta: {
      fontSize: 12,
      color: colors.textDim,
      lineHeight: 17,
    },
    controlLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: 6,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 6,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    chipText: {
      fontSize: scale(12),
      fontWeight: "600",
      color: colors.textDim,
    },
    chipTextActive: {
      color: colors.accentButtonText,
    },
    hintText: {
      fontSize: 12,
      color: colors.textDim,
      lineHeight: 17,
      marginTop: 6,
      marginBottom: 4,
    },
    rankBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    rankText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textDim,
      fontVariant: ["tabular-nums"],
    },
    arrowCol: {
      gap: 2,
    },
    arrowBtn: {
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    arrowBtnDisabled: {
      opacity: 0.3,
    },
    arrowText: {
      fontSize: 12,
      color: colors.accent,
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
    inputHint: {
      fontSize: 12,
      color: colors.textDim,
    },
    dialogOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    dialogBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 20,
      gap: 10,
    },
    dialogTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    dialogMessage: {
      fontSize: 13,
      color: colors.textDim,
      textAlign: "center",
      lineHeight: 18,
    },
    dialogActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    dialogBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    dialogBtnText: {
      fontSize: 14,
      fontWeight: "700",
    },
    deleteLink: {
      alignItems: "center",
      paddingVertical: 6,
    },
    deleteLinkText: {
      fontSize: 13,
      fontWeight: "600",
    },
  });
};

export default PurchasePlanList;
