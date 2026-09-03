/**
 * BudgetArk - Import Presets Tests
 * File: src/utils/__tests__/importPresets.test.ts
 *
 * Preset detection by signature headers (BudgetArk's own schema never
 * matches), the per-app row rewrites (signs, transfers, memos,
 * merchants), and the keyword category mapping with its fallbacks.
 */

import { detectImportPreset, mapPresetCategory, presetRowToEntryRow } from "../importPresets";

describe("detectImportPreset", () => {
  it("recognizes each app's export by its signature headers, case-insensitively", () => {
    expect(
      detectImportPreset(["Account", "Flag", "Date", "Payee", "Category Group/Category", "Category Group", "Category", "Memo", "Outflow", "Inflow", "Cleared"])?.id
    ).toBe("ynab");
    expect(
      detectImportPreset(["date", "description", "original description", "amount", "transaction type", "category", "account name", "labels", "notes"])?.id
    ).toBe("mint");
    expect(detectImportPreset(["Date", "Merchant", "Category", "Account", "Original Statement", "Notes", "Amount", "Tags"])?.id).toBe("monarch");
  });

  it("never matches BudgetArk's own schema or a partial signature", () => {
    expect(detectImportPreset(["ID", "Date", "Type", "Category", "Amount", "Description", "Merchant"])).toBeNull();
    expect(detectImportPreset(["Date", "Payee", "Amount"])).toBeNull();
    expect(detectImportPreset([])).toBeNull();
  });
});

describe("presetRowToEntryRow - YNAB", () => {
  it("turns outflows into expenses and inflows into income, keeping payee and memo", () => {
    const expense = presetRowToEntryRow("ynab", {
      Account: "Checking",
      Date: "08/14/2026",
      Payee: "Trader Joe's",
      "Category Group/Category": "Everyday: Groceries",
      Category: "Groceries",
      Memo: "weekly shop",
      Outflow: "$84.12",
      Inflow: "$0.00",
    });
    expect(expense).toEqual({
      Date: "08/14/2026",
      Type: "expense",
      Category: "Grocery",
      Amount: "84.12",
      Description: "weekly shop",
      Merchant: "Trader Joe's",
    });
    const income = presetRowToEntryRow("ynab", {
      Date: "08/01/2026",
      Payee: "Acme Corp",
      Category: "Inflow: Ready to Assign",
      Memo: "",
      Outflow: "$0.00",
      Inflow: "$2,500.00",
    });
    expect(income).toMatchObject({ Type: "income", Category: "Salary", Amount: "2500.00", Description: "Acme Corp" });
  });

  it("drops transfers and zero rows", () => {
    expect(presetRowToEntryRow("ynab", { Date: "08/01/2026", Payee: "Transfer : Savings", Outflow: "$100.00", Inflow: "" })).toBeNull();
    expect(presetRowToEntryRow("ynab", { Date: "08/01/2026", Payee: "Nothing", Outflow: "", Inflow: "" })).toBeNull();
  });
});

describe("presetRowToEntryRow - Mint", () => {
  it("uses Transaction Type for the sign and the original description as merchant", () => {
    const row = presetRowToEntryRow("mint", {
      Date: "8/14/2026",
      Description: "Shell",
      "Original Description": "SHELL OIL 5731",
      Amount: "45.00",
      "Transaction Type": "debit",
      Category: "Gas & Fuel",
      "Account Name": "Visa",
      Labels: "",
      Notes: "",
    });
    expect(row).toEqual({
      Date: "8/14/2026",
      Type: "expense",
      Category: "Transportation",
      Amount: "45.00",
      Description: "Shell",
      Merchant: "SHELL OIL 5731",
    });
    expect(
      presetRowToEntryRow("mint", { Date: "8/1/2026", Description: "Payroll", "Original Description": "ACME PAYROLL", Amount: "1200", "Transaction Type": "credit", Category: "Paycheck" })
    ).toMatchObject({ Type: "income", Category: "Salary" });
    expect(presetRowToEntryRow("mint", { Date: "8/1/2026", Description: "x", Amount: "50", "Transaction Type": "debit", Category: "Transfer" })).toBeNull();
    expect(presetRowToEntryRow("mint", { Date: "8/1/2026", Description: "x", Amount: "??", "Transaction Type": "debit", Category: "Food" })).toBeNull();
  });
});

describe("presetRowToEntryRow - Monarch", () => {
  it("reads the signed amount and keeps notes as the description", () => {
    const row = presetRowToEntryRow("monarch", {
      Date: "2026-08-14",
      Merchant: "Netflix",
      Category: "Streaming",
      Account: "Checking",
      "Original Statement": "NETFLIX.COM",
      Notes: "family plan",
      Amount: "-15.99",
      Tags: "",
    });
    expect(row).toEqual({
      Date: "2026-08-14",
      Type: "expense",
      Category: "Entertainment",
      Amount: "15.99",
      Description: "family plan",
      Merchant: "NETFLIX.COM",
    });
    expect(presetRowToEntryRow("monarch", { Date: "2026-08-01", Merchant: "Acme", Category: "Paychecks", Amount: "3000" })).toMatchObject({ Type: "income", Amount: "3000.00" });
    expect(presetRowToEntryRow("monarch", { Date: "2026-08-01", Merchant: "Savings", Category: "Transfer", Amount: "-300" })).toBeNull();
  });
});

describe("mapPresetCategory", () => {
  it("maps by keyword at a word start, specific rules first", () => {
    expect(mapPresetCategory("Groceries", "expense")).toBe("Grocery");
    expect(mapPresetCategory("Auto Insurance", "expense")).toBe("Insurance");
    expect(mapPresetCategory("Student Loan", "expense")).toBe("Debt Payments");
    expect(mapPresetCategory("Personal Care", "expense")).toBe("Shopping");
    expect(mapPresetCategory("Childcare", "expense")).not.toBe("Transportation");
    expect(mapPresetCategory("Natural Gas", "expense")).toBe("Utilities");
    expect(mapPresetCategory("Car Payment", "expense")).toBe("Debt Payments");
    expect(mapPresetCategory("Dining Out", "expense")).toBe("Restaurant");
  });

  it("keeps income in income categories and expenses out of them", () => {
    expect(mapPresetCategory("Groceries", "income")).toBe("Salary");
    expect(mapPresetCategory("Freelance work", "income")).toBe("Freelance");
    expect(mapPresetCategory("Paycheck", "expense")).toBe("Other");
    expect(mapPresetCategory("", "income")).toBe("Salary");
  });

  it("falls back to the source name as a custom category, trimmed to the limit", () => {
    expect(mapPresetCategory("Bills: Lawn Service", "expense")).toBe("Lawn Service");
    expect(mapPresetCategory("A very long category name that goes on", "expense")).toBe("A very long category nam");
    expect(mapPresetCategory("", "expense")).toBe("Other");
    expect(mapPresetCategory("Misc", "expense")).toBe("Other");
  });
});
