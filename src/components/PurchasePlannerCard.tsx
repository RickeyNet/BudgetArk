/**
 * BudgetArk - Purchase Planner Card
 * File: src/components/PurchasePlannerCard.tsx
 *
 * The Charts-tab "Plan a Purchase" tool: set up a sinking fund for a
 * specific item (name, price, monthly set-aside, optional need-by month),
 * see when it's ready and whether the pace fits your free cash flow, what
 * it costs in hours of take-home pay and against financing it instead, and
 * get Ark-milestone-aware guidance so the purchase never quietly derails
 * the bigger program. Saved plans persist as SavingsGoals, so they ride
 * partner sync, backups, and net worth like every other goal, and are
 * tracked day-to-day in the Bridge's Purchase Plans card (both surfaces
 * render the shared PurchasePlanList). All math lives in
 * utils/purchasePlanner (pure, unit-tested); this component is the thin
 * shell.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutAnimation,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { describeError } from "../utils/errorMessage";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type {
  Debt,
  DebtMilestonePlan,
  SavingsGoal,
  SavingsGoalCategory,
} from "../types";
import { addSavingsGoal } from "../storage/savingsGoalStorage";
import {
  assessPurchaseFit,
  buildArkPurchaseGuidance,
  calcFinanceVsSave,
  calcHourlyTakeHome,
  calcHoursOfWork,
  calcPurchaseSliderMax,
  calcPurchaseTimeline,
  calcRequiredMonthly,
  describeHoursOfWork,
  FINANCE_TERM_OPTIONS,
  suggestFinanceApr,
} from "../utils/purchasePlanner";
import {
  getPurchasePlanSettings,
  updatePurchasePlanSettings,
} from "../storage/purchasePlanSettingsStorage";
import {
  DEFAULT_PURCHASE_PLAN_SETTINGS,
  MAX_HOURLY_RATE,
  type PurchasePlanSettings,
} from "../utils/purchasePlanSettings";
import { parseMoneyInput } from "../utils/parseMoneyInput";
import type { MonthlyCashFlow } from "../utils/purchasePlanner";
import { calcDebtRedirectImpact, formatWhatIfMonths } from "../utils/whatIfSpending";
import { sanitizeTextInput } from "../utils/sanitize";
import { generateUUID } from "../utils/uuid";
import { triggerHaptic } from "../utils/haptics";
import SliderRow from "./SliderRow";
import { useToolStyles } from "../theme/toolStyles";
import MonthYearPicker from "./MonthYearPicker";
import PurchasePlanList, {
  filterPurchasePlans,
  formatPlanMonthYear,
  parsePlanAmount,
  PLAN_CATEGORIES,
} from "./PurchasePlanList";

export type { MonthlyCashFlow } from "../utils/purchasePlanner";

type PurchasePlannerCardProps = {
  cashFlow: MonthlyCashFlow;
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  milestonePlan: DebtMilestonePlan | null;
  /** Receives the live goals array after any mutation this card makes. */
  onGoalsChanged: (goals: SavingsGoal[]) => void;
};

