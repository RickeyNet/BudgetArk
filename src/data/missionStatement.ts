/**
 * BudgetArk - Mission statement: the first page of onboarding and the card
 * at the top of the Profile screen. Single source of truth for both. The
 * copy itself lives in src/i18n/locales/{en,de}/dataDisclosures.ts under
 * `data.disclosures.mission` and is resolved lazily through getters (see
 * src/i18n/translate.ts) so it reads in the active language.
 */
import { t } from "../i18n/translate";

export const MISSION_STATEMENT = {
  get eyebrow(): string {
    return t("data.disclosures.mission.eyebrow");
  },
  get title(): string {
    return t("data.disclosures.mission.title");
  },
  get body(): string {
    return t("data.disclosures.mission.body");
  },
  /** Second paragraph: the open invitation to shape the app. */
  get invite(): string {
    return t("data.disclosures.mission.invite");
  },
};
