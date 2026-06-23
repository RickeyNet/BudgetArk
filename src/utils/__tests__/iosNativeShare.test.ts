/**
 * iosNativeShare.ts branches on Platform.OS at module-load time (it picks up
 * NativeModules.ScreenGuardModule only on iOS), so tests set the platform then
 * require a fresh copy of the module.
 */

const mockPlatform: { OS: string } = { OS: "ios" };
const mockScreenGuard = { disable: jest.fn(), enable: jest.fn() };
jest.mock("react-native", () => ({
  Platform: mockPlatform,
  InteractionManager: {
    // run the callback synchronously so teardown resolves promptly
    runAfterInteractions: (cb: () => void) => {
      cb();
      return { then: (r: () => void) => r() };
    },
  },
  NativeModules: { ScreenGuardModule: mockScreenGuard },
}));

const mockIsAvailable = jest.fn(async () => true);
const mockShareAsync = jest.fn(async () => {});
jest.mock("expo-sharing", () => ({
  isAvailableAsync: () => mockIsAvailable(),
  shareAsync: (...a: any[]) => mockShareAsync(...a),
}));

const mockGetPrivacyMode = jest.fn(async () => false);
jest.mock("../../storage/privacyStorage", () => ({
  getPrivacyMode: () => mockGetPrivacyMode(),
}));

const OPTIONS = { mimeType: "text/csv", dialogTitle: "Share", UTI: "public.comma-separated-values-text" };

const load = (os: string) => {
  mockPlatform.OS = os;
  jest.resetModules();
  return require("../iosNativeShare");
};

beforeEach(() => {
  mockPlatform.OS = "ios";
  mockIsAvailable.mockReset().mockResolvedValue(true);
  mockShareAsync.mockReset().mockResolvedValue(undefined);
  mockGetPrivacyMode.mockReset().mockResolvedValue(false);
  mockScreenGuard.disable.mockReset();
  mockScreenGuard.enable.mockReset();
  // jsdom-free node env: provide the RAF the iOS teardown path uses
  (global as any).requestAnimationFrame = (cb: () => void) => cb();
});

describe("waitForIosModalTeardown", () => {
  it("resolves immediately on non-iOS", async () => {
    const { waitForIosModalTeardown } = load("android");
    await expect(waitForIosModalTeardown()).resolves.toBeUndefined();
  });

  it("resolves after the delay on iOS", async () => {
    const { waitForIosModalTeardown } = load("ios");
    await expect(waitForIosModalTeardown(0)).resolves.toBeUndefined();
  });
});

describe("shareLocalFile", () => {
  it("throws a helpful error when sharing is unavailable", async () => {
    const { shareLocalFile } = load("android");
    mockIsAvailable.mockResolvedValue(false);
    await expect(shareLocalFile("file:///x.csv", OPTIONS)).rejects.toThrow(
      /not available/i
    );
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it("shares the file with its options and skips screen-guard on Android", async () => {
    const { shareLocalFile } = load("android");
    await shareLocalFile("file:///x.csv", OPTIONS);
    expect(mockShareAsync).toHaveBeenCalledWith("file:///x.csv", OPTIONS);
    expect(mockScreenGuard.disable).not.toHaveBeenCalled();
    expect(mockScreenGuard.enable).not.toHaveBeenCalled();
  });

  it("suspends and restores the iOS screen guard when privacy mode is on", async () => {
    const { shareLocalFile } = load("ios");
    mockGetPrivacyMode.mockResolvedValue(true);
    await shareLocalFile("file:///x.csv", OPTIONS);
    expect(mockScreenGuard.disable).toHaveBeenCalledTimes(1);
    expect(mockShareAsync).toHaveBeenCalledWith("file:///x.csv", OPTIONS);
    expect(mockScreenGuard.enable).toHaveBeenCalledTimes(1);
  });

  it("leaves the iOS screen guard untouched when privacy mode is off", async () => {
    const { shareLocalFile } = load("ios");
    mockGetPrivacyMode.mockResolvedValue(false);
    await shareLocalFile("file:///x.csv", OPTIONS);
    expect(mockScreenGuard.disable).not.toHaveBeenCalled();
    expect(mockShareAsync).toHaveBeenCalledTimes(1);
  });

  it("restores the screen guard even if sharing throws", async () => {
    const { shareLocalFile } = load("ios");
    mockGetPrivacyMode.mockResolvedValue(true);
    mockShareAsync.mockRejectedValue(new Error("share failed"));
    await expect(shareLocalFile("file:///x.csv", OPTIONS)).rejects.toThrow(
      "share failed"
    );
    expect(mockScreenGuard.enable).toHaveBeenCalledTimes(1); // finally block ran
  });
});
