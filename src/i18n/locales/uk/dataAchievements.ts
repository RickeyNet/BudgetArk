/**
 * BudgetArk - Українські тексти: вбудовані дані (achievements)
 * File: src/i18n/locales/uk/dataAchievements.ts
 *
 * Ukrainian counterpart of en/dataAchievements.ts. Informal "ти" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary. Badge titles are short
 * evocative names, translated for feel rather than word for word.
 */

import type { LocalizedPlural } from "../types";
import type { dataAchievements as en } from "../en/dataAchievements";

export const dataAchievements: LocalizedPlural<typeof en> = {
  badges: {
    first_steps: {
      title: "Перші кроки",
      description: "Записав перший борг і підняв вітрила.",
      hint: "Додай борг на вкладці «Борги».",
    },
    patched_the_hull: {
      title: "Залатаний корпус",
      description: "Записав перший платіж за боргом.",
      hint: "Запиши платіж за будь-яким боргом.",
    },
    half_mast: {
      title: "Півщогли",
      description: "Погашено половину початкової суми боргів без іпотеки.",
      hint: "Виплати 50 % стартового боргу.",
    },
    debt_free_captain: {
      title: "Капітан без боргів",
      description: "Усі борги, крім іпотеки, закриті. Команда віддає честь.",
      hint: "Закрий усі борги, крім іпотеки.",
    },
    galley_stocked: {
      title: "Камбуз повний",
      description: "Резервний фонд досяг $1,000.",
      hint: "Відклади $1,000 на непередбачене.",
    },
    sextant_sharp: {
      title: "Точний секстант",
      description: "Досягнуто першу ціль заощаджень.",
      hint: "Заверши будь-яку ціль заощаджень.",
    },
    treasure_i: {
      title: "Скриня скарбів I",
      description: "Чисті активи перетнули $10,000.",
      hint: "Підніми чисті активи вище $10k.",
    },
    treasure_ii: {
      title: "Скриня скарбів II",
      description: "Чисті активи перетнули $25,000.",
      hint: "Підніми чисті активи вище $25k.",
    },
    treasure_iii: {
      title: "Скриня скарбів III",
      description: "Чисті активи перетнули $100,000.",
      hint: "Підніми чисті активи вище $100k.",
    },
    galleons_hold: {
      title: "Трюм галеона",
      description: "Чисті активи перетнули $1,000,000. Справжній корабель скарбів.",
      hint: "Підніми чисті активи вище $1M.",
    },
    ark_builder: {
      title: "Будівник Ковчега",
      description: "Завершено перший етап плану.",
      hint: "Заверши етап «Корпус», «Палуба» або «Припаси».",
    },
    first_mate: {
      title: "Перший помічник",
      description: "Зв'язався з партнером для синхронізації між пристроями.",
      hint: "Зв'яжися з партнером: Профіль → Синхронізація.",
    },
    doubloon_streak: {
      title: "Серія дублонів",
      description: "12 місяців поспіль із поповненням заощаджень.",
      hint: "Додавай запис «Заощадження» щомісяця протягом року.",
    },
    cartographer: {
      title: "Картограф",
      description: "Проклав курс - експортував дані хоча б раз.",
      hint: "Експортуй дані: Профіль → Дані.",
    },
    crows_nest: {
      title: "Вороняче гніздо",
      description: "Ніс вахту - відкрив Підсумки місяця тричі.",
      hint: "Відкрий Підсумки місяця на екрані «Бюджет» 3 рази.",
    },
    steady_crew: {
      title: "Злагоджена команда",
      description: "Три місяці поспіль кожна категорія в межах бюджету.",
      hint: "Тримайся в межах усіх лімітів 3 місяці поспіль.",
    },
    lighthouse_keeper: {
      title: "Доглядач маяка",
      description: "Відкривав застосунок 30 днів поспіль.",
      hint: "Тримай серію з 30 днів відкриття застосунку.",
    },
    all_sails_set: {
      title: "Усі вітрила підняті",
      description: "Кожна категорія бюджету в межах ліміту цілий місяць.",
      hint: "Дотримуйся всіх лімітів категорій один повний місяць.",
    },
    first_voyage: {
      title: "Перше плавання",
      description: "Пройдено перший урок на вкладці «Карти».",
      hint: "Заверши урок у «Курсі капітана».",
    },
    course_plotter: {
      title: "Прокладач курсу",
      description: "Пройдено розділ 1: Setting Sail.",
      hint: "Пройди всі уроки розділу 1.",
    },
    hull_hand: {
      title: "Майстер корпусу",
      description: "Пройдено розділ 2: Patching the Hull.",
      hint: "Пройди всі уроки розділу 2.",
    },
    anchored_in_knowledge: {
      title: "Якір знань",
      description: "Пройдено всі уроки всіх випущених розділів.",
      hint: "Пройди весь «Курс капітана».",
    },
    admiral: {
      title: "Адмірал",
      description: "Усі етапи завершено. Ковчег побудовано.",
      hint: "Заверши кожен етап плану.",
    },
  },
  progress: {
    months: "{{current}} / {{target}} міс.",
    days: "{{current}} / {{target}} дн.",
  },
};
