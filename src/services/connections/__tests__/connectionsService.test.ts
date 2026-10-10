/**
 * BudgetArk - Bank Connections Setup Service Tests
 * File: src/services/connections/__tests__/connectionsService.test.ts
 *
 * Pins the storage half of linking a provider account to a credit card on
 * the Debts tab (updateLinkPreferences / linkAccountToDebt /
 * finalizeAccountLinks): one account per card, the card replacing a Bridge
 * target, the immediate debt balance seed with its no-churn guard, and the
 * wizard leaving undecided debtId/personId undefined so a re-run cannot
 * wipe a stored card link. Storage is an in-memory fake; the pure rules
 * themselves are covered in linkPreferences.test.ts.
 *
 * Also pins reconnectSimplefin: a fresh setup token replaces the stored
 * access URL under the SAME connection id (links untouched), the burned
 * token's URL persists even when the verification fetch fails, and every
 * refusal (keystore down, unknown/non-SimpleFIN id, bad token, failed
 * claim) saves nothing.
 */

import type { Debt, ExternalAccountLink } from "../../../types";
import {
  getLinks,
  updateLink,
  upsertLink,
} from "../../../storage/externalAccountLinksStorage";
import { getDebts, updateDebt } from "../../../storage/debtStorage";
import { updateAssetAccount } from "../../../storage/assetAccountStorage";
import { getConnection, updateConnection } from "../../../storage/connectionsStorage";
import { isEncryptionAvailable } from "../../../storage/encryptedStorage";
import { setConnectionSecrets } from "../../../storage/connectionSecretsStorage";
import { claimAccessUrl, fetchSimplefinAccounts } from "../simplefinClient";
import { makeBankConnection } from "../../../__tests__/fixtures";
import {
  finalizeAccountLinks,
  linkAccountToDebt,
  reconnectSimplefin,
  updateLinkPreferences,
} from "../connectionsService";

jest.mock("../../../storage/connectionsStorage", () => ({
  addConnection: jest.fn(),
  deleteConnection: jest.fn(),
  getConnection: jest.fn(),
  updateConnection: jest.fn(),
}));
jest.mock("../../../storage/encryptedStorage", () => ({
  isEncryptionAvailable: jest.fn(async () => true),
}));
jest.mock("../../../storage/connectionSecretsStorage", () => ({
  getConnectionSecrets: jest.fn(),
  setConnectionSecrets: jest.fn(),
  setTellerAccessToken: jest.fn(),
}));
jest.mock("../../../storage/externalAccountLinksStorage", () => ({
  getLinks: jest.fn(),
  updateLink: jest.fn(),
  upsertLink: jest.fn(),
}));
jest.mock("../../../storage/assetAccountStorage", () => ({
  getAssetAccounts: jest.fn(async () => []),
  updateAssetAccount: jest.fn(),
}));
jest.mock("../../../storage/debtStorage", () => ({
  getDebts: jest.fn(),
  updateDebt: jest.fn(),
}));
jest.mock("../simplefinClient", () => ({
  claimAccessUrl: jest.fn(),
  fetchSimplefinAccounts: jest.fn(),
}));
jest.mock("../tellerClient", () => ({ fetchTellerData: jest.fn() }));
jest.mock("../../../utils/uuid", () => ({ generateUUID: jest.fn(() => "uuid-new") }));

const mockedGetLinks = getLinks as jest.MockedFunction<typeof getLinks>;
const mockedUpdateLink = updateLink as jest.MockedFunction<typeof updateLink>;
const mockedUpsertLink = upsertLink as jest.MockedFunction<typeof upsertLink>;
const mockedGetDebts = getDebts as jest.MockedFunction<typeof getDebts>;
const mockedUpdateDebt = updateDebt as jest.MockedFunction<typeof updateDebt>;
const mockedUpdateAsset = updateAssetAccount as jest.MockedFunction<typeof updateAssetAccount>;

const NOW = "2026-10-09T00:00:00.000Z";

