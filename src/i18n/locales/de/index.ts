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
};
