import {
  DEFAULT_TIP_NUDGE_STATE,
  TIP_NUDGE_MIN_DAYS_BETWEEN,
  TIP_NUDGE_WINS_BETWEEN,
  parseTipJarNudgeState,
  recordWinForNudge,
  tipNudgeCopyFor,
  type TipJarNudgeState,
} from "../tipJarNudge";

const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = new Date("2026-08-29T12:00:00.000Z");

/** Feed `count` wins at `at`, returning the final state and every verdict. */
const runWins = (start: TipJarNudgeState, count: number, at: Date) => {
  let state = start;
  const verdicts: boolean[] = [];
  for (let i = 0; i < count; i++) {
    const next = recordWinForNudge(state, at);
    state = next.state;
    verdicts.push(next.show);
  }
  return { state, verdicts };
};

describe("recordWinForNudge", () => {
  it("first nudges on the Nth win, never before", () => {
    const { verdicts, state } = runWins(DEFAULT_TIP_NUDGE_STATE, TIP_NUDGE_WINS_BETWEEN, T0);
    expect(verdicts.slice(0, -1).every((v) => v === false)).toBe(true);
    expect(verdicts[verdicts.length - 1]).toBe(true);
    expect(state).toMatchObject({
      winsSinceNudge: 0,
      lastNudgeAt: T0.toISOString(),
      totalWins: TIP_NUDGE_WINS_BETWEEN,
    });
  });

  it("needs both the win cadence and the day gap for the next one", () => {
    const first = runWins(DEFAULT_TIP_NUDGE_STATE, TIP_NUDGE_WINS_BETWEEN, T0).state;
    // Plenty of wins, same day: no.
    const sameDay = runWins(first, TIP_NUDGE_WINS_BETWEEN * 3, T0);
    expect(sameDay.verdicts.some(Boolean)).toBe(false);
    expect(sameDay.state.winsSinceNudge).toBe(TIP_NUDGE_WINS_BETWEEN * 3);
    // A week later, the very next win qualifies (cadence already met).
    const later = new Date(T0.getTime() + TIP_NUDGE_MIN_DAYS_BETWEEN * DAY_MS);
    expect(recordWinForNudge(sameDay.state, later).show).toBe(true);
    // A week later but only one win since the last nudge: no.
    const fresh: TipJarNudgeState = { ...first, winsSinceNudge: 0 };
    expect(recordWinForNudge(fresh, later).show).toBe(false);
  });

  it("treats a day gap just short of the minimum as too soon", () => {
    const first = runWins(DEFAULT_TIP_NUDGE_STATE, TIP_NUDGE_WINS_BETWEEN, T0).state;
    const primed = runWins(first, TIP_NUDGE_WINS_BETWEEN - 1, T0).state;
    const almost = new Date(T0.getTime() + TIP_NUDGE_MIN_DAYS_BETWEEN * DAY_MS - 1);
    expect(recordWinForNudge(primed, almost).show).toBe(false);
  });

  it("keeps counting while disabled but never shows, and doesn't fire the moment it's re-enabled early", () => {
    const off: TipJarNudgeState = { ...DEFAULT_TIP_NUDGE_STATE, enabled: false };
    const { verdicts, state } = runWins(off, 10, T0);
    expect(verdicts.some(Boolean)).toBe(false);
    expect(state.totalWins).toBe(10);
    expect(state.winsSinceNudge).toBe(10);
    // Re-enabled with the cadence met and no prior nudge: the next win shows.
    expect(recordWinForNudge({ ...state, enabled: true }, T0).show).toBe(true);
  });

  it("reads a clock that went backwards as too soon", () => {
    const first = runWins(DEFAULT_TIP_NUDGE_STATE, TIP_NUDGE_WINS_BETWEEN, T0).state;
    const primed = runWins(first, TIP_NUDGE_WINS_BETWEEN, T0).state;
    const earlier = new Date(T0.getTime() - 30 * DAY_MS);
    expect(recordWinForNudge(primed, earlier).show).toBe(false);
  });
});

describe("parseTipJarNudgeState", () => {
  it("returns defaults for empty, malformed, or wrong-shaped input", () => {
    expect(parseTipJarNudgeState(null)).toEqual(DEFAULT_TIP_NUDGE_STATE);
    expect(parseTipJarNudgeState("not json")).toEqual(DEFAULT_TIP_NUDGE_STATE);
    expect(parseTipJarNudgeState("[1,2]")).toMatchObject(DEFAULT_TIP_NUDGE_STATE);
    expect(parseTipJarNudgeState("null")).toEqual(DEFAULT_TIP_NUDGE_STATE);
  });

  it("sanitizes each field independently", () => {
    expect(
      parseTipJarNudgeState(
        JSON.stringify({ enabled: false, winsSinceNudge: -3, lastNudgeAt: "garbage", totalWins: 2.5 })
      )
    ).toEqual({ enabled: false, winsSinceNudge: 0, lastNudgeAt: null, totalWins: 0 });
    const good = { enabled: true, winsSinceNudge: 2, lastNudgeAt: T0.toISOString(), totalWins: 9 };
    expect(parseTipJarNudgeState(JSON.stringify(good))).toEqual(good);
  });
});

describe("tipNudgeCopyFor", () => {
  it("names the bill or debt when a label is given and falls back cleanly", () => {
    expect(tipNudgeCopyFor({ kind: "bill-paid", label: " Electric " }).title).toBe(
      "Electric settled, budget line adjusted"
    );
    expect(tipNudgeCopyFor({ kind: "bill-paid", label: "   " }).title).toBe(
      "Bill settled, budget line adjusted"
    );
    expect(tipNudgeCopyFor({ kind: "debt-payoff", label: "Visa" }).title).toContain("Visa is gone");
    expect(tipNudgeCopyFor({ kind: "debt-payment" }).title).toBe("Another chip off the balance");
  });

  it("always says the tip is optional and unlocks nothing", () => {
    for (const kind of ["debt-payment", "debt-payoff", "bill-paid"] as const) {
      const { body } = tipNudgeCopyFor({ kind });
      expect(body.toLowerCase()).toContain("optional");
      expect(body.toLowerCase()).toContain("unlock");
    }
  });
});
