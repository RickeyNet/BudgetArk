/**
 * Sync metadata: `lastSyncTimestamp` is the outgoing-diff watermark and
 * `resetSyncWatermark` (called after an import/restore) must null it so
 * the next sync re-sends everything - restored records keep their original
 * `updatedAt`, which the old watermark would filter out forever - while
 * keeping the sync count and the display timestamp Profile shows.
 */
import {
  getSyncMetadata,
  resetSyncWatermark,
  savePairingState,
  updateSyncMetadata,
} from "../pairingStorage";

let mockStore: Map<string, string>;

jest.mock("../../storage/encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => mockStore.delete(k));
  }),
}));

const META_KEY = "@budgetark_sync_meta";

beforeEach(() => {
  mockStore = new Map();
});

describe("savePairingState (fail-closed, security rule 2)", () => {
  const storageMock = jest.requireMock("../../storage/encryptedStorage") as {
    setItem: jest.Mock;
  };

  const state = {
    partnerId: "p1",
    partnerName: "Partner",
    sharedSecret: "deadbeef",
    pairedAt: "2026-08-01T00:00:00.000Z",
    autoSyncEnabled: false,
  };

  it("writes the shared secret with requireEncryption so it can never land in plaintext", async () => {
    await savePairingState(state as never);
    expect(storageMock.setItem).toHaveBeenCalledWith(
      "@budgetark_pairing",
      expect.any(String),
      { requireEncryption: true }
    );
  });

  it("propagates a keystore failure instead of swallowing it", async () => {
    storageMock.setItem.mockRejectedValueOnce(new Error("keystore unavailable"));
    await expect(savePairingState(state as never)).rejects.toThrow("keystore unavailable");
    expect(mockStore.has("@budgetark_pairing")).toBe(false);
  });
});

describe("updateSyncMetadata", () => {
  it("stamps the watermark and the display timestamp and counts the sync", async () => {
    await updateSyncMetadata("2026-08-01T00:00:00.000Z");
    await updateSyncMetadata("2026-08-02T00:00:00.000Z");
    expect(await getSyncMetadata()).toEqual({
      lastSyncTimestamp: "2026-08-02T00:00:00.000Z",
      lastSyncCompletedAt: "2026-08-02T00:00:00.000Z",
      syncCount: 2,
    });
  });
});

describe("resetSyncWatermark", () => {
  it("nulls the watermark, keeps the count and the display timestamp", async () => {
    await updateSyncMetadata("2026-08-01T00:00:00.000Z");
    await resetSyncWatermark();
    expect(await getSyncMetadata()).toEqual({
      lastSyncTimestamp: null,
      lastSyncCompletedAt: "2026-08-01T00:00:00.000Z",
      syncCount: 1,
    });
  });

  it("falls back to the watermark as the display timestamp for pre-field metadata", async () => {
    mockStore.set(
      META_KEY,
      JSON.stringify({ lastSyncTimestamp: "2026-07-15T00:00:00.000Z", syncCount: 3 })
    );
    await resetSyncWatermark();
    expect(await getSyncMetadata()).toEqual({
      lastSyncTimestamp: null,
      lastSyncCompletedAt: "2026-07-15T00:00:00.000Z",
      syncCount: 3,
    });
  });

  it("is a no-op when there is nothing to reset (never synced)", async () => {
    await resetSyncWatermark();
    expect(mockStore.has(META_KEY)).toBe(false);

    mockStore.set(META_KEY, JSON.stringify({ lastSyncTimestamp: null, syncCount: 0 }));
    const before = mockStore.get(META_KEY);
    await resetSyncWatermark();
    expect(mockStore.get(META_KEY)).toBe(before);
  });
});
