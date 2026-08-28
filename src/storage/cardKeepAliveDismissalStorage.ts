/**
 * BudgetArk - card keep-alive banner dismissals.
 *
 * "Later" on the keep-alive banner silences that card's warning for the
 * current calendar month only (an unused card's deadline never moves, so a
 * permanent dismissal would silence it forever - actually using the card is
 * what clears the warning). Same shape and keying as the debt-due
 * dismissals. Device-local; exported/imported with backups but never
 * synced to a partner.
 */

import * as EncryptedStorage from "./encryptedStorage";
import { keepAliveDismissalKey } from "../utils/cardKeepAlive";
import { getMonthKey } from "../utils/budgetMonths";

const CARD_KEEP_ALIVE_DISMISSALS_KEY =
  "@budgetark_card_keepalive_dismissals" as const;

export type CardKeepAliveDismissals = Record<string, string>;

const parseDismissals = (raw: string | null): CardKeepAliveDismissals => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as CardKeepAliveDismissals;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
};

export const getCardKeepAliveDismissals =
  async (): Promise<CardKeepAliveDismissals> => {
    const raw = await EncryptedStorage.getItem(CARD_KEEP_ALIVE_DISMISSALS_KEY);
    return parseDismissals(raw);
  };

/** User chose "Later" for this card's keep-alive warning this month. */
export const dismissCardKeepAliveForMonth = async (
  debtId: string,
  monthKey: string = getMonthKey()
): Promise<void> => {
  const current = await getCardKeepAliveDismissals();
  const next: CardKeepAliveDismissals = {
    ...current,
    [keepAliveDismissalKey(debtId, monthKey)]: new Date().toISOString(),
  };
  await EncryptedStorage.setItem(
    CARD_KEEP_ALIVE_DISMISSALS_KEY,
    JSON.stringify(next)
  );
};

export const clearCardKeepAliveDismissals = async (): Promise<void> => {
  await EncryptedStorage.removeItem(CARD_KEEP_ALIVE_DISMISSALS_KEY);
};
