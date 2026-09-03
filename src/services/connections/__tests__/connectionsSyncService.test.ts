/**
 * BudgetArk - Sync Orchestrator Tests
 * File: src/services/connections/__tests__/connectionsSyncService.test.ts
 *
 * Guards connectionsSyncService's per-connection orchestration: the
 * disabled/needs-reauth/cooldown short-circuits happen BEFORE the
 * lastAttemptAt stamp and BEFORE any provider fetch; a failed fetch maps to
 * the right outcome and error bookkeeping; balances applied to an
 * AssetAccount are clamped at >= 0 (any category, holdings ones included)
 * and skipped for unchanged values; a debt-linked card mirrors the provider balance in
 * the same write as its keep-alive stamp; keep-alive stamping and the
 * auto-approve sweep are both best-effort (their failure must not fail the sync pass); one
 * connection's unexpected failure doesn't abort the rest of the batch; and
 * connection secrets (access URLs, Teller PEMs/tokens) never appear in any
 * argument passed to a non-secret storage write.
 *
 * Every provider client and storage module is mocked; only the pure helpers
 * (ingest planning, syncGate, cardKeepAlive math) run for real.
 */

import type { BankConnection } from "../../../types";
import { makeAssetAccount, makeBankConnection, makeDebt, makeExternalAccountLink } from "../../../__tests__/fixtures";
import type { NormalizedAccount, NormalizedTransaction } from "../types";
import { syncConnections, startConnectionsMonitoring, stopConnectionsMonitoring } from "../connectionsSyncService";
import { getConnections, updateConnection } from "../../../storage/connectionsStorage";
import { getConnectionSecrets } from "../../../storage/connectionSecretsStorage";
import { getLinksForConnection, updateLink } from "../../../storage/externalAccountLinksStorage";
import {
  getIngestLedger,
  getPendingTransactions,
  recordLedgerEntries,
  removePendingTransactions,
  upsertPendingTransactions,
} from "../../../storage/reviewInboxStorage";
import { getMerchantRules } from "../../../storage/merchantRulesStorage";
import { getBudgetEntriesIncludingDeleted } from "../../../storage/budgetStorage";
import { getAssetAccounts, updateAssetAccount } from "../../../storage/assetAccountStorage";
import { getDebts, updateDebt } from "../../../storage/debtStorage";
import { rescheduleCardKeepAliveReminders } from "../../../notifications/cardKeepAliveReminders";
import { fetchSimplefinAccounts } from "../simplefinClient";
import { fetchTellerData } from "../tellerClient";
import { autoApproveInboxByRules } from "../reviewInboxService";
import { notifyDataChanged } from "../../../storage/dataChangeNotifier";

// RN edge: only AppState is touched (startConnectionsMonitoring/stop).
jest.mock("react-native", () => ({
  AppState: { addEventListener: jest.fn() },
}));

jest.mock("../../../storage/connectionsStorage", () => ({
  getConnections: jest.fn(),
  updateConnection: jest.fn(),
}));
jest.mock("../../../storage/connectionSecretsStorage", () => ({
  getConnectionSecrets: jest.fn(),
}));
jest.mock("../../../storage/externalAccountLinksStorage", () => ({
  getLinksForConnection: jest.fn(),
  updateLink: jest.fn(),
}));
jest.mock("../../../storage/reviewInboxStorage", () => ({
  getIngestLedger: jest.fn(),
  getPendingTransactions: jest.fn(),
  recordLedgerEntries: jest.fn(),
  removePendingTransactions: jest.fn(),
  upsertPendingTransactions: jest.fn(),
}));
jest.mock("../../../storage/merchantRulesStorage", () => ({
  getMerchantRules: jest.fn(),
}));
jest.mock("../../../storage/budgetStorage", () => ({
  getBudgetEntriesIncludingDeleted: jest.fn(),
}));
jest.mock("../../../storage/assetAccountStorage", () => ({
  getAssetAccounts: jest.fn(),
  updateAssetAccount: jest.fn(),
}));
jest.mock("../../../storage/debtStorage", () => ({
  getDebts: jest.fn(),
  updateDebt: jest.fn(),
}));
jest.mock("../../../notifications/cardKeepAliveReminders", () => ({
  rescheduleCardKeepAliveReminders: jest.fn(),
}));
jest.mock("../simplefinClient", () => ({ fetchSimplefinAccounts: jest.fn() }));
jest.mock("../tellerClient", () => ({ fetchTellerData: jest.fn() }));
jest.mock("../reviewInboxService", () => ({
  autoApproveInboxByRules: jest.fn(),
  reconcileInboxWithDecisions: jest.fn(async () => 0),
}));
jest.mock("../../../storage/dataChangeNotifier", () => ({ notifyDataChanged: jest.fn() }));

