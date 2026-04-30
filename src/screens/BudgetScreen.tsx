import React, { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { generateUUID } from "../utils/uuid";
import DonutChart, { type DonutSlice } from "../components/DonutChart";
import NetWorthHistoryCard from "../components/NetWorthHistoryCard";
import AddBudgetEntryModal from "../components/AddBudgetEntryModal";
import EditBudgetEntryModal from "../components/EditBudgetEntryModal";
import MonthlyReviewModal from "../components/MonthlyReviewModal";
import {
  BUDGET_CATEGORIES,
  BudgetCategory,
  BudgetEntry,
  CategoryBudgetLimit,
  Debt,
  NewBudgetEntryInput,
  SavingsGoal,
  AssetAccount,
  AssetAccountCategory,
  ASSET_ACCOUNT_CATEGORIES,
  ASSET_ACCOUNT_CATEGORY_LABELS,
  NetWorthSnapshot,
} from "../types";
import {
  getBudgetEntries,
  getAllLimitsByMonth,
  getCategoryBudgetLimits,
  saveBudgetEntries,
  saveCategoryBudgetLimits,
} from "../storage/budgetStorage";
import {
  buildMonthlyReview,
  type CategorySpendingComparison,
  type MonthlyReviewData,
} from "../utils/budgetInsights";
import { getDebts } from "../storage/debtStorage";
import {
  getSavingsGoals,
  saveSavingsGoals,
} from "../storage/savingsGoalStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import {
  getAssetAccounts,
  saveAssetAccounts,
} from "../storage/assetAccountStorage";
import { syncNetWorthSnapshot } from "../storage/netWorthSnapshotStorage";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { calculateNetWorthTotals } from "../utils/netWorth";

type ExpenseCategoryEntry = {
  id: string;
  amount: number;
  description?: string;
  date: string;
  recurring?: boolean;
};

type ExpenseCategoryRow = {
  category: BudgetCategory;
  spent: number;
  limit: number | null;
  ratio: number | null;
  entries: ExpenseCategoryEntry[];
};

const inferFoodSplitCategory = (entry: BudgetEntry): Extract<BudgetCategory, "Grocery" | "Restaurant"> => {
  const text = `${entry.description || ""} ${entry.category}`.toLowerCase();
  const restaurantHints = [
    "restaurant",
    "dine",
    "dinner",
    "lunch",
    "breakfast",
    "takeout",
    "delivery",
    "uber eats",
    "doordash",
    "grubhub",
    "cafe",
    "coffee",
    "bar",
    "pizza",
  ];
  return restaurantHints.some((hint) => text.includes(hint))
    ? "Restaurant"
    : "Grocery";
};

const getMonthKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

const getMonthDateFromKey = (monthKey: string): Date =>
  new Date(`${monthKey}-01T00:00:00`);

const formatMonthLabel = (monthKey: string): string =>
  getMonthDateFromKey(monthKey).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

const getMonthKeyOffset = (offset: number, fromDate: Date = new Date()): string => {
  const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  cursor.setMonth(cursor.getMonth() + offset);
  return getMonthKey(cursor);
};

const getBudgetMonthKeys = (): string[] => [
  getMonthKeyOffset(1),
  getMonthKeyOffset(0),
  getMonthKeyOffset(-1),
  getMonthKeyOffset(-2),
  getMonthKeyOffset(-3),
  getMonthKeyOffset(-4),
  getMonthKeyOffset(-5),
];

const isDateInMonthKey = (dateISO: string, monthKey: string): boolean =>
  getMonthKey(new Date(dateISO)) === monthKey;

/** Returns true when a recurring entry should appear in the given month (its start month or any later month). */
const isRecurringInMonth = (dateISO: string, monthKey: string): boolean =>
  getMonthKey(new Date(dateISO)) <= monthKey;

