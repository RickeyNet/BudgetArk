/**
 * BudgetArk - Budget Limits Modal
 * File: src/components/BudgetLimitsModal.tsx
 *
 * Every expense category's monthly limit on one sheet, for the viewed
 * month. Until now a limit could only be set by long-pressing a Spending
 * row, which exists only once the category has spending - so limits were
 * something you set after the fact. Here each row shows the limit in
 * force, what the category spent this month and averaged over the last
 * three, with "Copy last month" and "Use averages" fills so a whole
 * month's limits take one tap plus a save. The math is
 * utils/limitsSheet; saving goes through budgetStorage like the per-row
 * editor (blank = remove, with a sync tombstone).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { BudgetEntry, CategoryBudgetLimit, CustomCategory, CategoryName } from "../types";
import { useTranslation } from "react-i18next";
import SheetModal, { useSheetStyles } from "./SheetModal";
import { categoryLabel } from "../i18n/categoryLabel";
import { useCustomCategories } from "../categories/CustomCategoriesProvider";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useCurrency } from "../currency/CurrencyProvider";
import { getCategoryIcon } from "../data/categoryIcons";
import { formatMonthKeyLabel } from "../utils/budgetMonths";
import { describeError } from "../utils/errorMessage";
import { triggerHaptic } from "../utils/haptics";
import { useValueChanged } from "../hooks/useValueChanged";
import {
  buildLimitSheetRows,
  limitsFromDrafts,
  resolveLimitsForMonth,
  suggestLimitFromAverage,
  type BudgetLimitHistory,
  type LimitSheetRow,
} from "../utils/limitsSheet";
import { getAllLimitsByMonth, saveCategoryBudgetLimits } from "../storage/budgetStorage";

interface BudgetLimitsModalProps {
  visible: boolean;
  monthKey: string;
  entries: BudgetEntry[];
  customCategories: CustomCategory[];
  onClose: () => void;
  /** The month's live limits after a save; the host updates its Spending card. */
  onSaved: (limits: CategoryBudgetLimit[]) => void;
}

type Loaded = { history: BudgetLimitHistory; rows: LimitSheetRow[] };

const draftFor = (value: number | null): string => (value != null ? String(value) : "");

