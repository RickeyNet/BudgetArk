/**
 * BudgetArk - Tracking Strip Card
 * File: src/components/TrackingStripCard.tsx
 *
 * The budget's pulse on the Bridge tab (the tab the app opens on): one
 * status line - month-to-date spend against this month's limits and how
 * long since anything was logged - the last three entries, and an Add
 * button. The daily habit lives on Budget; this is the part of it that
 * belongs on the home tab, without becoming a second Budget tab (no
 * category bars, no pace banner - utils/trackingStrip keeps it to three
 * rows and a number). Taps hand off to Budget through its existing route
 * params (`quickAdd` opens the Add sheet, `searchEntryId` opens an entry),
 * so there is one owner for those modals and the iOS present-after-
 * navigation guard already there applies. Shows amounts, so it sits under
 * the same privacy-mode screen guard as the rest of Bridge.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import type { BudgetEntry, CategoryBudgetLimit } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useCurrency } from "../currency/CurrencyProvider";
import { getCategoryBudgetLimits } from "../storage/budgetStorage";
import { getMonthKey } from "../utils/budgetMonths";
import { formatDayLabel } from "../utils/dateFormat";
import { buildTrackingStrip, describeDaysSince } from "../utils/trackingStrip";

interface TrackingStripCardProps {
  /** The host's live budget entries (Bridge already loads them on focus). */
  entries: BudgetEntry[];
  onAdd: () => void;
  onOpenEntry: (entryId: string) => void;
  onOpenBudget: () => void;
  style?: StyleProp<ViewStyle>;
}

const TrackingStripCard: React.FC<TrackingStripCardProps> = ({
  entries,
  onAdd,
  onOpenEntry,
  onOpenBudget,
  style,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const { formatCurrency } = useCurrency();

  // Limits are the one input the host doesn't hold; re-read whenever the
  // entries it does hold change (every focus, sync, and save).
  const [limits, setLimits] = useState<CategoryBudgetLimit[]>([]);
  useEffect(() => {
    let cancelled = false;
    getCategoryBudgetLimits(getMonthKey())
      .then((stored) => {
        if (!cancelled) setLimits(stored);
      })
      .catch(() => {
        if (!cancelled) setLimits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [entries]);

  const strip = useMemo(
    () => buildTrackingStrip({ entries, limits, monthKey: getMonthKey(), now: new Date() }),
    [entries, limits]
  );

  const spendLine = strip.totalLimits
    ? `Spent ${formatCurrency(strip.spentThisMonth)} of ${formatCurrency(strip.totalLimits)} limits`
    : `Spent ${formatCurrency(strip.spentThisMonth)} this month`;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>THIS MONTH</Text>
        <TouchableOpacity
          onPress={onOpenBudget}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Open the Budget tab"
        >
          <Text style={[styles.link, { color: colors.accent }]}>Budget ›</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.status}>
        {spendLine}
        <Text style={styles.statusDim}> · {describeDaysSince(strip.daysSinceLastEntry)}</Text>
      </Text>

      {strip.recent.length === 0 ? (
        <Text style={styles.empty}>
          Nothing logged yet. Add your first purchase or paycheck and it shows up
          here.
        </Text>
      ) : (
        <View style={styles.rows}>
          {strip.recent.map((row) => (
            <TouchableOpacity
              key={row.id}
              style={styles.row}
              onPress={() => onOpenEntry(row.id)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${row.label}, ${formatCurrency(row.amount)}`}
            >
              <Text style={styles.rowDate}>{formatDayLabel(row.date)}</Text>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {row.label}
                <Text style={styles.rowMeta}>
                  {row.label !== row.category ? ` · ${row.category}` : ""}
                  {row.billLabel ? " 🧾" : ""}
                </Text>
              </Text>
              <Text
                style={[
                  styles.rowAmount,
                  { color: row.type === "income" ? colors.success : colors.text },
                ]}
              >
                {row.type === "income" ? "+" : "-"}
                {formatCurrency(row.amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.accent }]}
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Add a budget entry"
      >
        <Text style={[styles.addButtonText, { color: colors.accentButtonText }]}>+ Add entry</Text>
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      gap: tokens.gapSm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    eyebrow: {
      fontSize: scale(10),
      fontWeight: "700",
      letterSpacing: 0.6,
      color: colors.textMuted,
    },
    link: {
      fontSize: scale(13),
      fontWeight: "700",
    },
    status: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
      lineHeight: scale(19),
    },
    statusDim: {
      fontWeight: "400",
      color: colors.textDim,
    },
    rows: {
      marginTop: 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 6,
    },
    rowDate: {
      width: 52,
      fontSize: scale(12),
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    rowLabel: {
      flex: 1,
      fontSize: scale(14),
      color: colors.text,
    },
    rowMeta: {
      fontSize: scale(12),
      color: colors.textMuted,
    },
    rowAmount: {
      fontSize: scale(14),
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    empty: {
      fontSize: scale(13),
      color: colors.textDim,
      lineHeight: scale(18),
    },
    addButton: {
      marginTop: 4,
      borderRadius: tokens.radiusSm,
      paddingVertical: 11,
      alignItems: "center",
    },
    addButtonText: {
      fontSize: scale(14),
      fontWeight: "700",
    },
  });
};

export default React.memo(TrackingStripCard);