(global as any).__DEV__ = false;

const NOW = Date.parse("2026-07-01T12:00:00.000Z");

const tx = (over: Partial<NormalizedTransaction> = {}): NormalizedTransaction => ({
  providerTxId: "TXN-1",
  externalAccountId: "ACT-1",
  postedAt: "2026-06-28T00:00:00.000Z",
  amount: -25,
  description: "COSTCO WHSE #1234",
  pending: false,
  ...over,
});

const account = (over: Partial<NormalizedAccount> = {}): NormalizedAccount => ({
  externalAccountId: "ACT-1",
  name: "Checking",
  balance: 100,
  ...over,
});

const okFetch = (over: { accounts?: NormalizedAccount[]; transactions?: NormalizedTransaction[] } = {}) => ({
  ok: true as const,
  accounts: over.accounts ?? [],
  transactions: over.transactions ?? [],
});

const mockGetConnections = getConnections as jest.Mock;
const mockUpdateConnection = updateConnection as jest.Mock;
const mockGetConnectionSecrets = getConnectionSecrets as jest.Mock;
const mockGetLinksForConnection = getLinksForConnection as jest.Mock;
const mockUpdateLink = updateLink as jest.Mock;
const mockGetIngestLedger = getIngestLedger as jest.Mock;
const mockGetPendingTransactions = getPendingTransactions as jest.Mock;
const mockRecordLedgerEntries = recordLedgerEntries as jest.Mock;
const mockRemovePendingTransactions = removePendingTransactions as jest.Mock;
const mockUpsertPendingTransactions = upsertPendingTransactions as jest.Mock;
const mockGetMerchantRules = getMerchantRules as jest.Mock;
const mockGetBudgetEntriesIncludingDeleted = getBudgetEntriesIncludingDeleted as jest.Mock;
const mockGetAssetAccounts = getAssetAccounts as jest.Mock;
const mockUpdateAssetAccount = updateAssetAccount as jest.Mock;
const mockGetDebts = getDebts as jest.Mock;
const mockUpdateDebt = updateDebt as jest.Mock;
const mockReschedule = rescheduleCardKeepAliveReminders as jest.Mock;
const mockFetchSimplefin = fetchSimplefinAccounts as jest.Mock;
const mockFetchTeller = fetchTellerData as jest.Mock;
const mockAutoApprove = autoApproveInboxByRules as jest.Mock;
const mockNotifyDataChanged = notifyDataChanged as jest.Mock;

const SIMPLEFIN_SECRETS = { provider: "simplefin" as const, accessUrl: "https://u:p@bridge.example/access" };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetConnections.mockResolvedValue([]);
  mockUpdateConnection.mockResolvedValue([]);
  mockGetConnectionSecrets.mockResolvedValue(SIMPLEFIN_SECRETS);
  mockGetLinksForConnection.mockResolvedValue([]);
  mockUpdateLink.mockResolvedValue([]);
  mockGetIngestLedger.mockResolvedValue({});
  mockGetPendingTransactions.mockResolvedValue([]);
  mockRecordLedgerEntries.mockResolvedValue(undefined);
  mockRemovePendingTransactions.mockResolvedValue([]);
  mockUpsertPendingTransactions.mockResolvedValue([]);
  mockGetMerchantRules.mockResolvedValue([]);
  mockGetBudgetEntriesIncludingDeleted.mockResolvedValue([]);
  mockGetAssetAccounts.mockResolvedValue([]);
  mockUpdateAssetAccount.mockResolvedValue([]);
  mockGetDebts.mockResolvedValue([]);
  mockUpdateDebt.mockResolvedValue([]);
  mockReschedule.mockResolvedValue(undefined);
  mockFetchSimplefin.mockResolvedValue(okFetch());
  mockFetchTeller.mockResolvedValue(okFetch());
  mockAutoApprove.mockResolvedValue(0);
  mockNotifyDataChanged.mockReturnValue(undefined);
});

const conn = (over: Partial<BankConnection> = {}) => makeBankConnection({ id: "conn-1", ...over });

