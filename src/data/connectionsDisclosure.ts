/**
 * BudgetArk - Bank Connections disclosure copy.
 * File: src/data/connectionsDisclosure.ts
 *
 * Single source of truth for the consent text shown before the first bank
 * connection is added. Mirrors holdingsDisclosure.ts so the pattern (and any
 * future rendering surfaces) can never drift.
 */

export const CONNECTIONS_DISCLOSURE_TITLE = "Before you connect";

export const CONNECTIONS_DISCLOSURE_INTRO =
  "Bank Connections talk to your financial providers directly from this device. Here's exactly what that means:";

export const CONNECTIONS_DISCLOSURE_POINTS: readonly string[] = [
  "Your credentials (a SimpleFIN token or your Teller certificate) are stored encrypted on this device only. They never sync to a paired partner and never touch a BudgetArk server - BudgetArk doesn't have one.",
  "To fetch balances and transactions, this device connects directly to SimpleFIN or Teller. Those providers see the requests come from you, not from BudgetArk.",
  "Imported transactions wait in a Review Inbox. Nothing enters your budget until you approve it.",
  "You can remove a connection at any time. Its credentials are deleted from this device, and entries you already approved stay in your budget.",
];
