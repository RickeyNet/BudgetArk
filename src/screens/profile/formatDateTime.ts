/**
 * BudgetArk - Profile Date Formatting
 * File: src/screens/profile/formatDateTime.ts
 *
 * "Unknown"-safe local date-time formatter shared by the Profile section
 * components (last-sync status, update-check timestamps, exchange-rate
 * snapshots). Extracted from ProfileScreen.tsx during decomposition.
 */

import i18n, { t } from "i18next";

// Reads the active language straight from the i18next instance (pure JS -
// no expo-localization import here). Every caller renders inside a
// component that already subscribes via useTranslation(), so the output
// re-renders on a language change without this helper being a hook.
export const formatDateTime = (iso?: string): string => {
  if (!iso) return t("common.unknown");
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return t("common.unknown");
  try {
    return new Date(parsed).toLocaleString(i18n.language);
  } catch {
    return new Date(parsed).toLocaleString();
  }
};