describe("gates before any fetch", () => {
  it("short-circuits a disabled connection without stamping lastAttemptAt or fetching", async () => {
    mockGetConnections.mockResolvedValue([conn({ enabled: false })]);
    const [result] = await syncConnections({ now: NOW });
    expect(result).toMatchObject({ outcome: "disabled", newPendingCount: 0, balancesUpdated: 0 });
    expect(mockUpdateConnection).not.toHaveBeenCalled();
    expect(mockFetchSimplefin).not.toHaveBeenCalled();
  });

  it("short-circuits needs-reauth on an automatic pass, but proceeds on a manual retry", async () => {
    mockGetConnections.mockResolvedValue([conn({ authStatus: "needs-reauth" })]);
    const [auto] = await syncConnections({ now: NOW, manual: false });
    expect(auto.outcome).toBe("needs-reauth");
    expect(mockUpdateConnection).not.toHaveBeenCalled();
    expect(mockFetchSimplefin).not.toHaveBeenCalled();

    jest.clearAllMocks();
    mockGetConnections.mockResolvedValue([conn({ authStatus: "needs-reauth" })]);
    mockGetConnectionSecrets.mockResolvedValue(SIMPLEFIN_SECRETS);
    mockFetchSimplefin.mockResolvedValue(okFetch());
    const [manual] = await syncConnections({ now: NOW, manual: true });
    expect(manual.outcome).toBe("updated");
    expect(mockFetchSimplefin).toHaveBeenCalled();
  });

  it("reports 'fresh' and does nothing when the cooldown hasn't elapsed", async () => {
    mockGetConnections.mockResolvedValue([
      conn({ lastAttemptAt: new Date(NOW - 1000).toISOString() }),
    ]);
    const [result] = await syncConnections({ now: NOW, manual: false });
    expect(result.outcome).toBe("fresh");
    expect(mockUpdateConnection).not.toHaveBeenCalled();
    expect(mockFetchSimplefin).not.toHaveBeenCalled();
  });

  it("stamps lastAttemptAt BEFORE fetching", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    await syncConnections({ now: NOW, manual: true });
    expect(mockUpdateConnection.mock.calls[0]).toEqual([
      "conn-1",
      { lastAttemptAt: new Date(NOW).toISOString() },
    ]);
  });
});

describe("provider fetch failures", () => {
  it("maps missing/mismatched secrets to 'unavailable' with invalid-credentials", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetConnectionSecrets.mockResolvedValue(undefined);
    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.outcome).toBe("unavailable");
    expect(mockUpdateConnection).toHaveBeenLastCalledWith(
      "conn-1",
      expect.objectContaining({ authStatus: "error", lastErrorCode: "invalid-credentials" }),
    );
    expect(mockFetchSimplefin).not.toHaveBeenCalled();
  });

  it("maps a provider mismatch (secrets for a different provider) the same way", async () => {
    mockGetConnections.mockResolvedValue([conn({ provider: "simplefin" })]);
    mockGetConnectionSecrets.mockResolvedValue({ provider: "teller", applicationId: "a" });
    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.outcome).toBe("unavailable");
  });

  it("maps auth-expired to needs-reauth and stamps authStatus", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockFetchSimplefin.mockResolvedValue({ ok: false, error: "auth-expired", message: "expired" });
    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result).toMatchObject({ outcome: "needs-reauth", errorMessage: "expired" });
    expect(mockUpdateConnection).toHaveBeenLastCalledWith(
      "conn-1",
      expect.objectContaining({ authStatus: "needs-reauth", lastErrorCode: "auth-expired" }),
    );
  });

  it("maps rate-limited to rate-limited outcome with authStatus error", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockFetchSimplefin.mockResolvedValue({ ok: false, error: "rate-limited", message: "slow down" });
    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.outcome).toBe("rate-limited");
    expect(mockUpdateConnection).toHaveBeenLastCalledWith(
      "conn-1",
      expect.objectContaining({ authStatus: "error", lastErrorCode: "rate-limited" }),
    );
  });

  it("maps any other provider error to 'unavailable'", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockFetchSimplefin.mockResolvedValue({ ok: false, error: "network", message: "offline" });
    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.outcome).toBe("unavailable");
  });

  it("routes a Teller connection through fetchTellerData, not SimpleFIN", async () => {
    mockGetConnections.mockResolvedValue([conn({ provider: "teller" })]);
    mockGetConnectionSecrets.mockResolvedValue({
      provider: "teller",
      applicationId: "app-1",
      certificatePem: "CERT",
      privateKeyPem: "KEY",
      accessTokens: {},
    });
    mockFetchTeller.mockResolvedValue(okFetch());
    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.outcome).toBe("updated");
    expect(mockFetchTeller).toHaveBeenCalled();
    expect(mockFetchSimplefin).not.toHaveBeenCalled();
  });
});

