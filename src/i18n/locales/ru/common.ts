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
};
