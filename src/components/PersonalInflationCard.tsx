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
import { useTheme } from "../theme/ThemeProvider";
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
          <Text style={tool.toolTitle}>Personal Inflation Rate</Text>
          <Text style={tool.toolHint}>
            {result.status === "ok"
              ? `Your prices ${formatRate(result.rate)} vs ${formatRate(result.headlineRate)} headline`
              : "Your own prices, year over year, vs the headline CPI"}
          </Text>
        </View>
        <Text style={tool.toolChevron}>{open ? "▾" : "›"}</Text>
      </TouchableOpacity>

      {open ? (
        <View style={tool.toolBody}>
          {result.status === "insufficient" ? (
            <View style={tool.efCard}>
              <Text style={tool.refiEmptyText}>
                This needs at least {INFLATION_MIN_TRACKED_MONTHS} tracked months in each of the
                last two years, on categories you spent on in both. So far: {result.currentMonths}{" "}
                {result.currentMonths === 1 ? "month" : "months"} in the last {INFLATION_WINDOW_MONTHS},{" "}
                {result.priorMonths} in the {INFLATION_WINDOW_MONTHS} before. Keep logging and it fills in.
              </Text>
            </View>
          ) : (
            <>
              <View style={tool.resultCard}>
                <Text style={tool.resultLabel}>YOUR INFLATION RATE</Text>
                <Text style={[tool.resultValue, { color: rateColor }]}>{formatRate(result.rate)}</Text>
                <Text style={tool.resultSub}>
                  {verdict === "above"
                    ? `Running hotter than the ${formatRate(result.headlineRate)} headline`
                    : verdict === "below"
                      ? `Running cooler than the ${formatRate(result.headlineRate)} headline`
                      : `In line with the ${formatRate(result.headlineRate)} headline`}
                </Text>
                <Text style={styles.basketLine}>
                  {formatCurrency(result.priorMonthly)}/mo → {formatCurrency(result.currentMonthly)}/mo on the
                  same {result.categories.length}{" "}
                  {result.categories.length === 1 ? "category" : "categories"}
                </Text>
              </View>

              <View style={tool.efCard}>
                <Text style={tool.efSectionTitle}>By category</Text>
                <Text style={tool.efAutoHint}>
                  Average per tracked month: last {INFLATION_WINDOW_MONTHS} months ({result.currentMonths}{" "}
                  tracked) vs the {INFLATION_WINDOW_MONTHS} before ({result.priorMonths} tracked)
                </Text>
                {result.categories.map((row) => {
                  const rowVerdict = row.rate > 0.05 ? "up" : row.rate < -0.05 ? "down" : "flat";
                  return (
                    <View key={row.category} style={styles.row}>
                      <View style={styles.rowLeft}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {getCategoryIcon(row.category, customCategories)} {row.category}
                        </Text>
                        <Text style={styles.rowMeta}>
                          {formatCurrency(row.priorMonthly)} → {formatCurrency(row.currentMonthly)}/mo
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
                    Plus {formatCurrency(result.newSpendingMonthly)}/mo in categories you didn&apos;t have
                    last year - new spending, not inflation, so it stays out of the rate.
                  </Text>
                ) : null}
              </View>

              <View style={tool.insightCard}>
                <Text style={tool.insightText}>
                  Headline figure: {HEADLINE_CPI_LABEL}, as of {HEADLINE_CPI_AS_OF}, bundled with the app -
                  nothing is fetched. Your rate mixes price changes with how much you bought, so a
                  category that jumped may be a habit change as much as a price rise. Debt payments and
                  savings are transfers, not prices, and are left out.
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
