/**
 * BudgetArk - Spending Pace Banner
 * File: src/components/SpendingPaceBanner.tsx
 *
 * The passive "you've spent 60% of Grocery and it's only the 12th" nudge on
 * the Budget tab. Renders only for the current month and only when some
 * limited category is over its limit or projecting past it at today's rate
 * (utils/budgetPacing.buildPaceAlerts); otherwise nothing - an on-pace month
 * should not grow a card. Same visual family as DueDateReminderBanner.
 * No notifications by design: the app's notifications never carry amounts.
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
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useCurrency } from "../currency/CurrencyProvider";
import { ordinalDay, type PaceAlert } from "../utils/budgetPacing";

interface SpendingPaceBannerProps {
  alerts: readonly PaceAlert[];
  /** Today's calendar day, for "it's only the 12th". */
  dayOfMonth: number;
  /** Tap target: the host expands the headline category in the Spending card. */
  onOpen?: (category: PaceAlert["category"]) => void;
  style?: StyleProp<ViewStyle>;
}

const SpendingPaceBanner: React.FC<SpendingPaceBannerProps> = ({
  alerts,
  dayOfMonth,
  onOpen,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { formatCurrency } = useCurrency();

  const headline = alerts[0];

  const lines = useMemo(() => {
    if (!headline) return null;
    const title =
      headline.status === "over"
        ? `${headline.category} is over its ${formatCurrency(headline.limit)} limit by ${formatCurrency(headline.overBy)}`
        : `${headline.category} is ${headline.percentSpent}% spent and it's only the ${ordinalDay(dayOfMonth)}`;
    const detail =
      headline.status === "over"
        ? "Anything more in this category this month comes out of the plan."
        : `At this pace it ends the month at ${formatCurrency(headline.projectedSpent)} against a ${formatCurrency(headline.limit)} limit - ${formatCurrency(headline.expectedSpent)} would be on track by today.`;
    const rest = alerts.length - 1;
    const more =
      rest > 0
        ? `+${rest} more ${rest === 1 ? "category" : "categories"} off pace: ${alerts
            .slice(1)
            .map((a) => a.category)
            .join(", ")}`
        : null;
    return { title, detail, more };
  }, [alerts, dayOfMonth, formatCurrency, headline]);

  if (!headline || !lines) return null;

  const isOver = headline.status === "over";
  const accent = isOver ? colors.danger : colors.warning;

  return (
    <TouchableOpacity
      style={[styles.card, isOver ? styles.cardOver : styles.cardAhead, style]}
      onPress={onOpen ? () => onOpen(headline.category) : undefined}
      activeOpacity={onOpen ? 0.85 : 1}
      accessibilityRole={onOpen ? "button" : undefined}
      accessibilityLabel={lines.title}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.eyebrow, { color: accent }]}>SPENDING PACE</Text>
          <Text style={styles.title}>{lines.title}</Text>
        </View>
        {onOpen ? <Text style={styles.chevron}>›</Text> : null}
      </View>
      <Text style={styles.detail}>{lines.detail}</Text>
      {lines.more ? (
        <Text style={styles.more} numberOfLines={2}>
          {lines.more}
        </Text>
      ) : null}
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
    cardOver: {
      backgroundColor: `${colors.danger}12`,
      borderColor: `${colors.danger}35`,
    },
    cardAhead: {
      backgroundColor: `${colors.warning}12`,
      borderColor: `${colors.warning}35`,
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
    detail: {
      fontSize: 13,
      color: colors.textDim,
      lineHeight: 18,
    },
    more: {
      fontSize: 12,
      color: colors.textMuted,
    },
    chevron: {
      fontSize: 22,
      color: colors.textMuted,
    },
  });

export default SpendingPaceBanner;
