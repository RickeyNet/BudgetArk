/**
 * haptics.ts keeps the enabled flag in module-level state, so each test
 * re-requires a fresh module (jest.resetModules) to start from an empty cache.
 */

// Our own fn (survives resetModules); the storage mock delegates to it.
const mockGetHapticsEnabled = jest.fn();
jest.mock("../../storage/hapticsStorage", () => ({
  getHapticsEnabled: () => mockGetHapticsEnabled(),
}));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  impactAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: "Success", Warning: "Warning", Error: "Error" },
  ImpactFeedbackStyle: { Light: "Light" },
}));

let Haptics: any;
let triggerHaptic: (m: any) => Promise<void>;
let setHapticsCache: (e: boolean) => void;

beforeEach(() => {
  jest.resetModules();
  mockGetHapticsEnabled.mockReset();
  mockGetHapticsEnabled.mockResolvedValue(true);
  Haptics = require("expo-haptics");
  ({ triggerHaptic, setHapticsCache } = require("../haptics"));
});

describe("triggerHaptic", () => {
  it("reads the enabled preference from storage on first fire", async () => {
    await triggerHaptic("success");
    expect(mockGetHapticsEnabled).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("Success");
  });

  it("caches the preference - a second fire does not re-read storage", async () => {
    await triggerHaptic("success");
    await triggerHaptic("error");
    expect(mockGetHapticsEnabled).toHaveBeenCalledTimes(1);
  });

  it("does nothing when haptics are disabled", async () => {
    mockGetHapticsEnabled.mockResolvedValue(false);
    await triggerHaptic("success");
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("defaults to enabled when the storage read throws", async () => {
    mockGetHapticsEnabled.mockRejectedValue(new Error("storage down"));
    await triggerHaptic("success");
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("Success");
  });

  it("setHapticsCache overrides the cache without a storage read", async () => {
    setHapticsCache(false);
    await triggerHaptic("success");
    expect(mockGetHapticsEnabled).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("maps each moment to the right expo-haptics call", async () => {
    setHapticsCache(true);
    await triggerHaptic("success");
    expect(Haptics.notificationAsync).toHaveBeenLastCalledWith("Success");
    await triggerHaptic("warning");
    expect(Haptics.notificationAsync).toHaveBeenLastCalledWith("Warning");
    await triggerHaptic("error");
    expect(Haptics.notificationAsync).toHaveBeenLastCalledWith("Error");
    await triggerHaptic("selection");
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    await triggerHaptic("impactLight");
    expect(Haptics.impactAsync).toHaveBeenCalledWith("Light");
  });

  it("swallows an error thrown by the native haptic call", async () => {
    setHapticsCache(true);
    Haptics.notificationAsync.mockRejectedValueOnce(new Error("no motor"));
    await expect(triggerHaptic("success")).resolves.toBeUndefined();
  });
});
