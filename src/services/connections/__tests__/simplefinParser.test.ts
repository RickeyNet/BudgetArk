import {
  decodeSetupToken,
  parseAccessUrl,
  parseAccountsResponse,
} from "../simplefinParser";
import { utf8ToBase64 } from "../base64";

describe("decodeSetupToken", () => {
  it("decodes a base64 claim URL, tolerating whitespace", () => {
    const claimUrl = "https://beta-bridge.simplefin.org/simplefin/claim/DEMO";
    const token = `  ${utf8ToBase64(claimUrl)}\n`;
    expect(decodeSetupToken(token)).toEqual({ ok: true, claimUrl });
  });

  it("rejects an empty paste", () => {
    const result = decodeSetupToken("   ");
    expect(result.ok).toBe(false);
  });

  it("rejects garbage that isn't base64 of an https URL", () => {
    expect(decodeSetupToken("not-a-token!!!").ok).toBe(false);
    expect(decodeSetupToken(utf8ToBase64("http-nope")).ok).toBe(false);
    expect(decodeSetupToken(utf8ToBase64("ftp://host/claim")).ok).toBe(false);
  });
});

describe("parseAccessUrl", () => {
  it("splits credentials into a Basic header and a clean base URL", () => {
    const parsed = parseAccessUrl(
      "https://demo:demo@beta-bridge.simplefin.org/simplefin/",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.baseUrl).toBe("https://beta-bridge.simplefin.org/simplefin");
    // "demo:demo" base64 = ZGVtbzpkZW1v
    expect(parsed!.authHeader).toBe("Basic ZGVtbzpkZW1v");
  });

  it("decodes percent-encoded credentials", () => {
    const parsed = parseAccessUrl("https://user:p%40ss@host/simplefin");
    expect(parsed).not.toBeNull();
    expect(parsed!.authHeader).toBe(`Basic ${utf8ToBase64("user:p@ss")}`);
  });

  it("returns null for URLs without embedded credentials", () => {
    expect(parseAccessUrl("https://host/simplefin")).toBeNull();
    expect(parseAccessUrl("garbage")).toBeNull();
  });
});

describe("parseAccountsResponse", () => {
  const posted = Math.floor(Date.parse("2026-06-20T12:00:00Z") / 1000);
  const body = {
    accounts: [
      {
        id: "ACT-1",
        name: "Chase Checking",
        currency: "USD",
        balance: "1250.50",
        "balance-date": posted,
        transactions: [
          {
            id: "TXN-1",
            posted,
            amount: "-45.67",
            description: "COSTCO WHSE #1234",
          },
          {
            id: "TXN-2",
            posted: 0,
            transacted_at: posted,
            amount: "-12.00",
            description: "PENDING COFFEE",
            pending: true,
          },
          { id: "", posted, amount: "1.00", description: "no id" },
          { id: "TXN-BAD", posted, amount: "not-money", description: "bad amount" },
        ],
      },
    ],
  };

  it("normalizes string amounts and epoch-second dates", () => {
    const result = parseAccountsResponse(body);
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]).toMatchObject({
      externalAccountId: "ACT-1",
      name: "Chase Checking",
      balance: 1250.5,
      currency: "USD",
    });
    expect(result.accounts[0].balanceAsOf).toBe("2026-06-20T12:00:00.000Z");

    const tx = result.transactions[0];
    expect(tx).toMatchObject({
      providerTxId: "TXN-1",
      externalAccountId: "ACT-1",
      amount: -45.67,
      pending: false,
    });
    expect(tx.postedAt).toBe("2026-06-20T12:00:00.000Z");
  });

  it("falls back to transacted_at for pending transactions with posted: 0", () => {
    const result = parseAccountsResponse(body);
    const pending = result.transactions.find((t) => t.providerTxId === "TXN-2");
    expect(pending).toBeDefined();
    expect(pending!.pending).toBe(true);
    expect(pending!.postedAt).toBe("2026-06-20T12:00:00.000Z");
  });

  it("drops malformed transactions without failing the batch", () => {
    const result = parseAccountsResponse(body);
    expect(result.transactions).toHaveLength(2);
    expect(result.droppedTransactions).toBe(2);
  });

  it("returns empty results for non-object or schema-surprise bodies", () => {
    expect(parseAccountsResponse(null).accounts).toEqual([]);
    expect(parseAccountsResponse("x").accounts).toEqual([]);
    expect(parseAccountsResponse({ accounts: "nope" }).accounts).toEqual([]);
  });

  it("skips accounts with unparseable balances", () => {
    const result = parseAccountsResponse({
      accounts: [{ id: "A", name: "B", balance: "??" }],
    });
    expect(result.accounts).toEqual([]);
  });
});
