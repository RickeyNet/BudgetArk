/**
 * autoSyncManager watches WiFi/foreground changes and fires syncNow() only when
 * a strict set of gates pass: foreground, auto-sync enabled, on the configured
 * home SSID, off cooldown, and no sync already in flight. The trigger logic is
 * internal (reached through the NetInfo/AppState listeners), and the gates lean
 * on module-level state (lastSyncAttempt, syncInProgress), so each test loads a
 * fresh copy of the module with the platform/network/storage/orchestrator edges
 * mocked, captures the registered listeners, and drives them directly.
 */
jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  PermissionsAndroid: {
    request: jest.fn(),
    PERMISSIONS: { ACCESS_FINE_LOCATION: "loc" },
    RESULTS: { GRANTED: "granted" },
  },
  AppState: { currentState: "active", addEventListener: jest.fn() },
}));
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { configure: jest.fn(), fetch: jest.fn(), addEventListener: jest.fn() },
}));
jest.mock("../pairingStorage", () => ({ getPairingState: jest.fn() }));
jest.mock("../syncOrchestrator", () => ({ syncNow: jest.fn() }));

interface SetupOpts {
  os?: string;
  appState?: string;
  pairing?: any;
  netState?: any;
  syncResult?: any;
}

const setup = (opts: SetupOpts = {}) => {
  jest.resetModules();
  const rn = require("react-native");
  const NetInfo = require("@react-native-community/netinfo").default;
  const pairingStorage = require("../pairingStorage");
  const orch = require("../syncOrchestrator");

  rn.Platform.OS = opts.os ?? "android";
  rn.AppState.currentState = opts.appState ?? "active";

  let netCb: ((s: any) => void) | null = null;
  let appCb: ((s: string) => void) | null = null;
  const unsub = jest.fn();
  const remove = jest.fn();
  NetInfo.addEventListener.mockImplementation((cb: any) => {
    netCb = cb;
    return unsub;
  });
  rn.AppState.addEventListener.mockImplementation((_e: string, cb: any) => {
    appCb = cb;
    return { remove };
  });

  pairingStorage.getPairingState.mockResolvedValue(
    "pairing" in opts ? opts.pairing : { autoSyncEnabled: true, homeSSID: "Home", partnerId: "p" }
  );
  NetInfo.fetch.mockResolvedValue(
    opts.netState ?? { type: "wifi", isConnected: true, details: { ssid: "Home" } }
  );
  orch.syncNow.mockResolvedValue(
    opts.syncResult ?? { success: true, recordsSent: 1, recordsReceived: 2, timestamp: "t" }
  );

  const mod = require("../autoSyncManager");
  return {
    mod,
    rn,
    NetInfo,
    pairingStorage,
    orch,
    unsub,
    remove,
    fireNet: (s?: any) => netCb?.(s ?? { type: "wifi", isConnected: true }),
    fireApp: (s = "active") => appCb?.(s),
  };
};

const flush = async () => {
  for (let i = 0; i < 6; i++) await jest.advanceTimersByTimeAsync(0);
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(1_000_000); // > COOLDOWN so the first attempt is never rate-limited
});
afterEach(() => {
  jest.useRealTimers();
});

describe("requestLocationPermission", () => {
  it("returns true on iOS without prompting", async () => {
    const t = setup({ os: "ios" });
    await expect(t.mod.requestLocationPermission()).resolves.toBe(true);
    expect(t.rn.PermissionsAndroid.request).not.toHaveBeenCalled();
  });

  it("returns true when Android grants the permission", async () => {
    const t = setup({ os: "android" });
    t.rn.PermissionsAndroid.request.mockResolvedValue("granted");
    await expect(t.mod.requestLocationPermission()).resolves.toBe(true);
  });

  it("returns false when Android denies the permission", async () => {
    const t = setup({ os: "android" });
    t.rn.PermissionsAndroid.request.mockResolvedValue("denied");
    await expect(t.mod.requestLocationPermission()).resolves.toBe(false);
  });

  it("returns false when the permission request throws", async () => {
    const t = setup({ os: "android" });
    t.rn.PermissionsAndroid.request.mockRejectedValue(new Error("nope"));
    await expect(t.mod.requestLocationPermission()).resolves.toBe(false);
  });
});

describe("getCurrentSSID", () => {
  it("returns the SSID when connected to WiFi", async () => {
    const t = setup({ netState: { type: "wifi", isConnected: true, details: { ssid: "Cafe" } } });
    await expect(t.mod.getCurrentSSID()).resolves.toBe("Cafe");
  });

  it("returns null when not on WiFi", async () => {
    const t = setup({ netState: { type: "cellular", isConnected: true } });
    await expect(t.mod.getCurrentSSID()).resolves.toBeNull();
  });

  it("returns null when WiFi is not connected", async () => {
    const t = setup({ netState: { type: "wifi", isConnected: false, details: { ssid: "X" } } });
    await expect(t.mod.getCurrentSSID()).resolves.toBeNull();
  });
});

