/**
 * BudgetArk - Русские тексты: Профиль > Оформление
 * File: src/i18n/locales/ru/appearance.ts
 *
 * Russian counterpart of en/appearance.ts. Theme names (The Ark, Forest
 * Gold, ...) are proper nouns and deliberately stay untranslated.
 */

import type { LocalizedPlural } from "../types";
import type { appearance as en } from "../en/appearance";

export const appearance: LocalizedPlural<typeof en> = {
  sectionTitle: "ОФОРМЛЕНИЕ",
  theme: {
    label: "Тема",
    pickerTitle: "Выбери тему",
  },
  surfaceStyle: {
    label: "Стиль оформления",
    pickerTitle: "Стиль оформления",
    themeDefaultSuffix: " · по умолчанию для темы",
    themeDefaultNote:
      "Тема {{theme}} сейчас по умолчанию использует «Стекло». Выбери стиль здесь, чтобы сохранить его для всех тем.",
    presets: {
      solid: { name: "Сплошной", description: "Классические непрозрачные карточки и окна." },
      glass: { name: "Стекло", description: "Полупрозрачные матовые карточки по всему приложению." },
    },
  },
  backgroundEffects: {
    label: "Фоновые эффекты",
    enabled: "Декоративные тематические фоны включены",
    disabled: "Простые фоны - меньше визуального шума",
  },
  density: {
    label: "Плотность интерфейса",
    pickerTitle: "Плотность интерфейса",
    presets: {
      compact: { name: "Компактная", description: "Меньше отступов, больше контента на экране." },
      comfortable: { name: "Обычная", description: "Сбалансированные отступы - вид по умолчанию." },
      spacious: { name: "Просторная", description: "Крупнее кнопки и свободнее текст." },
    },
  },
  textSize: {
    label: "Размер текста",
    pickerTitle: "Размер текста",
    a11yLabel: "Размер текста, сейчас {{current}}",
    a11yHint: "Открывает параметры размера текста для всего приложения",
    presets: {
      small: { name: "Мелкий", description: "Чуть меньше текст - на экране помещается больше." },
      default: { name: "Обычный", description: "Стандартный размер текста." },
      large: { name: "Крупный", description: "Больше текст - легче читать." },
      xlarge: { name: "Очень крупный", description: "Самый крупный текст - максимальная читаемость." },
    },
  },
};
