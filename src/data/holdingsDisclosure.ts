/**
 * BudgetArk - Live Holdings off-device disclosure copy.
 * File: src/data/holdingsDisclosure.ts
 *
 * Single source of truth for the consent text shown before the Live Holdings
 * feature is first enabled. Rendered both from the Bridge teaser and the
 * Profile settings toggle so the two can never drift. The words live in
 * src/i18n/locales/{en,de}/dataDisclosures.ts (rule-4 consent copy: both
 * languages must say exactly the same thing) and are read at call time.
 */

import { t } from "../i18n/translate";

const POINTS = ["stored", "symbolsOnly", "thirdParty"] as const;

export const holdingsDisclosureTitle = (): string => t("data.disclosures.holdings.title");

export const holdingsDisclosureIntro = (): string => t("data.disclosures.holdings.intro");

export const holdingsDisclosurePoints = (): readonly string[] =>
  POINTS.map((id) => t(`data.disclosures.holdings.points.${id}`));
