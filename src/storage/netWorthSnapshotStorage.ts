import * as EncryptedStorage from "./encryptedStorage";
import type { NetWorthSnapshot } from "../types";
import { getAssetAccounts } from "./assetAccountStorage";
import { getBudgetEntries } from "./budgetStorage";
import { getDebts } from "./debtStorage";
import { getSavingsGoals } from "./savingsGoalStorage";
import { getHoldings } from "./holdingsStorage";
import { getCachedQuotes } from "./quoteCacheStorage";
import { getHoldingsSettings } from "./holdingsSettingsStorage";
import { getOrCreateUser } from "./userStorage";
import { calculateNetWorthTotals } from "../utils/netWorth";
import { getCurrencyPreferenceOption } from "../utils/currencyPreferences";
import { getStoredRates } from "../utils/exchangeRates";

const STORAGE_KEY = "@budgetark_net_worth_snapshots";
const MAX_SNAPSHOTS = 730;

const getDayKey = (input: string | Date): string => {
  const date = typeof input === "string" ? new Date(input) : input;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Returns the SAME ref when the snapshot is already canonical - the getter
// detects "needs repair" by identity instead of the previous O(n)
// JSON.stringify diff against itself (same treatment budgetStorage's
// entries getter documents).
const normalizeSnapshot = (snapshot: NetWorthSnapshot): NetWorthSnapshot => {
  if (
    snapshot.capturedAt &&
    snapshot.dayKey &&
    Number.isFinite(snapshot.totalAssets) &&
    Number.isFinite(snapshot.totalDebt) &&
    Number.isFinite(snapshot.netWorth)
  ) {
    return snapshot;
  }
  const capturedAt = snapshot.capturedAt || new Date().toISOString();
  return {
    dayKey: snapshot.dayKey || getDayKey(capturedAt),
    capturedAt,
    totalAssets: Number.isFinite(snapshot.totalAssets) ? snapshot.totalAssets : 0,
    totalDebt: Number.isFinite(snapshot.totalDebt) ? snapshot.totalDebt : 0,
    netWorth: Number.isFinite(snapshot.netWorth)
      ? snapshot.netWorth
      : (Number.isFinite(snapshot.totalAssets) ? snapshot.totalAssets : 0) -
        (Number.isFinite(snapshot.totalDebt) ? snapshot.totalDebt : 0),
  };
};

const sortSnapshots = (snapshots: NetWorthSnapshot[]): NetWorthSnapshot[] =>
  [...snapshots].sort((a, b) => a.dayKey.localeCompare(b.dayKey));

// Same ref when already sorted and under the cap; copies only when a repair
// is actually needed.
const pruneSnapshots = (snapshots: NetWorthSnapshot[]): NetWorthSnapshot[] => {
  let alreadySorted = true;
  for (let i = 1; i < snapshots.length; i++) {
    if (snapshots[i - 1].dayKey.localeCompare(snapshots[i].dayKey) > 0) {
      alreadySorted = false;
      break;
    }
  }
  const inOrder = alreadySorted ? snapshots : sortSnapshots(snapshots);
  return inOrder.length > MAX_SNAPSHOTS ? inOrder.slice(-MAX_SNAPSHOTS) : inOrder;
};

const repairSnapshots = (
  parsed: NetWorthSnapshot[]
): { snapshots: NetWorthSnapshot[]; changed: boolean } => {
  let changed = false;
  const normalized = parsed.map((snapshot) => {
    const next = normalizeSnapshot(snapshot);
    if (next !== snapshot) changed = true;
    return next;
  });
  const pruned = pruneSnapshots(normalized);
  return { snapshots: pruned, changed: changed || pruned !== normalized };
};

export const getNetWorthSnapshots = async (): Promise<NetWorthSnapshot[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as NetWorthSnapshot[];
    const { snapshots, changed } = repairSnapshots(parsed);
    if (changed) {
      // Atomic recompute instead of persisting our own snapshot of the
      // repair: a concurrent capture/sync write landing between the read
      // above and this write must not be reverted.
      await EncryptedStorage.updateItem(STORAGE_KEY, (current) => {
        if (!current) return null;
        try {
          const repair = repairSnapshots(JSON.parse(current) as NetWorthSnapshot[]);
          return repair.changed ? JSON.stringify(repair.snapshots) : null;
        } catch {
          return null;
        }
      });
    }
    return snapshots;
  } catch {
    return [];
  }
};

export const saveNetWorthSnapshots = async (
  snapshots: NetWorthSnapshot[]
): Promise<NetWorthSnapshot[]> => {
  const normalized = pruneSnapshots(snapshots.map(normalizeSnapshot));
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const upsertNetWorthSnapshot = async (
  snapshot: Omit<NetWorthSnapshot, "dayKey"> & { dayKey?: string }
): Promise<NetWorthSnapshot[]> => {
  const current = await getNetWorthSnapshots();
  const normalized = normalizeSnapshot({
    ...snapshot,
    dayKey: snapshot.dayKey || getDayKey(snapshot.capturedAt),
  });
  const next = current.filter((item) => item.dayKey !== normalized.dayKey);
  next.push(normalized);
  return saveNetWorthSnapshots(next);
};

export const syncNetWorthSnapshot = async (
  capturedAt: string = new Date().toISOString()
): Promise<NetWorthSnapshot[]> => {
  // Holdings only count toward net worth while the feature is opted in - same
  // gate the Bridge UI applies (it clears holdings to [] when disabled). Read
  // the flag first so a disabled feature contributes nothing here either,
  // keeping the persisted snapshot consistent with the live on-screen total.
  const holdingsSettings = await getHoldingsSettings();
  const [entries, debts, savingsGoals, assetAccounts, holdings, quotes, user, ratesSnapshot] =
    await Promise.all([
      getBudgetEntries(),
      getDebts(),
      getSavingsGoals(),
      getAssetAccounts(),
      holdingsSettings.enabled ? getHoldings() : Promise.resolve([]),
      holdingsSettings.enabled ? getCachedQuotes() : Promise.resolve({}),
      getOrCreateUser(),
      // Pinned snapshot only - a snapshot write must never hit the network or
      // pick up a rate the on-screen totals aren't using. Rates re-pin solely
      // when the user changes currency (see exchangeRates.ts policy).
      getStoredRates(),
    ]);

  // Convert holdings into the user's display currency before persisting, so the
  // stored snapshot matches the Bridge's on-screen total (which converts the
  // same way). Resolved here rather than passed in to keep every caller -
  // foreground or background - consistent.
  const displayCurrency = getCurrencyPreferenceOption(
    user.currencyPreferenceId
  ).currencyCode;

  const totals = calculateNetWorthTotals({
    entries,
    debts,
    savingsGoals,
    assetAccounts,
    holdings,
    quotes,
    displayCurrency,
    rates: ratesSnapshot.rates,
  });

  return upsertNetWorthSnapshot({
    capturedAt,
    ...totals,
  });
};

export const clearNetWorthSnapshots = async (): Promise<void> => {
  await EncryptedStorage.removeItem(STORAGE_KEY);
};
