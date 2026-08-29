/**
 * BudgetArk - Spending Card
 * File: src/components/SpendingCard.tsx
 *
 * The Budget tab's "Spending" card: donut + legend, the optional
 * "Business only" chip, and one row per expense category that expands into
 * its entries (capped at EXPANDED_ENTRY_CAP until "Show more"). Row taps
 * either edit or toggle selection depending on the screen's multi-select
 * mode; long-press opens the category limit. The screen still owns the
 * data (rows, selection, business filter) and every mutation - this card
 * only owns what is expanded. Extracted from BudgetScreen.
 */

import { entryPersonIds, formatPersonNames } from "../utils/entryPeople";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DonutChart, { type DonutSlice } from "./DonutChart";
import { useCustomCategories } from "../categories/CustomCategoriesProvider";
import { getCategoryIcon } from "../data/categoryIcons";
import type { CategoryName } from "../types";
import { useBusinesses, usePeople } from "../people/PeopleProvider";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { getRecurrenceTag } from "../utils/recurrence";
import type { ExpenseCategoryRow } from "../utils/expenseCategoryRows";

// The row shapes live with the builder (utils/expenseCategoryRows) so the
// pure logic is testable off-device; re-exported here because this card is
// where consumers already import them from.
export type {
  ExpenseCategoryEntry,
  ExpenseCategoryRow,
} from "../utils/expenseCategoryRows";

// How many entries an expanded category renders before the "Show all"
// button. The screen's content is one giant ListHeaderComponent (nothing is
// virtualized), so a bank-synced category with hundreds of entries would
// otherwise mount them all in a single frame.
export const EXPANDED_ENTRY_CAP = 30;

/**
 * Synthetic Debt Payments rows derived from the debt tracker rather than
 * stored budget entries: logged payments (`payment-`), planned-minimum
 * shortfalls (`debt-min-topup-`), and unpaid planned minimums
 * (`auto-debt-`). None exist in budget storage, so edit/select/delete
 * must exclude all three - `deleteBudgetEntries` would silently no-op on
 * their ids while the toast claims success and the row re-derives.
 */
export const isAutoEntryId = (id: string): boolean =>
  id.startsWith("auto-debt-") ||
  id.startsWith("payment-") ||
  id.startsWith("debt-min-topup-");

interface SpendingCardProps {
  /** Coachmark anchor callback ref from useCoachmarkAnchor. */
  anchorRef: (view: View | null) => void;
  rows: ExpenseCategoryRow[];
  /** Unfiltered month total - shown in the donut unless businessOnly. */
  monthlyExpenses: number;
  hasBusinessSpending: boolean;
  businessOnly: boolean;
  onToggleBusinessOnly: () => void;
  colorForCategory: (category: CategoryName) => string;
  /** Number of un-split "Food" entries; > 0 swaps the hint for a Split link. */
  foodSplitCount: number;
  onSplitFood: () => void;
  onLongPressCategory: (category: CategoryName) => void;
  selectionMode: boolean;
  selectedEntryIds: ReadonlySet<string>;
  onToggleSelect: (entryId: string) => void;
  onEnterSelection: (entryId: string) => void;
  onEditEntry: (entryId: string) => void;
  /**
   * "Log actual" on a projected recurring bill row: open the add sheet
   * prefilled as that bill's real charge for the month.
   */
  onLogActual?: (entryId: string) => void;
}

