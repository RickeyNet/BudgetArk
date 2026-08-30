import { makeBudgetEntry } from "../../__tests__/fixtures";
import {
  buildDescriptionMemory,
  categoryForDescription,
  normalizeDescription,
  suggestDescriptions,
} from "../entryMemory";

const at = (day: number) => `2026-08-${String(day).padStart(2, "0")}T12:00:00.000Z`;

const entries = [
  makeBudgetEntry({ id: "a", description: "Shell", category: "Transportation", createdAt: at(1) }),
  makeBudgetEntry({ id: "b", description: "shell ", category: "Transportation", createdAt: at(5) }),
  makeBudgetEntry({ id: "c", description: "Trader Joe's", category: "Grocery", createdAt: at(3) }),
  makeBudgetEntry({ id: "d", description: "Costco", category: "Grocery", createdAt: at(9) }),
  makeBudgetEntry({ id: "e", description: "Costco Gas", category: "Transportation", createdAt: at(2) }),
  makeBudgetEntry({ id: "f", description: "Paycheck", category: "Salary", type: "income", createdAt: at(4) }),
  makeBudgetEntry({ id: "g", description: "", category: "Grocery", createdAt: at(8) }),
  makeBudgetEntry({ id: "h", description: "Gone", category: "Grocery", createdAt: at(10), deletedAt: at(11) }),
];

describe("buildDescriptionMemory", () => {
  it("dedupes case/space variants, counts uses, keeps the latest casing and category", () => {
    const memory = buildDescriptionMemory(entries);
    const shell = memory.find((m) => normalizeDescription(m.description) === "shell");
    expect(shell).toMatchObject({ description: "shell", category: "Transportation", count: 2, lastUsedAt: at(5) });
    expect(memory.map((m) => m.description)).toEqual([
      "Costco",
      "shell",
      "Paycheck",
      "Trader Joe's",
      "Costco Gas",
    ]);
  });

  it("re-files a description under the category it was most recently used with", () => {
    const memory = buildDescriptionMemory([
      makeBudgetEntry({ id: "1", description: "Target", category: "Shopping", createdAt: at(1) }),
      makeBudgetEntry({ id: "2", description: "Target", category: "Grocery", createdAt: at(6) }),
    ]);
    expect(memory[0]).toMatchObject({ category: "Grocery", count: 2 });
  });
});

describe("suggestDescriptions", () => {
  const memory = buildDescriptionMemory(entries);

  it("lists the category's recent descriptions when nothing is typed", () => {
    expect(
      suggestDescriptions(memory, { type: "expense", category: "Grocery", query: "" }).map((m) => m.description)
    ).toEqual(["Costco", "Trader Joe's"]);
  });

  it("matches across categories as the user types, prefix hits first", () => {
    const hits = suggestDescriptions(memory, { type: "expense", category: "Grocery", query: "co" });
    expect(hits.map((m) => `${m.description}:${m.category}`)).toEqual([
      "Costco:Grocery",
      "Costco Gas:Transportation",
    ]);
    const contains = suggestDescriptions(memory, { type: "expense", category: "Grocery", query: "gas" });
    expect(contains.map((m) => m.description)).toEqual(["Costco Gas"]);
  });

  it("never offers what is already typed in full, and respects type and limit", () => {
    expect(
      suggestDescriptions(memory, { type: "expense", category: "Grocery", query: "costco" }).map((m) => m.description)
    ).toEqual(["Costco Gas"]);
    expect(suggestDescriptions(memory, { type: "income", category: "Salary", query: "" })).toHaveLength(1);
    expect(suggestDescriptions(memory, { type: "expense", category: "Grocery", query: "o", limit: 1 })).toHaveLength(1);
  });
});

describe("categoryForDescription", () => {
  const memory = buildDescriptionMemory(entries);

  it("returns the remembered category for an exact (normalized) match only", () => {
    expect(categoryForDescription(memory, "expense", "  SHELL ")).toBe("Transportation");
    expect(categoryForDescription(memory, "expense", "She")).toBeNull();
    expect(categoryForDescription(memory, "income", "Shell")).toBeNull();
    expect(categoryForDescription(memory, "expense", "")).toBeNull();
  });
});
