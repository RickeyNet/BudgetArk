/**
 * discoveryService wraps react-native-zeroconf for mDNS publish/browse. The
 * logic worth guarding is the peer-matching during browse (pairing accepts any
 * budgetark service, sync matches a specific partner; host/port must be present),
 * the timeout/error -> null fallbacks, and stop()'s unpublish + the deliberate
 * separation of the publish vs browse Zeroconf instances. We mock zeroconf as a
 * controllable fake class and reset the module per test (it caches singletons).
 */
jest.mock("react-native-zeroconf", () => {
  const instances: any[] = [];
  class FakeZeroconf {
    handlers: Record<string, (arg?: any) => void> = {};
    publishService = jest.fn();
    unpublishService = jest.fn();
    scan = jest.fn();
    stop = jest.fn();
    removeAllListeners = jest.fn((event?: string) => {
      if (event) delete this.handlers[event];
      else this.handlers = {};
    });
    constructor() {
      instances.push(this);
    }
    on(event: string, cb: (arg?: any) => void) {
      this.handlers[event] = cb;
    }
    emit(event: string, arg?: any) {
      this.handlers[event]?.(arg);
    }
  }
  (FakeZeroconf as any).__instances = instances;
  return { __esModule: true, default: FakeZeroconf };
});

const load = () => {
  jest.resetModules();
  const Zeroconf = require("react-native-zeroconf").default;
  const mod = require("../discoveryService");
  return { mod, instances: (Zeroconf as any).__instances as any[] };
};

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("publish", () => {
  it("advertises a budgetark service named from the userId with our TXT record", () => {
    const { mod, instances } = load();
    mod.publish("abcdefghIGNORED", 7000);

    const pub = instances[0];
    expect(pub.publishService).toHaveBeenCalledWith(
      "budgetark",
      "tcp",
      "local.",
      "BudgetArk-abcdefgh", // first 8 chars of the userId
      7000,
      { userId: "abcdefghIGNORED", syncVersion: "1" }
    );
  });
});

describe("discoverPartner", () => {
  it("starts a scan and resolves with the first matching partner", async () => {
    const { mod, instances } = load();
    const p = mod.discoverPartner("partner", 1000);
    const browse = instances[0];
    expect(browse.scan).toHaveBeenCalledWith("budgetark", "tcp", "local.");

    browse.emit("resolved", { txt: { userId: "partner" }, host: "10.0.0.5", port: 5000 });
    await expect(p).resolves.toEqual({ host: "10.0.0.5", port: 5000, userId: "partner" });
    // Cleanup tore down the browse instance.
    expect(browse.stop).toHaveBeenCalled();
    expect(browse.removeAllListeners).toHaveBeenCalledWith("resolved");
  });

  it("accepts any budgetark service during pairing (empty partnerId)", async () => {
    const { mod, instances } = load();
    const p = mod.discoverPartner("", 1000);
    instances[0].emit("resolved", { txt: { userId: "whoever" }, host: "h", port: 1 });
    await expect(p).resolves.toMatchObject({ userId: "whoever" });
  });

  it("ignores a service whose userId is not the partner, then times out to null", async () => {
    const { mod, instances } = load();
    const p = mod.discoverPartner("partner", 1000);
    instances[0].emit("resolved", { txt: { userId: "stranger" }, host: "h", port: 1 });
    await jest.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBeNull();
  });

  it("ignores a matching service that is missing host/port", async () => {
    const { mod, instances } = load();
    const p = mod.discoverPartner("partner", 1000);
    instances[0].emit("resolved", { txt: { userId: "partner" } }); // no host/port
    await jest.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBeNull();
  });

  it("ignores a service with no userId during pairing", async () => {
    const { mod, instances } = load();
    const p = mod.discoverPartner("", 1000);
    instances[0].emit("resolved", { txt: {}, host: "h", port: 1 });
    await jest.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBeNull();
  });

  it("resolves null and stops the browse on timeout", async () => {
    const { mod, instances } = load();
    const p = mod.discoverPartner("partner", 1000);
    await jest.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBeNull();
    expect(instances[0].stop).toHaveBeenCalled();
  });

  it("resolves null on a zeroconf error", async () => {
    const { mod, instances } = load();
    const p = mod.discoverPartner("partner", 1000);
    instances[0].emit("error", new Error("mdns down"));
    await expect(p).resolves.toBeNull();
    expect(instances[0].stop).toHaveBeenCalled();
  });

  it("reuses one browse instance across scans and never tears down the publish channel", async () => {
    const { mod, instances } = load();
    mod.publish("me123456", 7000);
    const pub = instances[0];

    // A scan that times out must not stop the independent publish instance.
    const p = mod.discoverPartner("partner", 1000);
    await jest.advanceTimersByTimeAsync(1000);
    await p;
    expect(pub.stop).not.toHaveBeenCalled();

    // A second scan reuses the same browse instance (no third instance created).
    const browse = instances[1];
    const p2 = mod.discoverPartner("partner", 1000);
    expect(instances).toHaveLength(2);
    await jest.advanceTimersByTimeAsync(1000);
    await p2;
    expect(browse.scan).toHaveBeenCalledTimes(2);
  });
});

describe("stop", () => {
  it("unpublishes the advertised service and tears down both instances", async () => {
    const { mod, instances } = load();
    mod.publish("me123456", 7000);
    const pub = instances[0];
    mod.discoverPartner("partner", 1000); // create the browse instance too
    const browse = instances[1];

    mod.stop();

    expect(pub.unpublishService).toHaveBeenCalledWith("BudgetArk-me123456");
    expect(pub.stop).toHaveBeenCalled();
    expect(pub.removeAllListeners).toHaveBeenCalled();
    expect(browse.stop).toHaveBeenCalled();
    expect(browse.removeAllListeners).toHaveBeenCalled();
  });

  it("is a no-op when nothing was ever published or browsed", () => {
    const { mod, instances } = load();
    expect(() => mod.stop()).not.toThrow();
    expect(instances).toHaveLength(0);
  });

  it("only unpublishes once across repeated stops", () => {
    const { mod, instances } = load();
    mod.publish("me123456", 7000);
    const pub = instances[0];

    mod.stop();
    mod.stop(); // service name was cleared on the first stop

    expect(pub.unpublishService).toHaveBeenCalledTimes(1);
  });
});
