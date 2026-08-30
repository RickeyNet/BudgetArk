/**
 * BudgetArk - Tip Jar Nudge
 * File: src/utils/tipJarNudge.ts
 *
 * Decides when a "win" - a debt payment, a payoff, a bill settled against
 * its budget line - earns a quiet Tip Jar mention, and what that mention
 * says. The rule is a cadence, not a reflex: one nudge per
 * TIP_NUDGE_WINS_BETWEEN wins and never two inside
 * TIP_NUDGE_MIN_DAYS_BETWEEN days. There is deliberately no off switch:
 * the cadence itself is the courtesy (the user asked for the mention to
 * be occasional, not optional), and an older record's `enabled` flag is
 * ignored on read.
 *
 * Pure and unit-tested; tipJarNudgeStorage persists the state and the
 * TipJarProvider/cards only render the result. Nothing here records what
 * was tipped - the app never learns that (see TipJarModal).
 */

export type WinKind = "debt-payment" | "debt-payoff" | "bill-paid";

export interface WinEvent {
  kind: WinKind;
  /** Optional name for the copy (the bill or debt), user text - in-app only. */
  label?: string;
}

export interface TipJarNudgeState {
  /** Wins since the last nudge actually shown. */
  winsSinceNudge: number;
  /** ISO timestamp of the last nudge shown, null if never. */
  lastNudgeAt: string | null;
  /** Lifetime win count - diagnostics only, never displayed. */
  totalWins: number;
}

export const DEFAULT_TIP_NUDGE_STATE: TipJarNudgeState = {
  winsSinceNudge: 0,
  lastNudgeAt: null,
  totalWins: 0,
};

/** A nudge needs at least this many wins since the previous one. */
export const TIP_NUDGE_WINS_BETWEEN = 4;

/** ...and at least this many days since the previous one. */
export const TIP_NUDGE_MIN_DAYS_BETWEEN = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const isNonNegativeInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** Fail-closed parse of the persisted state: anything odd resets to defaults. */
export const parseTipJarNudgeState = (raw: string | null): TipJarNudgeState => {
  if (!raw) return { ...DEFAULT_TIP_NUDGE_STATE };
  try {
    const parsed = JSON.parse(raw) as Partial<TipJarNudgeState> | null;
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_TIP_NUDGE_STATE };
    const lastNudgeAt =
      typeof parsed.lastNudgeAt === "string" &&
      Number.isFinite(Date.parse(parsed.lastNudgeAt))
        ? parsed.lastNudgeAt
        : null;
    return {
      winsSinceNudge: isNonNegativeInt(parsed.winsSinceNudge) ? parsed.winsSinceNudge : 0,
      lastNudgeAt,
      totalWins: isNonNegativeInt(parsed.totalWins) ? parsed.totalWins : 0,
    };
  } catch {
    return { ...DEFAULT_TIP_NUDGE_STATE };
  }
};

/**
 * Count one win and decide whether it earns a nudge. Returns the next state
 * (always persist it - the counter advances even when nothing shows) and
 * the verdict.
 */
export const recordWinForNudge = (
  state: TipJarNudgeState,
  now: Date
): { state: TipJarNudgeState; show: boolean } => {
  const counted: TipJarNudgeState = {
    ...state,
    winsSinceNudge: state.winsSinceNudge + 1,
    totalWins: state.totalWins + 1,
  };
  if (counted.winsSinceNudge < TIP_NUDGE_WINS_BETWEEN) return { state: counted, show: false };
  if (counted.lastNudgeAt) {
    const elapsed = now.getTime() - Date.parse(counted.lastNudgeAt);
    // A clock that went backwards reads as "too soon" - the safe side.
    if (!(elapsed >= TIP_NUDGE_MIN_DAYS_BETWEEN * DAY_MS)) {
      return { state: counted, show: false };
    }
  }
  return {
    state: { ...counted, winsSinceNudge: 0, lastNudgeAt: now.toISOString() },
    show: true,
  };
};

export interface TipNudgeCopy {
  title: string;
  body: string;
}

const cleanLabel = (label: string | undefined): string | null => {
  const trimmed = label?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Brief, plain copy per win: what just happened, what BudgetArk is (free,
 * ad-free, on-device), and that a tip is optional and unlocks nothing. The
 * Tip Jar sheet itself carries the store/privacy wording.
 */
export const tipNudgeCopyFor = (win: WinEvent): TipNudgeCopy => {
  const label = cleanLabel(win.label);
  switch (win.kind) {
    case "debt-payoff":
      return {
        title: label ? `${label} is gone. That's the whole idea.` : "One debt gone. That's the whole idea.",
        body:
          "BudgetArk stays free and ad-free, with no account and nothing leaving your phone, because people who hit moments like this chip in. A tip is optional and unlocks nothing - the app is already all yours.",
      };
    case "bill-paid":
      return {
        title: label ? `${label} settled, budget line adjusted` : "Bill settled, budget line adjusted",
        body:
          "BudgetArk is free and ad-free with nothing leaving your phone. If it makes bill day easier, an optional tip keeps it that way. Nothing to unlock.",
      };
    case "debt-payment":
    default:
      return {
        title: "Another chip off the balance",
        body:
          "BudgetArk is free, ad-free, and keeps everything on your phone. If it's helping, an optional tip keeps it sailing - nothing to unlock.",
      };
  }
};
