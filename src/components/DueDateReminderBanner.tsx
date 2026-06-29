import React, { useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { BudgetEntry } from "../types";
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
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const upcomingBills = useMemo(
    () => upcomingBillsWithin(entries, daysAhead),
    [daysAhead, entries]
  );

  const nextBill = upcomingBills[0] ?? null;
  const totalDue = upcomingBills.reduce((sum, bill) => sum + bill.entry.amount, 0);

  const summaryLine = useMemo(() => {
    if (!nextBill) return "";
    if (upcomingBills.length === 1) {
      return `1 bill scheduled in the next ${daysAhead} days`;
    }
    return `${upcomingBills.length} bills scheduled in the next ${daysAhead} days`;
  }, [daysAhead, nextBill, upcomingBills.length]);

  const nextLine = useMemo(() => {
    if (!nextBill) return "";
    const label = nextBill.entry.description || nextBill.entry.category;
    const when =
      nextBill.daysUntil === 0
        ? "today"
        : nextBill.daysUntil === 1
          ? "tomorrow"
          : `in ${nextBill.daysUntil} days`;
    return `Next: ${label} · ${formatCurrency(nextBill.entry.amount)} · ${when}`;
  }, [formatCurrency, nextBill]);

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
            DUE-DATE REMINDER
          </Text>
          <Text style={styles.title}>{summaryLine}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      <Text style={styles.totalLine}>{formatCurrency(totalDue)} scheduled total</Text>
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
