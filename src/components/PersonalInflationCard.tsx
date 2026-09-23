/**
 * BudgetArk - Personal Inflation Card
 * File: src/components/PersonalInflationCard.tsx
 *
 * Charts-tab tool showing the user's own inflation rate: the last twelve
 * complete months against the twelve before, on the categories they spent
 * on in both (utils/personalInflation), next to the bundled headline CPI
 * figure (data/inflationData2026 - no network). The screen passes the
 * entries it already loads on focus; the card only owns its open state.
 */
import React, { useCallback, useMemo, useState } from "react";
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import { categoryLabel } from "../i18n/categoryLabel";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useToolStyles } from "../theme/toolStyles";
import { useCurrency } from "../currency/CurrencyProvider";
import {
  compareToHeadline,
  computePersonalInflation,
  formatRate,
  INFLATION_MIN_TRACKED_MONTHS,
  INFLATION_WINDOW_MONTHS,
} from "../utils/personalInflation";
import { HEADLINE_CPI_AS_OF, HEADLINE_CPI_LABEL } from "../data/inflationData2026";
import { getCategoryIcon } from "../data/categoryIcons";
import type { BudgetEntry, CustomCategory } from "../types";

interface PersonalInflationCardProps {
  /** Live budget entries (the screen's focus load). */
  entries: BudgetEntry[];
  customCategories: CustomCategory[];
}

const PersonalInflationCard: React.FC<PersonalInflationCardProps> = ({
  entries,
  customCategories,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const tool = useToolStyles();

  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  }, []);

  const result = useMemo(() => computePersonalInflation(entries), [entries]);

  const verdict = result.status === "ok" ? compareToHeadline(result.rate, result.headlineRate) : null;
  const rateColor =
    verdict === "above" ? colors.warning : verdict === "below" ? colors.success : colors.accent;

  return (
    <>
      <TouchableOpacity style={tool.toolHeader} onPress={toggle} activeOpacity={0.7}>
        <View>
          <Text style={tool.toolTitle}>{t("charts.insights.inflation.title")}</Text>
          <Text style={tool.toolHint}>
            {result.status === "ok"
              ? t("charts.insights.inflation.hintRates", {
                  rate: formatRate(result.rate),
                  headline: formatRate(result.headlineRate),
                })
              : t("charts.insights.inflation.hintIdle")}
          </Text>
        </View>
        <Text style={tool.toolChevron}>{open ? "▾" : "›"}</Text>
      </TouchableOpacity>

      {open ? (
        <View style={tool.toolBody}>
          {result.status === "insufficient" ? (
            <View style={tool.efCard}>
              <Text style={tool.refiEmptyText}>
                {t("charts.insights.inflation.insufficient", {
                  count: result.currentMonths,
                  min: INFLATION_MIN_TRACKED_MONTHS,
                  window: INFLATION_WINDOW_MONTHS,
                  prior: result.priorMonths,
                })}
              </Text>
            </View>
          ) : (
            <>
              <View style={tool.resultCard}>
                <Text style={tool.resultLabel}>{t("charts.insights.inflation.resultLabel")}</Text>
                <Text style={[tool.resultValue, { color: rateColor }]}>{formatRate(result.rate)}</Text>
                <Text style={tool.resultSub}>
                  {t(
                    verdict === "above"
                      ? "charts.insights.inflation.above"
                      : verdict === "below"
                        ? "charts.insights.inflation.below"
                        : "charts.insights.inflation.inLine",
                    { headline: formatRate(result.headlineRate) },
                  )}
                </Text>
                <Text style={styles.basketLine}>
                  {t("charts.insights.inflation.basket", {
                    count: result.categories.length,
                    prior: formatCurrency(result.priorMonthly),
                    current: formatCurrency(result.currentMonthly),
                  })}
                </Text>
              </View>

              <View style={tool.efCard}>
                <Text style={tool.efSectionTitle}>{t("charts.insights.inflation.byCategory")}</Text>
                <Text style={tool.efAutoHint}>
                  {t("charts.insights.inflation.averageHint", {
                    window: INFLATION_WINDOW_MONTHS,
                    current: result.currentMonths,
                    prior: result.priorMonths,
                  })}
                </Text>
                {result.categories.map((row) => {
                  const rowVerdict = row.rate > 0.05 ? "up" : row.rate < -0.05 ? "down" : "flat";
                  return (
                    <View key={row.category} style={styles.row}>
                      <View style={styles.rowLeft}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {getCategoryIcon(row.category, customCategories)} {categoryLabel(t, row.category)}
                        </Text>
                        <Text style={styles.rowMeta}>
                          {t("charts.insights.inflation.rowMeta", {
                            prior: formatCurrency(row.priorMonthly),
                            current: formatCurrency(row.currentMonthly),
                          })}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.rowRate,
                          {
                            color:
                              rowVerdict === "up"
                                ? colors.warning
                                : rowVerdict === "down"
                                  ? colors.success
                                  : colors.textDim,
                          },
                        ]}
                      >
                        {formatRate(row.rate)}
                      </Text>
                    </View>
                  );
                })}
                {result.newSpendingMonthly > 0 ? (
                  <Text style={tool.efAutoHint}>
                    {t("charts.insights.inflation.newSpending", {
                      amount: formatCurrency(result.newSpendingMonthly),
                    })}
                  </Text>
                ) : null}
              </View>

              <View style={tool.insightCard}>
                <Text style={tool.insightText}>
                  {t("charts.insights.inflation.note", {
                    label: HEADLINE_CPI_LABEL,
                    asOf: HEADLINE_CPI_AS_OF,
                  })}
                </Text>
              </View>
            </>
          )}
        </View>
      ) : null}
    </>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    basketLine: {
      fontSize: scale(12),
      color: colors.textDim,
      marginTop: 6,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.gapSm,
      paddingVertical: 4,
    },
    rowLeft: {
      flex: 1,
    },
    rowTitle: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    rowMeta: {
      fontSize: scale(12),
      color: colors.textDim,
      marginTop: 2,
      fontVariant: ["tabular-nums"],
    },
    rowRate: {
      fontSize: scale(15),
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
  });
};

export default React.memo(PersonalInflationCard);