const link = (over: Partial<ExternalAccountLink>): ExternalAccountLink => ({
  id: "link-1",
  connectionId: "conn-1",
  externalAccountId: "ext-1",
  externalName: "Freedom Visa",
  assetAccountId: null,
  importTransactions: true,
  updateBalance: false,
  lastExternalBalance: -250.5,
  lastExternalBalanceAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

const card: Debt = {
  id: "debt-1",
  name: "Freedom",
  balance: 100,
  originalBalance: 200,
  rate: 24,
  minPayment: 35,
  owner: "mine",
  debtClass: "personal_credit",
  debtClassSource: "manual",
  createdAt: NOW,
  updatedAt: NOW,
} as Debt;

let store: ExternalAccountLink[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  store = [];
  mockedGetLinks.mockImplementation(async () => store.map((l) => ({ ...l })));
  mockedUpdateLink.mockImplementation(async (id, updates) => {
    store = store.map((l) => (l.id === id ? { ...l, ...updates } : l));
    return store.map((l) => ({ ...l }));
  });
  mockedUpsertLink.mockImplementation(async (incoming) => {
    // Mirrors the real upsert: replace by (connectionId, externalAccountId),
    // keeping the stored id and any field the incoming link leaves undefined.
    const index = store.findIndex(
      (l) =>
        l.connectionId === incoming.connectionId &&
        l.externalAccountId === incoming.externalAccountId,
    );
    if (index < 0) {
      store = [...store, incoming];
    } else {
      const stored = store[index];
      const merged: ExternalAccountLink = { ...incoming, id: stored.id };
      for (const key of ["debtId", "updateDebtBalance", "personId"] as const) {
        if (merged[key] === undefined && stored[key] !== undefined) {
          (merged as unknown as Record<string, unknown>)[key] = stored[key];
        }
      }
      store = store.map((l, i) => (i === index ? merged : l));
    }
    return store.map((l) => ({ ...l }));
  });
  mockedGetDebts.mockResolvedValue([card]);
  mockedUpdateDebt.mockResolvedValue([card]);
});

describe("updateLinkPreferences / linkAccountToDebt", () => {
  it("links the card, drops the Bridge target and seeds the amount owed", async () => {
    store = [link({ assetAccountId: "asset-1", updateBalance: true })];
    const result = await linkAccountToDebt("link-1", "debt-1");
    expect(result[0]).toMatchObject({
      debtId: "debt-1",
      updateDebtBalance: true,
      assetAccountId: null,
      updateBalance: false,
    });
    expect(mockedUpdateDebt).toHaveBeenCalledWith("debt-1", { balance: 250.5, originalBalance: 250.5 });
    expect(mockedUpdateAsset).not.toHaveBeenCalled();
  });

  it("clears the card from every other link (one account per card)", async () => {
    store = [
      link({ id: "link-1" }),
      link({ id: "link-2", externalAccountId: "ext-2", debtId: "debt-1" }),
      link({ id: "link-3", connectionId: "conn-2", externalAccountId: "ext-3", debtId: "debt-1" }),
      link({ id: "link-4", externalAccountId: "ext-4", debtId: "debt-9" }),
    ];
    await linkAccountToDebt("link-1", "debt-1");
    expect(store.find((l) => l.id === "link-1")?.debtId).toBe("debt-1");
    expect(store.find((l) => l.id === "link-2")?.debtId).toBeNull();
    expect(store.find((l) => l.id === "link-3")?.debtId).toBeNull();
    expect(store.find((l) => l.id === "link-4")?.debtId).toBe("debt-9");
  });

  it("skips the debt write when the balance already matches", async () => {
    mockedGetDebts.mockResolvedValue([{ ...card, balance: 250.5 }]);
    store = [link({})];
    await linkAccountToDebt("link-1", "debt-1");
    expect(mockedUpdateDebt).not.toHaveBeenCalled();
  });

  it("does not seed a card that no longer exists", async () => {
    mockedGetDebts.mockResolvedValue([]);
    store = [link({})];
    await linkAccountToDebt("link-1", "debt-1");
    expect(mockedUpdateDebt).not.toHaveBeenCalled();
  });

  it("linking with mirroring off links without touching the debt", async () => {
    store = [link({})];
    await linkAccountToDebt("link-1", "debt-1", { updateBalance: false });
    expect(store[0]).toMatchObject({ debtId: "debt-1", updateDebtBalance: false });
    expect(mockedUpdateDebt).not.toHaveBeenCalled();
  });

  it("null unlinks the card without touching other links", async () => {
    store = [
      link({ id: "link-1", debtId: "debt-1", updateDebtBalance: true }),
      link({ id: "link-2", externalAccountId: "ext-2", debtId: "debt-2" }),
    ];
    await linkAccountToDebt("link-1", null);
    expect(store[0].debtId).toBeNull();
    expect(store[1].debtId).toBe("debt-2");
    expect(mockedUpdateDebt).not.toHaveBeenCalled();
  });

  it("choosing a Bridge account drops the card", async () => {
    store = [link({ debtId: "debt-1", updateDebtBalance: true })];
    await updateLinkPreferences("link-1", { assetAccountId: "asset-1" });
    expect(store[0]).toMatchObject({ assetAccountId: "asset-1", updateBalance: true, debtId: null });
  });

  it("unknown link ids are a no-op", async () => {
    store = [link({})];
    expect(await linkAccountToDebt("nope", "debt-1")).toEqual([]);
    expect(mockedUpdateLink).not.toHaveBeenCalled();
  });
});

describe("finalizeAccountLinks", () => {
  const account = {
    externalAccountId: "ext-1",
    name: "Freedom Visa",
    balance: -250.5,
    balanceAsOf: NOW,
  };

  it("writes the chosen card through the one-account-per-card path", async () => {
    store = [link({ id: "old", connectionId: "conn-0", externalAccountId: "ext-x", debtId: "debt-1" })];
    await finalizeAccountLinks("conn-1", [
      { account, assetAccountId: null, importTransactions: true, personId: null, debtId: "debt-1" },
    ]);
    const created = store.find((l) => l.externalAccountId === "ext-1");
    expect(created).toMatchObject({ debtId: "debt-1", updateDebtBalance: true, assetAccountId: null });
    expect(store.find((l) => l.id === "old")?.debtId).toBeNull();
    expect(mockedUpdateDebt).toHaveBeenCalledWith("debt-1", { balance: 250.5, originalBalance: 250.5 });
  });

  it("a re-run without a card choice keeps a stored card link and person", async () => {
    store = [link({ id: "link-1", debtId: "debt-1", updateDebtBalance: true, personId: "p-1" })];
    await finalizeAccountLinks("conn-1", [
      { account, assetAccountId: null, importTransactions: true, personId: null, debtId: null },
    ]);
    expect(store).toHaveLength(1);
    expect(store[0]).toMatchObject({ id: "link-1", debtId: "debt-1", personId: "p-1" });
  });

  it("a re-run that picks a Bridge account replaces the stored card link", async () => {
    store = [link({ id: "link-1", debtId: "debt-1", updateDebtBalance: true })];
    await finalizeAccountLinks("conn-1", [
      { account, assetAccountId: "asset-1", importTransactions: true, personId: null, debtId: null },
    ]);
    expect(store[0]).toMatchObject({ assetAccountId: "asset-1", updateBalance: true, debtId: null });
  });
});

describe("reconnectSimplefin", () => {
  const mockedGetConnection = getConnection as jest.MockedFunction<typeof getConnection>;
  const mockedUpdateConnection = updateConnection as jest.MockedFunction<typeof updateConnection>;
  const mockedEncryption = isEncryptionAvailable as jest.MockedFunction<typeof isEncryptionAvailable>;
  const mockedSetSecrets = setConnectionSecrets as jest.MockedFunction<typeof setConnectionSecrets>;
  const mockedClaim = claimAccessUrl as jest.MockedFunction<typeof claimAccessUrl>;
  const mockedFetch = fetchSimplefinAccounts as jest.MockedFunction<typeof fetchSimplefinAccounts>;

  // Placeholder bridge URLs only - never a real access URL in a fixture.
  const TOKEN = Buffer.from("https://bridge.example/claim/abc").toString("base64");
  const NEW_URL = "https://user:pass@bridge.example/simplefin";

  beforeEach(() => {
    mockedEncryption.mockResolvedValue(true);
    mockedGetConnection.mockResolvedValue(
      makeBankConnection({
        id: "conn-1",
        authStatus: "needs-reauth",
        lastErrorCode: "auth-expired",
        lastErrorMessage: "Expired",
        providerWarnings: ["Chase needs attention"],
        lastSyncedAt: NOW,
        lastAttemptAt: NOW,
      }),
    );
    mockedClaim.mockResolvedValue({ ok: true, accessUrl: NEW_URL });
    mockedFetch.mockResolvedValue({ ok: true, accounts: [], transactions: [] });
  });

  it("saves the new URL under the same id, resets the connection's sync state and leaves links alone", async () => {
    await expect(reconnectSimplefin("conn-1", TOKEN)).resolves.toEqual({ ok: true });
    expect(mockedClaim).toHaveBeenCalledWith("https://bridge.example/claim/abc");
    expect(mockedSetSecrets).toHaveBeenCalledWith("conn-1", {
      provider: "simplefin",
      accessUrl: NEW_URL,
    });
    expect(mockedUpdateConnection).toHaveBeenCalledWith("conn-1", {
      authStatus: "ok",
      lastErrorCode: undefined,
      lastErrorMessage: undefined,
      providerWarnings: undefined,
      lastSyncedAt: undefined,
      lastAttemptAt: undefined,
    });
    expect(mockedFetch).toHaveBeenCalledWith(NEW_URL, expect.any(Object));
    expect(mockedUpdateLink).not.toHaveBeenCalled();
    expect(mockedUpsertLink).not.toHaveBeenCalled();
    // Secrets never reach a non-secret write.
    expect(JSON.stringify(mockedUpdateConnection.mock.calls)).not.toContain("pass@");
  });

  it("saves nothing when the claim fails, passing its message through", async () => {
    mockedClaim.mockResolvedValue({
      ok: false,
      error: "invalid-credentials",
      message: "Token already used",
    });
    await expect(reconnectSimplefin("conn-1", TOKEN)).resolves.toEqual({
      ok: false,
      message: "Token already used",
    });
    expect(mockedSetSecrets).not.toHaveBeenCalled();
    expect(mockedUpdateConnection).not.toHaveBeenCalled();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("rejects an undecodable token before claiming anything", async () => {
    const result = await reconnectSimplefin("conn-1", "not a token");
    expect(result.ok).toBe(false);
    expect(mockedClaim).not.toHaveBeenCalled();
    expect(mockedSetSecrets).not.toHaveBeenCalled();
  });

  it("keeps the new URL and records the error when the verification fetch fails", async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      error: "provider-error",
      message: "Payment required",
    });
    await expect(reconnectSimplefin("conn-1", TOKEN)).resolves.toEqual({
      ok: false,
      message: "Payment required",
    });
    expect(mockedSetSecrets).toHaveBeenCalledWith("conn-1", {
      provider: "simplefin",
      accessUrl: NEW_URL,
    });
    expect(mockedUpdateConnection).toHaveBeenLastCalledWith("conn-1", {
      authStatus: "error",
      lastErrorCode: "provider-error",
      lastErrorMessage: "Payment required",
    });
  });

  it("refuses an unknown id or a non-SimpleFIN connection without claiming", async () => {
    mockedGetConnection.mockResolvedValueOnce(undefined);
    const unknown = await reconnectSimplefin("missing", TOKEN);
    expect(unknown.ok).toBe(false);

    mockedGetConnection.mockResolvedValueOnce(
      makeBankConnection({ id: "conn-t", provider: "teller" }),
    );
    const teller = await reconnectSimplefin("conn-t", TOKEN);
    expect(teller.ok).toBe(false);
    expect(mockedClaim).not.toHaveBeenCalled();
    expect(mockedSetSecrets).not.toHaveBeenCalled();
  });

  it("fails closed when the keystore is unavailable", async () => {
    mockedEncryption.mockResolvedValue(false);
    const result = await reconnectSimplefin("conn-1", TOKEN);
    expect(result.ok).toBe(false);
    expect(mockedGetConnection).not.toHaveBeenCalled();
    expect(mockedClaim).not.toHaveBeenCalled();
    expect(mockedSetSecrets).not.toHaveBeenCalled();
  });
});