const PurchasePlannerCard: React.FC<PurchasePlannerCardProps> = ({
  cashFlow,
  debts,
  savingsGoals,
  milestonePlan,
  onGoalsChanged,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const tool = useToolStyles();

  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  /* New-plan form state */
  const [itemName, setItemName] = useState("");
  const [priceText, setPriceText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [monthly, setMonthly] = useState(0);
  const [category, setCategory] = useState<SavingsGoalCategory>("other");
  const [needBy, setNeedBy] = useState("");
  const [showNeedByPicker, setShowNeedByPicker] = useState(false);

  const toggleOpen = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  }, []);

  const toggleForm = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowForm((prev) => !prev);
  }, []);

  /* ── Derived plan math ── */

  const price = parsePlanAmount(priceText);
  const alreadySaved = Math.max(0, parsePlanAmount(savedText));
  const sliderMax = calcPurchaseSliderMax(price, cashFlow);
  const timeline = useMemo(
    () => calcPurchaseTimeline(price, alreadySaved, monthly),
    [price, alreadySaved, monthly]
  );
  const fit = assessPurchaseFit(monthly, cashFlow);
  const guidance = useMemo(
    () => buildArkPurchaseGuidance(milestonePlan),
    [milestonePlan]
  );
  const requiredMonthly = useMemo(
    () => (needBy ? calcRequiredMonthly(price, alreadySaved, needBy) : null),
    [needBy, price, alreadySaved]
  );

  const activeDebts = useMemo(
    () =>
      debts
        .filter((d) => d.balance > 0)
        .map((d) => ({
          id: d.id,
          balance: d.balance,
          rate: d.rate,
          minPayment: d.minPayment,
          debtClass: d.debtClass,
        })),
    [debts]
  );
  // Avalanche keeps the trade-off framing consistent regardless of the
  // user's tracker preference: it's the cheapest-possible payoff, so the
  // shown cost of saving instead is never overstated.
  const debtImpact = useMemo(
    () =>
      activeDebts.length > 0 && monthly > 0 && price > 0
        ? calcDebtRedirectImpact(activeDebts, "avalanche", monthly)
        : null,
    [activeDebts, monthly, price]
  );

  const plans = useMemo(() => filterPurchasePlans(savingsGoals), [savingsGoals]);

  const canSave = itemName.trim().length > 0 && price > 0;

  /* ── Cost analysis: hours of work, finance vs save ── */

  // Shares the device-local record with PurchasePlanList; each side saves
  // only the fields it owns (patch merge in the store), debounced.
  const [analysis, setAnalysis] = useState<PurchasePlanSettings>(
    DEFAULT_PURCHASE_PLAN_SETTINGS
  );
  const [hourlyText, setHourlyText] = useState("");
  const analysisTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisPatch = useRef<Partial<PurchasePlanSettings>>({});
  useEffect(() => {
    let cancelled = false;
    void getPurchasePlanSettings().then((stored) => {
      if (cancelled) return;
      setAnalysis(stored);
      if (stored.hourlyOverride !== null) setHourlyText(String(stored.hourlyOverride));
    });
    return () => {
      cancelled = true;
      if (analysisTimer.current) clearTimeout(analysisTimer.current);
    };
  }, []);
  const changeAnalysis = useCallback((patch: Partial<PurchasePlanSettings>) => {
    setAnalysis((prev) => ({ ...prev, ...patch }));
    analysisPatch.current = { ...analysisPatch.current, ...patch };
    if (analysisTimer.current) clearTimeout(analysisTimer.current);
    analysisTimer.current = setTimeout(() => {
      analysisTimer.current = null;
      const toSave = analysisPatch.current;
      analysisPatch.current = {};
      void updatePurchasePlanSettings(toSave);
    }, 400);
  }, []);

  const hourlyFromIncome = calcHourlyTakeHome(cashFlow.avgIncome, analysis.hoursPerWeek);
  const hourlyRate = analysis.hourlyOverride ?? hourlyFromIncome;
  const hoursOfWork = useMemo(
    () => (hourlyRate ? calcHoursOfWork(price, hourlyRate, analysis.hoursPerWeek) : null),
    [price, hourlyRate, analysis.hoursPerWeek]
  );
  const financeApr = analysis.financeApr ?? suggestFinanceApr(activeDebts);
  const finance = useMemo(
    () =>
      calcFinanceVsSave({
        price,
        alreadySaved,
        monthlySetAside: monthly,
        aprPercent: financeApr,
        termMonths: analysis.financeTermMonths,
      }),
    [price, alreadySaved, monthly, financeApr, analysis.financeTermMonths]
  );
  const financeReady = useMemo(
    () =>
      finance && finance.saveMonths !== null
        ? calcPurchaseTimeline(price, alreadySaved, monthly).readyDate
        : null,
    [finance, price, alreadySaved, monthly]
  );

  /* ── Mutations ── */

  const resetForm = useCallback(() => {
    setItemName("");
    setPriceText("");
    setSavedText("");
    setMonthly(0);
    setCategory("other");
    setNeedBy("");
  }, []);

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleStartFund = useCallback(async () => {
    if (!canSave) return;
    setSaveError(null);
    const now = new Date().toISOString();
    try {
      const updated = await addSavingsGoal({
        id: generateUUID(),
        name: sanitizeTextInput(itemName.trim()),
        category,
        targetAmount: price,
        currentAmount: alreadySaved,
        targetDate: needBy ? `${needBy}-01` : undefined,
        createdAt: now,
        updatedAt: now,
      });
      triggerHaptic("success");
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      resetForm();
      setShowForm(false);
      onGoalsChanged(updated);
    } catch (error) {
      // Keep the form (and what the user typed) so they can retry.
      triggerHaptic("error");
      setSaveError(describeError(error, "Couldn't start this fund. Please try again."));
    }
  }, [alreadySaved, canSave, category, itemName, needBy, onGoalsChanged, price, resetForm]);

  /* ── Render helpers ── */

  const toneColor =
    guidance.tone === "go"
      ? colors.success
      : guidance.tone === "caution"
        ? colors.warning
        : colors.danger;
  const toneBg =
    guidance.tone === "go"
      ? colors.successDim
      : guidance.tone === "caution"
        ? colors.warningDim
        : colors.dangerDim;

  const fitLine =
    fit === "fits"
      ? `Fits comfortably: about ${formatCurrency(cashFlow.freeCashFlow)}/mo is left over after your average spending, and this uses half or less.`
      : fit === "tight"
        ? `Tight: this claims most of the ~${formatCurrency(cashFlow.freeCashFlow)}/mo left after your average spending. Doable, but there's little room for surprises.`
        : fit === "over"
          ? cashFlow.freeCashFlow > 0
            ? `Over budget: this is more than the ~${formatCurrency(cashFlow.freeCashFlow)}/mo left after your average spending - it WILL cut into other spending or goals. Try a smaller amount or a later date.`
            : "Your average spending already meets or exceeds your income, so any set-aside will cut into existing spending or goals. Consider trimming a category first (the What-If tool above can help)."
          : null;

  return (
    <>
      <TouchableOpacity style={tool.toolHeader} onPress={toggleOpen} activeOpacity={0.7}>
        <View>
          <Text style={tool.toolTitle}>Plan a Purchase</Text>
          <Text style={tool.toolHint}>
            Sinking funds that fit around your Ark milestones
          </Text>
        </View>
        <Text style={tool.toolChevron}>{open ? "▾" : "›"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={tool.toolBody}>
          {/* Existing plans - tracked day-to-day on the Bridge, editable here too */}
          {plans.length > 0 && (
            <View style={tool.efCard}>
              <Text style={tool.efSectionTitle}>Your plans</Text>
              <Text style={tool.efAutoHint}>
                Tap a plan to add funds. Plans live on your Bridge and count
                toward net worth.
              </Text>
              <PurchasePlanList
                savingsGoals={savingsGoals}
                onGoalsChanged={onGoalsChanged}
                cashFlow={cashFlow}
              />
            </View>
          )}

          {/* New plan */}
          {!showForm ? (
            <TouchableOpacity style={styles.newPlanBtn} onPress={toggleForm}>
              <Text style={styles.newPlanBtnText}>+ Plan a new purchase</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={tool.efCard}>
                <Text style={tool.efSectionTitle}>What are you saving for?</Text>
                <TextInput
                  style={tool.input}
                  placeholder="e.g. New laptop"
                  placeholderTextColor={colors.textMuted}
                  value={itemName}
                  onChangeText={(text) => setItemName(sanitizeTextInput(text))}
                  maxLength={40}
                />
                <View style={tool.inputRow}>
                  <View style={tool.inputHalf}>
                    <Text style={tool.inputLabel}>Price</Text>
                    <TextInput
                      style={tool.input}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      value={priceText}
                      onChangeText={setPriceText}
                      maxLength={12}
                    />
                  </View>
                  <View style={tool.inputHalf}>
                    <Text style={tool.inputLabel}>Already saved</Text>
                    <TextInput
                      style={tool.input}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      value={savedText}
                      onChangeText={setSavedText}
                      maxLength={12}
                    />
                  </View>
                </View>
                <View style={tool.chipWrap}>
                  {PLAN_CATEGORIES.map((option) => {
                    const isSelected = option.key === category;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[tool.chip, isSelected && tool.chipActive]}
                        onPress={() => setCategory(option.key)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[tool.chipText, isSelected && tool.chipTextActive]}
                        >
                          {option.icon} {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {price > 0 && (
                <>
                  {/* Monthly set-aside */}
                  <View style={tool.efCard}>
                    <View style={tool.sliderGroup}>
                      <SliderRow
                        label="Set aside each month"
                        value={monthly}
                        min={0}
                        max={sliderMax}
                        step={5}
                        displayValue={formatCurrency(monthly)}
                        onValueChange={setMonthly}
                        onAdjust={(delta) =>
                          setMonthly((p) => Math.max(0, Math.min(sliderMax, p + delta * 25)))
                        }
                      />

                      {/* Need-by month */}
                      <TouchableOpacity
                        style={styles.needByRow}
                        onPress={() => setShowNeedByPicker(true)}
                      >
                        <Text style={styles.needByLabel}>Need it by</Text>
                        <Text style={styles.needByValue}>
                          {needBy
                            ? formatPlanMonthYear(new Date(`${needBy}-15`))
                            : "No date - whenever it's funded"}
                        </Text>
                      </TouchableOpacity>
                      {requiredMonthly !== null && requiredMonthly > 0 && (
                        <Text style={tool.efAutoHint}>
                          That date needs {formatCurrency(requiredMonthly)}/mo
                          {monthly > 0 && monthly < requiredMonthly
                            ? ` - your current ${formatCurrency(monthly)}/mo won't make it in time.`
                            : "."}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Timeline + fit */}
                  <View style={tool.efCard}>
                    <Text style={tool.efSectionTitle}>
                      {timeline.monthsToReady === 0
                        ? "You could buy this today"
                        : timeline.readyDate
                          ? `Ready ${formatPlanMonthYear(timeline.readyDate)} (${formatWhatIfMonths(timeline.monthsToReady)})`
                          : "Pick a monthly amount to see a date"}
                    </Text>
                    {fitLine && <Text style={styles.fitText}>{fitLine}</Text>}
                    {fit === "unknown" && cashFlow.monthsTracked === 0 && monthly > 0 && (
                      <Text style={tool.efAutoHint}>
                        Log a few months of income and expenses in the Budget tab
                        and this tool can check the pace against your real cash
                        flow.
                      </Text>
                    )}
                  </View>

                  {/* Cost analysis */}
                  {price > 0 ? (
                    <View style={tool.efCard}>
                      <Text style={tool.efSectionTitle}>What it really costs</Text>

                      {/* Hours of work */}
                      {hoursOfWork && hourlyRate ? (
                        <Text style={styles.fitText}>
                          {`${formatCurrency(price)} is ${describeHoursOfWork(hoursOfWork)} at ${formatCurrency(Math.round(hourlyRate * 100) / 100)}/hr take-home${
                            analysis.hourlyOverride === null
                              ? ` (from your average income of ${formatCurrency(cashFlow.avgIncome)}/mo)`
                              : ""
                          }.`}
                        </Text>
                      ) : (
                        <Text style={tool.efAutoHint}>
                          Log your income in the Budget tab, or type your take-home
                          per hour below, to see this price in hours of work.
                        </Text>
                      )}
                      <View style={tool.sliderGroup}>
                        <SliderRow
                          label="Hours you work per week"
                          value={analysis.hoursPerWeek}
                          min={1}
                          max={80}
                          step={1}
                          displayValue={`${analysis.hoursPerWeek} hrs`}
                          onValueChange={(value) =>
                            changeAnalysis({ hoursPerWeek: Math.round(value) })
                          }
                          onAdjust={(delta) =>
                            changeAnalysis({
                              hoursPerWeek: Math.max(
                                1,
                                Math.min(80, analysis.hoursPerWeek + delta)
                              ),
                            })
                          }
                        />
                      </View>
                      <Text style={tool.inputLabel}>
                        {hourlyFromIncome
                          ? "Or type your take-home per hour (leave blank to use your income)"
                          : "Your take-home per hour"}
                      </Text>
                      <TextInput
                        style={tool.input}
                        placeholder="e.g. 28.50"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        value={hourlyText}
                        onChangeText={(text) => {
                          setHourlyText(text);
                          const parsed = parseMoneyInput(text);
                          changeAnalysis({
                            hourlyOverride:
                              parsed !== null && parsed > 0 && parsed <= MAX_HOURLY_RATE
                                ? parsed
                                : null,
                          });
                        }}
                      />

                      {/* Finance vs save */}
                      <Text style={[tool.efSectionTitle, styles.analysisSubTitle]}>
                        Finance it vs. save for it
                      </Text>
                      <View style={tool.sliderGroup}>
                        <SliderRow
                          label="APR if you financed it"
                          value={financeApr}
                          min={0}
                          max={40}
                          step={0.5}
                          displayValue={`${financeApr.toFixed(1)}%`}
                          onValueChange={(value) => changeAnalysis({ financeApr: value })}
                          onAdjust={(delta) =>
                            changeAnalysis({
                              financeApr: Math.max(0, Math.min(40, financeApr + delta)),
                            })
                          }
                        />
                      </View>
                      <View style={tool.chipWrap}>
                        {FINANCE_TERM_OPTIONS.map((term) => (
                          <TouchableOpacity
                            key={term}
                            style={[
                              tool.chip,
                              analysis.financeTermMonths === term && tool.chipActive,
                            ]}
                            onPress={() => changeAnalysis({ financeTermMonths: term })}
                            accessibilityRole="button"
                            accessibilityState={{ selected: analysis.financeTermMonths === term }}
                          >
                            <Text
                              style={[
                                tool.chipText,
                                analysis.financeTermMonths === term && tool.chipTextActive,
                              ]}
                            >
                              {term} mo
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {finance ? (
                        <>
                          <Text style={styles.fitText}>
                            {`Financing ${formatCurrency(finance.financed)} at ${financeApr.toFixed(1)}% over ${finance.termMonths} months: ${formatCurrency(Math.round(finance.monthlyPayment))}/mo, ${formatCurrency(Math.round(finance.totalInterest))} in interest (${formatCurrency(Math.round(finance.totalPaid))} total).`}
                          </Text>
                          {finance.saveMonths !== null && financeReady ? (
                            <Text style={styles.fitText}>
                              {finance.saveMonths === 0
                                ? "You already have the money - saving wins outright."
                                : `Saving instead gets it ${formatPlanMonthYear(financeReady)}, ${formatWhatIfMonths(finance.saveMonths)} later, and keeps the ${formatCurrency(Math.round(finance.totalInterest))}${
                                    finance.interestPerMonthSooner !== null
                                      ? ` - about ${formatCurrency(Math.round(finance.interestPerMonthSooner))} for every month of waiting the loan would skip`
                                      : ""
                                  }.${
                                    finance.extraPerMonthVsSaving > 0
                                      ? ` The loan payment is also ${formatCurrency(Math.round(finance.extraPerMonthVsSaving))}/mo more than your set-aside, for ${finance.termMonths} months.`
                                      : ""
                                  }`}
                            </Text>
                          ) : (
                            <Text style={tool.efAutoHint}>
                              Pick a monthly set-aside above to compare the wait
                              against the interest.
                            </Text>
                          )}
                          {guidance.tone !== "go" && guidance.stepTitle ? (
                            <Text style={[styles.fitText, { color: toneColor }]}>
                              {`A new loan while you're on the ${guidance.stepTitle} step moves your Ark backwards - that interest is money the step needs.`}
                            </Text>
                          ) : null}
                        </>
                      ) : (
                        <Text style={tool.efAutoHint}>
                          Nothing to finance - what you've saved already covers it.
                        </Text>
                      )}
                    </View>
                  ) : null}

                  {/* Ark guidance */}
                  <View style={[styles.arkCard, { backgroundColor: toneBg }]}>
                    <Text style={[styles.arkTitle, { color: toneColor }]}>
                      {guidance.stepTitle
                        ? `Your Ark: ${guidance.stepTitle} step`
                        : "Sinking-fund thinking"}
                    </Text>
                    <Text style={styles.arkText}>{guidance.message}</Text>
                    {debtImpact &&
                      guidance.tone !== "go" &&
                      debtImpact.baseline.isPayoffPossible && (
                        <Text style={styles.arkText}>
                          Trade-off: {formatCurrency(monthly)}/mo toward your debts
                          instead would make you debt-free{" "}
                          {formatWhatIfMonths(debtImpact.monthsSaved)} sooner
                          {debtImpact.interestSaved >= 1
                            ? ` and save ${formatCurrency(Math.round(debtImpact.interestSaved))} in interest`
                            : ""}
                          .
                        </Text>
                      )}
                  </View>

                  {saveError ? (
                    <Text style={styles.saveError}>{saveError}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.startBtn, !canSave && styles.startBtnDisabled]}
                    onPress={handleStartFund}
                    disabled={!canSave}
                  >
                    <Text style={styles.startBtnText}>Start this fund</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.cancelFormBtn} onPress={toggleForm}>
                <Text style={styles.cancelFormText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Need-by month picker */}
      <MonthYearPicker
        visible={showNeedByPicker}
        value={needBy}
        confirm
        title="Need it by"
        minYear={new Date().getFullYear()}
        onSelect={setNeedBy}
        onClose={() => setShowNeedByPicker(false)}
      />
    </>
  );
};

/**
 * Style values for the tool header/body/cards deliberately mirror
 * ChartsScreen's makeStyles so this card reads as one of the screen's
 * tools despite living in its own file.
 */
const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  return StyleSheet.create({

    /* Inputs */

    /* Slider */
    needByRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    needByLabel: {
      fontSize: 13,
      color: colors.textDim,
      fontWeight: "500",
    },
    needByValue: {
      fontSize: 13,
      color: colors.accent,
      fontWeight: "600",
    },

    /* Cost analysis */
    analysisSubTitle: {
      marginTop: 12,
    },

    /* Fit + Ark guidance */
    fitText: {
      fontSize: 13,
      color: colors.textDim,
      lineHeight: 18,
    },
    arkCard: {
      borderRadius: 14,
      padding: 16,
      gap: 8,
    },
    arkTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    arkText: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },

    /* Buttons */
    newPlanBtn: {
      borderWidth: 1,
      borderColor: `${colors.accent}50`,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: `${colors.accent}10`,
    },
    newPlanBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.accent,
    },
    saveError: {
      fontSize: 12,
      color: colors.danger,
      marginBottom: 8,
    },
    startBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    startBtnDisabled: {
      opacity: 0.4,
    },
    startBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.accentButtonText,
    },
    cancelFormBtn: {
      alignItems: "center",
      paddingVertical: 10,
    },
    cancelFormText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textDim,
    },
  });
};

export default PurchasePlannerCard;
