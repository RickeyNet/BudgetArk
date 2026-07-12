import {
  isObject,
  isValidDateValue,
  isSafeText,
  isSafeNumber,
  isValidImportCategory,
  normalizeImportCategory,
  isMonthKey,
  isDebtItem,
  isBudgetEntryItem,
  isSavingsGoalItem,
  isAssetAccountItem,
  isHoldingItem,
  isNetWorthSnapshotItem,
  isBusinessItem,
  sanitizePayoffStrategy,
  explainBudgetEntryProblem,
  VALIDATOR_LIMITS,
} from "../recordValidators";

describe("primitive guards", () => {
  it("isObject distinguishes plain objects", () => {
    expect(isObject({})).toBe(true);
    expect(isObject(null)).toBe(false);
    expect(isObject([])).toBe(false);
    expect(isObject("x")).toBe(false);
  });

  it("isValidDateValue accepts parseable date strings only", () => {
    expect(isValidDateValue("2026-06-12")).toBe(true);
    expect(isValidDateValue("2026-06-12T00:00:00.000Z")).toBe(true);
    expect(isValidDateValue("not-a-date")).toBe(false);
    expect(isValidDateValue(123)).toBe(false);
  });

  it("isSafeText enforces non-empty within a length cap", () => {
    expect(isSafeText("hello")).toBe(true);
    expect(isSafeText("   ")).toBe(false);
    expect(isSafeText("a".repeat(200))).toBe(false);
    expect(isSafeText("ab", 1)).toBe(false);
  });

  it("isSafeNumber enforces finite range bounds", () => {
    expect(isSafeNumber(100)).toBe(true);
    expect(isSafeNumber(-1)).toBe(false); // default min 0
    expect(isSafeNumber(NaN)).toBe(false);
    expect(isSafeNumber(5, { min: 0, max: 4 })).toBe(false);
    expect(isSafeNumber(VALIDATOR_LIMITS.MAX_MONEY + 1)).toBe(false);
  });
});

describe("isValidImportCategory / normalizeImportCategory", () => {
  it("accepts built-in categories", () => {
    expect(isValidImportCategory("Housing")).toBe(true);
    expect(isValidImportCategory("Savings")).toBe(true);
  });

  it("accepts a safe custom category name within the cap", () => {
    expect(isValidImportCategory("My Custom Cat")).toBe(true);
  });

  it("rejects control characters and overly long names", () => {
    expect(isValidImportCategory("bad\x00name")).toBe(false);
    expect(isValidImportCategory("a".repeat(25))).toBe(false);
    expect(isValidImportCategory("")).toBe(false);
    expect(isValidImportCategory(123)).toBe(false);
  });

  it("normalizeImportCategory returns the name or null", () => {
    expect(normalizeImportCategory("Housing")).toBe("Housing");
    expect(normalizeImportCategory("a".repeat(25))).toBeNull();
  });
});

describe("isMonthKey", () => {
  it("accepts YYYY-MM with a real month", () => {
    expect(isMonthKey("2026-01")).toBe(true);
    expect(isMonthKey("2026-12")).toBe(true);
  });

  it("rejects invalid months and shapes", () => {
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("9999-99")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
    expect(isMonthKey(202601)).toBe(false);
  });
});

describe("sanitizePayoffStrategy", () => {
  it("returns a known strategy", () => {
    expect(sanitizePayoffStrategy("avalanche")).toBe("avalanche");
    expect(sanitizePayoffStrategy("snowball")).toBe("snowball");
    expect(sanitizePayoffStrategy("custom")).toBe("custom");
  });

  it("returns undefined for unknown or non-string values", () => {
    expect(sanitizePayoffStrategy("nope")).toBeUndefined();
    expect(sanitizePayoffStrategy(5)).toBeUndefined();
  });
});

