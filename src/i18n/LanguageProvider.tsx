/**
 * BudgetArk - Language Provider
 * File: src/i18n/LanguageProvider.tsx
 *
 * Mirrors DensityProvider for the app language. Owns the persisted
 * Profile setting (`auto` = follow the phone, or a fixed language), resolves
 * it against the device languages, and pushes the result into i18next.
 * Screens read strings through react-i18next's `useTranslation()`, which
 * re-renders them on `changeLanguage`; this context only exposes the
 * SETTING (for the Profile picker) and the resolved language.
 *
 * Sits above the theme providers in App.tsx: it depends on nothing, and
 * every screen - onboarding included - must render in the right language.
 * The setting is per-device and cosmetic: it is not synced, not exported,
 * and deliberately survives Reset All Data like theme and density.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import i18n, { getDeviceLanguageTags } from "./index";
import * as EncryptedStorage from "../storage/encryptedStorage";
import { LANGUAGE_KEY, getAppearanceBoot } from "../theme/appearanceBoot";
import { rescheduleTrackingReminders } from "../notifications/trackingReminders";
import { rescheduleCardKeepAliveReminders } from "../notifications/cardKeepAliveReminders";
import {
  DEFAULT_APP_LANGUAGE_ID,
  LANGUAGE_NATIVE_NAMES,
  SUPPORTED_LANGUAGES,
  isAppLanguageId,
  resolveAppLanguage,
  type AppLanguageId,
  type SupportedLanguage,
} from "./pickLanguage";

export type LanguageOption = Readonly<{
  id: AppLanguageId;
  /** Language name in itself ("Deutsch"); null for "auto" - the picker translates that one. */
  nativeName: string | null;
}>;

/** "Automatic" first, then every shipped language in its own name. */
export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { id: "auto", nativeName: null },
  ...SUPPORTED_LANGUAGES.map((id) => ({ id, nativeName: LANGUAGE_NATIVE_NAMES[id] })),
];

type LanguageContextValue = Readonly<{
  /** The persisted setting ("auto" | "en" | "de" | "ru" | "uk"). */
  languageId: AppLanguageId;
  /** What i18next is actually rendering. */
  resolvedLanguage: SupportedLanguage;
  options: readonly LanguageOption[];
  setLanguageId: (id: AppLanguageId) => Promise<void>;
}>;

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Re-renders the Android Quick Entry widget so its category labels follow
 * the new language. Inline requires keep the android-widget module (and the
 * widget tree) out of the iOS bundle, matching index.js. Best effort.
 */
const refreshAndroidWidget = (): void => {
  if (Platform.OS !== "android") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requestWidgetUpdate } = require("react-native-android-widget");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { QuickEntryWidget } = require("../widgets/QuickEntryWidget");
    void requestWidgetUpdate({
      widgetName: "QuickEntry",
      renderWidget: () => React.createElement(QuickEntryWidget),
    });
  } catch {
    // No widget placed, or module unavailable: nothing to refresh.
  }
};

const applyLanguage = async (setting: AppLanguageId): Promise<SupportedLanguage> => {
  const resolved = resolveAppLanguage(setting, getDeviceLanguageTags());
  if (i18n.language !== resolved) await i18n.changeLanguage(resolved);
  return resolved;
};

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [languageId, setLanguageIdState] = useState<AppLanguageId>(DEFAULT_APP_LANGUAGE_ID);
  const [resolvedLanguage, setResolvedLanguage] = useState<SupportedLanguage>(
    () => resolveAppLanguage(DEFAULT_APP_LANGUAGE_ID, getDeviceLanguageTags()),
  );
  // Gate children like the theme providers so a user with a fixed language
  // that differs from the phone's never sees a one-frame flash of the
  // other language before the stored setting loads.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { language: stored } = await getAppearanceBoot();
        if (cancelled) return;
        // Unknown stored value (e.g. a language removed in a later build)
        // falls back to "auto" rather than throwing - fail closed to English.
        const setting: AppLanguageId = isAppLanguageId(stored) ? stored : DEFAULT_APP_LANGUAGE_ID;
        setLanguageIdState(setting);
        const resolved = await applyLanguage(setting);
        if (!cancelled) setResolvedLanguage(resolved);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguageId = useCallback(async (id: AppLanguageId) => {
    if (!isAppLanguageId(id)) return;
    setLanguageIdState(id);
    const before = i18n.language;
    const resolved = await applyLanguage(id);
    setResolvedLanguage(resolved);
    await EncryptedStorage.setItem(LANGUAGE_KEY, id);
    if (resolved !== before) {
      // Pending notifications were rendered in the old language at schedule
      // time; both reschedulers are idempotent, best-effort and never throw.
      void rescheduleTrackingReminders();
      void rescheduleCardKeepAliveReminders();
      refreshAndroidWidget();
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ languageId, resolvedLanguage, options: LANGUAGE_OPTIONS, setLanguageId }),
    [languageId, resolvedLanguage, setLanguageId],
  );

  return (
    <LanguageContext.Provider value={value}>
      {ready ? children : null}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage() must be used inside <LanguageProvider>.");
  return ctx;
};
