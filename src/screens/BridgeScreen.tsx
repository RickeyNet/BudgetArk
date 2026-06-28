import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_BASE_HEIGHT } from "../navigation/tabBarLayout";
import { generateUUID } from "../utils/uuid";
import NetWorthHistoryCard from "../components/NetWorthHistoryCard";
import CashFlowChart, { type CashFlowPoint } from "../components/CashFlowChart";
import Medal from "../components/Medal";
import AchievementsScreen from "./AchievementsScreen";
import AnnualReportModal from "../components/AnnualReportModal";
import { ACHIEVEMENT_DEFS } from "../data/achievementDefs";
import { useAchievements } from "../achievements/AchievementsProvider";
import {
  AssetAccount,
  AssetAccountCategory,
  ASSET_ACCOUNT_CATEGORIES,
  ASSET_ACCOUNT_CATEGORY_LABELS,
  CachedQuote,
  Debt,
  Holding,
  HoldingsSettings,
  NetWorthSnapshot,
  SavingsGoal,
  BudgetEntry,
} from "../types";
import { getBudgetEntries, saveBudgetEntries } from "../storage/budgetStorage";
import { getDebts } from "../storage/debtStorage";
import { getSavingsGoals, saveSavingsGoals } from "../storage/savingsGoalStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import {
  getAssetAccounts,
  saveAssetAccounts,
  deleteAssetAccount,
} from "../storage/assetAccountStorage";
import {
  getHoldings,
  saveHoldings,
  deleteHolding as deleteHoldingRecord,
} from "../storage/holdingsStorage";
import { getQuoteCache } from "../storage/quoteCacheStorage";
import {
  getHoldingsSettings,
  setHoldingsEnabled,
} from "../storage/holdingsSettingsStorage";
import { refreshQuotes } from "../services/quotesService";
import {
  holdingMarketValue,
  holdingsTotalValue,
  holdingGainLoss,
  isValidSymbol,
  normalizeSymbol,
  accountHoldingsValue,
  isQuoteRefreshDue,
} from "../utils/holdingsMath";
import { syncNetWorthSnapshot } from "../storage/netWorthSnapshotStorage";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { DensityTokens } from "../theme/density";
import { useCurrency } from "../currency/CurrencyProvider";
import { useTabCoachmark } from "../onboarding/useTabCoachmark";
import { useCoachmarkAnchor } from "../onboarding/CoachmarkAnchorContext";
import type { ThemeColors } from "../theme/themes";
import { calculateNetWorthTotals } from "../utils/netWorth";
import { applyMissedRecurringLinkedAccountContributions } from "../utils/linkedAccountRecurring";
import { isEntryActiveInMonth } from "../utils/recurrence";
import DonutChart, { type DonutSlice } from "../components/DonutChart";
import {
  HOLDINGS_DISCLOSURE_TITLE,
  HOLDINGS_DISCLOSURE_INTRO,
  HOLDINGS_DISCLOSURE_POINTS,
} from "../data/holdingsDisclosure";

/** Emoji glyph per asset category for the account-row icon chip. */
const ACCOUNT_ICONS: Record<AssetAccountCategory, string> = {
  checking: "🏦",
  savings: "💰",
  retirement: "📈",
  hsa: "🏥",
  investment: "📊",
  other: "💼",
};
const iconForCategory = (category: AssetAccountCategory): string =>
  ACCOUNT_ICONS[category] ?? "💼";

/**
 * One editable ticker row inside the broker (Investment account) modal. `id`
 * is set for rows that map to an existing Holding; new rows leave it undefined
 * until save assigns one. `key` is a stable React list key independent of id.
 */
type TickerDraft = {
  key: string;
  id?: string;
  symbol: string;
  shares: string;
  costBasis: string;
};