const SpendingCard: React.FC<SpendingCardProps> = ({
  anchorRef,
  rows,
  monthlyExpenses,
  hasBusinessSpending,
  businessOnly,
  onToggleBusinessOnly,
  colorForCategory,
  foodSplitCount,
  onSplitFood,
  onLongPressCategory,
  selectionMode,
  selectedEntryIds,
  onToggleSelect,
  onEnterSelection,
  onEditEntry,
  onLogActual,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const { customCategories } = useCustomCategories();
  const { businesses } = useBusinesses();
  const { people } = usePeople();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  // Spending donut scales with the effective font scale (Density × Text Size)
  // so the accessibility Text Size setting zooms the chart too, not just text.
  const donutSize = Math.round(108 * tokens.fontScale);
  const donutStroke = Math.round(16 * tokens.fontScale);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  // Everything on this screen lives in one ListHeaderComponent (the outer
  // FlatList has no real rows), so nothing is virtualized. Expanding a
  // bank-synced category with hundreds of entries would render them all at
  // once - instead the first EXPANDED_ENTRY_CAP render and a "Show all"
  // button opts into the rest per category.
  const [fullyRevealedCategories, setFullyRevealedCategories] = useState<Set<string>>(
    new Set()
  );

  const businessNameById = useMemo(
    () => new Map(businesses.map((b) => [b.id, b.name])),
    [businesses]
  );

  const personNameById = useMemo(
    () => new Map(people.map((p) => [p.id, p.name])),
    [people]
  );

  const chartData = useMemo(
    () =>
      rows
        .filter((row) => row.spent > 0)
        .map((row) => ({ category: row.category, amount: row.spent })),
    [rows]
  );

  const pieData = useMemo<DonutSlice[]>(
    () =>
      chartData.map((item) => ({
        label: item.category,
        value: item.amount,
        color: colorForCategory(item.category),
      })),
    [colorForCategory, chartData]
  );

  const spendingTotal = useMemo(
    () => chartData.reduce((sum, item) => sum + item.amount, 0),
    [chartData]
  );

  // Scale denominator for limit-less category bars (kept ≥1 to avoid /0).
  const maxCategorySpent = useMemo(
    () => Math.max(1, ...rows.map((row) => row.spent)),
    [rows]
  );

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
    // Collapsing (or re-expanding) resets the entry cap so the next expand
    // starts cheap again.
    setFullyRevealedCategories((prev) => {
      if (!prev.has(category)) return prev;
      const next = new Set(prev);
      next.delete(category);
      return next;
    });
  }, []);

  return (
    <View ref={anchorRef} collapsable={false} style={styles.spendingCard}>
      <View style={styles.topHairline} />
      <View style={styles.spendingHeaderRow}>
        <Text style={styles.spendingTitle}>Spending</Text>
        {foodSplitCount > 0 ? (
          <TouchableOpacity onPress={onSplitFood}>
            <Text style={[styles.spendingHint, { color: colors.accent }]}>Split Food ({foodSplitCount})</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.spendingHint}>Tap row to expand · Hold for limit</Text>
        )}
      </View>

      {/* Chip stays visible while active even if paging lands on a month
          with no business spend - otherwise there'd be no way to toggle
          the filter back off. */}
      {(hasBusinessSpending || businessOnly) && (
        <View style={styles.spendingFilterRow}>
          <TouchableOpacity
            style={[styles.filterChip, businessOnly && styles.filterChipActive]}
            onPress={onToggleBusinessOnly}
            accessibilityRole="button"
            accessibilityState={{ selected: businessOnly }}
            accessibilityLabel="Show business expenses only"
          >
            <Text
              style={[
                styles.filterChipText,
                businessOnly && styles.filterChipTextActive,
              ]}
            >
              💼 Business only
            </Text>
          </TouchableOpacity>
          {businessOnly && (
            <Text style={styles.spendingHint}>Limits hidden while filtered</Text>
          )}
        </View>
      )}

      {chartData.length > 0 ? (
        <View style={styles.donutSection}>
          <View style={[styles.donutWrap, { width: donutSize, height: donutSize }]}>
            <DonutChart data={pieData} size={donutSize} strokeWidth={donutStroke} />
            <View style={styles.donutCenter}>
              <Text style={styles.donutLabel}>Total</Text>
              <Text style={styles.donutTotal}>
                {formatCompactCurrency(
                  businessOnly ? spendingTotal : monthlyExpenses
                )}
              </Text>
            </View>
          </View>
          <View style={styles.legend}>
            {pieData.slice(0, 6).map((slice) => {
              const pct =
                spendingTotal > 0
                  ? Math.round((slice.value / spendingTotal) * 100)
                  : 0;
              return (
                <View key={slice.label} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: slice.color }]}
                  />
                  <Text style={styles.legendName} numberOfLines={1}>
                    {slice.label}
                  </Text>
                  <Text style={styles.legendPct}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.spendingEmptyWrap}>
          <Text style={styles.emptyCardTitle}>
            {businessOnly
              ? "No business expenses this month"
              : "No expenses this month"}
          </Text>
          <Text style={styles.emptyCardSubtext}>
            {businessOnly
              ? "Tag an expense with a business to see it here."
              : "Add entries to see your spending chart."}
          </Text>
        </View>
      )}

      {rows.map((item) => {
        const ratio = item.ratio;
        const hasWarning = ratio != null && ratio >= 0.8 && ratio < 1;
        const isOver = ratio != null && ratio >= 1;
        const dotColor = colorForCategory(item.category);
        const isExpanded = expandedCategories.has(item.category);
        const isFullyRevealed = fullyRevealedCategories.has(item.category);
        const visibleEntries = isFullyRevealed
          ? item.entries
          : item.entries.slice(0, EXPANDED_ENTRY_CAP);
        const hiddenEntryCount = item.entries.length - visibleEntries.length;
        // With a limit, the track represents the limit (100% = at limit).
        // Without one, it scales against the biggest category this month so
        // the bars stay comparable.
        const fillPercent = item.limit
          ? Math.min(ratio ?? 0, 1) * 100
          : Math.min(1, item.spent / maxCategorySpent) * 100;
        const fillColor = item.limit
          ? isOver
            ? colors.danger
            : hasWarning
              ? colors.warning
              : dotColor
          : dotColor;

        return (
          <View key={item.category}>
            <TouchableOpacity
              style={styles.spendRow}
              activeOpacity={0.7}
              onPress={() => toggleCategory(item.category)}
              onLongPress={() => onLongPressCategory(item.category)}
            >
              <View style={[styles.spendDot, { backgroundColor: dotColor }]} />
              <Text style={styles.spendName} numberOfLines={1}>
                {getCategoryIcon(item.category, customCategories)} {item.category}
              </Text>
              <View style={styles.spendBarTrack}>
                <View
                  style={[
                    styles.spendBarFill,
                    { width: `${fillPercent}%`, backgroundColor: fillColor },
                  ]}
                />
                {item.limit ? (
                  <View style={styles.spendLimitMark} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.spendAmount,
                  isOver ? { color: colors.danger } : null,
                ]}
              >
                {formatCurrency(item.spent)}
              </Text>
              <Text style={styles.spendChevron}>{isExpanded ? "▾" : "›"}</Text>
            </TouchableOpacity>

            {isExpanded && item.entries.length > 0 && (
              <View style={styles.expandedEntries}>
                <Text style={styles.expandedHeader}>
                  Expanded - {item.entries.length} {item.entries.length === 1 ? "entry" : "entries"}
                </Text>
                {visibleEntries.map((entry) => {
                  const isLoggedPayment = entry.id.startsWith("payment-");
                  const isAutoDebtRow = isAutoEntryId(entry.id);
                  const isSelected = selectedEntryIds.has(entry.id);
                  const entryDate = new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={[
                        styles.expandedEntryRow,
                        isSelected && {
                          backgroundColor: `${colors.accent}22`,
                          borderRadius: 8,
                        },
                      ]}
                      onPress={() => {
                        if (isAutoDebtRow) {
                          // Not a stored budget entry - point at the real
                          // home instead of silently doing nothing.
                          if (isLoggedPayment) {
                            Alert.alert(
                              "Logged debt payment",
                              "This payment was logged on the Debts tab. To edit or delete it, open the debt's payment history there."
                            );
                          }
                          return;
                        }
                        if (selectionMode) onToggleSelect(entry.id);
                        else onEditEntry(entry.id);
                      }}
                      onLongPress={() => {
                        if (!isAutoDebtRow) onEnterSelection(entry.id);
                      }}
                      delayLongPress={300}
                      activeOpacity={isAutoDebtRow && !isLoggedPayment ? 1 : 0.6}
                    >
                      {selectionMode && !isAutoDebtRow && (
                        <Text
                          style={[
                            styles.entryEditHint,
                            {
                              color: isSelected ? colors.accent : colors.textMuted,
                              marginRight: 8,
                              fontSize: 16,
                            },
                          ]}
                        >
                          {isSelected ? "☑" : "☐"}
                        </Text>
                      )}
                      <View style={styles.expandedEntryLeft}>
                        <Text style={styles.entryAmount}>{formatCurrency(entry.amount)}</Text>
                        {entry.description ? (
                          <Text style={styles.entryDesc} numberOfLines={1}> - {entry.description}</Text>
                        ) : null}
                      </View>
                      <View style={styles.expandedEntryRight}>
                        {entry.isPrivate && (
                          <Text style={styles.entryEditHint}>🔒</Text>
                        )}
                        {(entry.attachmentCount ?? 0) > 0 && (
                          <Text style={styles.entryEditHint}>
                            📷{(entry.attachmentCount ?? 0) > 1 ? ` ${entry.attachmentCount}` : ""}
                          </Text>
                        )}
                        {entry.businessId && (
                          <Text
                            style={[styles.entryEditHint, { color: colors.accent }]}
                            numberOfLines={1}
                          >
                            💼 {businessNameById.get(entry.businessId) ?? "(deleted)"}
                          </Text>
                        )}
                        {entry.personId && (
                          <Text
                            style={[styles.entryEditHint, { color: colors.accent }]}
                            numberOfLines={1}
                          >
                            👤 {formatPersonNames(entryPersonIds(entry), personNameById)}
                          </Text>
                        )}
                        {entry.fulfillsRecurringId && (
                          <Text
                            style={[styles.entryEditHint, { color: colors.accent }]}
                            numberOfLines={1}
                          >
                            🧾 {entry.billLabel ?? "Bill"}
                            {entry.billEstimate != null
                              ? ` · est. ${formatCurrency(entry.billEstimate)}`
                              : ""}
                          </Text>
                        )}
                        {entry.recurring && (
                          <Text style={[styles.entryEditHint, { color: colors.accent }]}>
                            {getRecurrenceTag(entry)}
                          </Text>
                        )}
                        {entry.recurring &&
                          !isAutoDebtRow &&
                          !selectionMode &&
                          onLogActual && (
                            <TouchableOpacity
                              style={styles.logActualChip}
                              onPress={() => onLogActual(entry.id)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              accessibilityRole="button"
                              accessibilityLabel={`Log the actual charge for ${
                                entry.description || item.category
                              }`}
                            >
                              <Text style={styles.logActualText}>Log actual</Text>
                            </TouchableOpacity>
                          )}
                        {isAutoDebtRow && !isLoggedPayment ? (
                          <Text style={styles.entryEditHint}>Auto</Text>
                        ) : (
                          <Text style={styles.expandedEntryDate}>{entryDate}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {hiddenEntryCount > 0 && (
                  <TouchableOpacity
                    style={styles.showAllEntriesBtn}
                    onPress={() =>
                      setFullyRevealedCategories((prev) =>
                        new Set(prev).add(item.category)
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${hiddenEntryCount} more entries`}
                  >
                    <Text style={styles.showAllEntriesText}>
                      Show {hiddenEntryCount} more{" "}
                      {hiddenEntryCount === 1 ? "entry" : "entries"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    spendingCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      overflow: "hidden",
    },
    topHairline: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.accent,
      opacity: 0.18,
    },
    spendingHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    spendingTitle: {
      fontSize: scale(18),
      fontWeight: "800",
      color: colors.text,
    },
    spendingHint: {
      fontSize: 11,
      color: colors.textMuted,
    },
    spendingFilterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.gapSm,
      marginBottom: 10,
    },
    filterChip: {
      borderRadius: tokens.radius,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    filterChipActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    filterChipText: {
      fontSize: scale(12),
      fontWeight: "600",
      color: colors.textDim,
    },
    filterChipTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    donutSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 8,
      paddingBottom: 8,
    },
    donutWrap: {
      width: 92,
      height: 92,
      alignItems: "center",
      justifyContent: "center",
    },
    donutCenter: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    donutLabel: {
      fontSize: scale(7),
      fontWeight: "600",
      letterSpacing: 1,
      color: colors.textDim,
      textTransform: "uppercase",
    },
    donutTotal: {
      fontSize: scale(12),
      fontWeight: "800",
      color: colors.text,
      fontVariant: ["tabular-nums"] as any,
    },
    legend: {
      flex: 1,
      gap: 5,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    legendDot: {
      width: 7,
      height: 7,
      borderRadius: 2,
    },
    legendName: {
      flex: 1,
      fontSize: scale(11),
      color: colors.textDim,
    },
    legendPct: {
      fontSize: scale(10),
      fontWeight: "600",
      color: colors.textMuted,
      fontVariant: ["tabular-nums"] as any,
    },
    spendingEmptyWrap: {
      alignItems: "center",
      paddingVertical: 16,
    },
    emptyCardTitle: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "600",
      marginBottom: 4,
    },
    emptyCardSubtext: {
      fontSize: 13,
      color: colors.textDim,
      textAlign: "center",
    },
    spendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingVertical: 9,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    spendDot: {
      width: scale(9),
      height: scale(9),
      borderRadius: 2,
    },
    spendName: {
      width: scale(98),
      fontSize: scale(13),
      fontWeight: "600",
      color: colors.text,
    },
    spendBarTrack: {
      flex: 1,
      height: scale(8),
      borderRadius: 4,
      backgroundColor: `${colors.textMuted}33`,
      overflow: "hidden",
      justifyContent: "center",
    },
    spendBarFill: {
      height: "100%",
      borderRadius: 4,
      minWidth: 2,
    },
    spendLimitMark: {
      position: "absolute",
      right: 0,
      top: -2,
      bottom: -2,
      width: 2,
      backgroundColor: colors.textDim,
      opacity: 0.6,
    },
    spendAmount: {
      minWidth: scale(58),
      textAlign: "right",
      fontSize: scale(12),
      fontWeight: "700",
      color: colors.textDim,
      fontVariant: ["tabular-nums"] as any,
    },
    spendChevron: {
      fontSize: scale(14),
      color: colors.textMuted,
      fontWeight: "600",
      width: 12,
      textAlign: "center",
    },
    expandedEntries: {
      backgroundColor: colors.bg,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      gap: 8,
    },
    expandedHeader: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 2,
    },
    expandedEntryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    expandedEntryLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    expandedEntryRight: {
      alignItems: "flex-end",
    },
    expandedEntryDate: {
      fontSize: 11,
      color: colors.textMuted,
    },
    entryAmount: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    entryDesc: {
      flex: 1,
      color: colors.textDim,
      fontSize: 12,
    },
    logActualChip: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: tokens.radiusPill,
      paddingHorizontal: tokens.padSm,
      paddingVertical: 2,
      marginLeft: 6,
    },
    logActualText: {
      color: colors.accent,
      fontSize: Math.round(11 * tokens.fontScale),
      fontWeight: "600",
    },
    entryEditHint: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: "600",
    },
    showAllEntriesBtn: {
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    showAllEntriesText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "600",
    },
  });
};

export default React.memo(SpendingCard);
