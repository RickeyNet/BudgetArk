/**
 * BudgetArk - Русские тексты: группы бюджета
 * File: src/i18n/locales/ru/buckets.ts
 *
 * Russian counterpart of en/buckets.ts (needs / wants / savings).
 */

import type { LocalizedPlural } from "../types";
import type { buckets as en } from "../en/buckets";

export const buckets: LocalizedPlural<typeof en> = {
  needs: "Нужды",
  wants: "Желания",
  savings: "Сбережения",
};
