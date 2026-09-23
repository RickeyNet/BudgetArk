/**
 * BudgetArk - Deutsche Übersetzung
 * File: src/i18n/locales/de/index.ts
 *
 * Composes the German fragments. Typed against the English tree, so a
 * fragment missing here (or a key missing inside one) fails typecheck.
 */

import type { Localized } from "../types";
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

export const de: Localized<typeof en> = {
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
};
