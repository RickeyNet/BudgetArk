/**
 * BudgetArk - i18next type augmentation
 * File: src/i18n/i18next.d.ts
 *
 * Teaches i18next's `t()` the English key tree so an unknown or misspelled
 * key is a compile error, not a runtime "profile.data.exportTitle" on
 * screen. Only the English tree is referenced: German is separately typed
 * as Localized<typeof en> (see locales/types.ts), so both directions are
 * covered by `npm run typecheck`.
 */

import "i18next";
import type { en } from "./locales/en";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    returnNull: false;
    resources: {
      translation: typeof en;
    };
  }
}