const BridgeScreen: React.FC = () => {
  const { colors, showAmbientBackground } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const coachmark = useTabCoachmark("Bridge");
  const listRef = useRef<FlatList>(null);
  const anchorBridgeAccounts = useCoachmarkAnchor("bridge-accounts-card", { scrollRef: listRef });
  const anchorBridgeHistory = useCoachmarkAnchor("bridge-history-card", { scrollRef: listRef });
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Record<string, CachedQuote>>({});
  const [holdingsSettings, setHoldingsSettings] = useState<HoldingsSettings>({
    enabled: false,
    disclosureAcknowledged: false,
  });
  const [netWorthSnapshots, setNetWorthSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [keelTarget, setKeelTarget] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const [showHoldingsDisclosure, setShowHoldingsDisclosure] = useState(false);
  const [quotesLastFetchedAt, setQuotesLastFetchedAt] = useState<string | null>(
    null
  );
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetAccount | null>(null);
  const [assetName, setAssetName] = useState("");
  const [assetBalance, setAssetBalance] = useState("");
  const [assetCategory, setAssetCategory] = useState<AssetAccountCategory>("checking");
  // Editable ticker rows shown in the modal when the account is an Investment
  // (broker). Holds the broker's holdings while editing; reconciled on save.
  const [brokerTickers, setBrokerTickers] = useState<TickerDraft[]>([]);
  const [collapsedAccountCategories, setCollapsedAccountCategories] = useState<
    Set<AssetAccountCategory>
  >(() => new Set(ASSET_ACCOUNT_CATEGORIES));
  // Which broker (Investment account) rows are expanded to show their holdings.
  // Default collapsed - the user taps a broker to reveal its tickers.
  const [expandedBrokers, setExpandedBrokers] = useState<Set<string>>(
    () => new Set()
  );
  const [showEfContribModal, setShowEfContribModal] = useState(false);
  const [efContribAmount, setEfContribAmount] = useState("");
  const [showAchievements, setShowAchievements] = useState(false);
  const [showAnnualReport, setShowAnnualReport] = useState(false);
  const {
    unlocked: achievementUnlocked,
    totalCount: totalAchievements,
    runCheck: refreshAchievements,
  } = useAchievements();

  const refreshNetWorthSnapshots = useCallback(async () => {
    const nextSnapshots = await syncNetWorthSnapshot();
    setNetWorthSnapshots(nextSnapshots);
    return nextSnapshots;
  }, []);

  /**
   * Load holdings + cached prices into screen state. Reads the opt-in flag
   * first: when the feature is off, holdings/quotes stay empty so they
   * contribute nothing to net worth and the UI shows the teaser instead.
   *
   * This NEVER hits the network - it only reads the per-device cache. Pulling
   * fresh prices is an explicit user action (the "Update prices" button) so
   * that adding several tickers in a row doesn't spend the weekly fetch window
   * on a partial set. See `refreshPricesManually`.
   */
  const loadHoldingsState = useCallback(async (): Promise<HoldingsSettings> => {
    const settings = await getHoldingsSettings();
    setHoldingsSettings(settings);
    if (!settings.enabled) {
      setHoldings([]);
      setQuotes({});
      setQuotesLastFetchedAt(null);
      return settings;
    }
    const cache = await getQuoteCache();
    setQuotes(cache.quotes);
    setQuotesLastFetchedAt(cache.lastFetchedAt);
    setHoldings(await getHoldings());
    return settings;
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAchievements();
    }, [refreshAchievements])
  );

  useFocusEffect(
    useCallback(() => {
      // Cancellation flag - prevents a slower load from overwriting a newer
      // one's state when the user re-focuses the tab quickly.
      let cancelled = false;
      const loadBridgeData = async () => {
        try {
          const [storedEntries, storedDebts, storedGoals, storedAssets, milestonePlan] =
            await Promise.all([
              getBudgetEntries(),
              getDebts(),
              getSavingsGoals(),
              getAssetAccounts(),
              getDebtMilestonePlan(),
            ]);
          if (cancelled) return;

          const keelStep = milestonePlan.steps.find((step) => step.key === "keel");
          const processed = applyMissedRecurringLinkedAccountContributions(
            storedEntries,
            storedAssets
          );

          if (processed.changed) {
            // Sequence the two saves: commit the lastAppliedMonth marker on
            // the entries first, *then* the asset balance. Reversing this
            // (or running them concurrently) opens a race window where
            // another reader (e.g. BudgetScreen on a quick tab switch) can
            // see the new asset balance with the OLD lastAppliedMonth and
            // re-apply the contribution - silently double-crediting the
            // asset.
            await saveBudgetEntries(processed.entries);
            await saveAssetAccounts(processed.assetAccounts);
          }
          if (cancelled) return;

          setEntries(processed.entries);
          setDebts(storedDebts);
          setSavingsGoals(storedGoals);
          setAssetAccounts(processed.assetAccounts);
          setKeelTarget(keelStep?.targetAmount ?? 1000);
          await refreshNetWorthSnapshots();
          if (cancelled) return;
          // Holdings load last and from cache only - no network. The user
          // pulls fresh prices explicitly via the "Update prices" button.
          await loadHoldingsState();
          if (cancelled) return;
        } catch (error) {
          if (cancelled) return;
          if (__DEV__) console.error("Failed to load bridge:", error);
          setEntries([]);
          setDebts([]);
          setSavingsGoals([]);
          setAssetAccounts([]);
          setHoldings([]);
          setQuotes({});
          setNetWorthSnapshots([]);
          setKeelTarget(0);
        }
        if (!cancelled) setIsLoaded(true);
      };

      loadBridgeData();
      return () => {
        cancelled = true;
      };
    }, [loadHoldingsState, refreshNetWorthSnapshots])
  );

  // Emergency-fund derived current amount. Only the "Savings" category
  // counts toward the EF; Retirement and Investing aren't liquid emergency
  // money and feed the Gather Animals milestone separately.
  const savingsReserve = useMemo(
    () =>
      entries
        .filter(
          (entry) =>
            entry.type === "expense" && entry.category === "Savings"
        )
        .reduce((sum, entry) => sum + entry.amount, 0),
    [entries]
  );

  const emergencyFundGoal = useMemo(() => {
    const explicit = savingsGoals.find((goal) => goal.category === "emergency_fund");
    if (explicit) return explicit;
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
  }, [keelTarget, savingsGoals, savingsReserve]);

  const netWorthTotals = useMemo(
    () =>
      calculateNetWorthTotals({
        entries,
        debts,
        savingsGoals,
        assetAccounts,
        holdings,
        quotes,
      }),
    [assetAccounts, debts, entries, holdings, quotes, savingsGoals]
  );

  /**
   * Total market value of all priced holdings. Every holding belongs to an
   * Investment (broker) account, so this doubles as the Investment category
   * total shown on its group header.
   */
  const holdingsValue = useMemo(
    () => holdingsTotalValue(holdings, quotes),
    [holdings, quotes]
  );

  /** Investment-category accounts (the brokers), in display order. */
  const investmentAccounts = useMemo(
    () => assetAccounts.filter((a) => a.category === "investment"),
    [assetAccounts]
  );

  /** Whether a manual price refresh is allowed yet (weekly window). */
  const priceRefreshDue = isQuoteRefreshDue(quotesLastFetchedAt, Date.now());
  const daysUntilRefresh = useMemo(() => {
    if (!quotesLastFetchedAt) return 0;
    const last = new Date(quotesLastFetchedAt).getTime();
    if (!Number.isFinite(last)) return 0;
    const msLeft = last + 7 * 24 * 60 * 60 * 1000 - Date.now();
    return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  }, [quotesLastFetchedAt]);

  /** Most recent price timestamp across cached quotes, for the "as of" label. */
  const quotesAsOf = useMemo(() => {
    let latest = "";
    for (const holding of holdings) {
      const quote = quotes[normalizeSymbol(holding.symbol)];
      if (quote?.asOf && quote.asOf > latest) latest = quote.asOf;
    }
    return latest;
  }, [holdings, quotes]);

  const totalAssetBalance = useMemo(
    () => assetAccounts.reduce((sum, account) => sum + account.balance, 0),
    [assetAccounts]
  );

  // Investment accounts carry a 0 balance (value lives in their holdings), so
  // add holdings value in explicitly to get the true tracked total.
  const trackedAccountsTotal =
    totalAssetBalance + holdingsValue + (emergencyFundGoal?.currentAmount ?? 0);

  /**
   * Per-category color palette for the asset donut + category headers.
   * Pulled from the active theme so each preset's accent/teal/success/etc.
   * carry through. Keep in sync with ASSET_ACCOUNT_CATEGORIES order.
   */
  const assetCategoryColors = useMemo<Record<AssetAccountCategory, string>>(
    () => ({
      checking: colors.accent,
      savings: colors.teal,
      retirement: colors.success,
      hsa: colors.warning,
      investment: colors.danger,
      other: colors.textDim,
    }),
    [colors]
  );

  /**
   * Group asset accounts by category, drop empty groups, and tally each.
   * Iteration order follows ASSET_ACCOUNT_CATEGORIES so the UI stays stable
   * regardless of insertion order.
   */
  const accountsByCategory = useMemo(() => {
    // Investment is rendered specially (brokers -> holdings), so exclude it here.
    return ASSET_ACCOUNT_CATEGORIES.filter((category) => category !== "investment")
      .map((category) => {
        const accounts = assetAccounts.filter((a) => a.category === category);
        const total = accounts.reduce((sum, a) => sum + a.balance, 0);
        return { category, accounts, total };
      })
      .filter((group) => group.accounts.length > 0);
  }, [assetAccounts]);

  const accountDonutSlices = useMemo<DonutSlice[]>(() => {
    const slices: DonutSlice[] = accountsByCategory
      .filter((group) => group.total > 0)
      .map((group) => ({
        label: group.category,
        value: group.total,
        color: assetCategoryColors[group.category],
      }));
    // Investment shows as one slice valued by its holdings.
    if (holdingsValue > 0) {
      slices.push({
        label: "investment",
        value: holdingsValue,
        color: assetCategoryColors.investment,
      });
    }
    return slices;
  }, [accountsByCategory, assetCategoryColors, holdingsValue]);

  const toggleAccountCategory = useCallback((category: AssetAccountCategory) => {
    setCollapsedAccountCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // Trailing 6 months of income vs expense, oldest → newest, for the cash
  // flow panel. Recurring entries are counted in every month from their
  // start onward (mirrors how the Budget screen rolls them forward).
  const cashFlow = useMemo<CashFlowPoint[]>(() => {
    const now = new Date();
    const buckets: CashFlowPoint[] = [];
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      let income = 0;
      let expense = 0;
      for (const entry of entries) {
        if (!isEntryActiveInMonth(entry, monthKey)) continue;
        if (entry.type === "income") income += entry.amount;
        else expense += entry.amount;
      }
      buckets.push({
        label: d.toLocaleDateString(undefined, { month: "short" }),
        income,
        expense,
      });
    }
    return buckets;
  }, [entries]);

  const hasCashFlow = cashFlow.some((m) => m.income > 0 || m.expense > 0);

  const openAddAssetModal = useCallback(() => {
    setEditingAsset(null);
    setAssetName("");
    setAssetBalance("");
    setAssetCategory("savings");
    setBrokerTickers([]);
    setShowAssetModal(true);
  }, []);

  /** Open the modal pre-set to a new Investment account (broker). */
  const openAddBrokerModal = useCallback(() => {
    setEditingAsset(null);
    setAssetName("");
    setAssetBalance("");
    setAssetCategory("investment");
    setBrokerTickers([]);
    setShowAssetModal(true);
  }, []);

  const openEditAssetModal = useCallback(
    (account: AssetAccount) => {
      setEditingAsset(account);
      setAssetName(account.name);
      setAssetBalance(String(account.balance));
      setAssetCategory(account.category);
      // Preload this broker's tickers for inline editing (Investment only).
      setBrokerTickers(
        holdings
          .filter((h) => h.accountId === account.id)
          .map((h) => ({
            key: h.id,
            id: h.id,
            symbol: h.symbol,
            shares: String(h.shares),
            costBasis: h.costBasis != null ? String(h.costBasis) : "",
          }))
      );
      setShowAssetModal(true);
    },
    [holdings]
  );

  const closeAssetModal = useCallback(() => {
    setShowAssetModal(false);
    setEditingAsset(null);
    setAssetName("");
    setAssetBalance("");
    setAssetCategory("savings");
    setBrokerTickers([]);
  }, []);

  const addTickerRow = useCallback(() => {
    // Adding a ticker is the off-device step (the symbol gets sent to the quote
    // proxy). Gate the first one behind the disclosure.
    if (!holdingsSettings.enabled && !holdingsSettings.disclosureAcknowledged) {
      setShowHoldingsDisclosure(true);
      return;
    }
    setBrokerTickers((prev) => [
      ...prev,
      { key: generateUUID(), symbol: "", shares: "", costBasis: "" },
    ]);
  }, [holdingsSettings.disclosureAcknowledged, holdingsSettings.enabled]);

  const updateTickerRow = useCallback(
    (key: string, field: "symbol" | "shares" | "costBasis", value: string) => {
      setBrokerTickers((prev) =>
        prev.map((row) => (row.key === key ? { ...row, [field]: value } : row))
      );
    },
    []
  );

  const removeTickerRow = useCallback((key: string) => {
    setBrokerTickers((prev) => prev.filter((row) => row.key !== key));
  }, []);

  /**
   * Persist the account, and for an Investment (broker) account reconcile its
   * holdings against the edited ticker rows: update kept rows, create new ones,
   * and tombstone any the user removed. Never fetches prices - that stays
   * manual so adding several tickers doesn't burn the weekly window.
   */
  const saveAsset = useCallback(async () => {
    const name = assetName.trim();
    if (!name) return;

    const isInvestment = assetCategory === "investment";
    const parsedBalance = parseFloat(assetBalance);
    if (!isInvestment && (Number.isNaN(parsedBalance) || parsedBalance < 0)) return;
    // Investment accounts derive their value from holdings, so balance is 0.
    const balance = isInvestment ? 0 : parsedBalance;

    const now = new Date().toISOString();
    const accountId = editingAsset ? editingAsset.id : generateUUID();

    const nextAccounts: AssetAccount[] = editingAsset
      ? assetAccounts.map((account) =>
          account.id === editingAsset.id
            ? { ...account, name, balance, category: assetCategory, updatedAt: now }
            : account
        )
      : [
          ...assetAccounts,
          { id: accountId, name, balance, category: assetCategory, createdAt: now, updatedAt: now },
        ];

    setAssetAccounts(nextAccounts);
    await saveAssetAccounts(nextAccounts);

    if (isInvestment) {
      const rows = brokerTickers
        .map((row) => {
          const symbol = normalizeSymbol(row.symbol);
          const shares = parseFloat(row.shares);
          if (!isValidSymbol(symbol) || !Number.isFinite(shares) || shares <= 0) {
            return null;
          }
          const trimmedCost = row.costBasis.trim();
          const parsedCost = trimmedCost === "" ? NaN : parseFloat(trimmedCost);
          const costBasis =
            Number.isFinite(parsedCost) && parsedCost >= 0 ? parsedCost : undefined;
          return { id: row.id, symbol, shares, costBasis };
        })
        .filter(
          (
            r
          ): r is {
            id: string | undefined;
            symbol: string;
            shares: number;
            costBasis: number | undefined;
          } => r !== null
        );

      const keptIds = new Set(
        rows.map((r) => r.id).filter((id): id is string => !!id)
      );

      // Tombstone holdings removed from this broker (soft-delete so the
      // deletion propagates on the next sync).
      for (const h of holdings) {
        if (h.accountId === accountId && !keptIds.has(h.id)) {
          await deleteHoldingRecord(h.id);
        }
      }

      // Update kept rows; drop removed from the live array (tombstones above
      // are merged back by saveHoldings); leave other brokers untouched.
      const updated = holdings
        .map((h) => {
          if (h.accountId !== accountId) return h;
          const row = rows.find((r) => r.id === h.id);
          return row
            ? { ...h, symbol: row.symbol, shares: row.shares, costBasis: row.costBasis, updatedAt: now }
            : h;
        })
        .filter((h) => !(h.accountId === accountId && !keptIds.has(h.id)));

      const created: Holding[] = rows
        .filter((r) => !r.id)
        .map((r) => ({
          id: generateUUID(),
          symbol: r.symbol,
          shares: r.shares,
          costBasis: r.costBasis,
          accountId,
          createdAt: now,
          updatedAt: now,
        }));

      const nextLive = [...updated, ...created];
      setHoldings(nextLive);
      await saveHoldings(nextLive);
    }

    await refreshNetWorthSnapshots();
    closeAssetModal();
    await loadHoldingsState();
    void refreshAchievements();
  }, [
    assetAccounts,
    assetBalance,
    assetCategory,
    assetName,
    brokerTickers,
    closeAssetModal,
    editingAsset,
    holdings,
    loadHoldingsState,
    refreshAchievements,
    refreshNetWorthSnapshots,
  ]);

  const deleteAsset = useCallback(
    async (account: AssetAccount) => {
      // Soft-delete so the partner's next sync removes this account locally.
      const nextAccounts = await deleteAssetAccount(account.id);
      setAssetAccounts(nextAccounts);
      // Deleting a broker also tombstones its holdings - they have no home
      // without it.
      if (account.category === "investment") {
        for (const h of holdings) {
          if (h.accountId === account.id) await deleteHoldingRecord(h.id);
        }
        await loadHoldingsState();
      }
      await refreshNetWorthSnapshots();
      closeAssetModal();
      void refreshAchievements();
    },
    [closeAssetModal, holdings, loadHoldingsState, refreshAchievements, refreshNetWorthSnapshots]
  );

  const toggleBrokerExpand = useCallback((accountId: string) => {
    setExpandedBrokers((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }, []);

  /**
   * The only path that reaches out to the quote proxy. Weekly-gated by the UI
   * (the button is disabled until a refresh is due), so a tap always results in
   * a real fetch covering every ticker the user has added by then.
   */
  const refreshPricesManually = useCallback(async () => {
    if (isRefreshingPrices || !holdingsSettings.enabled) return;
    setIsRefreshingPrices(true);
    try {
      const result = await refreshQuotes();
      setQuotes(result.cache.quotes);
      setQuotesLastFetchedAt(result.cache.lastFetchedAt);
      setHoldings(await getHoldings());
    } finally {
      setIsRefreshingPrices(false);
    }
  }, [holdingsSettings.enabled, isRefreshingPrices]);

  const enableHoldings = useCallback(async () => {
    const settings = await setHoldingsEnabled(true);
    setHoldingsSettings(settings);
    setShowHoldingsDisclosure(false);
    // If the broker modal is open, drop in a blank ticker row so the user can
    // keep going right where they left off.
    if (showAssetModal && assetCategory === "investment") {
      setBrokerTickers((prev) => [
        ...prev,
        { key: generateUUID(), symbol: "", shares: "", costBasis: "" },
      ]);
    }
    await loadHoldingsState();
  }, [assetCategory, loadHoldingsState, showAssetModal]);

  const handleEfContribution = useCallback(async () => {
    const parsed = parseFloat(efContribAmount);
    if (Number.isNaN(parsed) || parsed === 0) return;

    const now = new Date().toISOString();
    const existing = savingsGoals.find((goal) => goal.category === "emergency_fund");

    let updatedGoals: SavingsGoal[];

    if (existing) {
      const updatedGoal = {
        ...existing,
        currentAmount: Math.max(0, existing.currentAmount + parsed),
        updatedAt: now,
      };
      updatedGoals = savingsGoals.map((goal) =>
        goal.id === existing.id ? updatedGoal : goal
      );
    } else {
      updatedGoals = [
        ...savingsGoals,
        {
          id: generateUUID(),
          name: "Emergency Fund",
          category: "emergency_fund",
          targetAmount: keelTarget,
          currentAmount: Math.max(0, parsed),
          createdAt: now,
          updatedAt: now,
        },
      ];
    }

    setSavingsGoals(updatedGoals);
    await saveSavingsGoals(updatedGoals);
    await refreshNetWorthSnapshots();
    setShowEfContribModal(false);
    setEfContribAmount("");
    void refreshAchievements();
  }, [efContribAmount, keelTarget, refreshAchievements, refreshNetWorthSnapshots, savingsGoals]);

  const listHeader = (
    <View>
      <View style={styles.titleSection}>
        <Text style={styles.appLabel}>BudgetArk</Text>
        <Text style={styles.screenTitle}>The Bridge</Text>
        <Text style={styles.screenSubtitle}>Net worth, accounts, and progress.</Text>
      </View>

      <View ref={anchorBridgeHistory} collapsable={false}>
        <NetWorthHistoryCard
          snapshots={netWorthSnapshots}
          netWorth={netWorthTotals.netWorth}
          totalAssets={netWorthTotals.totalAssets}
          totalDebt={netWorthTotals.totalDebt}
          formatCurrency={formatCurrency}
          formatCompactCurrency={formatCompactCurrency}
          colors={colors}
        />
      </View>

      {hasCashFlow ? (
        <CashFlowChart
          data={cashFlow}
          colors={colors}
          formatCompactCurrency={formatCompactCurrency}
        />
      ) : null}

      <View ref={anchorBridgeAccounts} collapsable={false} style={styles.accountsCard}>
        <View style={styles.topHairline} />
        <View style={styles.accountsHeaderRow}>
          <Text style={styles.accountsTitle}>Accounts</Text>
          <TouchableOpacity onPress={openAddAssetModal}>
            <Text style={[styles.accountsAddBtn, { color: colors.accent }]}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {assetAccounts.length === 0 && !emergencyFundGoal ? (
          <Text style={styles.accountsEmpty}>
            Track your checking, savings, 401k, HSA, and other account balances here.
          </Text>
        ) : (
          <>
            {accountDonutSlices.length > 0 ? (
              <View style={styles.accountsSummaryRow}>
                <DonutChart data={accountDonutSlices} size={120} strokeWidth={20} />
                <View style={styles.accountsSummaryText}>
                  <Text style={[styles.accountsSummaryLabel, { color: colors.textDim }]}>
                    Total
                  </Text>
                  <Text style={[styles.accountsSummaryValue, { color: colors.success }]}>
                    {formatCurrency(trackedAccountsTotal)}
                  </Text>
                  <Text style={[styles.accountsSummaryMeta, { color: colors.textMuted }]}>
                    across {assetAccounts.length}{" "}
                    {assetAccounts.length === 1 ? "account" : "accounts"}
                    {emergencyFundGoal ? " + Emergency Fund" : ""}
                  </Text>
                </View>
              </View>
            ) : null}

            {emergencyFundGoal ? (
              <TouchableOpacity
                style={styles.accountRow}
                onPress={() => {
                  setEfContribAmount("");
                  setShowEfContribModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.accountIcon, { backgroundColor: colors.tealDim }]}>
                  <Text style={styles.accountIconGlyph}>🛡️</Text>
                </View>
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
            ) : null}

            {accountsByCategory.map((group) => {
              const isCollapsed = collapsedAccountCategories.has(group.category);
              const categoryColor = assetCategoryColors[group.category];
              return (
                <View key={group.category}>
                  <TouchableOpacity
                    style={styles.accountCategoryHeader}
                    onPress={() => toggleAccountCategory(group.category)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                    <Text style={[styles.accountCategoryChevron, { color: colors.textDim }]}>
                      {isCollapsed ? "▶" : "▼"}
                    </Text>
                    <Text style={[styles.accountCategoryHeaderText, { color: colors.text }]}>
                      {iconForCategory(group.category)} {ASSET_ACCOUNT_CATEGORY_LABELS[group.category]}
                    </Text>
                    <Text style={[styles.accountCategoryHeaderTotal, { color: colors.success }]}>
                      {formatCurrency(group.total)}
                    </Text>
                  </TouchableOpacity>

                  {!isCollapsed
                    ? group.accounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={[styles.accountRow, styles.accountRowNested]}
                          onPress={() => openEditAssetModal(account)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.accountRowLeft}>
                            <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
                          </View>
                          <Text style={[styles.accountBalance, { color: colors.success }]}>
                            {formatCurrency(account.balance)}
                          </Text>
                        </TouchableOpacity>
                      ))
                    : null}
                </View>
              );
            })}

            {investmentAccounts.length > 0 ? (
              <View>
                <TouchableOpacity
                  style={styles.accountCategoryHeader}
                  onPress={() => toggleAccountCategory("investment")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryDot, { backgroundColor: assetCategoryColors.investment }]} />
                  <Text style={[styles.accountCategoryChevron, { color: colors.textDim }]}>
                    {collapsedAccountCategories.has("investment") ? "▶" : "▼"}
                  </Text>
                  <Text style={[styles.accountCategoryHeaderText, { color: colors.text }]}>
                    {iconForCategory("investment")} {ASSET_ACCOUNT_CATEGORY_LABELS.investment}
                  </Text>
                  <Text style={[styles.accountCategoryHeaderTotal, { color: colors.success }]}>
                    {formatCurrency(holdingsValue)}
                  </Text>
                </TouchableOpacity>

                {!collapsedAccountCategories.has("investment") ? (
                  <>
                    {investmentAccounts.map((broker) => {
                      const brokerH = holdings.filter((h) => h.accountId === broker.id);
                      const brokerTotal = accountHoldingsValue(broker.id, holdings, quotes);
                      const isOpen = expandedBrokers.has(broker.id);
                      return (
                        <View key={broker.id}>
                          <View style={[styles.accountRow, styles.accountRowNested]}>
                            <TouchableOpacity
                              style={styles.brokerRowMain}
                              onPress={() => toggleBrokerExpand(broker.id)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.accountCategoryChevron, { color: colors.textMuted }]}>
                                {isOpen ? "▼" : "▶"}
                              </Text>
                              <Text style={styles.accountName} numberOfLines={1}>{broker.name}</Text>
                            </TouchableOpacity>
                            <Text style={[styles.accountBalance, { color: colors.success }]}>
                              {formatCurrency(brokerTotal)}
                            </Text>
                            <TouchableOpacity
                              onPress={() => openEditAssetModal(broker)}
                              accessibilityRole="button"
                              accessibilityLabel={`Edit ${broker.name}`}
                            >
                              <Text style={[styles.brokerEditBtn, { color: colors.accent }]}>Edit</Text>
                            </TouchableOpacity>
                          </View>

                          {isOpen
                            ? brokerH.length === 0
                              ? (
                                <Text style={[styles.accountCategory, styles.brokerHoldingRow]}>
                                  No holdings yet - tap Edit to add tickers.
                                </Text>
                              )
                              : brokerH.map((h) => {
                                  const symbol = normalizeSymbol(h.symbol);
                                  const priced = !!quotes[symbol];
                                  const value = holdingMarketValue(h, quotes);
                                  const gainLoss = holdingGainLoss(h, quotes);
                                  return (
                                    <TouchableOpacity
                                      key={h.id}
                                      style={[styles.accountRow, styles.brokerHoldingRow]}
                                      onPress={() => openEditAssetModal(broker)}
                                      activeOpacity={0.7}
                                    >
                                      <View style={styles.accountRowLeft}>
                                        <Text style={styles.accountName} numberOfLines={1}>{symbol}</Text>
                                        <Text style={styles.accountCategory}>
                                          {h.shares} {h.shares === 1 ? "share" : "shares"}
                                          {gainLoss != null
                                            ? ` · ${gainLoss >= 0 ? "+" : "-"}${formatCurrency(Math.abs(gainLoss))}`
                                            : ""}
                                        </Text>
                                      </View>
                                      <Text style={[styles.accountBalance, { color: priced ? colors.success : colors.textMuted }]}>
                                        {priced ? formatCurrency(value) : "--"}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })
                            : null}
                        </View>
                      );
                    })}

                    <TouchableOpacity
                      style={[styles.accountRow, styles.accountRowNested]}
                      onPress={openAddBrokerModal}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.accountsAddBtn, { color: colors.accent }]}>+ Add broker</Text>
                    </TouchableOpacity>

                    {holdingsSettings.enabled && holdings.length > 0 ? (
                      <View style={styles.priceUpdateRow}>
                        <Text style={[styles.holdingsAsOf, { color: colors.textMuted }]}>
                          {quotesAsOf
                            ? `Prices as of ${new Date(quotesAsOf).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                            : "Prices not fetched yet"}
                        </Text>
                        <TouchableOpacity
                          onPress={refreshPricesManually}
                          disabled={!priceRefreshDue || isRefreshingPrices}
                          accessibilityRole="button"
                          accessibilityLabel="Update prices now"
                        >
                          <Text
                            style={[
                              styles.accountsAddBtn,
                              { color: priceRefreshDue && !isRefreshingPrices ? colors.accent : colors.textMuted },
                            ]}
                          >
                            {isRefreshingPrices
                              ? "Updating..."
                              : priceRefreshDue
                                ? "Update prices"
                                : `Next update in ${daysUntilRefresh}d`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </View>

      <TouchableOpacity
        style={styles.shipsLogCard}
        onPress={() => setShowAchievements(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open Ship's Log achievements"
      >
        <View style={styles.shipsLogPreview}>
          {ACHIEVEMENT_DEFS.slice(0, 4).map((def) => (
            <View key={def.id} style={styles.shipsLogMedal}>
              <Medal
                tier={def.tier}
                glyph={def.glyph}
                locked={achievementUnlocked[def.id] === undefined}
                size={44}
              />
            </View>
          ))}
        </View>
        <View style={styles.shipsLogTextBlock}>
          <Text style={styles.shipsLogTitle}>Ship's Log</Text>
          <Text style={styles.shipsLogSubtitle}>
            {`${Object.keys(achievementUnlocked).length}/${totalAchievements} earned`}
          </Text>
        </View>
        <Text style={[styles.shipsLogChevron, { color: colors.accent }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.annualReportCard}
        onPress={() => setShowAnnualReport(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open your annual financial report"
      >
        <Text style={styles.annualReportGlyph}>📅</Text>
        <View style={styles.annualReportTextBlock}>
          <Text style={styles.annualReportTitle}>Annual Report</Text>
          <Text style={styles.annualReportSubtitle}>
            Your {new Date().getFullYear()} year in review
          </Text>
        </View>
        <Text style={[styles.shipsLogChevron, { color: colors.accent }]}>›</Text>
      </TouchableOpacity>
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
      {isLoaded ? (
        <FlatList
          ref={listRef}
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      <Modal
        visible={showAssetModal}
        transparent
        animationType="fade"
        onRequestClose={closeAssetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingAsset ? "Edit Account" : "Add Account"}</Text>
            <Text style={styles.modalSub}>
              {assetCategory === "investment"
                ? "Add the broker and the stocks or ETFs it holds. Its value comes from the holdings."
                : "Track a balance that will feed your net worth history."}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder={assetCategory === "investment" ? "Broker name (e.g. Fidelity)" : "Account name"}
              placeholderTextColor={colors.textMuted}
              value={assetName}
              onChangeText={setAssetName}
            />

            {assetCategory !== "investment" ? (
              <TextInput
                style={styles.modalInput}
                placeholder="Balance"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={assetBalance}
                onChangeText={setAssetBalance}
              />
            ) : null}

            <View style={styles.assetCategoryRow}>
              {ASSET_ACCOUNT_CATEGORIES.map((category) => {
                const isSelected = assetCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.assetCategoryChip,
                      {
                        borderColor: isSelected ? colors.accent : colors.cardBorder,
                        backgroundColor: isSelected ? `${colors.accent}20` : colors.bg,
                      },
                    ]}
                    onPress={() => setAssetCategory(category)}
                  >
                    <Text
                      style={[
                        styles.assetCategoryChipText,
                        { color: isSelected ? colors.accent : colors.textDim },
                      ]}
                    >
                      {ASSET_ACCOUNT_CATEGORY_LABELS[category]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {assetCategory === "investment" ? (
              <View style={styles.tickerEditor}>
                <Text style={styles.modalHint}>
                  Tickers are sent to the price service only when you tap Update prices - add them all first, then pull prices once.
                </Text>
                <ScrollView
                  style={styles.tickerList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {brokerTickers.map((row) => (
                    <View key={row.key} style={styles.tickerRow}>
                      <TextInput
                        style={[styles.modalInput, styles.tickerSymbolInput]}
                        placeholder="Ticker"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        value={row.symbol}
                        onChangeText={(t) => updateTickerRow(row.key, "symbol", t)}
                      />
                      <TextInput
                        style={[styles.modalInput, styles.tickerNumInput]}
                        placeholder="Shares"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        value={row.shares}
                        onChangeText={(t) => updateTickerRow(row.key, "shares", t)}
                      />
                      <TextInput
                        style={[styles.modalInput, styles.tickerNumInput]}
                        placeholder="Cost"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        value={row.costBasis}
                        onChangeText={(t) => updateTickerRow(row.key, "costBasis", t)}
                      />
                      <TouchableOpacity
                        onPress={() => removeTickerRow(row.key)}
                        accessibilityRole="button"
                        accessibilityLabel="Remove ticker"
                      >
                        <Text style={[styles.tickerRemove, { color: colors.danger }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity onPress={addTickerRow} style={styles.tickerAddBtn}>
                  <Text style={[styles.accountsAddBtn, { color: colors.accent }]}>+ Add ticker</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              {editingAsset ? (
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => deleteAsset(editingAsset)}>
                  <Text style={[styles.modalCancelText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={closeAssetModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveAsset}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEfContribModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEfContribModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Emergency Fund</Text>
            <Text style={styles.modalSub}>
              Current balance: {formatCurrency(emergencyFundGoal?.currentAmount ?? 0)}
              {emergencyFundGoal?.targetAmount
                ? ` / ${formatCurrency(emergencyFundGoal.targetAmount)}`
                : ""}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Amount to add (or negative to withdraw)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={efContribAmount}
              onChangeText={setEfContribAmount}
            />

            <Text style={styles.modalHint}>
              Enter a positive number to contribute, or negative to withdraw.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEfContribModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleEfContribution}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHoldingsDisclosure}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHoldingsDisclosure(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{HOLDINGS_DISCLOSURE_TITLE}</Text>
            <Text style={styles.modalSub}>{HOLDINGS_DISCLOSURE_INTRO}</Text>

            {HOLDINGS_DISCLOSURE_POINTS.map((point) => (
              <Text key={point} style={styles.disclosureItem}>
                • {point}
              </Text>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowHoldingsDisclosure(false)}
              >
                <Text style={styles.modalCancelText}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={enableHoldings}>
                <Text style={styles.modalSaveText}>Enable</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AchievementsScreen
        visible={showAchievements}
        onClose={() => {
          setShowAchievements(false);
          void refreshAchievements();
        }}
      />
      <AnnualReportModal
        visible={showAnnualReport}
        onClose={() => setShowAnnualReport(false)}
      />

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
      paddingTop: 56,
      paddingBottom: tokens.gap,
      alignItems: "center",
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
      marginBottom: 4,
      letterSpacing: -0.5,
      textAlign: "center",
    },
    screenSubtitle: {
      fontSize: scale(13),
      color: colors.textMuted,
      textAlign: "center",
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
    accountIcon: {
      width: 34,
      height: 34,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    accountIconGlyph: {
      fontSize: scale(15),
    },
    accountsCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gap,
      overflow: "hidden",
    },
    accountsHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: tokens.gapSm + 4,
    },
    accountsTitle: {
      fontSize: scale(18),
      fontWeight: "700",
      color: colors.text,
    },
    accountsAddBtn: {
      fontSize: scale(14),
      fontWeight: "700",
    },
    accountsEmpty: {
      fontSize: scale(13),
      color: colors.textDim,
      textAlign: "center",
      paddingVertical: tokens.padSm - 4,
    },
    accountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: tokens.padSm,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    accountRowLeft: {
      flex: 1,
    },
    accountName: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    accountCategory: {
      fontSize: scale(11),
      color: colors.textDim,
      marginTop: 1,
    },
    accountBalance: {
      fontSize: scale(14),
      fontWeight: "700",
      fontVariant: ["tabular-nums"] as any,
    },
    accountTotalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: tokens.padSm - 2,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    accountTotalLabel: {
      fontSize: scale(13),
      fontWeight: "700",
      color: colors.textDim,
    },
    accountTotalValue: {
      fontSize: scale(15),
      fontWeight: "700",
      fontVariant: ["tabular-nums"] as any,
    },
    accountsSummaryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: tokens.padSm,
      marginBottom: tokens.gapSm,
    },
    accountsSummaryText: {
      flex: 1,
    },
    accountsSummaryLabel: {
      fontSize: scale(12),
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    accountsSummaryValue: {
      fontSize: scale(24),
      fontWeight: "800",
      marginTop: 2,
      fontVariant: ["tabular-nums"] as any,
    },
    accountsSummaryMeta: {
      fontSize: scale(11),
      marginTop: 4,
    },
    accountCategoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: tokens.padSm,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    categoryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    accountCategoryChevron: {
      fontSize: scale(11),
      width: 12,
    },
    accountCategoryHeaderText: {
      flex: 1,
      fontSize: scale(14),
      fontWeight: "700",
    },
    accountCategoryHeaderTotal: {
      fontSize: scale(14),
      fontWeight: "700",
      fontVariant: ["tabular-nums"] as any,
    },
    accountRowNested: {
      paddingLeft: 28,
      borderTopColor: "transparent",
    },
    // Broker (Investment account) row: chevron + name take the lead, total +
    // Edit sit on the right.
    brokerRowMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    brokerEditBtn: {
      fontSize: scale(13),
      fontWeight: "700",
      marginLeft: 12,
    },
    // Holdings nested one level under their broker row.
    brokerHoldingRow: {
      paddingLeft: 44,
      borderTopColor: "transparent",
    },
    priceUpdateRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: 28,
      paddingTop: tokens.gapSm,
    },
    // Inline ticker editor inside the broker modal.
    tickerEditor: {
      marginTop: tokens.gapSm,
    },
    tickerList: {
      maxHeight: 220,
    },
    tickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    tickerSymbolInput: {
      flex: 1.4,
      marginBottom: tokens.gapSm,
    },
    tickerNumInput: {
      flex: 1,
      marginBottom: tokens.gapSm,
    },
    tickerRemove: {
      fontSize: scale(16),
      fontWeight: "700",
      paddingHorizontal: 4,
    },
    tickerAddBtn: {
      paddingVertical: tokens.padSm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      paddingHorizontal: tokens.padLg,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
    },
    modalTitle: {
      fontSize: scale(18),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    modalSub: {
      fontSize: scale(14),
      color: colors.textDim,
      marginBottom: 12,
    },
    modalInput: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm + 2,
      paddingHorizontal: tokens.padSm + 2,
      paddingVertical: tokens.padSm,
      color: colors.text,
      fontSize: scale(15),
      marginBottom: 8,
    },
    modalHint: {
      fontSize: scale(12),
      color: colors.textMuted,
    },
    modalActions: {
      flexDirection: "row",
      gap: tokens.gapSm + 4,
      marginTop: tokens.gap,
    },
    modalCancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm + 2,
      paddingVertical: tokens.padSm,
      alignItems: "center",
    },
    modalCancelText: {
      color: colors.textDim,
      fontSize: scale(14),
      fontWeight: "600",
    },
    modalSaveBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusSm + 2,
      paddingVertical: tokens.padSm,
      alignItems: "center",
    },
    modalSaveText: {
      color: colors.white,
      fontSize: scale(14),
      fontWeight: "700",
    },
    assetCategoryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.gapSm + 2,
      marginBottom: 8,
    },
    assetCategoryChip: {
      borderWidth: 1,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.padSm - 2,
      paddingVertical: tokens.padSm - 5,
    },
    assetCategoryChipText: {
      fontSize: scale(12),
      fontWeight: "600",
    },
    holdingsAsOf: {
      fontSize: scale(11),
      marginBottom: 4,
    },
    disclosureItem: {
      fontSize: scale(13),
      color: colors.textDim,
      marginBottom: 8,
      lineHeight: scale(18),
    },
    shipsLogCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gap,
      gap: tokens.gapSm + 4,
    },
    shipsLogPreview: {
      flexDirection: "row",
    },
    shipsLogMedal: {
      marginRight: -10,
    },
    shipsLogTextBlock: {
      flex: 1,
      marginLeft: 14,
    },
    shipsLogTitle: {
      fontSize: scale(16),
      fontWeight: "700",
      color: colors.text,
    },
    shipsLogSubtitle: {
      fontSize: scale(12),
      color: colors.textDim,
      marginTop: 2,
    },
    shipsLogChevron: {
      fontSize: scale(28),
      fontWeight: "300",
      paddingHorizontal: 4,
    },
    annualReportCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gap,
      gap: tokens.gapSm + 4,
    },
    annualReportGlyph: {
      fontSize: scale(30),
    },
    annualReportTextBlock: {
      flex: 1,
      marginLeft: 6,
    },
    annualReportTitle: {
      fontSize: scale(16),
      fontWeight: "700",
      color: colors.text,
    },
    annualReportSubtitle: {
      fontSize: scale(12),
      color: colors.textDim,
      marginTop: 2,
    },
  });
};

export default BridgeScreen;
