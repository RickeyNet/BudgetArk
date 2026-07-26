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
 * clears reminders - so those arrive as props.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as Updates from "expo-updates";
import type {
  CurrencyPreferenceId,
  UpdatePreferences,
  HoldingsSettings,
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
  HOLDINGS_DISCLOSURE_TITLE,
  HOLDINGS_DISCLOSURE_INTRO,
  HOLDINGS_DISCLOSURE_POINTS,
} from "../../data/holdingsDisclosure";
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
  settings: TrackingReminderSettings | null
): string => {
  if (!settings?.enabled) {
    return "Nudges to log spending & plan each month";
  }
  const cadence =
    settings.cadenceDays === 1
      ? "After a quiet day"
      : settings.cadenceDays === 7
        ? "After a quiet week"
        : `After ${settings.cadenceDays} quiet days`;
  const what =
    settings.checkInsEnabled && settings.monthStartEnabled
      ? "Check-ins & month-start planning"
      : settings.checkInsEnabled
        ? cadence
        : settings.monthStartEnabled
          ? "Month-start planning"
          : "Nothing selected";
  const when =
    settings.hour === 9
      ? "mornings"
      : settings.hour === 13
        ? "afternoons"
        : "evenings";
  return `${what} · ${when}`;
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

const SettingsSection: React.FC<SettingsSectionProps> = ({
  pairing,
  showInfo,
  onCurrencyApplied,
  newFeatureIds,
  onDismissNewBadge,
  reminderSettings,
  showTrackingReminders,
  onOpenTrackingReminders,
  onCloseTrackingReminders,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens);
  const {
    preference,
    options: currencyOptions,
    setPreferenceId,
  } = useCurrency();

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

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

  /** Haptic feedback toggle */
  const [hapticsEnabled, setHapticsState] = useState(true);

  /** Live Holdings opt-in (off by default) + its first-enable disclosure. */
  const [holdingsSettings, setHoldingsSettings] = useState<HoldingsSettings>({
    enabled: false,
    disclosureAcknowledged: false,
  });
  const [showHoldingsDisclosure, setShowHoldingsDisclosure] = useState(false);

  /** Load persisted settings on mount */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [prefs, privacy, haptics, holdingsSet, appLock] =
          await Promise.all([
            getUpdatePreferences(),
            getPrivacyMode(),
            getHapticsEnabled(),
            getHoldingsSettings(),
            getAppLockRecord(),
          ]);
        if (cancelled) return;
        setUpdatePrefs(prefs);
        setPrivacyModeState(privacy);
        setHapticsState(haptics);
        setHapticsCache(haptics);
        setHoldingsSettings(holdingsSet);
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
      // iOS can't present the convert dialog while the picker Modal is still
      // open - stacked modals silently fail to appear (the same iOS quirk the
      // import flows handle). Close the picker, wait for it to tear down, then
      // show the prompt. The rate fetch is kicked off first so it overlaps the
      // teardown delay rather than adding to it. Paired devices can't convert
      // (see handleCurrencyConvert), so only the unpaired path needs a rate;
      // getCurrentRates never throws (it falls back to cache, then static).
      setShowCurrencyModal(false);
      setCurrencyRates(null);
      const ratesPromise = pairing
        ? null
        : getCurrentRates({ forceRefresh: true });
      setCurrencyRatesLoading(ratesPromise !== null);
      await waitForIosModalTeardown(350);
      setCurrencyPrompt({
        id,
        fromLabel: preference.currencyCode,
        toLabel: target.currencyCode,
      });
      if (ratesPromise) {
        try {
          setCurrencyRates(await ratesPromise);
        } finally {
          setCurrencyRatesLoading(false);
        }
      }
    },
    [applyCurrencyPreference, pairing, preference.currencyCode, preference.id],
  );

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
            title: "Updates Unavailable",
            message:
              "Update checks are unavailable in development builds. Install an EAS preview/production build to use this feature.",
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
              title: "Up to Date",
              message: `No update is currently available. Last checked ${formatDateTime(checkedAt)}.`,
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
              title: "Update Rejected",
              message:
                "This update was rejected because it targets an older runtime version. This may indicate a rollback attempt.",
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
            ? "Could not reach the update server. Check your internet connection and try again."
            : "Unable to check for updates right now. Please try again shortly.";
          showInfo({
            title: "Update Check Failed",
            message: raw ? `${friendly}\n\nDetails: ${raw}` : friendly,
          });
        }
      } finally {
        setIsCheckingUpdates(false);
      }
    },
    [canCheckUpdates, extractUpdateMetadata, isCheckingUpdates, showInfo],
  );

  const toggleManualMode = useCallback(async () => {
    const updated = await setManualUpdateMode(!updatePrefs.manualUpdateMode);
    setUpdatePrefs(updated);
    showInfo({
      title: "Update Mode Saved",
      message: updated.manualUpdateMode
        ? "Manual mode is on. The app will only check for updates when you tap Check for Updates."
        : "Automatic update checks are enabled.",
    });
  }, [showInfo, updatePrefs.manualUpdateMode]);

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
      title: "Live Holdings On",
      message:
        "Add stocks and ETFs from the Bridge tab. Prices refresh about once a day.",
    });
  }, [showInfo]);

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
      title: next ? "Privacy Mode On" : "Privacy Mode Off",
      message: next
        ? "Screenshots and screen recording are now blocked."
        : "Screenshot and screen recording protection is disabled.",
    });
  }, [privacyMode, showInfo]);

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
        title: "Install Failed",
        message:
          error?.message ||
          "The update could not be applied right now. Please try again.",
      });
    }
  }, [pendingUpdate, showInfo]);

  return (
    <>
      {/* ── Settings (privacy, updates) ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          SETTINGS
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
                Currency
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
            onPress={togglePrivacyMode}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                Privacy Mode
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {privacyMode
                  ? "Screenshots & screen recording blocked"
                  : "Screenshots & screen recording allowed"}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {privacyMode ? "On" : "Off"}
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
                App Lock
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {appLockEnabled
                  ? "PIN required when the app opens"
                  : "Ask for a PIN when the app opens"}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {appLockEnabled ? "On" : "Off"}
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
                Live Holdings
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {holdingsSettings.enabled
                  ? "Tracking stocks & ETFs in your net worth"
                  : "Track stocks & ETFs in your net worth"}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {holdingsSettings.enabled ? "On" : "Off"}
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
                Haptic Feedback
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {hapticsEnabled
                  ? "Subtle vibrations on key actions"
                  : "Vibrations disabled"}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {hapticsEnabled ? "On" : "Off"}
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
                  Tracking Reminders
                </Text>
                {newFeatureIds.has("tracking-reminders") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {reminderRowSubtext(reminderSettings)}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {reminderSettings?.enabled ? "On" : "Off"}
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
                Check for Updates
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {updatePrefs.lastCheckedAt
                  ? `Last checked ${formatDateTime(updatePrefs.lastCheckedAt)}`
                  : "Never checked"}
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
                Auto Updates
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {updatePrefs.manualUpdateMode
                  ? "Off - manual checks only"
                  : "On - checks automatically"}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {updatePrefs.manualUpdateMode ? "Off" : "On"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Currency Selection Modal ── */}
      <OptionPickerModal
        visible={showCurrencyModal}
        title="Currency & Locale"
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
              Change currency
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {pairing
                ? `Switching to ${currencyPrompt?.toLabel} changes the currency symbol, but your amounts stay the same numbers. Your data is synced with a paired partner, so amounts can't be converted automatically - unpair first if you want to convert them.`
                : currencyRatesLoading
                  ? "Fetching today's exchange rate..."
                  : `Convert your existing amounts from ${currencyPrompt?.fromLabel} to ${currencyPrompt?.toLabel} at the rate below, or just change the symbol and keep the same numbers?`}
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
                      ? "Today's rate"
                      : currencyRates.source === "cache"
                        ? `Rates from ${formatDateTime(currencyRates.fetchedAt)} (couldn't reach live rates)`
                        : "Offline - using a built-in estimate";
                  return (
                    <Text style={[styles.dialogTip, { color: colors.text }]}>
                      {`${prefix}: 1 ${from} = ${r} ${to}`}
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
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text
                      style={[styles.dialogBtnText, { color: colors.white }]}
                    >
                      Convert my amounts
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
                  {pairing ? "Change symbol only" : "Just change the symbol"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                disabled={currencyConverting}
                onPress={() => setCurrencyPrompt(null)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.textDim }]}>
                  Cancel
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
                    Update Ready
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
                        "A new update is ready to install."}
                    </Text>
                  )}

                  {pendingUpdate?.createdAt ? (
                    <Text
                      style={[styles.updateMeta, { color: colors.textMuted }]}
                    >
                      Published {formatDateTime(pendingUpdate.createdAt)}
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
                        Later
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
                        style={[styles.dialogBtnText, { color: colors.white }]}
                      >
                        Install Now
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
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
              {HOLDINGS_DISCLOSURE_TITLE}
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {HOLDINGS_DISCLOSURE_INTRO}
            </Text>
            {HOLDINGS_DISCLOSURE_POINTS.map((point) => (
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
                  Not now
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={confirmEnableHoldings}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Enable
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
};

export default SettingsSection;
