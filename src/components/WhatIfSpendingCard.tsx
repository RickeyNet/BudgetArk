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
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useTheme } from "../theme/ThemeProvider";
import { categoryLabel } from "../i18n/categoryLabel";
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
  WHAT_IF_DEFAULT_RETURN_RATE,
  WHAT_IF_LOOKBACK_MONTHS,
} from "../utils/whatIfSpending";
import type { CategorySpendOption } from "../utils/whatIfSpending";
import type { PayoffMethod } from "../utils/calculations";
import { getCategoryIcon } from "../data/categoryIcons";
import type { CustomCategory, Debt } from "../types";

/**
 * Localized twin of utils/whatIfSpending.formatWhatIfMonths ("1 yr 2 mo").
 * Lives here so the pure util stays locale-free.
 */
const formatMonths = (t: TFunction, months: number): string => {
  if (!Number.isFinite(months)) return t("charts.insights.whatIf.months.notSolvable");
  if (months <= 0) return t("charts.insights.whatIf.months.zero");
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years <= 0) return t("charts.insights.whatIf.months.mo", { count: remainingMonths });
  if (remainingMonths <= 0) return t("charts.insights.whatIf.months.yr", { count: years });
  return t("charts.insights.whatIf.months.yrMo", { years, months: remainingMonths });
};

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
  const { t } = useTranslation();
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
            <Text style={tool.toolTitle}>{t("charts.insights.whatIf.title")}</Text>
            <Text style={tool.toolHint}>{t("charts.insights.whatIf.hint")}</Text>
          </View>
          <Text style={tool.toolChevron}>{whatIfOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {whatIfOpen && (
          <View style={tool.toolBody}>
            {options.length === 0 ? (
              <View style={tool.efCard}>
                <Text style={tool.refiEmptyText}>{t("charts.insights.whatIf.empty")}</Text>
              </View>
            ) : (
              <>
                {/* Category picker */}
                <View style={tool.efCard}>
                  <Text style={tool.efSectionTitle}>{t("charts.insights.whatIf.pickCategory")}</Text>
                  <Text style={tool.efAutoHint}>
                    {t("charts.insights.whatIf.averagesHint", { months: WHAT_IF_LOOKBACK_MONTHS })}
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
                            {getCategoryIcon(option.category, customCategories)} {categoryLabel(t, option.category)}
                          </Text>
                          <Text
                            style={[
                              styles.whatIfChipAmount,
                              isSelected && tool.chipTextActive,
                            ]}
                          >
                            {t("charts.insights.whatIf.perMonth", { amount: formatCurrency(option.monthlyAverage) })}
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
                        label={t("charts.insights.whatIf.sliderLabel")}
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
                          {t("charts.insights.whatIf.youAverage", {
                            amount: formatCurrency(selectedWhatIfOption.monthlyAverage),
                            category: categoryLabel(t, selectedWhatIfOption.category),
                          })}
                        </Text>
                      </SliderRow>
                    </View>

                    {/* Debt payoff impact */}
                    {whatIfDebtImpact && (
                      <View style={tool.efCard}>
                        <Text style={tool.efSectionTitle}>{t("charts.insights.whatIf.towardDebt")}</Text>
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
                                {t(`charts.insights.whatIf.methods.${method}`)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={tool.refiSummaryRow}>
                          <View style={tool.refiSummaryItem}>
                            <Text style={tool.refiSummaryLabel}>{t("charts.insights.whatIf.currentPlan")}</Text>
                            <Text style={tool.refiSummaryValue}>
                              {formatMonths(t, whatIfDebtImpact.baseline.monthsToPayoff)}
                            </Text>
                          </View>
                          <View style={tool.refiSummaryItem}>
                            <Text style={tool.refiSummaryLabel}>{t("charts.insights.whatIf.redirecting")}</Text>
                            <Text style={[tool.refiSummaryValue, { color: colors.accent }]}>
                              {formatMonths(t, whatIfDebtImpact.redirect.monthsToPayoff)}
                            </Text>
                          </View>
                        </View>
                        {whatIfDebtImpact.monthsSaved === Infinity ? (
                          <Text style={[tool.efTimeEstimate, { color: colors.success }]}>
                            {t("charts.insights.whatIf.unpayableFixed")}
                          </Text>
                        ) : !whatIfDebtImpact.redirect.isPayoffPossible ? (
                          <Text style={tool.efTimeEstimate}>
                            {t("charts.insights.whatIf.stillUnpayable")}
                          </Text>
                        ) : whatIfDebtImpact.monthsSaved > 0 ? (
                          <Text style={[tool.efTimeEstimate, { color: colors.success }]}>
                            {t("charts.insights.whatIf.sooner", {
                              duration: formatMonths(t, whatIfDebtImpact.monthsSaved),
                            })}
                            {whatIfDebtImpact.interestSaved >= 1
                              ? t("charts.insights.whatIf.savesInterest", {
                                  amount: formatCurrency(Math.round(whatIfDebtImpact.interestSaved)),
                                })
                              : ""}
                          </Text>
                        ) : null}
                      </View>
                    )}

                    {/* Savings growth */}
                    <View style={tool.efCard}>
                      <Text style={tool.efSectionTitle}>
                        {whatIfDebtImpact
                          ? t("charts.insights.whatIf.growSavingsOr")
                          : t("charts.insights.whatIf.growSavings")}
                      </Text>
                      {whatIfActiveDebts.length === 0 && (
                        <Text style={tool.efAutoHint}>{t("charts.insights.whatIf.noDebts")}</Text>
                      )}
                      {whatIfSavingsMarks.map((mark) => (
                        <View key={mark.years} style={styles.whatIfGrowthRow}>
                          <Text style={styles.whatIfGrowthLabel}>
                            {t("charts.insights.whatIf.inYears", { count: mark.years })}
                          </Text>
                          <View style={styles.whatIfGrowthValueWrap}>
                            <Text style={styles.whatIfGrowthValue}>
                              {formatCurrency(mark.futureValue)}
                            </Text>
                            {mark.growth > 0 && (
                              <Text style={styles.whatIfGrowthSub}>
                                {t("charts.insights.whatIf.fromReturns", { amount: formatCurrency(mark.growth) })}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                      <Text style={tool.efAutoHint}>
                        {t("charts.insights.whatIf.assumesReturn", { rate: WHAT_IF_DEFAULT_RETURN_RATE })}
                      </Text>
                    </View>

                    {/* Educational note */}
                    <View style={tool.insightCard}>
                      <Text style={tool.insightText}>{t("charts.insights.whatIf.note")}</Text>
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
