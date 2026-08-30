import {
  parseTellerAccounts,
  parseTellerBalance,
  parseTellerTransactions,
  toNormalizedAccount,
} from "../tellerParser";

describe("parseTellerAccounts", () => {
  it("composes institution + name + last four and keeps ids/enrollments", () => {
    const accounts = parseTellerAccounts([
      {
        id: "acc_123",
        name: "Checking",
        institution: { id: "chase", name: "Chase" },
        last_four: "4321",
        currency: "USD",
        enrollment_id: "enr_1",
        type: "depository",
      },
      { name: "no id" },
      null,
    ]);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toEqual({
      externalAccountId: "acc_123",
      name: "Chase Checking ...4321",
      currency: "USD",
      enrollmentId: "enr_1",
    });
  });

  it("returns [] for non-array bodies", () => {
    expect(parseTellerAccounts({ error: "x" })).toEqual([]);
  });
});

describe("parseTellerBalance", () => {
  it("prefers ledger, falls back to available, handles string amounts", () => {
    expect(parseTellerBalance({ ledger: "3417.23", available: "3000.00" })).toBe(
      3417.23,
    );
    expect(parseTellerBalance({ available: "12.50" })).toBe(12.5);
    expect(parseTellerBalance({ ledger: -45.5 })).toBe(-45.5);
    expect(parseTellerBalance({})).toBeNull();
    expect(parseTellerBalance(null)).toBeNull();
  });
});

describe("toNormalizedAccount", () => {
  it("defaults a missing balance to 0", () => {
    const normalized = toNormalizedAccount(
      { externalAccountId: "acc_1", name: "X", currency: "USD" },
      null,
    );
    expect(normalized.balance).toBe(0);
  });
});

describe("parseTellerTransactions", () => {
  it("normalizes string amounts, plain dates to noon UTC, and pending status", () => {
    const txs = parseTellerTransactions(
      [
        {
          id: "txn_1",
          account_id: "acc_1",
          date: "2026-06-28",
          description: "COSTCO WHSE #1234",
          amount: "-84.53",
          status: "posted",
          type: "card_payment",
        },
        {
          id: "txn_2",
          date: "2026-06-29",
          description: "PENDING COFFEE",
          amount: "-4.50",
          status: "pending",
        },
        { id: "txn_bad", date: "06/28/2026", amount: "-1.00" },
        { id: "", date: "2026-06-28", amount: "-1.00" },
      ],
      "acc_1",
    );
    expect(txs).toHaveLength(2);
    expect(txs[0]).toEqual({
      providerTxId: "txn_1",
      externalAccountId: "acc_1",
      postedAt: "2026-06-28T12:00:00.000Z",
      amount: -84.53,
      description: "COSTCO WHSE #1234",
      pending: false,
    });
    expect(txs[1].pending).toBe(true);
  });

  it("returns [] for non-array bodies", () => {
    expect(parseTellerTransactions({ error: "unauthorized" }, "acc_1")).toEqual([]);
  });
});