describe("successful sync bookkeeping", () => {
  it("marks the connection ok and clears prior error fields on success", async () => {
    mockGetConnections.mockResolvedValue([conn({ authStatus: "error", lastErrorCode: "network" })]);
    await syncConnections({ now: NOW, manual: true });
    expect(mockUpdateConnection).toHaveBeenLastCalledWith(
      "conn-1",
      expect.objectContaining({
        lastSyncedAt: new Date(NOW).toISOString(),
        authStatus: "ok",
        lastErrorCode: undefined,
        lastErrorMessage: undefined,
      }),
    );
  });

  it("ingests a new transaction into the pending inbox via the real planner", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([makeExternalAccountLink({ externalAccountId: "ACT-1" })]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ transactions: [tx()] }));

    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.newPendingCount).toBe(1);
    expect(mockUpsertPendingTransactions).toHaveBeenCalledTimes(1);
    const [[upserted]] = mockUpsertPendingTransactions.mock.calls;
    expect(upserted).toHaveLength(1);
    expect(upserted[0]).toMatchObject({ externalAccountId: "ACT-1", amount: -25 });
  });

  it("notifies dataChanged only when at least one connection outcome is 'updated'", async () => {
    mockGetConnections.mockResolvedValue([conn({ enabled: false })]);
    await syncConnections({ now: NOW, manual: true });
    expect(mockNotifyDataChanged).not.toHaveBeenCalled();

    jest.clearAllMocks();
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetConnectionSecrets.mockResolvedValue(SIMPLEFIN_SECRETS);
    mockFetchSimplefin.mockResolvedValue(okFetch());
    await syncConnections({ now: NOW, manual: true });
    expect(mockNotifyDataChanged).toHaveBeenCalledWith("bank-sync");
  });
});

describe("balance application", () => {
  const link = makeExternalAccountLink({
    id: "link-1",
    externalAccountId: "ACT-1",
    assetAccountId: "asset-1",
    updateBalance: true,
  });

  it("clamps a negative provider balance at 0 before writing an AssetAccount", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([link]);
    mockGetAssetAccounts.mockResolvedValue([makeAssetAccount({ id: "asset-1", category: "checking", balance: 100 })]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ accounts: [account({ balance: -50 })] }));

    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.balancesUpdated).toBe(1);
    expect(mockUpdateAssetAccount).toHaveBeenCalledWith("asset-1", { balance: 0 });
    // Raw (unclamped) value still lands on the link for display.
    expect(mockUpdateLink).toHaveBeenCalledWith(
      "link-1",
      expect.objectContaining({ lastExternalBalance: -50 }),
    );
  });

  it("skips the write when the clamped balance is unchanged", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([link]);
    mockGetAssetAccounts.mockResolvedValue([makeAssetAccount({ id: "asset-1", category: "checking", balance: 250 })]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ accounts: [account({ balance: 250 })] }));

    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.balancesUpdated).toBe(0);
    expect(mockUpdateAssetAccount).not.toHaveBeenCalled();
  });

  it("writes a synced balance onto a holdings account (401k / investment) like any other", async () => {
    // Retirement/investment used to be skipped as "valued by tickers only";
    // a bank-reported 401k balance is now the account's cash line.
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([link]);
    mockGetAssetAccounts.mockResolvedValue([
      makeAssetAccount({ id: "asset-1", category: "retirement", balance: 0 }),
    ]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ accounts: [account({ balance: 5000 })] }));

    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.balancesUpdated).toBe(1);
    expect(mockUpdateAssetAccount).toHaveBeenCalledWith("asset-1", { balance: 5000 });
  });

  it("skips the AssetAccount write (but still records the raw balance on the link) when updateBalance is off", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([{ ...link, updateBalance: false }]);
    mockGetAssetAccounts.mockResolvedValue([makeAssetAccount({ id: "asset-1", category: "checking", balance: 100 })]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ accounts: [account({ balance: 500 })] }));

    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.balancesUpdated).toBe(0);
    expect(mockUpdateAssetAccount).not.toHaveBeenCalled();
    expect(mockUpdateLink).toHaveBeenCalledWith(
      "link-1",
      expect.objectContaining({ lastExternalBalance: 500 }),
    );
  });

  it("ignores an unlinked provider account with no local mapping", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ id: "link-2", externalAccountId: "ACT-OTHER", assetAccountId: null }),
    ]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ accounts: [account({ balance: 500 })] }));
    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.balancesUpdated).toBe(0);
    expect(mockUpdateAssetAccount).not.toHaveBeenCalled();
  });
});

