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
  CustomCategory,
  BudgetBucket,
  NetWorthSnapshot,
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
  /** Protocol version - see transportService.PROTOCOL_VERSION. */
  v: number;
  type: SyncMessageType;
  senderId: string;
  timestamp: string;
  /** Random UUID per message for replay protection */
  nonce: string;
  /** Encrypted JSON payload */
  payload: string;
  /**
   * HMAC-SHA256 over the full envelope (version, type, senderId, timestamp,
   * nonce, ciphertext) - NOT just the ciphertext. Signing only the payload
   * (protocol v1) let a LAN attacker re-wrap a captured payload+hmac pair in
   * a fresh envelope with a new timestamp/nonce/type, defeating the replay
   * and age checks entirely.
   */
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
  /**
   * Custom category definitions. Budget entries reference these by NAME, so
   * without syncing the definitions a partner renders synced entries with
   * the fallback icon and the default "wants" bucket - bucket math diverges
   * between paired devices. Upsert-only: custom categories carry no
   * tombstones (see types/index.ts). Optional so a diff from an older peer
   * that predates this field still applies cleanly.
   */
  customCategories?: DiffEntry<CustomCategory>[];
  /**
   * Per-category 50/30/20 bucket overrides. The store has no per-key
   * timestamps, so the whole map is sent and merged key-wise on receipt.
   * Optional for the same older-peer reason as customCategories.
   */
  categoryBucketOverrides?: Record<string, BudgetBucket>;
  /**
   * Net-worth history. Bare records (no tombstones - snapshots are never
   * deleted, only pruned by the 730-day cap) merged by dayKey keeping the
   * newer capturedAt. Incremental syncs send only days captured since the
   * last sync; the first sync after pairing - and the one-time backfill
   * sync after updating to the version that added this field - send the
   * full history so both devices converge on the union of their pasts.
   * Optional for older-peer tolerance like the fields above.
   */
  netWorthSnapshots?: NetWorthSnapshot[];
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
