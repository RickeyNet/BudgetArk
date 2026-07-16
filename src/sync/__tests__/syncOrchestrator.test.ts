/**
 * syncOrchestrator drives the end-to-end LAN sync: discover the partner, pick
 * client vs server role, exchange encrypted diffs over the transport, apply the
 * incoming diff and stamp sync metadata. We mock the edges it coordinates
 * (discovery, transport, diff engine, pairing/user storage) and drive the
 * message handshake through a fake connection so the orchestration logic -
 * role selection, the server/client message dance, error mapping, record
 * counting and cleanup - runs for real.
 */
import { syncNow } from "../syncOrchestrator";

jest.mock("../../storage/userStorage", () => ({ getOrCreateUser: jest.fn() }));
jest.mock("../pairingStorage", () => ({
  getPairingState: jest.fn(),
  getSyncMetadata: jest.fn(),
  updateSyncMetadata: jest.fn(),
}));
jest.mock("../discoveryService", () => ({
  publish: jest.fn(),
  stop: jest.fn(),
  discoverPartner: jest.fn(),
}));
jest.mock("../transportService", () => ({
  startServer: jest.fn(),
  connectToHost: jest.fn(),
  resetReplayProtection: jest.fn(),
  wasProtocolMismatchSeen: jest.fn(() => false),
}));
jest.mock("../diffEngine", () => ({
  computeOutgoingDiff: jest.fn(),
  applyIncomingDiff: jest.fn(),
  markBackfillSyncDone: jest.fn(),
}));

const userStorage = require("../../storage/userStorage");
const pairingStorage = require("../pairingStorage");
const Discovery = require("../discoveryService");
const Transport = require("../transportService");
const diffEngine = require("../diffEngine");

const PAIRING = {
  partnerId: "partner",
  partnerName: "Partner",
  sharedSecret: "secret",
  pairedAt: "2020-01-01T00:00:00.000Z",
  autoSyncEnabled: true,
};

// A diff with one debt + two payments -> countDiffEntries === 3.
const OUT_DIFF = {
  debts: [{ action: "upsert", record: {} }],
  payments: [{ action: "upsert", record: {} }, { action: "delete", record: {} }],
  budgetEntries: [],
  budgetLimits: [],
  savingsGoals: [],
  assetAccounts: [],
  syncTimestamp: "t",
};

// A fake transport connection: last onMessage callback wins (mirrors the real
// one), and emit() invokes it the way an inbound frame would.
const makeConn = () => {
  let cb: ((msg: any, payload: string) => void) | null = null;
  return {
    send: jest.fn(),
    onMessage: (fn: any) => {
      cb = fn;
    },
    close: jest.fn(),
    emit: (msg: any, payload = "") => cb?.(msg, payload),
  };
};

// Settle deep await chains (discover -> connect -> compute -> ...) under fake timers.
const flush = async () => {
  for (let i = 0; i < 6; i++) await jest.advanceTimersByTimeAsync(0);
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  userStorage.getOrCreateUser.mockResolvedValue({ id: "me", displayName: "Me" });
  pairingStorage.getPairingState.mockResolvedValue(PAIRING);
  pairingStorage.getSyncMetadata.mockResolvedValue({ lastSyncTimestamp: "2020-06-01", syncCount: 2 });
  pairingStorage.updateSyncMetadata.mockResolvedValue(undefined);
  diffEngine.computeOutgoingDiff.mockResolvedValue(OUT_DIFF);
  diffEngine.applyIncomingDiff.mockResolvedValue(5); // 5 records received
  diffEngine.markBackfillSyncDone.mockResolvedValue(undefined);
  Transport.wasProtocolMismatchSeen.mockReturnValue(false);
});
afterEach(() => {
  jest.useRealTimers();
});

describe("not paired", () => {
  it("returns a failure result without touching the network", async () => {
    pairingStorage.getPairingState.mockResolvedValue(null);
    const result = await syncNow();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not paired/i);
    expect(Discovery.discoverPartner).not.toHaveBeenCalled();
    expect(Transport.startServer).not.toHaveBeenCalled();
  });
});

