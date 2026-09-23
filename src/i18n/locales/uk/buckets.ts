/**
 * BudgetArk - Українські тексти: групи бюджету
 * File: src/i18n/locales/uk/buckets.ts
 *
 * Ukrainian counterpart of en/buckets.ts (needs / wants / savings).
 */

import type { LocalizedPlural } from "../types";
import type { buckets as en } from "../en/buckets";

export const buckets: LocalizedPlural<typeof en> = {
  needs: "Потреби",
  wants: "Бажання",
  savings: "Заощадження",
};
