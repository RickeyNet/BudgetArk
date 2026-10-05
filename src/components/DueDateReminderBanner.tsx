/**
 * BudgetArk - Upcoming Bills Banner
 * File: src/components/DueDateReminderBanner.tsx
 *
 * Passive banner (Budget and DebtTracker tabs) listing recurring expenses
 * due soon (utils/billCalendar). The bill counterpart of
 * DebtDueReminderBanner - in-app only, never a notification.
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
import { BudgetEntry } from "../types";
import { categoryLabel } from "../i18n/categoryLabel";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { upcomingBillsWithin } from "../utils/billCalendar";

interface DueDateReminderBannerProps {
  entries: BudgetEntry[];
  onOpen: () => void;
  daysAhead?: number;
  style?: StyleProp<ViewStyle>;
}

const DueDateReminderBanner: React.FC<DueDateReminderBannerProps> = ({
  entries,
  onOpen,
  daysAhead = 7,
  style,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const upcomingBills = useMemo(
    () => upcomingBillsWithin(entries, daysAhead),
    [daysAhead, entries]
  );

  const nextBill = upcomingBills[0] ?? null;
  const totalDue = upcomingBills.reduce((sum, bill) => sum + bill.entry.amount, 0);

  const summaryLine = useMemo<string>(() => {
    if (!nextBill) return "";
    return t("budget.cards.dueDate.summary", {
      count: upcomingBills.length,
      days: daysAhead,
    });
  }, [daysAhead, nextBill, t, upcomingBills.length]);

  const nextLine = useMemo<string>(() => {
    if (!nextBill) return "";
    const label = nextBill.entry.description || categoryLabel(t, nextBill.entry.category);
    const when: string =
      nextBill.daysUntil === 0
        ? t("budget.cards.dueDate.today")
        : nextBill.daysUntil === 1
          ? t("budget.cards.dueDate.tomorrow")
          : t("budget.cards.dueDate.inDays", { count: nextBill.daysUntil });
    return t("budget.cards.dueDate.next", {
      name: label,
      amount: formatCurrency(nextBill.entry.amount),
      when,
    });
  }, [formatCurrency, nextBill, t]);

  if (!nextBill) return null;

  const isUrgent = nextBill.daysUntil <= 1;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isUrgent ? styles.cardUrgent : styles.cardUpcoming,
        style,
      ]}
      onPress={onOpen}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.eyebrow, { color: isUrgent ? colors.warning : colors.accent }]}>
            {t("budget.cards.dueDate.eyebrow")}
          </Text>
          <Text style={styles.title}>{summaryLine}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      <Text style={styles.totalLine}>{t("budget.cards.dueDate.total", { amount: formatCurrency(totalDue) })}</Text>
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

export default React.memo(DueDateReminderBanner);
