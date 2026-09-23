/**
 * Shown on Captain's Course / lesson surfaces. Keeps wording in one place:
 * the text lives in src/i18n/locales/{en,de}/dataDisclosures.ts and is read
 * at call time so it follows the active language.
 */
import { t } from "../i18n/translate";

export const learningDisclaimer = (): string => t("data.disclosures.learningDisclaimer");
