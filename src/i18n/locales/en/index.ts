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
} as const;
