/**
 * BudgetArk - English translation tree
 * File: src/i18n/locales/en/index.ts
 *
 * English is the SOURCE language: this object's shape defines every valid
 * translation key (see ../types.ts and ../../i18next.d.ts). One fragment
 * file per surface keeps the tree reviewable; add a fragment here and its
 * `Localized<...>` twin in de/index.ts together.
 */

import { common } from "./common";
import { nav } from "./nav";
import { appearance } from "./appearance";
import { onboarding } from "./onboarding";
import { categories } from "./categories";
import { buckets } from "./buckets";
import { categoryPicker } from "./categoryPicker";
import { datePicker } from "./datePicker";
import { achievements } from "./achievements";
import { bridgeScreen } from "./bridgeScreen";
import { bridgePlanner } from "./bridgePlanner";
import { bridgeReports } from "./bridgeReports";
import { bridgeProjection } from "./bridgeProjection";
import { debtsScreen } from "./debtsScreen";
import { debtsForm } from "./debtsForm";
import { debtsCard } from "./debtsCard";
import { debtsMoments } from "./debtsMoments";
import { budgetScreen } from "./budgetScreen";
import { budgetEntry } from "./budgetEntry";
import { budgetInbox } from "./budgetInbox";
import { budgetSpending } from "./budgetSpending";
import { budgetTools } from "./budgetTools";
import { budgetCards } from "./budgetCards";
import { profileMain } from "./profileMain";
import { profileData } from "./profileData";
import { profileSettings } from "./profileSettings";
import { profileConnections } from "./profileConnections";
import { profileInfo } from "./profileInfo";

export const en = {
  common,
  nav,
  appearance,
  onboarding,
  profile: {
    main: profileMain,
    data: profileData,
    settings: profileSettings,
    connections: profileConnections,
    info: profileInfo,
  },
  categories,
  buckets,
  categoryPicker,
  budget: {
    screen: budgetScreen,
    entry: budgetEntry,
    inbox: budgetInbox,
    spending: budgetSpending,
    tools: budgetTools,
    cards: budgetCards,
  },
  datePicker,
  debts: {
    screen: debtsScreen,
    form: debtsForm,
    card: debtsCard,
    moments: debtsMoments,
  },
  achievements,
  bridge: {
    screen: bridgeScreen,
    planner: bridgePlanner,
    reports: bridgeReports,
    projection: bridgeProjection,
  },
} as const;