describe("startMonitoring / stopMonitoring", () => {
  it("registers NetInfo and AppState listeners once, even if started twice", () => {
    const t = setup();
    t.mod.startMonitoring();
    t.mod.startMonitoring(); // idempotent
    expect(t.NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    expect(t.rn.AppState.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("tears down both listeners on stop", () => {
    const t = setup();
    t.mod.startMonitoring();
    t.mod.stopMonitoring();
    expect(t.unsub).toHaveBeenCalled();
    expect(t.remove).toHaveBeenCalled();
  });
});

describe("auto-sync triggers", () => {
  it("syncs when all gates pass and reports the result via the callback", async () => {
    const t = setup();
    const onComplete = jest.fn();
    t.mod.startMonitoring(onComplete);

    t.fireApp("active");
    await flush();

    expect(t.orch.syncNow).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, recordsReceived: 2 })
    );
  });

  it("fires from a WiFi-connected NetInfo event", async () => {
    const t = setup();
    t.mod.startMonitoring();
    t.fireNet({ type: "wifi", isConnected: true });
    await flush();
    expect(t.orch.syncNow).toHaveBeenCalledTimes(1);
  });

  it("ignores NetInfo events that are not connected WiFi", async () => {
    const t = setup();
    t.mod.startMonitoring();
    t.fireNet({ type: "cellular", isConnected: true });
    await flush();
    expect(t.orch.syncNow).not.toHaveBeenCalled();
  });
});

describe("gates that block a sync", () => {
  it("does nothing when the app is not in the foreground", async () => {
    const t = setup({ appState: "background" });
    t.mod.startMonitoring();
    t.fireNet();
    await flush();
    expect(t.orch.syncNow).not.toHaveBeenCalled();
  });

  it("does nothing when not paired", async () => {
    const t = setup({ pairing: null });
    t.mod.startMonitoring();
    t.fireApp();
    await flush();
    expect(t.orch.syncNow).not.toHaveBeenCalled();
  });

  it("does nothing when auto-sync is disabled", async () => {
    const t = setup({ pairing: { autoSyncEnabled: false, homeSSID: "Home" } });
    t.mod.startMonitoring();
    t.fireApp();
    await flush();
    expect(t.orch.syncNow).not.toHaveBeenCalled();
  });

  it("does nothing when no home SSID is configured", async () => {
    const t = setup({ pairing: { autoSyncEnabled: true } });
    t.mod.startMonitoring();
    t.fireApp();
    await flush();
    expect(t.orch.syncNow).not.toHaveBeenCalled();
  });

  it("does nothing when the current SSID does not match the home SSID", async () => {
    const t = setup({ netState: { type: "wifi", isConnected: true, details: { ssid: "Elsewhere" } } });
    t.mod.startMonitoring();
    t.fireApp();
    await flush();
    expect(t.orch.syncNow).not.toHaveBeenCalled();
  });
});

describe("rate limiting and concurrency", () => {
  it("rate-limits repeat triggers within the cooldown, then allows one after it elapses", async () => {
    const t = setup();
    t.mod.startMonitoring();

    t.fireApp();
    await flush();
    expect(t.orch.syncNow).toHaveBeenCalledTimes(1);

    t.fireApp(); // still inside the 30s cooldown
    await flush();
    expect(t.orch.syncNow).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(31_000); // cooldown elapses
    t.fireApp();
    await flush();
    expect(t.orch.syncNow).toHaveBeenCalledTimes(2);
  });

  it("does not start a second sync while one is in flight (past cooldown)", async () => {
    const t = setup();
    t.orch.syncNow.mockReturnValue(new Promise(() => {})); // never resolves
    t.mod.startMonitoring();

    t.fireApp();
    await flush();
    expect(t.orch.syncNow).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(31_000); // cooldown is no longer the blocker
    t.fireApp();
    await flush();
    expect(t.orch.syncNow).toHaveBeenCalledTimes(1); // blocked by syncInProgress
  });

  it("swallows a sync failure and clears the in-progress flag for the next attempt", async () => {
    const t = setup();
    t.orch.syncNow.mockRejectedValueOnce(new Error("boom"));
    const onComplete = jest.fn();
    t.mod.startMonitoring(onComplete);

    t.fireApp();
    await flush();
    expect(t.orch.syncNow).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled(); // failure is silent

    await jest.advanceTimersByTimeAsync(31_000);
    t.fireApp();
    await flush();
    expect(t.orch.syncNow).toHaveBeenCalledTimes(2); // flag was reset in finally
  });
});
