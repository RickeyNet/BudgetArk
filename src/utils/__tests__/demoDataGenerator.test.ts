/**
 * Guards scripts/generate-demo-data.mjs (the App Store screenshot fixture):
 * runs the generator for real, then feeds its output through the actual
 * import pipeline in replace mode. If a validator tightens or the generator
 * drifts, this fails here instead of on a device mid-screenshot-session.
 *
 * Same I/O-edge mocks as importData.test.ts (see its header for rationale).
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

describe("generate-demo-data.mjs", () => {
  it("produces a payload the real import pipeline accepts in replace mode", async () => {
    execFileSync(process.execPath, [
      join(ROOT, "scripts", "generate-demo-data.mjs"),
    ]);
    const raw = readFileSync(join(ROOT, "screenshots", "demo-data.json"), "utf8");

    const result = await importFromString(raw, "replace");

    // Every major collection lands with the expected curated counts. A zero
    // here means a whole collection was silently rejected by a validator.
    expect(result.debts).toBe(4);
    expect(result.payments).toBeGreaterThanOrEqual(20);
    expect(result.budgetEntries).toBeGreaterThanOrEqual(90);
    expect(result.budgetLimits).toBeGreaterThanOrEqual(6);
    expect(result.savingsGoals).toBe(3);
    expect(result.assetAccounts).toBe(5);
    expect(result.holdings).toBe(4);
    expect(result.netWorthSnapshots).toBe(40);
    expect(result.customCategories).toBe(1);
    expect(result.businesses).toBe(1);
    expect(result.people).toBe(2);
    expect(result.payoffStrategy).toBe(true);
    // Freshly generated, so the stale-import warning must not trigger.
    expect(result.staleDays ?? 0).toBe(0);
  });
});
