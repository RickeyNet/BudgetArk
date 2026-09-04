/**
 * BudgetArk - Statement Import Mappings Storage
 * File: src/storage/statementImportMappingsStorage.ts
 *
 * Remembers, per bank CSV layout, which columns the user confirmed as the
 * date / description / amount(s) and the account label they gave the file
 * (see utils/bankCsvImport). Keyed by the header signature, so the second
 * statement from the same bank opens the import sheet pre-filled. Purely a
 * per-device convenience: never synced, never exported, wiped by Reset All
 * Data (RESET_KEYS in debtStorage). Bounded to the most recent
 * MAX_REMEMBERED_MAPPINGS layouts.
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { BankCsvMapping } from "../utils/bankCsvImport";

export const STATEMENT_MAPPINGS_KEY = "@budgetark_statement_import_mappings" as const;
export const MAX_REMEMBERED_MAPPINGS = 25;

export interface RememberedStatementMapping {
  mapping: BankCsvMapping;
  accountLabel: string;
  updatedAt: string;
}

type MappingStore = Record<string, RememberedStatementMapping>;

const readStore = async (): Promise<MappingStore> => {
  const raw = await EncryptedStorage.getItem(STATEMENT_MAPPINGS_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as MappingStore)
      : {};
  } catch {
    return {};
  }
};

/** The remembered mapping for a header signature, if any. */
export const getRememberedStatementMapping = async (
  signature: string,
): Promise<RememberedStatementMapping | null> => {
  const store = await readStore();
  const hit = store[signature];
  return hit && hit.mapping && typeof hit.mapping === "object" ? hit : null;
};

/**
 * Remember (or replace) the mapping for a header signature. Keeps the
 * newest MAX_REMEMBERED_MAPPINGS by updatedAt so the store cannot grow
 * without bound.
 */
export const rememberStatementMapping = async (
  signature: string,
  value: { mapping: BankCsvMapping; accountLabel: string },
): Promise<void> => {
  const store = await readStore();
  store[signature] = { ...value, updatedAt: new Date().toISOString() };
  const trimmed: MappingStore = Object.fromEntries(
    Object.entries(store)
      .sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_REMEMBERED_MAPPINGS),
  );
  await EncryptedStorage.setItem(STATEMENT_MAPPINGS_KEY, JSON.stringify(trimmed));
};
