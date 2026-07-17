/**
 * pairingService owns the one-time handshake: pure code/fingerprint helpers
 * plus the initiator/joiner async flows over the transport. We mock the
 * platform + network + transport/discovery/storage edges (and the ESM-only
 * uuid package) and run REAL CryptoJS so the code/key/fingerprint math is
 * exercised for real.
 */
import {
  generatePairingCode,
  normalizePairingCode,
  computeFingerprint,
  startPairingAsInitiator,
  joinPairing,
} from "../pairingService";

jest.mock("../../utils/uuid", () => ({ generateUUID: () => "uuid-fixed" }));
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  PermissionsAndroid: {
    check: jest.fn(),
    request: jest.fn(),
    PERMISSIONS: { ACCESS_FINE_LOCATION: "loc" },
    RESULTS: { GRANTED: "granted" },
  },
}));
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { configure: jest.fn(), fetch: jest.fn() },
}));
jest.mock("../../storage/userStorage", () => ({ getOrCreateUser: jest.fn() }));
jest.mock("../pairingStorage", () => ({ savePairingState: jest.fn() }));
jest.mock("../discoveryService", () => ({
  publish: jest.fn(),
  stop: jest.fn(),
  discoverPartner: jest.fn(),
}));
jest.mock("../transportService", () => ({
  startServer: jest.fn(),
  connectToHost: jest.fn(),
}));

const NetInfo = require("@react-native-community/netinfo").default;
const userStorage = require("../../storage/userStorage");
const pairingStorage = require("../pairingStorage");
const Discovery = require("../discoveryService");
const Transport = require("../transportService");

const CROCKFORD = /^[0-9A-HJKMNP-TV-Z]+$/; // no I, L, O, U

describe("normalizePairingCode", () => {
  it("uppercases and strips whitespace and dashes", () => {
    expect(normalizePairingCode("ab cd-efgh")).toBe("ABCDEFGH");
    expect(normalizePairingCode("  abcd  ")).toBe("ABCD");
  });

  it("folds Crockford-confusable characters (I/L → 1, O → 0)", () => {
    expect(normalizePairingCode("ilo")).toBe("110");
    expect(normalizePairingCode("o0o0")).toBe("0000");
  });

  it("caps the result at 8 characters", () => {
    expect(normalizePairingCode("ABCDEFGHJK")).toHaveLength(8);
  });
});

describe("generatePairingCode", () => {
  it("produces an XXXX-XXXX code in the Crockford alphabet", () => {
    const code = generatePairingCode();
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  it("is already canonical (never emits a confusable char)", () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePairingCode().replace("-", "")).toMatch(CROCKFORD);
    }
  });

  it("produces different codes across calls", () => {
    const seen = new Set(Array.from({ length: 50 }, () => generatePairingCode()));
    expect(seen.size).toBeGreaterThan(45); // overwhelmingly unique
  });
});

describe("computeFingerprint", () => {
  it("is a deterministic XXX-XXX Crockford string", () => {
    const fp = computeFingerprint("deadbeef");
    expect(fp).toMatch(/^[0-9A-HJKMNP-TV-Z]{3}-[0-9A-HJKMNP-TV-Z]{3}$/);
    expect(computeFingerprint("deadbeef")).toBe(fp); // stable
  });

  it("differs for different shared secrets", () => {
    expect(computeFingerprint("aaaa")).not.toBe(computeFingerprint("bbbb"));
  });
});

// ── Async handshake flows ──
const makeConn = () => {
  let cb: ((msg: any, payload: string) => void) | null = null;
  return {
    send: jest.fn(),
    onMessage: (fn: any) => {
      cb = fn;
    },
    close: jest.fn(),
    emit: (msg: any, payload: string) => cb?.(msg, payload),
  };
};

const flush = () => jest.advanceTimersByTimeAsync(0);

