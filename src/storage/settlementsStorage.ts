/**
 * BudgetArk - Settlements Storage
 * File: src/storage/settlementsStorage.ts
 *
 * Device-local list of "mark settled" records for the Settle Up sheet
 * (utils/settleUp). Deliberately NOT synced or exported in this first
 * version: the budget owner is the one owed and the one who marks a month
 * settled, so the record lives on their phone; a synced collection needs
 * the SyncDiff optional-field + validator + tombstone treatment and is
 * tracked in TODO.md. Fail-closed parse; appends run inside the write
 * queue so two quick taps can't lose a record.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  MAX_SETTLEMENT_RECORDS,
  parseSettlements,
  type SettlementRecord,
} from "../utils/settleUp";

const SETTLEMENTS_KEY = "@budgetark_settlements" as const;

export const getSettlements = async (): Promise<SettlementRecord[]> =>
  parseSettlements(await EncryptedStorage.getItem(SETTLEMENTS_KEY));

export const addSettlement = async (record: SettlementRecord): Promise<SettlementRecord[]> => {
  let next: SettlementRecord[] = [];
  await EncryptedStorage.updateItem(SETTLEMENTS_KEY, (current) => {
    next = [...parseSettlements(current), record].slice(-MAX_SETTLEMENT_RECORDS);
    return JSON.stringify(next);
  });
  return next;
};

/** Undo: drop every settlement for one person in one month. */
export const removeSettlementsFor = async (
  personId: string,
  monthKey: string,
): Promise<SettlementRecord[]> => {
  let next: SettlementRecord[] = [];
  await EncryptedStorage.updateItem(SETTLEMENTS_KEY, (current) => {
    next = parseSettlements(current).filter(
      (record) => !(record.personId === personId && record.monthKey === monthKey),
    );
    return JSON.stringify(next);
  });
  return next;
};
