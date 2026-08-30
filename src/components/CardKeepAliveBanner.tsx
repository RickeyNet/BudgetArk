/**
 * BudgetArk - card keep-alive warning banner.
 *
 * In-app surface for the inactivity watch: names the specific card and its
 * use-by date (the scheduled notification deliberately can't - security
 * rule 11 keeps names and amounts off the lock screen, so this banner is
 * where the details live). Rendered on both the DebtTracker list header
 * (beside the debt-due banner it's cloned from) and the Bridge, the app's
 * initial tab. "Later" dismisses the top card for the current calendar
 * month only.
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
import type { Debt } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { cardsNeedingKeepAlive } from "../utils/cardKeepAlive";
import type { CardKeepAliveDismissals } from "../storage/cardKeepAliveDismissalStorage";

interface CardKeepAliveBannerProps {
  debts: readonly Debt[];
  dismissals?: CardKeepAliveDismissals;
  /** Tap on the banner body: take the user to the card. */
  onOpen: (debt: Debt) => void;
  /** "Later": dismiss the top card's warning for this calendar month. */
  onDismiss: (debt: Debt) => void;
  style?: StyleProp<ViewStyle>;
}

const formatDeadline = (deadline: Date): string =>
  deadline.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const CardKeepAliveBanner: React.FC<CardKeepAliveBannerProps> = ({
  debts,
  dismissals = {},
  onOpen,
  onDismiss,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const warnings = useMemo(
    () => cardsNeedingKeepAlive(debts, dismissals),
    [debts, dismissals]
  );

  const top = warnings[0] ?? null;

  const summaryLine = useMemo(() => {
    if (!top) return "";
    if (warnings.length === 1) return "1 card needs a small purchase soon";
    return `${warnings.length} cards need a small purchase soon`;
  }, [top, warnings.length]);

  const nextLine = useMemo(() => {
    if (!top) return "";
    const when = formatDeadline(top.deadline);
    if (top.status === "overdue") {
      return `${top.debt.name} · deadline passed (${when}) - use it soon`;
    }
    const days =
      top.daysUntil === 0
        ? "today"
        : top.daysUntil === 1
          ? "tomorrow"
          : `in ${top.daysUntil} days`;
    return `${top.debt.name} · use by ${when} · ${days}`;
  }, [top]);

  if (!top) return null;

  const isUrgent = top.status !== "upcoming";

  return (
    <TouchableOpacity
      style={[styles.card, isUrgent ? styles.cardUrgent : styles.cardUpcoming, style]}
      onPress={() => onOpen(top.debt)}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.eyebrow, { color: isUrgent ? colors.warning : colors.accent }]}>
            CARD KEEP-ALIVE
          </Text>
          <Text style={styles.title}>{summaryLine}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      <Text style={styles.nextLine} numberOfLines={2}>
        {nextLine}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.hint}>
          Idle cards can be closed by their issuer
        </Text>
        <TouchableOpacity
          onPress={() => onDismiss(top.debt)}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Text style={styles.laterAction}>Later</Text>
        </TouchableOpacity>
      </View>
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
    nextLine: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    footerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    hint: {
      flex: 1,
      fontSize: 11,
      color: colors.textDim,
    },
    laterAction: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textDim,
    },
    chevron: {
      fontSize: 22,
      color: colors.textDim,
      fontWeight: "600",
    },
  });

export default React.memo(CardKeepAliveBanner);
