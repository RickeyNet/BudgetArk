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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { parseMoneyInput } from "../utils/parseMoneyInput";
import { categoryLabel } from "../i18n/categoryLabel";
import SheetModal, { useSheetStyles } from "./SheetModal";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const sheet = useSheetStyles();
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
        {t("budget.tools.search.truncation", { shown, total })}
      </Text>
    ) : null;

  return (
    <SheetModal
      visible
      onRequestClose={onClose}
      keyboardAvoiding
      footer={
        <>
          <TouchableOpacity
            style={sheet.doneButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("budget.tools.search.closeA11y")}
          >
            <Text style={sheet.doneText}>{t("common.done")}</Text>
          </TouchableOpacity>
        </>
      }
    >
            <Text style={sheet.title}>{t("budget.tools.search.title")}</Text>
            <Text style={sheet.subtitle}>{t("budget.tools.search.subtitle")}</Text>

            {/* ── Query ── */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder={t("budget.tools.search.placeholder")}
                placeholderTextColor={colors.textMuted}
                value={filters.query}
                onChangeText={(text) => patchFilters({ query: sanitizeTextInput(text) })}
                autoCorrect={false}
                autoFocus
                returnKeyType="search"
                accessibilityLabel={t("budget.tools.search.inputA11y")}
              />
              {filters.query.length > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => patchFilters({ query: "" })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={t("budget.tools.search.clearA11y")}
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
                accessibilityLabel={t("budget.tools.search.filtersA11y", { count: activeFilterCount })}
              >
                <Text style={styles.filterToggleText}>
                  {activeFilterCount > 0
                    ? t("budget.tools.search.filtersToggleCount", { count: activeFilterCount })
                    : t("budget.tools.search.filtersToggle")}
                </Text>
                <Text style={styles.filterToggleArrow}>{filtersOpen ? "▾" : "▸"}</Text>
              </TouchableOpacity>
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  onPress={resetFilters}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={t("budget.tools.search.resetA11y")}
                >
                  <Text style={[styles.filterReset, { color: colors.accent }]}>{t("budget.tools.search.reset")}</Text>
                </TouchableOpacity>
              )}
            </View>

            {filtersOpen && (
              <View style={styles.filterPanel}>
                <Text style={styles.filterLabel}>{t("budget.tools.search.scopeLabel")}</Text>
                <View style={styles.chipRow}>
                  {SEARCH_SCOPE_OPTIONS.map((option) =>
                    renderChip(
                      option.id,
                      t(`budget.tools.search.scope.${option.id}`),
                      filters.scope === option.id,
                      () => selectScope(option.id)
                    )
                  )}
                </View>

                {showDateFilter && (
                  <>
                    <Text style={styles.filterLabel}>{t("budget.tools.search.dateLabel")}</Text>
                    <View style={styles.chipRow}>
                      {SEARCH_DATE_PRESET_OPTIONS.map((option) =>
                        renderChip(
                          option.id,
                          t(`budget.tools.search.datePreset.${option.id}`),
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
                    <Text style={styles.filterLabel}>{t("budget.tools.search.entryTypeLabel")}</Text>
                    <View style={styles.chipRow}>
                      {SEARCH_ENTRY_TYPE_OPTIONS.map((option) =>
                        renderChip(
                          option.id,
                          t(`budget.tools.search.entryType.${option.id}`),
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
                        <Text style={styles.filterLabel}>{t("budget.tools.search.categoriesLabel")}</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.chipRowScroll}
                        >
                          {categoryOptions.map((category) => {
                            const selected = filters.categories.includes(category);
                            return renderChip(
                              category,
                              `${getCategoryIcon(category, customCategories)} ${categoryLabel(t, category)}`,
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

                <Text style={styles.filterLabel}>{t("budget.tools.search.amountLabel")}</Text>
                <View style={styles.amountRow}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder={t("budget.tools.search.minPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    value={amountMinText}
                    onChangeText={(text) => {
                      const clean = sanitizeTextInput(text);
                      setAmountMinText(clean);
                      patchFilters({ amountMin: parseMoneyInput(clean) ?? undefined });
                    }}
                    keyboardType="decimal-pad"
                    accessibilityLabel={t("budget.tools.search.minA11y")}
                  />
                  <Text style={styles.amountDash}>-</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder={t("budget.tools.search.maxPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    value={amountMaxText}
                    onChangeText={(text) => {
                      const clean = sanitizeTextInput(text);
                      setAmountMaxText(clean);
                      patchFilters({ amountMax: parseMoneyInput(clean) ?? undefined });
                    }}
                    keyboardType="decimal-pad"
                    accessibilityLabel={t("budget.tools.search.maxA11y")}
                  />
                </View>
              </View>
            )}

            {/* ── Results ── */}
            {!searching ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{t("budget.tools.search.promptTitle")}</Text>
                <Text style={styles.emptyBody}>{t("budget.tools.search.promptBody")}</Text>
              </View>
            ) : results.totals.overall === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{t("budget.tools.search.noMatchesTitle")}</Text>
                <Text style={styles.emptyBody}>
                  {t("budget.tools.search.noMatchesBody")}
                  {debtsHiddenByFilters ? ` ${t("budget.tools.search.debtsHidden")}` : ""}
                </Text>
              </View>
            ) : (
              <View style={styles.resultList}>
                {results.debts.length > 0 && (
                  <>
                    <Text style={[styles.sectionHeader, { color: colors.accent }]}>
                      {t("budget.tools.search.sectionDebts", { count: results.totals.debts })}
                    </Text>
                    {results.debts.map((debt) => (
                      <TouchableOpacity
                        key={debt.id}
                        style={styles.resultItem}
                        onPress={() => onSelectDebt(debt)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={t("budget.tools.search.debtA11y", { name: debt.name })}
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
                              ? t("budget.tools.search.apr", { rate: debt.rate })
                              : t("budget.tools.search.paidOff")}
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
                      {t("budget.tools.search.sectionPayments", { count: results.totals.payments })}
                    </Text>
                    {results.payments.map((hit) => (
                      <TouchableOpacity
                        key={hit.payment.id}
                        style={styles.resultItem}
                        onPress={() => onSelectPayment(hit)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={t("budget.tools.search.paymentA11y", { name: hit.debtName })}
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
                      {t("budget.tools.search.sectionEntries", { count: results.totals.entries })}
                    </Text>
                    {results.entries.map((entry) => (
                      <TouchableOpacity
                        key={entry.id}
                        style={styles.resultItem}
                        onPress={() => onSelectEntry(entry)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={t("budget.tools.search.entryA11y", { name: entry.description || categoryLabel(t, entry.category) })}
                      >
                        <Text style={styles.resultIcon}>
                          {getCategoryIcon(entry.category, customCategories)}
                        </Text>
                        <View style={styles.resultBody}>
                          <Text style={styles.resultTitle} numberOfLines={1}>
                            {entry.description || categoryLabel(t, entry.category)}
                          </Text>
                          <Text style={styles.resultMeta} numberOfLines={1}>
                            {formatDate(entry.date)} · {categoryLabel(t, entry.category)}
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
                    {t("budget.tools.search.debtsHidden")}
                  </Text>
                )}
              </View>
            )}
    </SheetModal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({

    /* Query */
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: tokens.gapSm,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.padSm,
      paddingVertical: tokens.padSm,
      paddingRight: 38,
      color: colors.text,
      fontSize: scale(15),
    },
    clearBtn: {
      position: "absolute",
      right: 12,
    },
    clearBtnText: {
      fontSize: scale(14),
      color: colors.textMuted,
      fontWeight: "600",
    },

    /* Filters */
    filterHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: tokens.gapSm,
    },
    filterToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.gapSm,
    },
    filterToggleText: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    filterToggleArrow: {
      fontSize: scale(13),
      color: colors.textDim,
    },
    filterReset: {
      fontSize: scale(13),
      fontWeight: "600",
    },
    filterPanel: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.padSm,
      backgroundColor: colors.bg,
      marginBottom: tokens.gap,
    },
    filterLabel: {
      fontSize: scale(11),
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.textDim,
      marginBottom: tokens.gapSm,
      marginTop: tokens.gapSm,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.gapSm,
    },
    chipRowScroll: {
      flexDirection: "row",
      gap: tokens.gapSm,
      paddingRight: tokens.padSm,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusPill,
      paddingHorizontal: tokens.padSm,
      paddingVertical: tokens.gapSm,
      backgroundColor: colors.card,
    },
    chipText: {
      fontSize: scale(13),
      fontWeight: "600",
      color: colors.textDim,
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.gapSm,
    },
    amountInput: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.padSm,
      paddingVertical: tokens.padSm,
      color: colors.text,
      fontSize: scale(14),
    },
    amountDash: {
      color: colors.textDim,
      fontSize: scale(14),
    },

    /* Results */
    resultList: {
      gap: tokens.gapSm,
    },
    sectionHeader: {
      fontSize: scale(10),
      fontWeight: "700",
      letterSpacing: 0.8,
      marginTop: tokens.gapSm,
    },
    resultItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.gapSm,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.padSm,
      backgroundColor: colors.bg,
    },
    resultIcon: {
      fontSize: 18,
    },
    resultBody: {
      flex: 1,
    },
    resultTitle: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    resultMeta: {
      fontSize: scale(12),
      color: colors.textDim,
      marginTop: 1,
    },
    resultAmount: {
      fontSize: scale(14),
      fontWeight: "700",
      color: colors.text,
    },
    truncationNote: {
      fontSize: scale(12),
      color: colors.textMuted,
      marginTop: 2,
    },

    /* Empty / prompt states */
    emptyState: {
      alignItems: "center",
      paddingVertical: tokens.padLg,
      gap: tokens.gapSm,
    },
    emptyTitle: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
    },
    emptyBody: {
      fontSize: scale(13),
      lineHeight: scale(19),
      color: colors.textDim,
      textAlign: "center",
    },

    /* Pinned footer */
  });
};

export default React.memo(GlobalSearchModal);