describe("handshake flows", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    userStorage.getOrCreateUser.mockResolvedValue({ id: "me", displayName: "Me" });
    pairingStorage.savePairingState.mockResolvedValue(undefined);
    NetInfo.fetch.mockResolvedValue({
      type: "wifi",
      isConnected: true,
      details: { ipAddress: "192.168.1.5" },
    });
    Discovery.publish.mockReset();
    Discovery.stop.mockReset();
    Discovery.discoverPartner.mockReset();
    Transport.startServer.mockReset();
    Transport.connectToHost.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe("joinPairing", () => {
    it("sends a PAIR_OFFER and resolves on PAIR_ACCEPT", async () => {
      Discovery.discoverPartner.mockResolvedValue({ host: "h", port: 1 });
      const conn = makeConn();
      Transport.connectToHost.mockResolvedValue(conn);

      const p = joinPairing("ABCD-EFGH");
      await flush();

      expect(conn.send).toHaveBeenCalledWith(
        "PAIR_OFFER",
        expect.objectContaining({ userId: "me", displayName: "Me" })
      );

      conn.emit(
        { type: "PAIR_ACCEPT" },
        JSON.stringify({ userId: "partner", displayName: "Partner", confirmed: true })
      );
      const pending = await p;

      expect(pending.pairingState.partnerId).toBe("partner");
      expect(pending.pairingState.partnerName).toBe("Partner");
      expect(pending.fingerprint).toMatch(/^[0-9A-Z]{3}-[0-9A-Z]{3}$/);

      await pending.commit();
      expect(pairingStorage.savePairingState).toHaveBeenCalledWith(pending.pairingState);

      await jest.advanceTimersByTimeAsync(600); // cleanup timer
      expect(conn.close).toHaveBeenCalled();
    });

    it("uses a manual address and skips discovery", async () => {
      const conn = makeConn();
      Transport.connectToHost.mockResolvedValue(conn);

      const p = joinPairing("ABCD-EFGH", { host: "10.0.0.9", port: 8888 });
      await flush();

      expect(Discovery.discoverPartner).not.toHaveBeenCalled();
      expect(Transport.connectToHost).toHaveBeenCalledWith(
        "10.0.0.9",
        8888,
        "me",
        "",
        expect.any(String)
      );
      conn.emit({ type: "PAIR_ACCEPT" }, JSON.stringify({ userId: "x", displayName: "X", confirmed: true }));
      await p;
      await jest.advanceTimersByTimeAsync(600);
    });

    it("throws when the partner can't be found on the network", async () => {
      Discovery.discoverPartner.mockResolvedValue(null);
      await expect(joinPairing("ABCD-EFGH")).rejects.toThrow(/find partner/i);
    });

    it("ignores non-ACCEPT messages and resolves only on PAIR_ACCEPT", async () => {
      Discovery.discoverPartner.mockResolvedValue({ host: "h", port: 1 });
      const conn = makeConn();
      Transport.connectToHost.mockResolvedValue(conn);

      const p = joinPairing("ABCD-EFGH");
      await flush();

      conn.emit({ type: "SYNC_REQUEST" }, "{}"); // ignored
      conn.emit({ type: "PAIR_ACCEPT" }, JSON.stringify({ userId: "partner", displayName: "P", confirmed: true }));
      const pending = await p;
      expect(pending.pairingState.partnerId).toBe("partner");
      await jest.advanceTimersByTimeAsync(600);
    });

    it("rejects an unparseable PAIR_ACCEPT payload", async () => {
      Discovery.discoverPartner.mockResolvedValue({ host: "h", port: 1 });
      const conn = makeConn();
      Transport.connectToHost.mockResolvedValue(conn);

      const p = joinPairing("ABCD-EFGH");
      await flush();
      conn.emit({ type: "PAIR_ACCEPT" }, "not-json");
      await expect(p).rejects.toThrow(/Invalid pairing response/);
      expect(conn.close).toHaveBeenCalled();
    });

    it("rejects a shape-invalid PAIR_ACCEPT (empty identity fields)", async () => {
      Discovery.discoverPartner.mockResolvedValue({ host: "h", port: 1 });
      const conn = makeConn();
      Transport.connectToHost.mockResolvedValue(conn);

      const p = joinPairing("ABCD-EFGH");
      await flush();
      conn.emit({ type: "PAIR_ACCEPT" }, JSON.stringify({ userId: "", displayName: "P" }));
      await expect(p).rejects.toThrow(/Invalid pairing response/);
      expect(conn.close).toHaveBeenCalled();
    });

    it("times out waiting for a response", async () => {
      Discovery.discoverPartner.mockResolvedValue({ host: "h", port: 1 });
      const conn = makeConn();
      Transport.connectToHost.mockResolvedValue(conn);

      const p = joinPairing("ABCD-EFGH");
      await flush();
      const assertion = expect(p).rejects.toThrow(/timed out/i); // attach handler first
      await jest.advanceTimersByTimeAsync(15_000);
      await assertion;
      expect(conn.close).toHaveBeenCalled();
    });
  });

  describe("startPairingAsInitiator", () => {
    const wireServer = (conn: ReturnType<typeof makeConn>, port = 7000) => {
      const closeServer = jest.fn();
      Transport.startServer.mockImplementation(
        async (_id: string, _partner: string, _key: string, onListening: any) => {
          await onListening?.(port, closeServer);
          return { connection: conn, port };
        }
      );
      return closeServer;
    };

    // A well-formed 256-bit secret, as generateSharedSecret produces. The
    // offer validator requires exactly this shape - shorter strings like the
    // old "deadbeef" fixture are precisely what it must reject.
    const SECRET = "ab".repeat(32);

    it("advertises, accepts a PAIR_OFFER, and resolves with the partner's secret", async () => {
      const conn = makeConn();
      const closeServer = wireServer(conn, 7000);
      const onReady = jest.fn();

      const p = startPairingAsInitiator("ABCD-EFGH", undefined, onReady);
      await flush();

      expect(Discovery.publish).toHaveBeenCalledWith("me", 7000);
      expect(onReady).toHaveBeenCalledWith("192.168.1.5", 7000, closeServer);

      conn.emit(
        { type: "PAIR_OFFER" },
        JSON.stringify({ userId: "joiner", displayName: "Joiner", sharedSecret: SECRET })
      );
      const pending = await p;

      expect(conn.send).toHaveBeenCalledWith(
        "PAIR_ACCEPT",
        expect.objectContaining({ userId: "me", confirmed: true })
      );
      // The initiator adopts the joiner's sharedSecret.
      expect(pending.pairingState.partnerId).toBe("joiner");
      expect(pending.pairingState.sharedSecret).toBe(SECRET);
      expect(pending.fingerprint).toBe(computeFingerprint(SECRET));

      await jest.advanceTimersByTimeAsync(600);
      expect(conn.close).toHaveBeenCalled();
      expect(Discovery.stop).toHaveBeenCalled();
    });

    it("drops malformed offers (bad secret, missing fields) and accepts a later valid one", async () => {
      const conn = makeConn();
      wireServer(conn);

      const p = startPairingAsInitiator("ABCD-EFGH");
      await flush();

      // None of these may be persisted or answered - sharedSecret keys every
      // future sync HMAC, so garbage here would brick the pairing.
      conn.emit({ type: "PAIR_OFFER" }, JSON.stringify({ userId: "j", displayName: "J", sharedSecret: "deadbeef" }));
      conn.emit({ type: "PAIR_OFFER" }, JSON.stringify({ userId: "j", displayName: "J", sharedSecret: "" }));
      conn.emit({ type: "PAIR_OFFER" }, JSON.stringify({ userId: "j", displayName: "J", sharedSecret: 12345 }));
      conn.emit({ type: "PAIR_OFFER" }, JSON.stringify({ userId: "", displayName: "J", sharedSecret: SECRET }));
      conn.emit({ type: "PAIR_OFFER" }, JSON.stringify({ userId: "j", sharedSecret: SECRET }));
      conn.emit({ type: "PAIR_OFFER" }, "not-json");
      expect(conn.send).not.toHaveBeenCalled();

      conn.emit(
        { type: "PAIR_OFFER" },
        JSON.stringify({ userId: "joiner", displayName: "Joiner", sharedSecret: SECRET })
      );
      const pending = await p;
      expect(pending.pairingState.sharedSecret).toBe(SECRET);
      await jest.advanceTimersByTimeAsync(600);
    });

    it("rejects instead of hanging when user lookup fails before the server starts", async () => {
      // Regression: getOrCreateUser used to be awaited inside a
      // `new Promise(async ...)` executor, so a throw was swallowed before
      // the timeout was armed and the pairing UI spun forever.
      userStorage.getOrCreateUser.mockRejectedValue(new Error("storage down"));
      await expect(startPairingAsInitiator("ABCD-EFGH")).rejects.toThrow("storage down");
    });

    it("reports a null IP when not on WiFi", async () => {
      NetInfo.fetch.mockResolvedValue({ type: "cellular", isConnected: true });
      const conn = makeConn();
      wireServer(conn);
      const onReady = jest.fn();

      const p = startPairingAsInitiator("ABCD-EFGH", undefined, onReady);
      await flush();
      expect(onReady).toHaveBeenCalledWith(null, 7000, expect.any(Function));

      conn.emit({ type: "PAIR_OFFER" }, JSON.stringify({ userId: "j", displayName: "J", sharedSecret: SECRET }));
      await p;
      await jest.advanceTimersByTimeAsync(600);
    });

    it("times out and notifies when no joiner connects", async () => {
      const conn = makeConn();
      wireServer(conn);
      const onTimeout = jest.fn();

      const p = startPairingAsInitiator("ABCD-EFGH", onTimeout);
      await flush();
      const assertion = expect(p).rejects.toThrow(/timed out/i); // attach handler first
      await jest.advanceTimersByTimeAsync(60_000);

      await assertion;
      expect(onTimeout).toHaveBeenCalled();
      expect(Discovery.stop).toHaveBeenCalled();
    });

    it("rejects and stops discovery if the server fails to start", async () => {
      Transport.startServer.mockRejectedValue(new Error("bind failed"));
      const p = startPairingAsInitiator("ABCD-EFGH");
      await expect(p).rejects.toThrow("bind failed");
      expect(Discovery.stop).toHaveBeenCalled();
    });
  });
});
