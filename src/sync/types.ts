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
  MonthStartBalance,
  NetWorthSnapshot,
  Holding,
  Business,
  Person,
  IngestLedgerEntry,
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

/**
 * Bank-connection data is DELIBERATELY (almost) absent from SyncDiff:
 * connections, credentials/secrets, external-account links, and the Review
 * Inbox are per-device - connection ids mean nothing on a partner device
 * and everything in that set is credential-adjacent. Cross-device
 * transaction dedup rides on BudgetEntry.externalTxId, which syncs inside
 * `budgetEntries` like any other entry field, plus the one exception:
 * `dismissedTransactions` carries the ingest ledger's DISMISSED decisions
 * (identity keys are global, not connection-scoped) so a partner connected
 * to the same institution doesn't re-offer what was already skipped.
 * Merchant rules (no credentials, tiny) are the remaining candidate for a
 * future optional `merchantRules?: DiffEntry<MerchantRule>[]` field -
 * they'd need a tombstone added first.
 */
export interface SyncDiff {
  debts: DiffEntry<Debt>[];
  payments: DiffEntry<Payment>[];
  /**
   * Entries with `isPrivate` are excluded at diff-build time (live and
   * tombstoned) - see computeOutgoingDiff. No wire change: receivers treat
   * a private entry's absence like any other unchanged record.
   */
  budgetEntries: DiffEntry<BudgetEntry>[];
  budgetLimits: BudgetLimitDiff[];
  savingsGoals: DiffEntry<SavingsGoal>[];
  assetAccounts: DiffEntry<AssetAccount>[];
  /**
   * Stock/ETF positions (tombstone-aware, same LWW merge as the other
   * collections). Prices are NOT synced - they live in a per-device quote
   * cache, so a paired device re-fetches its own quotes. Optional so a diff
   * from an older peer that predates the holdings feature still applies.
   */
  holdings?: DiffEntry<Holding>[];
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
   * Businesses expense entries are tagged with (`BudgetEntry.businessId`).
   * Tombstone-aware with the same LWW merge as the other collections -
   * entries reference businesses by id, so deletes must propagate or a
   * partner would resurrect a deleted client list. Optional so a diff from
   * an older peer that predates this field still applies. Brand-new
   * feature, so no backfill flag needed (same as holdings).
   */
  businesses?: DiffEntry<Business>[];
  /**
   * People spending is assigned to (`BudgetEntry.personId`). Same
   * tombstone-aware LWW contract and older-peer optionality as
   * `businesses`; brand-new feature, so no backfill flag needed.
   */
  people?: DiffEntry<Person>[];
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
  /**
   * Month-start checking balances behind the cash-flow projection
   * (`monthKey → record`). The whole map is sent whenever non-empty (tiny -
   * one record per month) and merged per-month by LWW on `updatedAt`, so
   * re-broadcasting each sync is idempotent. No tombstones: balances are
   * only ever overwritten, never deleted. Optional so a diff from an older
   * peer that predates this field still applies cleanly.
   */
  monthStartBalances?: Record<string, MonthStartBalance>;
  /**
   * Review Inbox decisions to skip a bank transaction, keyed by the global
   * identity key `provider:externalAccountId:providerTxId` (see
   * services/connections/ingest.ts). Dismissals only - never approvals
   * (their BudgetEntry already carries the key, and a decision behind a
   * private entry must not leak) - merged key-wise, strictly-newer `at`
   * wins. Incremental by `at`, with a one-time full send after updating to
   * the version that added the field (same backfill scheme as snapshots).
   * Optional so a diff from an older peer still applies, and an older peer
   * simply ignores it. A dismissed pending item's fingerprint
   * (account|amount|day) travels with it so the partner recognizes the
   * posted twin - that is the only per-transaction detail this field
   * reveals.
   */
  dismissedTransactions?: Record<string, IngestLedgerEntry>;
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
  /**
   * Outgoing-diff watermark: only records with `updatedAt` after this are
   * sent (null = first sync, send everything). Reset to null by
   * `resetSyncWatermark` after an import/restore, because restored records
   * keep their original `updatedAt` and would otherwise never be sent.
   */
  lastSyncTimestamp: string | null;
  /** Number of syncs completed */
  syncCount: number;
  /**
   * ISO timestamp of the last successful sync, for display only. Unlike
   * `lastSyncTimestamp` it survives a watermark reset, so Profile keeps
   * showing "Last synced ..." after a restore. Optional: absent on
   * metadata written before it existed (fall back to lastSyncTimestamp).
   */
  lastSyncCompletedAt?: string;
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
