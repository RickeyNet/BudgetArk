/**
 * BudgetArk - Tip Jar nudge state
 *
 * The win counter and "last shown" stamp behind the occasional Tip Jar
 * mention after a payment, payoff, or settled bill (utils/tipJarNudge).
 * Device-local: not synced to a partner and not part of backups - it
 * holds no financial data, only two counters and a timestamp, and a
 * restored phone simply starts the cadence over. Nothing here says
 * whether the user ever tipped; the app never learns that.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  parseTipJarNudgeState,
  recordWinForNudge,
  type TipJarNudgeState,
} from "../utils/tipJarNudge";

const TIP_JAR_NUDGE_KEY = "@budgetark_tip_nudge" as const;

export const getTipJarNudgeState = async (): Promise<TipJarNudgeState> =>
  parseTipJarNudgeState(await EncryptedStorage.getItem(TIP_JAR_NUDGE_KEY));

/**
 * Count one win; resolves true when this win earns a nudge. Read-modify-
 * write inside the per-key queue, so two wins landing together (a bulk
 * inbox approve) can't both claim the same slot.
 */
export const recordTipJarWin = async (now: Date = new Date()): Promise<boolean> => {
  let show = false;
  await EncryptedStorage.updateItem(TIP_JAR_NUDGE_KEY, (current) => {
    const result = recordWinForNudge(parseTipJarNudgeState(current), now);
    show = result.show;
    return JSON.stringify(result.state);
  });
  return show;
};

export const clearTipJarNudgeState = async (): Promise<void> => {
  await EncryptedStorage.removeItem(TIP_JAR_NUDGE_KEY);
};
