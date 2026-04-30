import * as EncryptedStorage from "./encryptedStorage";
import type { NetWorthSnapshot } from "../types";
import { getAssetAccounts } from "./assetAccountStorage";
import { getBudgetEntries } from "./budgetStorage";
import { getDebts } from "./debtStorage";
import { getSavingsGoals } from "./savingsGoalStorage";
import { calculateNetWorthTotals } from "../utils/netWorth";

const STORAGE_KEY = "@budgetark_net_worth_snapshots";
const MAX_SNAPSHOTS = 730;

const getDayKey = (input: string | Date): string => {
  const date = typeof input === "string" ? new Date(input) : input;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeSnapshot = (snapshot: NetWorthSnapshot): NetWorthSnapshot => {
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

const pruneSnapshots = (snapshots: NetWorthSnapshot[]): NetWorthSnapshot[] => {
  const sorted = sortSnapshots(snapshots);
  return sorted.slice(-MAX_SNAPSHOTS);
};

export const getNetWorthSnapshots = async (): Promise<NetWorthSnapshot[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as NetWorthSnapshot[];
    const normalized = pruneSnapshots(parsed.map(normalizeSnapshot));
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
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
  const [entries, debts, savingsGoals, assetAccounts] = await Promise.all([
    getBudgetEntries(),
    getDebts(),
    getSavingsGoals(),
    getAssetAccounts(),
  ]);

  const totals = calculateNetWorthTotals({
    entries,
    debts,
    savingsGoals,
    assetAccounts,
  });

  return upsertNetWorthSnapshot({
    capturedAt,
    ...totals,
  });
};

export const clearNetWorthSnapshots = async (): Promise<void> => {
  await EncryptedStorage.removeItem(STORAGE_KEY);
};
