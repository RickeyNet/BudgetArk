/**
 * BudgetArk - Account editor validation tests
 * File: src/utils/__tests__/accountEditorValidation.test.ts
 *
 * Pins the save gate for the Bridge account editor: every bad field is
 * named (nothing fails silently), and a holding row can never be dropped -
 * and so deleted - just because it stopped parsing.
 */

import {
  type AccountEditorRow,
  validateAccountEditor,
} from "../accountEditorValidation";

const row = (over: Partial<AccountEditorRow> = {}): AccountEditorRow => ({
  key: "k1",
  kind: "ticker",
  symbol: "",
  shares: "",
  costBasis: "",
  name: "",
  value: "",
  ...over,
});

const base = {
  name: "Fidelity",
  balance: "",
  apy: "",
  isPureHoldings: true,
  hasHoldings: true,
  rows: [] as AccountEditorRow[],
};

describe("validateAccountEditor - account fields", () => {
  it("accepts a plain balance account", () => {
    const result = validateAccountEditor({
      ...base,
      name: "Savings",
      balance: "1,250.50",
      apy: "4.5%",
      isPureHoldings: false,
      hasHoldings: false,
    });
    expect(result).toEqual({ valid: true, fieldIssues: [], rowIssues: {}, blankRowKeys: [] });
  });

  it("names a missing name, a bad balance and a bad APY together", () => {
    const result = validateAccountEditor({
      ...base,
      name: "   ",
      balance: "12abc",
      apy: "lots",
      isPureHoldings: false,
      hasHoldings: false,
    });
    expect(result.valid).toBe(false);
    expect(result.fieldIssues).toEqual(["name", "balance", "apy"]);
  });

  it("rejects an empty or negative balance", () => {
    for (const balance of ["", "-5"]) {
      const result = validateAccountEditor({
        ...base,
        balance,
        isPureHoldings: false,
        hasHoldings: false,
      });
      expect(result.fieldIssues).toEqual(["balance"]);
    }
  });

  it("treats a blank or zero APY as 'none', not an error", () => {
    for (const apy of ["", "0", "0%"]) {
      const result = validateAccountEditor({
        ...base,
        balance: "100",
        apy,
        isPureHoldings: false,
        hasHoldings: false,
      });
      expect(result.valid).toBe(true);
    }
  });

  it("ignores balance and APY on a pure-holdings account", () => {
    expect(validateAccountEditor({ ...base, balance: "junk", apy: "junk" }).valid).toBe(true);
  });

  it("ignores rows when the category has no holdings", () => {
    const result = validateAccountEditor({
      ...base,
      balance: "10",
      isPureHoldings: false,
      hasHoldings: false,
      rows: [row({ symbol: "!!", shares: "x" })],
    });
    expect(result.valid).toBe(true);
  });
});

describe("validateAccountEditor - holding rows", () => {
  it("accepts valid ticker, crypto pair and fund rows", () => {
    const result = validateAccountEditor({
      ...base,
      rows: [
        row({ key: "a", symbol: "aapl", shares: "10", costBasis: "1500" }),
        row({ key: "b", symbol: "BTC/USD", shares: "0.25" }),
        row({ key: "c", kind: "fund", name: "Spartan 500", value: "12000", symbol: "voo" }),
        row({ key: "d", kind: "fund", name: "Stable value", value: "0" }),
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.rowIssues).toEqual({});
  });

  it("skips a new row that was never filled in", () => {
    const result = validateAccountEditor({
      ...base,
      rows: [row({ key: "empty" }), row({ key: "emptyFund", kind: "fund", symbol: "  " })],
    });
    expect(result.valid).toBe(true);
    expect(result.blankRowKeys).toEqual(["empty", "emptyFund"]);
  });

  it("blocks the save when an EXISTING row is emptied (it must not be deleted)", () => {
    const result = validateAccountEditor({
      ...base,
      rows: [row({ key: "held", id: "holding-1" })],
    });
    expect(result.valid).toBe(false);
    expect(result.blankRowKeys).toEqual([]);
    expect(result.rowIssues).toEqual({ held: ["symbol", "shares"] });
  });

  it("blocks an existing row whose shares were cleared", () => {
    const result = validateAccountEditor({
      ...base,
      rows: [row({ key: "held", id: "holding-1", symbol: "AAPL", shares: "" })],
    });
    expect(result.rowIssues).toEqual({ held: ["shares"] });
  });

  it("names each bad ticker field", () => {
    const result = validateAccountEditor({
      ...base,
      rows: [
        row({ key: "sym", symbol: "not a ticker!", shares: "3" }),
        row({ key: "zero", symbol: "VTI", shares: "0" }),
        row({ key: "cost", symbol: "VTI", shares: "3", costBasis: "abc" }),
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.rowIssues).toEqual({
      sym: ["symbol"],
      zero: ["shares"],
      cost: ["costBasis"],
    });
  });

  it("names each bad fund field, including a typed proxy that isn't a symbol", () => {
    const result = validateAccountEditor({
      ...base,
      rows: [
        row({ key: "noname", kind: "fund", value: "500" }),
        row({ key: "noval", kind: "fund", name: "Pool D" }),
        row({ key: "proxy", kind: "fund", name: "Pool D", value: "500", symbol: "S&P 500" }),
      ],
    });
    expect(result.rowIssues).toEqual({
      noname: ["fundName"],
      noval: ["fundValue"],
      proxy: ["proxy"],
    });
  });
});
