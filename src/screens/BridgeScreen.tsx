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
  HOLDINGS_CATEGORIES,
  categorySupportsHoldings,
  categoryIsPureHoldings,
  CachedQuote,
  Debt,
  Holding,
  HoldingsSettings,
  NetWorthSnapshot,
  SavingsGoal,
  BudgetEntry,
} from "../types";
import { getBudgetEntries } from "../storage/budgetStorage";
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
  collectSymbols,
  holdingMarketValue,
  holdingsTotalValue,
  holdingGainLoss,
  holdingKind,
  isValidSymbol,
  normalizeSymbol,
  accountHoldingsValue,
  isQuoteRefreshDue,
  QUOTE_REFRESH_INTERVAL_MS,
} from "../utils/holdingsMath";
import { syncNetWorthSnapshot } from "../storage/netWorthSnapshotStorage";
import { getAccountValueHistory } from "../storage/accountValueSnapshotStorage";
import {
  ACCOUNT_CHANGE_PERIODS,
  changeSince,
  combineChanges,
  computeAccountValues,
  getDayKey,
  shiftDayKey,
  type AccountChange,
  type AccountChangePeriodKey,
  type AccountValueHistory,
  type CombinedChange,
} from "../utils/accountValueHistory";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { DensityTokens } from "../theme/density";
import { useCurrency } from "../currency/CurrencyProvider";
import { useTabCoachmark } from "../onboarding/useTabCoachmark";
import { useCoachmarkAnchor } from "../onboarding/CoachmarkAnchorContext";
import type { ThemeColors } from "../theme/themes";
import { calculateNetWorthTotals } from "../utils/netWorth";
import { applyAndPersistMissedContributions } from "../utils/linkedAccountRecurringApply";
import { applyEmergencyFundContribution } from "../utils/savingsGoals";
import { isEntryActiveInMonth } from "../utils/recurrence";
import DonutChart, { type DonutSlice } from "../components/DonutChart";
import { KeyboardAwareModalOverlay } from "../components/KeyboardAwareModalOverlay";
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

/** Default broker that pre-broker (orphaned) holdings get migrated into. */
const DEFAULT_BROKER_NAME = "My Holdings";

/**
 * One editable holding row inside the broker (holdings account) modal. `id` is
 * set for rows that map to an existing Holding; new rows leave it undefined
 * until save assigns one. `key` is a stable React list key independent of id.
 *
 * `kind` picks the layout/fields:
 *   - "ticker": a stock/ETF/crypto by symbol + shares (+ optional cost).
 *   - "fund":   a 401k fund with no public ticker - a name + current value,
 *     plus an OPTIONAL proxy ticker (e.g. VOO) entered in `symbol`. With a
 *     proxy it becomes a proxy-tracked holding (value drifts with the index);
 *     without one it's a manual fixed value.
 */
type TickerDraft = {
  key: string;
  id?: string;
  kind: "ticker" | "fund";
  symbol: string;
  shares: string;
  costBasis: string;
  /** Fund label, e.g. "Spartan 500 Index Pool Class D" (kind === "fund"). */
  name: string;
  /** Fund's current value in display currency (kind === "fund"). */
  value: string;
};

