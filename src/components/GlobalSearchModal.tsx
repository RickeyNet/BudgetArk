/**
 * BudgetArk - global search sheet.
 *
 * One search box over everything the user has recorded: debts, debt
 * payments, and budget entries, with advanced filters (scope, entry type,
 * categories, date range, amount range). Opened from the Debts and Budget
 * tabs' title icons; the hosting screen supplies the data and decides what
 * a result tap does (edit in place, or hop to the owning tab), so this
 * component stays navigation-free.
 *
 * Rendered as a slide-up sheet (OnboardingGuideModal skeleton): the search
 * field needs the keyboard, and a centered card + keyboard don't share a
 * small screen well. All matching lives in utils/searchFilter (pure,
 * unit-tested); this file is only the shell.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import type { BudgetEntry, Debt, DebtClass, Payment } from "../types";
import { useCurrency } from "../currency/CurrencyProvider";
import { useCustomCategories } from "../categories/CustomCategoriesProvider";
import { getCategoryIcon } from "../data/categoryIcons";
import { sanitizeTextInput } from "../utils/sanitize";
import { triggerHaptic } from "../utils/haptics";
import {
  DEFAULT_SEARCH_FILTERS,
  SEARCH_DATE_PRESET_OPTIONS,
  SEARCH_ENTRY_TYPE_OPTIONS,
  SEARCH_SCOPE_OPTIONS,
  collectEntryCategories,
  countActiveFilters,
  hasActiveSearch,
  searchRecords,
  type PaymentSearchHit,
  type SearchFilters,
  type SearchScope,
} from "../utils/searchFilter";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";

const DEBT_CLASS_GLYPHS: Record<DebtClass, string> = {
  personal_credit: "💳",
  car: "🚗",
  house: "🏠",
};

interface GlobalSearchModalProps {
  onClose: () => void;
  debts: Debt[];
  payments: Payment[];
  entries: BudgetEntry[];
  /** Reference time for date presets - stamped by the host when opening,
   * never in render (react-hooks/purity). */
  now: Date;
  /** Result taps - the host owns closing this sheet first, then acting
   * (deferred past the dismiss so a follow-up Modal presents reliably). */
  onSelectDebt: (debt: Debt) => void;
  onSelectPayment: (hit: PaymentSearchHit) => void;
  onSelectEntry: (entry: BudgetEntry) => void;
}

