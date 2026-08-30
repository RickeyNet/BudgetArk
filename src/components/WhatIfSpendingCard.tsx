/**
 * BudgetArk - "What If I Stopped Spending on X" Card
 * File: src/components/WhatIfSpendingCard.tsx
 *
 * The Charts-tab what-if tool: pick a spending category (monthly averages
 * from utils/whatIfSpending), choose how much of it to redirect, and see
 * the debt-payoff impact (avalanche / snowball) and the savings growth.
 * The screen passes the category averages and debts it already loads on
 * focus; the card owns its selection, amount and method. Extracted from
 * ChartsScreen.
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useToolStyles } from "../theme/toolStyles";
import { useCurrency } from "../currency/CurrencyProvider";
import SliderRow from "./SliderRow";
import {
  buildSavingsGrowthMarks,
  calcDebtRedirectImpact,
  calcRedirectSliderMax,
  formatWhatIfMonths,
  WHAT_IF_DEFAULT_RETURN_RATE,
  WHAT_IF_LOOKBACK_MONTHS,
} from "../utils/whatIfSpending";
import type { CategorySpendOption } from "../utils/whatIfSpending";
import type { PayoffMethod } from "../utils/calculations";
import { getCategoryIcon } from "../data/categoryIcons";
import type { CustomCategory, Debt } from "../types";

interface WhatIfSpendingCardProps {
  /** Per-category monthly averages from buildCategorySpendOptions. */
  options: CategorySpendOption[];
  /** All debts; the card keeps the ones with a balance. */
  debts: Debt[];
  customCategories: CustomCategory[];
}

