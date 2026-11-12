/**
 * BudgetArk - Русские тексты: общий словарь
 * File: src/i18n/locales/ru/common.ts
 *
 * Russian counterpart of en/common.ts. Tone: informal "ты" throughout the
 * Russian locale; imperatives on buttons. See src/i18n/GLOSSARY.md.
 */

import type { LocalizedPlural } from "../types";
import type { common as en } from "../en/common";

export const common: LocalizedPlural<typeof en> = {
  done: "Готово",
  cancel: "Отмена",
  save: "Сохранить",
  delete: "Удалить",
  ok: "ОК",
  close: "Закрыть",
  on: "Вкл.",
  off: "Выкл.",
  yes: "Да",
  no: "Нет",
  back: "Назад",
  next: "Далее",
  skip: "Пропустить",
  edit: "Изменить",
  add: "Добавить",
  remove: "Убрать",
  continue: "Продолжить",
  confirm: "Подтвердить",
  learnMore: "Подробнее",
  gotIt: "Понятно",
  opens: "Открывает",
  unknown: "Неизвестно",
  undo: "ОТМЕНИТЬ",
  undoLastAction: "Отменить последнее действие",
  /** Undo toast's ✕ (UndoProvider), read out by screen readers. */
  dismiss: "Скрыть",
  /** App.tsx - the saved user record couldn't be read at launch. */
  startupError: {
    title: "Не удалось загрузить данные",
    body:
      "BudgetArk не смог прочитать сохранённые данные на этом устройстве. Так бывает, когда на телефоне почти не осталось свободного места. Твои данные не изменились - обычно помогает освободить место.",
    retry: "Повторить",
  },
  /** components/LoadErrorBanner - a tab whose storage read failed. */
  loadError: {
    message:
      "Не удалось прочитать данные с этого телефона. Ничего не удалено, но показанное здесь может быть неполным или устаревшим.",
    retry: "Повторить",
  },
  weekdays: {
    sun: "Вс",
    mon: "Пн",
    tue: "Вт",
    wed: "Ср",
    thu: "Чт",
    fri: "Пт",
    sat: "Сб",
  },
};
