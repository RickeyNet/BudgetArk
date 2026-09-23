/**
 * BudgetArk - Settings Section
 * File: src/screens/profile/SettingsSection.tsx
 *
 * The SETTINGS card: currency & locale (with the convert-or-relabel prompt),
 * privacy mode, Live Holdings opt-in (with its off-device disclosure),
 * haptics, tracking reminders, and OTA update checks (with the update-ready
 * dialog). Owns all of that state and loads its own persisted prefs.
 * Pairing state and the reminder settings stay in ProfileScreen - the
 * currency prompt behaves differently while paired, and the reset flow
 * clears reminders - so those arrive as props. Exposes openAppLock()
 * through a ref (ConnectionsSection pattern) so ProfileScreen's
 * openSection deep link can open the App Lock setup modal.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as Updates from "expo-updates";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type {
  CurrencyPreferenceId,
  UpdatePreferences,
  HoldingsSettings,
  ExchangeRatesSettings,
} from "../../types";
import { CURRENT_APP_VERSION } from "../../data/releaseNotes";
import {
  getUpdatePreferences,
  setLastUpdateCheckAt,
  setManualUpdateMode,
} from "../../storage/updatePreferencesStorage";
import { setOtaUpdateInstalled } from "../../storage/releaseNotesStorage";
import { useCurrency } from "../../currency/CurrencyProvider";
import { getCurrencyPreferenceOption } from "../../utils/currencyPreferences";
import { convertAllStoredData } from "../../utils/currencyMigration";
import { getCurrentRates, type RatesSnapshot } from "../../utils/exchangeRates";
import { isUpdateSafe } from "../../utils/versionGuard";
import {
  resolveUpdateInfo,
  findReleaseNoteForVersion,
} from "../../utils/updateReleaseNotes";
import { getPrivacyMode, setPrivacyMode } from "../../storage/privacyStorage";
import { getAppLockRecord } from "../../storage/appLockStorage";
import AppLockSetupModal from "../../components/AppLockSetupModal";
import type { PairingState } from "../../sync/types";
import OptionPickerModal from "../../components/OptionPickerModal";
import { useLanguage, type LanguageOption } from "../../i18n/LanguageProvider";
import { LANGUAGE_NATIVE_NAMES } from "../../i18n/pickLanguage";
import NewFeatureBadge from "../../components/NewFeatureBadge";
import TrackingRemindersModal from "../../components/TrackingRemindersModal";
import type { TrackingReminderSettings } from "../../utils/trackingReminderPlanner";
import { waitForIosModalTeardown } from "../../utils/iosNativeShare";
import { triggerHaptic, setHapticsCache } from "../../utils/haptics";
import {
  getHapticsEnabled,
  setHapticsEnabled,
} from "../../storage/hapticsStorage";
import {
  getHoldingsSettings,
  setHoldingsEnabled,
} from "../../storage/holdingsSettingsStorage";
import {
  holdingsDisclosureTitle,
  holdingsDisclosureIntro,
  holdingsDisclosurePoints,
} from "../../data/holdingsDisclosure";
import {
  getExchangeRatesSettings,
  acknowledgeExchangeRatesDisclosure,
} from "../../storage/exchangeRatesSettingsStorage";
import {
  exchangeRatesDisclosureTitle,
  exchangeRatesDisclosureIntro,
  exchangeRatesDisclosurePoints,
} from "../../data/exchangeRatesDisclosure";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";
import { formatDateTime } from "./formatDateTime";

type UpdateMetadata = {
  id: string;
  message: string;
  createdAt?: string;
  runtimeVersion?: string;
  appVersion?: string;
};

/** Settings-row subtext summarizing the current tracking-reminder setup. */
const reminderRowSubtext = (
  t: TFunction,
  settings: TrackingReminderSettings | null
): string => {
  if (!settings?.enabled) {
    return t("profile.settings.reminders.off");
  }
  const cadence =
    settings.cadenceDays === 7
      ? t("profile.settings.reminders.afterQuietWeek")
      : t("profile.settings.reminders.afterQuietDays", { count: settings.cadenceDays });
  const what =
    settings.checkInsEnabled && settings.monthStartEnabled
      ? t("profile.settings.reminders.checkInsAndMonthStart")
      : settings.checkInsEnabled
        ? cadence
        : settings.monthStartEnabled
          ? t("profile.settings.reminders.monthStart")
          : t("profile.settings.reminders.nothingSelected");
  const when =
    settings.hour === 9
      ? t("profile.settings.reminders.mornings")
      : settings.hour === 13
        ? t("profile.settings.reminders.afternoons")
        : t("profile.settings.reminders.evenings");
  return t("profile.settings.reminders.summary", { what, when });
};