const WhatIfSpendingCard: React.FC<WhatIfSpendingCardProps> = ({
  options,
  debts,
  customCategories,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const tool = useToolStyles();

  /* "What If I Stopped Spending on X" state */
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfCategory, setWhatIfCategory] = useState<string | null>(null);
  const [whatIfAmount, setWhatIfAmount] = useState(0);
  const [whatIfMethod, setWhatIfMethod] = useState<PayoffMethod>("avalanche");

  /* ── What-if spending logic ── */

  const toggleWhatIf = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWhatIfOpen((prev) => !prev);
  }, []);

  const handleSelectWhatIfCategory = useCallback(
    (option: CategorySpendOption) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setWhatIfCategory(option.category);
      setWhatIfAmount(option.monthlyAverage);
    },
    []
  );

  // A category can vanish from the options after a focus reload (entries
  // deleted / aged out of the lookback window); treat that as no selection.
  const selectedWhatIfOption = useMemo(
    () => options.find((o) => o.category === whatIfCategory) ?? null,
    [options, whatIfCategory]
  );

  const whatIfSliderMax = calcRedirectSliderMax(
    selectedWhatIfOption?.monthlyAverage ?? 0
  );

  const whatIfActiveDebts = useMemo(
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

  const whatIfDebtImpact = useMemo(
    () =>
      selectedWhatIfOption && whatIfActiveDebts.length > 0 && whatIfAmount > 0
        ? calcDebtRedirectImpact(whatIfActiveDebts, whatIfMethod, whatIfAmount)
        : null,
    [selectedWhatIfOption, whatIfActiveDebts, whatIfMethod, whatIfAmount]
  );

  const whatIfSavingsMarks = useMemo(
    () =>
      selectedWhatIfOption && whatIfAmount > 0
        ? buildSavingsGrowthMarks(whatIfAmount)
        : [],
    [selectedWhatIfOption, whatIfAmount]
  );


  return (
    <>
        {/* ── "What If I Stopped Spending on X" Tool ── */}
        <TouchableOpacity style={tool.toolHeader} onPress={toggleWhatIf} activeOpacity={0.7}>
          <View>
            <Text style={tool.toolTitle}>What If I Stopped Spending on…</Text>
            <Text style={tool.toolHint}>Redirect a category toward debt or savings</Text>
          </View>
          <Text style={tool.toolChevron}>{whatIfOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {whatIfOpen && (
          <View style={tool.toolBody}>
            {options.length === 0 ? (
              <View style={tool.efCard}>
                <Text style={tool.refiEmptyText}>
                  Log a few months of expenses in the Budget tab, then come back to see what redirecting a category could do.
                </Text>
              </View>
            ) : (
              <>
                {/* Category picker */}
                <View style={tool.efCard}>
                  <Text style={tool.efSectionTitle}>Pick a category</Text>
                  <Text style={tool.efAutoHint}>
                    Monthly averages from your last {WHAT_IF_LOOKBACK_MONTHS} months of entries
                  </Text>
                  <View style={tool.chipWrap}>
                    {options.map((option) => {
                      const isSelected = option.category === whatIfCategory;
                      return (
                        <TouchableOpacity
                          key={option.category}
                          style={[tool.chip, isSelected && tool.chipActive]}
                          onPress={() => handleSelectWhatIfCategory(option)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              tool.chipText,
                              isSelected && tool.chipTextActive,
                            ]}
                          >
                            {getCategoryIcon(option.category, customCategories)} {option.category}
                          </Text>
                          <Text
                            style={[
                              styles.whatIfChipAmount,
                              isSelected && tool.chipTextActive,
                            ]}
                          >
                            {formatCurrency(option.monthlyAverage)}/mo
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {selectedWhatIfOption && (
                  <>
                    {/* Redirect amount */}
                    <View style={tool.slidersCard}>
                      <SliderRow
                        label="Monthly Amount to Redirect"
                        value={whatIfAmount}
                        min={0}
                        max={whatIfSliderMax}
                        step={5}
                        displayValue={formatCurrency(whatIfAmount)}
                        onValueChange={setWhatIfAmount}
                        onAdjust={(delta) =>
                          setWhatIfAmount((p) =>
                            Math.max(0, Math.min(whatIfSliderMax, p + delta * 25)),
                          )
                        }
                      >
                        <Text style={tool.efAutoHint}>
                          You average {formatCurrency(selectedWhatIfOption.monthlyAverage)}/mo on {selectedWhatIfOption.category}
                        </Text>
                      </SliderRow>
                    </View>

                    {/* Debt payoff impact */}
                    {whatIfDebtImpact && (
                      <View style={tool.efCard}>
                        <Text style={tool.efSectionTitle}>Put it toward debt</Text>
                        <View style={styles.whatIfMethodRow}>
                          {(["avalanche", "snowball"] as const).map((method) => (
                            <TouchableOpacity
                              key={method}
                              style={[
                                styles.whatIfMethodBtn,
                                whatIfMethod === method && styles.whatIfMethodBtnActive,
                              ]}
                              onPress={() => setWhatIfMethod(method)}
                            >
                              <Text
                                style={[
                                  styles.whatIfMethodBtnText,
                                  whatIfMethod === method && styles.whatIfMethodBtnTextActive,
                                ]}
                              >
                                {method === "avalanche" ? "Avalanche" : "Snowball"}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={tool.refiSummaryRow}>
                          <View style={tool.refiSummaryItem}>
                            <Text style={tool.refiSummaryLabel}>Current plan</Text>
                            <Text style={tool.refiSummaryValue}>
                              {formatWhatIfMonths(whatIfDebtImpact.baseline.monthsToPayoff)}
                            </Text>
                          </View>
                          <View style={tool.refiSummaryItem}>
                            <Text style={tool.refiSummaryLabel}>Redirecting</Text>
                            <Text style={[tool.refiSummaryValue, { color: colors.accent }]}>
                              {formatWhatIfMonths(whatIfDebtImpact.redirect.monthsToPayoff)}
                            </Text>
                          </View>
                        </View>
                        {whatIfDebtImpact.monthsSaved === Infinity ? (
                          <Text style={[tool.efTimeEstimate, { color: colors.success }]}>
                            This extra payment turns an unpayable plan into a real payoff date.
                          </Text>
                        ) : !whatIfDebtImpact.redirect.isPayoffPossible ? (
                          <Text style={tool.efTimeEstimate}>
                            Minimums plus this extra still don&apos;t cover the interest - try a larger amount.
                          </Text>
                        ) : whatIfDebtImpact.monthsSaved > 0 ? (
                          <Text style={[tool.efTimeEstimate, { color: colors.success }]}>
                            Debt-free {formatWhatIfMonths(whatIfDebtImpact.monthsSaved)} sooner
                            {whatIfDebtImpact.interestSaved >= 1
                              ? ` · saves ${formatCurrency(Math.round(whatIfDebtImpact.interestSaved))} in interest`
                              : ""}
                          </Text>
                        ) : null}
                      </View>
                    )}

                    {/* Savings growth */}
                    <View style={tool.efCard}>
                      <Text style={tool.efSectionTitle}>
                        {whatIfDebtImpact ? "…or grow it in savings" : "Grow it in savings"}
                      </Text>
                      {whatIfActiveDebts.length === 0 && (
                        <Text style={tool.efAutoHint}>
                          No active debts to pay down - showing savings growth only.
                        </Text>
                      )}
                      {whatIfSavingsMarks.map((mark) => (
                        <View key={mark.years} style={styles.whatIfGrowthRow}>
                          <Text style={styles.whatIfGrowthLabel}>
                            In {mark.years} {mark.years === 1 ? "year" : "years"}
                          </Text>
                          <View style={styles.whatIfGrowthValueWrap}>
                            <Text style={styles.whatIfGrowthValue}>
                              {formatCurrency(mark.futureValue)}
                            </Text>
                            {mark.growth > 0 && (
                              <Text style={styles.whatIfGrowthSub}>
                                +{formatCurrency(mark.growth)} from returns
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                      <Text style={tool.efAutoHint}>
                        Assumes a {WHAT_IF_DEFAULT_RETURN_RATE}% average annual return, compounded monthly.
                      </Text>
                    </View>

                    {/* Educational note */}
                    <View style={tool.insightCard}>
                      <Text style={tool.insightText}>
                        These are estimates, not guarantees - spending rarely drops to zero, and market returns vary. Even redirecting half a category can move your timeline meaningfully.
                      </Text>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        )}

    </>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    whatIfChipAmount: {
      fontSize: scale(11),
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
      marginTop: 2,
    },
    whatIfMethodRow: {
      flexDirection: "row",
      gap: 8,
    },
    whatIfMethodBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: "center",
    },
    whatIfMethodBtnActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}15`,
    },
    whatIfMethodBtnText: {
      fontSize: scale(12),
      color: colors.textDim,
      fontWeight: "600",
    },
    whatIfMethodBtnTextActive: {
      color: colors.accent,
    },
    whatIfGrowthRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    whatIfGrowthLabel: {
      fontSize: scale(13),
      color: colors.textDim,
    },
    whatIfGrowthValueWrap: {
      alignItems: "flex-end",
    },
    whatIfGrowthValue: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    whatIfGrowthSub: {
      fontSize: scale(11),
      color: colors.success,
      fontVariant: ["tabular-nums"],
    },
  });
};

export default React.memo(WhatIfSpendingCard);
