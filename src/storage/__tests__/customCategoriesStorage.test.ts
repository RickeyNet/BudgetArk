/**
 * BudgetArk - custom categories storage tests
 * File: src/storage/__tests__/customCategoriesStorage.test.ts
 *
 * Guards the pure validation this module runs before any custom category
 * write: name rejection (empty/too long/control-char-only/duplicate of a
 * built-in or existing custom, case-insensitively), icon normalization to a
 * single non-mangled glyph, and the cap/collision guards on restore. Also
 * covers readStore's fail-closed parsing (corrupt JSON, malformed entries)
 * and its updatedAt backfill for legacy records. Storage is an in-memory
 * map, matching debtStorage.test.ts's pattern.
 */
import type { CustomCategory } from "../../types";
import { makeCustomCategory } from "../../__tests__/fixtures";
import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CUSTOM_CATEGORIES,
  addCustomCategory,
  clearCustomCategories,
  deleteCustomCategory,
  getCustomCategories,
  restoreCustomCategory,
  saveCustomCategoriesFromSync,
  updateCustomCategory,
} from "../customCategoriesStorage";

// addCustomCategory mints a fresh id via the ESM-only `uuid` package.
let nextId = 0;
jest.mock("../../utils/uuid", () => ({
  generateUUID: () => `gen-uuid-${++nextId}`,
}));

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

const KEY = "@budgetark_custom_categories";

const seed = (categories: CustomCategory[]) => {
  mockStore.set(KEY, JSON.stringify({ categories, version: 1 }));
};

beforeEach(() => {
  mockStore = new Map();
  nextId = 0;
});

describe("addCustomCategory name validation", () => {
  it("rejects an empty name", async () => {
    const result = await addCustomCategory("", "🐾");
    expect(result).toEqual({ ok: false, error: "Enter a category name." });
  });

  it("rejects a whitespace-only name", async () => {
    const result = await addCustomCategory("   ", "🐾");
    expect(result.ok).toBe(false);
  });

  it("rejects a name that is only control characters (sanitizes to empty)", async () => {
    const result = await addCustomCategory("\x01\x02\x03", "🐾");
    expect(result).toEqual({ ok: false, error: "Enter a category name." });
  });

  it("strips embedded control characters from an otherwise valid name", async () => {
    const result = await addCustomCategory("Pet\x07s", "🐾");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.categories[0].name).toBe("Pets");
  });

  it("rejects a name longer than the max length", async () => {
    const tooLong = "x".repeat(MAX_CATEGORY_NAME_LENGTH + 1);
    const result = await addCustomCategory(tooLong, "🐾");
    expect(result).toEqual({
      ok: false,
      error: `Keep it under ${MAX_CATEGORY_NAME_LENGTH} characters.`,
    });
  });

  it("accepts a name at exactly the max length", async () => {
    const exact = "x".repeat(MAX_CATEGORY_NAME_LENGTH);
    const result = await addCustomCategory(exact, "🐾");
    expect(result.ok).toBe(true);
  });

  it("rejects a name matching a built-in category exactly", async () => {
    const result = await addCustomCategory("Food", "🍽️");
    expect(result).toEqual({
      ok: false,
      error: `"Food" is already a built-in category.`,
    });
  });

  it("rejects a differently-cased built-in name (\"food\" vs. \"Food\")", async () => {
    // The built-in check folds case like the existing-custom check does;
    // otherwise a custom "food" would shadow the built-in "Food" in every
    // picker.
    const result = await addCustomCategory("food", "🍽️");
    expect(result).toEqual({
      ok: false,
      error: `"food" is already a built-in category.`,
    });
  });

  it("rejects a duplicate of an existing custom category (case-insensitive)", async () => {
    seed([makeCustomCategory({ name: "Pets" })]);
    const result = await addCustomCategory("PETS", "🐾");
    expect(result).toEqual({ ok: false, error: `"PETS" already exists.` });
  });

  it("enforces the max custom category cap", async () => {
    seed(
      Array.from({ length: MAX_CUSTOM_CATEGORIES }, (_, i) =>
        makeCustomCategory({ id: `c${i}`, name: `Cat ${i}` })
      )
    );
    const result = await addCustomCategory("One More", "🐾");
    expect(result).toEqual({
      ok: false,
      error: `You can have up to ${MAX_CUSTOM_CATEGORIES} custom categories.`,
    });
  });

  it("accepts a valid new name, defaulting the bucket to the custom default", async () => {
    const result = await addCustomCategory("Pets", "🐾");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.categories[0].name).toBe("Pets");
      expect(result.categories[0].defaultBucket).toBe("wants");
      expect(result.categories[0].id).toBe("gen-uuid-1");
    }
  });

  it("honors an explicit valid bucket and falls back on an invalid one", async () => {
    const valid = await addCustomCategory("Pets", "🐾", "needs");
    expect(valid.ok && valid.categories[0].defaultBucket).toBe("needs");

    const invalid = await addCustomCategory(
      "Hobbies",
      "🎨",
      "not-a-bucket" as never
    );
    expect(invalid.ok && invalid.categories[1].defaultBucket).toBe("wants");
  });
});

