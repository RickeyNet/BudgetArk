/**
 * BudgetArk - Svenska texter: 50/30/20-hinkar
 * File: src/i18n/locales/sv/buckets.ts
 *
 * Swedish counterpart of en/buckets.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { buckets as en } from "../en/buckets";

export const buckets: Localized<typeof en> = {
  needs: "Behov",
  wants: "Önskemål",
  savings: "Sparande",
};