describe("card keep-alive auto-stamping", () => {
  it("stamps the linked debt's keepAliveLastUsedAt from the newest fetched outflow", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ externalAccountId: "ACT-1", debtId: "debt-1" }),
    ]);
    mockGetDebts.mockResolvedValue([
      makeDebt({ id: "debt-1", debtClass: "personal_credit", keepAliveEnabled: true } as any),
    ]);
    mockFetchSimplefin.mockResolvedValue(
      okFetch({
        transactions: [
          tx({ providerTxId: "T1", amount: -10, postedAt: "2026-06-20T00:00:00.000Z" }),
          tx({ providerTxId: "T2", amount: -20, postedAt: "2026-06-25T00:00:00.000Z" }),
        ],
      }),
    );

    await syncConnections({ now: NOW, manual: true });
    expect(mockUpdateDebt).toHaveBeenCalledWith("debt-1", {
      keepAliveLastUsedAt: "2026-06-25T00:00:00.000Z",
    });
    expect(mockReschedule).toHaveBeenCalled();
  });

  it("does nothing (and never calls getDebts) when no link carries a debtId", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([makeExternalAccountLink({ externalAccountId: "ACT-1" })]);
    await syncConnections({ now: NOW, manual: true });
    expect(mockGetDebts).not.toHaveBeenCalled();
    expect(mockUpdateDebt).not.toHaveBeenCalled();
  });

  it("is best-effort: a keep-alive failure does not fail the sync pass", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ externalAccountId: "ACT-1", debtId: "debt-1" }),
    ]);
    mockGetDebts.mockRejectedValue(new Error("storage exploded"));
    mockFetchSimplefin.mockResolvedValue(okFetch({ transactions: [tx({ amount: -10 })] }));

    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.outcome).toBe("updated");
  });
});

describe("credit-card balance mirroring (debt-linked accounts)", () => {
  it("writes the provider balance's magnitude onto the linked debt and counts it", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ externalAccountId: "ACT-1", debtId: "debt-1", assetAccountId: null }),
    ]);
    mockGetDebts.mockResolvedValue([makeDebt({ id: "debt-1", balance: 100, originalBalance: 1000 })]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ accounts: [account({ balance: -420.5 })] }));

    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(mockUpdateDebt).toHaveBeenCalledTimes(1);
    expect(mockUpdateDebt).toHaveBeenCalledWith("debt-1", { balance: 420.5 });
    expect(mockUpdateAssetAccount).not.toHaveBeenCalled();
    expect(result.balancesUpdated).toBe(1);
  });

  it("merges the balance and the keep-alive stamp into ONE debt write", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ externalAccountId: "ACT-1", debtId: "debt-1", assetAccountId: null }),
    ]);
    mockGetDebts.mockResolvedValue([
      makeDebt({ id: "debt-1", balance: 100, originalBalance: 1000, keepAliveEnabled: true }),
    ]);
    mockFetchSimplefin.mockResolvedValue(
      okFetch({
        accounts: [account({ balance: -50 })],
        transactions: [tx({ amount: -10, postedAt: "2026-06-25T00:00:00.000Z" })],
      }),
    );

    await syncConnections({ now: NOW, manual: true });
    expect(mockUpdateDebt).toHaveBeenCalledTimes(1);
    expect(mockUpdateDebt).toHaveBeenCalledWith("debt-1", {
      balance: 50,
      keepAliveLastUsedAt: "2026-06-25T00:00:00.000Z",
    });
    expect(mockReschedule).toHaveBeenCalled();
  });

  it("still stamps keep-alive when balance mirroring is switched off for the link", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({
        externalAccountId: "ACT-1",
        debtId: "debt-1",
        assetAccountId: null,
        updateDebtBalance: false,
      }),
    ]);
    mockGetDebts.mockResolvedValue([
      makeDebt({ id: "debt-1", balance: 100, originalBalance: 1000, keepAliveEnabled: true }),
    ]);
    mockFetchSimplefin.mockResolvedValue(
      okFetch({
        accounts: [account({ balance: -50 })],
        transactions: [tx({ amount: -10, postedAt: "2026-06-25T00:00:00.000Z" })],
      }),
    );

    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(mockUpdateDebt).toHaveBeenCalledWith("debt-1", {
      keepAliveLastUsedAt: "2026-06-25T00:00:00.000Z",
    });
    expect(result.balancesUpdated).toBe(0);
  });

  it("skips the write (and the count) when the debt balance is already current", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ externalAccountId: "ACT-1", debtId: "debt-1", assetAccountId: null }),
    ]);
    mockGetDebts.mockResolvedValue([makeDebt({ id: "debt-1", balance: 100, originalBalance: 1000 })]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ accounts: [account({ balance: -100 })] }));

    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(mockUpdateDebt).not.toHaveBeenCalled();
    expect(result.balancesUpdated).toBe(0);
  });

  it("raises originalBalance as a high-water mark when new charges exceed it", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ externalAccountId: "ACT-1", debtId: "debt-1", assetAccountId: null }),
    ]);
    mockGetDebts.mockResolvedValue([makeDebt({ id: "debt-1", balance: 0, originalBalance: 0.01 })]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ accounts: [account({ balance: -300 })] }));

    await syncConnections({ now: NOW, manual: true });
    expect(mockUpdateDebt).toHaveBeenCalledWith("debt-1", { balance: 300, originalBalance: 300 });
  });

  it("nulls a link whose debt no longer exists instead of writing anything", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ id: "link-9", externalAccountId: "ACT-1", debtId: "gone", assetAccountId: null }),
    ]);
    mockGetDebts.mockResolvedValue([]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ accounts: [account({ balance: -300 })] }));

    await syncConnections({ now: NOW, manual: true });
    expect(mockUpdateDebt).not.toHaveBeenCalled();
    expect(mockUpdateLink).toHaveBeenCalledWith("link-9", { debtId: null });
  });
});

