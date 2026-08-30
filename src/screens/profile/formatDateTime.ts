/**
 * BudgetArk - Profile Date Formatting
 * File: src/screens/profile/formatDateTime.ts
 *
 * "Unknown"-safe local date-time formatter shared by the Profile section
 * components (last-sync status, update-check timestamps, exchange-rate
 * snapshots). Extracted from ProfileScreen.tsx during decomposition.
 */

export const formatDateTime = (iso?: string): string => {
  if (!iso) return "Unknown";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "Unknown";
  return new Date(parsed).toLocaleString();
};
