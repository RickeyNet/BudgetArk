/**
 * BudgetArk - Translation for non-component code
 * File: src/i18n/translate.ts
 *
 * Pure helpers in src/utils, src/sync, src/services and src/notifications
 * sometimes produce user-facing sentences (skip reasons, milestone titles,
 * notification copy). They cannot call `useTranslation()` (no React), so
 * they use this bound `t` from the global i18next instance instead.
 *
 * Rules for callers:
 * - Components still use `useTranslation()`; this `t` is for plain modules.
 * - A helper called during render picks up the current language on every
 *   re-render. A helper called inside `useMemo` / `useCallback` does NOT:
 *   the component must list its own `t` in the dependency array so the
 *   value recomputes after a language switch.
 * - Jest initialises the global instance with the English tree
 *   (`src/i18n/jestSetup.ts`), so util tests keep asserting real English
 *   strings rather than keys.
 */

import i18next from "i18next";

export { t } from "i18next";

/** BCP-47 tag of the active language, for `toLocaleDateString` & co. in plain modules. */
export const currentLanguage = (): string => i18next.language || "en";