describe("client role (partner discovered first)", () => {
  it("connects, exchanges diffs on SYNC_RESPONSE, and reports counts", async () => {
    Discovery.discoverPartner.mockResolvedValue({ host: "10.0.0.2", port: 5000 });
    const conn = makeConn();
    Transport.connectToHost.mockResolvedValue(conn);
    const statuses: string[] = [];

    const p = syncNow((s) => statuses.push(s));
    await flush();

    expect(Transport.connectToHost).toHaveBeenCalledWith("10.0.0.2", 5000, "me", "partner", "secret");
    // We sent our diff as the request.
    expect(conn.send).toHaveBeenCalledWith("SYNC_REQUEST", OUT_DIFF);

    conn.emit({ type: "SYNC_RESPONSE" }, JSON.stringify({ from: "partner" }));
    const result = await p;

    expect(diffEngine.applyIncomingDiff).toHaveBeenCalledWith({ from: "partner" });
    expect(conn.send).toHaveBeenCalledWith("SYNC_ACK", { ok: true });
    expect(result).toMatchObject({ success: true, recordsSent: 3, recordsReceived: 5 });
    // The persisted watermark is the diff's pre-read syncTimestamp, NOT a
    // post-sync "now" - otherwise records edited mid-sync would sort older
    // than lastSyncTimestamp and never propagate.
    expect(pairingStorage.updateSyncMetadata).toHaveBeenCalledTimes(1);
    expect(pairingStorage.updateSyncMetadata).toHaveBeenCalledWith(OUT_DIFF.syncTimestamp);
    expect(diffEngine.markBackfillSyncDone).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["discovering", "connecting", "syncing", "complete"]);

    // The connection is closed on a short delay, and cleanup ran.
    await jest.advanceTimersByTimeAsync(500);
    expect(conn.close).toHaveBeenCalled();
    expect(Discovery.stop).toHaveBeenCalled();
    expect(Transport.resetReplayProtection).toHaveBeenCalled();
  });

  it("times out waiting for the partner's response", async () => {
    Discovery.discoverPartner.mockResolvedValue({ host: "h", port: 1 });
    const conn = makeConn();
    Transport.connectToHost.mockResolvedValue(conn);

    const p = syncNow();
    await flush();
    await jest.advanceTimersByTimeAsync(30_000); // no SYNC_RESPONSE ever arrives
    const result = await p;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/timed out/i);
    expect(conn.close).toHaveBeenCalled();
  });

  it("surfaces an incompatible-version message when a protocol mismatch was seen", async () => {
    Discovery.discoverPartner.mockResolvedValue({ host: "h", port: 1 });
    const conn = makeConn();
    Transport.connectToHost.mockResolvedValue(conn);
    Transport.wasProtocolMismatchSeen.mockReturnValue(true);

    const p = syncNow();
    await flush();
    await jest.advanceTimersByTimeAsync(30_000);
    const result = await p;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/incompatible app version/i);
  });

  it("maps a thrown error while applying the incoming diff to a failure result", async () => {
    Discovery.discoverPartner.mockResolvedValue({ host: "h", port: 1 });
    const conn = makeConn();
    Transport.connectToHost.mockResolvedValue(conn);
    diffEngine.applyIncomingDiff.mockRejectedValue(new Error("bad record"));

    const p = syncNow();
    await flush();
    conn.emit({ type: "SYNC_RESPONSE" }, "{}");
    const result = await p;

    expect(result).toMatchObject({ success: false, error: "bad record" });
    expect(conn.close).toHaveBeenCalled();
  });
});

