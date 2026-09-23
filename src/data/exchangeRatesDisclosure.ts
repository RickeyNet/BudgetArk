/**
 * BudgetArk - Exchange-rate off-device disclosure copy.
 * File: src/data/exchangeRatesDisclosure.ts
 *
 * Single source of truth for the consent text shown before the Settings
 * currency switch fetches its first live exchange rate. Mirrors
 * holdingsDisclosure.ts / connectionsDisclosure.ts so any future surface that
 * triggers the rate fetch renders the same words. The words live in
 * src/i18n/locales/{en,de}/dataDisclosures.ts (rule-4 consent copy: both
 * languages must say exactly the same thing) and are read at call time.
 */

import { t } from "../i18n/translate";

const POINTS = ["request", "onDevice", "fallback"] as const;

export const exchangeRatesDisclosureTitle = (): string => t("data.disclosures.exchangeRates.title");

export const exchangeRatesDisclosureIntro = (): string => t("data.disclosures.exchangeRates.intro");

export const exchangeRatesDisclosurePoints = (): readonly string[] =>
  POINTS.map((id) => t(`data.disclosures.exchangeRates.points.${id}`));