describe("auto-approve sweep", () => {
  it("is best-effort: a sweep failure does not fail the sync pass", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockAutoApprove.mockRejectedValue(new Error("sweep exploded"));
    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.outcome).toBe("updated");
  });

  it("runs once per connection sync", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    await syncConnections({ now: NOW, manual: true });
    expect(mockAutoApprove).toHaveBeenCalledTimes(1);
  });
});

describe("multi-connection batch", () => {
  it("does not let one connection's unexpected throw abort the rest of the pass", async () => {
    mockGetConnections.mockResolvedValue([conn({ id: "conn-1" }), conn({ id: "conn-2" })]);
    mockGetLinksForConnection.mockImplementation(async (connectionId: string) => {
      if (connectionId === "conn-1") throw new Error("surprise failure");
      return [];
    });

    const results = await syncConnections({ now: NOW, manual: true });
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      connectionId: "conn-1",
      outcome: "unavailable",
      errorMessage: "Something went wrong syncing this connection.",
    });
    expect(results[1]).toMatchObject({ connectionId: "conn-2", outcome: "updated" });
  });

  it("filters to a single connection when connectionId is given", async () => {
    mockGetConnections.mockResolvedValue([conn({ id: "conn-1" }), conn({ id: "conn-2" })]);
    const results = await syncConnections({ now: NOW, manual: true, connectionId: "conn-2" });
    expect(results.map((r) => r.connectionId)).toEqual(["conn-2"]);
  });

  it("shares one in-flight pass across concurrent callers instead of stacking a second", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    const [a, b] = await Promise.all([
      syncConnections({ now: NOW, manual: true }),
      syncConnections({ now: NOW, manual: true }),
    ]);
    expect(a).toBe(b); // same resolved array reference - one pass, shared
    expect(mockGetConnections).toHaveBeenCalledTimes(1);
  });
});

describe("connection secrets never leak into non-secret storage writes", () => {
  it("keeps SimpleFIN accessUrl and Teller PEMs/tokens out of every mocked write call", async () => {
    const secretMarkers = ["SECRET-ACCESS-URL-MARKER", "SECRET-CERT-PEM-MARKER", "SECRET-KEY-PEM-MARKER", "SECRET-TOKEN-MARKER"];
    mockGetConnections.mockResolvedValue([conn({ provider: "teller" })]);
    mockGetConnectionSecrets.mockResolvedValue({
      provider: "teller",
      applicationId: "app-1",
      certificatePem: "SECRET-CERT-PEM-MARKER",
      privateKeyPem: "SECRET-KEY-PEM-MARKER",
      accessTokens: { "enroll-1": "SECRET-TOKEN-MARKER" },
    });
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ externalAccountId: "ACT-1", debtId: "debt-1", assetAccountId: "asset-1" }),
    ]);
    mockGetAssetAccounts.mockResolvedValue([makeAssetAccount({ id: "asset-1", category: "checking", balance: 0 })]);
    mockGetDebts.mockResolvedValue([makeDebt({ id: "debt-1", debtClass: "personal_credit", keepAliveEnabled: true } as any)]);
    mockFetchTeller.mockResolvedValue(
      okFetch({ accounts: [account({ balance: 42 })], transactions: [tx({ amount: -5 })] }),
    );

    await syncConnections({ now: NOW, manual: true });

    const writesToInspect = [
      ...mockUpdateConnection.mock.calls,
      ...mockUpdateLink.mock.calls,
      ...mockUpsertPendingTransactions.mock.calls,
      ...mockRecordLedgerEntries.mock.calls,
      ...mockUpdateAssetAccount.mock.calls,
      ...mockUpdateDebt.mock.calls,
      ...mockRemovePendingTransactions.mock.calls,
    ];
    const serialized = JSON.stringify(writesToInspect);
    for (const marker of secretMarkers) {
      expect(serialized).not.toContain(marker);
    }
  });
});

