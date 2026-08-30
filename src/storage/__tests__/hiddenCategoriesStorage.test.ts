/**
 * BudgetArk - hidden built-in categories storage tests
 * File: src/storage/__tests__/hiddenCategoriesStorage.test.ts
 *
 * Pins the per-device "deleted" built-ins: hide/restore round-trip, idempotent
 * hides, protected and unknown names ignored, corrupt records read as empty.
 * Storage is an in-memory map, matching monthlyBalanceStorage.test.ts.
 */
import {
  clearHiddenBuiltInCategories,
  getHiddenBuiltInCategories,
  setBuiltInCategoryHidden,
} from "../hiddenCategoriesStorage";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
  updateItem: jest.fn(
    async (k: string, updater: (current: string | null) => string | null) => {
      const next = updater(mockStore.has(k) ? mockStore.get(k)! : null);
      if (next !== null) mockStore.set(k, next);
    }
  ),
}));

const KEY = "@budgetark_hidden_builtin_categories";

beforeEach(() => {
  mockStore = new Map();
});

describe("hiddenCategoriesStorage", () => {
  it("starts empty and round-trips hide / restore", async () => {
    expect(await getHiddenBuiltInCategories()).toEqual([]);
    expect(await setBuiltInCategoryHidden("Fitness", true)).toEqual(["Fitness"]);
    expect(await setBuiltInCategoryHidden("Travel", true)).toEqual(["Fitness", "Travel"]);
    expect(await setBuiltInCategoryHidden("Fitness", true)).toEqual(["Fitness", "Travel"]);
    expect(await setBuiltInCategoryHidden("Fitness", false)).toEqual(["Travel"]);
    expect(await getHiddenBuiltInCategories()).toEqual(["Travel"]);
  });

  it("ignores protected and unknown names without writing", async () => {
    expect(await setBuiltInCategoryHidden("Other", true)).toEqual([]);
    expect(await setBuiltInCategoryHidden("Pets", true)).toEqual([]);
    expect(mockStore.has(KEY)).toBe(false);
  });

  it("reads a corrupt record as empty and clears", async () => {
    mockStore.set(KEY, "nope");
    expect(await getHiddenBuiltInCategories()).toEqual([]);
    await setBuiltInCategoryHidden("Tech", true);
    await clearHiddenBuiltInCategories();
    expect(mockStore.has(KEY)).toBe(false);
  });
});