const BridgeScreen: React.FC = () => {
  const { colors, showAmbientBackground } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency, formatCompactCurrency, preference, rates } = useCurrency();
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
  const [accountValueHistory, setAccountValueHistory] = useState<AccountValueHistory>({});
  // Window the rise/drop deltas compare against. 30D matches the net-worth
  // history card's default range.
  const [changePeriod, setChangePeriod] = useState<AccountChangePeriodKey>("30D");
  const [keelTarget, setKeelTarget] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const [showHoldingsDisclosure, setShowHoldingsDisclosure] = useState(false);
  // Count of holding records in storage even while the feature is off, so we
  // can nudge a device whose partner shared holdings it can't yet see.
  const [syncedHoldingsCount, setSyncedHoldingsCount] = useState(0);
  const [quotesLastFetchedAt, setQuotesLastFetchedAt] = useState<string | null>(
    null
  );
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  // Outcome of the last manual price refresh that needs explaining (a failure
  // or a server-side throttle). Cleared on the next attempt or a fresh load -
  // a successful update speaks for itself through the prices/labels.
  const [priceRefreshNotice, setPriceRefreshNotice] = useState<string | null>(null);

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
    // The sync above also just recorded today's per-account values; reload
    // the history so the rise/drop deltas include this capture.
    setAccountValueHistory(await getAccountValueHistory());
    return nextSnapshots;
  }, []);

  /**
   * Load holdings + cached prices into screen state. Reads the opt-in flag
   * first: when the feature is off, holdings/quotes stay empty so they
   * contribute nothing to net worth and the UI shows the teaser instead.
   *
   * This NEVER hits the network - it only reads the per-device cache. Pulling
   * fresh prices is an explicit user action (the "Update prices" button) so
   * that adding several tickers in a row doesn't spend the daily fetch window
   * on a partial set. See `refreshPricesManually`.
   */
  /**
   * One-time repair for holdings created under the old flat model: they carry
   * no accountId, so they have no broker to display under - their value still
   * counts in the Investment total, but the position itself is invisible and
   * can't be edited or deleted. Attach any such orphan (including one pointing
   * at a since-deleted account) to a default "My Holdings" broker so it shows
   * up and can be edited or moved. Idempotent: a no-op once every holding has a
   * valid broker.
   */
  const migrateOrphanHoldings = useCallback(async () => {
    const settings = await getHoldingsSettings();
    if (!settings.enabled) return;

    const [accounts, holdings] = await Promise.all([
      getAssetAccounts(),
      getHoldings(),
    ]);
    // A holding is "homed" if it points at any holdings-capable account
    // (Investment, Retirement, or HSA) - not just an Investment broker.
    const holdingsAccountIds = new Set(
      accounts.filter((a) => categorySupportsHoldings(a.category)).map((a) => a.id)
    );
    const isOrphan = (h: Holding) =>
      !h.accountId || !holdingsAccountIds.has(h.accountId);
    if (!holdings.some(isOrphan)) return;

    const now = new Date().toISOString();
    let broker: AssetAccount | undefined = accounts.find(
      (a) => a.category === "investment" && a.name === DEFAULT_BROKER_NAME
    );
    if (!broker) {
      broker = {
        id: generateUUID(),
        name: DEFAULT_BROKER_NAME,
        category: "investment",
        balance: 0,
        createdAt: now,
        updatedAt: now,
      };
      await saveAssetAccounts([...accounts, broker]);
    }
    const brokerId = broker.id;
    const nextHoldings = holdings.map((h) =>
      isOrphan(h) ? { ...h, accountId: brokerId, updatedAt: now } : h
    );
    await saveHoldings(nextHoldings);
  }, []);

  const loadHoldingsState = useCallback(async (): Promise<HoldingsSettings> => {
    const settings = await getHoldingsSettings();
    setHoldingsSettings(settings);
    // A refresh notice describes a past attempt; don't let it survive a reload.
    setPriceRefreshNotice(null);
    if (!settings.enabled) {
      setHoldings([]);
      setQuotes({});
      setQuotesLastFetchedAt(null);
      // Still read the stored count: holdings sync to this device regardless
      // of the opt-in, so we can surface a nudge when a partner shared some.
      const stored = await getHoldings();
      setSyncedHoldingsCount(stored.length);
      return settings;
    }
    const cache = await getQuoteCache();
    setQuotes(cache.quotes);
    setQuotesLastFetchedAt(cache.lastFetchedAt);
    const live = await getHoldings();
    setHoldings(live);
    setSyncedHoldingsCount(live.length);
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
          // Repair any pre-broker (orphaned) holdings before the loads below so
          // the freshly-created default broker + reassigned holdings are picked
          // up by this same pass. No-op after the first run.
          await migrateOrphanHoldings();
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
          // Apply + persist missed recurring contributions via the shared
          // shell - it owns the save-order invariant that prevents
          // double-crediting (see linkedAccountRecurringApply.ts).
          // BudgetScreen goes through the same shell.
          const processed = await applyAndPersistMissedContributions(
            storedEntries,
            storedAssets
          );
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
          setAccountValueHistory({});
          setKeelTarget(0);
        }
        if (!cancelled) setIsLoaded(true);
      };

      loadBridgeData();
      return () => {
        cancelled = true;
      };
    }, [loadHoldingsState, migrateOrphanHoldings, refreshNetWorthSnapshots])
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

  // Convert holdings (quoted in their own currency - USD for US listings, the
  // pair's quote side for crypto) into the user's display currency, so they
  // sum correctly with the already-localized stored balances.
  const holdingValueOpts = useMemo(
    () => ({ displayCurrency: preference.currencyCode, rates }),
    [preference.currencyCode, rates]
  );

  /**
   * Rise/drop per account over the selected window, keyed by account id:
   * today's live value (cash + priced holdings, same math the rows display)
   * against the recorded daily history. Null = nothing recorded before today
   * yet. Category headers sum these via combineChanges.
   */
  const accountChanges = useMemo(() => {
    const period =
      ACCOUNT_CHANGE_PERIODS.find((p) => p.key === changePeriod) ??
      ACCOUNT_CHANGE_PERIODS[2];
    const today = getDayKey(new Date());
    const cutoff = shiftDayKey(today, -period.days);
    const values = computeAccountValues(assetAccounts, holdings, quotes, holdingValueOpts);
    const changes = new Map<string, AccountChange | null>();
    for (const account of assetAccounts) {
      changes.set(
        account.id,
        changeSince(accountValueHistory[account.id], values[account.id], cutoff, today)
      );
    }
    return changes;
  }, [assetAccounts, holdings, quotes, holdingValueOpts, accountValueHistory, changePeriod]);

  const hasAnyChangeData = useMemo(() => {
    for (const change of accountChanges.values()) {
      if (change !== null) return true;
    }
    return false;
  }, [accountChanges]);

  /**
   * One rise/drop line: "▲ +$120.50 (2.1%)" in success green, "▼ -$45.00
   * (0.8%)" in danger red, a muted "±$0.00" when flat, nothing when there's
   * no baseline yet.
   */
  const renderChange = (change: CombinedChange | null) => {
    if (!change) return null;
    const rising = change.amount >= 0.005;
    const dropping = change.amount <= -0.005;
    const color = rising ? colors.success : dropping ? colors.danger : colors.textMuted;
    const arrow = rising ? "▲ +" : dropping ? "▼ -" : "±";
    const pct =
      change.percent != null && (rising || dropping)
        ? ` (${Math.abs(change.percent).toFixed(1)}%)`
        : "";
    return (
      <Text style={[styles.accountChangeText, { color }]}>
        {arrow}
        {formatCurrency(Math.abs(change.amount))}
        {pct}
      </Text>
    );
  };

  const netWorthTotals = useMemo(
    () =>
      calculateNetWorthTotals({
        entries,
        debts,
        savingsGoals,
        assetAccounts,
        holdings,
        quotes,
        displayCurrency: preference.currencyCode,
        rates,
      }),
    [
      assetAccounts,
      debts,
      entries,
      holdings,
      quotes,
      savingsGoals,
      preference.currencyCode,
      rates,
    ]
  );

  /**
   * Total market value of all priced holdings across every holdings-capable
   * category (Investment, Retirement, HSA). Used for the global tracked total.
   */
  const holdingsValue = useMemo(
    () => holdingsTotalValue(holdings, quotes, holdingValueOpts),
    [holdings, quotes, holdingValueOpts]
  );

  /**
   * Per-category data for the holdings-capable sections (Investment,
   * Retirement, HSA). Each entry carries the category's accounts (brokers /
   * providers) and its section total. Pure-holdings categories total their
   * tickers only; HSA adds each account's cash balance to its holdings value.
   */
  const holdingsCategoryData = useMemo(() => {
    return HOLDINGS_CATEGORIES.map((category) => {
      const accounts = assetAccounts.filter((a) => a.category === category);
      // hasCash drives whether the cash balance is shown/editable (HSA only).
      // The stored balance is always counted in totals regardless, so any
      // legacy cash on a pure-holdings account stays consistent with net worth.
      const hasCash = !categoryIsPureHoldings(category);
      const total = accounts.reduce((sum, account) => {
        const positions = accountHoldingsValue(account.id, holdings, quotes, holdingValueOpts);
        return sum + positions + account.balance;
      }, 0);
      return { category, accounts, hasCash, total };
    });
  }, [assetAccounts, holdings, quotes, holdingValueOpts]);

  /** Whether a manual price refresh is allowed yet (daily window). */
  // eslint-disable-next-line react-hooks/purity -- reading the clock during render is intentional; the daily-window check only needs re-render-level freshness
  const priceRefreshDue = isQuoteRefreshDue(quotesLastFetchedAt, Date.now());
  /**
   * Whether anything is actually priceable. A portfolio of only manual-value
   * funds has no tickers to fetch, so the update button would be a no-op -
   * hide it rather than let it silently do nothing.
   */
  const hasFetchableSymbols = useMemo(() => collectSymbols(holdings).length > 0, [holdings]);
  /** Human label for how long until the next refresh is allowed (interval-aware). */
  const nextRefreshLabel = useMemo(() => {
    if (!quotesLastFetchedAt) return "";
    const last = new Date(quotesLastFetchedAt).getTime();
    if (!Number.isFinite(last)) return "";
    // eslint-disable-next-line react-hooks/purity -- reading the clock during render is intentional; the countdown label only needs re-render-level freshness
    const msLeft = last + QUOTE_REFRESH_INTERVAL_MS - Date.now();
    if (msLeft <= 0) return "";
    const hours = Math.ceil(msLeft / (60 * 60 * 1000));
    if (hours < 24) return `Next update in ${hours}h`;
    const days = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    return `Next update in ${days}d`;
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
    // Holdings categories (Investment/Retirement/HSA) render in their own
    // broker-style sections, so exclude them from the plain balance list.
    return ASSET_ACCOUNT_CATEGORIES.filter((category) => !categorySupportsHoldings(category))
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
    // Each holdings category shows as one slice valued by its section total
    // (tickers, plus cash for HSA).
    for (const data of holdingsCategoryData) {
      if (data.total > 0) {
        slices.push({
          label: data.category,
          value: data.total,
          color: assetCategoryColors[data.category],
        });
      }
    }
    return slices;
  }, [accountsByCategory, assetCategoryColors, holdingsCategoryData]);

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

  /**
   * Open the modal pre-set to a new holdings-capable account (a broker for
   * Investment/Retirement, a provider for HSA). The category drives whether the
   * cash-balance field and/or ticker editor show.
   */
  const openAddHoldingsAccountModal = useCallback((category: AssetAccountCategory) => {
    setEditingAsset(null);
    setAssetName("");
    setAssetBalance("");
    setAssetCategory(category);
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
          .map((h) => {
            const kind = holdingKind(h);
            const isFund = kind !== "ticker";
            return {
              key: h.id,
              id: h.id,
              kind: isFund ? "fund" : "ticker",
              // A proxy fund keeps its proxy ticker in `symbol`; a manual fund
              // has none. A plain ticker uses `symbol` as usual.
              symbol: kind === "manual" ? "" : h.symbol,
              shares: kind === "ticker" ? String(h.shares) : "",
              costBasis: h.costBasis != null ? String(h.costBasis) : "",
              name: h.name ?? "",
              // Show the last entered (anchor/manual) value; re-saving re-anchors.
              value:
                kind === "proxy"
                  ? String(h.anchorValue ?? "")
                  : kind === "manual"
                    ? String(h.manualValue ?? "")
                    : "",
            } satisfies TickerDraft;
          })
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
      { key: generateUUID(), kind: "ticker", symbol: "", shares: "", costBasis: "", name: "", value: "" },
    ]);
  }, [holdingsSettings.disclosureAcknowledged, holdingsSettings.enabled]);

  /**
   * Add a "fund" row for a 401k holding with no public ticker (e.g. a Spartan
   * 500 CIT). Same off-device disclosure gate as a ticker, since attaching a
   * proxy symbol sends that symbol to the quote proxy.
   */
  const addFundRow = useCallback(() => {
    if (!holdingsSettings.enabled && !holdingsSettings.disclosureAcknowledged) {
      setShowHoldingsDisclosure(true);
      return;
    }
    setBrokerTickers((prev) => [
      ...prev,
      { key: generateUUID(), kind: "fund", symbol: "", shares: "", costBasis: "", name: "", value: "" },
    ]);
  }, [holdingsSettings.disclosureAcknowledged, holdingsSettings.enabled]);

  const updateTickerRow = useCallback(
    (
      key: string,
      field: "symbol" | "shares" | "costBasis" | "name" | "value",
      value: string,
    ) => {
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
   * manual so adding several tickers doesn't burn the daily window.
   */
  const saveAsset = useCallback(async () => {
    const name = assetName.trim();
    if (!name) return;

    const isPureHoldings = categoryIsPureHoldings(assetCategory);
    const hasHoldings = categorySupportsHoldings(assetCategory);
    const parsedBalance = parseFloat(assetBalance);
    if (!isPureHoldings && (Number.isNaN(parsedBalance) || parsedBalance < 0)) return;
    // Pure-holdings accounts (Investment/Retirement) have no cash-balance field;
    // new ones start at 0, but preserve any existing balance (e.g. a legacy 401k
    // tracked as a plain balance) rather than silently zeroing it. HSA edits its
    // cash balance directly.
    const balance = isPureHoldings
      ? editingAsset?.balance ?? 0
      : parsedBalance;

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

    if (hasHoldings) {
      const parseCost = (raw: string): number | undefined => {
        const t = raw.trim();
        const n = t === "" ? NaN : parseFloat(t);
        return Number.isFinite(n) && n >= 0 ? n : undefined;
      };

      // Resolve each editor row into the holding shape for its kind. Invalid
      // rows (missing required inputs) drop out. A "fund" row becomes a
      // proxy-tracked holding when it carries a valid proxy ticker, else a
      // manual fixed-value holding.
      type ResolvedRow = {
        id?: string;
        kind: "ticker" | "proxy" | "manual";
        symbol: string;
        shares: number;
        costBasis?: number;
        name?: string;
        value: number;
      };

      const rows: ResolvedRow[] = brokerTickers
        .map((row): ResolvedRow | null => {
          const costBasis = parseCost(row.costBasis);
          if (row.kind === "fund") {
            const fundName = row.name.trim();
            const value = parseFloat(row.value);
            if (!fundName || !Number.isFinite(value) || value < 0) return null;
            const proxy = normalizeSymbol(row.symbol);
            const hasProxy = proxy !== "" && isValidSymbol(proxy);
            return {
              id: row.id,
              kind: hasProxy ? "proxy" : "manual",
              symbol: hasProxy ? proxy : "",
              shares: 0,
              costBasis,
              name: fundName,
              value,
            };
          }
          const symbol = normalizeSymbol(row.symbol);
          const shares = parseFloat(row.shares);
          if (!isValidSymbol(symbol) || !Number.isFinite(shares) || shares <= 0) {
            return null;
          }
          return { id: row.id, kind: "ticker", symbol, shares, costBasis, value: 0 };
        })
        .filter((r): r is ResolvedRow => r !== null);

      // Build the mutable holding fields for a resolved row. For a proxy row we
      // capture the proxy's current price as the anchor, but only re-anchor
      // when the value or proxy actually changed - an incidental save must not
      // reset accrued drift.
      type HoldingFields = {
        symbol: string;
        shares: number;
        name?: string;
        costBasis?: number;
        manualValue?: number;
        anchorValue?: number;
        anchorPrice?: number;
      };
      const fieldsFor = (r: ResolvedRow, existing?: Holding): HoldingFields => {
        if (r.kind === "manual") {
          return {
            symbol: "",
            shares: 0,
            name: r.name,
            costBasis: r.costBasis,
            manualValue: r.value,
            anchorValue: undefined,
            anchorPrice: undefined,
          };
        }
        if (r.kind === "proxy") {
          const unchanged =
            existing != null &&
            holdingKind(existing) === "proxy" &&
            normalizeSymbol(existing.symbol) === r.symbol &&
            existing.anchorValue === r.value;
          let anchorPrice = existing && unchanged ? existing.anchorPrice : undefined;
          if (!unchanged) {
            const px = quotes[r.symbol]?.price;
            anchorPrice =
              typeof px === "number" && Number.isFinite(px) && px > 0 ? px : undefined;
          }
          return {
            symbol: r.symbol,
            shares: 0,
            name: r.name,
            costBasis: r.costBasis,
            manualValue: undefined,
            anchorValue: r.value,
            anchorPrice,
          };
        }
        return {
          symbol: r.symbol,
          shares: r.shares,
          name: undefined,
          costBasis: r.costBasis,
          manualValue: undefined,
          anchorValue: undefined,
          anchorPrice: undefined,
        };
      };

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
          return row ? { ...h, ...fieldsFor(row, h), updatedAt: now } : h;
        })
        .filter((h) => !(h.accountId === accountId && !keptIds.has(h.id)));

      const created: Holding[] = rows
        .filter((r) => !r.id)
        .map((r): Holding => ({
          id: generateUUID(),
          accountId,
          createdAt: now,
          updatedAt: now,
          ...fieldsFor(r),
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
    quotes,
    refreshAchievements,
    refreshNetWorthSnapshots,
  ]);

  const deleteAsset = useCallback(
    async (account: AssetAccount) => {
      // Soft-delete so the partner's next sync removes this account locally.
      const nextAccounts = await deleteAssetAccount(account.id);
      setAssetAccounts(nextAccounts);
      // Deleting a holdings account also tombstones its holdings - they have no
      // home without it.
      if (categorySupportsHoldings(account.category)) {
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
   * The only path that reaches out to the quote proxy. The UI still greys the
   * button until the daily window opens, but an explicit tap forces the
   * attempt (`force: true`) so a stale UI/storage disagreement can never eat
   * the tap - the Worker's per-device throttle remains the cost gate. Every
   * non-success outcome is surfaced via `priceRefreshNotice`; a silent
   * failure here once looked identical to a dead button.
   */
  const refreshPricesManually = useCallback(async () => {
    if (isRefreshingPrices || !holdingsSettings.enabled) return;
    setIsRefreshingPrices(true);
    setPriceRefreshNotice(null);
    try {
      const result = await refreshQuotes({ force: true });
      setQuotes(result.cache.quotes);
      setQuotesLastFetchedAt(result.cache.lastFetchedAt);
      setHoldings(await getHoldings());
      if (result.outcome === "unavailable") {
        setPriceRefreshNotice(
          "Couldn't update prices right now. Check your connection and try again in a few minutes."
        );
      } else if (result.outcome === "rate-limited") {
        setPriceRefreshNotice("Prices were already updated today.");
      } else if (result.outcome === "partial") {
        // The price service fetches a limited batch per minute; the rest are
        // warming up server-side. The button stays enabled for the follow-up.
        const count = result.pending?.length ?? 0;
        setPriceRefreshNotice(
          count > 0
            ? `Updated most prices - still fetching ${count} ${count === 1 ? "ticker" : "tickers"}. Tap again in a few minutes to finish.`
            : "Updated most prices - tap again in a few minutes to finish."
        );
      }
    } catch {
      setPriceRefreshNotice(
        "Couldn't update prices right now. Check your connection and try again in a few minutes."
      );
    } finally {
      setIsRefreshingPrices(false);
    }
  }, [holdingsSettings.enabled, isRefreshingPrices]);

  const enableHoldings = useCallback(async () => {
    const settings = await setHoldingsEnabled(true);
    setHoldingsSettings(settings);
    setShowHoldingsDisclosure(false);
    // If a holdings account modal is open, drop in a blank ticker row so the
    // user can keep going right where they left off.
    if (showAssetModal && categorySupportsHoldings(assetCategory)) {
      setBrokerTickers((prev) => [
        ...prev,
        { key: generateUUID(), kind: "ticker", symbol: "", shares: "", costBasis: "", name: "", value: "" },
      ]);
    }
    await loadHoldingsState();
  }, [assetCategory, loadHoldingsState, showAssetModal]);

  /**
   * Entry point for the "partner shared holdings" nudge: enable straight away
   * if the off-device disclosure was already accepted, otherwise show it first.
   */
  const promptEnableHoldings = useCallback(() => {
    if (holdingsSettings.disclosureAcknowledged) {
      void enableHoldings();
    } else {
      setShowHoldingsDisclosure(true);
    }
  }, [enableHoldings, holdingsSettings.disclosureAcknowledged]);

  const handleEfContribution = useCallback(async () => {
    // Shared pure update (utils/savingsGoals) - BudgetScreen runs the same
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

            {assetAccounts.length > 0 ? (
              <View style={styles.changePeriodRow}>
                <Text style={[styles.changePeriodLabel, { color: colors.textMuted }]}>
                  Change
                </Text>
                <View style={styles.changePeriodChips}>
                  {ACCOUNT_CHANGE_PERIODS.map((option) => {
                    const isSelected = changePeriod === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.changePeriodChip,
                          {
                            borderColor: isSelected ? colors.accent : colors.cardBorder,
                            backgroundColor: isSelected ? `${colors.accent}20` : colors.bg,
                          },
                        ]}
                        onPress={() => setChangePeriod(option.key)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Show ${option.label} change`}
                      >
                        <Text
                          style={[
                            styles.changePeriodChipText,
                            { color: isSelected ? colors.accent : colors.textDim },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
            {assetAccounts.length > 0 && !hasAnyChangeData ? (
              <Text style={[styles.changeTrackingHint, { color: colors.textMuted }]}>
                Tracking starts today - rise/drop appears after the next visit.
              </Text>
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
                    <View style={styles.accountRowRight}>
                      <Text style={[styles.accountCategoryHeaderTotal, { color: colors.success }]}>
                        {formatCurrency(group.total)}
                      </Text>
                      {renderChange(
                        combineChanges(
                          group.accounts.map((a) => accountChanges.get(a.id) ?? null)
                        )
                      )}
                    </View>
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
                          <View style={styles.accountRowRight}>
                            <Text style={[styles.accountBalance, { color: colors.success }]}>
                              {formatCurrency(account.balance)}
                            </Text>
                            {renderChange(accountChanges.get(account.id) ?? null)}
                          </View>
                        </TouchableOpacity>
                      ))
                    : null}
                </View>
              );
            })}

            {!holdingsSettings.enabled && syncedHoldingsCount > 0 ? (
              <TouchableOpacity
                style={styles.holdingsNudge}
                onPress={promptEnableHoldings}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Enable Live Holdings to see shared holdings"
              >
                <Text style={[styles.holdingsNudgeTitle, { color: colors.text }]}>
                  📈 Holdings shared with you
                </Text>
                <Text style={[styles.holdingsNudgeText, { color: colors.textDim }]}>
                  {syncedHoldingsCount} {syncedHoldingsCount === 1 ? "position" : "positions"} synced from your partner. Turn on Live Holdings to see them and include their value in your net worth.
                </Text>
                <Text style={[styles.holdingsNudgeCta, { color: colors.accent }]}>
                  Enable Live Holdings ›
                </Text>
              </TouchableOpacity>
            ) : null}

            {holdingsCategoryData.map((section) => {
              if (section.accounts.length === 0) return null;
              const isCollapsed = collapsedAccountCategories.has(section.category);
              const sectionColor = assetCategoryColors[section.category];
              const addLabel =
                section.category === "hsa" ? "+ Add HSA account" : "+ Add broker";
              return (
                <View key={section.category}>
                  <TouchableOpacity
                    style={styles.accountCategoryHeader}
                    onPress={() => toggleAccountCategory(section.category)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: sectionColor }]} />
                    <Text style={[styles.accountCategoryChevron, { color: colors.textDim }]}>
                      {isCollapsed ? "▶" : "▼"}
                    </Text>
                    <Text style={[styles.accountCategoryHeaderText, { color: colors.text }]}>
                      {iconForCategory(section.category)} {ASSET_ACCOUNT_CATEGORY_LABELS[section.category]}
                    </Text>
                    <View style={styles.accountRowRight}>
                      <Text style={[styles.accountCategoryHeaderTotal, { color: colors.success }]}>
                        {formatCurrency(section.total)}
                      </Text>
                      {renderChange(
                        combineChanges(
                          section.accounts.map((a) => accountChanges.get(a.id) ?? null)
                        )
                      )}
                    </View>
                  </TouchableOpacity>

                  {!isCollapsed ? (
                    <>
                      {section.accounts.map((broker) => {
                        const brokerH = holdings.filter((h) => h.accountId === broker.id);
                        const positionsValue = accountHoldingsValue(broker.id, holdings, quotes, holdingValueOpts);
                        const brokerTotal = positionsValue + broker.balance;
                        const isOpen = expandedBrokers.has(broker.id);
                        // HSA always shows a Cash line; pure-holdings accounts show
                        // one only if they carry a legacy balance, so the total is
                        // never an unexplained number.
                        const showCashRow = section.hasCash || broker.balance > 0;
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
                              <View style={styles.accountRowRight}>
                                <Text style={[styles.accountBalance, { color: colors.success }]}>
                                  {formatCurrency(brokerTotal)}
                                </Text>
                                {renderChange(accountChanges.get(broker.id) ?? null)}
                              </View>
                              <TouchableOpacity
                                onPress={() => openEditAssetModal(broker)}
                                accessibilityRole="button"
                                accessibilityLabel={`Edit ${broker.name}`}
                              >
                                <Text style={[styles.brokerEditBtn, { color: colors.accent }]}>Edit</Text>
                              </TouchableOpacity>
                            </View>

                            {isOpen ? (
                              <>
                                {/* HSA shows its uninvested cash; pure-holdings
                                    accounts show a Cash line only for legacy balances. */}
                                {showCashRow ? (
                                  <View style={[styles.accountRow, styles.brokerHoldingRow]}>
                                    <View style={styles.accountRowLeft}>
                                      <Text style={styles.accountName} numberOfLines={1}>Cash</Text>
                                    </View>
                                    <Text style={[styles.accountBalance, { color: colors.success }]}>
                                      {formatCurrency(broker.balance)}
                                    </Text>
                                  </View>
                                ) : null}
                                {brokerH.length === 0
                                  ? showCashRow
                                    ? null
                                    : (
                                      <Text style={[styles.accountCategory, styles.brokerHoldingRow]}>
                                        No holdings yet - tap Edit to add tickers.
                                      </Text>
                                    )
                                  : brokerH.map((h) => {
                                      const symbol = normalizeSymbol(h.symbol);
                                      const kind = holdingKind(h);
                                      const value = holdingMarketValue(h, quotes, holdingValueOpts);
                                      const gainLoss = holdingGainLoss(h, quotes, holdingValueOpts);
                                      // Ticker rows need a live quote to show a value; manual/proxy
                                      // funds always have one (entered or anchored).
                                      const hasValue = kind === "ticker" ? !!quotes[symbol] : true;
                                      const label =
                                        kind === "ticker" ? symbol : h.name || symbol || "Fund";
                                      const subtitle =
                                        kind === "ticker"
                                          ? `${h.shares} ${h.shares === 1 ? "share" : "shares"}`
                                          : kind === "proxy"
                                            ? `Tracks ${symbol}`
                                            : "Manual value";
                                      return (
                                        <TouchableOpacity
                                          key={h.id}
                                          style={[styles.accountRow, styles.brokerHoldingRow]}
                                          onPress={() => openEditAssetModal(broker)}
                                          activeOpacity={0.7}
                                        >
                                          <View style={styles.accountRowLeft}>
                                            <Text style={styles.accountName} numberOfLines={1}>{label}</Text>
                                            <Text style={styles.accountCategory} numberOfLines={1}>
                                              {subtitle}
                                              {gainLoss != null
                                                ? ` · ${gainLoss >= 0 ? "+" : "-"}${formatCurrency(Math.abs(gainLoss))}`
                                                : ""}
                                            </Text>
                                          </View>
                                          <Text style={[styles.accountBalance, { color: hasValue ? colors.success : colors.textMuted }]}>
                                            {hasValue ? formatCurrency(value) : "--"}
                                          </Text>
                                        </TouchableOpacity>
                                      );
                                    })}
                              </>
                            ) : null}
                          </View>
                        );
                      })}

                      <TouchableOpacity
                        style={[styles.accountRow, styles.accountRowNested]}
                        onPress={() => openAddHoldingsAccountModal(section.category)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.accountsAddBtn, { color: colors.accent }]}>{addLabel}</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              );
            })}

            {/* One global price-refresh row covering every holdings category. */}
            {holdingsSettings.enabled && holdings.length > 0 && hasFetchableSymbols ? (
              <>
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
                          : nextRefreshLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
                {priceRefreshNotice ? (
                  <Text style={[styles.holdingsAsOf, styles.priceRefreshNotice, { color: colors.warning }]}>
                    {priceRefreshNotice}
                  </Text>
                ) : null}
              </>
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
        <KeyboardAwareModalOverlay style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingAsset ? "Edit Account" : "Add Account"}</Text>
            <Text style={styles.modalSub}>
              {assetCategory === "hsa"
                ? "Track your HSA cash balance and any stocks or ETFs it holds."
                : categoryIsPureHoldings(assetCategory)
                  ? "Add the broker and the stocks or ETFs it holds. Its value comes from the holdings."
                  : "Track a balance that will feed your net worth history."}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder={
                categoryIsPureHoldings(assetCategory)
                  ? "Broker name (e.g. Fidelity)"
                  : assetCategory === "hsa"
                    ? "HSA provider (e.g. Fidelity)"
                    : "Account name"
              }
              placeholderTextColor={colors.textMuted}
              value={assetName}
              onChangeText={setAssetName}
            />

            {!categoryIsPureHoldings(assetCategory) ? (
              <TextInput
                style={styles.modalInput}
                placeholder={assetCategory === "hsa" ? "Cash balance" : "Balance"}
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

            {categorySupportsHoldings(assetCategory) ? (
              <View style={styles.tickerEditor}>
                <Text style={styles.modalHint}>
                  Add stocks/ETFs by ticker (AAPL) or crypto by pair (BTC/USD). For a 401k fund with no ticker (e.g. Spartan 500 Index Pool), use Add 401k fund. Symbols are sent to the price service only when you tap Update prices - add them all first, then pull prices once.
                </Text>
                <ScrollView
                  style={styles.tickerList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {brokerTickers.map((row) => {
                    if (row.kind === "fund") {
                      const proxy = normalizeSymbol(row.symbol);
                      const tracksIndex = proxy !== "" && isValidSymbol(proxy);
                      return (
                        <View key={row.key} style={styles.tickerFundRow}>
                          <View style={styles.tickerFundTopRow}>
                            <TextInput
                              style={[styles.modalInput, styles.tickerFundNameInput]}
                              placeholder="Fund name (e.g. Spartan 500 Index Pool)"
                              placeholderTextColor={colors.textMuted}
                              autoCapitalize="words"
                              value={row.name}
                              onChangeText={(t) => updateTickerRow(row.key, "name", t)}
                            />
                            <TouchableOpacity
                              onPress={() => removeTickerRow(row.key)}
                              accessibilityRole="button"
                              accessibilityLabel="Remove fund"
                            >
                              <Text style={[styles.tickerRemove, { color: colors.danger }]}>✕</Text>
                            </TouchableOpacity>
                          </View>
                          <View style={styles.tickerFundBottomRow}>
                            <TextInput
                              style={[styles.modalInput, styles.tickerFundProxyInput]}
                              placeholder="Track index (optional, e.g. VOO)"
                              placeholderTextColor={colors.textMuted}
                              autoCapitalize="characters"
                              autoCorrect={false}
                              value={row.symbol}
                              onChangeText={(t) => updateTickerRow(row.key, "symbol", t)}
                            />
                            <TextInput
                              style={[styles.modalInput, styles.tickerFundValueInput]}
                              placeholder="Current value"
                              placeholderTextColor={colors.textMuted}
                              keyboardType="decimal-pad"
                              value={row.value}
                              onChangeText={(t) => updateTickerRow(row.key, "value", t)}
                            />
                          </View>
                          <Text style={styles.tickerFundHint}>
                            {tracksIndex
                              ? `Rides ${proxy} between updates - re-enter the value from each statement to re-anchor.`
                              : "No index - holds the value you enter until you change it."}
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <View key={row.key} style={styles.tickerRow}>
                        <TextInput
                          style={[styles.modalInput, styles.tickerSymbolInput]}
                          placeholder="AAPL or BTC/USD"
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
                    );
                  })}
                </ScrollView>
                <View style={styles.tickerAddRow}>
                  <TouchableOpacity onPress={addTickerRow} style={styles.tickerAddBtn}>
                    <Text style={[styles.accountsAddBtn, { color: colors.accent }]}>+ Add ticker</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={addFundRow} style={styles.tickerAddBtn}>
                    <Text style={[styles.accountsAddBtn, { color: colors.accent }]}>+ Add 401k fund</Text>
                  </TouchableOpacity>
                </View>
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
        </KeyboardAwareModalOverlay>
      </Modal>

      <Modal
        visible={showEfContribModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEfContribModal(false)}
      >
        <KeyboardAwareModalOverlay style={styles.modalOverlay}>
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
        </KeyboardAwareModalOverlay>
      </Modal>

      <Modal
        visible={showHoldingsDisclosure}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHoldingsDisclosure(false)}
      >
        <KeyboardAwareModalOverlay style={styles.modalOverlay}>
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
        </KeyboardAwareModalOverlay>
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
    // Right-aligned value + rise/drop stack used by category headers,
    // account rows, and broker rows.
    accountRowRight: {
      alignItems: "flex-end",
    },
    accountChangeText: {
      fontSize: scale(10),
      fontWeight: "600",
      fontVariant: ["tabular-nums"] as any,
      marginTop: 1,
    },
    changePeriodRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: tokens.gapSm,
    },
    changePeriodLabel: {
      fontSize: scale(11),
      fontWeight: "600",
    },
    changePeriodChips: {
      flexDirection: "row",
      gap: 8,
    },
    changePeriodChip: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    changePeriodChipText: {
      fontSize: scale(11),
      fontWeight: "700",
    },
    changeTrackingHint: {
      fontSize: scale(11),
      marginBottom: tokens.gapSm,
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
    priceRefreshNotice: {
      paddingLeft: 28,
      paddingTop: 2,
    },
    holdingsNudge: {
      borderWidth: 1,
      borderColor: `${colors.accent}40`,
      backgroundColor: `${colors.accent}10`,
      borderRadius: 12,
      padding: 14,
      marginTop: tokens.gapSm,
      gap: 4,
    },
    holdingsNudgeTitle: {
      fontSize: scale(14),
      fontWeight: "700",
    },
    holdingsNudgeText: {
      fontSize: scale(12),
      lineHeight: scale(17),
    },
    holdingsNudgeCta: {
      fontSize: scale(13),
      fontWeight: "700",
      marginTop: 2,
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
    tickerAddRow: {
      flexDirection: "row",
      gap: tokens.gap,
    },
    tickerFundRow: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: tokens.gapSm,
      marginBottom: tokens.gapSm,
    },
    tickerFundTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    tickerFundBottomRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    tickerFundNameInput: {
      flex: 1,
      marginBottom: tokens.gapSm,
    },
    tickerFundProxyInput: {
      flex: 1.4,
      marginBottom: tokens.gapSm,
    },
    tickerFundValueInput: {
      flex: 1,
      marginBottom: tokens.gapSm,
    },
    tickerFundHint: {
      fontSize: scale(11),
      color: colors.textMuted,
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