describe("isDebtItem", () => {
  const valid = {
    id: "d1",
    name: "Visa",
    balance: 1000,
    originalBalance: 2000,
    rate: 19.9,
    minPayment: 50,
    createdAt: "2026-06-01",
  };

  it("accepts a well-formed debt", () => {
    expect(isDebtItem(valid)).toBe(true);
  });

  it("accepts an optional valid paymentDueDay", () => {
    expect(isDebtItem({ ...valid, paymentDueDay: 15 })).toBe(true);
  });

  it("rejects an out-of-range paymentDueDay", () => {
    expect(isDebtItem({ ...valid, paymentDueDay: 32 })).toBe(false);
  });

  it("rejects an out-of-range rate", () => {
    expect(isDebtItem({ ...valid, rate: 999 })).toBe(false);
  });

  it("rejects a non-positive originalBalance", () => {
    expect(isDebtItem({ ...valid, originalBalance: 0 })).toBe(false);
  });

  it("rejects a garbage deletedAt tombstone", () => {
    expect(isDebtItem({ ...valid, deletedAt: "garbage" })).toBe(false);
  });
});

describe("isBudgetEntryItem", () => {
  const valid = {
    id: "e1",
    type: "expense",
    category: "Food",
    amount: 12.5,
    date: "2026-06-01",
    createdAt: "2026-06-01",
  };

  it("accepts a well-formed expense", () => {
    expect(isBudgetEntryItem(valid)).toBe(true);
  });

  it("rejects an invalid type", () => {
    expect(isBudgetEntryItem({ ...valid, type: "transfer" })).toBe(false);
  });

  it("rejects a zero amount for a normal category", () => {
    expect(isBudgetEntryItem({ ...valid, amount: 0 })).toBe(false);
  });

  it("allows negative amounts for reserve categories", () => {
    expect(
      isBudgetEntryItem({ ...valid, category: "Savings", amount: -200 })
    ).toBe(true);
  });

  it("rejects a string amount", () => {
    expect(isBudgetEntryItem({ ...valid, amount: "12.5" })).toBe(false);
  });

  it("rejects a too-long description", () => {
    expect(
      isBudgetEntryItem({ ...valid, description: "a".repeat(221) })
    ).toBe(false);
  });

  describe("bank-connection provenance fields", () => {
    it("accepts a bank-sourced entry with externalTxId and merchant", () => {
      expect(
        isBudgetEntryItem({
          ...valid,
          source: "bank",
          externalTxId: "simplefin:ACT-123:TXN-456",
          merchant: "COSTCO WHOLESALE",
        })
      ).toBe(true);
    });

    it("accepts entries without any provenance fields (manual entries)", () => {
      expect(isBudgetEntryItem(valid)).toBe(true);
    });

    it("rejects an unknown source value", () => {
      expect(isBudgetEntryItem({ ...valid, source: "plaid" })).toBe(false);
      expect(isBudgetEntryItem({ ...valid, source: 1 })).toBe(false);
    });

    it("rejects an empty or oversized externalTxId", () => {
      expect(isBudgetEntryItem({ ...valid, externalTxId: "" })).toBe(false);
      expect(
        isBudgetEntryItem({ ...valid, externalTxId: "a".repeat(201) })
      ).toBe(false);
    });

    it("rejects an empty or oversized merchant", () => {
      expect(isBudgetEntryItem({ ...valid, merchant: "   " })).toBe(false);
      expect(
        isBudgetEntryItem({ ...valid, merchant: "a".repeat(121) })
      ).toBe(false);
    });
  });

  describe("attachments (receipt-photo metadata)", () => {
    const attachment = (over: Record<string, unknown> = {}) => ({
      id: "a1",
      createdAt: "2026-06-01T12:00:00.000Z",
      width: 1600,
      height: 1200,
      ...over,
    });

    it("accepts an entry with valid attachments", () => {
      expect(
        isBudgetEntryItem({ ...valid, attachments: [attachment()] })
      ).toBe(true);
    });

    it("accepts attachments without dimensions and an empty array", () => {
      const { width, height, ...bare } = attachment();
      void width;
      void height;
      expect(isBudgetEntryItem({ ...valid, attachments: [bare] })).toBe(true);
      expect(isBudgetEntryItem({ ...valid, attachments: [] })).toBe(true);
    });

    it("rejects more than 10 items (blob-smuggling boundary, UI caps at 3)", () => {
      const eleven = Array.from({ length: 11 }, (_, i) =>
        attachment({ id: `a${i}` })
      );
      expect(isBudgetEntryItem({ ...valid, attachments: eleven })).toBe(false);
      const ten = eleven.slice(0, 10);
      expect(isBudgetEntryItem({ ...valid, attachments: ten })).toBe(true);
    });

    it("rejects non-array, non-object items, and unsafe ids", () => {
      expect(isBudgetEntryItem({ ...valid, attachments: "a1" })).toBe(false);
      expect(isBudgetEntryItem({ ...valid, attachments: ["a1"] })).toBe(false);
      expect(
        isBudgetEntryItem({ ...valid, attachments: [attachment({ id: "" })] })
      ).toBe(false);
      expect(
        isBudgetEntryItem({
          ...valid,
          attachments: [attachment({ id: "a".repeat(81) })],
        })
      ).toBe(false);
    });

    it("rejects garbage createdAt and out-of-range dimensions", () => {
      expect(
        isBudgetEntryItem({
          ...valid,
          attachments: [attachment({ createdAt: "garbage" })],
        })
      ).toBe(false);
      expect(
        isBudgetEntryItem({
          ...valid,
          attachments: [attachment({ width: 0 })],
        })
      ).toBe(false);
      expect(
        isBudgetEntryItem({
          ...valid,
          attachments: [attachment({ height: 20_001 })],
        })
      ).toBe(false);
      expect(
        isBudgetEntryItem({
          ...valid,
          attachments: [attachment({ width: Infinity })],
        })
      ).toBe(false);
    });
  });

  describe("businessId", () => {
    it("accepts an entry with a businessId", () => {
      expect(isBudgetEntryItem({ ...valid, businessId: "b1" })).toBe(true);
    });

    it("accepts an entry without a businessId", () => {
      expect(isBudgetEntryItem(valid)).toBe(true);
    });

    it("rejects an empty, oversized, or non-string businessId", () => {
      expect(isBudgetEntryItem({ ...valid, businessId: "" })).toBe(false);
      expect(isBudgetEntryItem({ ...valid, businessId: "   " })).toBe(false);
      expect(
        isBudgetEntryItem({ ...valid, businessId: "a".repeat(121) })
      ).toBe(false);
      expect(isBudgetEntryItem({ ...valid, businessId: 42 })).toBe(false);
    });

    it("accepts any id isBusinessItem accepts (cap 120) - a tagged entry must not brick a diff its business passed", () => {
      const longId = "a".repeat(120);
      expect(isBusinessItem({ id: longId, name: "Acme", createdAt: "2026-06-01" })).toBe(true);
      expect(isBudgetEntryItem({ ...valid, businessId: longId })).toBe(true);
    });
  });
});

