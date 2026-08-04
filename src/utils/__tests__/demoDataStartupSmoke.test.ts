/**
 * Startup smoke test for the demo-data fixture: after importing
 * screenshots/demo-data.json in replace mode, every storage read the app
 * performs on launch must return a sane shape, and the Bridge/Budget
 * startup math must run without throwing. Exists because the round-trip
 * test (demoDataGenerator.test.ts) only proves the file IMPORTS - a value
 * the validators accept can still crash a read/compute path at boot.
 *
 * Same I/O-edge mocks as importData.test.ts.
 */

import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { importFromString } from "../importData";

jest.mock("../../storage/encryptedStorage", () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItem: jest.fn(async (k: string) => (store.has(k) ? store.get(k)! : null)),
    setItem: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => store.delete(k));
    }),
    // The startup READ paths self-repair via updateItem (collectionRepair),
    // unlike the import-only tests this mock was copied from.
    updateItem: jest.fn(
      async (k: string, updater: (current: string | null) => string | null) => {
        const next = updater(store.has(k) ? store.get(k)! : null);
        if (next !== null) store.set(k, next);
      },
    ),
  };
});

jest.mock("expo-document-picker", () => ({}));
jest.mock("expo-file-system", () => ({ File: class {} }));
jest.mock("../exportData", () => ({
  ENCRYPTED_EXPORT_PREFIX: "__BUDGETARK_ENC__:",
  ENCRYPTED_EXPORT_PREFIX_V2: "__BUDGETARK_ENC2__:",
}));

let uuidCounter = 0;
jest.mock("../uuid", () => ({
  generateUUID: () => `gen-uuid-${++uuidCounter}`,
}));

const ROOT = join(__dirname, "..", "..", "..");

describe("demo data - app startup reads and math", () => {
  beforeAll(async () => {
    execFileSync(process.execPath, [
      join(ROOT, "scripts", "generate-demo-data.mjs"),
    ]);
    const raw = readFileSync(join(ROOT, "screenshots", "demo-data.json"), "utf8");
    await importFromString(raw, "replace");
  });

  it("every startup storage read returns a sane shape", async () => {
    const { getBudgetEntries, getAllLimitsByMonth } = await import(
      "../../storage/budgetStorage"
    );
    const { getDebts, getPayments } = await import("../../storage/debtStorage");
    const { getSavingsGoals } = await import("../../storage/savingsGoalStorage");
    const { getAssetAccounts } = await import(
      "../../storage/assetAccountStorage"
    );
    const { getHoldings } = await import("../../storage/holdingsStorage");
    const { getBusinesses } = await import("../../storage/businessStorage");
    const { getPeople } = await import("../../storage/personStorage");
    const { getCustomCategories } = await import(
      "../../storage/customCategoriesStorage"
    );
    const { getNetWorthSnapshots } = await import(
      "../../storage/netWorthSnapshotStorage"
    );
    const { getMonthStartBalances } = await import(
      "../../storage/monthlyBalanceStorage"
    );
    const { getDebtMilestonePlan } = await import(
      "../../storage/debtMilestoneStorage"
    );
    const { getOrCreateUser } = await import("../../storage/userStorage");

    expect((await getBudgetEntries()).length).toBeGreaterThanOrEqual(90);
    expect((await getDebts()).length).toBe(4);
    expect((await getPayments()).length).toBeGreaterThanOrEqual(20);
    expect((await getSavingsGoals()).length).toBe(3);
    expect((await getAssetAccounts()).length).toBe(5);
    expect((await getHoldings()).length).toBe(4);
    expect((await getBusinesses()).length).toBe(1);
    expect((await getPeople()).length).toBe(2);
    expect((await getCustomCategories()).length).toBe(1);
    expect((await getNetWorthSnapshots()).length).toBe(40);
    expect(Object.keys(await getMonthStartBalances()).length).toBe(2);
    expect((await getDebtMilestonePlan()).steps.length).toBeGreaterThan(0);
    const limitsByMonth = await getAllLimitsByMonth();
    expect(Object.keys(limitsByMonth).length).toBeGreaterThanOrEqual(6);
    const user = await getOrCreateUser();
    expect(user.displayName).toBe("Jordan");
    expect(user.onboardingComplete).toBe(true);
  });

  it("the Bridge/Budget startup math runs without throwing", async () => {
    const { getBudgetEntries, getAllLimitsByMonth } = await import(
      "../../storage/budgetStorage"
    );
    const { getDebts, getPayments } = await import("../../storage/debtStorage");
    const { getAssetAccounts } = await import(
      "../../storage/assetAccountStorage"
    );
    const { getHoldings } = await import("../../storage/holdingsStorage");
    const { getPeople } = await import("../../storage/personStorage");

    const [entries, debts, payments, assets, holdings, people, limitsByMonth] =
      await Promise.all([
        getBudgetEntries(),
        getDebts(),
        getPayments(),
        getAssetAccounts(),
        getHoldings(),
        getPeople(),
        getAllLimitsByMonth(),
      ]);

    // Bridge: missed linked-account contribution shell (runs on both tabs).
    const { applyAndPersistMissedContributions } = await import(
      "../linkedAccountRecurringApply"
    );
    const processed = await applyAndPersistMissedContributions(entries, assets);
    expect(Array.isArray(processed.entries)).toBe(true);

    // Bridge: net-worth totals over accounts + holdings (no quotes cached).
    const { getSavingsGoals } = await import(
      "../../storage/savingsGoalStorage"
    );
    const savingsGoals = await getSavingsGoals();
    const { calculateNetWorthTotals } = await import("../netWorth");
    const totals = calculateNetWorthTotals({
      entries: processed.entries,
      debts,
      savingsGoals,
      assetAccounts: assets,
      holdings,
    });
    expect(Number.isFinite(totals.netWorth)).toBe(true);

    // Debts: payoff simulation with the imported avalanche strategy.
    const { simulatePayoffPlan } = await import("../calculations");
    const plan = simulatePayoffPlan(
      debts.map((d) => ({
        id: d.id,
        balance: d.balance,
        rate: d.rate,
        minPayment: d.minPayment,
      })),
      "avalanche",
      100,
    );
    expect(plan.isPayoffPossible).toBe(true);
    expect(plan.monthsToPayoff).toBeGreaterThan(0);

    // Budget: monthly review (trends/streaks) + person spending card.
    const { buildMonthlyReview } = await import("../budgetInsights");
    const review = buildMonthlyReview(processed.entries, limitsByMonth, 6, people);
    expect(review.summaries.length).toBe(6);
    expect(review.personSpending.length).toBeGreaterThan(0);

    // Budget: bill calendar + paid/remaining split for the current month.
    const { groupBillsByDay, splitPaidVsRemaining } = await import(
      "../billCalendar"
    );
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const bills = groupBillsByDay(processed.entries, monthKey);
    expect(() => splitPaidVsRemaining(bills, monthKey)).not.toThrow();

    // Payments render path: every payment resolves its debt.
    for (const payment of payments) {
      expect(debts.some((d) => d.id === payment.debtId)).toBe(true);
    }
  });
});