describe("startConnectionsMonitoring / stopConnectionsMonitoring", () => {
  it("registers the AppState listener once (idempotent) and kicks an initial pass", async () => {
    const rn = require("react-native");
    rn.AppState.addEventListener.mockReturnValue({ remove: jest.fn() });
    mockGetConnections.mockResolvedValue([]);
    startConnectionsMonitoring();
    startConnectionsMonitoring();
    expect(rn.AppState.addEventListener).toHaveBeenCalledTimes(1);
    // Flush the fire-and-forget initial maybeAutoSyncConnections() call.
    await Promise.resolve();
    await Promise.resolve();
    expect(mockGetConnections).toHaveBeenCalled();
    stopConnectionsMonitoring();
  });

  it("removes the listener on stop", () => {
    const rn = require("react-native");
    const remove = jest.fn();
    rn.AppState.addEventListener.mockReturnValue({ remove });
    startConnectionsMonitoring();
    stopConnectionsMonitoring();
    expect(remove).toHaveBeenCalled();
  });
});

describe("gap backfill (a bank behind the bridge comes back after going dark)", () => {
  const DAY = 24 * 3600_000;
  const iso = (ms: number) => new Date(ms).toISOString();
  const startOfCall = (index: number): number =>
    mockFetchSimplefin.mock.calls[index][1].startDateEpochSec * 1000;

  beforeEach(() => {
    mockGetConnections.mockResolvedValue([conn({ lastSyncedAt: iso(NOW - DAY) })]);
  });

  it("re-fetches once from the frozen balance date minus the overlap and ingests that superset", async () => {
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ externalAccountId: "ACT-1", lastExternalBalanceAt: iso(NOW - 30 * DAY) }),
    ]);
    const cameBack = account({ balanceAsOf: iso(NOW) });
    mockFetchSimplefin
      .mockResolvedValueOnce(okFetch({ accounts: [cameBack], transactions: [tx({ providerTxId: "RECENT" })] }))
      .mockResolvedValueOnce(
        okFetch({
          accounts: [cameBack],
          transactions: [tx({ providerTxId: "RECENT" }), tx({ providerTxId: "OLD", postedAt: iso(NOW - 20 * DAY) })],
        }),
      );

    const [result] = await syncConnections({ now: NOW, manual: true });

    expect(mockFetchSimplefin).toHaveBeenCalledTimes(2);
    expect(startOfCall(0)).toBe(NOW - DAY - 7 * DAY);
    expect(startOfCall(1)).toBe(NOW - 30 * DAY - 7 * DAY);
    expect(result.outcome).toBe("updated");
    expect(result.backfilledFrom).toBe(iso(NOW - 30 * DAY - 7 * DAY));
    expect(result.newPendingCount).toBe(2);
    const upserted = mockUpsertPendingTransactions.mock.calls[0][0].map((item: any) => item.providerTxId).sort();
    expect(upserted).toEqual(["OLD", "RECENT"]);
  });

  it("fetches once when every bank's balance date is current", async () => {
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ externalAccountId: "ACT-1", lastExternalBalanceAt: iso(NOW - 2 * DAY) }),
    ]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ accounts: [account({ balanceAsOf: iso(NOW) })] }));
    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(mockFetchSimplefin).toHaveBeenCalledTimes(1);
    expect(result.backfilledFrom).toBeUndefined();
  });

  it("keeps the first result when the wider re-fetch fails, so the pass still succeeds", async () => {
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ externalAccountId: "ACT-1", lastExternalBalanceAt: iso(NOW - 30 * DAY) }),
    ]);
    mockFetchSimplefin
      .mockResolvedValueOnce(okFetch({ accounts: [account({ balanceAsOf: iso(NOW) })], transactions: [tx()] }))
      .mockResolvedValueOnce({ ok: false, error: "rate-limited", message: "limit" });
    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.outcome).toBe("updated");
    expect(result.backfilledFrom).toBeUndefined();
    expect(result.newPendingCount).toBe(1);
  });

  it("leaves the link's balance date alone when the re-fetch fails, so the next pass sees the gap again", async () => {
    const link = makeExternalAccountLink({
      externalAccountId: "ACT-1",
      lastExternalBalance: 100,
      lastExternalBalanceAt: iso(NOW - 30 * DAY),
    });
    mockGetLinksForConnection.mockResolvedValue([link]);
    const cameBack = account({ balance: 250, balanceAsOf: iso(NOW) });
    mockFetchSimplefin
      .mockResolvedValueOnce(okFetch({ accounts: [cameBack], transactions: [tx()] }))
      .mockResolvedValueOnce({ ok: false, error: "rate-limited", message: "limit" });

    await syncConnections({ now: NOW, manual: true });

    // The balance changed, which would normally stamp lastExternalBalanceAt
    // = now and make planGapBackfill think the window already covers it.
    const stamped = mockUpdateLink.mock.calls.filter(
      (call: any[]) => call[0] === link.id && "lastExternalBalanceAt" in (call[1] ?? {}),
    );
    expect(stamped).toHaveLength(0);
  });

  it("stamps the balance date after a successful re-fetch even when the balance did not move", async () => {
    const link = makeExternalAccountLink({
      externalAccountId: "ACT-1",
      lastExternalBalance: 100,
      lastExternalBalanceAt: iso(NOW - 30 * DAY),
    });
    mockGetLinksForConnection.mockResolvedValue([link]);
    const unchanged = account({ balance: 100, balanceAsOf: iso(NOW) });
    mockFetchSimplefin
      .mockResolvedValueOnce(okFetch({ accounts: [unchanged], transactions: [tx()] }))
      .mockResolvedValueOnce(okFetch({ accounts: [unchanged], transactions: [tx()] }));

    const [result] = await syncConnections({ now: NOW, manual: true });

    expect(result.backfilledFrom).toBeDefined();
    expect(mockUpdateLink).toHaveBeenCalledWith(
      link.id,
      expect.objectContaining({ lastExternalBalanceAt: iso(NOW) }),
    );
  });

  it("an explicit re-import widens the window to N days, skips the cooldown, and never gap-detects", async () => {
    mockGetConnections.mockResolvedValue([
      conn({ lastSyncedAt: iso(NOW - DAY), lastAttemptAt: iso(NOW - 60_000) }), // inside the 15-min cooldown
    ]);
    mockGetLinksForConnection.mockResolvedValue([
      makeExternalAccountLink({ externalAccountId: "ACT-1", lastExternalBalanceAt: iso(NOW - 30 * DAY) }),
    ]);
    mockFetchSimplefin.mockResolvedValue(okFetch({ accounts: [account({ balanceAsOf: iso(NOW) })] }));

    const [plain] = await syncConnections({ now: NOW, manual: true });
    expect(plain.outcome).toBe("fresh");

    const [result] = await syncConnections({ now: NOW, manual: true, backfillDays: 90 });
    expect(result.outcome).toBe("updated");
    expect(mockFetchSimplefin).toHaveBeenCalledTimes(1);
    expect(startOfCall(0)).toBe(NOW - 90 * DAY);
    expect(result.backfilledFrom).toBe(iso(NOW - 90 * DAY));
  });
});

describe("provider warnings (SimpleFIN per-institution errors)", () => {
  it("stores the bridge's warnings on a successful pass and clears them on the next clean one", async () => {
    mockGetConnections.mockResolvedValue([conn()]);
    mockFetchSimplefin.mockResolvedValue({
      ...okFetch(),
      warnings: ["Connection to Chase may need attention"],
    });
    const [result] = await syncConnections({ now: NOW, manual: true });
    expect(result.outcome).toBe("updated");
    expect(mockUpdateConnection).toHaveBeenCalledWith(
      "conn-1",
      expect.objectContaining({
        authStatus: "ok",
        providerWarnings: ["Connection to Chase may need attention"],
      }),
    );

    mockUpdateConnection.mockClear();
    mockFetchSimplefin.mockResolvedValue(okFetch());
    await syncConnections({ now: NOW + 3600_000, manual: true });
    expect(mockUpdateConnection).toHaveBeenCalledWith(
      "conn-1",
      expect.objectContaining({ authStatus: "ok", providerWarnings: undefined }),
    );
  });
});