describe("isBusinessItem", () => {
  const valid = {
    id: "b1",
    name: "Acme Consulting LLC",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-02",
  };

  it("accepts a well-formed business", () => {
    expect(isBusinessItem(valid)).toBe(true);
  });

  it("accepts a tombstoned business (deletes must ride sync)", () => {
    expect(isBusinessItem({ ...valid, deletedAt: "2026-06-03" })).toBe(true);
  });

  it("accepts a business without updatedAt", () => {
    const { updatedAt, ...rest } = valid;
    void updatedAt;
    expect(isBusinessItem(rest)).toBe(true);
  });

  it("rejects a non-object", () => {
    expect(isBusinessItem(null)).toBe(false);
    expect(isBusinessItem("Acme")).toBe(false);
  });

  it("rejects an empty or oversized name (cap 40)", () => {
    expect(isBusinessItem({ ...valid, name: "  " })).toBe(false);
    expect(isBusinessItem({ ...valid, name: "a".repeat(41) })).toBe(false);
    expect(isBusinessItem({ ...valid, name: "a".repeat(40) })).toBe(true);
  });

  it("rejects a missing id or createdAt", () => {
    const { id, ...noId } = valid;
    void id;
    expect(isBusinessItem(noId)).toBe(false);
    const { createdAt, ...noCreated } = valid;
    void createdAt;
    expect(isBusinessItem(noCreated)).toBe(false);
  });

  it("rejects a garbage deletedAt tombstone (would break tombstone GC)", () => {
    expect(isBusinessItem({ ...valid, deletedAt: "garbage" })).toBe(false);
  });

  it("does NOT reject duplicate names (one bad record would kill a whole sync diff)", () => {
    expect(isBusinessItem(valid)).toBe(true);
    expect(isBusinessItem({ ...valid, id: "b2" })).toBe(true);
  });
});