/** Returns an array of YYYY-MM keys from the month after `from` up to and including `to`. */
const getMonthKeysBetween = (from: string, to: string): string[] => {
  const keys: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy;
  let m = fm;
  // Advance one month past `from`
  m++;
  if (m > 12) { m = 1; y++; }
  while (y < ty || (y === ty && m <= tm)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return keys;
};

const getCategoryComparisonHeadline = (comparison: CategorySpendingComparison): string => {
  if (comparison.percentChange != null) {
    const direction = comparison.percentChange > 0 ? "more" : "less";
    return `${Math.abs(comparison.percentChange).toFixed(0)}% ${direction} on ${comparison.category}`;
  }
  if (comparison.average === 0 && comparison.current > 0) {
    return `New spending in ${comparison.category}`;
  }
  if (comparison.current === 0 && comparison.average > 0) {
    return `No ${comparison.category} spend this month`;
  }
  return `${comparison.category} flat vs average`;
};

const getCategoryComparisonSubtext = (
  comparison: CategorySpendingComparison,
  formatCurrency: (value: number) => string
): string =>
  `${formatCurrency(comparison.current)} this month · ${formatCurrency(comparison.average)} avg over ${comparison.monthsAveraged} mo`;

const BudgetScreen: React.FC = () => {
  const { colors } = useTheme();
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [limits, setLimits] = useState<CategoryBudgetLimit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BudgetEntry | null>(null);
  const [limitModalCategory, setLimitModalCategory] = useState<BudgetCategory | null>(null);
  const [limitInput, setLimitInput] = useState("");
  const [selectedMonthKey, setSelectedMonthKey] = useState(getMonthKey(new Date()));
  const [showFoodSplitModal, setShowFoodSplitModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [foodSplitDraft, setFoodSplitDraft] = useState<Record<string, "Grocery" | "Restaurant">>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<MonthlyReviewData | null>(null);
  const [reviewPreviewData, setReviewPreviewData] = useState<MonthlyReviewData | null>(null);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetAccount | null>(null);
  const [assetName, setAssetName] = useState("");
  const [assetBalance, setAssetBalance] = useState("");
  const [assetCategory, setAssetCategory] = useState<AssetAccountCategory>("savings");
  const [keelTarget, setKeelTarget] = useState(0);
  const [showEfContribModal, setShowEfContribModal] = useState(false);
  const [efContribAmount, setEfContribAmount] = useState("");
  const [netWorthSnapshots, setNetWorthSnapshots] = useState<NetWorthSnapshot[]>([]);

  const monthKeys = useMemo(() => getBudgetMonthKeys(), []);
  const currentMonthKey = useMemo(() => getMonthKey(new Date()), []);
  const nextMonthKey = monthKeys[0];
  const selectedMonthIndex = Math.max(0, monthKeys.indexOf(selectedMonthKey));

  const refreshNetWorthSnapshots = useCallback(async () => {
    const nextSnapshots = await syncNetWorthSnapshot();
    setNetWorthSnapshots(nextSnapshots);
    return nextSnapshots;
  }, []);

  const refreshMonthlyReview = useCallback(async (reviewEntries: BudgetEntry[]) => {
    const limitsByMonth = await getAllLimitsByMonth();
    const nextReviewData = buildMonthlyReview(reviewEntries, limitsByMonth);
    setReviewPreviewData(nextReviewData);
    return nextReviewData;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadBudgetData = async () => {
        const [
          storedEntries,
          storedLimits,
          storedDebts,
          storedGoals,
          storedAssets,
          milestonePlan,
          allLimitsByMonth,
        ] = await Promise.all([
          getBudgetEntries(),
          getCategoryBudgetLimits(selectedMonthKey),
          getDebts(),
          getSavingsGoals(),
          getAssetAccounts(),
          getDebtMilestonePlan(),
          getAllLimitsByMonth(),
        ]);
        const keelStep = milestonePlan.steps.find((s) => s.key === "keel");
        setKeelTarget(keelStep?.targetAmount ?? 1000);
        // Process recurring contributions for linked accounts
        const currentMonth = getMonthKey(new Date());
        let entriesModified = false;
        const accountBalanceDeltas = new Map<string, number>();

        for (const entry of storedEntries) {
          if (!entry.recurring || !entry.linkedAccountId) continue;
          const entryStartMonth = getMonthKey(new Date(entry.date));
          const lastApplied = entry.lastAppliedMonth ?? entryStartMonth;
          if (lastApplied >= currentMonth) continue;

          const missedMonths = getMonthKeysBetween(lastApplied, currentMonth);
          if (missedMonths.length === 0) continue;

          const delta = entry.amount * missedMonths.length;
          const prev = accountBalanceDeltas.get(entry.linkedAccountId) ?? 0;
          accountBalanceDeltas.set(entry.linkedAccountId, prev + delta);
          entry.lastAppliedMonth = currentMonth;
          entriesModified = true;
        }

        if (entriesModified) {
          await saveBudgetEntries(storedEntries);
        }

        if (accountBalanceDeltas.size > 0) {
          for (const account of storedAssets) {
            const delta = accountBalanceDeltas.get(account.id);
            if (delta) {
              account.balance += delta;
              account.updatedAt = new Date().toISOString();
            }
          }
          await saveAssetAccounts(storedAssets);
        }

        const nextReviewData = buildMonthlyReview(storedEntries, allLimitsByMonth);

        setEntries(storedEntries);
        setLimits(storedLimits);
        setDebts(storedDebts);
        setSavingsGoals(storedGoals);
        setAssetAccounts(storedAssets);
        setReviewPreviewData(nextReviewData);
        await refreshNetWorthSnapshots();
        setIsLoaded(true);
      };

      loadBudgetData();
    }, [refreshNetWorthSnapshots, selectedMonthKey])
  );

  const selectedMonthDate = useMemo(
    () => getMonthDateFromKey(selectedMonthKey),
    [selectedMonthKey]
  );

  const monthlyEntries = useMemo(
    () =>
      entries.filter((entry) =>
        entry.recurring
          ? isRecurringInMonth(entry.date, selectedMonthKey)
          : isDateInMonthKey(entry.date, selectedMonthKey)
      ),
    [entries, selectedMonthKey]
  );

  const monthlyIncome = useMemo(
    () =>
      monthlyEntries
        .filter((entry) => entry.type === "income")
        .reduce((sum, entry) => sum + entry.amount, 0),
    [monthlyEntries]
  );

  const activeDebts = useMemo(
    () => debts.filter((debt) => debt.balance > 0),
    [debts]
  );

  const automaticDebtMonthlyCost = useMemo(() => {
    if (selectedMonthKey !== currentMonthKey && selectedMonthKey !== nextMonthKey) {
      return 0;
    }
    return activeDebts.reduce((sum, debt) => sum + debt.minPayment, 0);
  }, [activeDebts, currentMonthKey, nextMonthKey, selectedMonthKey]);

  const monthlyExpenses = useMemo(
    () => {
      const manualExpenses = monthlyEntries
        .filter((entry) => entry.type === "expense")
        .reduce((sum, entry) => sum + entry.amount, 0);

      return manualExpenses + automaticDebtMonthlyCost;
    },
    [automaticDebtMonthlyCost, monthlyEntries]
  );

  const monthlyNet = monthlyIncome - monthlyExpenses;

  const savingsReserve = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.type === "expense" &&
            ["Savings", "Retirement", "Investing"].includes(e.category)
        )
        .reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );

  const emergencyFundGoal = useMemo(() => {
    const explicit = savingsGoals.find((g) => g.category === "emergency_fund");
    if (explicit) return explicit;
    // Fall back to Keel milestone data so the emergency fund appears automatically
    if (keelTarget > 0 || savingsReserve > 0) {
      return {
        id: "__keel_ef__",
        name: "Emergency Fund",
        category: "emergency_fund" as const,
        targetAmount: keelTarget,
        currentAmount: savingsReserve,
        createdAt: "",
        updatedAt: "",
      } satisfies SavingsGoal;
    }
    return null;
  }, [savingsGoals, keelTarget, savingsReserve]);

  const totalAssetBalance = useMemo(
    () => assetAccounts.reduce((sum, a) => sum + a.balance, 0),
    [assetAccounts]
  );

  const netWorthTotals = useMemo(
    () =>
      calculateNetWorthTotals({
        entries,
        debts,
        savingsGoals,
        assetAccounts,
      }),
    [assetAccounts, debts, entries, savingsGoals]
  );

  const totalSavings = netWorthTotals.totalAssets;
  const totalDebt = netWorthTotals.totalDebt;
  const netWorth = netWorthTotals.netWorth;

  const topCategoryComparison = useMemo(
    () => reviewPreviewData?.categoryComparisons[0] ?? null,
    [reviewPreviewData]
  );

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

    if (automaticDebtMonthlyCost > 0) {
      map["Debt Payments"] = (map["Debt Payments"] ?? 0) + automaticDebtMonthlyCost;
    }

    return map;
  }, [automaticDebtMonthlyCost, monthlyEntries]);

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
        const entries: ExpenseCategoryEntry[] = monthlyEntries
          .filter((e) => e.type === "expense" && e.category === category)
          .map((e) => ({
            id: e.id,
            amount: e.amount,
            description: e.description,
            date: e.date,
            recurring: e.recurring,
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (category === "Debt Payments") {
          const debtPaymentRows: ExpenseCategoryEntry[] = activeDebts.map((debt) => ({
            id: `auto-debt-${debt.id}`,
            amount: debt.minPayment,
            description: `${debt.name} minimum payment`,
            date: selectedMonthDate.toISOString(),
          }));
          entries.push(...debtPaymentRows);
        }

        return { category, spent, limit, ratio, entries };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [activeDebts, expensesByCategory, limitByCategory, monthlyEntries, selectedMonthDate]);

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

  const adjustAssetAccounts = useCallback(
    (
      accounts: AssetAccount[],
      deltas: Array<{ accountId: string; amount: number }>
    ): AssetAccount[] => {
      if (deltas.length === 0) return accounts;

      const totalsById = new Map<string, number>();
      deltas.forEach(({ accountId, amount }) => {
        totalsById.set(accountId, (totalsById.get(accountId) ?? 0) + amount);
      });

      return accounts.map((account) => {
        const delta = totalsById.get(account.id);
        if (!delta) return account;
        return {
          ...account,
          balance: account.balance + delta,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    []
  );

  const handleAddEntry = useCallback(async (input: NewBudgetEntryInput) => {
    const now = new Date().toISOString();
    const monthKey = now.slice(0, 7);
    const newEntry: BudgetEntry = {
      ...input,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
      lastAppliedMonth: input.linkedAccountId ? monthKey : undefined,
    };

    const nextEntries = [...entries, newEntry];
    const nextAssets = input.linkedAccountId
      ? adjustAssetAccounts(assetAccounts, [{ accountId: input.linkedAccountId, amount: input.amount }])
      : assetAccounts;

    setEntries(nextEntries);
    if (nextAssets !== assetAccounts) {
      setAssetAccounts(nextAssets);
    }

    await saveBudgetEntries(nextEntries);
    if (nextAssets !== assetAccounts) {
      await saveAssetAccounts(nextAssets);
    }
    await Promise.all([
      refreshNetWorthSnapshots(),
      refreshMonthlyReview(nextEntries),
    ]);
    setShowAddModal(false);
  }, [adjustAssetAccounts, assetAccounts, entries, refreshMonthlyReview, refreshNetWorthSnapshots]);

  const handleEditEntry = useCallback((entryId: string) => {
    const found = entries.find((e) => e.id === entryId) ?? null;
    setEditingEntry(found);
  }, [entries]);

  const handleSaveEntry = useCallback(async (updated: BudgetEntry) => {
    const original = entries.find((e) => e.id === updated.id);
    if (!original) {
      setEditingEntry(null);
      return;
    }

    const deltas: Array<{ accountId: string; amount: number }> = [];
    if (original.linkedAccountId) {
      deltas.push({ accountId: original.linkedAccountId, amount: -original.amount });
    }
    if (updated.linkedAccountId) {
      deltas.push({ accountId: updated.linkedAccountId, amount: updated.amount });
    }

    const nextEntries = entries.map((entry) => (entry.id === updated.id ? updated : entry));
    const nextAssets = deltas.length > 0
      ? adjustAssetAccounts(assetAccounts, deltas)
      : assetAccounts;

    setEntries(nextEntries);
    if (nextAssets !== assetAccounts) {
      setAssetAccounts(nextAssets);
    }

    await saveBudgetEntries(nextEntries);
    if (nextAssets !== assetAccounts) {
      await saveAssetAccounts(nextAssets);
    }
    await Promise.all([
      refreshNetWorthSnapshots(),
      refreshMonthlyReview(nextEntries),
    ]);
    setEditingEntry(null);
  }, [adjustAssetAccounts, assetAccounts, entries, refreshMonthlyReview, refreshNetWorthSnapshots]);

  const handleDeleteEntry = useCallback(async (id: string) => {
    const target = entries.find((entry) => entry.id === id);
    const nextEntries = entries.filter((entry) => entry.id !== id);
    const nextAssets = target?.linkedAccountId
      ? adjustAssetAccounts(assetAccounts, [{ accountId: target.linkedAccountId, amount: -target.amount }])
      : assetAccounts;

    setEntries(nextEntries);
    if (nextAssets !== assetAccounts) {
      setAssetAccounts(nextAssets);
    }

    await saveBudgetEntries(nextEntries);
    if (nextAssets !== assetAccounts) {
      await saveAssetAccounts(nextAssets);
    }
    await Promise.all([
      refreshNetWorthSnapshots(),
      refreshMonthlyReview(nextEntries),
    ]);
    setEditingEntry(null);
  }, [adjustAssetAccounts, assetAccounts, entries, refreshMonthlyReview, refreshNetWorthSnapshots]);

  const foodEntriesToSplit = useMemo(
    () => entries.filter((entry) => entry.type === "expense" && entry.category === "Food"),
    [entries]
  );

  const openFoodSplitModal = useCallback(() => {
    const draft: Record<string, "Grocery" | "Restaurant"> = {};
    foodEntriesToSplit.forEach((entry) => {
      draft[entry.id] = inferFoodSplitCategory(entry);
    });
    setFoodSplitDraft(draft);
    setShowFoodSplitModal(true);
  }, [foodEntriesToSplit]);

  const setFoodSplitForEntry = useCallback((entryId: string, category: "Grocery" | "Restaurant") => {
    setFoodSplitDraft((current) => ({ ...current, [entryId]: category }));
  }, []);

  const applyFoodSplit = useCallback(async () => {
    const nextEntries = entries.map((entry) => {
      if (entry.type !== "expense" || entry.category !== "Food") return entry;
      const mapped = foodSplitDraft[entry.id];
      return mapped ? { ...entry, category: mapped } : entry;
    });
    setEntries(nextEntries);
    await saveBudgetEntries(nextEntries);
    await refreshMonthlyReview(nextEntries);
    setShowFoodSplitModal(false);
  }, [entries, foodSplitDraft, refreshMonthlyReview]);

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

  const saveLimit = useCallback(async () => {
    if (!limitModalCategory) return;

    const parsedLimit = parseFloat(limitInput);
    const withoutCategory = limits.filter((item) => item.category !== limitModalCategory);

    const updatedLimits =
      Number.isNaN(parsedLimit) || parsedLimit <= 0
        ? withoutCategory
        : [
            ...withoutCategory,
            { category: limitModalCategory, monthlyLimit: parsedLimit },
          ];

    setLimits(updatedLimits);
    await saveCategoryBudgetLimits(updatedLimits, selectedMonthKey);
    await refreshMonthlyReview(entries);
    closeLimitModal();
  }, [closeLimitModal, entries, limitInput, limitModalCategory, limits, refreshMonthlyReview, selectedMonthKey]);

  const openReviewModal = useCallback(async () => {
    const data = reviewPreviewData ?? (await refreshMonthlyReview(entries));
    setReviewData(data);
    setShowReviewModal(true);
  }, [entries, refreshMonthlyReview, reviewPreviewData]);

  const openAddAssetModal = useCallback(() => {
    setEditingAsset(null);
    setAssetName("");
    setAssetBalance("");
    setAssetCategory("savings");
    setShowAssetModal(true);
  }, []);

  const openEditAssetModal = useCallback((account: AssetAccount) => {
    setEditingAsset(account);
    setAssetName(account.name);
    setAssetBalance(String(account.balance));
    setAssetCategory(account.category);
    setShowAssetModal(true);
  }, []);

  const closeAssetModal = useCallback(() => {
    setShowAssetModal(false);
    setEditingAsset(null);
  }, []);

  const saveAsset = useCallback(async () => {
    const parsedBalance = parseFloat(assetBalance);
    if (!assetName.trim() || Number.isNaN(parsedBalance) || parsedBalance < 0) return;

    const now = new Date().toISOString();
    let nextAccounts: AssetAccount[];

    if (editingAsset) {
      nextAccounts = assetAccounts.map((account) =>
        account.id === editingAsset.id
          ? {
              ...account,
              name: assetName.trim(),
              balance: parsedBalance,
              category: assetCategory,
              updatedAt: now,
            }
          : account
      );
    } else {
      const newAccount: AssetAccount = {
        id: generateUUID(),
        name: assetName.trim(),
        category: assetCategory,
        balance: parsedBalance,
        createdAt: now,
        updatedAt: now,
      };
      nextAccounts = [...assetAccounts, newAccount];
    }

    setAssetAccounts(nextAccounts);
    await saveAssetAccounts(nextAccounts);
    await refreshNetWorthSnapshots();
    closeAssetModal();
  }, [assetAccounts, assetBalance, assetCategory, assetName, closeAssetModal, editingAsset, refreshNetWorthSnapshots]);

  const deleteAsset = useCallback(async (id: string) => {
    const nextAccounts = assetAccounts.filter((account) => account.id !== id);
    setAssetAccounts(nextAccounts);
    await saveAssetAccounts(nextAccounts);
    await refreshNetWorthSnapshots();
    closeAssetModal();
  }, [assetAccounts, closeAssetModal, refreshNetWorthSnapshots]);

  const handleEfContribution = useCallback(async () => {
    const parsed = parseFloat(efContribAmount);
    if (Number.isNaN(parsed) || parsed === 0) return;

    const now = new Date().toISOString();
    const existing = savingsGoals.find((g) => g.category === "emergency_fund");

    let updatedGoals: SavingsGoal[];

    if (existing) {
      const updatedGoal = {
        ...existing,
        currentAmount: Math.max(0, existing.currentAmount + parsed),
        updatedAt: now,
      };
      updatedGoals = savingsGoals.map((g) =>
        g.id === existing.id ? updatedGoal : g
      );
    } else {
      // Create a real savings goal so the contribution persists
      const newGoal: SavingsGoal = {
        id: generateUUID(),
        name: "Emergency Fund",
        category: "emergency_fund",
        targetAmount: keelTarget,
        currentAmount: Math.max(0, parsed),
        createdAt: now,
        updatedAt: now,
      };
      updatedGoals = [...savingsGoals, newGoal];
    }

    setSavingsGoals(updatedGoals);
    await saveSavingsGoals(updatedGoals);
    await refreshNetWorthSnapshots();
    setShowEfContribModal(false);
    setEfContribAmount("");
  }, [efContribAmount, keelTarget, refreshNetWorthSnapshots, savingsGoals]);

  const listHeader = (
    <View>
      <View style={styles.titleSection}>
        <Text style={styles.appLabel}>BudgetArk</Text>
        <Text style={styles.screenTitle}>Budget</Text>
        <Text style={styles.screenSubtitle}>Track income, expenses, and category limits.</Text>
      </View>

      <NetWorthHistoryCard
        snapshots={netWorthSnapshots}
        netWorth={netWorth}
        totalAssets={totalSavings}
        totalDebt={totalDebt}
        formatCurrency={formatCurrency}
        formatCompactCurrency={formatCompactCurrency}
        colors={colors}
      />

      <View style={styles.monthSwitchRow}>
        <TouchableOpacity
          style={[styles.monthSwitchBtn, selectedMonthIndex >= monthKeys.length - 1 && styles.monthSwitchBtnDisabled]}
          onPress={() => {
            if (selectedMonthIndex < monthKeys.length - 1) {
              setSelectedMonthKey(monthKeys[selectedMonthIndex + 1]);
            }
          }}
          disabled={selectedMonthIndex >= monthKeys.length - 1}
        >
          <Text style={styles.monthSwitchBtnText}>← Older</Text>
        </TouchableOpacity>

        <Text style={styles.monthSwitchLabel}>{formatMonthLabel(selectedMonthKey)}</Text>

        <TouchableOpacity
          style={[styles.monthSwitchBtn, selectedMonthIndex <= 0 && styles.monthSwitchBtnDisabled]}
          onPress={() => {
            if (selectedMonthIndex > 0) {
              setSelectedMonthKey(monthKeys[selectedMonthIndex - 1]);
            }
          }}
          disabled={selectedMonthIndex <= 0}
        >
          <Text style={styles.monthSwitchBtnText}>Newer →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
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
              {monthlyNet >= 0 ? "+" : ""}{formatCurrency(monthlyNet)}
            </Text>
          </View>
        </View>
        {automaticDebtMonthlyCost > 0 && (
          <Text style={styles.autoDebtHint}>Includes {formatCurrency(automaticDebtMonthlyCost)} auto debt minimums</Text>
        )}
        {(incomeEntries.length > 0 || emergencyFundGoal) && (
          <View style={styles.incomeSummaryList}>
            {incomeEntries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.incomeSummaryRow}
                onPress={() => handleEditEntry(entry.id)}
                activeOpacity={0.6}
              >
                <Text style={styles.incomeSummaryDesc} numberOfLines={1}>
                  {entry.description || entry.category}
                </Text>
                <View style={styles.incomeSummaryRight}>
                  {entry.recurring && (
                    <Text style={[styles.incomeSummaryTag, { color: colors.accent }]}>Monthly</Text>
                  )}
                  <Text style={[styles.incomeSummaryAmount, { color: colors.success }]}>
                    {formatCurrency(entry.amount)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {emergencyFundGoal && (
              <TouchableOpacity
                style={styles.incomeSummaryRow}
                onPress={() => {
                  setEfContribAmount("");
                  setShowEfContribModal(true);
                }}
                activeOpacity={0.6}
              >
                <Text style={styles.incomeSummaryDesc} numberOfLines={1}>
                  Emergency Fund (Keel)
                </Text>
                <View style={styles.incomeSummaryRight}>
                  <Text style={[styles.incomeSummaryTag, { color: colors.teal }]}>Saved</Text>
                  <Text style={[styles.incomeSummaryAmount, { color: colors.teal }]}>
                    {formatCurrency(emergencyFundGoal.currentAmount)}
                    {emergencyFundGoal.targetAmount > 0
                      ? ` / ${formatCurrency(emergencyFundGoal.targetAmount)}`
                      : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Accounts card */}
      <View style={styles.accountsCard}>
        <View style={styles.accountsHeaderRow}>
          <Text style={styles.accountsTitle}>Accounts</Text>
          <TouchableOpacity onPress={openAddAssetModal}>
            <Text style={[styles.accountsAddBtn, { color: colors.accent }]}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {assetAccounts.length === 0 && !emergencyFundGoal ? (
          <Text style={styles.accountsEmpty}>
            Track your savings, 401k, HSA, and other account balances here.
          </Text>
        ) : (
          <>
            {emergencyFundGoal && (
              <TouchableOpacity
                style={styles.accountRow}
                onPress={() => {
                  setEfContribAmount("");
                  setShowEfContribModal(true);
                }}
                activeOpacity={0.6}
              >
                <View style={styles.accountRowLeft}>
                  <Text style={styles.accountName} numberOfLines={1}>Emergency Fund</Text>
                  <Text style={styles.accountCategory}>
                    {emergencyFundGoal.targetAmount > 0
                      ? `${formatCurrency(emergencyFundGoal.currentAmount)} / ${formatCurrency(emergencyFundGoal.targetAmount)}`
                      : "Savings Goal"}
                  </Text>
                </View>
                <Text style={[styles.accountBalance, { color: colors.teal }]}>
                  {formatCurrency(emergencyFundGoal.currentAmount)}
                </Text>
              </TouchableOpacity>
            )}
            {assetAccounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={styles.accountRow}
                onPress={() => openEditAssetModal(account)}
                activeOpacity={0.6}
              >
                <View style={styles.accountRowLeft}>
                  <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
                  <Text style={styles.accountCategory}>
                    {ASSET_ACCOUNT_CATEGORY_LABELS[account.category]}
                  </Text>
                </View>
                <Text style={[styles.accountBalance, { color: colors.success }]}>
                  {formatCurrency(account.balance)}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.accountTotalRow}>
              <Text style={styles.accountTotalLabel}>Total</Text>
              <Text style={[styles.accountTotalValue, { color: colors.success }]}>
                {formatCurrency(totalAssetBalance + (emergencyFundGoal?.currentAmount ?? 0))}
              </Text>
            </View>
          </>
        )}
      </View>

      {reviewPreviewData && (topCategoryComparison || reviewPreviewData.spendingVsAvgPercent != null) && (
        <TouchableOpacity
          style={styles.reviewSpotlightCard}
          onPress={openReviewModal}
          activeOpacity={0.75}
        >
          <Text style={styles.reviewSpotlightEyebrow}>Monthly Insight</Text>
          <Text style={styles.reviewSpotlightTitle}>
            {topCategoryComparison
              ? getCategoryComparisonHeadline(topCategoryComparison)
              : `${Math.abs(reviewPreviewData.spendingVsAvgPercent ?? 0).toFixed(0)}% ${
                  (reviewPreviewData.spendingVsAvgPercent ?? 0) > 0 ? "more" : "less"
                } vs monthly avg`}
          </Text>
          <Text style={styles.reviewSpotlightBody}>
            {topCategoryComparison
              ? getCategoryComparisonSubtext(topCategoryComparison, formatCurrency)
              : `${formatCurrency(reviewPreviewData.currentMonthSpending)} this month · ${formatCurrency(reviewPreviewData.avgMonthlySpending)} avg`}
          </Text>
          <Text style={[styles.reviewSpotlightCta, { color: colors.accent }]}>Open Monthly Review →</Text>
        </TouchableOpacity>
      )}

      {/* Monthly Review button */}
      <TouchableOpacity
        style={styles.reviewBtn}
        onPress={openReviewModal}
        activeOpacity={0.7}
      >
        <Text style={styles.reviewBtnText}>Monthly Review</Text>
        <Text style={styles.reviewBtnHint}>Trends, changes, streaks, comparisons</Text>
      </TouchableOpacity>

      {/* Spending card — donut chart + category rows in one card */}
      <View style={styles.spendingCard}>
        <View style={styles.spendingHeaderRow}>
          <Text style={styles.spendingTitle}>Spending</Text>
          {foodEntriesToSplit.length > 0 ? (
            <TouchableOpacity onPress={openFoodSplitModal}>
              <Text style={[styles.spendingHint, { color: colors.accent }]}>Split Food ({foodEntriesToSplit.length})</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.spendingHint}>Tap row to expand · Hold for limit</Text>
          )}
        </View>

        {chartData.length > 0 ? (
          <View style={styles.spendingChartWrap}>
            <DonutChart data={pieData} size={160} strokeWidth={26} />
          </View>
        ) : (
          <View style={styles.spendingEmptyWrap}>
            <Text style={styles.emptyCardTitle}>No expenses this month</Text>
            <Text style={styles.emptyCardSubtext}>Add entries to see your spending chart.</Text>
          </View>
        )}

        {expenseRows.map((item, index) => {
          const ratio = item.ratio;
          const progressPercent = ratio ? Math.min(ratio, 1) * 100 : null;
          const hasWarning = ratio != null && ratio >= 0.8 && ratio < 1;
          const isOver = ratio != null && ratio >= 1;
          const statusColor = isOver ? colors.danger : hasWarning ? colors.warning : colors.success;
          const dotColor = chartColors[index % chartColors.length];
          const isExpanded = expandedCategories.has(item.category);

          return (
            <View key={item.category}>
              <TouchableOpacity
                style={styles.categoryRow}
                activeOpacity={0.7}
                onPress={() => toggleCategory(item.category)}
                onLongPress={() => openLimitModal(item.category)}
              >
                <View style={styles.categoryRowLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: dotColor }]} />
                  <Text style={styles.rowCategory}>{item.category}</Text>
                </View>
                <View style={styles.categoryRowRight}>
                  <Text style={styles.rowSpent}>
                    {formatCurrency(item.spent)}
                    {item.limit ? ` / ${formatCurrency(item.limit)}` : ""}
                  </Text>
                  <Text style={styles.categoryChevron}>{isExpanded ? "▾" : "›"}</Text>
                </View>
              </TouchableOpacity>

              {item.limit ? (
                <View style={styles.categoryProgressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPercent ?? 0}%`, backgroundColor: statusColor },
                    ]}
                  />
                </View>
              ) : null}

              {isExpanded && item.entries.length > 0 && (
                <View style={styles.expandedEntries}>
                  <Text style={styles.expandedHeader}>
                    Expanded — {item.entries.length} {item.entries.length === 1 ? "entry" : "entries"}
                  </Text>
                  {item.entries.map((entry) => {
                    const isAutoDebtPayment = entry.id.startsWith("auto-debt-");
                    const entryDate = new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    return (
                      <TouchableOpacity
                        key={entry.id}
                        style={styles.expandedEntryRow}
                        onPress={() => {
                          if (!isAutoDebtPayment) handleEditEntry(entry.id);
                        }}
                        activeOpacity={isAutoDebtPayment ? 1 : 0.6}
                      >
                        <View style={styles.expandedEntryLeft}>
                          <Text style={styles.entryAmount}>{formatCurrency(entry.amount)}</Text>
                          {entry.description ? (
                            <Text style={styles.entryDesc} numberOfLines={1}> — {entry.description}</Text>
                          ) : null}
                        </View>
                        <View style={styles.expandedEntryRight}>
                          {entry.recurring && (
                            <Text style={[styles.entryEditHint, { color: colors.accent }]}>Monthly</Text>
                          )}
                          {isAutoDebtPayment ? (
                            <Text style={styles.entryEditHint}>Auto</Text>
                          ) : (
                            <Text style={styles.expandedEntryDate}>{entryDate}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {isLoaded && (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB — Add Income / Expense */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddBudgetEntryModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddEntry}
        assetAccounts={assetAccounts}
      />

      <EditBudgetEntryModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
        assetAccounts={assetAccounts}
      />

      <MonthlyReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        data={reviewData}
      />

      <Modal
        visible={showFoodSplitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFoodSplitModal(false)}
      >
        <View style={styles.limitOverlay}>
          <View style={styles.limitModalCard}>
            <Text style={styles.limitModalTitle}>Split Food Entries</Text>
            <Text style={styles.limitModalSub}>Review each Food expense and assign Grocery or Restaurant.</Text>

            <FlatList
              data={foodEntriesToSplit}
              keyExtractor={(item) => item.id}
              style={styles.foodSplitList}
              contentContainerStyle={styles.foodSplitListContent}
              renderItem={({ item }) => {
                const selected = foodSplitDraft[item.id] || "Grocery";
                return (
                  <View style={[styles.foodSplitRow, { borderColor: colors.cardBorder }]}> 
                    <View style={styles.foodSplitInfo}>
                      <Text style={styles.foodSplitAmount}>{formatCurrency(item.amount)}</Text>
                      <Text style={styles.foodSplitDesc} numberOfLines={1}>
                        {item.description || new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </Text>
                    </View>
                    <View style={styles.foodSplitOptions}>
                      {(["Grocery", "Restaurant"] as const).map((option) => {
                        const isSelected = selected === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.foodSplitOption,
                              {
                                borderColor: isSelected ? colors.accent : colors.cardBorder,
                                backgroundColor: isSelected ? `${colors.accent}20` : colors.bg,
                              },
                            ]}
                            onPress={() => setFoodSplitForEntry(item.id, option)}
                          >
                            <Text
                              style={[
                                styles.foodSplitOptionText,
                                { color: isSelected ? colors.accent : colors.textDim },
                              ]}
                            >
                              {option}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              }}
            />

            <View style={styles.limitActions}>
              <TouchableOpacity
                style={styles.limitCancelBtn}
                onPress={() => setShowFoodSplitModal(false)}
              >
                <Text style={styles.limitCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.limitSaveBtn} onPress={applyFoodSplit}>
                <Text style={styles.limitSaveText}>Apply Split</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

      {/* Asset Account Add/Edit Modal */}
      <Modal
        visible={showAssetModal}
        transparent
        animationType="fade"
        onRequestClose={closeAssetModal}
      >
        <View style={styles.limitOverlay}>
          <View style={styles.limitModalCard}>
            <Text style={styles.limitModalTitle}>
              {editingAsset ? "Edit Account" : "Add Account"}
            </Text>
            <Text style={styles.limitModalSub}>
              Track a balance that won't affect your monthly budget.
            </Text>

            <TextInput
              style={styles.limitInput}
              placeholder="Account name"
              placeholderTextColor={colors.textMuted}
              value={assetName}
              onChangeText={setAssetName}
            />

            <TextInput
              style={styles.limitInput}
              placeholder="Balance"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={assetBalance}
              onChangeText={setAssetBalance}
            />

            <View style={styles.assetCategoryRow}>
              {ASSET_ACCOUNT_CATEGORIES.map((cat) => {
                const isSelected = assetCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.assetCategoryChip,
                      {
                        borderColor: isSelected ? colors.accent : colors.cardBorder,
                        backgroundColor: isSelected ? `${colors.accent}20` : colors.bg,
                      },
                    ]}
                    onPress={() => setAssetCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.assetCategoryChipText,
                        { color: isSelected ? colors.accent : colors.textDim },
                      ]}
                    >
                      {ASSET_ACCOUNT_CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.limitActions}>
              {editingAsset && (
                <TouchableOpacity
                  style={styles.limitCancelBtn}
                  onPress={() => deleteAsset(editingAsset.id)}
                >
                  <Text style={[styles.limitCancelText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.limitCancelBtn} onPress={closeAssetModal}>
                <Text style={styles.limitCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.limitSaveBtn} onPress={saveAsset}>
                <Text style={styles.limitSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Emergency Fund Contribution Modal */}
      <Modal
        visible={showEfContribModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEfContribModal(false)}
      >
        <View style={styles.limitOverlay}>
          <View style={styles.limitModalCard}>
            <Text style={styles.limitModalTitle}>Emergency Fund</Text>
            <Text style={styles.limitModalSub}>
              Current balance: {formatCurrency(emergencyFundGoal?.currentAmount ?? 0)}
              {emergencyFundGoal?.targetAmount
                ? ` / ${formatCurrency(emergencyFundGoal.targetAmount)}`
                : ""}
            </Text>

            <TextInput
              style={styles.limitInput}
              placeholder="Amount to add (or negative to withdraw)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={efContribAmount}
              onChangeText={setEfContribAmount}
            />

            <Text style={styles.limitModalHint}>
              Enter a positive number to contribute, or negative to withdraw.
            </Text>

            <View style={styles.limitActions}>
              <TouchableOpacity
                style={styles.limitCancelBtn}
                onPress={() => setShowEfContribModal(false)}
              >
                <Text style={styles.limitCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.limitSaveBtn} onPress={handleEfContribution}>
                <Text style={styles.limitSaveText}>Add</Text>
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
      alignItems: "center",
    },
    appLabel: {
      fontSize: 12,
      color: colors.textDim,
      letterSpacing: 2,
      marginBottom: 4,
      textAlign: "center",
    },
    screenTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
      textAlign: "center",
    },
    screenSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
    },
    monthSwitchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
      gap: 8,
    },
    monthSwitchBtn: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minWidth: 84,
      alignItems: "center",
      backgroundColor: colors.card,
    },
    monthSwitchBtnDisabled: {
      opacity: 0.45,
    },
    monthSwitchBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    },
    monthSwitchLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
      flex: 1,
      textAlign: "center",
    },
    summaryCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: 20,
      padding: 20,
      marginBottom: 14,
    },
    netWorthCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 18,
      marginBottom: 14,
      alignItems: "center",
    },
    netWorthTitle: {
      fontSize: 12,
      color: colors.textDim,
      letterSpacing: 1,
      marginBottom: 4,
    },
    netWorthValue: {
      fontSize: 24,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      marginBottom: 14,
    },
    netWorthBreakdown: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
    },
    netWorthStat: {
      flex: 1,
      alignItems: "center",
    },
    netWorthStatLabel: {
      fontSize: 11,
      color: colors.textDim,
      marginBottom: 3,
    },
    netWorthStatValue: {
      fontSize: 14,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    netWorthDivider: {
      width: 1,
      height: 28,
      backgroundColor: colors.cardBorder,
      marginHorizontal: 8,
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
      color: colors.accentButtonText,
      fontSize: 14,
      fontWeight: "700",
    },
    splitBtn: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: "center",
      marginTop: 10,
      backgroundColor: colors.bg,
    },
    splitBtnText: {
      fontSize: 12,
      fontWeight: "600",
    },
    autoDebtHint: {
      color: colors.textDim,
      fontSize: 12,
      marginTop: 10,
      textAlign: "center",
    },
    incomeSummaryList: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 10,
      gap: 6,
    },
    incomeSummaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    incomeSummaryDesc: {
      fontSize: 13,
      color: colors.textDim,
      flex: 1,
      marginRight: 8,
    },
    incomeSummaryRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    incomeSummaryTag: {
      fontSize: 11,
      fontWeight: "600",
    },
    incomeSummaryAmount: {
      fontSize: 13,
      fontWeight: "600",
      fontVariant: ["tabular-nums"] as any,
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
    reviewSpotlightCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 18,
      marginBottom: 12,
    },
    reviewSpotlightEyebrow: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1,
      color: colors.textDim,
      marginBottom: 6,
      textTransform: "uppercase",
    },
    reviewSpotlightTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 6,
    },
    reviewSpotlightBody: {
      fontSize: 13,
      color: colors.textDim,
      marginBottom: 8,
    },
    reviewSpotlightCta: {
      fontSize: 13,
      fontWeight: "700",
    },
    reviewBtn: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 18,
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    reviewBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.accent,
    },
    reviewBtnHint: {
      fontSize: 11,
      color: colors.textMuted,
    },
    spendingCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 16,
    },
    spendingHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    spendingTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    spendingHint: {
      fontSize: 11,
      color: colors.textMuted,
    },
    spendingChartWrap: {
      alignItems: "center",
      marginBottom: 8,
    },
    spendingEmptyWrap: {
      alignItems: "center",
      paddingVertical: 16,
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    categoryRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    categoryRowRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    categoryChevron: {
      fontSize: 16,
      color: colors.textMuted,
      fontWeight: "600",
    },
    categoryProgressTrack: {
      height: 4,
      backgroundColor: colors.bg,
      borderRadius: 999,
      overflow: "hidden",
      marginBottom: 4,
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
    categoryDot: {
      width: 10,
      height: 10,
      borderRadius: 3,
    },
    rowCategory: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    rowSpent: {
      color: colors.textDim,
      fontSize: 13,
      fontWeight: "600",
      fontVariant: ["tabular-nums"] as any,
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
    foodSplitList: {
      maxHeight: 320,
    },
    foodSplitListContent: {
      gap: 8,
    },
    foodSplitRow: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      gap: 8,
      backgroundColor: colors.bg,
    },
    foodSplitInfo: {
      gap: 2,
    },
    foodSplitAmount: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    foodSplitDesc: {
      color: colors.textDim,
      fontSize: 12,
    },
    foodSplitOptions: {
      flexDirection: "row",
      gap: 8,
    },
    foodSplitOption: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: "center",
    },
    foodSplitOptionText: {
      fontSize: 12,
      fontWeight: "600",
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
    entryEditHint: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: "600",
    },

    /* Accounts card */
    accountsCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
    },
    accountsHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    accountsTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    accountsAddBtn: {
      fontSize: 14,
      fontWeight: "700",
    },
    accountsEmpty: {
      fontSize: 13,
      color: colors.textDim,
      textAlign: "center",
      paddingVertical: 8,
    },
    accountRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    accountRowLeft: {
      flex: 1,
      marginRight: 8,
    },
    accountName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    accountCategory: {
      fontSize: 11,
      color: colors.textDim,
      marginTop: 1,
    },
    accountBalance: {
      fontSize: 14,
      fontWeight: "700",
      fontVariant: ["tabular-nums"] as any,
    },
    accountTotalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    accountTotalLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textDim,
    },
    accountTotalValue: {
      fontSize: 15,
      fontWeight: "700",
      fontVariant: ["tabular-nums"] as any,
    },
    assetCategoryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },
    assetCategoryChip: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    assetCategoryChipText: {
      fontSize: 12,
      fontWeight: "600",
    },

    /* FAB */
    fab: {
      position: "absolute",
      bottom: 90,
      right: 20,
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
      elevation: 6,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    fabText: {
      fontSize: 26,
      fontWeight: "300",
      color: colors.accentButtonText || colors.bg,
      lineHeight: 28,
    },
  });

export default BudgetScreen;
