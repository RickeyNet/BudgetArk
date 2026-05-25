import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { BudgetEntry } from "../types";
import {
  groupBillsByDay,
  nextBillFrom,
  splitPaidVsRemaining,
} from "../utils/billCalendar";

interface BillCalendarCardProps {
  entries: BudgetEntry[];
  monthKey: string;
  onOpen: () => void;
}

const BillCalendarCard: React.FC<BillCalendarCardProps> = ({
  entries,
  monthKey,
  onOpen,
}) => {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { count, monthTotal, remaining, nextLine } = useMemo(() => {
    const bills = groupBillsByDay(entries, monthKey);
    const billCount = Array.from(bills.byDay.values()).reduce(
      (s, list) => s + list.length,
      0
    );
    const { remaining: rem } = splitPaidVsRemaining(bills, monthKey);
    const next = nextBillFrom(entries);
    let line: string | null = null;
    if (next) {
      const name = next.entry.description || next.entry.category;
      const when =
        next.daysUntil <= 0
          ? "today"
          : next.daysUntil === 1
            ? "tomorrow"
            : `in ${next.daysUntil}d`;
      line = `Next: ${name} · ${formatCurrency(next.entry.amount)} · ${when}`;
    }
    return {
      count: billCount,
      monthTotal: bills.monthTotal,
      remaining: rem,
      nextLine: line,
    };
  }, [entries, monthKey, formatCurrency]);

  if (count === 0) return null;

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.85}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>BILL CALENDAR</Text>
          <Text style={styles.title}>
            {count} {count === 1 ? "bill" : "bills"} · {formatCurrency(monthTotal)}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
      {remaining > 0 && (
        <Text style={styles.remaining}>
          {formatCurrency(remaining)} still to go this month
        </Text>
      )}
      {nextLine && (
        <Text style={styles.nextLine} numberOfLines={1}>
          {nextLine}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 14,
      gap: 6,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: colors.accent,
      marginBottom: 2,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    chevron: {
      fontSize: 22,
      color: colors.textDim,
      fontWeight: "600",
    },
    remaining: {
      fontSize: 12,
      color: colors.warning,
      fontWeight: "600",
    },
    nextLine: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });

export default React.memo(BillCalendarCard);
