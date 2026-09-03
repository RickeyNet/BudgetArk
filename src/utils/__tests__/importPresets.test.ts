/**
 * BudgetArk - Import Presets Tests
 * File: src/utils/__tests__/importPresets.test.ts
 *
 * Preset detection by signature headers (BudgetArk's own schema never
 * matches), the per-app row rewrites (signs, transfers, memos,
 * merchants), and the keyword category mapping with its fallbacks.
 */

import { detectImportPreset, keywordMatches, mapPresetCategory, presetRowToEntryRow } from "../importPresets";

describe("keywordMatches", () => {
  it("matches a whole word, optionally with one plural/simple suffix", () => {
    expect(keywordMatches("groceries", "grocer")).toBe(true);
    expect(keywordMatches("grocery", "grocer")).toBe(true);
    expect(keywordMatches("utilities", "utilit")).toBe(true);
    expect(keywordMatches("investments", "invest")).toBe(true);
    expect(keywordMatches("investing", "invest")).toBe(true);
    expect(keywordMatches("savings", "saving")).toBe(true);
    expect(keywordMatches("gifts & donations", "gift")).toBe(true);
    expect(keywordMatches("coffee shops", "coffee")).toBe(true);
    expect(keywordMatches("401(k)", "401(k)")).toBe(true);
    expect(keywordMatches("inflow: ready to assign", "inflow")).toBe(true);
  });

  it("does not match the start of a longer word, nor a word's tail", () => {
    expect(keywordMatches("rental car & taxi", "rent")).toBe(false);
    expect(keywordMatches("barber", "bar")).toBe(false);
    expect(keywordMatches("petrol", "pet")).toBe(false);
    expect(keywordMatches("childcare", "car")).toBe(false);
    expect(keywordMatches("healthcare", "health")).toBe(false);
    expect(keywordMatches("contractor", "contract")).toBe(false);
  });
});

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

describe("presetRowToEntryRow - credit card payments are transfers", () => {
  it("skips Mint / Monarch 'Credit Card Payment' rows and YNAB's card-payment category", () => {
    expect(
      presetRowToEntryRow("mint", {
        Date: "8/14/2026",
        Description: "Payment to Chase",
        Amount: "850.00",
        "Transaction Type": "debit",
        Category: "Credit Card Payment",
      }),
    ).toBeNull();
    expect(
      presetRowToEntryRow("monarch", {
        Date: "2026-08-14",
        Merchant: "Chase Card Services",
        Category: "Credit Card Payment",
        Amount: "-850.00",
      }),
    ).toBeNull();
    expect(
      presetRowToEntryRow("ynab", {
        Date: "08/14/2026",
        Payee: "Chase",
        "Category Group/Category": "Credit Card Payments: Visa",
        Outflow: "$850.00",
        Inflow: "",
      }),
    ).toBeNull();
    // A card's own purchases are still the spending.
    expect(
      presetRowToEntryRow("mint", {
        Date: "8/14/2026",
        Description: "Costco",
        Amount: "120.00",
        "Transaction Type": "debit",
        Category: "Groceries",
      }),
    ).toMatchObject({ Type: "expense", Category: "Grocery", Amount: "120.00" });
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
    // No bare "care" in the Shopping rule: "Car Care" is a car expense,
    // while "Personal Care" / "Child Care" still match their own keywords.
    expect(mapPresetCategory("Car Care", "expense")).toBe("Transportation");
    expect(mapPresetCategory("Personal Care", "expense")).toBe("Shopping");
    expect(mapPresetCategory("Natural Gas", "expense")).toBe("Utilities");
    expect(mapPresetCategory("Car Payment", "expense")).toBe("Debt Payments");
    expect(mapPresetCategory("Dining Out", "expense")).toBe("Restaurant");
  });

  it("takes plural and simple suffix forms of a keyword", () => {
    expect(mapPresetCategory("Utilities", "expense")).toBe("Utilities");
    expect(mapPresetCategory("Gifts", "expense")).toBe("Giving");
    expect(mapPresetCategory("Investments", "expense")).toBe("Investing");
    expect(mapPresetCategory("Savings", "expense")).toBe("Savings");
    expect(mapPresetCategory("Hobbies", "expense")).toBe("Entertainment");
    expect(mapPresetCategory("Games", "expense")).toBe("Entertainment");
    expect(mapPresetCategory("Paychecks", "income")).toBe("Salary");
  });

  it("never lets a short keyword claim the start of a longer word (Mint categories)", () => {
    expect(mapPresetCategory("Rental Car & Taxi", "expense")).toBe("Transportation");
    expect(mapPresetCategory("Barber", "expense")).not.toBe("Restaurant");
    expect(mapPresetCategory("Barber", "expense")).toBe("Barber");
    expect(mapPresetCategory("Petrol", "expense")).not.toBe("Shopping");
    expect(mapPresetCategory("Petrol", "expense")).toBe("Petrol");
    expect(mapPresetCategory("Childcare", "expense")).toBe("Childcare");
  });

  it("still maps the word forms the suffix allowlist cannot derive", () => {
    expect(mapPresetCategory("Healthcare", "expense")).toBe("Healthcare");
    expect(mapPresetCategory("Electricity", "expense")).toBe("Utilities");
    expect(mapPresetCategory("Transportation", "expense")).toBe("Transportation");
    expect(mapPresetCategory("Technology", "expense")).toBe("Tech");
    expect(mapPresetCategory("Cryptocurrency", "expense")).toBe("Investing");
    expect(mapPresetCategory("Contractor", "income")).toBe("Freelance");
    expect(mapPresetCategory("Home Furnishings", "expense")).toBe("Housing");
    expect(mapPresetCategory("Charities", "expense")).toBe("Giving");
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