const BudgetLimitsModal: React.FC<BudgetLimitsModalProps> = ({
  visible,
  monthKey,
  entries,
  customCategories,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sheet = useSheetStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { formatCurrency } = useCurrency();

  // Hidden built-ins stay off the sheet unless they still carry a limit
  // (see the loader): a save rebuilds the month from the listed drafts, so
  // an unlisted limit would be dropped silently.
  const { visibleBuiltIns, hiddenBuiltIns } = useCustomCategories();
  const categories = useMemo<CategoryName[]>(
    () => [...visibleBuiltIns, ...customCategories.map((c) => c.name)],
    [customCategories, visibleBuiltIns]
  );

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Render-time reset on close so the next open reloads fresh (not an effect).
  if (useValueChanged(visible) && !visible && loaded) {
    setLoaded(null);
    setError(null);
  }

  useEffect(() => {
    if (!visible || loaded) return;
    let cancelled = false;
    getAllLimitsByMonth()
      .then((history) => {
        if (cancelled) return;
        // A hidden built-in that still has a limit keeps its row (dimmed
        // by name), otherwise saving the sheet would silently remove it.
        const withLimits = resolveLimitsForMonth(history, monthKey)
          .map((l) => l.category)
          .filter((c) => hiddenBuiltIns.has(c) && !categories.includes(c));
        const rows = buildLimitSheetRows({
          categories: [...categories, ...withLimits],
          monthKey,
          history,
          entries,
        });
        setDrafts(Object.fromEntries(rows.map((r) => [r.category, draftFor(r.current)])));
        setLoaded({ history, rows });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(describeError(e, t("budget.spending.limits.loadFailed")));
      });
    return () => {
      cancelled = true;
    };
  }, [visible, loaded, categories, hiddenBuiltIns, monthKey, entries, t]);

  const setDraft = useCallback((category: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [category]: value }));
  }, []);

  const copyLastMonth = useCallback(() => {
    if (!loaded) return;
    triggerHaptic("selection");
    setDrafts((prev) => {
      const next = { ...prev };
      for (const row of loaded.rows) {
        if (row.lastMonth != null) next[row.category] = draftFor(row.lastMonth);
      }
      return next;
    });
  }, [loaded]);

  const useAverages = useCallback(() => {
    if (!loaded) return;
    triggerHaptic("selection");
    setDrafts((prev) => {
      const next = { ...prev };
      for (const row of loaded.rows) {
        if (row.averageSpend != null) {
          next[row.category] = String(suggestLimitFromAverage(row.averageSpend));
        }
      }
      return next;
    });
  }, [loaded]);

  const handleSave = useCallback(async () => {
    if (!loaded || saving) return;
    setSaving(true);
    setError(null);
    try {
      const next = limitsFromDrafts(
        drafts,
        resolveLimitsForMonth(loaded.history, monthKey),
        new Date().toISOString()
      );
      await saveCategoryBudgetLimits(next, monthKey);
      onSaved(next);
      triggerHaptic("success");
      onClose();
    } catch (e) {
      setError(describeError(e, t("budget.spending.limits.saveFailed")));
    } finally {
      setSaving(false);
    }
  }, [drafts, loaded, monthKey, onClose, onSaved, saving, t]);

  const anyLastMonth = loaded?.rows.some((r) => r.lastMonth != null) ?? false;
  const anyAverage = loaded?.rows.some((r) => r.averageSpend != null) ?? false;

  return (
    <SheetModal
      visible={visible}
      onRequestClose={onClose}
      keyboardAvoiding
      contentContainerStyle={styles.content}
      footer={
        <>
          <TouchableOpacity style={sheet.closeButton} onPress={onClose} disabled={saving}>
            <Text style={sheet.closeText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[sheet.doneButton, (saving || !loaded) && styles.disabled]}
            onPress={() => void handleSave()}
            disabled={saving || !loaded}
          >
            <Text style={sheet.doneText}>{saving ? t("budget.spending.limits.saving") : t("common.save")}</Text>
          </TouchableOpacity>
        </>
      }
    >
      <Text style={sheet.title}>{t("budget.spending.limits.title")}</Text>
      <Text style={sheet.subtitle}>
        {t("budget.spending.limits.subtitle", { month: formatMonthKeyLabel(monthKey) })}
      </Text>

      {(anyLastMonth || anyAverage) && (
        <View style={styles.fillRow}>
          {anyLastMonth ? (
            <TouchableOpacity style={styles.fillChip} onPress={copyLastMonth}>
              <Text style={styles.fillChipText}>{t("budget.spending.limits.copyLastMonth")}</Text>
            </TouchableOpacity>
          ) : null}
          {anyAverage ? (
            <TouchableOpacity style={styles.fillChip} onPress={useAverages}>
              <Text style={styles.fillChipText}>{t("budget.spending.limits.useAverages")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loaded ? (
        loaded.rows.map((row) => {
          const draft = drafts[row.category] ?? "";
          const candidates: (string | null)[] = [
            t("budget.spending.limits.spent", { amount: formatCurrency(row.spentThisMonth) }),
            row.averageSpend != null
              ? t("budget.spending.limits.avg", { amount: formatCurrency(row.averageSpend) })
              : null,
            row.lastMonth != null
              ? t("budget.spending.limits.lastMonth", { amount: formatCurrency(row.lastMonth) })
              : null,
          ];
          const parts = candidates.filter((part): part is string => part != null);
          const label = categoryLabel(t, row.category);
          return (
            <View key={row.category} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {getCategoryIcon(row.category, customCategories)} {label}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {parts.join(" · ")}
                </Text>
              </View>
              {row.averageSpend != null ? (
                <TouchableOpacity
                  style={styles.avgChip}
                  onPress={() =>
                    setDraft(row.category, String(suggestLimitFromAverage(row.averageSpend ?? 0)))
                  }
                  accessibilityLabel={t("budget.spending.limits.useAverageA11y", { category: label })}
                >
                  <Text style={styles.avgChipText}>{t("budget.spending.limits.avgChip")}</Text>
                </TouchableOpacity>
              ) : null}
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={(text) => setDraft(row.category, text)}
                placeholder={t("budget.spending.limits.nonePlaceholder")}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                accessibilityLabel={t("budget.spending.limits.limitInputA11y", { category: label })}
              />
            </View>
          );
        })
      ) : !error ? (
        <Text style={styles.loading}>{t("budget.spending.limits.loading")}</Text>
      ) : null}
    </SheetModal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      gap: 8,
    },
    fillRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },
    fillChip: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    fillChipText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "600",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    rowMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    avgChip: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    avgChipText: {
      color: colors.textDim,
      fontSize: 11,
      fontWeight: "700",
    },
    input: {
      width: 96,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: colors.text,
      fontSize: 15,
      textAlign: "right",
      fontVariant: ["tabular-nums"],
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
    },
    loading: {
      color: colors.textDim,
      fontSize: 13,
      paddingVertical: 16,
      textAlign: "center",
    },
    disabled: {
      opacity: 0.6,
    },
  });

export default BudgetLimitsModal;
