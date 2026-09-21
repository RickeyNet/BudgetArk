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
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useCurrency } from "../currency/CurrencyProvider";
import type { PaceAlert } from "../utils/budgetPacing";
import { categoryLabel } from "../i18n/categoryLabel";

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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { formatCurrency } = useCurrency();

  const headline = alerts[0];

  const lines = useMemo(() => {
    if (!headline) return null;
    const category = categoryLabel(t, headline.category);
    const title: string =
      headline.status === "over"
        ? t("budget.cards.pace.overTitle", {
            category,
            limit: formatCurrency(headline.limit),
            overBy: formatCurrency(headline.overBy),
          })
        : t("budget.cards.pace.aheadTitle", {
            category,
            percent: headline.percentSpent,
            dayOrdinal: t("budget.cards.paycheck.dayOrdinal", {
              day: dayOfMonth,
              suffix: t(`budget.cards.paycheck.ordinalSuffix.${ordinalBucket(dayOfMonth)}`),
            }),
          });
    const detail: string =
      headline.status === "over"
        ? t("budget.cards.pace.overDetail")
        : t("budget.cards.pace.aheadDetail", {
            projected: formatCurrency(headline.projectedSpent),
            limit: formatCurrency(headline.limit),
            expected: formatCurrency(headline.expectedSpent),
          });
    const rest = alerts.length - 1;
    const more: string | null =
      rest > 0
        ? t("budget.cards.pace.more", {
            count: rest,
            list: alerts
              .slice(1)
              .map((a) => categoryLabel(t, a.category))
              .join(t("budget.cards.pace.listSeparator")),
          })
        : null;
    return { title, detail, more };
  }, [alerts, dayOfMonth, formatCurrency, headline, t]);

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
          <Text style={[styles.eyebrow, { color: accent }]}>{t("budget.cards.pace.eyebrow")}</Text>
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

/** English ordinal bucket for "the 12th"; the locale supplies the suffix. */
const ordinalBucket = (day: number): "one" | "two" | "few" | "other" => {
  const n = Math.max(1, Math.round(day));
  if (n % 100 >= 11 && n % 100 <= 13) return "other";
  switch (n % 10) {
    case 1:
      return "one";
    case 2:
      return "two";
    case 3:
      return "few";
    default:
      return "other";
  }
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
