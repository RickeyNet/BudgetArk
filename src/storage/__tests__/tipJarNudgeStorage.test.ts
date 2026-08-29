/**
 * BudgetArk - Tip Jar nudge storage tests
 * File: src/storage/__tests__/tipJarNudgeStorage.test.ts
 *
 * Pins the persisted cadence: wins accumulate across calls, the Nth earns
 * the nudge and resets the counter, the switch survives round-trips, and
 * a corrupt record falls back to defaults instead of throwing. Storage is
 * an in-memory map, matching monthlyBalanceStorage.test.ts's pattern.
 */
import {
  clearTipJarNudgeState,
  getTipJarNudgeState,
  recordTipJarWin,
  setTipJarNudgeEnabled,
} from "../tipJarNudgeStorage";
import { DEFAULT_TIP_NUDGE_STATE, TIP_NUDGE_WINS_BETWEEN } from "../../utils/tipJarNudge";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
  updateItem: jest.fn(
    async (k: string, updater: (current: string | null) => string | null) => {
      const next = updater(mockStore.has(k) ? mockStore.get(k)! : null);
      if (next !== null) mockStore.set(k, next);
    }
  ),
}));

const KEY = "@budgetark_tip_nudge";
const T0 = new Date("2026-08-29T12:00:00.000Z");

beforeEach(() => {
  mockStore = new Map();
});

describe("tipJarNudgeStorage", () => {
  it("starts from defaults", async () => {
    expect(await getTipJarNudgeState()).toEqual(DEFAULT_TIP_NUDGE_STATE);
  });

  it("accumulates wins across calls and nudges on the Nth", async () => {
    const verdicts: boolean[] = [];
    for (let i = 0; i < TIP_NUDGE_WINS_BETWEEN; i++) {
      verdicts.push(await recordTipJarWin(T0));
    }
    expect(verdicts.filter(Boolean)).toHaveLength(1);
    expect(verdicts[TIP_NUDGE_WINS_BETWEEN - 1]).toBe(true);
    expect(await getTipJarNudgeState()).toMatchObject({
      winsSinceNudge: 0,
      totalWins: TIP_NUDGE_WINS_BETWEEN,
      lastNudgeAt: T0.toISOString(),
    });
  });

  it("round-trips the switch without disturbing the counters", async () => {
    await recordTipJarWin(T0);
    await setTipJarNudgeEnabled(false);
    expect(await getTipJarNudgeState()).toMatchObject({ enabled: false, totalWins: 1 });
    expect(await recordTipJarWin(T0)).toBe(false);
    await setTipJarNudgeEnabled(true);
    expect(await getTipJarNudgeState()).toMatchObject({ enabled: true, totalWins: 2 });
  });

  it("recovers from a corrupt record", async () => {
    mockStore.set(KEY, "{{not json");
    expect(await getTipJarNudgeState()).toEqual(DEFAULT_TIP_NUDGE_STATE);
    expect(await recordTipJarWin(T0)).toBe(false);
    expect(await getTipJarNudgeState()).toMatchObject({ totalWins: 1 });
  });

  it("clears", async () => {
    await recordTipJarWin(T0);
    await clearTipJarNudgeState();
    expect(mockStore.has(KEY)).toBe(false);
  });
});
