import * as EncryptedStorage from "./encryptedStorage";
import { dismissalKey, getMonthKey } from "../utils/debtDueCalendar";

const DEBT_DUE_DISMISSALS_KEY = "@budgetark_debt_due_dismissals" as const;

export type DebtDueDismissals = Record<string, string>;

const parseDismissals = (raw: string | null): DebtDueDismissals => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as DebtDueDismissals;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
};

export const getDebtDueDismissals = async (): Promise<DebtDueDismissals> => {
  const raw = await EncryptedStorage.getItem(DEBT_DUE_DISMISSALS_KEY);
  return parseDismissals(raw);
};

/** User chose "not yet" for this debt's due date in the given month. */
export const dismissDebtDueForMonth = async (
  debtId: string,
  monthKey: string = getMonthKey()
): Promise<void> => {
  const current = await getDebtDueDismissals();
  const next: DebtDueDismissals = {
    ...current,
    [dismissalKey(debtId, monthKey)]: new Date().toISOString(),
  };
  await EncryptedStorage.setItem(DEBT_DUE_DISMISSALS_KEY, JSON.stringify(next));
};

export const clearDebtDueDismissals = async (): Promise<void> => {
  await EncryptedStorage.removeItem(DEBT_DUE_DISMISSALS_KEY);
};