export type SettingsSectionHandle = {
  /** Opens the App Lock set/change/disable modal (spotlight deep link). */
  openAppLock: () => void;
  /** Opens the Language picker (spotlight deep link). */
  openLanguage: () => void;
};

type SettingsSectionProps = {
  pairing: PairingState | null;
  showInfo: (info: { title: string; message: string }) => void;
  /** Mirrors a saved currency change onto the parent-owned user account. */
  onCurrencyApplied: (id: CurrencyPreferenceId) => void;
  newFeatureIds: ReadonlySet<string>;
  onDismissNewBadge: (featureId: string) => void;
  reminderSettings: TrackingReminderSettings | null;
  showTrackingReminders: boolean;
  onOpenTrackingReminders: () => void;
  onCloseTrackingReminders: () => void;
};

const SettingsSection = forwardRef<SettingsSectionHandle, SettingsSectionProps>(({
  pairing,
  showInfo,
  onCurrencyApplied,
  newFeatureIds,
  onDismissNewBadge,
  reminderSettings,
  showTrackingReminders,
  onOpenTrackingReminders,
  onCloseTrackingReminders,
}, ref) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);
  const {
    preference,
    options: currencyOptions,
    setPreferenceId,
  } = useCurrency();

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  // App language sits right beside Currency: both are "how the app reads"
  // preferences and users look for them together.
  const {
    languageId,
    resolvedLanguage,
    options: languageOptions,
    setLanguageId,
  } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  // "Automatic (Deutsch)" tells the user what auto resolved to; a fixed
  // choice shows the language in its own name.
  const languageName =
    languageId === "auto"
      ? t("profile.settings.language.autoWithResolved", {
          language: LANGUAGE_NATIVE_NAMES[resolvedLanguage],
        })
      : LANGUAGE_NATIVE_NAMES[languageId];
  const languageOptionText = useCallback(
    (option: LanguageOption): { name: string; description: string } =>
      option.id === "auto"
        ? {
            name: t("profile.settings.language.options.auto.name"),
            description: t("profile.settings.language.options.auto.description"),
          }
        : { name: option.nativeName ?? option.id, description: "" },
    [t],
  );
  const handleLanguageSelect = useCallback(
    async (option: LanguageOption) => {
      await setLanguageId(option.id);
    },
    [setLanguageId],
  );

  /**
   * Pending currency change awaiting the convert/relabel choice. Set when the
   * user picks a currency whose code differs from the current one; cleared on
   * Cancel or once a choice is applied.
   */
  const [currencyPrompt, setCurrencyPrompt] = useState<{
    id: CurrencyPreferenceId;
    fromLabel: string;
    toLabel: string;
  } | null>(null);
  const [currencyConverting, setCurrencyConverting] = useState(false);
  /** Live rate snapshot fetched when the convert prompt opens (unpaired only). */
  const [currencyRates, setCurrencyRates] = useState<RatesSnapshot | null>(
    null,
  );
  const [currencyRatesLoading, setCurrencyRatesLoading] = useState(false);

  /** OTA update preferences and status */
  const [updatePrefs, setUpdatePrefs] = useState<UpdatePreferences>({
    manualUpdateMode: false,
  });
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<UpdateMetadata | null>(
    null,
  );
  const canCheckUpdates = !__DEV__ && Updates.isEnabled;

  /** Privacy mode - blocks screenshots/screen recording when enabled */
  const [privacyMode, setPrivacyModeState] = useState(false);

  /** App Lock (PIN on open) - row state + the set/change/disable modal. */
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [showAppLockSetup, setShowAppLockSetup] = useState(false);

  useImperativeHandle(ref, () => ({
    openAppLock: () => setShowAppLockSetup(true),
    openLanguage: () => setShowLanguageModal(true),
  }), []);

  /** Haptic feedback toggle */
  const [hapticsEnabled, setHapticsState] = useState(true);

  /** Live Holdings opt-in (off by default) + its first-enable disclosure. */
  const [holdingsSettings, setHoldingsSettings] = useState<HoldingsSettings>({
    enabled: false,
    disclosureAcknowledged: false,
  });
  const [showHoldingsDisclosure, setShowHoldingsDisclosure] = useState(false);

  /**
   * Consent for the live exchange-rate fetch (rule 4: the first network
   * request needs a plain-language disclosure). `fxDisclosurePending` holds
   * the currency change waiting behind the disclosure dialog.
   */
  const [fxSettings, setFxSettings] = useState<ExchangeRatesSettings>({
    disclosureAcknowledged: false,
  });
  const [fxDisclosurePending, setFxDisclosurePending] = useState<{
    id: CurrencyPreferenceId;
    fromLabel: string;
    toLabel: string;
  } | null>(null);

  /** Load persisted settings on mount */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [prefs, privacy, haptics, holdingsSet, appLock, fxSet] =
          await Promise.all([
            getUpdatePreferences(),
            getPrivacyMode(),
            getHapticsEnabled(),
            getHoldingsSettings(),
            getAppLockRecord(),
            getExchangeRatesSettings(),
          ]);
        if (cancelled) return;
        setUpdatePrefs(prefs);
        setPrivacyModeState(privacy);
        setHapticsState(haptics);
        setHapticsCache(haptics);
        setHoldingsSettings(holdingsSet);
        setFxSettings(fxSet);
        setAppLockEnabled(appLock !== null);
      } catch (error) {
        if (__DEV__) console.error("Failed to load profile settings:", error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Apply a currency change without touching stored amounts (relabel only). */
  const applyCurrencyPreference = useCallback(
    async (id: CurrencyPreferenceId) => {
      await setPreferenceId(id);
      onCurrencyApplied(id);
      setCurrencyPrompt(null);
      setShowCurrencyModal(false);
    },
    [onCurrencyApplied, setPreferenceId],
  );

  /**
   * Present the convert/relabel dialog for a pending change. iOS can't
   * present it while another Modal is still open - stacked modals silently
   * fail to appear (the same iOS quirk the import flows handle) - so the
   * caller closes whatever is open and this waits for the teardown. The
   * rate fetch (unpaired only - paired devices can't convert, see
   * handleCurrencyConvert) is kicked off first so it overlaps the teardown
   * delay rather than adding to it. getCurrentRates never throws (it falls
   * back to cache, then static).
   */
  const openCurrencyPrompt = useCallback(
    async (
      prompt: { id: CurrencyPreferenceId; fromLabel: string; toLabel: string },
      fetchRates: boolean,
    ) => {
      setCurrencyRates(null);
      const ratesPromise = fetchRates
        ? getCurrentRates({ forceRefresh: true })
        : null;
      setCurrencyRatesLoading(ratesPromise !== null);
      await waitForIosModalTeardown(350);
      setCurrencyPrompt(prompt);
      if (ratesPromise) {
        try {
          setCurrencyRates(await ratesPromise);
        } finally {
          setCurrencyRatesLoading(false);
        }
      }
    },
    [],
  );

  const handleCurrencySelect = useCallback(
    async (id: CurrencyPreferenceId) => {
      if (id === preference.id) {
        setShowCurrencyModal(false);
        return;
      }
      const target = getCurrencyPreferenceOption(id);
      // Same currency code (e.g. USD vs CAD both use "$") means the stored
      // numbers are already in the right unit - no conversion to offer.
      if (target.currencyCode === preference.currencyCode) {
        await applyCurrencyPreference(id);
        return;
      }
      setShowCurrencyModal(false);
      const prompt = {
        id,
        fromLabel: preference.currencyCode,
        toLabel: target.currencyCode,
      };
      if (pairing) {
        await openCurrencyPrompt(prompt, false);
        return;
      }
      // First live rate fetch on this device: show what leaves the phone
      // BEFORE the request goes out (rule 4). Once acknowledged, later
      // switches go straight to the prompt.
      if (!fxSettings.disclosureAcknowledged) {
        await waitForIosModalTeardown(350);
        setFxDisclosurePending(prompt);
        return;
      }
      await openCurrencyPrompt(prompt, true);
    },
    [
      applyCurrencyPreference,
      fxSettings.disclosureAcknowledged,
      openCurrencyPrompt,
      pairing,
      preference.currencyCode,
      preference.id,
    ],
  );

  /** User accepted the exchange-rate disclosure: persist it, then continue. */
  const confirmFxDisclosure = useCallback(async () => {
    const prompt = fxDisclosurePending;
    if (!prompt) return;
    setFxDisclosurePending(null);
    try {
      setFxSettings(await acknowledgeExchangeRatesDisclosure());
    } catch (error) {
      // The user said yes, so the fetch still goes ahead; a failed ack write
      // only means the disclosure shows again next time.
      if (__DEV__) {
        console.error("Failed to save exchange-rate disclosure:", error);
      }
    }
    await openCurrencyPrompt(prompt, true);
  }, [fxDisclosurePending, openCurrencyPrompt]);

  /** Convert every stored amount to the new currency, then switch to it. */
  const handleCurrencyConvert = useCallback(async () => {
    if (!currencyPrompt || pairing || !currencyRates) return;
    setCurrencyConverting(true);
    try {
      const toCode = getCurrencyPreferenceOption(
        currencyPrompt.id,
      ).currencyCode;
      await convertAllStoredData(
        preference.currencyCode,
        toCode,
        currencyRates.rates,
      );
      await setPreferenceId(currencyPrompt.id);
      onCurrencyApplied(currencyPrompt.id);
    } catch (error) {
      if (__DEV__) console.error("Currency conversion failed:", error);
    } finally {
      setCurrencyConverting(false);
      setCurrencyPrompt(null);
      setShowCurrencyModal(false);
    }
  }, [
    currencyPrompt,
    currencyRates,
    onCurrencyApplied,
    pairing,
    preference.currencyCode,
    setPreferenceId,
  ]);

  const extractUpdateMetadata = useCallback(
    (manifest: unknown): UpdateMetadata => {
      const data =
        manifest != null && typeof manifest === "object"
          ? (manifest as Record<string, unknown>)
          : {};
      const resolved = resolveUpdateInfo(manifest, CURRENT_APP_VERSION);

      return {
        id: typeof data.id === "string" ? data.id : "unknown",
        createdAt: resolved.createdAt,
        runtimeVersion: resolved.runtimeVersion,
        message: resolved.message,
        appVersion: resolved.appVersion,
      };
    },
    [],
  );

  const checkForUpdates = useCallback(
    async (source: "auto" | "manual") => {
      if (isCheckingUpdates) return;
      if (!canCheckUpdates) {
        if (source === "manual") {
          showInfo({
            title: t("profile.settings.updates.unavailableTitle"),
            message: t("profile.settings.updates.unavailableMessage"),
          });
        }
        return;
      }
      setIsCheckingUpdates(true);

      try {
        const checkedAt = new Date().toISOString();
        const checkResult = await Updates.checkForUpdateAsync();
        const prefs = await setLastUpdateCheckAt(checkedAt);
        setUpdatePrefs(prefs);

        if (!checkResult.isAvailable) {
          if (source === "manual") {
            showInfo({
              title: t("profile.settings.updates.upToDateTitle"),
              message: t("profile.settings.updates.upToDateMessage", {
                when: formatDateTime(checkedAt),
              }),
            });
          }
          return;
        }

        const fetchResult = await Updates.fetchUpdateAsync();
        const manifest =
          (fetchResult as Record<string, unknown>).manifest ||
          (checkResult as Record<string, unknown>).manifest ||
          null;
        const updateMeta = extractUpdateMetadata(manifest);

        const currentRuntime = Updates.runtimeVersion ?? undefined;
        if (!isUpdateSafe(currentRuntime, updateMeta.runtimeVersion)) {
          if (source === "manual") {
            showInfo({
              title: t("profile.settings.updates.rejectedTitle"),
              message: t("profile.settings.updates.rejectedMessage"),
            });
          }
          return;
        }

        setPendingUpdate(updateMeta);
      } catch (error: any) {
        if (source === "manual") {
          const raw = (error?.message || String(error) || "").trim();
          const lower = raw.toLowerCase();
          const networkHints = [
            "failed to check",
            "failed to download",
            "network",
            "timeout",
            "timed out",
            "offline",
            "resolve host",
            "unreachable",
            "connection",
            "internet",
            "enotfound",
            "econnrefused",
            "econnreset",
            "etimedout",
          ];
          const isNetworkError = networkHints.some((hint) =>
            lower.includes(hint),
          );
          const friendly = isNetworkError
            ? t("profile.settings.updates.failedNetwork")
            : t("profile.settings.updates.failedGeneric");
          showInfo({
            title: t("profile.settings.updates.failedTitle"),
            message: raw
              ? t("profile.settings.updates.failedDetails", { friendly, details: raw })
              : friendly,
          });
        }
      } finally {
        setIsCheckingUpdates(false);
      }
    },
    [canCheckUpdates, extractUpdateMetadata, isCheckingUpdates, showInfo, t],
  );

  const toggleManualMode = useCallback(async () => {
    const updated = await setManualUpdateMode(!updatePrefs.manualUpdateMode);
    setUpdatePrefs(updated);
    showInfo({
      title: t("profile.settings.updates.modeSavedTitle"),
      message: updated.manualUpdateMode
        ? t("profile.settings.updates.modeManualMessage")
        : t("profile.settings.updates.modeAutoMessage"),
    });
  }, [showInfo, t, updatePrefs.manualUpdateMode]);

  const toggleHaptics = useCallback(async () => {
    const next = !hapticsEnabled;
    await setHapticsEnabled(next);
    setHapticsCache(next);
    setHapticsState(next);
    if (next) {
      // Fire a short tick so the user can feel the change immediately.
      triggerHaptic("selection");
    }
  }, [hapticsEnabled]);

  /**
   * Toggle the Live Holdings feature. Turning it off is immediate. Turning it
   * on for the first time routes through the off-device disclosure; once that
   * has been acknowledged a later re-enable flips straight back on.
   */
  const toggleHoldings = useCallback(async () => {
    if (holdingsSettings.enabled) {
      const next = await setHoldingsEnabled(false);
      setHoldingsSettings(next);
      triggerHaptic("selection");
      return;
    }
    if (holdingsSettings.disclosureAcknowledged) {
      const next = await setHoldingsEnabled(true);
      setHoldingsSettings(next);
      triggerHaptic("selection");
    } else {
      setShowHoldingsDisclosure(true);
    }
  }, [holdingsSettings.disclosureAcknowledged, holdingsSettings.enabled]);

  const confirmEnableHoldings = useCallback(async () => {
    const next = await setHoldingsEnabled(true);
    setHoldingsSettings(next);
    setShowHoldingsDisclosure(false);
    triggerHaptic("success");
    showInfo({
      title: t("profile.settings.holdings.enabledTitle"),
      message: t("profile.settings.holdings.enabledMessage"),
    });
  }, [showInfo, t]);

  const closeAppLockSetup = useCallback(() => {
    setShowAppLockSetup(false);
    // Refresh the row with whatever the modal saved (on/off/changed).
    void getAppLockRecord().then((record) =>
      setAppLockEnabled(record !== null),
    );
  }, []);

  const togglePrivacyMode = useCallback(async () => {
    const next = !privacyMode;
    await setPrivacyMode(next);
    setPrivacyModeState(next);
    showInfo({
      title: next
        ? t("profile.settings.privacy.onTitle")
        : t("profile.settings.privacy.offTitle"),
      message: next
        ? t("profile.settings.privacy.onMessage")
        : t("profile.settings.privacy.offMessage"),
    });
  }, [privacyMode, showInfo, t]);

  const installPendingUpdate = useCallback(async () => {
    try {
      // Record whether this dialog actually resolved and showed the notes (same
      // match logic the modal uses). If it did, the post-reload bootstrap skips
      // the "what's new" prompt; if it only showed the version, the prompt still
      // runs after reload so the baked-in notes aren't lost. The auto-install
      // path in App.tsx records the same signal.
      const notesShown = !!(
        findReleaseNoteForVersion(pendingUpdate?.appVersion) ||
        findReleaseNoteForVersion(pendingUpdate?.message)
      );
      await setOtaUpdateInstalled(notesShown);
      setPendingUpdate(null);
      await Updates.reloadAsync();
    } catch (error: any) {
      showInfo({
        title: t("profile.settings.updates.installFailedTitle"),
        message:
          error?.message || t("profile.settings.updates.installFailedMessage"),
      });
    }
  }, [pendingUpdate, showInfo, t]);

  return (
    <>
      {/* ── Settings (privacy, updates) ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          {t("profile.settings.sectionTitle")}
        </Text>

        <View
          style={[
            styles.groupedCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => setShowCurrencyModal(true)}
          >
            <View>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.settings.currency.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {preference.label}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => {
              onDismissNewBadge("german-language");
              setShowLanguageModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t("profile.settings.language.a11yLabel", { current: languageName })}
            accessibilityHint={t("profile.settings.language.a11yHint")}
          >
            <View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  {t("profile.settings.language.label")}
                </Text>
                {newFeatureIds.has("german-language") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {languageName}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={togglePrivacyMode}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.settings.privacy.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {privacyMode
                  ? t("profile.settings.privacy.enabled")
                  : t("profile.settings.privacy.disabled")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {privacyMode ? t("common.on") : t("common.off")}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => setShowAppLockSetup(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.settings.appLock.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {appLockEnabled
                  ? t("profile.settings.appLock.enabled")
                  : t("profile.settings.appLock.disabled")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {appLockEnabled ? t("common.on") : t("common.off")}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity style={styles.groupedRow} onPress={toggleHoldings}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.settings.holdings.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {holdingsSettings.enabled
                  ? t("profile.settings.holdings.enabled")
                  : t("profile.settings.holdings.disabled")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {holdingsSettings.enabled ? t("common.on") : t("common.off")}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity style={styles.groupedRow} onPress={toggleHaptics}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.settings.haptics.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {hapticsEnabled
                  ? t("profile.settings.haptics.enabled")
                  : t("profile.settings.haptics.disabled")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {hapticsEnabled ? t("common.on") : t("common.off")}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => {
              onDismissNewBadge("tracking-reminders");
              onOpenTrackingReminders();
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.rowTitleWithBadge}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  {t("profile.settings.reminders.label")}
                </Text>
                {newFeatureIds.has("tracking-reminders") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {reminderRowSubtext(t, reminderSettings)}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {reminderSettings?.enabled ? t("common.on") : t("common.off")}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={[styles.groupedRow, isCheckingUpdates && { opacity: 0.7 }]}
            onPress={() => checkForUpdates("manual")}
            disabled={isCheckingUpdates}
          >
            <View>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.settings.updates.checkLabel")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {updatePrefs.lastCheckedAt
                  ? t("profile.settings.updates.lastChecked", {
                      when: formatDateTime(updatePrefs.lastCheckedAt),
                    })
                  : t("profile.settings.updates.neverChecked")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {isCheckingUpdates ? "..." : "→"}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={toggleManualMode}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.settings.updates.autoLabel")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {updatePrefs.manualUpdateMode
                  ? t("profile.settings.updates.autoOff")
                  : t("profile.settings.updates.autoOn")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {updatePrefs.manualUpdateMode ? t("common.off") : t("common.on")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Currency Selection Modal ── */}
      <OptionPickerModal
        visible={showCurrencyModal}
        title={t("profile.settings.currency.pickerTitle")}
        options={currencyOptions}
        keyOf={(option) => option.id}
        isSelected={(option) => option.id === preference.id}
        onSelect={(option) =>
          handleCurrencySelect(option.id as CurrencyPreferenceId)
        }
        onClose={() => setShowCurrencyModal(false)}
        accessibilityLabelOf={(option) => option.label}
        rowStyle={(option, selected) => ({
          backgroundColor: selected ? `${colors.accent}10` : "transparent",
        })}
        renderOption={(option) => (
          <View style={styles.currencyOptionTextWrap}>
            <Text style={[styles.themeOptionText, { color: colors.text }]}>
              {option.label}
            </Text>
            <Text
              style={[styles.settingsRowSubtext, { color: colors.textDim }]}
            >
              {new Intl.NumberFormat(option.locale, {
                style: "currency",
                currency: option.currencyCode,
              }).format(1234.56)}
            </Text>
          </View>
        )}
      />

      {/* ── Language Selection Modal ── */}
      <OptionPickerModal
        visible={showLanguageModal}
        title={t("profile.settings.language.pickerTitle")}
        options={languageOptions}
        keyOf={(option) => option.id}
        isSelected={(option) => languageId === option.id}
        onSelect={handleLanguageSelect}
        onClose={() => setShowLanguageModal(false)}
        accessibilityLabelOf={(option) => {
          const text = languageOptionText(option);
          return text.description ? `${text.name}. ${text.description}` : text.name;
        }}
        header={
          <Text
            style={[
              styles.settingsRowSubtext,
              { color: colors.textDim, marginBottom: 12 },
            ]}
          >
            {t("profile.settings.language.note")}
          </Text>
        }
        renderOption={(option) => {
          const text = languageOptionText(option);
          return (
            <View style={{ flex: 1 }}>
              <Text style={[styles.themeOptionText, { color: colors.text }]}>
                {text.name}
              </Text>
              {text.description ? (
                <Text
                  style={[
                    styles.settingsRowSubtext,
                    { color: colors.textDim, marginTop: 4 },
                  ]}
                >
                  {text.description}
                </Text>
              ) : null}
            </View>
          );
        }}
      />

      {/* ── Currency change: convert amounts or just relabel ── */}
      <Modal
        visible={!!currencyPrompt}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!currencyConverting) setCurrencyPrompt(null);
        }}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {t("profile.settings.currencyChange.title")}
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {pairing
                ? t("profile.settings.currencyChange.pairedMessage", {
                    to: currencyPrompt?.toLabel ?? "",
                  })
                : currencyRatesLoading
                  ? t("profile.settings.currencyChange.fetchingRate")
                  : t("profile.settings.currencyChange.convertQuestion", {
                      from: currencyPrompt?.fromLabel ?? "",
                      to: currencyPrompt?.toLabel ?? "",
                    })}
            </Text>

            {!pairing && !currencyRatesLoading && currencyRates && currencyPrompt
              ? (() => {
                  const { fromLabel: from, toLabel: to } = currencyPrompt;
                  const cross =
                    (currencyRates.rates[to] ?? 1) /
                    (currencyRates.rates[from] ?? 1);
                  const r = cross >= 100 ? cross.toFixed(2) : cross.toFixed(4);
                  const prefix =
                    currencyRates.source === "live"
                      ? t("profile.settings.currencyChange.rateToday")
                      : currencyRates.source === "cache"
                        ? t("profile.settings.currencyChange.rateCached", {
                            when: formatDateTime(currencyRates.fetchedAt),
                          })
                        : t("profile.settings.currencyChange.rateOffline");
                  return (
                    <Text style={[styles.dialogTip, { color: colors.text }]}>
                      {t("profile.settings.currencyChange.rateLine", {
                        prefix,
                        from,
                        rate: r,
                        to,
                      })}
                    </Text>
                  );
                })()
              : null}

            <View style={styles.dialogActions}>
              {!pairing && (
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                  disabled={
                    currencyConverting || currencyRatesLoading || !currencyRates
                  }
                  onPress={handleCurrencyConvert}
                >
                  {currencyConverting || currencyRatesLoading ? (
                    <ActivityIndicator color={colors.accentButtonText} />
                  ) : (
                    <Text
                      style={[styles.dialogBtnText, { color: colors.accentButtonText }]}
                    >
                      {t("profile.settings.currencyChange.convertButton")}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                disabled={currencyConverting}
                onPress={() => {
                  if (currencyPrompt)
                    void applyCurrencyPreference(currencyPrompt.id);
                }}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  {pairing
                    ? t("profile.settings.currencyChange.symbolOnlyPaired")
                    : t("profile.settings.currencyChange.symbolOnly")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                disabled={currencyConverting}
                onPress={() => setCurrencyPrompt(null)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.textDim }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Update Ready Modal ── */}
      <Modal
        visible={pendingUpdate !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPendingUpdate(null)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                maxHeight: "80%",
              },
            ]}
          >
            {(() => {
              const matchedRelease =
                findReleaseNoteForVersion(pendingUpdate?.appVersion) ||
                findReleaseNoteForVersion(pendingUpdate?.message);
              const updateVersion =
                matchedRelease?.version ?? pendingUpdate?.appVersion;

              return (
                <>
                  <Text style={[styles.dialogTitle, { color: colors.text }]}>
                    {t("profile.settings.updates.readyTitle")}
                  </Text>

                  {updateVersion ? (
                    <View
                      style={[
                        styles.updateVersionBadge,
                        { backgroundColor: `${colors.accent}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.updateVersionText,
                          { color: colors.accent },
                        ]}
                      >
                        v{updateVersion}
                      </Text>
                    </View>
                  ) : null}

                  {matchedRelease ? (
                    <>
                      <Text
                        style={[
                          styles.updateReleaseTitle,
                          { color: colors.text },
                        ]}
                      >
                        {matchedRelease.title}
                      </Text>
                      <ScrollView
                        style={styles.updateHighlightsList}
                        showsVerticalScrollIndicator={false}
                      >
                        {matchedRelease.highlights.map((item) => (
                          <Text
                            key={item}
                            style={[
                              styles.updateHighlight,
                              { color: colors.textDim },
                            ]}
                          >
                            {"•"} {item}
                          </Text>
                        ))}
                      </ScrollView>
                    </>
                  ) : (
                    <Text
                      style={[styles.dialogMessage, { color: colors.textDim }]}
                    >
                      {pendingUpdate?.message ||
                        t("profile.settings.updates.readyMessage")}
                    </Text>
                  )}

                  {pendingUpdate?.createdAt ? (
                    <Text
                      style={[styles.updateMeta, { color: colors.textMuted }]}
                    >
                      {t("profile.settings.updates.published", {
                        when: formatDateTime(pendingUpdate.createdAt),
                      })}
                    </Text>
                  ) : null}

                  <View style={styles.dialogActions}>
                    <TouchableOpacity
                      style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                      onPress={() => setPendingUpdate(null)}
                    >
                      <Text
                        style={[styles.dialogBtnText, { color: colors.text }]}
                      >
                        {t("profile.settings.updates.later")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dialogBtn,
                        { backgroundColor: colors.accent },
                      ]}
                      onPress={installPendingUpdate}
                    >
                      <Text
                        style={[styles.dialogBtnText, { color: colors.accentButtonText }]}
                      >
                        {t("profile.settings.updates.installNow")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Exchange-rate fetch disclosure (first currency switch) ── */}
      <Modal
        visible={!!fxDisclosurePending}
        animationType="fade"
        transparent
        onRequestClose={() => setFxDisclosurePending(null)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {exchangeRatesDisclosureTitle()}
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {exchangeRatesDisclosureIntro()}
            </Text>
            {exchangeRatesDisclosurePoints().map((point) => (
              <Text
                key={point}
                style={[
                  styles.dialogMessage,
                  { color: colors.textDim, textAlign: "left", marginBottom: 10 },
                ]}
              >
                • {point}
              </Text>
            ))}
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setFxDisclosurePending(null)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  {t("profile.settings.notNow")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={confirmFxDisclosure}
              >
                <Text style={[styles.dialogBtnText, { color: colors.accentButtonText }]}>
                  {t("common.continue")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Live Holdings off-device disclosure ── */}
      <Modal
        visible={showHoldingsDisclosure}
        animationType="fade"
        transparent
        onRequestClose={() => setShowHoldingsDisclosure(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {holdingsDisclosureTitle()}
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {holdingsDisclosureIntro()}
            </Text>
            {holdingsDisclosurePoints().map((point) => (
              <Text
                key={point}
                style={[
                  styles.dialogMessage,
                  { color: colors.textDim, textAlign: "left", marginBottom: 10 },
                ]}
              >
                • {point}
              </Text>
            ))}
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setShowHoldingsDisclosure(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  {t("profile.settings.notNow")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={confirmEnableHoldings}
              >
                <Text style={[styles.dialogBtnText, { color: colors.accentButtonText }]}>
                  {t("profile.settings.holdings.enable")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── App Lock (PIN) set/change/disable Modal ── */}
      {showAppLockSetup ? (
        <AppLockSetupModal onClose={closeAppLockSetup} showInfo={showInfo} />
      ) : null}

      {/* ── Tracking Reminders Modal ── */}
      {showTrackingReminders ? (
        <TrackingRemindersModal onClose={onCloseTrackingReminders} />
      ) : null}
    </>
  );
});

SettingsSection.displayName = "SettingsSection";

export default SettingsSection;
