import {
  buildAuthorizeUrl,
  extractAuthCode,
  parseTokenResponse,
  parseAccountNumbersResponse,
  parseAccountsResponse,
  parseTransactionsResponse,
  TOKEN_EXPIRY_SKEW_SECONDS,
} from "../schwabParser";

describe("buildAuthorizeUrl", () => {
  it("URL-encodes the key and redirect URI", () => {
    const url = buildAuthorizeUrl(" my key ", "https://127.0.0.1");
    expect(url).toBe(
      "https://api.schwabapi.com/v1/oauth/authorize?client_id=my%20key&redirect_uri=https%3A%2F%2F127.0.0.1",
    );
  });
});

describe("extractAuthCode", () => {
  it("extracts the code from a full pasted redirect URL", () => {
    expect(
      extractAuthCode("https://127.0.0.1/?code=C0.abc123&session=xyz"),
    ).toBe("C0.abc123");
  });

  it("decodes percent-encoding exactly once (%40 -> @)", () => {
    expect(extractAuthCode("https://127.0.0.1/?code=C0.abc%40")).toBe(
      "C0.abc@",
    );
  });

  it("tolerates surrounding whitespace", () => {
    expect(extractAuthCode("  https://127.0.0.1/?code=ZZZ  ")).toBe("ZZZ");
  });

  it("accepts a bare code paste (not a URL)", () => {
    expect(extractAuthCode("C0.rawcode@")).toBe("C0.rawcode@");
  });

  it("returns null when no code is present", () => {
    expect(extractAuthCode("https://127.0.0.1/?error=access_denied")).toBeNull();
    expect(extractAuthCode("")).toBeNull();
    expect(extractAuthCode("https://127.0.0.1/")).toBeNull();
  });
});

describe("parseTokenResponse", () => {
  const now = Date.parse("2026-07-01T00:00:00Z");

  it("maps the token body and applies the expiry skew", () => {
    const patch = parseTokenResponse(
      {
        access_token: "AT",
        refresh_token: "RT",
        expires_in: 1800,
        token_type: "Bearer",
      },
      now,
    );
    expect(patch).not.toBeNull();
    expect(patch!.accessToken).toBe("AT");
    expect(patch!.refreshToken).toBe("RT");
    expect(patch!.refreshTokenIssuedAt).toBe("2026-07-01T00:00:00.000Z");
    expect(Date.parse(patch!.accessTokenExpiresAt)).toBe(
      now + (1800 - TOKEN_EXPIRY_SKEW_SECONDS) * 1000,
    );
  });

  it("defaults expires_in to 30 minutes when missing", () => {
    const patch = parseTokenResponse(
      { access_token: "AT", refresh_token: "RT" },
      now,
    );
    expect(Date.parse(patch!.accessTokenExpiresAt)).toBe(
      now + (1800 - TOKEN_EXPIRY_SKEW_SECONDS) * 1000,
    );
  });

  it("returns null when tokens are missing or the body is malformed", () => {
    expect(parseTokenResponse({ access_token: "AT" }, now)).toBeNull();
    expect(parseTokenResponse(null, now)).toBeNull();
    expect(parseTokenResponse("x", now)).toBeNull();
  });
});

describe("parseAccountNumbersResponse", () => {
  it("maps accountNumber -> hashValue rows and drops malformed ones", () => {
    const rows = parseAccountNumbersResponse([
      { accountNumber: "12345678", hashValue: "HASH1" },
      { accountNumber: "", hashValue: "HASH2" },
      { nope: true },
      null,
    ]);
    expect(rows).toEqual([{ accountNumber: "12345678", hashValue: "HASH1" }]);
  });

  it("returns [] for non-array bodies", () => {
    expect(parseAccountNumbersResponse({})).toEqual([]);
  });
});

describe("parseAccountsResponse", () => {
  const hashes = new Map([["12345678", "HASH1"]]);

  it("prefers liquidationValue and masks the account number", () => {
    const accounts = parseAccountsResponse(
      [
        {
          securitiesAccount: {
            accountNumber: "12345678",
            type: "CASH",
            currentBalances: { liquidationValue: 9876.543, cashBalance: 100 },
          },
        },
      ],
      hashes,
    );
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      externalAccountId: "HASH1",
      balance: 9876.54,
    });
    expect(accounts[0].name).toContain("...5678");
    expect(accounts[0].name).not.toContain("12345678");
  });

  it("falls back to cashBalance and drops accounts without a hash", () => {
    const accounts = parseAccountsResponse(
      [
        {
          securitiesAccount: {
            accountNumber: "12345678",
            currentBalances: { cashBalance: 55.5 },
          },
        },
        { securitiesAccount: { accountNumber: "99999999" } },
      ],
      hashes,
    );
    expect(accounts).toHaveLength(1);
    expect(accounts[0].balance).toBe(55.5);
  });
});

describe("parseTransactionsResponse", () => {
  it("maps activityId/time/netAmount and drops incomplete rows", () => {
    const txs = parseTransactionsResponse(
      [
        {
          activityId: 987654,
          time: "2026-06-20T15:30:00+0000",
          netAmount: -42.5,
          type: "TRADE",
          description: "Bought 1 VTI",
        },
        { activityId: 1, time: "garbage", netAmount: 5 },
        { time: "2026-06-20T15:30:00Z", netAmount: 5 },
      ],
      "HASH1",
    );
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({
      providerTxId: "987654",
      externalAccountId: "HASH1",
      amount: -42.5,
      description: "Bought 1 VTI",
      pending: false,
    });
  });

  it("falls back to transactionId and the type field", () => {
    const txs = parseTransactionsResponse(
      [
        {
          transactionId: "T-1",
          time: "2026-06-20T15:30:00Z",
          netAmount: 10,
          type: "DIVIDEND_OR_INTEREST",
        },
      ],
      "HASH1",
    );
    expect(txs[0].providerTxId).toBe("T-1");
    expect(txs[0].description).toBe("DIVIDEND_OR_INTEREST");
  });
});
