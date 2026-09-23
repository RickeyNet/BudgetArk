/**
 * BudgetArk - Українські тексти: віджети головного екрана
 * File: src/i18n/locales/uk/widgets.ts
 *
 * Ukrainian counterpart of en/widgets.ts. The iOS WidgetKit target has no
 * JS runtime and carries its own strings (targets/quickentry/index.swift).
 */

import type { LocalizedPlural } from "../types";
import type { widgets as en } from "../en/widgets";

export const widgets: LocalizedPlural<typeof en> = {
  quickEntry: {
    title: "⚓ Швидкий запис",
    subtitle: "  ·  додати витрату",
  },
};
