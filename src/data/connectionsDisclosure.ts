/**
 * BudgetArk - Bank Connections disclosure copy.
 * File: src/data/connectionsDisclosure.ts
 *
 * Single source of truth for the consent text shown before the first bank
 * connection is added. Mirrors holdingsDisclosure.ts so the pattern (and any
 * future rendering surfaces) can never drift. The words live in
 * src/i18n/locales/{en,de}/dataDisclosures.ts (rule-4 consent copy: both
 * languages must say exactly the same thing) and are read at call time so
 * the dialog follows the active language.
 */

import { t } from "../i18n/translate";

const POINTS = ["credentials", "direct", "inbox", "remove"] as const;

export const connectionsDisclosureTitle = (): string => t("data.disclosures.connections.title");

export const connectionsDisclosureIntro = (): string => t("data.disclosures.connections.intro");

export const connectionsDisclosurePoints = (): readonly string[] =>
  POINTS.map((id) => t(`data.disclosures.connections.points.${id}`));
