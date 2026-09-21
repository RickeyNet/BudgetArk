/**
 * BudgetArk - Debt Due Reminder Banner
 * File: src/components/DebtDueReminderBanner.tsx
 *
 * Passive banner on the DebtTracker tab listing debts due within the next
 * few days (utils/debtDueCalendar). Tapping opens the payment flow. Shown
 * only while the app is open - no notifications are involved.
 */

import React, { useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { Debt, Payment } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { upcomingDebtDuesWithin } from "../utils/debtDueCalendar";
import type { DebtDueDismissals } from "../storage/debtDueReminderStorage";

interface DebtDueReminderBannerProps {
  debts: readonly Debt[];
  payments: readonly Payment[];
  dismissals?: DebtDueDismissals;
  onOpen: () => void;
  daysAhead?: number;
  style?: StyleProp<ViewStyle>;
}

const DebtDueReminderBanner: React.FC<DebtDueReminderBannerProps> = ({
  debts,
  payments,
  dismissals = {},
  onOpen,
  daysAhead = 7,
  style,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const upcoming = useMemo(
    () => upcomingDebtDuesWithin(debts, payments, daysAhead, dismissals),
    [debts, dismissals, daysAhead, payments]
  );

  const nextDue = upcoming[0] ?? null;
  const totalDue = upcoming.reduce((sum, item) => sum + item.amount, 0);

  const summaryLine = useMemo<string>(() => {
    if (!nextDue) return "";
    return t("budget.cards.debtDue.summary", { count: upcoming.length, days: daysAhead });
  }, [daysAhead, nextDue, t, upcoming.length]);

  const nextLine = useMemo<string>(() => {
    if (!nextDue) return "";
    const when: string =
      nextDue.daysUntil === 0
        ? t("budget.cards.debtDue.today")
        : nextDue.daysUntil === 1
          ? t("budget.cards.debtDue.tomorrow")
          : t("budget.cards.debtDue.inDays", { count: nextDue.daysUntil });
    return t("budget.cards.debtDue.next", {
      name: nextDue.debt.name,
      amount: formatCurrency(nextDue.amount),
      when,
    });
  }, [formatCurrency, nextDue, t]);

  if (!nextDue) return null;

  const isUrgent = nextDue.daysUntil <= 1;

  return (
    <TouchableOpacity
      style={[styles.card, isUrgent ? styles.cardUrgent : styles.cardUpcoming, style]}
      onPress={onOpen}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.eyebrow, { color: isUrgent ? colors.warning : colors.accent }]}>
            {t("budget.cards.debtDue.eyebrow")}
          </Text>
          <Text style={styles.title}>{summaryLine}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      <Text style={styles.totalLine}>
        {t("budget.cards.debtDue.total", { amount: formatCurrency(totalDue) })}
      </Text>
      <Text style={styles.nextLine} numberOfLines={2}>
        {nextLine}
      </Text>
    </TouchableOpacity>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 6,
    },
    cardUrgent: {
      backgroundColor: `${colors.warning}12`,
      borderColor: `${colors.warning}35`,
    },
    cardUpcoming: {
      backgroundColor: `${colors.accent}10`,
      borderColor: `${colors.accent}30`,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    headerTextWrap: {
      flex: 1,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 20,
    },
    totalLine: {
      fontSize: 12,
      color: colors.textDim,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    nextLine: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    chevron: {
      fontSize: 22,
      color: colors.textDim,
      fontWeight: "600",
    },
  });

export default React.memo(DebtDueReminderBanner);
