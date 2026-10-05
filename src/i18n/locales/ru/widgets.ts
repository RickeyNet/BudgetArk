/**
 * BudgetArk - Русские тексты: виджеты домашнего экрана
 * File: src/i18n/locales/ru/widgets.ts
 *
 * Russian counterpart of en/widgets.ts. The iOS WidgetKit target has no JS
 * runtime and carries its own strings (targets/quickentry/index.swift).
 */

import type { LocalizedPlural } from "../types";
import type { widgets as en } from "../en/widgets";

export const widgets: LocalizedPlural<typeof en> = {
  quickEntry: {
    title: "⚓ Быстрая запись",
    subtitle: "  ·  добавить расход",
  },
};
