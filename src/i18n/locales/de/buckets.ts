/**
 * BudgetArk - Deutsche Texte: 50/30/20-Töpfe
 * File: src/i18n/locales/de/buckets.ts
 *
 * German counterpart of en/buckets.ts.
 */

import type { Localized } from "../types";
import type { buckets as en } from "../en/buckets";

export const buckets: Localized<typeof en> = {
  needs: "Bedarf",
  wants: "Wünsche",
  savings: "Sparen",
};