/** Strip user amount input to a number; blank/garbage → undefined. */
const parseAmountInput = (raw: string): number | undefined => {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
};

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  onClose,
  debts,
  payments,
  entries,
  now,
  onSelectDebt,
  onSelectPayment,
  onSelectEntry,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { formatCurrency, preference } = useCurrency();
  const { customCategories } = useCustomCategories();

  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Amount bounds keep their raw text so "12." doesn't fight the keyboard.
  const [amountMinText, setAmountMinText] = useState("");
  const [amountMaxText, setAmountMaxText] = useState("");

  const patchFilters = useCallback((patch: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  /**
   * Scope switches clear filters the new scope can't use - a leftover
   * category filter under a Debts scope would silently zero every result.
   */
  const selectScope = useCallback((scope: SearchScope) => {
    triggerHaptic("selection");
    setFilters((prev) => ({
      ...prev,
      scope,
      entryType: scope === "all" || scope === "entries" ? prev.entryType : "all",
      categories: scope === "all" || scope === "entries" ? prev.categories : [],
      datePreset: scope === "debts" ? "any" : prev.datePreset,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    triggerHaptic("selection");
    setFilters((prev) => ({ ...DEFAULT_SEARCH_FILTERS, query: prev.query }));
    setAmountMinText("");
    setAmountMaxText("");
  }, []);

  const activeFilterCount = countActiveFilters(filters);
  const searching = hasActiveSearch(filters);

  const categoryOptions = useMemo(() => collectEntryCategories(entries), [entries]);

  const results = useMemo(
    () => searchRecords({ debts, payments, entries }, filters, now),
    [debts, payments, entries, filters, now]
  );

  // The engine drops standing debts while entry-only or date filters are
  // active; say so instead of letting them vanish silently.
  const debtsHiddenByFilters =
    (filters.scope === "all" || filters.scope === "debts") &&
    (filters.datePreset !== "any" ||
      filters.entryType !== "all" ||
      filters.categories.length > 0);

  const showEntryFilters = filters.scope === "all" || filters.scope === "entries";
  const showDateFilter = filters.scope !== "debts";

  const formatDate = useCallback(
    (iso: string): string =>
      new Date(iso).toLocaleDateString(preference.locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [preference.locale]
  );

  const renderChip = (
    key: string,
    label: string,
    selected: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.chip, selected && { borderColor: colors.accent, backgroundColor: `${colors.accent}18` }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, selected && { color: colors.accent }]}>{label}</Text>
    </TouchableOpacity>
  );

  const truncationNote = (shown: number, total: number) =>
    total > shown ? (
      <Text style={styles.truncationNote}>
        Showing the first {shown} of {total} - narrow the search to see the rest.
      </Text>
    ) : null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <SheetKeyboardAvoider style={styles.overlay}>
        <View style={styles.modalSheet}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <Text style={styles.title}>Search</Text>
            <Text style={styles.subtitle}>
              Find anything you have recorded - debts, payments, and budget
              entries.
            </Text>

            {/* ── Query ── */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder={'Try "chase", "grocery", or an amount'}
                placeholderTextColor={colors.textMuted}
                value={filters.query}
                onChangeText={(text) => patchFilters({ query: sanitizeTextInput(text) })}
                autoCorrect={false}
                autoFocus
                returnKeyType="search"
                accessibilityLabel="Search everything"
              />
              {filters.query.length > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => patchFilters({ query: "" })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Clear search"
                >
                  <Text style={styles.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Filters toggle ── */}
            <View style={styles.filterHeaderRow}>
              <TouchableOpacity
                style={styles.filterToggle}
                onPress={() => {
                  triggerHaptic("selection");
                  setFiltersOpen((open) => !open);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ expanded: filtersOpen }}
                accessibilityLabel={`Filters, ${activeFilterCount} active`}
              >
                <Text style={styles.filterToggleText}>
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Text>
                <Text style={styles.filterToggleArrow}>{filtersOpen ? "▾" : "▸"}</Text>
              </TouchableOpacity>
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  onPress={resetFilters}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Reset filters"
                >
                  <Text style={[styles.filterReset, { color: colors.accent }]}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            {filtersOpen && (
              <View style={styles.filterPanel}>
                <Text style={styles.filterLabel}>Search in</Text>
                <View style={styles.chipRow}>
                  {SEARCH_SCOPE_OPTIONS.map((option) =>
                    renderChip(
                      option.id,
                      option.label,
                      filters.scope === option.id,
                      () => selectScope(option.id)
                    )
                  )}
                </View>

                {showDateFilter && (
                  <>
                    <Text style={styles.filterLabel}>Date</Text>
                    <View style={styles.chipRow}>
                      {SEARCH_DATE_PRESET_OPTIONS.map((option) =>
                        renderChip(
                          option.id,
                          option.label,
                          filters.datePreset === option.id,
                          () => {
                            triggerHaptic("selection");
                            patchFilters({ datePreset: option.id });
                          }
                        )
                      )}
                    </View>
                  </>
                )}

                {showEntryFilters && (
                  <>
                    <Text style={styles.filterLabel}>Budget entry type</Text>
                    <View style={styles.chipRow}>
                      {SEARCH_ENTRY_TYPE_OPTIONS.map((option) =>
                        renderChip(
                          option.id,
                          option.label,
                          filters.entryType === option.id,
                          () => {
                            triggerHaptic("selection");
                            patchFilters({ entryType: option.id });
                          }
                        )
                      )}
                    </View>

                    {categoryOptions.length > 0 && (
                      <>
                        <Text style={styles.filterLabel}>Categories</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.chipRowScroll}
                        >
                          {categoryOptions.map((category) => {
                            const selected = filters.categories.includes(category);
                            return renderChip(
                              category,
                              `${getCategoryIcon(category, customCategories)} ${category}`,
                              selected,
                              () => {
                                triggerHaptic("selection");
                                patchFilters({
                                  categories: selected
                                    ? filters.categories.filter((c) => c !== category)
                                    : [...filters.categories, category],
                                });
                              }
                            );
                          })}
                        </ScrollView>
                      </>
                    )}
                  </>
                )}

                <Text style={styles.filterLabel}>Amount</Text>
                <View style={styles.amountRow}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="Min"
                    placeholderTextColor={colors.textMuted}
                    value={amountMinText}
                    onChangeText={(text) => {
                      const clean = sanitizeTextInput(text);
                      setAmountMinText(clean);
                      patchFilters({ amountMin: parseAmountInput(clean) });
                    }}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Minimum amount"
                  />
                  <Text style={styles.amountDash}>–</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="Max"
                    placeholderTextColor={colors.textMuted}
                    value={amountMaxText}
                    onChangeText={(text) => {
                      const clean = sanitizeTextInput(text);
                      setAmountMaxText(clean);
                      patchFilters({ amountMax: parseAmountInput(clean) });
                    }}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Maximum amount"
                  />
                </View>
              </View>
            )}

            {/* ── Results ── */}
            {!searching ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Search your records</Text>
                <Text style={styles.emptyBody}>
                  Type a debt name, a note, a merchant, a category, or an
                  amount - or open Filters to browse by date, type, or
                  category.
                </Text>
              </View>
            ) : results.totals.overall === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.emptyBody}>
                  Try fewer words or looser filters.
                  {debtsHiddenByFilters
                    ? " Debts don't show while a date, entry type, or category filter is on."
                    : ""}
                </Text>
              </View>
            ) : (
              <View style={styles.resultList}>
                {results.debts.length > 0 && (
                  <>
                    <Text style={[styles.sectionHeader, { color: colors.accent }]}>
                      DEBTS · {results.totals.debts}
                    </Text>
                    {results.debts.map((debt) => (
                      <TouchableOpacity
                        key={debt.id}
                        style={styles.resultItem}
                        onPress={() => onSelectDebt(debt)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Debt ${debt.name}`}
                      >
                        <Text style={styles.resultIcon}>
                          {DEBT_CLASS_GLYPHS[debt.debtClass] ?? "💳"}
                        </Text>
                        <View style={styles.resultBody}>
                          <Text style={styles.resultTitle} numberOfLines={1}>
                            {debt.name}
                          </Text>
                          <Text style={styles.resultMeta} numberOfLines={1}>
                            {debt.balance > 0
                              ? `${debt.rate}% APR`
                              : "Paid off 🎉"}
                          </Text>
                        </View>
                        <Text style={styles.resultAmount}>
                          {formatCurrency(debt.balance)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {truncationNote(results.debts.length, results.totals.debts)}
                  </>
                )}

                {results.payments.length > 0 && (
                  <>
                    <Text style={[styles.sectionHeader, { color: colors.accent }]}>
                      DEBT PAYMENTS · {results.totals.payments}
                    </Text>
                    {results.payments.map((hit) => (
                      <TouchableOpacity
                        key={hit.payment.id}
                        style={styles.resultItem}
                        onPress={() => onSelectPayment(hit)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Payment to ${hit.debtName}`}
                      >
                        <Text style={styles.resultIcon}>💵</Text>
                        <View style={styles.resultBody}>
                          <Text style={styles.resultTitle} numberOfLines={1}>
                            {hit.debtName}
                          </Text>
                          <Text style={styles.resultMeta} numberOfLines={1}>
                            {formatDate(hit.payment.date)}
                          </Text>
                        </View>
                        <Text style={styles.resultAmount}>
                          -{formatCurrency(hit.payment.amount)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {truncationNote(results.payments.length, results.totals.payments)}
                  </>
                )}

                {results.entries.length > 0 && (
                  <>
                    <Text style={[styles.sectionHeader, { color: colors.accent }]}>
                      BUDGET ENTRIES · {results.totals.entries}
                    </Text>
                    {results.entries.map((entry) => (
                      <TouchableOpacity
                        key={entry.id}
                        style={styles.resultItem}
                        onPress={() => onSelectEntry(entry)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Budget entry ${entry.description || entry.category}`}
                      >
                        <Text style={styles.resultIcon}>
                          {getCategoryIcon(entry.category, customCategories)}
                        </Text>
                        <View style={styles.resultBody}>
                          <Text style={styles.resultTitle} numberOfLines={1}>
                            {entry.description || entry.category}
                          </Text>
                          <Text style={styles.resultMeta} numberOfLines={1}>
                            {formatDate(entry.date)} · {entry.category}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.resultAmount,
                            entry.type === "income" && { color: colors.success },
                          ]}
                        >
                          {entry.type === "income" ? "+" : "-"}
                          {formatCurrency(entry.amount)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {truncationNote(results.entries.length, results.totals.entries)}
                  </>
                )}

                {debtsHiddenByFilters && results.totals.overall > 0 && (
                  <Text style={styles.truncationNote}>
                    Debts don't show while a date, entry type, or category
                    filter is on.
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* ── Pinned footer ── */}
          <View
            style={[
              styles.buttonRow,
              Platform.OS === "android" && insets.bottom > 0
                ? { paddingBottom: insets.bottom + 12 }
                : null,
            ]}
          >
            <TouchableOpacity
              style={styles.doneButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close search"
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SheetKeyboardAvoider>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      flex: 1,
      marginTop: Platform.OS === "ios" ? 44 : 32,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      overflow: "hidden",
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      paddingBottom: 40,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 16,
    },

    /* Query */
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      paddingRight: 38,
      color: colors.text,
      fontSize: 15,
    },
    clearBtn: {
      position: "absolute",
      right: 12,
    },
    clearBtnText: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: "600",
    },

    /* Filters */
    filterHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    filterToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    filterToggleText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    filterToggleArrow: {
      fontSize: 13,
      color: colors.textDim,
    },
    filterReset: {
      fontSize: 13,
      fontWeight: "600",
    },
    filterPanel: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.bg,
      marginBottom: 14,
    },
    filterLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.textDim,
      marginBottom: 6,
      marginTop: 10,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chipRowScroll: {
      flexDirection: "row",
      gap: 8,
      paddingRight: 12,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.card,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textDim,
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    amountInput: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.text,
      fontSize: 14,
    },
    amountDash: {
      color: colors.textDim,
      fontSize: 14,
    },

    /* Results */
    resultList: {
      gap: 8,
    },
    sectionHeader: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      marginTop: 8,
    },
    resultItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.bg,
    },
    resultIcon: {
      fontSize: 18,
    },
    resultBody: {
      flex: 1,
    },
    resultTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    resultMeta: {
      fontSize: 12,
      color: colors.textDim,
      marginTop: 1,
    },
    resultAmount: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    truncationNote: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },

    /* Empty / prompt states */
    emptyState: {
      alignItems: "center",
      paddingVertical: 32,
      gap: 6,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    emptyBody: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textDim,
      textAlign: "center",
    },

    /* Pinned footer */
    buttonRow: {
      flexDirection: "row",
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    doneButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    doneText: {
      color: colors.accentButtonText,
      fontSize: 15,
      fontWeight: "700",
    },
  });

export default React.memo(GlobalSearchModal);
