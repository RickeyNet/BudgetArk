import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { generateUUID } from "../utils/uuid";
import DonutChart, { type DonutSlice } from "../components/DonutChart";
import AddBudgetEntryModal from "../components/AddBudgetEntryModal";
import EditBudgetEntryModal from "../components/EditBudgetEntryModal";
import {
  BUDGET_CATEGORIES,
  BudgetCategory,
  BudgetEntry,
  CategoryBudgetLimit,
  NewBudgetEntryInput,
} from "../types";
import {
  getBudgetEntries,
  getCategoryBudgetLimits,
  saveBudgetEntries,
  saveCategoryBudgetLimits,
} from "../storage/budgetStorage";
import { formatCurrency } from "../utils/calculations";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";

type ExpenseCategoryEntry = {
  id: string;
  amount: number;
  description?: string;
  date: string;
};

type ExpenseCategoryRow = {
  category: BudgetCategory;
  spent: number;
  limit: number | null;
  ratio: number | null;
  entries: ExpenseCategoryEntry[];
};

const isSameMonth = (dateISO: string, now: Date): boolean => {
  const date = new Date(dateISO);
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

const BudgetScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [limits, setLimits] = useState<CategoryBudgetLimit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BudgetEntry | null>(null);
  const [limitModalCategory, setLimitModalCategory] = useState<BudgetCategory | null>(null);
  const [limitInput, setLimitInput] = useState("");

  useEffect(() => {
    const loadBudgetData = async () => {
      const [storedEntries, storedLimits] = await Promise.all([
        getBudgetEntries(),
        getCategoryBudgetLimits(),
      ]);
      setEntries(storedEntries);
      setLimits(storedLimits);
      setIsLoaded(true);
    };

    loadBudgetData();
  }, []);

  const now = new Date();

  const monthlyEntries = useMemo(
    () => entries.filter((entry) => isSameMonth(entry.date, now)),
    [entries, now]
  );

  const monthlyIncome = useMemo(
    () =>
      monthlyEntries
        .filter((entry) => entry.type === "income")
        .reduce((sum, entry) => sum + entry.amount, 0),
    [monthlyEntries]
  );

  const monthlyExpenses = useMemo(
    () =>
      monthlyEntries
        .filter((entry) => entry.type === "expense")
        .reduce((sum, entry) => sum + entry.amount, 0),
    [monthlyEntries]
  );

  const monthlyNet = monthlyIncome - monthlyExpenses;

  const limitByCategory = useMemo(() => {
    const map: Partial<Record<BudgetCategory, number>> = {};
    limits.forEach((limit) => {
      map[limit.category] = limit.monthlyLimit;
    });
    return map;
  }, [limits]);

  const expensesByCategory = useMemo(() => {
    const map: Partial<Record<BudgetCategory, number>> = {};

    monthlyEntries
      .filter((entry) => entry.type === "expense")
      .forEach((entry) => {
        map[entry.category] = (map[entry.category] ?? 0) + entry.amount;
      });

    return map;
  }, [monthlyEntries]);

  const incomeByCategory = useMemo(() => {
    const map: Partial<Record<BudgetCategory, number>> = {};

    monthlyEntries
      .filter((entry) => entry.type === "income")
      .forEach((entry) => {
        map[entry.category] = (map[entry.category] ?? 0) + entry.amount;
      });

    return map;
  }, [monthlyEntries]);

  const incomeEntries = useMemo(
    () =>
      monthlyEntries
        .filter((e) => e.type === "income")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [monthlyEntries]
  );

  const expenseRows = useMemo<ExpenseCategoryRow[]>(() => {
    const categoriesInPlay = new Set<BudgetCategory>();

    BUDGET_CATEGORIES.forEach((category) => {
      if ((expensesByCategory[category] ?? 0) > 0 || limitByCategory[category] != null) {
        categoriesInPlay.add(category);
      }
    });

    return Array.from(categoriesInPlay)
      .map((category) => {
        const spent = expensesByCategory[category] ?? 0;
        const limit = limitByCategory[category] ?? null;
        const ratio = limit ? spent / limit : null;
        const entries = monthlyEntries
          .filter((e) => e.type === "expense" && e.category === category)
          .map((e) => ({ id: e.id, amount: e.amount, description: e.description, date: e.date }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { category, spent, limit, ratio, entries };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [expensesByCategory, limitByCategory, monthlyEntries]);

  const chartData = useMemo(
    () =>
      expenseRows
        .filter((row) => row.spent > 0)
        .map((row) => ({ category: row.category, amount: row.spent })),
    [expenseRows]
  );

  const chartColors = useMemo(
    () => [
      colors.accent,
      colors.teal,
      colors.success,
      colors.warning,
      colors.danger,
      colors.textDim,
      colors.textMuted,
      colors.cardBorder,
    ],
    [colors]
  );

  const pieData = useMemo<DonutSlice[]>(
    () =>
      chartData.map((item, index) => ({
        label: item.category,
        value: item.amount,
        color: chartColors[index % chartColors.length],
      })),
    [chartColors, chartData]
  );

  const handleAddEntry = useCallback((input: NewBudgetEntryInput) => {
    const newEntry: BudgetEntry = {
      ...input,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
    };

    setEntries((prev) => {
      const updated = [...prev, newEntry];
      saveBudgetEntries(updated);
      return updated;
    });

    setShowAddModal(false);
  }, []);

  const handleEditEntry = useCallback((entryId: string) => {
    const found = entries.find((e) => e.id === entryId) ?? null;
    setEditingEntry(found);
  }, [entries]);

  const handleSaveEntry = useCallback((updated: BudgetEntry) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === updated.id ? updated : e));
      saveBudgetEntries(next);
      return next;
    });
    setEditingEntry(null);
  }, []);

  const handleDeleteEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveBudgetEntries(next);
      return next;
    });
    setEditingEntry(null);
  }, []);

  const openLimitModal = useCallback(
    (category: BudgetCategory) => {
      const currentLimit = limitByCategory[category];
      setLimitInput(currentLimit ? String(currentLimit) : "");
      setLimitModalCategory(category);
    },
    [limitByCategory]
  );

  const closeLimitModal = useCallback(() => {
    setLimitModalCategory(null);
    setLimitInput("");
  }, []);

  const saveLimit = useCallback(() => {
    if (!limitModalCategory) return;

    const parsedLimit = parseFloat(limitInput);

    setLimits((prev) => {
      const withoutCategory = prev.filter((item) => item.category !== limitModalCategory);

      if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
        saveCategoryBudgetLimits(withoutCategory);
        return withoutCategory;
      }

      const updated = [
        ...withoutCategory,
        { category: limitModalCategory, monthlyLimit: parsedLimit },
      ];
      saveCategoryBudgetLimits(updated);
      return updated;
    });

    closeLimitModal();
  }, [closeLimitModal, limitInput, limitModalCategory]);

  const listHeader = (
    <View>
      <View style={styles.titleSection}>
        <Text style={styles.appLabel}>BUDGETARC</Text>
        <Text style={styles.screenTitle}>Budget</Text>
        <Text style={styles.screenSubtitle}>Track income, expenses, and category limits.</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>THIS MONTH</Text>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Income</Text>
            <Text style={[styles.summaryStatValue, { color: colors.success }]}> 
              {formatCurrency(monthlyIncome)}
            </Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Expenses</Text>
            <Text style={[styles.summaryStatValue, { color: colors.warning }]}> 
              {formatCurrency(monthlyExpenses)}
            </Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Net</Text>
            <Text
              style={[
                styles.summaryStatValue,
                { color: monthlyNet >= 0 ? colors.success : colors.danger },
              ]}
            >
              {formatCurrency(monthlyNet)}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addBtnText}>+ Add Income / Expense</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expense Breakdown</Text>
        {chartData.length > 0 ? (
          <View style={styles.chartCard}>
            <DonutChart data={pieData} size={200} strokeWidth={32} />
            <View style={styles.legendWrap}>
              {pieData.map((item) => (
                <View key={item.label} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendLabel}>{item.label}</Text>
                  <Text style={styles.legendValue}>{formatCurrency(item.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>No expenses this month</Text>
            <Text style={styles.emptyCardSubtext}>Add entries to see your category chart.</Text>
          </View>
        )}
      </View>

      {incomeEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income</Text>
          <View style={styles.incomeCard}>
            <View style={styles.incomeWrap}>
              {Object.entries(incomeByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => (
                  <View key={category} style={styles.incomePill}>
                    <Text style={styles.incomePillCategory}>{category}</Text>
                    <Text style={styles.incomePillAmount}>{formatCurrency(amount)}</Text>
                  </View>
                ))}
            </View>
            <View style={styles.incomeEntryList}>
              {incomeEntries.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.entryRow}
                  onPress={() => handleEditEntry(entry.id)}
                  activeOpacity={0.6}
                >
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryAmount, { color: colors.success }]}>
                      {formatCurrency(entry.amount)}
                    </Text>
                    <Text style={styles.entryDesc} numberOfLines={1}>
                      {entry.description || entry.category}
                    </Text>
                  </View>
                  <View style={styles.entryRight}>
                    <Text style={styles.entryDate}>
                      {new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </Text>
                    <Text style={styles.entryEditHint}>Edit</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Expense Categories</Text>
        <Text style={styles.sectionHint}>Warning at 80%</Text>
      </View>
    </View>
  );

  const renderExpenseRow = ({ item }: { item: ExpenseCategoryRow }) => {
    const ratio = item.ratio;
    const progressPercent = ratio ? Math.min(ratio, 1) * 100 : null;
    const hasWarning = ratio != null && ratio >= 0.8 && ratio < 1;
    const isOver = ratio != null && ratio >= 1;

    const statusColor = isOver
      ? colors.danger
      : hasWarning
        ? colors.warning
        : colors.success;

    return (
      <View style={styles.rowCard}>
        <View style={styles.rowTop}>
          <View>
            <Text style={styles.rowCategory}>{item.category}</Text>
            <Text style={styles.rowSpent}>Spent: {formatCurrency(item.spent)}</Text>
          </View>

          <TouchableOpacity
            style={styles.limitBtn}
            onPress={() => openLimitModal(item.category)}
          >
            <Text style={styles.limitBtnText}>
              {item.limit ? "Edit Limit" : "Set Limit"}
            </Text>
          </TouchableOpacity>
        </View>

        {item.limit ? (
          <>
            <Text style={styles.limitText}>Limit: {formatCurrency(item.limit)}</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent ?? 0}%`, backgroundColor: statusColor },
                ]}
              />
            </View>
            <Text style={[styles.rowStatus, { color: statusColor }]}> 
              {isOver
                ? "Over budget"
                : hasWarning
                  ? "Approaching limit"
                  : "On track"}
            </Text>
          </>
        ) : (
          <Text style={styles.noLimitText}>No monthly limit set yet.</Text>
        )}

        {item.entries.length > 0 && (
          <View style={styles.entryList}>
            {item.entries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryRow}
                onPress={() => handleEditEntry(entry.id)}
                activeOpacity={0.6}
              >
                <View style={styles.entryInfo}>
                  <Text style={styles.entryAmount}>{formatCurrency(entry.amount)}</Text>
                  {entry.description ? (
                    <Text style={styles.entryDesc} numberOfLines={1}>{entry.description}</Text>
                  ) : null}
                </View>
                <View style={styles.entryRight}>
                  <Text style={styles.entryDate}>
                    {new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </Text>
                  <Text style={styles.entryEditHint}>Edit</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {isLoaded && (
        <FlatList
          data={expenseRows}
          keyExtractor={(item) => item.category}
          renderItem={renderExpenseRow}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No expense categories yet</Text>
              <Text style={styles.emptySub}>Add an expense entry to begin tracking.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AddBudgetEntryModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddEntry}
      />

      <EditBudgetEntryModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
      />

      <Modal
        visible={limitModalCategory != null}
        transparent
        animationType="fade"
        onRequestClose={closeLimitModal}
      >
        <View style={styles.limitOverlay}>
          <View style={styles.limitModalCard}>
            <Text style={styles.limitModalTitle}>Set Monthly Limit</Text>
            <Text style={styles.limitModalSub}>{limitModalCategory}</Text>

            <TextInput
              style={styles.limitInput}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={limitInput}
              onChangeText={setLimitInput}
            />

            <Text style={styles.limitModalHint}>Leave empty to remove limit.</Text>

            <View style={styles.limitActions}>
              <TouchableOpacity style={styles.limitCancelBtn} onPress={closeLimitModal}>
                <Text style={styles.limitCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.limitSaveBtn} onPress={saveLimit}>
                <Text style={styles.limitSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 110,
    },
    titleSection: {
      paddingTop: 56,
      paddingBottom: 20,
    },
    appLabel: {
      fontSize: 12,
      color: colors.textDim,
      letterSpacing: 2,
      marginBottom: 4,
    },
    screenTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    screenSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
    },
    summaryCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: 20,
      padding: 20,
      marginBottom: 18,
    },
    summaryLabel: {
      color: colors.textMuted,
      fontSize: 10,
      letterSpacing: 1,
      marginBottom: 12,
    },
    summaryTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 16,
    },
    summaryStat: {
      flex: 1,
    },
    summaryStatLabel: {
      color: colors.textDim,
      fontSize: 11,
      marginBottom: 3,
    },
    summaryStatValue: {
      fontSize: 16,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    addBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 11,
      alignItems: "center",
    },
    addBtnText: {
      color: "#000000",
      fontSize: 14,
      fontWeight: "700",
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 10,
    },
    chartCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 10,
      alignItems: "center",
    },
    legendWrap: {
      gap: 6,
      marginBottom: 8,
    },
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendLabel: {
      flex: 1,
      color: colors.textDim,
      fontSize: 12,
    },
    legendValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
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
    incomeCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 14,
    },
    incomeWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    incomeEntryList: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 8,
      gap: 6,
    },
    incomePill: {
      backgroundColor: colors.successDim,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: "row",
      gap: 8,
    },
    incomePillCategory: {
      fontSize: 12,
      color: colors.success,
      fontWeight: "600",
    },
    incomePillAmount: {
      fontSize: 12,
      color: colors.success,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    sectionHint: {
      color: colors.textMuted,
      fontSize: 11,
    },
    rowCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    rowTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      gap: 8,
    },
    rowCategory: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    rowSpent: {
      color: colors.textDim,
      fontSize: 12,
      marginTop: 2,
    },
    limitBtn: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    limitBtnText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "600",
    },
    limitText: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: 8,
    },
    progressTrack: {
      height: 8,
      backgroundColor: colors.bg,
      borderRadius: 999,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      minWidth: 2,
    },
    rowStatus: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: "600",
    },
    noLimitText: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    emptyWrap: {
      alignItems: "center",
      paddingVertical: 24,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    emptySub: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
    },
    limitOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    limitModalCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 18,
    },
    limitModalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    limitModalSub: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 12,
    },
    limitInput: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
      marginBottom: 8,
    },
    limitModalHint: {
      fontSize: 12,
      color: colors.textMuted,
    },
    limitActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },
    limitCancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    limitCancelText: {
      color: colors.textDim,
      fontSize: 14,
      fontWeight: "600",
    },
    limitSaveBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    limitSaveText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "700",
    },
    entryList: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 8,
      gap: 6,
    },
    entryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    entryInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
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
    entryRight: {
      alignItems: "flex-end",
      gap: 2,
    },
    entryDate: {
      color: colors.textMuted,
      fontSize: 11,
    },
    entryEditHint: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: "600",
    },
  });

export default BudgetScreen;
