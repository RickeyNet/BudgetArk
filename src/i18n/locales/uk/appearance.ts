/**
 * BudgetArk - Українські тексти: Профіль > Оформлення
 * File: src/i18n/locales/uk/appearance.ts
 *
 * Ukrainian counterpart of en/appearance.ts. Theme names (The Ark, Forest
 * Gold, ...) are proper nouns and deliberately stay untranslated.
 */

import type { LocalizedPlural } from "../types";
import type { appearance as en } from "../en/appearance";

export const appearance: LocalizedPlural<typeof en> = {
  sectionTitle: "ОФОРМЛЕННЯ",
  theme: {
    label: "Тема",
    pickerTitle: "Обери тему",
  },
  surfaceStyle: {
    label: "Стиль оформлення",
    pickerTitle: "Стиль оформлення",
    themeDefaultSuffix: " · типово для теми",
    themeDefaultNote:
      "Тема {{theme}} зараз типово використовує «Скло». Обери стиль тут, щоб зберегти його для всіх тем.",
    presets: {
      solid: { name: "Суцільний", description: "Класичні непрозорі картки та вікна." },
      glass: { name: "Скло", description: "Напівпрозорі матові картки в усьому застосунку." },
    },
  },
  backgroundEffects: {
    label: "Фонові ефекти",
    enabled: "Декоративні тематичні фони ввімкнено",
    disabled: "Прості фони - менше візуального шуму",
  },
  density: {
    label: "Щільність інтерфейсу",
    pickerTitle: "Щільність інтерфейсу",
    presets: {
      compact: { name: "Компактна", description: "Менше відступів, більше вмісту на екрані." },
      comfortable: { name: "Звичайна", description: "Збалансовані відступи - типовий вигляд." },
      spacious: { name: "Простора", description: "Більші кнопки та вільніший текст." },
    },
  },
  textSize: {
    label: "Розмір тексту",
    pickerTitle: "Розмір тексту",
    a11yLabel: "Розмір тексту, зараз {{current}}",
    a11yHint: "Відкриває параметри розміру тексту для всього застосунку",
    presets: {
      small: { name: "Малий", description: "Трохи менший текст - на екрані вміщується більше." },
      default: { name: "Звичайний", description: "Стандартний розмір тексту." },
      large: { name: "Великий", description: "Більший текст - легше читати." },
      xlarge: { name: "Дуже великий", description: "Найбільший текст - максимальна читабельність." },
    },
  },
};
