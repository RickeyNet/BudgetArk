/**
 * BudgetArk - Ukrainian translation
 * File: src/i18n/locales/uk/index.ts
 *
 * Composes the fragments. Typed against the English tree with the
 * one/few/many/other plural expansion, so a fragment missing here (or a key
 * or plural form missing inside one) fails typecheck.
 */

import type { LocalizedPlural } from "../types";
import type { en } from "../en";
import { common } from "./common";
import { nav } from "./nav";
import { appearance } from "./appearance";
import { onboarding } from "./onboarding";
import { categories } from "./categories";
import { buckets } from "./buckets";
import { categoryPicker } from "./categoryPicker";
import { datePicker } from "./datePicker";
import { achievements } from "./achievements";
import { chartsScreen } from "./chartsScreen";
import { chartsTax } from "./chartsTax";
import { chartsPlanning } from "./chartsPlanning";
import { chartsInsights } from "./chartsInsights";
import { lessonsShell } from "./lessonsShell";
import { modalsConnections } from "./modalsConnections";
import { modalsGuard } from "./modalsGuard";
import { modalsData } from "./modalsData";
import { modalsPeople } from "./modalsPeople";
import { modalsEngage } from "./modalsEngage";
import { helpersImport } from "./helpersImport";
import { helpersNotifications } from "./helpersNotifications";
import { helpersInsights } from "./helpersInsights";
import { helpersPlanning } from "./helpersPlanning";
import { helpersMisc } from "./helpersMisc";
import { dataAchievements } from "./dataAchievements";
import { dataSpotlights } from "./dataSpotlights";
import { dataCoachmarks } from "./dataCoachmarks";
import { dataGuides } from "./dataGuides";
import { dataTemplates } from "./dataTemplates";
import { dataDisclosures } from "./dataDisclosures";
import { widgets } from "./widgets";
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

export const uk: LocalizedPlural<typeof en> = {
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
  charts: {
    screen: chartsScreen,
    tax: chartsTax,
    planning: chartsPlanning,
    insights: chartsInsights,
    lessons: lessonsShell,
  },
  modals: {
    connections: modalsConnections,
    guard: modalsGuard,
    data: modalsData,
    people: modalsPeople,
    engage: modalsEngage,
  },
  helpers: {
    import: helpersImport,
    notifications: helpersNotifications,
    insights: helpersInsights,
    planning: helpersPlanning,
    misc: helpersMisc,
  },
  data: {
    achievements: dataAchievements,
    spotlights: dataSpotlights,
    coachmarks: dataCoachmarks,
    guides: dataGuides,
    templates: dataTemplates,
    disclosures: dataDisclosures,
  },
  widgets,
};
