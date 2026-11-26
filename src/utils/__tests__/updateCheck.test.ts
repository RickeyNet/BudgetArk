import {
  AUTO_CHECK_INTERVAL_MS,
  createUpdateChecker,
  type UpdateCheckDeps,
} from "../updateCheck";

const NOW = Date.parse("2026-11-25T12:00:00.000Z");

/** A promise the test resolves by hand, to hold a check "in flight". */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const makeDeps = (overrides: Partial<UpdateCheckDeps> = {}) => {
  const deps = {
    getPreferences: jest.fn(async () => ({ manualUpdateMode: false })),
    setLastCheckedAt: jest.fn(async () => undefined),
    checkForUpdate: jest.fn(async () => ({ isAvailable: true, manifest: { id: "check" } })),
    fetchUpdate: jest.fn(async () => ({ manifest: { id: "fetch" } })),
    resolveUpdate: jest.fn((manifest: unknown) => ({
      message: JSON.stringify(manifest),
      runtimeVersion: "1.0.0",
    })),
    isSafe: jest.fn(() => true),
    now: () => NOW,
    ...overrides,
  };
  return deps;
};

describe("createUpdateChecker", () => {
  it("returns the downloaded update, resolved from the fetched manifest", async () => {
    const deps = makeDeps();
    const outcome = await createUpdateChecker(deps).check("manual");
    expect(outcome).toEqual({
      status: "ready",
      update: { message: '{"id":"fetch"}', runtimeVersion: "1.0.0" },
    });
    expect(deps.setLastCheckedAt).toHaveBeenCalledWith(new Date(NOW).toISOString());
  });

  it("falls back to the check manifest when the fetch has none", async () => {
    const deps = makeDeps({ fetchUpdate: jest.fn(async () => ({})) });
    const outcome = await createUpdateChecker(deps).check("manual");
    expect(outcome).toMatchObject({ status: "ready", update: { message: '{"id":"check"}' } });
  });

  it("reports up to date without downloading", async () => {
    const deps = makeDeps({ checkForUpdate: jest.fn(async () => ({ isAvailable: false })) });
    const outcome = await createUpdateChecker(deps).check("manual");
    expect(outcome).toEqual({ status: "upToDate", checkedAt: new Date(NOW).toISOString() });
    expect(deps.fetchUpdate).not.toHaveBeenCalled();
  });

  it("rejects an update the downgrade guard blocks", async () => {
    const deps = makeDeps({ isSafe: jest.fn(() => false) });
    expect(await createUpdateChecker(deps).check("manual")).toEqual({ status: "rejected" });
    expect(deps.isSafe).toHaveBeenCalledWith("1.0.0");
  });

  it("turns a thrown check into an error outcome instead of rejecting", async () => {
    const deps = makeDeps({
      checkForUpdate: jest.fn(async () => {
        throw new Error("  Failed to check for update ");
      }),
    });
    expect(await createUpdateChecker(deps).check("manual")).toEqual({
      status: "error",
      message: "Failed to check for update",
    });
  });

  it("skips automatic checks in manual mode, but not a manual tap", async () => {
    const deps = makeDeps({ getPreferences: jest.fn(async () => ({ manualUpdateMode: true })) });
    const checker = createUpdateChecker(deps);
    expect(await checker.check("auto")).toEqual({ status: "skipped" });
    expect(deps.checkForUpdate).not.toHaveBeenCalled();
    expect((await checker.check("manual")).status).toBe("ready");
  });

  it("skips an automatic check inside the interval and runs one after it", async () => {
    const recent = new Date(NOW - AUTO_CHECK_INTERVAL_MS + 1000).toISOString();
    const old = new Date(NOW - AUTO_CHECK_INTERVAL_MS).toISOString();
    const recentDeps = makeDeps({
      getPreferences: jest.fn(async () => ({ manualUpdateMode: false, lastCheckedAt: recent })),
    });
    expect(await createUpdateChecker(recentDeps).check("auto")).toEqual({ status: "skipped" });

    const oldDeps = makeDeps({
      getPreferences: jest.fn(async () => ({ manualUpdateMode: false, lastCheckedAt: old })),
    });
    expect((await createUpdateChecker(oldDeps).check("auto")).status).toBe("ready");
  });

  // The user-reported bug: the automatic check was still downloading when the
  // user tapped "Check for Updates", both finished, and two dialogs stacked.
  it("joins a manual tap onto the automatic check already running", async () => {
    const download = deferred<{ manifest?: unknown }>();
    const deps = makeDeps({ fetchUpdate: jest.fn(() => download.promise) });
    const checker = createUpdateChecker(deps);

    const auto = checker.check("auto");
    const manual = checker.check("manual");
    expect(checker.isChecking()).toBe(true);

    download.resolve({ manifest: { id: "fetch" } });
    const [autoOutcome, manualOutcome] = await Promise.all([auto, manual]);

    expect(manualOutcome).toBe(autoOutcome);
    expect(autoOutcome.status).toBe("ready");
    expect(deps.checkForUpdate).toHaveBeenCalledTimes(1);
    expect(deps.fetchUpdate).toHaveBeenCalledTimes(1);
    expect(checker.isChecking()).toBe(false);
  });

  it("runs a real check when a manual tap joined an automatic check that skipped", async () => {
    const prefs = deferred<{ manualUpdateMode: boolean }>();
    const deps = makeDeps({ getPreferences: jest.fn(() => prefs.promise) });
    const checker = createUpdateChecker(deps);

    const auto = checker.check("auto");
    const manual = checker.check("manual");
    prefs.resolve({ manualUpdateMode: true });

    expect(await auto).toEqual({ status: "skipped" });
    expect((await manual).status).toBe("ready");
    expect(deps.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it("checks again once the previous check has finished", async () => {
    const deps = makeDeps();
    const checker = createUpdateChecker(deps);
    await checker.check("manual");
    await checker.check("manual");
    expect(deps.checkForUpdate).toHaveBeenCalledTimes(2);
  });
});
