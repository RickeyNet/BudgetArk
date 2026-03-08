/**
 * BudgetArk — Debt Storage Utility
 * File: src/storage/debtStorage.ts
 *
 * Handles all persistent storage operations for debt data.
 * Uses AsyncStorage (key-value store on-device) for offline-first operation.
 *
 * Design decisions:
 * - All debts are stored as a single JSON array under one key for fast reads.
 * - Writes are atomic — the entire array is replaced on each update.
 * - This is efficient for typical use (< 50 debts) and avoids key fragmentation.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Debt, DebtClass, DebtClassSource, DebtOwner, Payment } from "../types";

/** Storage keys — centralized to prevent typos */
const STORAGE_KEYS = {
  DEBTS: "@budgetark_debts",
  PAYMENTS: "@budgetark_payments",
} as const;

/* ─── Debt CRUD Operations ─── */

const isDebtOwner = (value: unknown): value is DebtOwner =>
  value === "mine" || value === "partner" || value === "joint";

const isDebtClass = (value: unknown): value is DebtClass =>
  value === "personal_credit" || value === "car_house";

const isDebtClassSource = (value: unknown): value is DebtClassSource =>
  value === "manual" || value === "inferred";

const inferDebtClassFromName = (name: string): DebtClass => {
  const normalized = name.toLowerCase();
  const securedKeywords = ["car", "auto", "vehicle", "mortgage", "house", "home loan", "home"];
  return securedKeywords.some((keyword) => normalized.includes(keyword))
    ? "car_house"
    : "personal_credit";
};

const normalizeDebt = (debt: Debt): Debt => ({
  ...debt,
  owner: isDebtOwner(debt.owner) ? debt.owner : "mine",
  debtClass: isDebtClass(debt.debtClass)
    ? debt.debtClass
    : inferDebtClassFromName(debt.name),
  debtClassSource: isDebtClassSource(debt.debtClassSource)
    ? debt.debtClassSource
    : "inferred",
});

/**
 * Retrieves all stored debts from device storage.
 * Returns an empty array if no debts exist yet.
 *
 * @returns Promise<Debt[]> — array of all debt entries
 */
export const getDebts = async (): Promise<Debt[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.DEBTS);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as Debt[];
  const normalized = parsed.map(normalizeDebt);
  if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
    await saveDebts(normalized);
  }
  return normalized;
};

/**
 * Persists the full debts array to device storage.
 * Overwrites any existing data — always pass the complete array.
 *
 * @param debts — the full array of debts to save
 */
export const saveDebts = async (debts: Debt[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
};

/**
 * Adds a single new debt to storage.
 * Appends to the existing array and saves.
 *
 * @param debt — the new debt to add (must include all required fields)
 * @returns Promise<Debt[]> — the updated debts array
 */
export const addDebt = async (debt: Debt): Promise<Debt[]> => {
  const debts = await getDebts();
  debts.push(debt);
  await saveDebts(debts);
  return debts;
};

/**
 * Removes a debt by its ID.
 * Filters the array and saves the result.
 *
 * @param id — the unique ID of the debt to remove
 * @returns Promise<Debt[]> — the updated debts array
 */
export const deleteDebt = async (id: string): Promise<Debt[]> => {
  const debts = await getDebts();
  const filtered = debts.filter((d) => d.id !== id);
  await saveDebts(filtered);
  return filtered;
};

/**
 * Updates a specific debt entry by replacing it in the array.
 * Matches by ID and merges the partial update.
 *
 * @param id — the debt ID to update
 * @param updates — partial debt object with only the fields to change
 * @returns Promise<Debt[]> — the updated debts array
 */
export const updateDebt = async (
  id: string,
  updates: Partial<Debt>
): Promise<Debt[]> => {
  const debts = await getDebts();
  const updated = debts.map((d) => (d.id === id ? { ...d, ...updates } : d));
  await saveDebts(updated);
  return updated;
};

/* ─── Payment History Operations ─── */

/**
 * Retrieves all payment records from storage.
 *
 * @returns Promise<Payment[]> — array of all payments
 */
export const getPayments = async (): Promise<Payment[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS);
  return raw ? JSON.parse(raw) : [];
};

/**
 * Records a new payment and updates the associated debt's balance.
 * This is a compound operation — it modifies both payments and debts.
 *
 * @param payment — the payment to record
 * @returns Promise<{ debts: Debt[]; payments: Payment[] }> — updated state
 */
export const recordPayment = async (
  payment: Payment
): Promise<{ debts: Debt[]; payments: Payment[] }> => {
  /* Save payment record */
  const payments = await getPayments();
  payments.push(payment);
  await AsyncStorage.setItem(
    STORAGE_KEYS.PAYMENTS,
    JSON.stringify(payments)
  );

  /* Update the debt balance */
  const debts = await updateDebt(payment.debtId, {
    balance: undefined as any, // Will be calculated below
  });

  /* Recalculate — find the debt and subtract payment */
  const recalculated = debts.map((d) => {
    if (d.id === payment.debtId) {
      return { ...d, balance: Math.max(0, d.balance - payment.amount) };
    }
    return d;
  });

  await saveDebts(recalculated);
  return { debts: recalculated, payments };
};

/**
 * Clears all stored data. Used for account reset / logout.
 * WARNING: This is destructive and cannot be undone.
 */
export const clearAllData = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.DEBTS,
    STORAGE_KEYS.PAYMENTS,
    "@budgetark_budget_entries",
    "@budgetark_budget_limits_by_month",
  ]);
};
