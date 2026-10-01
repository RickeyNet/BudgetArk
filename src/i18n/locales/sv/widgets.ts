/**
 * BudgetArk - Svenska texter: hemskärmswidgetar
 * File: src/i18n/locales/sv/widgets.ts
 *
 * Swedish counterpart of en/widgets.ts; mirrored in targets/quickentry/index.swift.
 * Informal "du" throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { widgets as en } from "../en/widgets";

export const widgets: Localized<typeof en> = {
  quickEntry: {
    title: "⚓ Snabbregistrering",
    subtitle: "  ·  logga en utgift",
  },
};