describe("explainBudgetEntryProblem", () => {
  it("describes a missing id", () => {
    expect(explainBudgetEntryProblem({ type: "expense" })).toContain("id");
  });

  it("flags a quoted-string amount specifically", () => {
    const msg = explainBudgetEntryProblem({
      id: "e1",
      type: "expense",
      category: "Food",
      amount: "12.5",
    });
    expect(msg).toContain("quoted string");
  });

  it("explains bad bank-provenance fields (lockstep with isBudgetEntryItem)", () => {
    const base = {
      id: "e1",
      type: "expense",
      category: "Food",
      amount: 12.5,
      date: "2026-06-01",
      createdAt: "2026-06-01",
    };
    expect(explainBudgetEntryProblem({ ...base, source: "plaid" })).toContain(
      '"source"'
    );
    expect(
      explainBudgetEntryProblem({ ...base, externalTxId: "a".repeat(201) })
    ).toContain('"externalTxId"');
    expect(explainBudgetEntryProblem({ ...base, merchant: "" })).toContain(
      '"merchant"'
    );
  });

  it("explains a bad businessId (lockstep with isBudgetEntryItem)", () => {
    const base = {
      id: "e1",
      type: "expense",
      category: "Food",
      amount: 12.5,
      date: "2026-06-01",
      createdAt: "2026-06-01",
    };
    expect(
      explainBudgetEntryProblem({ ...base, businessId: "a".repeat(121) })
    ).toContain('"businessId"');
    expect(explainBudgetEntryProblem({ ...base, businessId: "" })).toContain(
      '"businessId"'
    );
  });

  it("explains bad attachments (lockstep with isBudgetEntryItem)", () => {
    const base = {
      id: "e1",
      type: "expense",
      category: "Food",
      amount: 12.5,
      date: "2026-06-01",
      createdAt: "2026-06-01",
    };
    expect(
      explainBudgetEntryProblem({ ...base, attachments: "not-an-array" })
    ).toContain('"attachments"');
    expect(
      explainBudgetEntryProblem({
        ...base,
        attachments: [{ id: "a1", createdAt: "garbage" }],
      })
    ).toContain('"attachments"');
  });
});

describe("isSavingsGoalItem", () => {
  const valid = {
    id: "g1",
    name: "Emergency Fund",
    category: "emergency_fund",
    targetAmount: 10000,
    currentAmount: 2500,
    createdAt: "2026-06-01",
  };

  it("accepts a valid goal", () => {
    expect(isSavingsGoalItem(valid)).toBe(true);
  });

  it("rejects an unknown category", () => {
    expect(isSavingsGoalItem({ ...valid, category: "yacht" })).toBe(false);
  });

  it("rejects a non-positive target amount", () => {
    expect(isSavingsGoalItem({ ...valid, targetAmount: 0 })).toBe(false);
  });
});

describe("isAssetAccountItem", () => {
  it("rejects a non-object", () => {
    expect(isAssetAccountItem(null)).toBe(false);
  });

  it("rejects a negative balance", () => {
    expect(
      isAssetAccountItem({
        id: "a1",
        name: "Checking",
        category: "cash",
        balance: -1,
        createdAt: "2026-06-01",
      })
    ).toBe(false);
  });
});

