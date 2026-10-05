/**
 * BudgetArk - Русские тексты: встроенные данные (achievements)
 * File: src/i18n/locales/ru/dataAchievements.ts
 *
 * Russian counterpart of en/dataAchievements.ts. Informal "ты" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary. Badge titles are short
 * evocative names, translated for feel rather than word for word.
 */

import type { LocalizedPlural } from "../types";
import type { dataAchievements as en } from "../en/dataAchievements";

export const dataAchievements: LocalizedPlural<typeof en> = {
  badges: {
    first_steps: {
      title: "Первые шаги",
      description: "Записал первый долг и поднял паруса.",
      hint: "Добавь долг на вкладке «Долги».",
    },
    patched_the_hull: {
      title: "Залатанный корпус",
      description: "Записал первый платёж по долгу.",
      hint: "Запиши платёж по любому долгу.",
    },
    half_mast: {
      title: "Полмачты",
      description: "Погашена половина исходной суммы долгов без ипотеки.",
      hint: "Выплати 50 % стартового долга.",
    },
    debt_free_captain: {
      title: "Капитан без долгов",
      description: "Все долги, кроме ипотеки, закрыты. Команда отдаёт честь.",
      hint: "Закрой все долги, кроме ипотеки.",
    },
    galley_stocked: {
      title: "Камбуз полон",
      description: "Резервный фонд достиг $1,000.",
      hint: "Отложи $1,000 на непредвиденное.",
    },
    sextant_sharp: {
      title: "Точный секстант",
      description: "Достигнута первая цель накоплений.",
      hint: "Заверши любую цель накоплений.",
    },
    treasure_i: {
      title: "Сундук сокровищ I",
      description: "Чистые активы перешли $10,000.",
      hint: "Подними чистые активы выше $10k.",
    },
    treasure_ii: {
      title: "Сундук сокровищ II",
      description: "Чистые активы перешли $25,000.",
      hint: "Подними чистые активы выше $25k.",
    },
    treasure_iii: {
      title: "Сундук сокровищ III",
      description: "Чистые активы перешли $100,000.",
      hint: "Подними чистые активы выше $100k.",
    },
    galleons_hold: {
      title: "Трюм галеона",
      description: "Чистые активы перешли $1,000,000. Настоящий корабль сокровищ.",
      hint: "Подними чистые активы выше $1M.",
    },
    ark_builder: {
      title: "Строитель Ковчега",
      description: "Завершён первый этап плана.",
      hint: "Заверши этап «Корпус», «Палуба» или «Припасы».",
    },
    first_mate: {
      title: "Первый помощник",
      description: "Связался с партнёром для синхронизации между устройствами.",
      hint: "Свяжись с партнёром: Профиль → Синхронизация.",
    },
    doubloon_streak: {
      title: "Серия дублонов",
      description: "12 месяцев подряд с пополнением сбережений.",
      hint: "Добавляй запись «Сбережения» каждый месяц в течение года.",
    },
    cartographer: {
      title: "Картограф",
      description: "Проложил курс - экспортировал данные хотя бы раз.",
      hint: "Экспортируй данные: Профиль → Данные.",
    },
    crows_nest: {
      title: "Воронье гнездо",
      description: "Нёс вахту - открыл Итоги месяца три раза.",
      hint: "Открой Итоги месяца на экране «Бюджет» 3 раза.",
    },
    steady_crew: {
      title: "Слаженная команда",
      description: "Три месяца подряд каждая категория в рамках бюджета.",
      hint: "Держись в рамках всех лимитов 3 месяца подряд.",
    },
    lighthouse_keeper: {
      title: "Смотритель маяка",
      description: "Открывал приложение 30 дней подряд.",
      hint: "Держи серию из 30 дней открытия приложения.",
    },
    all_sails_set: {
      title: "Все паруса подняты",
      description: "Каждая категория бюджета в рамках лимита целый месяц.",
      hint: "Соблюдай все лимиты категорий один полный месяц.",
    },
    first_voyage: {
      title: "Первое плавание",
      description: "Пройден первый урок на вкладке «Карты».",
      hint: "Заверши урок в «Курсе капитана».",
    },
    course_plotter: {
      title: "Прокладчик курса",
      description: "Пройдена глава 1: Setting Sail.",
      hint: "Пройди все уроки главы 1.",
    },
    hull_hand: {
      title: "Мастер корпуса",
      description: "Пройдена глава 2: Patching the Hull.",
      hint: "Пройди все уроки главы 2.",
    },
    anchored_in_knowledge: {
      title: "Якорь знаний",
      description: "Пройдены все уроки всех выпущенных глав.",
      hint: "Пройди весь «Курс капитана».",
    },
    admiral: {
      title: "Адмирал",
      description: "Все этапы завершены. Ковчег построен.",
      hint: "Заверши каждый этап плана.",
    },
  },
  progress: {
    months: "{{current}} / {{target}} мес.",
    days: "{{current}} / {{target}} дн.",
  },
};
