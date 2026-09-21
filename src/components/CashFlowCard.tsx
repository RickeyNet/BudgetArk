/**
 * BudgetArk - Cash Flow Card
 * File: src/components/CashFlowCard.tsx
 *
 * Budget-tab card turning the month-start checking balance into a real
 * cash-flow projection: starting cash → projected end of month → safe to
 * spend, plus a reconciliation line comparing how last month actually
 * ended against its plan. Presentational - the screen supplies the same
 * income/expense totals its summary card shows (recurring entries + debt
 * payment plan included), so the two cards can never disagree.
 *
 * With no recorded balance the card renders a set-up CTA for the current
 * month and nothing at all for other months (a past month with no history
 * has nothing honest to project).
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type { MonthStartBalance } from "../types";
import { computeCashFlow, roundCashAmount } from "../utils/cashFlow";

interface CashFlowCardProps {
  record: MonthStartBalance | null;
  monthlyIncome: number;
  monthlyExpenses: number;
  /** actual start minus last month's projected end; null = not computable. */
  reconciliationDelta: number | null;
  isCurrentMonth: boolean;
  onSetBalance: () => void;
}

const CashFlowCard: React.FC<CashFlowCardProps> = ({
  record,
  monthlyIncome,
  monthlyExpenses,
  reconciliationDelta,
  isCurrentMonth,
  onSetBalance,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  if (!record) {
    // Nothing to project. Only the current month earns a CTA - backfilling
    // a historical starting balance is still possible via the card once a
    // record exists, but nagging on every past month would be noise.
    if (!isCurrentMonth) return null;
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t("budget.cards.cashFlow.title")}</Text>
        <Text style={styles.emptyText}>{t("budget.cards.cashFlow.emptyIntro")}</Text>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={onSetBalance}
          accessibilityRole="button"
        >
          <Text style={styles.ctaBtnText}>{t("budget.cards.cashFlow.setStarting")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { net, projectedEnd } = computeCashFlow({
    startingBalance: record.balance,
    income: monthlyIncome,
    expenses: monthlyExpenses,
  });
  const safeToSpend = roundCashAmount(net);
  const projected = roundCashAmount(projectedEnd);
  const delta =
    reconciliationDelta !== null ? roundCashAmount(reconciliationDelta) : null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("budget.cards.cashFlow.title")}</Text>
        <TouchableOpacity onPress={onSetBalance} accessibilityRole="button">
          <Text style={styles.updateLink}>{t("budget.cards.cashFlow.update")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t("budget.cards.cashFlow.startingCash")}</Text>
        <Text style={styles.rowValue}>{formatCurrency(record.balance)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t("budget.cards.cashFlow.projectedEnd")}</Text>
        <Text
          style={[
            styles.rowValue,
            { color: projected >= 0 ? colors.success : colors.danger },
          ]}
        >
          {formatCurrency(projected)}
        </Text>
      </View>
      <View style={[styles.row, styles.safeRow]}>
        <Text style={styles.safeLabel}>
          {safeToSpend >= 0 ? t("budget.cards.cashFlow.safeToSpend") : t("budget.cards.cashFlow.overPlanBy")}
        </Text>
        <Text
          style={[
            styles.safeValue,
            { color: safeToSpend >= 0 ? colors.success : colors.danger },
          ]}
        >
          {formatCurrency(Math.abs(safeToSpend))}
        </Text>
      </View>
      <Text style={styles.hint}>{t("budget.cards.cashFlow.hint")}</Text>

      {delta !== null && (
        <Text
          style={[
            styles.reconcileText,
            {
              color:
                Math.abs(delta) < 1
                  ? colors.textMuted
                  : delta > 0
                    ? colors.success
                    : colors.warning,
            },
          ]}
        >
          {Math.abs(delta) < 1
            ? t("budget.cards.cashFlow.reconcileOnPlan")
            : delta > 0
              ? t("budget.cards.cashFlow.reconcileAbove", { amount: formatCurrency(delta) })
              : t("budget.cards.cashFlow.reconcileBelow", { amount: formatCurrency(Math.abs(delta)) })}
        </Text>
      )}
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gap,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: tokens.gapSm,
    },
    title: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
    },
    updateLink: {
      fontSize: scale(13),
      fontWeight: "600",
      color: colors.accent,
    },
    emptyText: {
      fontSize: scale(13),
      lineHeight: scale(18),
      color: colors.textMuted,
      marginTop: tokens.gapSm,
      marginBottom: tokens.gap,
    },
    ctaBtn: {
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.pad,
      paddingVertical: tokens.padSm,
    },
    ctaBtnText: {
      fontSize: scale(13),
      fontWeight: "700",
      color: colors.accentButtonText,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    rowLabel: {
      fontSize: scale(13),
      color: colors.textMuted,
    },
    rowValue: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    safeRow: {
      marginTop: 4,
      paddingTop: tokens.gapSm,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    safeLabel: {
      fontSize: scale(14),
      fontWeight: "700",
      color: colors.text,
    },
    safeValue: {
      fontSize: scale(18),
      fontWeight: "700",
    },
    hint: {
      fontSize: scale(11),
      lineHeight: scale(15),
      color: colors.textDim,
      marginTop: 4,
    },
    reconcileText: {
      fontSize: scale(12),
      fontWeight: "600",
      marginTop: tokens.gapSm,
    },
  });
};

export default CashFlowCard;
