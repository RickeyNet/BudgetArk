/**
 * BudgetArk - Sync Type Definitions
 * File: src/sync/types.ts
 *
 * Types used by the P2P LAN sync system.
 */

import type {
  Debt,
  Payment,
  BudgetEntry,
  CategoryBudgetLimit,
  SavingsGoal,
  DebtMilestonePlan,
  AssetAccount,
} from "../types";
import type { PayoffStrategyPreference } from "../storage/debtStorage";

/* ─── Pairing ─── */

export interface PairingState {
  /** Partner's UserAccount.id */
  partnerId: string;
  /** Partner's display name */
  partnerName: string;
  /** 256-bit hex shared secret for sync encryption */
  sharedSecret: string;
  /** ISO timestamp of when pairing was established */
  pairedAt: string;
  /** Optional WiFi SSID that triggers auto-sync */
  homeSSID?: string;
  /** Whether auto-sync is enabled */
  autoSyncEnabled: boolean;
}

/* ─── Sync Protocol Messages ─── */

export type SyncMessageType =
  | "PAIR_OFFER"
  | "PAIR_ACCEPT"
  | "SYNC_REQUEST"
  | "SYNC_RESPONSE"
  | "SYNC_ACK";

export interface SyncMessage {
  type: SyncMessageType;
  senderId: string;
  timestamp: string;
  /** Random UUID per message for replay protection */
  nonce: string;
  /** Encrypted JSON payload */
  payload: string;
  /** HMAC-SHA256 integrity check of payload */
  hmac: string;
}

/* ─── Pairing Protocol Payloads ─── */

export interface PairOfferPayload {
  userId: string;
  displayName: string;
  sharedSecret: string;
}

export interface PairAcceptPayload {
  userId: string;
  displayName: string;
  confirmed: true;
}

/* ─── Sync Diffs ─── */

export interface DiffEntry<T> {
  action: "upsert" | "delete";
  record: T;
}

export interface BudgetLimitDiff {
  monthKey: string;
  limits: CategoryBudgetLimit[];
}

export interface SyncDiff {
  debts: DiffEntry<Debt>[];
  payments: DiffEntry<Payment>[];
  budgetEntries: DiffEntry<BudgetEntry>[];
  budgetLimits: BudgetLimitDiff[];
  savingsGoals: DiffEntry<SavingsGoal>[];
  assetAccounts: DiffEntry<AssetAccount>[];
  debtMilestonePlan?: DebtMilestonePlan;
  payoffStrategy?: PayoffStrategyPreference;
  /**
   * ISO timestamp paired with `payoffStrategy` so the receiver can apply
   * last-write-wins instead of accepting whatever value arrived last (which
   * caused the strategy to flip-flop across paired devices). Optional for
   * back-compat with peers running pre-LWW versions; missing values are
   * treated as legacy and superseded by any envelope-stamped local value.
   */
  payoffStrategyUpdatedAt?: string;
  syncTimestamp: string;
}

/* ─── Sync State ─── */

export interface SyncMetadata {
  /** ISO timestamp of last successful sync */
  lastSyncTimestamp: string | null;
  /** Number of syncs completed */
  syncCount: number;
}

export type SyncStatus =
  | "idle"
  | "discovering"
  | "connecting"
  | "syncing"
  | "complete"
  | "error";

export interface SyncResult {
  success: boolean;
  recordsSent: number;
  recordsReceived: number;
  timestamp: string;
  error?: string;
}

export type PairingRole = "initiator" | "joiner";