describe("server role (partner not discovered)", () => {
  // Wire startServer to invoke onListening synchronously, then resolve with conn.
  const wireServer = (conn: ReturnType<typeof makeConn>, port = 7000) => {
    const closeServer = jest.fn();
    Transport.startServer.mockImplementation(
      async (_id: string, _partner: string, _key: string, onListening: any) => {
        onListening?.(port, closeServer);
        return { connection: conn, port };
      }
    );
    return closeServer;
  };

  it("advertises, then completes the SYNC_REQUEST -> SYNC_RESPONSE -> SYNC_ACK dance", async () => {
    Discovery.discoverPartner.mockResolvedValue(null); // both scans miss
    const conn = makeConn();
    wireServer(conn, 7000);
    const statuses: string[] = [];

    const p = syncNow((s) => statuses.push(s));
    await flush();

    expect(Discovery.publish).toHaveBeenCalledWith("me", 7000);

    // Partner connects and sends their diff first (server applies, then replies).
    conn.emit({ type: "SYNC_REQUEST" }, JSON.stringify({ from: "joiner" }));
    await flush();
    expect(diffEngine.applyIncomingDiff).toHaveBeenCalledWith({ from: "joiner" });
    expect(conn.send).toHaveBeenCalledWith("SYNC_RESPONSE", OUT_DIFF);

    // Partner ACKs our response -> we finalize.
    conn.emit({ type: "SYNC_ACK" });
    const result = await p;

    expect(result).toMatchObject({ success: true, recordsSent: 3, recordsReceived: 5 });
    expect(pairingStorage.updateSyncMetadata).toHaveBeenCalledTimes(1);
    // Same early-watermark contract as the client path.
    expect(pairingStorage.updateSyncMetadata).toHaveBeenCalledWith(OUT_DIFF.syncTimestamp);
    expect(conn.close).toHaveBeenCalled();
    expect(Discovery.stop).toHaveBeenCalled();
    expect(statuses).toContain("complete");
  });

  it("times out waiting for a partner to connect", async () => {
    Discovery.discoverPartner.mockResolvedValue(null);
    const conn = makeConn();
    wireServer(conn);

    const p = syncNow();
    await flush();
    await jest.advanceTimersByTimeAsync(30_000); // no SYNC_REQUEST arrives
    const result = await p;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/timed out waiting for partner/i);
    expect(conn.close).toHaveBeenCalled();
  });

  it("returns a failure result if the server fails to start", async () => {
    Discovery.discoverPartner.mockResolvedValue(null);
    Transport.startServer.mockRejectedValue(new Error("bind failed"));

    const result = await syncNow();
    expect(result).toMatchObject({ success: false, error: "bind failed" });
    expect(Discovery.stop).toHaveBeenCalled();
  });
});

describe("server -> client switch (retry scan finds the partner)", () => {
  it("tears down the pending server and syncs as client when the retry scan hits", async () => {
    // First scan misses, second scan finds the partner's server.
    Discovery.discoverPartner
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ host: "10.0.0.9", port: 9000 });

    // Our own server never gets a connection (stays pending) - it should be cancelled.
    const closeServer = jest.fn();
    Transport.startServer.mockImplementation(
      async (_id: string, _p: string, _k: string, onListening: any) => {
        onListening?.(7000, closeServer);
        return await new Promise(() => {}); // never resolves
      }
    );

    const clientConn = makeConn();
    Transport.connectToHost.mockResolvedValue(clientConn);

    const p = syncNow();
    await flush();

    // Switched to client mode against the retry peer.
    expect(Transport.connectToHost).toHaveBeenCalledWith("10.0.0.9", 9000, "me", "partner", "secret");

    clientConn.emit({ type: "SYNC_RESPONSE" }, "{}");
    const result = await p;

    expect(result.success).toBe(true);
    expect(Discovery.stop).toHaveBeenCalled();
  });
});

describe("cleanup", () => {
  it("always stops discovery and resets replay protection in finally", async () => {
    Discovery.discoverPartner.mockResolvedValue({ host: "h", port: 1 });
    Transport.connectToHost.mockRejectedValue(new Error("connect refused"));

    const result = await syncNow();
    expect(result.success).toBe(false);
    expect(Discovery.stop).toHaveBeenCalled();
    expect(Transport.resetReplayProtection).toHaveBeenCalled();
  });
});