describe("icon normalization", () => {
  it("falls back to the default glyph for an empty/blank icon", async () => {
    const result = await addCustomCategory("Pets", "");
    expect(result.ok && result.categories[0].icon).toBe("🏷️");
  });

  it("takes only the first grapheme, dropping smuggled trailing text", async () => {
    const result = await addCustomCategory("Pets", "🐾 not an icon");
    expect(result.ok && result.categories[0].icon).toBe("🐾");
  });

  it("does not mangle a surrogate-pair emoji into a broken half", async () => {
    // A naive `icon[0]` would slice this into an unpaired UTF-16 surrogate;
    // Array.from(...)[0] must keep the full code point intact.
    const result = await addCustomCategory("Plants", "🪴");
    expect(result.ok && result.categories[0].icon).toBe("🪴");
    expect(result.ok && [...result.categories[0].icon]).toHaveLength(1);
  });

  it("strips control characters before normalizing", async () => {
    const result = await addCustomCategory("Pets", "\x01🐾");
    expect(result.ok && result.categories[0].icon).toBe("🐾");
  });
});

describe("updateCustomCategory", () => {
  it("returns an error for an unknown id", async () => {
    const result = await updateCustomCategory("missing", { name: "New" });
    expect(result).toEqual({ ok: false, error: "Category not found." });
  });

  it("allows renaming to the same name (excludes its own id from the clash check)", async () => {
    seed([makeCustomCategory({ id: "c1", name: "Pets" })]);
    const result = await updateCustomCategory("c1", { name: "Pets" });
    expect(result.ok).toBe(true);
  });

  it("rejects renaming to a name that collides with another custom category", async () => {
    seed([
      makeCustomCategory({ id: "c1", name: "Pets" }),
      makeCustomCategory({ id: "c2", name: "Hobbies" }),
    ]);
    const result = await updateCustomCategory("c1", { name: "hobbies" });
    expect(result).toEqual({ ok: false, error: `"hobbies" already exists.` });
  });

  it("rejects renaming to a built-in category name", async () => {
    seed([makeCustomCategory({ id: "c1", name: "Pets" })]);
    const result = await updateCustomCategory("c1", { name: "Grocery" });
    expect(result.ok).toBe(false);
  });

  it("updates icon/bucket without touching the name when name is omitted", async () => {
    seed([makeCustomCategory({ id: "c1", name: "Pets", icon: "🐾" })]);
    const result = await updateCustomCategory("c1", { icon: "🐶" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.categories[0].name).toBe("Pets");
      expect(result.categories[0].icon).toBe("🐶");
    }
  });

  it("stamps a fresh updatedAt on a successful update", async () => {
    seed([
      makeCustomCategory({ id: "c1", name: "Pets", updatedAt: "2020-01-01T00:00:00.000Z" }),
    ]);
    const result = await updateCustomCategory("c1", { icon: "🐶" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.categories[0].updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    }
  });
});

describe("deleteCustomCategory", () => {
  it("removes the category by id", async () => {
    seed([
      makeCustomCategory({ id: "c1", name: "Pets" }),
      makeCustomCategory({ id: "c2", name: "Hobbies" }),
    ]);
    const next = await deleteCustomCategory("c1");
    expect(next.map((c) => c.id)).toEqual(["c2"]);
  });
});

describe("restoreCustomCategory", () => {
  it("re-inserts the exact object (same id, no new id minted)", async () => {
    const original = makeCustomCategory({ id: "c1", name: "Pets", icon: "🐾" });
    const result = await restoreCustomCategory(original);
    expect(result).toEqual({ ok: true, categories: [original] });
  });

  it("is a no-op when the id is already present", async () => {
    const existing = makeCustomCategory({ id: "c1", name: "Pets" });
    seed([existing]);
    const result = await restoreCustomCategory(existing);
    expect(result).toEqual({ ok: true, categories: [existing] });
  });

  it("refuses to restore over the cap", async () => {
    seed(
      Array.from({ length: MAX_CUSTOM_CATEGORIES }, (_, i) =>
        makeCustomCategory({ id: `c${i}`, name: `Cat ${i}` })
      )
    );
    const result = await restoreCustomCategory(
      makeCustomCategory({ id: "new", name: "Pets" })
    );
    expect(result).toEqual({
      ok: false,
      error: `You can have up to ${MAX_CUSTOM_CATEGORIES} custom categories.`,
    });
  });

  it("refuses to restore a name that now collides with a built-in", async () => {
    const result = await restoreCustomCategory(
      makeCustomCategory({ id: "c1", name: "Grocery" })
    );
    expect(result).toEqual({ ok: false, error: `"Grocery" already exists.` });
  });

  it("refuses to restore a name that now collides with another custom category", async () => {
    seed([makeCustomCategory({ id: "c1", name: "Pets" })]);
    const result = await restoreCustomCategory(
      makeCustomCategory({ id: "c2", name: "pets" })
    );
    expect(result).toEqual({ ok: false, error: `"pets" already exists.` });
  });
});

describe("getCustomCategories / readStore fail-closed parsing", () => {
  it("returns [] when nothing is stored", async () => {
    expect(await getCustomCategories()).toEqual([]);
  });

  it("returns [] for corrupted JSON", async () => {
    mockStore.set(KEY, "{not json");
    expect(await getCustomCategories()).toEqual([]);
  });

  it("returns [] when the stored shape isn't {categories: [...]}", async () => {
    mockStore.set(KEY, JSON.stringify({ nope: true }));
    expect(await getCustomCategories()).toEqual([]);
  });

  it("filters out malformed entries (missing id/name, bad defaultBucket)", async () => {
    mockStore.set(
      KEY,
      JSON.stringify({
        categories: [
          makeCustomCategory({ id: "c1", name: "Pets" }),
          { id: "c2" }, // missing name
          { name: "No id" }, // missing id
          makeCustomCategory({
            id: "c3",
            name: "Bad bucket",
            defaultBucket: "invalid" as never,
          }),
        ],
        version: 1,
      })
    );
    const result = await getCustomCategories();
    expect(result.map((c) => c.id)).toEqual(["c1"]);
  });

  it("backfills a missing updatedAt from createdAt and persists it", async () => {
    const legacy = {
      id: "c1",
      name: "Pets",
      icon: "🐾",
      createdAt: "2020-01-01T00:00:00.000Z",
    };
    mockStore.set(KEY, JSON.stringify({ categories: [legacy], version: 1 }));
    const result = await getCustomCategories();
    expect(result[0].updatedAt).toBe("2020-01-01T00:00:00.000Z");

    const stored = JSON.parse(mockStore.get(KEY)!);
    expect(stored.categories[0].updatedAt).toBe("2020-01-01T00:00:00.000Z");
  });
});

describe("saveCustomCategoriesFromSync", () => {
  it("bypasses name validation entirely for a merged sync write", async () => {
    // The diff engine has already de-duped names; a case-insensitive
    // "duplicate" pair must be allowed to land as-is.
    const merged = [
      makeCustomCategory({ id: "c1", name: "Pets" }),
      makeCustomCategory({ id: "c2", name: "PETS" }),
    ];
    await saveCustomCategoriesFromSync(merged);
    expect(await getCustomCategories()).toEqual(merged);
  });
});

describe("clearCustomCategories", () => {
  it("removes the stored categories", async () => {
    seed([makeCustomCategory()]);
    await clearCustomCategories();
    expect(mockStore.has(KEY)).toBe(false);
  });
});