describe("isHoldingItem", () => {
  const valid = {
    id: "h1",
    symbol: "AAPL",
    shares: 10,
    costBasis: 1500,
    createdAt: "2026-06-01",
    updatedAt: "2026-06-02",
  };

  it("accepts a well-formed holding", () => {
    expect(isHoldingItem(valid)).toBe(true);
  });

  it("accepts a holding without optional costBasis/accountId", () => {
    expect(
      isHoldingItem({ id: "h2", symbol: "VTI", shares: 1.5, createdAt: "2026-06-01" })
    ).toBe(true);
  });

  it("accepts fractional shares, dotted tickers, and crypto pairs", () => {
    expect(isHoldingItem({ ...valid, symbol: "BRK.B", shares: 0.25 })).toBe(true);
    expect(isHoldingItem({ ...valid, symbol: "BTC/USD", shares: 0.5 })).toBe(true);
  });

  it("rejects a non-object", () => {
    expect(isHoldingItem(null)).toBe(false);
  });

  it("rejects zero or negative shares", () => {
    expect(isHoldingItem({ ...valid, shares: 0 })).toBe(false);
    expect(isHoldingItem({ ...valid, shares: -5 })).toBe(false);
  });

  it("rejects a malformed symbol", () => {
    expect(isHoldingItem({ ...valid, symbol: "bad symbol" })).toBe(false);
    expect(isHoldingItem({ ...valid, symbol: "" })).toBe(false);
    expect(isHoldingItem({ ...valid, symbol: "WAYTOOLONGTICKER1" })).toBe(false); // 17 > 15 cap
  });

  it("rejects a non-ISO deletedAt (would break tombstone GC)", () => {
    expect(isHoldingItem({ ...valid, deletedAt: "garbage" })).toBe(false);
  });

  it("rejects a negative costBasis", () => {
    expect(isHoldingItem({ ...valid, costBasis: -1 })).toBe(false);
  });

  describe("manual-value holdings", () => {
    const manual = {
      id: "m1",
      name: "Spartan 500 Index Pool Class D",
      manualValue: 42580,
      createdAt: "2026-06-01",
    };

    it("accepts a named manual holding with no ticker", () => {
      expect(isHoldingItem(manual)).toBe(true);
    });

    it("rejects a manual holding with no name", () => {
      expect(isHoldingItem({ id: "m2", manualValue: 100, createdAt: "2026-06-01" })).toBe(false);
    });

    it("rejects a negative manual value", () => {
      expect(isHoldingItem({ ...manual, manualValue: -1 })).toBe(false);
    });
  });

  describe("proxy-tracked holdings", () => {
    const proxy = {
      id: "p1",
      name: "Spartan 500 Index Pool Class D",
      symbol: "VOO",
      anchorValue: 1000,
      anchorPrice: 540,
      createdAt: "2026-06-01",
    };

    it("accepts a named proxy holding with a valid ticker and anchor", () => {
      expect(isHoldingItem(proxy)).toBe(true);
    });

    it("rejects a proxy holding with a malformed proxy symbol", () => {
      expect(isHoldingItem({ ...proxy, symbol: "bad symbol" })).toBe(false);
    });

    it("rejects a proxy holding with no name", () => {
      expect(isHoldingItem({ id: "p2", symbol: "VOO", anchorValue: 1000, anchorPrice: 540, createdAt: "2026-06-01" })).toBe(false);
    });

    it("rejects a proxy holding with a zero/negative anchor price", () => {
      expect(isHoldingItem({ ...proxy, anchorPrice: 0 })).toBe(false);
      expect(isHoldingItem({ ...proxy, anchorPrice: -5 })).toBe(false);
    });

    it("rejects a proxy holding missing the anchor price", () => {
      const { anchorPrice, ...noPrice } = proxy;
      expect(isHoldingItem(noPrice)).toBe(false);
    });
  });
});

describe("isNetWorthSnapshotItem", () => {
  it("accepts a well-formed snapshot", () => {
    expect(
      isNetWorthSnapshotItem({
        dayKey: "2026-06-22",
        capturedAt: "2026-06-22T00:00:00.000Z",
        totalAssets: 1000,
        totalDebt: 200,
        netWorth: 800,
      })
    ).toBe(true);
  });

  it("rejects a malformed dayKey", () => {
    expect(
      isNetWorthSnapshotItem({
        dayKey: "2026-6-2",
        capturedAt: "2026-06-22T00:00:00.000Z",
        totalAssets: 1000,
        totalDebt: 200,
        netWorth: 800,
      })
    ).toBe(false);
  });
});
