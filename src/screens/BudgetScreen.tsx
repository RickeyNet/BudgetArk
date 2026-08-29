/**
 * BudgetArk - Budget Tab
 * File: src/screens/BudgetScreen.tsx
 *
 * Monthly income/expense ledger: entry list with category budgets and
 * limits, the month-start cash-flow card, recurring entries, private
 * entries, bank Review Inbox access, and the Add/Edit entry modal. Every
 * write goes through the atomic budgetStorage helpers so a partner sync or
 * bank sync landing behind this screen is never reverted by a stale save.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePresentAfterDismiss } from "../hooks/usePresentAfterDismiss";
import {
  FlatList,
  InteractionManager,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { generateUUID } from "../utils/uuid";
import BudgetBucketCard from "../components/BudgetBucketCard";
import SpendingCard, {
  type ExpenseCategoryRow,
  isAutoEntryId,
} from "../components/SpendingCard";
import { buildExpenseCategoryRows } from "../utils/expenseCategoryRows";
import { resolveCategoryBuckets } from "../utils/categoryBucketResolve";
import FoodSplitModal, { type FoodSplitCategory } from "../components/FoodSplitModal";
import BudgetEntryModal from "../components/BudgetEntryModal";
import ReviewInboxModal from "../components/ReviewInboxModal";
import { useConnections } from "../connections/ConnectionsProvider";
import MonthlyReviewModal from "../components/MonthlyReviewModal";
import BillCalendarModal from "../components/BillCalendarModal";
import GlobalSearchModal from "../components/GlobalSearchModal";
import { KeyboardAwareModalOverlay } from "../components/KeyboardAwareModalOverlay";
import DueDateReminderBanner from "../components/DueDateReminderBanner";
import DebtDueReminderBanner from "../components/DebtDueReminderBanner";
import {
  getDebtDueDismissals,
  type DebtDueDismissals,
} from "../storage/debtDueReminderStorage";
import { useCustomCategories } from "../categories/CustomCategoriesProvider";
import { getCategoryIcon, categoryNameHash } from "../data/categoryIcons";
import {
  BUDGET_BUCKET_LABELS,
  BUDGET_BUCKET_ORDER,
  DEFAULT_CUSTOM_CATEGORY_BUCKET,
  getDefaultBucketForCategory,
} from "../data/categoryBuckets";
import {
  BUDGET_CATEGORIES,
  BudgetCategory,
  CategoryName,
  BudgetEntry,
  CategoryBudgetLimit,
  Debt,
  NewBudgetEntryInput,
  Payment,
  SavingsGoal,
  AssetAccount,
  BudgetBucket,
  RootTabParamList,
} from "../types";
import {
  getBudgetEntries,
  getAllLimitsByMonth,
  getCategoryBudgetLimits,
  addBudgetEntries,
  saveCategoryBudgetLimits,
  deleteBudgetEntry,
  restoreBudgetEntry,
  updateBudgetEntry,
  deleteBudgetEntries,
  restoreBudgetEntries,
  setBudgetEntryCategories,
} from "../storage/budgetStorage";
import { subscribeDataChanged } from "../storage/dataChangeNotifier";
import type { BalanceDelta } from "../utils/assetBalanceDeltas";
import {
  buildMonthlyReview,
  type MonthlyReviewData,
} from "../utils/budgetInsights";
import { getDebts, getPayments } from "../storage/debtStorage";
import { paymentMonthKey } from "../utils/debtDueCalendar";
import { buildDebtPaymentPlanForMonth } from "../utils/debtPaymentPlan";
import {
  getSavingsGoals,
  saveSavingsGoals,
} from "../storage/savingsGoalStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import {
  getAssetAccounts,
  adjustAssetAccountBalances,
} from "../storage/assetAccountStorage";
import { useBusinesses, usePeople } from "../people/PeopleProvider";
import {
  getCategoryBucketOverrides,
  removeCategoryBucketOverride,
  setCategoryBucketOverride,
  type CategoryBucketOverrides,
} from "../storage/categoryBucketOverridesStorage";
import { syncNetWorthSnapshot } from "../storage/netWorthSnapshotStorage";
import { triggerHaptic } from "../utils/haptics";
import { useAchievements } from "../achievements/AchievementsProvider";
import { recordMonthlyReviewOpen } from "../storage/achievementStatsStorage";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import { useTabCoachmark } from "../onboarding/useTabCoachmark";
import { useCoachmarkAnchor } from "../onboarding/CoachmarkAnchorContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fabBottomOffset, TAB_BAR_BASE_HEIGHT } from "../navigation/tabBarLayout";
import { useUndo } from "../undo/UndoProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { getRecurrenceTag } from "../utils/recurrence";
import { entriesForMonth } from "../utils/billFulfillment";
import { buildPaceAlerts, pacingClockFor } from "../utils/budgetPacing";
import SpendingPaceBanner from "../components/SpendingPaceBanner";
import { applyAndPersistMissedContributions } from "../utils/linkedAccountRecurringApply";
import { applyEmergencyFundContribution } from "../utils/savingsGoals";
import { formatMonthKeyLabel, getBudgetMonthKeys, getMonthDateFromKey, getMonthKey } from "../utils/budgetMonths";
import {
  getEmergencyFundSource,
  resolveEmergencyFundGoal,
  sumSavingsReserve,
} from "../utils/emergencyFund";
import { totalsByBucket } from "../utils/budgetBucketMath";
import { summarizePaychecks } from "../utils/paycheckMath";
import CashFlowCard from "../components/CashFlowCard";
import MonthBalancePromptModal from "../components/MonthBalancePromptModal";
import {
  getLastBalancePromptMonth,
  getMonthStartBalances,
  setLastBalancePromptMonth,
} from "../storage/monthlyBalanceStorage";
import {
  computeMonthReconciliationDelta,
  type MonthStartBalanceMap,
} from "../utils/cashFlow";

/**
 * FAB layout constants - kept here so the coachmark can compute a
 * window-relative rect for the spotlight without going through a ref +
 * measureInWindow round-trip. The vertical offset derives from the live
 * bottom safe-area inset via fabBottomOffset() (so the FAB clears the tab
 * bar on every device); keep RIGHT/SIZE in sync with styles.fab.
 */
const FAB_RIGHT = 20;
const FAB_SIZE = 52;

const CATEGORY_CHART_PALETTE = [
  "#4E79A7",
  "#F28E2B",
  "#E15759",
  "#76B7B2",
  "#59A14F",
  "#EDC949",
  "#AF7AA1",
  "#FF9DA7",
  "#9C755F",
  "#BAB0AC",
  "#6F4E7C",
  "#2A9D8F",
  "#E76F51",
  "#8AB17D",
  "#577590",
  "#F4A261",
  "#43AA8B",
  "#C77DFF",
  "#277DA1",
  "#90BE6D",
  "#F94144",
  "#F3722C",
  "#F9844A",
  "#7B6D8D",
] as const;

const BudgetScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const route = useRoute<RouteProp<RootTabParamList, "Budget">>();
  const { colors, showAmbientBackground } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const { runCheck: notifyAchievementCheck } = useAchievements();
  const insets = useSafeAreaInsets();
  const { pushUndo } = useUndo();
  const coachmark = useTabCoachmark("Budget");
  const listRef = useRef<FlatList>(null);
  const anchorBudgetSummary = useCoachmarkAnchor("budget-summary-card", { scrollRef: listRef });
  const anchorBudgetSpending = useCoachmarkAnchor("budget-spending-card", { scrollRef: listRef });
  // FAB anchor is a phantom View rendered alongside the FAB at the exact same
  // layout position. Previous computed-rect approach drifted from the real
  // on-screen FAB on Android when window/nav-bar inset assumptions diverged
  // from the screen's coordinate space. Using a real ref + measureInWindow
  // means the spotlight ring lands wherever React Native actually painted the
  // FAB - by definition.
  const anchorBudgetFab = useCoachmarkAnchor("budget-fab");
  const styles = React.useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const presentAfterDismiss = usePresentAfterDismiss();
  const { customCategories } = useCustomCategories();
  const customCategoryNames = useMemo(
    () => customCategories.map((c) => c.name),
    [customCategories]
  );
  const { connections, pendingCount } = useConnections();

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dueDismissals, setDueDismissals] = useState<DebtDueDismissals>({});
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [limits, setLimits] = useState<CategoryBudgetLimit[]>([]);
  const [monthBalances, setMonthBalances] = useState<MonthStartBalanceMap>({});
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  /** True when the open balance modal came from the once-per-month nudge. */
  const [balanceModalIsPrompt, setBalanceModalIsPrompt] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  /** Category preselected by the Quick Entry widget's deep link, if any. */
  const [quickAddCategory, setQuickAddCategory] = useState<CategoryName | undefined>(undefined);
  const [editingEntry, setEditingEntry] = useState<BudgetEntry | null>(null);
  /** Pace banner tap -> Spending card expands this category. */
  const [paceExpandRequest, setPaceExpandRequest] = useState<
    { category: CategoryName; nonce: number } | null
  >(null);
  /** "Log actual" target: the add sheet opens prefilled as this bill's charge. */
  const [logActualBill, setLogActualBill] = useState<
    { bill: BudgetEntry; yearMonth: string } | undefined
  >(undefined);
  const [showBillCalendar, setShowBillCalendar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  /** Reference time for search date presets - stamped when the sheet opens,
   * never in render (react-hooks/purity). */
  const [searchNow, setSearchNow] = useState<Date | null>(null);
  const [showReviewInbox, setShowReviewInbox] = useState(false);
  const [limitModalCategory, setLimitModalCategory] = useState<CategoryName | null>(null);
  const [limitInput, setLimitInput] = useState("");
  const [selectedMonthKey, setSelectedMonthKey] = useState(getMonthKey(new Date()));
  const [showFoodSplitModal, setShowFoodSplitModal] = useState(false);
  // Multi-select for bulk delete / recategorize. `selectionMode` flips row
  // taps from "edit" to "toggle select"; auto-debt-payment rows are never
  // selectable (they're derived from debts, not real budget entries).
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [showBulkCategoryPicker, setShowBulkCategoryPicker] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<MonthlyReviewData | null>(null);
  const [reviewPreviewData, setReviewPreviewData] = useState<MonthlyReviewData | null>(null);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
  // Reloaded on every focus, so edits in Profile -> Businesses show up here.
  const { businesses } = useBusinesses();
  // Same focus-reload rationale for Profile -> People edits.
  const { people } = usePeople();
  /** Spending-card "💼 Business only" filter chip. Session-only by design -
   *  a sticky filter would silently misrepresent spending next launch. */
  const [businessOnly, setBusinessOnly] = useState(false);
  const [keelTarget, setKeelTarget] = useState(0);
  const [showEfContribModal, setShowEfContribModal] = useState(false);
  const [efContribAmount, setEfContribAmount] = useState("");
  const [bucketOverrides, setBucketOverrides] = useState<CategoryBucketOverrides>({});
  const [bucketOverrideCategory, setBucketOverrideCategory] = useState<string | null>(null);

  const monthKeys = useMemo(() => getBudgetMonthKeys(), []);
  const selectedMonthIndex = Math.max(0, monthKeys.indexOf(selectedMonthKey));

  // Persists a fresh snapshot for sync; nothing on this screen renders the
  // result since the net-worth history card moved to the Bridge screen.
  const refreshNetWorthSnapshots = useCallback(async () => {
    await syncNetWorthSnapshot();
  }, []);

  const refreshMonthlyReview = useCallback(async (reviewEntries: BudgetEntry[]) => {
    const limitsByMonth = await getAllLimitsByMonth();
    const nextReviewData = buildMonthlyReview(reviewEntries, limitsByMonth, 6, people);
    setReviewPreviewData(nextReviewData);
    return nextReviewData;
  }, [people]);

  // Bumped when partner sync / bank sync / an import writes storage while
  // this tab is mounted; it's a dep of the focus loader below, so the loader
  // re-runs (while focused) and the screen picks up the merged records
  // instead of holding a stale snapshot until the next tab switch.
  const [reloadTick, setReloadTick] = useState(0);
  useEffect(
    () => subscribeDataChanged(() => setReloadTick((tick) => tick + 1)),
    []
  );

  useFocusEffect(
    useCallback(() => {
      // Guard every setState after an await so that a fast tab/month switch
      // doesn't let a slower load resolve last and overwrite the newer one's
      // data.
      let cancelled = false;
      const loadBudgetData = async () => {
        const [
          storedEntries,
          storedDebts,
          storedPayments,
          storedGoals,
          storedAssets,
          milestonePlan,
          allLimitsByMonth,
          storedBucketOverrides,
          storedDueDismissals,
          storedMonthBalances,
        ] = await Promise.all([
          getBudgetEntries(),
          getDebts(),
          getPayments(),
          getSavingsGoals(),
          getAssetAccounts(),
          getDebtMilestonePlan(),
          getAllLimitsByMonth(),
          getCategoryBucketOverrides(),
          getDebtDueDismissals(),
          getMonthStartBalances(),
        ]);
        if (cancelled) return;
        const keelStep = milestonePlan.steps.find((s) => s.key === "keel");
        setKeelTarget(keelStep?.targetAmount ?? 1000);
        // Apply + persist missed recurring linked-account contributions via
        // the shared shell - it owns the save-order invariant that prevents
        // double-crediting (see linkedAccountRecurringApply.ts). BridgeScreen
        // goes through the same shell.
        const processed = await applyAndPersistMissedContributions(
          storedEntries,
          storedAssets
        );

        if (cancelled) return;
        const nextReviewData = buildMonthlyReview(
          processed.entries,
          allLimitsByMonth,
          6,
          people
        );

        setEntries(processed.entries);
        setDebts(storedDebts);
        setPayments(storedPayments);
        setDueDismissals(storedDueDismissals);
        setSavingsGoals(storedGoals);
        setAssetAccounts(processed.assetAccounts);
        setMonthBalances(storedMonthBalances);
        setReviewPreviewData(nextReviewData);
        setBucketOverrides(storedBucketOverrides);
        await refreshNetWorthSnapshots();
        if (cancelled) return;
        setIsLoaded(true);
      };

      // A rejected read (5 s storage timeout on a near-full device, decrypt
      // failure) must not leave isLoaded false forever - that's a blank tab
      // with no retry. Keep whatever state we have (empty defaults on a
      // cold load, the previous load's data otherwise), settle the loader,
      // and let the next focus try again. Mirrors DebtTracker/Bridge.
      loadBudgetData().catch((error: unknown) => {
        if (cancelled) return;
        if (__DEV__) console.error("Failed to load budget:", error);
        setIsLoaded(true);
      });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- reloadTick re-runs the loader after a background write (see its declaration)
    }, [people, refreshNetWorthSnapshots, reloadTick])
  );

  // Category limits are the ONLY month-scoped collection, so they reload on
  // their own when the user pages months - the wide load above deliberately
  // does not depend on selectedMonthKey, which used to re-read all eleven
  // collections (and re-run the recurring-contribution sweep) per page.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getCategoryBudgetLimits(selectedMonthKey)
        .then((storedLimits) => {
          if (!cancelled) setLimits(storedLimits);
        })
        .catch((error: unknown) => {
          // Keep the previous month's limits on screen rather than crash
          // with an unhandled rejection; the next focus/page retries.
          if (__DEV__) console.error("Failed to load budget limits:", error);
        });
      return () => {
        cancelled = true;
      };
    }, [selectedMonthKey])
  );

  const selectedMonthDate = useMemo(
    () => getMonthDateFromKey(selectedMonthKey),
    [selectedMonthKey]
  );

  // Recurring-aware AND fulfilment-aware: a bill whose actual charge landed
  // this month shows the actual, not the estimate (utils/billFulfillment).
  const monthlyEntries = useMemo(
    () => entriesForMonth(entries, selectedMonthKey),
    [entries, selectedMonthKey]
  );

  const entriesById = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries]
  );

  const monthlyIncome = useMemo(
    () =>
      monthlyEntries
        .filter((entry) => entry.type === "income")
        .reduce((sum, entry) => sum + entry.amount, 0),
    [monthlyEntries]
  );

  // Actual recorded debt payments that fall in the selected month. Sourced
  // from the Payment collection (created by `recordPayment` on the Debt
  // Tracker screen). Surfacing them on Budget closes the gap where past
  // months previously showed $0 for "Debt Payments" because the screen only
  // ever saw the synthetic minimum forecast below. Payments whose parent
  // debt has since been deleted are excluded - `deleteDebt` does not
  // cascade-delete payments, and a user who created a test debt, paid it
  // off, and deleted it should not see those test payments lingering on
  // their Budget for past months. Bucketing uses `paymentMonthKey` so a
  // payment lands in the same local month the due-reminder math credits it
  // to.
  const recordedDebtPaymentsForMonth = useMemo(() => {
    const liveDebtIds = new Set(debts.map((d) => d.id));
    return payments.filter(
      (p) =>
        liveDebtIds.has(p.debtId) &&
        paymentMonthKey(p.date) === selectedMonthKey
    );
  }, [debts, payments, selectedMonthKey]);

  /**
   * Per-debt budget baseline for the selected month. Current and future
   * months floor each active debt at its minimum payment; past months count
   * only what was actually paid. See `buildDebtPaymentPlanForMonth`.
   */
  const debtPaymentPlanForMonth = useMemo(
    () =>
      buildDebtPaymentPlanForMonth(
        debts,
        recordedDebtPaymentsForMonth,
        selectedMonthKey,
        getMonthKey(new Date())
      ),
    [debts, recordedDebtPaymentsForMonth, selectedMonthKey]
  );

  const debtPaymentsTotal = useMemo(
    () => debtPaymentPlanForMonth.reduce((sum, line) => sum + line.amount, 0),
    [debtPaymentPlanForMonth]
  );

  /** Portion of Debt Payments that is planned minimums, not yet logged as paid. */
  const plannedDebtMinimumTotal = useMemo(
    () =>
      debtPaymentPlanForMonth.reduce(
        (sum, line) => sum + Math.max(0, line.amount - line.paid),
        0
      ),
    [debtPaymentPlanForMonth]
  );

  const monthlyExpenses = useMemo(
    () => {
      const manualExpenses = monthlyEntries
        .filter((entry) => entry.type === "expense")
        .reduce((sum, entry) => sum + entry.amount, 0);

      return manualExpenses + debtPaymentsTotal;
    },
    [debtPaymentsTotal, monthlyEntries]
  );

  const monthlyNet = monthlyIncome - monthlyExpenses;

  /**
   * Reconciliation for the Cash Flow card: how the selected month's entered
   * starting balance compares against last month's projected end. Needs
   * both months' records plus last month's net, computed with the exact
   * same building blocks as the on-screen totals (recurring entries via
   * isEntryActiveInMonth + the debt payment plan) so plan and projection
   * can never disagree.
   */
  const cashFlowReconciliationDelta = useMemo(
    () =>
      computeMonthReconciliationDelta({
        monthKey: selectedMonthKey,
        monthBalances,
        entries,
        debts,
        payments,
        currentMonthKey: getMonthKey(new Date()),
      }),
    [monthBalances, selectedMonthKey, entries, debts, payments]
  );

  const savingsReserve = useMemo(() => sumSavingsReserve(entries), [entries]);

  // Savings accounts designated as the emergency fund (Bridge account
  // editor). When any exist the EF value is their combined balance and
  // manual contributions are disabled. Goal resolution itself lives in
  // utils/emergencyFund.resolveEmergencyFundGoal, shared with BridgeScreen.
  const efSource = useMemo(() => getEmergencyFundSource(assetAccounts), [assetAccounts]);

  const emergencyFundGoal = useMemo(
    () =>
      resolveEmergencyFundGoal({ savingsGoals, assetAccounts, keelTarget, savingsReserve }),
    [assetAccounts, savingsGoals, keelTarget, savingsReserve],
  );

  const limitByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    limits.forEach((limit) => {
      map[limit.category] = limit.monthlyLimit;
    });
    return map;
  }, [limits]);

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};

    monthlyEntries
      .filter((entry) => entry.type === "expense")
      .forEach((entry) => {
        map[entry.category] = (map[entry.category] ?? 0) + entry.amount;
      });

    if (debtPaymentsTotal > 0) {
      map["Debt Payments"] = (map["Debt Payments"] ?? 0) + debtPaymentsTotal;
    }

    return map;
  }, [debtPaymentsTotal, monthlyEntries]);

  /** Whether the selected month has any business-tagged expense - gates the
   *  Spending card's "Business only" chip. */
  const hasBusinessSpending = useMemo(
    () =>
      monthlyEntries.some(
        (entry) => entry.type === "expense" && entry.businessId
      ),
    [monthlyEntries]
  );

  /**
   * Category totals feeding the Spending card. With the "Business only"
   * chip active, only business-tagged expenses count and the synthetic
   * Debt Payments rollup is left out (debt minimums aren't business
   * spending). The unfiltered `expensesByCategory` still drives the bucket
   * card and monthly totals - the chip deliberately scopes to the Spending
   * card so personal budget math never silently changes underneath it.
   */
  const spendingByCategory = useMemo(() => {
    if (!businessOnly) return expensesByCategory;
    const map: Record<string, number> = {};
    monthlyEntries
      .filter((entry) => entry.type === "expense" && entry.businessId)
      .forEach((entry) => {
        map[entry.category] = (map[entry.category] ?? 0) + entry.amount;
      });
    return map;
  }, [businessOnly, expensesByCategory, monthlyEntries]);

  // Override > built-in/custom default, then the per-bucket lists the
  // bucket card renders. See utils/categoryBucketResolve.
  const { bucketByCategory, categoriesByBucket } = useMemo(
    () =>
      resolveCategoryBuckets({
        expensesByCategory,
        bucketOverrides,
        customCategories,
      }),
    [bucketOverrides, customCategories, expensesByCategory]
  );

  const bucketTotals = useMemo(
    () => totalsByBucket(expensesByCategory, bucketByCategory),
    [bucketByCategory, expensesByCategory]
  );


  const incomeEntries = useMemo(
    () =>
      monthlyEntries
        .filter((e) => e.type === "income")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [monthlyEntries]
  );

  // W-2 / 1099 rollup for the selected month: 401(k) dollars withheld from
  // paychecks (not part of income totals) and the tax set-aside owed on
  // 1099 income. monthlyEntries is already recurring-aware.
  const paycheckSummary = useMemo(
    () => summarizePaychecks(monthlyEntries),
    [monthlyEntries]
  );

  const expenseRows = useMemo<ExpenseCategoryRow[]>(
    () =>
      buildExpenseCategoryRows({
        monthlyEntries,
        customCategoryNames,
        spendingByCategory,
        limitByCategory,
        businessOnly,
        debtPaymentPlanForMonth,
        recordedDebtPaymentsForMonth,
        selectedMonthDate,
        entriesById,
      }),
    [
      businessOnly,
      customCategoryNames,
      debtPaymentPlanForMonth,
      entriesById,
      limitByCategory,
      monthlyEntries,
      recordedDebtPaymentsForMonth,
      selectedMonthDate,
      spendingByCategory,
    ]
  );

  // Day-weighted pace for the viewed month (null unless it's the current
  // one). Read once per month switch; a screen left open across midnight
  // catches up on the next focus/reload like the rest of the tab.
  const pacingClock = useMemo(
    () => pacingClockFor(selectedMonthKey, new Date()),
    [selectedMonthKey]
  );
  const paceAlerts = useMemo(
    () => (businessOnly ? [] : buildPaceAlerts(expenseRows, pacingClock)),
    [businessOnly, expenseRows, pacingClock]
  );

  const categoryChartColors = useMemo(() => {
    const palette = [
      colors.accent,
      colors.teal,
      colors.success,
      colors.warning,
      colors.danger,
      ...CATEGORY_CHART_PALETTE,
    ];

    return BUDGET_CATEGORIES.reduce<Record<BudgetCategory, string>>((map, category, index) => {
      map[category] = palette[index % palette.length];
      return map;
    }, {} as Record<BudgetCategory, string>);
  }, [colors]);

  /**
   * Built-in categories get their fixed index-based color; custom ones get a
   * deterministic slot from the static palette (name-hashed) so the donut
   * color stays stable across renders and launches.
   */
  const colorForCategory = useCallback(
    (category: CategoryName): string => {
      const builtIn = (categoryChartColors as Record<string, string | undefined>)[
        category
      ];
      if (builtIn) return builtIn;
      return CATEGORY_CHART_PALETTE[
        categoryNameHash(category) % CATEGORY_CHART_PALETTE.length
      ];
    },
    [categoryChartColors]
  );

  /**
   * Every entry mutation below goes through a storage-level
   * read-modify-write (`addBudgetEntries`, `updateBudgetEntry`, ...) and
   * then adopts the live array storage hands back - never
   * `save*(stateArray)`. Partner sync and bank auto-approvals write
   * entries while this tab is mounted; saving this screen's snapshot
   * over them silently hard-deleted their records (and the partner never
   * re-sent them). Same rule for linked-account balances:
   * `adjustAssetAccountBalances` nets the deltas onto the stored accounts.
   */
  const applyAssetDeltas = useCallback(async (deltas: BalanceDelta[]) => {
    if (deltas.length === 0) return;
    setAssetAccounts(await adjustAssetAccountBalances(deltas));
  }, []);

  const handleAddEntry = useCallback(async (inputs: NewBudgetEntryInput[]) => {
    if (inputs.length === 0) return;

    const now = new Date().toISOString();
    const monthKey = now.slice(0, 7);
    const newEntries: BudgetEntry[] = inputs.map((input) => ({
      ...input,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
      lastAppliedMonth: input.linkedAccountId ? monthKey : undefined,
    }));

    const deltas: BalanceDelta[] = newEntries
      .filter((entry) => entry.linkedAccountId)
      .map((entry) => ({
        accountId: entry.linkedAccountId as string,
        amount: entry.amount,
      }));

    // Entries first, then balances - same order the recurring-apply shell
    // relies on, so a crash between the two can't double-credit.
    const nextEntries = await addBudgetEntries(newEntries);
    setEntries(nextEntries);
    await applyAssetDeltas(deltas);
    await Promise.all([
      refreshNetWorthSnapshots(),
      refreshMonthlyReview(nextEntries),
    ]);
    setShowAddModal(false);
    setQuickAddCategory(undefined);
    setLogActualBill(undefined);
    triggerHaptic("success");
    void notifyAchievementCheck();
  }, [applyAssetDeltas, notifyAchievementCheck, refreshMonthlyReview, refreshNetWorthSnapshots]);

  /**
   * Reload entries after Review Inbox approvals - they're written by
   * reviewInboxService (entry -> ledger -> inbox order), not through this
   * screen's local state, so re-read storage and refresh the derived views.
   */
  const reloadAfterInboxChange = useCallback(async () => {
    const storedEntries = await getBudgetEntries();
    setEntries(storedEntries);
    await Promise.all([
      refreshNetWorthSnapshots(),
      refreshMonthlyReview(storedEntries),
    ]);
    void notifyAchievementCheck();
  }, [notifyAchievementCheck, refreshMonthlyReview, refreshNetWorthSnapshots]);

  // Profile's "Review Inbox" row navigates here with openInbox set. Deferred
  // past the tab-switch transition: presenting a Modal mid-navigation is the
  // iOS silent-present failure this codebase keeps hitting, and it also keeps
  // the setState out of the effect's synchronous body.
  useEffect(() => {
    if (!route.params?.openInbox) return;
    const task = InteractionManager.runAfterInteractions(() => {
      setShowReviewInbox(true);
      navigation.setParams({ openInbox: undefined });
    });
    return () => task.cancel();
  }, [navigation, route.params?.openInbox]);

  // The Quick Entry home-screen widget deep-links here with quickAdd set
  // (via QuickAddLinkHost). Same deferral rationale as openInbox above.
  useEffect(() => {
    const quickAdd = route.params?.quickAdd;
    if (!quickAdd) return;
    const task = InteractionManager.runAfterInteractions(() => {
      setQuickAddCategory(quickAdd.category);
      setShowAddModal(true);
      navigation.setParams({ quickAdd: undefined });
    });
    return () => task.cancel();
  }, [navigation, route.params?.quickAdd]);

  // Once-per-calendar-month starting-balance nudge. Fires only when the tab
  // is settled on the current month, the month has no recorded balance yet,
  // and the prompt hasn't already fired this month (marker stamped when
  // shown, so "Not now" never re-nags until next month). Deferred past
  // interactions like every other modal here, and skipped entirely when a
  // deep-link param is about to present a different modal - stacking two
  // Modal presents in one transition is the iOS silent-present failure.
  useFocusEffect(
    useCallback(() => {
      if (!isLoaded) return;
      if (
        route.params?.quickAdd ||
        route.params?.openInbox ||
        route.params?.searchEntryId
      ) {
        return;
      }
      const currentKey = getMonthKey(new Date());
      if (selectedMonthKey !== currentKey) return;
      if (monthBalances[currentKey]) return;
      let cancelled = false;
      let task: ReturnType<typeof InteractionManager.runAfterInteractions> | null =
        null;
      getLastBalancePromptMonth().then((lastPrompted) => {
        if (cancelled || lastPrompted === currentKey) return;
        task = InteractionManager.runAfterInteractions(() => {
          void setLastBalancePromptMonth(currentKey);
          setBalanceModalIsPrompt(true);
          setShowBalanceModal(true);
        });
      });
      return () => {
        cancelled = true;
        task?.cancel();
      };
    }, [
      isLoaded,
      monthBalances,
      selectedMonthKey,
      route.params?.quickAdd,
      route.params?.openInbox,
      route.params?.searchEntryId,
    ])
  );

  // A budget-entry result tap in another tab's search sheet navigates here
  // with searchEntryId set - open that entry's edit sheet. Same deferral
  // rationale as openInbox above. Waits for isLoaded so a first-ever visit
  // to this tab doesn't drop the param before entries exist; a genuinely
  // missing id (entry deleted meanwhile) just clears the param.
  useEffect(() => {
    const searchEntryId = route.params?.searchEntryId;
    if (!searchEntryId || !isLoaded) return;
    const task = InteractionManager.runAfterInteractions(() => {
      const found = entries.find((entry) => entry.id === searchEntryId) ?? null;
      if (found) setEditingEntry(found);
      navigation.setParams({ searchEntryId: undefined });
    });
    return () => task.cancel();
  }, [entries, isLoaded, navigation, route.params?.searchEntryId]);

  /** Open the global search sheet, stamping its date-preset reference. */
  const openSearch = useCallback(() => {
    triggerHaptic("selection");
    setSearchNow(new Date());
    setShowSearch(true);
  }, []);

  const handleEditEntry = useCallback((entryId: string) => {
    const found = entries.find((e) => e.id === entryId) ?? null;
    setEditingEntry(found);
  }, [entries]);

  // "Log actual" on a projected bill row: open the add sheet prefilled as
  // the real charge for that bill in the selected month. A direct user tap,
  // not a navigation-triggered present, so no InteractionManager deferral.
  const handleLogActual = useCallback((entryId: string) => {
    const bill = entries.find((e) => e.id === entryId);
    if (!bill) return;
    setLogActualBill({ bill, yearMonth: selectedMonthKey });
    setShowAddModal(true);
  }, [entries, selectedMonthKey]);

  const handleSaveEntry = useCallback(async (updated: BudgetEntry) => {
    const original = entries.find((e) => e.id === updated.id);
    if (!original) {
      setEditingEntry(null);
      return;
    }

    const deltas: BalanceDelta[] = [];
    if (original.linkedAccountId) {
      deltas.push({ accountId: original.linkedAccountId, amount: -original.amount });
    }
    if (updated.linkedAccountId) {
      deltas.push({ accountId: updated.linkedAccountId, amount: updated.amount });
    }

    // Whole-record patch: the edit sheet hands back the full entry, and
    // `updateBudgetEntry` re-stamps updatedAt for LWW.
    const nextEntries = await updateBudgetEntry(updated.id, updated);
    setEntries(nextEntries);
    await applyAssetDeltas(deltas);
    await Promise.all([
      refreshNetWorthSnapshots(),
      refreshMonthlyReview(nextEntries),
    ]);
    setEditingEntry(null);
    triggerHaptic("success");
    void notifyAchievementCheck();
    // Inverse of the linked-account deltas this edit applied, so undo
    // also unwinds any asset-balance side effect.
    const inverseDeltas = deltas.map((d) => ({ ...d, amount: -d.amount }));
    pushUndo({
      message: `Edited "${original.description || original.category}"`,
      onUndo: async () => {
        const reverted = await updateBudgetEntry(updated.id, original);
        setEntries(reverted);
        await applyAssetDeltas(inverseDeltas);
        await Promise.all([
          refreshNetWorthSnapshots(),
          refreshMonthlyReview(reverted),
        ]);
        void notifyAchievementCheck();
      },
    });
  }, [applyAssetDeltas, entries, notifyAchievementCheck, pushUndo, refreshMonthlyReview, refreshNetWorthSnapshots]);

  const handleDeleteEntry = useCallback(async (id: string) => {
    const target = entries.find((entry) => entry.id === id);

    // Soft-delete the entry so a paired partner removes its copy on next
    // sync. `deleteBudgetEntry` returns only live entries, which is what
    // the screen renders.
    const nextEntries = await deleteBudgetEntry(id);
    setEntries(nextEntries);
    if (target?.linkedAccountId) {
      await applyAssetDeltas([
        { accountId: target.linkedAccountId, amount: -target.amount },
      ]);
    }
    await Promise.all([
      refreshNetWorthSnapshots(),
      refreshMonthlyReview(nextEntries),
    ]);
    setEditingEntry(null);
    triggerHaptic("warning");
    pushUndo({
      message: target
        ? `Deleted "${target.description || target.category}"`
        : "Deleted entry",
      onUndo: async () => {
        const restored = await restoreBudgetEntry(id);
        setEntries(restored);
        // The delete pulled `target.amount` out of its linked asset;
        // putting the entry back must add it again.
        if (target?.linkedAccountId) {
          await applyAssetDeltas([
            { accountId: target.linkedAccountId, amount: target.amount },
          ]);
        }
        await Promise.all([
          refreshNetWorthSnapshots(),
          refreshMonthlyReview(restored),
        ]);
        void notifyAchievementCheck();
      },
    });
  }, [applyAssetDeltas, entries, notifyAchievementCheck, pushUndo, refreshMonthlyReview, refreshNetWorthSnapshots]);

  /* ─── Bulk multi-select ─── */

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedEntryIds(new Set());
  }, []);

  const toggleSelectEntry = useCallback(
    (id: string) => {
      if (isAutoEntryId(id)) return;
      setSelectedEntryIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    []
  );

  const toggleBusinessOnly = useCallback(() => {
    setBusinessOnly((prev) => !prev);
  }, []);

  const openFoodSplitModal = useCallback(() => {
    setShowFoodSplitModal(true);
  }, []);

  const enterSelectionWith = useCallback(
    (id: string) => {
      if (isAutoEntryId(id)) return;
      setSelectionMode(true);
      setSelectedEntryIds(new Set([id]));
    },
    []
  );

  // Same category set the Add/Edit pickers offer, plus the user's customs.
  const bulkCategoryOptions = useMemo<CategoryName[]>(() => {
    const expenseBuiltins = BUDGET_CATEGORIES.filter(
      (c) => c !== "Freelance" && c !== "Debt Payments" && c !== "Food"
    ) as CategoryName[];
    return [...expenseBuiltins, ...customCategories.map((c) => c.name)];
  }, [customCategories]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedEntryIds).filter((id) => !isAutoEntryId(id));
    if (ids.length === 0) {
      exitSelection();
      return;
    }
    const targets = entries.filter((e) => ids.includes(e.id));
    // Net the linked-account effect of every deleted entry in one pass so
    // the asset balances stay correct (and undo can mirror it).
    const deltas = targets
      .filter((e) => e.linkedAccountId)
      .map((e) => ({ accountId: e.linkedAccountId as string, amount: -e.amount }));

    const nextEntries = await deleteBudgetEntries(ids);
    setEntries(nextEntries);
    await applyAssetDeltas(deltas);
    await Promise.all([
      refreshNetWorthSnapshots(),
      refreshMonthlyReview(nextEntries),
    ]);
    exitSelection();
    triggerHaptic("warning");
    const inverse = deltas.map((d) => ({ ...d, amount: -d.amount }));
    pushUndo({
      message: `Deleted ${ids.length} ${ids.length === 1 ? "entry" : "entries"}`,
      onUndo: async () => {
        const restored = await restoreBudgetEntries(ids);
        setEntries(restored);
        await applyAssetDeltas(inverse);
        await Promise.all([
          refreshNetWorthSnapshots(),
          refreshMonthlyReview(restored),
        ]);
        void notifyAchievementCheck();
      },
    });
  }, [applyAssetDeltas, entries, exitSelection, notifyAchievementCheck, pushUndo, refreshMonthlyReview, refreshNetWorthSnapshots, selectedEntryIds]);

  const handleBulkRecategorize = useCallback(
    async (category: CategoryName) => {
      const ids = Array.from(selectedEntryIds).filter((id) => !isAutoEntryId(id));
      if (ids.length === 0) {
        setShowBulkCategoryPicker(false);
        exitSelection();
        return;
      }
      // Capture each entry's prior category so undo restores them exactly
      // (a mixed selection can't be reverted to one shared category).
      const priorById: Record<string, CategoryName> = {};
      const nextById: Record<string, CategoryName> = {};
      for (const e of entries) {
        if (ids.includes(e.id)) {
          priorById[e.id] = e.category;
          nextById[e.id] = category;
        }
      }
      const nextEntries = await setBudgetEntryCategories(nextById);
      setEntries(nextEntries);
      await refreshMonthlyReview(nextEntries);
      setShowBulkCategoryPicker(false);
      exitSelection();
      triggerHaptic("success");
      void notifyAchievementCheck();
      pushUndo({
        message: `Moved ${ids.length} ${ids.length === 1 ? "entry" : "entries"} to ${category}`,
        onUndo: async () => {
          const reverted = await setBudgetEntryCategories(priorById);
          setEntries(reverted);
          await refreshMonthlyReview(reverted);
          void notifyAchievementCheck();
        },
      });
    },
    [entries, exitSelection, notifyAchievementCheck, pushUndo, refreshMonthlyReview, selectedEntryIds]
  );

  const foodEntriesToSplit = useMemo(
    () => entries.filter((entry) => entry.type === "expense" && entry.category === "Food"),
    [entries]
  );

  const applyFoodSplit = useCallback(
    async (draft: Record<string, FoodSplitCategory>) => {
      // Only the entries the draft actually maps; `setBudgetEntryCategories`
      // stamps updatedAt on those and leaves everything else (including
      // records synced in behind this screen) untouched.
      const categoryById: Record<string, FoodSplitCategory> = {};
      for (const entry of entries) {
        if (entry.type !== "expense" || entry.category !== "Food") continue;
        const mapped = draft[entry.id];
        if (mapped) categoryById[entry.id] = mapped;
      }
      if (Object.keys(categoryById).length > 0) {
        const nextEntries = await setBudgetEntryCategories(categoryById);
        setEntries(nextEntries);
        await refreshMonthlyReview(nextEntries);
      }
      setShowFoodSplitModal(false);
    },
    [entries, refreshMonthlyReview]
  );

  const openLimitModal = useCallback(
    (category: CategoryName) => {
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

    // Stamp the edit so paired-device sync can resolve last-write-wins per
    // category. Untouched limits keep their existing updatedAt.
    const now = new Date().toISOString();
    const updatedLimits =
      Number.isNaN(parsedLimit) || parsedLimit <= 0
        ? withoutCategory
        : [
            ...withoutCategory,
            { category: limitModalCategory, monthlyLimit: parsedLimit, updatedAt: now },
          ];

    setLimits(updatedLimits);
    await saveCategoryBudgetLimits(updatedLimits, selectedMonthKey);
    await refreshMonthlyReview(entries);
    closeLimitModal();
  }, [closeLimitModal, entries, limitInput, limitModalCategory, limits, refreshMonthlyReview, selectedMonthKey]);

  const openBucketOverrideModal = useCallback((category: string) => {
    setBucketOverrideCategory(category);
  }, []);

  const closeBucketOverrideModal = useCallback(() => {
    setBucketOverrideCategory(null);
  }, []);

  const saveBucketOverride = useCallback(
    async (bucket: BudgetBucket) => {
      if (!bucketOverrideCategory) return;
      const defaultBucket =
        getDefaultBucketForCategory(bucketOverrideCategory, customCategories) ??
        DEFAULT_CUSTOM_CATEGORY_BUCKET;

      const nextOverrides =
        bucket === defaultBucket
          ? await removeCategoryBucketOverride(bucketOverrideCategory)
          : await setCategoryBucketOverride(bucketOverrideCategory, bucket);

      setBucketOverrides(nextOverrides);
      closeBucketOverrideModal();
    },
    [bucketOverrideCategory, closeBucketOverrideModal, customCategories]
  );

  const openReviewModal = useCallback(async () => {
    const data = reviewPreviewData ?? (await refreshMonthlyReview(entries));
    setReviewData(data);
    setShowReviewModal(true);
    await recordMonthlyReviewOpen();
    void notifyAchievementCheck();
  }, [entries, refreshMonthlyReview, reviewPreviewData, notifyAchievementCheck]);

  const handleEfContribution = useCallback(async () => {
    // Linked mode (EF-designated savings accounts): the goal's stored amount
    // is ignored, so a manual contribution would silently vanish - refuse it.
    if (efSource.linked) {
      setShowEfContribModal(false);
      setEfContribAmount("");
      return;
    }
    // Shared pure update (utils/savingsGoals) - BridgeScreen runs the same
    // logic; only the refresh side effects below differ per screen.
    const updatedGoals = applyEmergencyFundContribution(
      savingsGoals,
      parseFloat(efContribAmount),
      keelTarget
    );
    if (!updatedGoals) return;

    setSavingsGoals(updatedGoals);
    await saveSavingsGoals(updatedGoals);
    await refreshNetWorthSnapshots();
    setShowEfContribModal(false);
    setEfContribAmount("");
    void notifyAchievementCheck();
  }, [efContribAmount, efSource.linked, keelTarget, notifyAchievementCheck, refreshNetWorthSnapshots, savingsGoals]);

  const bucketOverrideDefault = bucketOverrideCategory
    ? getDefaultBucketForCategory(bucketOverrideCategory, customCategories) ??
      DEFAULT_CUSTOM_CATEGORY_BUCKET
    : null;
  const bucketOverrideCurrent = bucketOverrideCategory
    ? bucketByCategory[bucketOverrideCategory] ?? bucketOverrideDefault
    : null;

  const listHeader = (
    <View>
      <View style={styles.titleSection}>
        <Text style={styles.appLabel}>BudgetArk</Text>
        <Text style={styles.screenTitle}>Budget</Text>
        <Text style={styles.screenSubtitle}>Track income, expenses, and category limits.</Text>
        <TouchableOpacity
          style={styles.calendarIconBtn}
          onPress={() => setShowBillCalendar(true)}
          activeOpacity={0.7}
          accessibilityLabel="Bill calendar"
        >
          <Text style={styles.calendarIconGlyph}>📅</Text>
        </TouchableOpacity>
        {/* Search sits at the left edge, or beside the inbox icon when
            bank connections put that in the corner. */}
        <TouchableOpacity
          style={[
            styles.searchIconBtn,
            (connections.length > 0 || pendingCount > 0) && styles.searchIconBtnShifted,
          ]}
          onPress={openSearch}
          activeOpacity={0.7}
          accessibilityLabel="Search debts, payments, and budget entries"
        >
          <Text style={styles.calendarIconGlyph}>🔍</Text>
        </TouchableOpacity>
        {connections.length > 0 || pendingCount > 0 ? (
          <TouchableOpacity
            style={styles.inboxIconBtn}
            onPress={() => setShowReviewInbox(true)}
            activeOpacity={0.7}
            accessibilityLabel={`Review inbox, ${pendingCount} waiting`}
          >
            <Text style={styles.calendarIconGlyph}>📥</Text>
            {pendingCount > 0 ? (
              <View style={styles.inboxBadge}>
                <Text style={styles.inboxBadgeText}>
                  {pendingCount > 99 ? "99+" : pendingCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.monthPillRow}>
      <View style={styles.monthPill}>
        <TouchableOpacity
          style={styles.monthPillArrowBtn}
          onPress={() => {
            if (selectedMonthIndex < monthKeys.length - 1) {
              setSelectedMonthKey(monthKeys[selectedMonthIndex + 1]);
            }
          }}
          disabled={selectedMonthIndex >= monthKeys.length - 1}
          accessibilityLabel="Previous month"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
        >
          <Text
            style={[
              styles.monthPillArrow,
              selectedMonthIndex >= monthKeys.length - 1 && styles.monthPillArrowDisabled,
            ]}
          >
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.monthPillLabel}>{formatMonthKeyLabel(selectedMonthKey)}</Text>

        <TouchableOpacity
          style={styles.monthPillArrowBtn}
          onPress={() => {
            if (selectedMonthIndex > 0) {
              setSelectedMonthKey(monthKeys[selectedMonthIndex - 1]);
            }
          }}
          disabled={selectedMonthIndex <= 0}
          accessibilityLabel="Next month"
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
        >
          <Text
            style={[
              styles.monthPillArrow,
              selectedMonthIndex <= 0 && styles.monthPillArrowDisabled,
            ]}
          >
            ›
          </Text>
        </TouchableOpacity>
      </View>
      </View>

      {/* Insights button - opens the monthly review/insights modal */}
      <TouchableOpacity
        style={styles.reviewBtn}
        onPress={openReviewModal}
        activeOpacity={0.7}
      >
        <Text style={styles.reviewBtnText}>Insights</Text>
        <Text style={styles.reviewBtnHint}>Trends, changes, streaks, comparisons</Text>
      </TouchableOpacity>

      <View ref={anchorBudgetSummary} collapsable={false} style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Income</Text>
            <Text style={[styles.summaryStatValue, { color: colors.success }]}>
              {formatCurrency(monthlyIncome)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Spent</Text>
            <Text style={[styles.summaryStatValue, { color: colors.warning }]}>
              {formatCurrency(monthlyExpenses)}
            </Text>
          </View>
          <View style={styles.statDivider} />
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
        {plannedDebtMinimumTotal > 0 && (
          <Text style={styles.autoDebtHint}>
            Includes {formatCurrency(plannedDebtMinimumTotal)} planned debt minimums from the Debts tab
          </Text>
        )}
        {incomeEntries.length > 0 && (
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
                  {entry.incomeType && (
                    <Text style={[styles.incomeSummaryTag, { color: colors.textDim }]}>
                      {entry.incomeType === "w2" ? "W-2" : "1099"}
                    </Text>
                  )}
                  {entry.recurring && (
                    <Text style={[styles.incomeSummaryTag, { color: colors.accent }]}>
                      {getRecurrenceTag(entry)}
                    </Text>
                  )}
                  <Text style={[styles.incomeSummaryAmount, { color: colors.success }]}>
                    {formatCurrency(entry.amount)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {paycheckSummary.retirementContribution > 0 && (
          <Text style={styles.autoDebtHint}>
            Plus {formatCurrency(paycheckSummary.retirementContribution)} into your
            401(k) this month (not counted as income)
          </Text>
        )}
        {paycheckSummary.taxSetAside > 0 && (
          <Text style={[styles.autoDebtHint, { color: colors.warning }]}>
            Set aside {formatCurrency(paycheckSummary.taxSetAside)} of this
            month's 1099 income for taxes
          </Text>
        )}
      </View>

      <CashFlowCard
        record={monthBalances[selectedMonthKey] ?? null}
        monthlyIncome={monthlyIncome}
        monthlyExpenses={monthlyExpenses}
        reconciliationDelta={cashFlowReconciliationDelta}
        isCurrentMonth={selectedMonthKey === getMonthKey(new Date())}
        onSetBalance={() => {
          setBalanceModalIsPrompt(false);
          setShowBalanceModal(true);
        }}
      />

      <DueDateReminderBanner
        entries={entries}
        onOpen={() => setShowBillCalendar(true)}
        style={styles.reminderBanner}
      />

      <DebtDueReminderBanner
        debts={debts}
        payments={payments}
        dismissals={dueDismissals}
        onOpen={() => navigation.navigate("DebtTracker")}
        daysAhead={7}
        style={styles.reminderBanner}
      />

      {pacingClock && paceAlerts.length > 0 && (
        <SpendingPaceBanner
          alerts={paceAlerts}
          dayOfMonth={pacingClock.dayOfMonth}
          onOpen={(category) =>
            setPaceExpandRequest((prev) => ({
              category,
              nonce: (prev?.nonce ?? 0) + 1,
            }))
          }
          style={styles.reminderBanner}
        />
      )}

      <SpendingCard
        anchorRef={anchorBudgetSpending}
        rows={expenseRows}
        monthlyExpenses={monthlyExpenses}
        hasBusinessSpending={hasBusinessSpending}
        businessOnly={businessOnly}
        onToggleBusinessOnly={toggleBusinessOnly}
        colorForCategory={colorForCategory}
        foodSplitCount={foodEntriesToSplit.length}
        onSplitFood={openFoodSplitModal}
        onLongPressCategory={openLimitModal}
        selectionMode={selectionMode}
        selectedEntryIds={selectedEntryIds}
        onToggleSelect={toggleSelectEntry}
        onEnterSelection={enterSelectionWith}
        onEditEntry={handleEditEntry}
        onLogActual={handleLogActual}
        pacingClock={pacingClock}
        expandCategoryRequest={paceExpandRequest}
      />

      <BudgetBucketCard
        takeHomeIncome={monthlyIncome}
        bucketTotals={bucketTotals}
        categoriesByBucket={categoriesByBucket}
        formatCurrency={formatCurrency}
        onLongPressCategory={openBucketOverrideModal}
      />
    </View>
  );

  return (
    <View
      style={[
        styles.screen,
        showAmbientBackground && styles.screenTransparent,
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {isLoaded && (
        <FlatList
          ref={listRef}
          data={[]}
          renderItem={null}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Phantom anchor for the coachmark spotlight. Rendered unconditionally
          at the FAB's exact layout position (same styles, just invisible and
          non-interactive) so the spotlight's measureInWindow returns the real
          on-screen rect regardless of platform inset quirks. Stays mounted
          during selection mode too, in case the walkthrough opens then. */}
      <View
        ref={anchorBudgetFab}
        collapsable={false}
        pointerEvents="none"
        style={[
          styles.fab,
          { bottom: fabBottomOffset(insets.bottom), opacity: 0 },
        ]}
      />

      {/* FAB - Add Income / Expense. Hidden during multi-select so it
          doesn't overlap the selection action bar. */}
      {!selectionMode && (
        <TouchableOpacity
          style={[styles.fab, { bottom: fabBottomOffset(insets.bottom) }]}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Bulk selection action bar - sits where the FAB was, clear of the
          tab bar. Mutually exclusive in time with the Undo snackbar. */}
      {selectionMode && (
        <View
          style={[
            styles.bulkBar,
            { bottom: fabBottomOffset(insets.bottom) },
          ]}
        >
          <TouchableOpacity
            onPress={exitSelection}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Cancel selection"
          >
            <Text style={[styles.bulkBarCancel, { color: colors.textMuted }]}>
              ✕
            </Text>
          </TouchableOpacity>
          <Text style={[styles.bulkBarCount, { color: colors.text }]}>
            {selectedEntryIds.size} selected
          </Text>
          <View style={styles.bulkBarActions}>
            <TouchableOpacity
              disabled={selectedEntryIds.size === 0}
              onPress={() => setShowBulkCategoryPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Recategorize selected entries"
            >
              <Text
                style={[
                  styles.bulkBarAction,
                  {
                    color:
                      selectedEntryIds.size === 0
                        ? colors.textMuted
                        : colors.accent,
                  },
                ]}
              >
                Recategorize
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={selectedEntryIds.size === 0}
              onPress={handleBulkDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete selected entries"
            >
              <Text
                style={[
                  styles.bulkBarAction,
                  {
                    color:
                      selectedEntryIds.size === 0
                        ? colors.textMuted
                        : colors.danger,
                  },
                ]}
              >
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={showBulkCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBulkCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.bulkPickerOverlay}
          activeOpacity={1}
          onPress={() => setShowBulkCategoryPicker(false)}
        >
          <View
            style={[
              styles.bulkPickerCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                borderRadius: tokens.radius,
              },
            ]}
          >
            <Text style={[styles.bulkPickerTitle, { color: colors.text }]}>
              Move {selectedEntryIds.size}{" "}
              {selectedEntryIds.size === 1 ? "entry" : "entries"} to…
            </Text>
            <ScrollView style={styles.bulkPickerList}>
              {bulkCategoryOptions.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.bulkPickerRow,
                    { borderTopColor: colors.cardBorder },
                  ]}
                  onPress={() => handleBulkRecategorize(cat)}
                >
                  <Text style={[styles.bulkPickerRowText, { color: colors.text }]}>
                    {getCategoryIcon(cat, customCategories)} {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={bucketOverrideCategory != null}
        transparent
        animationType="fade"
        onRequestClose={closeBucketOverrideModal}
      >
        <View style={styles.limitOverlay}>
          <View style={styles.limitModalCard}>
            <Text style={styles.limitModalTitle}>Reassign Bucket</Text>
            <Text style={styles.limitModalSub}>
              {bucketOverrideCategory}
              {bucketOverrideCurrent
                ? ` - currently ${BUDGET_BUCKET_LABELS[bucketOverrideCurrent]}`
                : ""}
            </Text>

            <View style={styles.bucketAssignRow}>
              {BUDGET_BUCKET_ORDER.map((bucket) => {
                const selected = bucketOverrideCurrent === bucket;
                return (
                  <TouchableOpacity
                    key={bucket}
                    style={[
                      styles.bucketAssignChip,
                      {
                        borderColor: selected ? colors.accent : colors.cardBorder,
                        backgroundColor: selected ? `${colors.accent}20` : colors.bg,
                      },
                    ]}
                    onPress={() => saveBucketOverride(bucket)}
                  >
                    <Text
                      style={[
                        styles.bucketAssignText,
                        { color: selected ? colors.accent : colors.textDim },
                      ]}
                    >
                      {BUDGET_BUCKET_LABELS[bucket]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {bucketOverrideDefault && (
              <TouchableOpacity
                style={styles.limitCancelBtn}
                onPress={() => saveBucketOverride(bucketOverrideDefault)}
              >
                <Text style={styles.limitCancelText}>
                  Use default ({BUDGET_BUCKET_LABELS[bucketOverrideDefault]})
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.limitActions}>
              <TouchableOpacity
                style={styles.limitCancelBtn}
                onPress={closeBucketOverrideModal}
              >
                <Text style={styles.limitCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BudgetEntryModal
        mode="add"
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setQuickAddCategory(undefined);
          setLogActualBill(undefined);
        }}
        onAdd={handleAddEntry}
        initialCategory={quickAddCategory}
        initialBill={logActualBill}
        entries={entries}
        assetAccounts={assetAccounts}
        customCategories={customCategories}
        businesses={businesses}
        people={people}
      />

      <BudgetEntryModal
        mode="edit"
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
        entries={entries}
        assetAccounts={assetAccounts}
        customCategories={customCategories}
        businesses={businesses}
        people={people}
      />

      <ReviewInboxModal
        visible={showReviewInbox}
        onClose={() => setShowReviewInbox(false)}
        customCategories={customCategories}
        businesses={businesses}
        people={people}
        entries={entries}
        onChanged={reloadAfterInboxChange}
      />

      {showBalanceModal && (
        <MonthBalancePromptModal
          monthKey={selectedMonthKey}
          isPrompt={balanceModalIsPrompt}
          existingBalance={monthBalances[selectedMonthKey]?.balance ?? null}
          onSaved={(balances, accounts) => {
            setMonthBalances(balances);
            if (accounts) {
              setAssetAccounts(accounts);
              // The checking balance moved - recapture today's net-worth
              // snapshot so the Bridge/history reflect it without waiting
              // for the next focus.
              void refreshNetWorthSnapshots();
            }
            setShowBalanceModal(false);
          }}
          onClose={() => setShowBalanceModal(false)}
        />
      )}

      <MonthlyReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        data={reviewData}
      />

      {showSearch && searchNow !== null && (
        <GlobalSearchModal
          onClose={() => setShowSearch(false)}
          debts={debts}
          payments={payments}
          entries={entries}
          now={searchNow}
          onSelectEntry={(entry) => {
            // Wait for the search sheet's dismiss animation before
            // presenting the edit sheet - iOS doesn't reliably handle
            // dismiss-then-present in the same frame.
            setShowSearch(false);
            presentAfterDismiss(() => setEditingEntry(entry));
          }}
          onSelectDebt={() => {
            // Debts live on the Debt Tracker tab; hop over after dismiss.
            setShowSearch(false);
            presentAfterDismiss(() => navigation.navigate("DebtTracker"));
          }}
          onSelectPayment={() => {
            // DebtTrackerScreen consumes openHistory on focus (deferred
            // there past the tab transition).
            setShowSearch(false);
            presentAfterDismiss(() => navigation.navigate("DebtTracker", { openHistory: true }));
          }}
        />
      )}

      <BillCalendarModal
        visible={showBillCalendar}
        onClose={() => setShowBillCalendar(false)}
        entries={entries}
        monthKey={selectedMonthKey}
        customCategories={customCategories}
        colorForCategory={colorForCategory}
        onEditEntry={(entry) => {
          setShowBillCalendar(false);
          // Wait for the calendar Modal's close animation before presenting
          // the edit sheet - iOS doesn't reliably handle dismiss-then-present
          // in the same frame and one of the two ends up hidden.
          presentAfterDismiss(() => setEditingEntry(entry));
        }}
      />

      {showFoodSplitModal ? (
        <FoodSplitModal
          entries={foodEntriesToSplit}
          onClose={() => setShowFoodSplitModal(false)}
          onApply={applyFoodSplit}
        />
      ) : null}

      <Modal
        visible={limitModalCategory != null}
        transparent
        animationType="fade"
        onRequestClose={closeLimitModal}
      >
        <KeyboardAwareModalOverlay style={styles.limitOverlay}>
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
        </KeyboardAwareModalOverlay>
      </Modal>

      {/* Emergency Fund Contribution Modal */}
      <Modal
        visible={showEfContribModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEfContribModal(false)}
      >
        <KeyboardAwareModalOverlay style={styles.limitOverlay}>
          <View style={styles.limitModalCard}>
            <Text style={styles.limitModalTitle}>Emergency Fund</Text>
            <Text style={styles.limitModalSub}>
              Current balance: {formatCurrency(emergencyFundGoal?.currentAmount ?? 0)}
              {emergencyFundGoal?.targetAmount
                ? ` / ${formatCurrency(emergencyFundGoal.targetAmount)}`
                : ""}
              {efSource.linked
                ? ` • tracked from ${efSource.accounts.length} designated savings ${
                    efSource.accounts.length === 1 ? "account" : "accounts"
                  }`
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
        </KeyboardAwareModalOverlay>
      </Modal>
      {coachmark}
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    screenTransparent: {
      backgroundColor: "transparent",
    },
    listContent: {
      paddingHorizontal: tokens.pad,
    },
    titleSection: {
      paddingTop: 50,
      paddingBottom: tokens.gapSm + 2,
      alignItems: "center",
      position: "relative",
    },
    calendarIconBtn: {
      position: "absolute",
      top: 50,
      right: 0,
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    inboxIconBtn: {
      position: "absolute",
      top: 50,
      left: 0,
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    searchIconBtn: {
      position: "absolute",
      top: 50,
      left: 0,
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    /** When the Review Inbox icon occupies the left corner. */
    searchIconBtnShifted: {
      left: 48,
    },
    inboxBadge: {
      position: "absolute",
      top: -6,
      right: -6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    inboxBadgeText: {
      color: colors.white,
      fontSize: 10,
      fontWeight: "700",
    },
    calendarIconGlyph: {
      fontSize: 20,
    },
    appLabel: {
      fontSize: scale(10),
      fontWeight: "600",
      color: colors.textDim,
      letterSpacing: 3,
      marginBottom: 3,
      textTransform: "uppercase",
      textAlign: "center",
    },
    screenTitle: {
      fontSize: scale(28),
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 4,
      textAlign: "center",
    },
    screenSubtitle: {
      fontSize: scale(13),
      color: colors.textMuted,
      textAlign: "center",
    },
    monthPillRow: {
      alignItems: "center",
      marginTop: tokens.gapSm + 2,
      marginBottom: tokens.gap,
    },
    monthPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: `${colors.accent}26`,
      backgroundColor: colors.card,
    },
    /* Padding lives on the arrow buttons (not the pill) so the tap targets
     * reach ~44pt with hitSlop while the pill stays visually the same size. */
    monthPillArrowBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    monthPillArrow: {
      color: colors.accent,
      fontSize: scale(20),
      fontWeight: "800",
      lineHeight: scale(22),
    },
    monthPillArrowDisabled: {
      color: colors.textMuted,
      opacity: 0.5,
    },
    monthPillLabel: {
      color: colors.text,
      fontSize: scale(12),
      fontWeight: "700",
      minWidth: 86,
      textAlign: "center",
    },
    statDivider: {
      width: 1,
      marginVertical: 6,
      backgroundColor: colors.cardBorder,
    },
    summaryCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gap,
      overflow: "hidden",
    },
    netWorthCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad + 2,
      marginBottom: tokens.gap,
      alignItems: "center",
    },
    netWorthTitle: {
      fontSize: 12,
      color: colors.textDim,
      letterSpacing: 1,
      marginBottom: 4,
    },
    netWorthValue: {
      fontSize: scale(24),
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
      alignItems: "center",
    },
    summaryStat: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 4,
    },
    summaryStatLabel: {
      color: colors.textDim,
      fontSize: scale(9),
      fontWeight: "600",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    summaryStatValue: {
      fontSize: scale(16),
      fontWeight: "800",
      letterSpacing: -0.5,
      fontVariant: ["tabular-nums"],
    },
    addBtn: {
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.pad,
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
      marginBottom: tokens.gapLg,
    },
    sectionTitle: {
      fontSize: scale(16),
      fontWeight: "600",
      color: colors.text,
      marginBottom: 10,
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
    reminderBanner: {
      marginBottom: tokens.gap,
    },
    spendingChartWrap: {
      alignItems: "center",
      marginBottom: 8,
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
      borderRadius: tokens.radiusPill,
      overflow: "hidden",
      marginBottom: 4,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
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
      borderRadius: tokens.radiusPill,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: tokens.radiusPill,
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
      backgroundColor: colors.overlay,
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
    bucketAssignRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    bucketAssignChip: {
      flex: 1,
      borderWidth: 1,
      borderRadius: tokens.radiusPill,
      paddingVertical: 10,
      alignItems: "center",
    },
    bucketAssignText: {
      fontSize: 12,
      fontWeight: "700",
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
    /* FAB */
    fab: {
      position: "absolute",
      // `bottom` is applied inline at the call site from the live safe-area
      // inset (fabBottomOffset) so the FAB always clears the tab bar.
      right: FAB_RIGHT,
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: tokens.radius,
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
      fontSize: scale(26),
      fontWeight: "300",
      color: colors.accentButtonText || colors.bg,
      lineHeight: 28,
    },
    bulkBar: {
      position: "absolute",
      left: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      borderRadius: tokens.radius,
      elevation: 6,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    bulkBarCancel: {
      fontSize: scale(15),
      fontWeight: "700",
    },
    bulkBarCount: {
      flex: 1,
      fontSize: scale(13),
      fontWeight: "700",
    },
    bulkBarActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
    },
    bulkBarAction: {
      fontSize: scale(13),
      fontWeight: "800",
    },
    bulkPickerOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    bulkPickerCard: {
      borderWidth: 1,
      padding: 20,
      maxHeight: "70%",
    },
    bulkPickerTitle: {
      fontSize: scale(16),
      fontWeight: "700",
      marginBottom: 12,
    },
    bulkPickerList: {
      flexGrow: 0,
    },
    bulkPickerRow: {
      paddingVertical: 13,
      borderTopWidth: 1,
    },
    bulkPickerRowText: {
      fontSize: scale(14),
      fontWeight: "600",
    },
  });
};

export default BudgetScreen;
