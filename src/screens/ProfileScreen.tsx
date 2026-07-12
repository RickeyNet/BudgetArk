/**
 * BudgetArk - Profile Screen
 * File: src/screens/ProfileScreen.tsx
 *
 * Displays the anonymous user's profile and app settings.
 * Features:
 * - Shows the auto-generated anonymous user ID (truncated)
 * - Editable display name
 * - Theme selection in settings
 * - Data management (export, reset)
 * - App info and version
 *
 * Privacy-first design:
 * - No email, phone, or personal data is collected
 * - User ID is a random UUID shown only for reference
 * - All data is stored locally on the device
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  InteractionManager,
  KeyboardAvoidingView,
  Linking,
  Platform,
} from "react-native";
import * as Updates from "expo-updates";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  CurrencyPreferenceId,
  DEFAULT_CURRENCY_PREFERENCE_ID,
  RootTabParamList,
  UserAccount,
} from "../types";
import {
  CURRENT_APP_VERSION,
  RELEASE_NOTES,
  type ReleaseNote,
} from "../data/releaseNotes";
import { MISSION_STATEMENT } from "../data/missionStatement";
import {
  getOrCreateUser,
  updateDisplayName,
  deleteAccount,
  completeOnboarding,
} from "../storage/userStorage";
import { clearAllData } from "../storage/debtStorage";
import { buildExportMessage, shareExportMessage } from "../utils/exportData";
import { recordExport } from "../storage/achievementStatsStorage";
import { useAchievements } from "../achievements/AchievementsProvider";
import AchievementsScreen from "./AchievementsScreen";
import ManageCategoriesModal from "../components/ManageCategoriesModal";
import { useCustomCategories } from "../categories/CustomCategoriesProvider";
import {
  importData,
  importFromString,
  type ImportResult,
} from "../utils/importData";
import {
  exportSpreadsheet,
  type SpreadsheetFormat,
} from "../utils/spreadsheetExport";
import { waitForIosModalTeardown } from "../utils/iosNativeShare";
import { importSpreadsheet } from "../utils/spreadsheetImport";
import {
  getUpdatePreferences,
  setLastUpdateCheckAt,
  setManualUpdateMode,
} from "../storage/updatePreferencesStorage";
import { setOtaUpdateInstalled } from "../storage/releaseNotesStorage";
import {
  getBackupReminderState,
  dismissBackupReminder,
  shouldShowBackupReminder,
  type BackupReminderState,
} from "../storage/backupReminderStorage";
import { useTheme } from "../theme/ThemeProvider";
import { useBackgroundEffects } from "../theme/BackgroundEffectsProvider";
import { useSurfaceStyle } from "../theme/SurfaceStyleProvider";
import { useDensity } from "../theme/DensityProvider";
import type { DensityTokens } from "../theme/density";
import { useTabCoachmark } from "../onboarding/useTabCoachmark";
import { useCoachmarks } from "../onboarding/CoachmarksProvider";
import { useCoachmarkAnchor } from "../onboarding/CoachmarkAnchorContext";
import { COACHMARK_TAB_IDS, COACHMARKS } from "../data/coachmarkContent";
import type { UpdatePreferences , HoldingsSettings , AssetAccount } from "../types";
import { useCurrency } from "../currency/CurrencyProvider";
import { getCurrencyPreferenceOption } from "../utils/currencyPreferences";
import { convertAllStoredData } from "../utils/currencyMigration";
import { getCurrentRates, type RatesSnapshot } from "../utils/exchangeRates";
import { isUpdateSafe } from "../utils/versionGuard";
import {
  resolveUpdateInfo,
  findReleaseNoteForVersion,
} from "../utils/updateReleaseNotes";
import { getPrivacyMode, setPrivacyMode } from "../storage/privacyStorage";
import {
  getPairingState,
  clearPairingState,
  getSyncMetadata,
  updateHomeSSID,
  setAutoSyncEnabled,
} from "../sync/pairingStorage";
import { syncNow } from "../sync/syncOrchestrator";
import {
  getCurrentSSID,
  startMonitoring,
  stopMonitoring,
  requestLocationPermission,
} from "../sync/autoSyncManager";
import type { PairingState, SyncStatus } from "../sync/types";
import PairingModal from "../components/PairingModal";
import FeedbackModal from "../components/FeedbackModal";
import TipJarModal from "../components/TipJarModal";
import { KeyboardAwareModalOverlay } from "../components/KeyboardAwareModalOverlay";
import SpreadsheetSchemaModal from "../components/SpreadsheetSchemaModal";
import { triggerHaptic, setHapticsCache } from "../utils/haptics";
import {
  getHapticsEnabled,
  setHapticsEnabled,
} from "../storage/hapticsStorage";
import {
  getHoldingsSettings,
  setHoldingsEnabled,
} from "../storage/holdingsSettingsStorage";
import TrackingRemindersModal from "../components/TrackingRemindersModal";
import { getTrackingReminderSettings } from "../storage/trackingReminderSettingsStorage";
import { cancelAllTrackingReminders } from "../notifications/trackingReminders";
import type { TrackingReminderSettings } from "../utils/trackingReminderPlanner";

import {
  HOLDINGS_DISCLOSURE_TITLE,
  HOLDINGS_DISCLOSURE_INTRO,
  HOLDINGS_DISCLOSURE_POINTS,
} from "../data/holdingsDisclosure";
import {
  CONNECTIONS_DISCLOSURE_TITLE,
  CONNECTIONS_DISCLOSURE_INTRO,
  CONNECTIONS_DISCLOSURE_POINTS,
} from "../data/connectionsDisclosure";
import {
  getConnectionsSettings,
  acknowledgeConnectionsDisclosure,
} from "../storage/connectionsSettingsStorage";
import { useConnections } from "../connections/ConnectionsProvider";
import ConnectionsModal from "../components/ConnectionsModal";
import AddConnectionModal from "../components/AddConnectionModal";
import { startConnectionsMonitoring } from "../services/connections/connectionsSyncService";
import { getTellerAddBankInfo } from "../services/connections/connectionsService";
import { getAssetAccounts } from "../storage/assetAccountStorage";


import { sanitizeTextInput } from "../utils/sanitize";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_BASE_HEIGHT } from "../navigation/tabBarLayout";

type UpdateMetadata = {
  id: string;
  message: string;
  createdAt?: string;
  runtimeVersion?: string;
  appVersion?: string;
};

type ReleaseNoteKey = string;

/** Settings-row subtext summarizing the current check-in reminder setup. */
const reminderRowSubtext = (
  settings: TrackingReminderSettings | null
): string => {
  if (!settings?.enabled) {
    return "Nudge me to log my spending";
  }
  const cadence =
    settings.cadenceDays === 1
      ? "After a quiet day"
      : settings.cadenceDays === 7
        ? "After a quiet week"
        : `After ${settings.cadenceDays} quiet days`;
  const when =
    settings.hour === 9
      ? "mornings"
      : settings.hour === 13
        ? "afternoons"
        : "evenings";
  return `${cadence} · ${when}`;
};

const ProfileScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootTabParamList, "Profile">>();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const insets = useSafeAreaInsets();

  /** Current theme context */
  const {
    colors,
    presets,
    themeId,
    surfaceStyleId,
    showAmbientBackground,
    setThemeId,
  } = useTheme();
  const { backgroundEffectsEnabled, setBackgroundEffectsEnabled } =
    useBackgroundEffects();
  const {
    surfaceStyleId: storedSurfaceStyleId,
    presets: surfaceStylePresets,
    setSurfaceStyleId,
  } = useSurfaceStyle();
  const {
    densityId,
    tokens,
    presets: densityPresets,
    setDensityId,
    textSizeId,
    textSizePresets,
    setTextSizeId,
  } = useDensity();
  const coachmark = useTabCoachmark("Profile");
  const { replay: replayCoachmarks, startGuidedTour } = useCoachmarks();
  const scrollRef = useRef<ScrollView>(null);
  const spreadsheetExportInFlightRef = useRef(false);
  const spreadsheetExportOpIdRef = useRef(0);
  // Guards both file and spreadsheet import handlers: a double-tap on the
  // merge/replace button during the modal-dismiss window would otherwise
  // fire the document picker twice and trip expo-document-picker's
  // "Different document picking in progress" lock-up. One shared ref also
  // stops launching the spreadsheet picker while the file picker is still
  // open (or vice versa).
  const importPickerInFlightRef = useRef(false);
  const anchorAppearance = useCoachmarkAnchor("profile-appearance-card", {
    scrollRef,
  });
  const anchorHelp = useCoachmarkAnchor("profile-help-card", { scrollRef });
  const styles = React.useMemo(() => makeStyles(tokens), [tokens]);
  const {
    preference,
    options: currencyOptions,
    setPreferenceId,
  } = useCurrency();

  const {
    unlocked: achievementUnlocked,
    totalCount: totalAchievements,
    runCheck: refreshAchievements,
  } = useAchievements();

  /** Whether the Ship's Log (achievements) screen is visible */
  const [showAchievements, setShowAchievements] = useState(false);

  /** Whether the mission statement body is expanded */
  const [missionExpanded, setMissionExpanded] = useState(false);

  const { customCategories, refresh: refreshCustomCategories } =
    useCustomCategories();
  /** Whether the manage-custom-categories modal is visible */
  const [showManageCategories, setShowManageCategories] = useState(false);

  /** Current user account state */
  const [user, setUser] = useState<UserAccount | null>(null);

  /** Editable display name (local state before saving) */
  const [editName, setEditName] = useState("");

  /** Whether the name input is in edit mode */
  const [isEditing, setIsEditing] = useState(false);

  /** Whether theme selector modal is visible */
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSurfaceStyleModal, setShowSurfaceStyleModal] = useState(false);
  const [showDensityModal, setShowDensityModal] = useState(false);
  const [showTextSizeModal, setShowTextSizeModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  /** Whether the paste-import modal is visible */
  const [showPasteModal, setShowPasteModal] = useState(false);

  /** Raw JSON text entered in the paste-import modal */
  const [pasteText, setPasteText] = useState("");

  /** Export confirmation modal state */
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportEncrypt, setExportEncrypt] = useState(true);
  const [exportPassword, setExportPassword] = useState("");
  /**
   * True while an export is generating/sharing. Drives a blocking spinner
   * overlay. Encrypted export runs 250k PBKDF2 rounds in pure JS on the JS
   * thread, freezing the UI for several seconds on real devices; without
   * feedback the app looks hung, users walk away, and the phone auto-locks
   * mid-export. The ActivityIndicator animates on the native thread so it
   * keeps spinning even while JS is blocked.
   */
  const [isExporting, setIsExporting] = useState(false);

  /** Import password modal state (for encrypted exports) */
  const [showImportPasswordModal, setShowImportPasswordModal] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  // Stored as plain data (not a retry closure) so `executeImport` doesn't
  // have to reference itself inside its own useCallback - a self-capture the
  // React Compiler can't order and therefore refuses to optimize.
  const [pendingImport, setPendingImport] = useState<{
    importFn: (password?: string) => Promise<ImportResult | null>;
    label: string;
  } | null>(null);

  /** Whether the reset confirmation modal is visible */
  const [showResetModal, setShowResetModal] = useState(false);

  /** Whether the import source-choice modal is visible */
  const [showImportModal, setShowImportModal] = useState(false);

  /** Whether the import merge/replace modal is visible (file path) */
  const [showImportModeModal, setShowImportModeModal] = useState(false);

  /** Spreadsheet export format-picker modal */
  const [showSpreadsheetExportModal, setShowSpreadsheetExportModal] =
    useState(false);

  /** Spreadsheet import merge/replace modal */
  const [showSpreadsheetImportModal, setShowSpreadsheetImportModal] =
    useState(false);

  /** Spreadsheet format reference modal (shared by import and export flows) */
  const [showSpreadsheetSchemaModal, setShowSpreadsheetSchemaModal] =
    useState(false);

  /** @deprecated How-to docs removed in v1.2.0 - help text moved inline */

  /** Release notes modal and accordion state */
  const [showReleaseNotesModal, setShowReleaseNotesModal] = useState(false);
  const [expandedReleaseNote, setExpandedReleaseNote] =
    useState<ReleaseNoteKey | null>(RELEASE_NOTES[0]?.version || null);

  /** How-To reference modal */
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [expandedHowTo, setExpandedHowTo] = useState<string | null>(null);

  /** Generic themed info/alert modal (replaces all Alert.alert) */
  const [infoModal, setInfoModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

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
  const [currencyRates, setCurrencyRates] = useState<RatesSnapshot | null>(null);
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

  /** Haptic feedback toggle */
  const [hapticsEnabled, setHapticsState] = useState(true);

  /** Live Holdings opt-in (off by default) + its first-enable disclosure. */
  const [holdingsSettings, setHoldingsSettings] = useState<HoldingsSettings>({
    enabled: false,
    disclosureAcknowledged: false,
  });
  const [showHoldingsDisclosure, setShowHoldingsDisclosure] = useState(false);

  /** Bank Connections (BYO API): modals + first-use disclosure. */
  const {
    connections,
    pendingCount,
    needsAttention,
    refresh: refreshConnections,
    syncNow: syncConnectionsNow,
  } = useConnections();
  const [connectionsDisclosureAcked, setConnectionsDisclosureAcked] =
    useState(false);
  const [showConnectionsDisclosure, setShowConnectionsDisclosure] =
    useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [wizardAssetAccounts, setWizardAssetAccounts] = useState<
    AssetAccount[]
  >([]);
  /** Set when the wizard is opened in "add another bank" mode for a Teller connection. */
  const [addBankInfo, setAddBankInfo] = useState<{
    connectionId: string;
    applicationId: string;
    environment: "sandbox" | "development" | "production";
  } | null>(null);

  /** Partner sync state */
  const [pairing, setPairing] = useState<PairingState | null>(null);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  /** Tip Jar sheet - mounted only while open so the store connection
   *  (expo-iap) is established on demand, not at app start. */
  const [showTipJar, setShowTipJar] = useState(false);

  /** Expense-tracking check-in settings (row subtext + sheet). */
  const [showTrackingReminders, setShowTrackingReminders] = useState(false);
  const [reminderSettings, setReminderSettings] =
    useState<TrackingReminderSettings | null>(null);

  /** Backup reminder banner state */
  const [backupState, setBackupState] = useState<BackupReminderState>({});

  const refreshBackupState = useCallback(async () => {
    const state = await getBackupReminderState();
    setBackupState(state);
  }, []);

  /**
   * True while the auto-sync NetInfo/AppState monitor is registered.
   * Component-level (not effect-local) because BOTH the mount effect and
   * the auto-sync toggle can start monitoring - the unmount cleanup must
   * stop it regardless of which path started it, or the listener (and its
   * setLastSyncTime against a torn-down component) leaks.
   */
  const monitoringActiveRef = useRef(false);

  /** Load user on mount */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [u, prefs, privacy, haptics, holdingsSet, pairState, syncMeta, backup, reminders] =
          await Promise.all([
            getOrCreateUser(),
            getUpdatePreferences(),
            getPrivacyMode(),
            getHapticsEnabled(),
            getHoldingsSettings(),
            getPairingState(),
            getSyncMetadata(),
            getBackupReminderState(),
            getTrackingReminderSettings(),
          ]);
        if (cancelled) return;
        setUser(u);
        setEditName(u.displayName);
        setUpdatePrefs(prefs);
        setPrivacyModeState(privacy);
        setHapticsState(haptics);
        setHapticsCache(haptics);
        setHoldingsSettings(holdingsSet);
        setReminderSettings(reminders);
        setPairing(pairState);
        setLastSyncTime(syncMeta.lastSyncTimestamp);
        setBackupState(backup);
        if (pairState?.autoSyncEnabled) {
          startMonitoring((result) => {
            if (result.success) {
              setLastSyncTime(result.timestamp);
            }
          });
          monitoringActiveRef.current = true;
        }
      } catch (error) {
        if (__DEV__) console.error("Failed to load profile:", error);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (monitoringActiveRef.current) {
        stopMonitoring();
        monitoringActiveRef.current = false;
      }
    };
  }, []);

  // "What's new" deep-link navigates here with openReleaseNotes set.
  // Deferred past the tab-switch transition: presenting a Modal
  // mid-navigation is the iOS silent-present failure this codebase keeps
  // hitting, and it also keeps the setState out of the effect's synchronous
  // body.
  useEffect(() => {
    if (!route.params?.openReleaseNotes) return;
    const task = InteractionManager.runAfterInteractions(() => {
      setShowReleaseNotesModal(true);
      navigation.setParams({ openReleaseNotes: undefined });
    });
    return () => task.cancel();
  }, [navigation, route.params?.openReleaseNotes]);

  /**
   * Saves the updated display name to storage.
   * Trims whitespace and falls back to "Buddy" if empty.
   */
  const handleSaveName = useCallback(async () => {
    const updated = await updateDisplayName(editName);
    setUser(updated);
    setIsEditing(false);
  }, [editName]);

  /**
   * Handle theme selection
   */
  const handleThemeSelect = useCallback(
    async (id: string) => {
      await setThemeId(id);
    },
    [setThemeId],
  );

  const handleSurfaceStyleSelect = useCallback(
    async (id: "solid" | "glass") => {
      await setSurfaceStyleId(id);
    },
    [setSurfaceStyleId],
  );

  const handleToggleBackgroundEffects = useCallback(async () => {
    await setBackgroundEffectsEnabled(!backgroundEffectsEnabled);
  }, [backgroundEffectsEnabled, setBackgroundEffectsEnabled]);

  const handleDensitySelect = useCallback(
    async (id: string) => {
      await setDensityId(id);
    },
    [setDensityId],
  );

  const handleTextSizeSelect = useCallback(
    async (id: string) => {
      await setTextSizeId(id);
    },
    [setTextSizeId],
  );

  /** Apply a currency change without touching stored amounts (relabel only). */
  const applyCurrencyPreference = useCallback(
    async (id: CurrencyPreferenceId) => {
      await setPreferenceId(id);
      setUser((current) =>
        current ? { ...current, currencyPreferenceId: id } : current,
      );
      setCurrencyPrompt(null);
      setShowCurrencyModal(false);
    },
    [setPreferenceId],
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
      const toCode = getCurrencyPreferenceOption(currencyPrompt.id).currencyCode;
      await convertAllStoredData(
        preference.currencyCode,
        toCode,
        currencyRates.rates,
      );
      await setPreferenceId(currencyPrompt.id);
      setUser((current) =>
        current
          ? { ...current, currencyPreferenceId: currencyPrompt.id }
          : current,
      );
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
    pairing,
    preference.currencyCode,
    setPreferenceId,
  ]);

  const formatDateTime = useCallback((iso?: string) => {
    if (!iso) return "Unknown";
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) return "Unknown";
    return new Date(parsed).toLocaleString();
  }, []);

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
          setInfoModal({
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
            setInfoModal({
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
            setInfoModal({
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
          setInfoModal({
            title: "Update Check Failed",
            message: raw ? `${friendly}\n\nDetails: ${raw}` : friendly,
          });
        }
      } finally {
        setIsCheckingUpdates(false);
      }
    },
    [canCheckUpdates, extractUpdateMetadata, formatDateTime, isCheckingUpdates],
  );

  const toggleManualMode = useCallback(async () => {
    const updated = await setManualUpdateMode(!updatePrefs.manualUpdateMode);
    setUpdatePrefs(updated);
    setInfoModal({
      title: "Update Mode Saved",
      message: updated.manualUpdateMode
        ? "Manual mode is on. The app will only check for updates when you tap Check for Updates."
        : "Automatic update checks are enabled.",
    });
  }, [updatePrefs.manualUpdateMode]);

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
    setInfoModal({
      title: "Live Holdings On",
      message:
        "Add stocks and ETFs from the Bridge tab. Prices refresh about once a day.",
    });
  }, []);

  /* ── Bank Connections handlers ── */

  useEffect(() => {
    void getConnectionsSettings().then((settings) =>
      setConnectionsDisclosureAcked(settings.disclosureAcknowledged),
    );
    // Foreground auto-sync trigger for bank connections (idempotent; the
    // service enforces per-connection cooldowns, so this is cheap).
    startConnectionsMonitoring();
  }, []);

  const openConnections = useCallback(() => {
    if (connectionsDisclosureAcked) {
      setShowConnectionsModal(true);
    } else {
      setShowConnectionsDisclosure(true);
    }
  }, [connectionsDisclosureAcked]);

  const confirmConnectionsDisclosure = useCallback(async () => {
    await acknowledgeConnectionsDisclosure();
    setConnectionsDisclosureAcked(true);
    setShowConnectionsDisclosure(false);
    setShowConnectionsModal(true);
    triggerHaptic("success");
  }, []);

  const openAddConnection = useCallback(async () => {
    setAddBankInfo(null);
    setWizardAssetAccounts(await getAssetAccounts());
    setShowAddConnection(true);
  }, []);

  const openAddBank = useCallback(async (connectionId: string) => {
    const info = await getTellerAddBankInfo(connectionId);
    if (!info) return;
    setWizardAssetAccounts(await getAssetAccounts());
    setAddBankInfo({ connectionId, ...info });
    setShowAddConnection(true);
  }, []);

  const handleConnectionComplete = useCallback(
    (connectionId: string) => {
      setShowAddConnection(false);
      setAddBankInfo(null);
      // Populate the Review Inbox right away; failures surface as the
      // connection's status in the manage list.
      void syncConnectionsNow(connectionId);
    },
    [syncConnectionsNow],
  );

  const togglePrivacyMode = useCallback(async () => {
    const next = !privacyMode;
    await setPrivacyMode(next);
    setPrivacyModeState(next);
    setInfoModal({
      title: next ? "Privacy Mode On" : "Privacy Mode Off",
      message: next
        ? "Screenshots and screen recording are now blocked."
        : "Screenshot and screen recording protection is disabled.",
    });
  }, [privacyMode]);

  /* ─── Partner Sync Handlers ─── */

  const handlePaired = useCallback((state: PairingState) => {
    setPairing(state);
    setShowPairingModal(false);
    setInfoModal({
      title: "Paired!",
      message: `You're now paired with ${state.partnerName}. Tap "Sync Now" anytime to share data.`,
    });
  }, []);

  const handleSyncNow = useCallback(async () => {
    if (
      syncStatus === "syncing" ||
      syncStatus === "discovering" ||
      syncStatus === "connecting"
    )
      return;
    try {
      const result = await syncNow((status) => setSyncStatus(status));
      if (result.success) {
        setLastSyncTime(result.timestamp);
        setInfoModal({
          title: "Sync Complete",
          message: `Sent ${result.recordsSent} records, received ${result.recordsReceived} records.`,
        });
      } else {
        setInfoModal({
          title: "Sync Failed",
          message: result.error || "Could not connect to partner.",
        });
      }
    } catch {
      setSyncStatus("error");
    }
    setSyncStatus("idle");
  }, [syncStatus]);

  const handleUnpair = useCallback(async () => {
    await clearPairingState();
    stopMonitoring();
    monitoringActiveRef.current = false;
    setPairing(null);
    setLastSyncTime(null);
    setShowUnpairConfirm(false);
    setInfoModal({
      title: "Unpaired",
      message:
        "Partner sync has been disconnected. Your data is still on this device.",
    });
  }, []);

  const handleSetHomeNetwork = useCallback(async () => {
    if (Platform.OS === "android") {
      const granted = await requestLocationPermission();
      if (!granted) {
        setInfoModal({
          title: "Permission Required",
          message:
            "Location permission is needed to read the WiFi network name for auto-sync. Your location is never stored or shared.",
        });
        return;
      }
    }
    const ssid = await getCurrentSSID();
    if (!ssid) {
      setInfoModal({
        title: "No WiFi Detected",
        message:
          Platform.OS === "ios"
            ? 'Unable to read your WiFi network name. Make sure you are connected to WiFi, then check:\n\n1. Settings > Privacy & Security > Location Services - turn on for BudgetArk ("While Using")\n2. Settings > Privacy & Security > Local Network - turn on for BudgetArk\n\niOS requires location access to read the WiFi name. Your location is never stored or shared.'
            : "Connect to your home WiFi first, then try again.",
      });
      return;
    }
    await updateHomeSSID(ssid);
    setPairing((prev) => (prev ? { ...prev, homeSSID: ssid } : null));
    setInfoModal({
      title: "Home Network Set",
      message: `Auto-sync will trigger when both devices are on "${ssid}".`,
    });
  }, []);

  const handleToggleAutoSync = useCallback(async () => {
    if (!pairing) return;
    const next = !pairing.autoSyncEnabled;
    await setAutoSyncEnabled(next);
    setPairing((prev) => (prev ? { ...prev, autoSyncEnabled: next } : null));
    if (next) {
      startMonitoring((result) => {
        if (result.success) setLastSyncTime(result.timestamp);
      });
      monitoringActiveRef.current = true;
    } else {
      stopMonitoring();
      monitoringActiveRef.current = false;
    }
  }, [pairing]);

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
      setInfoModal({
        title: "Install Failed",
        message:
          error?.message ||
          "The update could not be applied right now. Please try again.",
      });
    }
  }, [pendingUpdate]);

  const toggleReleaseNote = useCallback((version: string) => {
    setExpandedReleaseNote((current) => (current === version ? null : version));
  }, []);

  /**
   * Resets all app data after user confirmation.
   * Clears debts, payments, and user account.
   * Creates a fresh anonymous account immediately after.
   */
  const handleResetData = useCallback(() => {
    setShowResetModal(true);
  }, []);

  const confirmReset = useCallback(async () => {
    setShowResetModal(false);
    triggerHaptic("warning");
    try {
      await clearAllData();
    } catch (err) {
      // `clearAllData` throws `ResetIncompleteError` when a non-atomic
      // multi-key clear leaves some keys behind. Surface that to the user
      // instead of pretending the reset succeeded - the leftover keys could
      // make the next session look corrupt or partially-onboarded.
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Some data could not be cleared. Try again or reinstall the app to complete the reset.";
      setInfoModal({
        title: "Reset incomplete",
        message: `${message} Please try Reset All Data again.`,
      });
      return;
    }
    await clearPairingState();
    stopMonitoring();
    monitoringActiveRef.current = false;
    // The reminder settings key was just wiped (disabled by default), so any
    // pending check-in notifications are orphaned - cancel them now.
    await cancelAllTrackingReminders();
    setReminderSettings(null);
    await deleteAccount();
    await getOrCreateUser();
    const freshUser = await completeOnboarding();
    await setPreferenceId(DEFAULT_CURRENCY_PREFERENCE_ID);
    setUser(freshUser);
    setEditName(freshUser.displayName);
    setPairing(null);
    setLastSyncTime(null);
    setInfoModal({
      title: "Done",
      message: "All data has been reset successfully.",
    });
  }, [setPreferenceId]);

  const handleExportData = useCallback(() => {
    setExportEncrypt(true);
    setExportPassword("");
    setShowExportModal(true);
  }, []);

  const confirmExport = useCallback(async () => {
    if (exportEncrypt && exportPassword.length < 4) {
      setInfoModal({
        title: "Password Too Short",
        message:
          "Please enter a password with at least 4 characters, or turn off encryption.",
      });
      return;
    }
    setShowExportModal(false);
    let exported = false;
    try {
      let message: string;
      if (exportEncrypt) {
        // PBKDF2 freezes the JS thread for ~200ms+; the native ActivityIndicator
        // keeps spinning so the user sees we're working. Yield a frame so the
        // overlay actually mounts before the freeze begins.
        setIsExporting(true);
        await new Promise((resolve) => setTimeout(resolve, 60));
        message = await buildExportMessage(exportPassword);
        // Dismiss the overlay *before* opening the share sheet. On iOS,
        // UIActivityViewController presented over a still-visible RN <Modal>
        // can fail to fire its completion callback, leaving Share.share
        // pending forever - which is what stranded users on the spinner.
        setIsExporting(false);
        if (Platform.OS === "ios") {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      } else {
        // Unencrypted gather is fast (no PBKDF2); skip the overlay entirely
        // so there's nothing blocking the share sheet's presentation.
        message = await buildExportMessage();
      }
      await shareExportMessage(message);
      triggerHaptic("success");
      await refreshBackupState();
      await recordExport();
      exported = true;
    } catch (error: any) {
      triggerHaptic("error");
      setInfoModal({
        title: "Export Failed",
        message:
          error?.message || "Something went wrong while exporting your data.",
      });
    } finally {
      setIsExporting(false);
    }
    setExportPassword("");
    if (exported) {
      // Defer the achievement check until the spinner overlay AND the OS
      // share sheet have fully dismissed. The unlock celebration is a RN
      // <Modal>; asking it to present while another modal/share sheet is
      // still transitioning fails silently on iOS - which is why the
      // Cartographer badge "never showed up" after exporting.
      setTimeout(() => {
        void refreshAchievements();
      }, 500);
    }
  }, [exportEncrypt, exportPassword, refreshBackupState, refreshAchievements]);

  /**
   * First step: show a themed modal to choose import source.
   */
  const handleImportData = useCallback(() => {
    setShowImportModal(true);
  }, []);

  /**
   * File-picker path: show a themed merge/replace modal.
   */
  const handleImportFromFile = useCallback(() => {
    setShowImportModal(false);
    setShowImportModeModal(true);
  }, []);

  /**
   * Runs the actual import and shows the result.
   * Called directly or after password entry for encrypted exports.
   */
  const executeImport = useCallback(
    async (
      importFn: (password?: string) => Promise<ImportResult | null>,
      label: string,
      password?: string,
    ) => {
      try {
        const result = await importFn(password);
        if (!result) return;
        const parts = [
          `${result.debts} debts`,
          `${result.payments} payments`,
          `${result.budgetEntries} budget entries`,
          `${result.budgetLimits} budget limits`,
        ];
        if (result.savingsGoals > 0)
          parts.push(`${result.savingsGoals} savings goals`);
        if (result.assetAccounts > 0)
          parts.push(`${result.assetAccounts} asset accounts`);
        if (result.holdings > 0) parts.push(`${result.holdings} holdings`);
        if (result.netWorthSnapshots > 0)
          parts.push(`${result.netWorthSnapshots} net worth snapshots`);
        if (result.customCategories > 0)
          parts.push(`${result.customCategories} custom categories`);
        const extras: string[] = [];
        if (result.debtMilestones) extras.push("milestone plan");
        if (result.payoffStrategy) extras.push("payoff strategy");
        let message = `${label} ${parts.join(", ")}.`;
        if (extras.length > 0) {
          message += `\nAlso restored: ${extras.join(", ")}.`;
        }
        if (result.staleDays !== undefined && result.staleDays > 30) {
          message += `\n\nNote: This export is ${result.staleDays} days old. Some data may be outdated.`;
        }
        void refreshCustomCategories();
        triggerHaptic("success");
        setInfoModal({
          title: "Import Complete",
          message,
        });
      } catch (error: any) {
        if (error?.message?.includes("password-encrypted")) {
          // Need password - stash the request and show the password prompt;
          // confirmImportPassword re-runs it with the entered password.
          setPendingImport({ importFn, label });
          setImportPassword("");
          setShowImportPasswordModal(true);
        } else {
          triggerHaptic("error");
          setInfoModal({
            title: "Import Failed",
            message:
              error?.message ||
              "Something went wrong while importing your data.",
          });
        }
      }
    },
    [refreshCustomCategories],
  );

  const confirmImportPassword = useCallback(() => {
    if (!pendingImport) return;
    setShowImportPasswordModal(false);
    void executeImport(pendingImport.importFn, pendingImport.label, importPassword);
    setImportPassword("");
    setPendingImport(null);
  }, [pendingImport, importPassword, executeImport]);

  /**
   * File-picker: run the document picker with the chosen mode.
   */
  const confirmFileImport = useCallback(
    async (mode: "merge" | "replace") => {
      if (importPickerInFlightRef.current) return;
      importPickerInFlightRef.current = true;
      setShowImportModeModal(false);
      // iOS: the document picker presented while the merge/replace <Modal> is
      // still tearing down fails silently, but expo-document-picker's
      // in-progress flag stays set - every later attempt then throws
      // "Different document picking in progress" until the app restarts.
      await waitForIosModalTeardown(350);
      const label = mode === "merge" ? "Merged" : "Imported";
      try {
        await executeImport((password) => importData(mode, password), label);
      } finally {
        importPickerInFlightRef.current = false;
      }
    },
    [executeImport],
  );

  /**
   * Spreadsheet export - open the format-picker modal.
   */
  const handleExportSpreadsheet = useCallback(() => {
    setShowSpreadsheetExportModal(true);
  }, []);

  const closeSpreadsheetExportModal = useCallback(() => {
    setShowSpreadsheetExportModal(false);
    if (!spreadsheetExportInFlightRef.current) {
      setIsExporting(false);
    }
  }, []);

  /**
   * Spreadsheet export - run with the chosen format.
   */
  const confirmSpreadsheetExport = useCallback(
    async (format: SpreadsheetFormat) => {
      if (spreadsheetExportInFlightRef.current) return;
      spreadsheetExportInFlightRef.current = true;
      const opId = spreadsheetExportOpIdRef.current + 1;
      spreadsheetExportOpIdRef.current = opId;
      const isActiveOp = () => spreadsheetExportOpIdRef.current === opId;
      closeSpreadsheetExportModal();
      await waitForIosModalTeardown(350);
      if (!isActiveOp()) return;
      // iOS: skip the blocking spinner modal entirely. Commit 1e7a8af added it
      // for encrypted JSON export (PBKDF2 freeze), but presenting
      // UIActivityViewController while any RN <Modal> is visible freezes the
      // app until force-quit. Spreadsheet export worked before that change.
      const useExportSpinner = Platform.OS !== "ios";
      if (useExportSpinner) {
        setIsExporting(true);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      if (!isActiveOp()) return;
      let exported = false;
      try {
        const result = await exportSpreadsheet(format, {
          beforeShare: useExportSpinner
            ? () => {
                setIsExporting(false);
              }
            : undefined,
        });
        if (!isActiveOp()) return;
        const formatLabel = format === "csv" ? "CSV" : "Excel";
        let note =
          format === "csv"
            ? "CSV exports include budget entries only. Use Excel format for a full backup."
            : `Workbook saved with ${result.entryCount} budget entries plus debts, payments, savings goals, and asset accounts.`;
        if (result.partial) {
          note += `\n\nPartial export: some sections could not be read and were skipped (${result.missingSections.join(", ")}).`;
        }
        triggerHaptic("success");
        setInfoModal({
          title: `${formatLabel} Export Ready`,
          message: note,
        });
        await refreshBackupState();
        if (!isActiveOp()) return;
        await recordExport();
        if (!isActiveOp()) return;
        exported = true;
      } catch (error: any) {
        if (!isActiveOp()) return;
        triggerHaptic("error");
        setInfoModal({
          title: "Export Failed",
          message:
            error?.message ||
            "Something went wrong while exporting the spreadsheet.",
        });
      } finally {
        if (isActiveOp()) {
          if (useExportSpinner) {
            setIsExporting(false);
          }
          spreadsheetExportInFlightRef.current = false;
        }
      }
      if (exported && isActiveOp()) {
        // Same deferral as JSON export - let the spinner + share sheet
        // dismiss so the achievement <Modal> can actually present.
        setTimeout(() => {
          void refreshAchievements();
        }, 500);
      }
    },
    [closeSpreadsheetExportModal, refreshBackupState, refreshAchievements],
  );

  useFocusEffect(
    useCallback(() => {
      spreadsheetExportOpIdRef.current += 1;
      setIsExporting(false);
      setShowSpreadsheetExportModal(false);
      spreadsheetExportInFlightRef.current = false;
      return undefined;
    }, []),
  );

  /**
   * Spreadsheet import - show merge/replace prompt.
   */
  const handleImportSpreadsheet = useCallback(() => {
    setShowSpreadsheetImportModal(true);
  }, []);

  /**
   * Spreadsheet import - run with the chosen mode via the shared import pipeline.
   */
  const confirmSpreadsheetImport = useCallback(
    async (mode: "merge" | "replace") => {
      if (importPickerInFlightRef.current) return;
      importPickerInFlightRef.current = true;
      setShowSpreadsheetImportModal(false);
      // Same iOS modal-teardown race as confirmFileImport: presenting the
      // document picker over a dismissing <Modal> strands the picker module
      // in its "picking in progress" state.
      await waitForIosModalTeardown(350);
      const label = mode === "merge" ? "Merged" : "Imported";
      try {
        const result = await importSpreadsheet(mode);
        if (!result) return;
        const parts = [
          `${result.budgetEntries} budget entries`,
          `${result.budgetLimits} limits`,
          `${result.debts} debts`,
          `${result.payments} payments`,
        ];
        if (result.savingsGoals > 0)
          parts.push(`${result.savingsGoals} savings goals`);
        if (result.assetAccounts > 0)
          parts.push(`${result.assetAccounts} asset accounts`);
        if (result.holdings > 0) parts.push(`${result.holdings} holdings`);
        let message = `${label} ${parts.join(", ")} from the spreadsheet.`;
        if (result.skippedRows > 0) {
          message += `\n\n${result.skippedRows} row${result.skippedRows === 1 ? "" : "s"} skipped (required fields missing or invalid):`;
          // List the first few offending rows so the user can find and fix
          // them; cap the list so a very messy file doesn't fill the modal.
          const MAX_LISTED = 8;
          const shown = result.skippedRowDetails.slice(0, MAX_LISTED);
          for (const detail of shown) {
            message += `\n• ${detail.sheet} - ${detail.descriptor}: ${detail.reason}`;
          }
          const remaining = result.skippedRowDetails.length - shown.length;
          if (remaining > 0) {
            message += `\n• …and ${remaining} more`;
          }
        }
        if (result.staleDays !== undefined && result.staleDays > 30) {
          message += `\n\nNote: This file is ${result.staleDays} days old. Some data may be outdated.`;
        }
        triggerHaptic("success");
        setInfoModal({
          title: "Import Complete",
          message,
        });
      } catch (error: any) {
        triggerHaptic("error");
        setInfoModal({
          title: "Import Failed",
          message:
            error?.message ||
            "Something went wrong while importing the spreadsheet.",
        });
      } finally {
        importPickerInFlightRef.current = false;
      }
    },
    [],
  );

  /**
   * Paste-text path: parse the pasted JSON and write to storage.
   */
  const handlePasteImport = useCallback(
    (mode: "merge" | "replace") => {
      const text = pasteText.trim();
      if (!text) {
        setInfoModal({
          title: "Empty",
          message: "Please paste your exported JSON data first.",
        });
        return;
      }
      setShowPasteModal(false);
      setPasteText("");
      const label = mode === "merge" ? "Merged" : "Imported";
      executeImport(
        (password) => importFromString(text, mode, password),
        label,
      );
    },
    [pasteText, executeImport],
  );

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: showAmbientBackground ? "transparent" : colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.textDim, fontSize: 14 }}>
          Loading profile...
        </Text>
      </View>
    );
  }

  /** Get current theme display name */
  const currentTheme = presets.find((p) => p.id === themeId);
  const currentSurfaceStyle = surfaceStylePresets.find(
    (p) => p.id === surfaceStyleId,
  );
  const currentDensity = densityPresets.find((p) => p.id === densityId);
  const currentTextSize = textSizePresets.find((p) => p.id === textSizeId);
  const latestRelease: ReleaseNote = RELEASE_NOTES[0];

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={[
          styles.screen,
          {
            backgroundColor: showAmbientBackground ? "transparent" : colors.bg,
          },
        ]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24 },
        ]}
      >
        {/* ── Backup reminder banner ── */}
        {shouldShowBackupReminder(backupState, CURRENT_APP_VERSION) && (
          <View
            style={[
              styles.backupBanner,
              { backgroundColor: colors.card, borderColor: colors.accent },
            ]}
          >
            <Text style={[styles.backupBannerTitle, { color: colors.text }]}>
              {backupState.lastBackupVersion
                ? `You upgraded to v${CURRENT_APP_VERSION}`
                : "No backup yet"}
            </Text>
            <Text style={[styles.backupBannerBody, { color: colors.textDim }]}>
              {backupState.lastBackupVersion
                ? `Your last backup was on v${backupState.lastBackupVersion}. Take a fresh one so you can always restore from this version.`
                : "Export your data so you have a recovery point if anything ever happens to your device."}
            </Text>
            <View style={styles.backupBannerActions}>
              <TouchableOpacity
                style={[
                  styles.backupBannerPrimary,
                  { backgroundColor: colors.accent },
                ]}
                onPress={handleExportData}
              >
                <Text
                  style={[
                    styles.backupBannerPrimaryText,
                    { color: colors.white },
                  ]}
                >
                  Back up now
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backupBannerSecondary}
                onPress={async () => {
                  await dismissBackupReminder(CURRENT_APP_VERSION);
                  await refreshBackupState();
                }}
              >
                <Text
                  style={[
                    styles.backupBannerSecondaryText,
                    { color: colors.textDim },
                  ]}
                >
                  Dismiss
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Header ── */}
        <View style={styles.titleSection}>
          <Text style={[styles.appLabel, { color: colors.textDim }]}>
            BudgetArk
          </Text>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            Profile
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
            Your anonymous account settings.
          </Text>
        </View>

        {/* ── Mission Statement ── */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setMissionExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: missionExpanded }}
          accessibilityLabel={`Mission statement, ${
            missionExpanded ? "expanded" : "collapsed"
          }`}
          style={[
            styles.missionCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.missionEyebrow, { color: colors.accent }]}>
            {MISSION_STATEMENT.eyebrow}
          </Text>
          <Text style={[styles.missionTitle, { color: colors.text }]}>
            {MISSION_STATEMENT.title}
          </Text>
          {missionExpanded && (
            <Text style={[styles.missionBody, { color: colors.textDim }]}>
              {MISSION_STATEMENT.body}
            </Text>
          )}
          <Text style={[styles.missionChevron, { color: colors.textMuted }]}>
            {missionExpanded ? "▴" : "▾"}
          </Text>
        </TouchableOpacity>

        {/* ── Profile Card ── */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.profileRow}>
            {/* Avatar circle */}
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={[styles.avatarText, { color: colors.white }]}>
                {user.displayName[0].toUpperCase()}
              </Text>
            </View>

            {/* Display name - tap to edit */}
            <View style={styles.profileInfo}>
              {isEditing ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[
                      styles.nameInput,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.cardBorder,
                        color: colors.text,
                      },
                    ]}
                    value={editName}
                    onChangeText={(text) =>
                      setEditName(sanitizeTextInput(text))
                    }
                    autoFocus
                    maxLength={20}
                  />
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      { backgroundColor: colors.success },
                    ]}
                    onPress={handleSaveName}
                  >
                    <Text style={[styles.saveBtnText, { color: colors.bg }]}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                  <Text style={[styles.displayName, { color: colors.text }]}>
                    {user.displayName}
                  </Text>
                  <Text style={[styles.editHint, { color: colors.textMuted }]}>
                    {user.id.slice(0, 8)}... · Tap name to edit
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ── Send Feedback + Tip Jar ── */}
        <View style={styles.settingsSection}>
          <View
            style={[
              styles.groupedCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setShowFeedbackModal(true)}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Send Feedback
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  Bug reports & feature requests
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              onPress={() => setShowTipJar(true)}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Tip Jar 💛
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  Optional support - nothing to unlock
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Appearance (Theme + Currency) ── */}
        <View style={styles.settingsSection}>
          <Text
            style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
          >
            APPEARANCE
          </Text>

          <View
            ref={anchorAppearance}
            collapsable={false}
            style={[
              styles.groupedCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setShowThemeModal(true)}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Theme
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {currentTheme?.name || "Forest Gold"}
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              onPress={() => setShowSurfaceStyleModal(true)}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Design Style
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {currentSurfaceStyle?.name || "Solid"}
                  {storedSurfaceStyleId == null && themeId === "deep_space"
                    ? " · theme default"
                    : ""}
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              onPress={handleToggleBackgroundEffects}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Ambient Backgrounds
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {backgroundEffectsEnabled
                    ? "Decorative themed backgrounds are enabled"
                    : "Plain backgrounds for reduced visual noise"}
                </Text>
              </View>
              <Text
                style={[
                  styles.settingsRowArrow,
                  {
                    color: backgroundEffectsEnabled
                      ? colors.accent
                      : colors.textDim,
                  },
                ]}
              >
                {backgroundEffectsEnabled ? "On" : "Off"}
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
              onPress={() => setShowDensityModal(true)}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Layout Density
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {currentDensity?.name || "Comfortable"}
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              onPress={() => setShowTextSizeModal(true)}
              accessibilityRole="button"
              accessibilityLabel={`Text Size, currently ${currentTextSize?.name || "Default"}`}
              accessibilityHint="Opens text size options for the whole app"
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Text Size
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {currentTextSize?.name || "Default"}
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Partner Sync (compressed) ── */}
        <View style={styles.settingsSection}>
          <Text
            style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
          >
            PARTNER SYNC
          </Text>

          {!pairing ? (
            <View
              style={[
                styles.groupedCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.groupedRow}
                onPress={() => setShowPairingModal(true)}
              >
                <View>
                  <Text
                    style={[styles.settingsRowText, { color: colors.text }]}
                  >
                    Pair with Partner
                  </Text>
                  <Text
                    style={[
                      styles.settingsRowSubtext,
                      { color: colors.textDim },
                    ]}
                  >
                    Sync budgets over WiFi - no account needed
                  </Text>
                </View>
                <Text
                  style={[styles.settingsRowArrow, { color: colors.textDim }]}
                >
                  →
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.groupedCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.groupedRow}
                onPress={handleSetHomeNetwork}
              >
                <View>
                  <Text
                    style={[styles.settingsRowText, { color: colors.text }]}
                  >
                    {pairing.partnerName}
                  </Text>
                  <Text
                    style={[
                      styles.settingsRowSubtext,
                      { color: colors.textDim },
                    ]}
                  >
                    {pairing.homeSSID
                      ? `Auto-sync ${pairing.autoSyncEnabled ? "on" : "off"} · "${pairing.homeSSID}"`
                      : "Tap to set home WiFi for auto-sync"}
                    {pairing.homeSSID ? (
                      <Text
                        style={{ color: colors.textMuted }}
                        onPress={handleToggleAutoSync}
                      >
                        {" "}
                        · {pairing.autoSyncEnabled ? "Disable" : "Enable"}
                      </Text>
                    ) : null}
                  </Text>
                </View>
                <Text
                  style={[styles.settingsRowArrow, { color: colors.textDim }]}
                >
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
                style={[
                  styles.groupedRow,
                  syncStatus !== "idle" &&
                    syncStatus !== "error" && { opacity: 0.7 },
                ]}
                onPress={handleSyncNow}
                disabled={syncStatus !== "idle" && syncStatus !== "error"}
              >
                <View>
                  <Text
                    style={[styles.settingsRowText, { color: colors.accent }]}
                  >
                    Sync Now
                  </Text>
                  <Text
                    style={[
                      styles.settingsRowSubtext,
                      { color: colors.textDim },
                    ]}
                  >
                    {syncStatus === "discovering"
                      ? "Looking for partner..."
                      : syncStatus === "connecting"
                        ? "Connecting..."
                        : syncStatus === "syncing"
                          ? "Syncing data..."
                          : lastSyncTime
                            ? `Last synced ${formatDateTime(lastSyncTime)}`
                            : "Never synced"}
                  </Text>
                </View>
                <Text
                  style={[styles.settingsRowArrow, { color: colors.accent }]}
                >
                  {syncStatus !== "idle" && syncStatus !== "error"
                    ? "..."
                    : "→"}
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
                onPress={() => setShowUnpairConfirm(true)}
              >
                <Text
                  style={[styles.settingsRowText, { color: colors.danger }]}
                >
                  Unpair
                </Text>
                <Text
                  style={[styles.settingsRowArrow, { color: colors.danger }]}
                >
                  →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Progress (Ship's Log achievements) ── */}
        <View style={styles.settingsSection}>
          <Text
            style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
          >
            PROGRESS
          </Text>

          <View
            style={[
              styles.groupedCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => {
                triggerHaptic("selection");
                setShowAchievements(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Open Ship's Log achievements"
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Ship's Log
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {`${Object.keys(achievementUnlocked).length}/${totalAchievements} achievements earned`}
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Categories ── */}
        <View style={styles.settingsSection}>
          <Text
            style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
          >
            CATEGORIES
          </Text>

          <View
            style={[
              styles.groupedCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => {
                triggerHaptic("selection");
                setShowManageCategories(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Manage custom categories"
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Custom Categories
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {customCategories.length === 0
                    ? "Add your own budget categories"
                    : `${customCategories.length} custom`}
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Data (Export, Import, Reset) ── */}
        <View style={styles.settingsSection}>
          <Text
            style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
          >
            DATA
          </Text>

          <View
            style={[
              styles.groupedCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={handleExportData}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Export
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  Encrypted backup to file
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              onPress={handleImportData}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Import
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  From file or clipboard
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              onPress={handleExportSpreadsheet}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Export Spreadsheet
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  CSV or Excel for Google Sheets / Excel
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              onPress={handleImportSpreadsheet}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Import Spreadsheet
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  From a CSV or Excel file
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              onPress={handleResetData}
            >
              <Text style={[styles.settingsRowText, { color: colors.danger }]}>
                Reset All Data
              </Text>
              <Text style={[styles.settingsRowArrow, { color: colors.danger }]}>
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Bank Connections (BYO API) ── */}
        <View style={styles.settingsSection}>
          <Text
            style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
          >
            CONNECTIONS
          </Text>

          <View
            style={[
              styles.groupedCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity style={styles.groupedRow} onPress={openConnections}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Bank Connections
                </Text>
                <Text
                  style={[
                    styles.settingsRowSubtext,
                    {
                      color: needsAttention ? colors.warning : colors.textDim,
                    },
                  ]}
                >
                  {needsAttention
                    ? "Needs attention"
                    : connections.length === 0
                      ? "Import transactions from your bank"
                      : `${connections.length} connected`}
                </Text>
              </View>
              <Text
                style={[
                  styles.settingsRowArrow,
                  { color: needsAttention ? colors.warning : colors.textDim },
                ]}
              >
                {needsAttention ? "!" : "→"}
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
              onPress={() => navigation.navigate("Budget", { openInbox: true })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Review Inbox
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {pendingCount > 0
                    ? `${pendingCount} transaction${pendingCount === 1 ? "" : "s"} waiting`
                    : "Nothing to review"}
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
                {privacyMode ? "On" : "Off"}
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
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              onPress={() => setShowTrackingReminders(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Tracking Reminders
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {reminderRowSubtext(reminderSettings)}
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
                {updatePrefs.manualUpdateMode ? "Off" : "On"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Help (how-to + replay walkthrough) ── */}
        <View style={styles.settingsSection}>
          <Text
            style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
          >
            HELP
          </Text>

          <View
            ref={anchorHelp}
            collapsable={false}
            style={[
              styles.groupedCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => {
                triggerHaptic("selection");
                setExpandedHowTo(null);
                setShowHowToModal(true);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  How to use BudgetArk
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  Per-tab quick reference
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              onPress={async () => {
                triggerHaptic("selection");
                await replayCoachmarks();
                // Profile fires its own tour on focus; queue the rest so each
                // tab auto-navigates after "Got it" on its last step. User
                // gets a single chained walkthrough across all five tabs.
                startGuidedTour([
                  "DebtTracker",
                  "Budget",
                  "Bridge",
                  "Utilities",
                ]);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Replay walkthrough
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  Show the first-launch tour again
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
                ↺
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── About (release notes, github) ── */}
        <View style={styles.settingsSection}>
          <Text
            style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
          >
            ABOUT
          </Text>

          <View
            style={[
              styles.groupedCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setShowReleaseNotesModal(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  v{latestRelease.version} - {latestRelease.title}
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  Tap for release notes
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
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
              onPress={() => Linking.openURL("https://github.com/RickeyNet")}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  GitHub
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  github.com/RickeyNet
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── App Info ── */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textMuted }]}>
            {`BudgetArk v${CURRENT_APP_VERSION || "?"}`}
          </Text>
        </View>
      </ScrollView>

      {/* ── Theme Selection Modal ── */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Choose Theme
            </Text>

            <ScrollView style={styles.themeList}>
              {presets.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.themeOption,
                    {
                      borderColor:
                        themeId === preset.id
                          ? preset.colors.accent
                          : colors.cardBorder,
                      backgroundColor: preset.colors.card,
                    },
                  ]}
                  onPress={() => handleThemeSelect(preset.id)}
                >
                  {/* Color swatches */}
                  <View style={styles.themeColorRow}>
                    <View
                      style={[
                        styles.themeSwatch,
                        { backgroundColor: preset.colors.accent },
                      ]}
                    />
                    <View
                      style={[
                        styles.themeSwatch,
                        { backgroundColor: preset.colors.success },
                      ]}
                    />
                    <View
                      style={[
                        styles.themeSwatch,
                        { backgroundColor: preset.colors.text },
                      ]}
                    />
                  </View>

                  {/* Theme name */}
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: preset.colors.text },
                    ]}
                  >
                    {preset.name}
                  </Text>

                  {/* Selection check */}
                  {themeId === preset.id && (
                    <View
                      style={[
                        styles.checkMark,
                        { backgroundColor: preset.colors.accent },
                      ]}
                    >
                      <Text
                        style={[
                          styles.checkMarkText,
                          { color: preset.colors.white },
                        ]}
                      >
                        ✓
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={[styles.closeBtnText, { color: colors.white }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Design Style Selection Modal ── */}
      <Modal
        visible={showSurfaceStyleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSurfaceStyleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Design Style
            </Text>
            {storedSurfaceStyleId == null && themeId === "deep_space" ? (
              <Text
                style={[
                  styles.settingsRowSubtext,
                  { color: colors.textDim, marginBottom: 12 },
                ]}
              >
                Deep Space currently defaults to Glass. Pick a style here to
                keep it across all themes.
              </Text>
            ) : null}

            <ScrollView style={styles.themeList}>
              {surfaceStylePresets.map((preset) => {
                const selected = surfaceStyleId === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.themeOption,
                      {
                        borderColor: selected
                          ? colors.accent
                          : colors.cardBorder,
                        backgroundColor: colors.bg,
                      },
                    ]}
                    onPress={() => handleSurfaceStyleSelect(preset.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.themeOptionText, { color: colors.text }]}
                      >
                        {preset.name}
                      </Text>
                      <Text
                        style={[
                          styles.settingsRowSubtext,
                          { color: colors.textDim, marginTop: 4 },
                        ]}
                      >
                        {preset.description}
                      </Text>
                    </View>

                    {selected && (
                      <View
                        style={[
                          styles.checkMark,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.checkMarkText,
                            { color: colors.white },
                          ]}
                        >
                          ✓
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowSurfaceStyleModal(false)}
            >
              <Text style={[styles.closeBtnText, { color: colors.white }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Density Selection Modal ── */}
      <Modal
        visible={showDensityModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDensityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Layout Density
            </Text>

            <ScrollView style={styles.themeList}>
              {densityPresets.map((preset) => {
                const selected = densityId === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.themeOption,
                      {
                        borderColor: selected
                          ? colors.accent
                          : colors.cardBorder,
                        backgroundColor: colors.bg,
                      },
                    ]}
                    onPress={() => handleDensitySelect(preset.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.themeOptionText, { color: colors.text }]}
                      >
                        {preset.name}
                      </Text>
                      <Text
                        style={[
                          styles.settingsRowSubtext,
                          { color: colors.textDim, marginTop: 4 },
                        ]}
                      >
                        {preset.description}
                      </Text>
                    </View>

                    {selected && (
                      <View
                        style={[
                          styles.checkMark,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.checkMarkText,
                            { color: colors.white },
                          ]}
                        >
                          ✓
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowDensityModal(false)}
            >
              <Text style={[styles.closeBtnText, { color: colors.white }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Text Size Selection Modal ── */}
      <Modal
        visible={showTextSizeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTextSizeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Text Size
            </Text>

            <ScrollView style={styles.themeList}>
              {textSizePresets.map((preset) => {
                const selected = textSizeId === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.themeOption,
                      {
                        borderColor: selected
                          ? colors.accent
                          : colors.cardBorder,
                        backgroundColor: colors.bg,
                      },
                    ]}
                    onPress={() => handleTextSizeSelect(preset.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${preset.name}. ${preset.description}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.themeOptionText,
                          {
                            color: colors.text,
                            // Preview the size right in its own row.
                            fontSize: Math.round(16 * preset.multiplier),
                          },
                        ]}
                      >
                        {preset.name}
                      </Text>
                      <Text
                        style={[
                          styles.settingsRowSubtext,
                          { color: colors.textDim, marginTop: 4 },
                        ]}
                      >
                        {preset.description}
                      </Text>
                    </View>

                    {selected && (
                      <View
                        style={[
                          styles.checkMark,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.checkMarkText,
                            { color: colors.white },
                          ]}
                        >
                          ✓
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowTextSizeModal(false)}
            >
              <Text style={[styles.closeBtnText, { color: colors.white }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Currency & Locale
            </Text>

            <ScrollView style={styles.themeList}>
              {currencyOptions.map((option) => {
                const isSelected = option.id === preference.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.themeOption,
                      {
                        borderColor: isSelected
                          ? colors.accent
                          : colors.cardBorder,
                        backgroundColor: isSelected
                          ? `${colors.accent}10`
                          : "transparent",
                      },
                    ]}
                    onPress={() =>
                      handleCurrencySelect(option.id as CurrencyPreferenceId)
                    }
                  >
                    <View style={styles.currencyOptionTextWrap}>
                      <Text
                        style={[styles.themeOptionText, { color: colors.text }]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.settingsRowSubtext,
                          { color: colors.textDim },
                        ]}
                      >
                        {new Intl.NumberFormat(option.locale, {
                          style: "currency",
                          currency: option.currencyCode,
                        }).format(1234.56)}
                      </Text>
                    </View>

                    {isSelected && (
                      <View
                        style={[
                          styles.checkMark,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.checkMarkText,
                            { color: colors.white },
                          ]}
                        >
                          ✓
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowCurrencyModal(false)}
            >
              <Text style={[styles.closeBtnText, { color: colors.white }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                  if (currencyPrompt) void applyCurrencyPreference(currencyPrompt.id);
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

      <Modal
        visible={showReleaseNotesModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowReleaseNotesModal(false)}
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
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              Release Notes
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              Browse current and past versions.
            </Text>

            <ScrollView
              contentContainerStyle={styles.faqList}
              showsVerticalScrollIndicator={false}
            >
              {RELEASE_NOTES.map((release) => {
                const isExpanded = expandedReleaseNote === release.version;
                return (
                  <TouchableOpacity
                    key={release.version}
                    style={[
                      styles.faqItem,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    onPress={() => toggleReleaseNote(release.version)}
                  >
                    <View style={styles.faqHeader}>
                      <Text
                        style={[styles.faqQuestion, { color: colors.text }]}
                      >
                        v{release.version} - {release.title}
                      </Text>
                      <Text
                        style={[styles.faqArrow, { color: colors.textMuted }]}
                      >
                        {isExpanded ? "v" : ">"}
                      </Text>
                    </View>
                    {isExpanded ? (
                      <>
                        <Text
                          style={[
                            styles.faqAnswer,
                            { color: colors.textMuted },
                          ]}
                        >
                          Released {release.releasedAt}
                        </Text>
                        {release.highlights.map((item) => (
                          <Text
                            key={`${release.version}-${item}`}
                            style={[
                              styles.faqAnswer,
                              { color: colors.textDim },
                            ]}
                          >
                            - {item}
                          </Text>
                        ))}
                      </>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowReleaseNotesModal(false)}
            >
              <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── How-To Reference Modal ── */}
      <Modal
        visible={showHowToModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHowToModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                maxHeight: "85%",
              },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              How to use BudgetArk
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              Tap a tab to see how it works.
            </Text>

            <ScrollView
              contentContainerStyle={styles.faqList}
              showsVerticalScrollIndicator={false}
            >
              {COACHMARK_TAB_IDS.map((tabId) => {
                const tour = COACHMARKS[tabId];
                const isExpanded = expandedHowTo === tabId;
                return (
                  <TouchableOpacity
                    key={tabId}
                    style={[
                      styles.faqItem,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    onPress={() => {
                      triggerHaptic("selection");
                      setExpandedHowTo(isExpanded ? null : tabId);
                    }}
                  >
                    <View style={styles.faqHeader}>
                      <Text
                        style={[styles.faqQuestion, { color: colors.text }]}
                      >
                        {tour.intro}
                      </Text>
                      <Text
                        style={[styles.faqArrow, { color: colors.textMuted }]}
                      >
                        {isExpanded ? "v" : ">"}
                      </Text>
                    </View>
                    {isExpanded
                      ? tour.steps.map((step, idx) => (
                          <View
                            key={step.id}
                            style={{ marginTop: idx === 0 ? 8 : 6 }}
                          >
                            <Text
                              style={[
                                styles.faqAnswer,
                                { color: colors.text, fontWeight: "700" },
                              ]}
                            >
                              {idx + 1}. {step.title}
                            </Text>
                            <Text
                              style={[
                                styles.faqAnswer,
                                { color: colors.textDim },
                              ]}
                            >
                              {step.body}
                            </Text>
                          </View>
                        ))
                      : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                gap: tokens.gapSm,
                marginTop: tokens.gapSm,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.dialogBtn,
                  {
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    flex: 1,
                  },
                ]}
                onPress={() => {
                  triggerHaptic("selection");
                  setShowHowToModal(false);
                  // Wait for the How-To Modal close animation before resetting
                  // the coachmark state. Otherwise RN tries to present the
                  // Spotlight Modal on top of the still-dismissing How-To
                  // Modal and queues/hides one of them.
                  setTimeout(() => {
                    void replayCoachmarks().then(() => {
                      startGuidedTour([
                        "DebtTracker",
                        "Budget",
                        "Bridge",
                        "Utilities",
                      ]);
                    });
                  }, 350);
                }}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Replay tour
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dialogBtn,
                  { backgroundColor: colors.accent, flex: 1 },
                ]}
                onPress={() => setShowHowToModal(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Exporting Spinner Overlay ──
          Blocking, non-dismissable. The native ActivityIndicator keeps
          animating on the UI thread even while the JS thread is frozen by
          the synchronous PBKDF2 key derivation, so the user sees clear
          "working" feedback instead of a dead screen. */}
      <Modal
        visible={isExporting}
        animationType="fade"
        transparent
        presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      >
        <View
          style={[
            styles.modalOverlay,
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              borderWidth: 1,
              borderRadius: 16,
              paddingVertical: 28,
              paddingHorizontal: 36,
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color={colors.accent} />
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                fontWeight: "600",
                marginTop: 16,
              }}
            >
              Preparing your export…
            </Text>
            <Text
              style={{
                color: colors.textDim,
                fontSize: 12,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              Encrypting can take a few seconds. Keep the app open.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Export Confirmation Modal ── */}
      <Modal
        visible={showExportModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowExportModal(false)}
      >
        <KeyboardAwareModalOverlay style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              Export My Data
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {exportEncrypt
                ? "Your data will be encrypted with a password before sharing."
                : "Your data will be exported as plaintext JSON. Anyone with access to the file can read your financial data."}
            </Text>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "center",
                marginBottom: 16,
              }}
              onPress={() => {
                setExportEncrypt((v) => !v);
                if (exportEncrypt) setExportPassword("");
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: exportEncrypt ? colors.accent : colors.textMuted,
                  backgroundColor: exportEncrypt
                    ? colors.accent
                    : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                {exportEncrypt ? (
                  <Text
                    style={{
                      color: colors.white,
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    ✓
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: colors.text, fontSize: 14 }}>
                Encrypt with password
              </Text>
            </TouchableOpacity>

            {exportEncrypt ? (
              <TextInput
                style={[
                  {
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 15,
                    color: colors.text,
                    backgroundColor: colors.bg,
                    marginBottom: 16,
                  },
                ]}
                placeholder="Enter export password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={exportPassword}
                onChangeText={setExportPassword}
                maxLength={64}
                autoFocus
              />
            ) : null}

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => {
                  setShowExportModal(false);
                  setExportPassword("");
                }}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={confirmExport}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  {exportEncrypt ? "Encrypt & Share" : "Share Plaintext"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareModalOverlay>
      </Modal>

      {/* ── Import Password Modal ── */}
      <Modal
        visible={showImportPasswordModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowImportPasswordModal(false);
          setPendingImport(null);
          setImportPassword("");
        }}
      >
        <KeyboardAwareModalOverlay style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              Encrypted Export
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              This export was encrypted with a password. Enter the password to
              decrypt it.
            </Text>
            <TextInput
              style={[
                {
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 15,
                  color: colors.text,
                  backgroundColor: colors.bg,
                  marginBottom: 16,
                },
              ]}
              placeholder="Enter password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={importPassword}
              onChangeText={setImportPassword}
              maxLength={64}
              autoFocus
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => {
                  setShowImportPasswordModal(false);
                  setPendingImport(null);
                  setImportPassword("");
                }}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={confirmImportPassword}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Decrypt & Import
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareModalOverlay>
      </Modal>

      {/* ── Reset Confirmation Modal ── */}
      <Modal
        visible={showResetModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              Reset All Data
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              This will permanently delete all your debts, payments, and account
              data. This cannot be undone.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setShowResetModal(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.danger }]}
                onPress={confirmReset}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Reset Everything
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Import Source Modal ── */}
      <Modal
        visible={showImportModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              Import Data
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              Choose an import source.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setShowImportModal(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={handleImportFromFile}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Pick File
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={() => {
                  setShowImportModal(false);
                  setPasteText("");
                  setShowPasteModal(true);
                }}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Paste Text
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Import Mode Modal (file path) ── */}
      <Modal
        visible={showImportModeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowImportModeModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              Import from File
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              Merge keeps your existing data and adds the imported data. Replace
              wipes your current data first.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setShowImportModeModal(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.success }]}
                onPress={() => confirmFileImport("merge")}
              >
                <Text style={[styles.dialogBtnText, { color: colors.bg }]}>
                  Merge
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.danger }]}
                onPress={() => confirmFileImport("replace")}
              >
                <Text style={[styles.dialogBtnText, { color: colors.bg }]}>
                  Replace
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Spreadsheet Export Format Modal ── */}
      <Modal
        visible={showSpreadsheetExportModal}
        animationType="fade"
        transparent
        presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
        onRequestClose={closeSpreadsheetExportModal}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              Export Spreadsheet
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              CSV exports budget entries only - easiest for Google Sheets and
              quick edits. Excel exports a full multi-sheet workbook (Budget
              Entries, Budget Limits, Debts, Payments, Savings Goals, Asset
              Accounts) for a complete backup.
            </Text>
            <TouchableOpacity
              style={styles.dialogLinkRow}
              onPress={() => {
                closeSpreadsheetExportModal();
                setTimeout(() => {
                  setShowSpreadsheetSchemaModal(true);
                }, 250);
              }}
            >
              <Text style={[styles.dialogLinkText, { color: colors.accent }]}>
                View format reference →
              </Text>
            </TouchableOpacity>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={closeSpreadsheetExportModal}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={() => confirmSpreadsheetExport("csv")}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  CSV
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={() => confirmSpreadsheetExport("xlsx")}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Excel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Spreadsheet Import Mode Modal ── */}
      <Modal
        visible={showSpreadsheetImportModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSpreadsheetImportModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              Import Spreadsheet
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              Pick a .csv or .xlsx file. Required headers: Date, Type
              (income/expense), Category, Amount. Merge keeps your existing
              data; Replace wipes it first.
            </Text>
            <Text style={[styles.dialogTip, { color: colors.textMuted }]}>
              Tip: tap Export Spreadsheet first to see the exact format, then
              edit and re-import. IDs round-trip so existing rows update in
              place.
            </Text>
            <TouchableOpacity
              style={styles.dialogLinkRow}
              onPress={() => {
                setShowSpreadsheetImportModal(false);
                setShowSpreadsheetSchemaModal(true);
              }}
            >
              <Text style={[styles.dialogLinkText, { color: colors.accent }]}>
                View format reference →
              </Text>
            </TouchableOpacity>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setShowSpreadsheetImportModal(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.success }]}
                onPress={() => confirmSpreadsheetImport("merge")}
              >
                <Text style={[styles.dialogBtnText, { color: colors.bg }]}>
                  Merge
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.danger }]}
                onPress={() => confirmSpreadsheetImport("replace")}
              >
                <Text style={[styles.dialogBtnText, { color: colors.bg }]}>
                  Replace
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Spreadsheet Schema Reference Modal ── */}
      <SpreadsheetSchemaModal
        visible={showSpreadsheetSchemaModal}
        onClose={() => setShowSpreadsheetSchemaModal(false)}
      />

      {/* ── Paste Import Modal ── */}
      <Modal
        visible={showPasteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasteModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.pasteModalOverlay}
          // padding on both platforms: the RN Modal's Android window isn't
          // auto-resized for the keyboard, so the KAV has to do the lift or the
          // input hides behind it. padding slides it up smoothly; "height" mode
          // re-lays-out the subtree each frame and glitches on dismiss.
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <View
            style={[
              styles.pasteModalContent,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Paste Export Data
            </Text>
            <Text style={[styles.pasteHint, { color: colors.textDim }]}>
              Paste the JSON text you copied from Export My Data.
            </Text>

            <TextInput
              style={[
                styles.pasteInput,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.cardBorder,
                  color: colors.text,
                },
              ]}
              value={pasteText}
              onChangeText={setPasteText}
              placeholder="Paste JSON here..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.pasteActions}>
              <TouchableOpacity
                style={[styles.pasteBtn, { backgroundColor: colors.success }]}
                onPress={() => handlePasteImport("merge")}
              >
                <Text style={[styles.pasteBtnText, { color: colors.bg }]}>
                  Merge
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pasteBtn, { backgroundColor: colors.danger }]}
                onPress={() => handlePasteImport("replace")}
              >
                <Text style={[styles.pasteBtnText, { color: colors.bg }]}>
                  Replace
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.cardBorder }]}
              onPress={() => {
                setShowPasteModal(false);
                setPasteText("");
              }}
            >
              <Text style={[styles.closeBtnText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
                            {"\u2022"} {item}
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

      {/* ── Generic Info/Alert Modal ── */}
      <Modal
        visible={infoModal !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setInfoModal(null)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {infoModal?.title}
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {infoModal?.message}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={() => setInfoModal(null)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Feedback Modal ── */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onResult={(result) => {
          setShowFeedbackModal(false);
          setInfoModal(result);
        }}
      />

      {/* ── Tip Jar Modal ── */}
      {/* Mounted on demand: useIAP inside opens the billing connection on
          mount and closes it on unmount. */}
      {showTipJar ? <TipJarModal onClose={() => setShowTipJar(false)} /> : null}

      {/* ── Tracking Reminders Modal ── */}
      {showTrackingReminders ? (
        <TrackingRemindersModal
          onClose={() => {
            setShowTrackingReminders(false);
            // Refresh the settings-row subtext with whatever was saved.
            void getTrackingReminderSettings().then(setReminderSettings);
          }}
        />
      ) : null}

      {/* ── Pairing Modal ── */}
      <PairingModal
        visible={showPairingModal}
        onClose={() => setShowPairingModal(false)}
        onPaired={handlePaired}
      />

      {/* ── Unpair Confirmation ── */}
      <Modal
        visible={showUnpairConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowUnpairConfirm(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              Unpair Device
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              This will disconnect partner sync. Your data stays on this device,
              but you'll need to pair again to sync.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setShowUnpairConfirm(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.danger }]}
                onPress={handleUnpair}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Unpair
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

      {/* ── Bank Connections first-use disclosure ── */}
      <Modal
        visible={showConnectionsDisclosure}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConnectionsDisclosure(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {CONNECTIONS_DISCLOSURE_TITLE}
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {CONNECTIONS_DISCLOSURE_INTRO}
            </Text>
            {CONNECTIONS_DISCLOSURE_POINTS.map((point) => (
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
                onPress={() => setShowConnectionsDisclosure(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Not now
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={confirmConnectionsDisclosure}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Bank Connections manager + wizard ── */}
      <ConnectionsModal
        visible={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
        onAddConnection={() => void openAddConnection()}
        onAddBank={(connectionId) => void openAddBank(connectionId)}
      />
      <AddConnectionModal
        visible={showAddConnection}
        onClose={() => {
          setShowAddConnection(false);
          setAddBankInfo(null);
          void refreshConnections();
        }}
        onComplete={handleConnectionComplete}
        assetAccounts={wizardAssetAccounts}
        addBank={addBankInfo ?? undefined}
      />

      {/* ── Ship's Log (achievements) ── */}
      <AchievementsScreen
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
      />

      <ManageCategoriesModal
        visible={showManageCategories}
        onClose={() => setShowManageCategories(false)}
      />
      {coachmark}
    </>
  );
};

const makeStyles = (tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      paddingHorizontal: tokens.pad,
    },
    titleSection: {
      paddingTop: 56,
      paddingBottom: tokens.gap,
      alignItems: "center",
    },
    appLabel: {
      fontSize: scale(12),
      letterSpacing: 2,
      marginBottom: 4,
      textAlign: "center",
    },
    screenTitle: {
      fontSize: scale(28),
      fontWeight: "700",
      marginBottom: 4,
      textAlign: "center",
    },
    screenSubtitle: {
      fontSize: scale(14),
      textAlign: "center",
    },

    missionCard: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      marginBottom: tokens.gap,
      gap: 8,
    },
    missionEyebrow: {
      fontSize: scale(11),
      fontWeight: "700",
      letterSpacing: 1.5,
      textAlign: "center",
    },
    missionTitle: {
      fontSize: scale(17),
      fontWeight: "700",
      textAlign: "center",
    },
    missionBody: {
      fontSize: scale(14),
      lineHeight: scale(21),
      textAlign: "center",
    },
    missionChevron: {
      fontSize: scale(14),
      textAlign: "center",
      marginTop: 2,
    },

    /* Backup reminder banner */
    backupBanner: {
      marginTop: 56,
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      gap: 8,
    },
    backupBannerTitle: {
      fontSize: 15,
      fontWeight: "700",
    },
    backupBannerBody: {
      fontSize: 13,
      lineHeight: 18,
    },
    backupBannerActions: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      gap: 12,
    },
    backupBannerPrimary: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    backupBannerPrimaryText: {
      fontSize: 14,
      fontWeight: "700",
    },
    backupBannerSecondary: {
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    backupBannerSecondaryText: {
      fontSize: 13,
      fontWeight: "600",
    },

    /* Profile Card */
    profileCard: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      marginTop: 4,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    profileInfo: {
      flex: 1,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 18,
      fontWeight: "700",
    },
    displayName: {
      fontSize: 17,
      fontWeight: "700",
    },
    editHint: {
      fontSize: 11,
      marginTop: 2,
    },
    editRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    nameInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      minWidth: 160,
      textAlign: "center",
    },
    saveBtn: {
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    saveBtnText: {
      fontWeight: "700",
      fontSize: 14,
    },

    /* Settings */
    settingsSection: {
      marginTop: 24,
    },
    settingsSectionTitle: {
      fontSize: 11,
      letterSpacing: 1.5,
      marginBottom: 10,
    },
    settingsRow: {
      borderWidth: 1,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.pad,
      paddingVertical: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      minHeight: tokens.rowHeight,
    },
    settingsRowText: {
      fontSize: scale(15),
      fontWeight: "500",
    },
    settingsRowSubtext: {
      fontSize: scale(13),
      marginTop: 2,
    },
    settingsRowArrow: {
      fontSize: 16,
    },
    dangerRow: {
      borderColor: "#ff525220",
    },

    /* Grouped Card */
    groupedCard: {
      borderWidth: 1,
      borderRadius: tokens.radius - 2,
      overflow: "hidden",
    },
    groupedRow: {
      paddingHorizontal: tokens.pad,
      paddingVertical: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: tokens.rowHeight,
    },
    groupedDivider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: 16,
    },

    /* How To Docs */
    faqList: {
      gap: 8,
      marginBottom: 14,
    },
    faqItem: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    faqHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    faqQuestion: {
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
    },
    faqArrow: {
      fontSize: 16,
    },
    faqAnswer: {
      fontSize: 13,
      lineHeight: 19,
      marginTop: 8,
    },

    /* What's New */
    newsCard: {
      borderWidth: 1,
      borderRadius: tokens.radius,
      overflow: "hidden",
    },
    newsItem: {
      padding: tokens.pad,
    },
    newsBadge: {
      alignSelf: "flex-start",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginBottom: 8,
    },
    newsBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    newsTitle: {
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 6,
    },
    newsBody: {
      fontSize: 13,
      lineHeight: 19,
    },
    newsDivider: {
      height: 1,
      marginHorizontal: 16,
    },
    newsHistoryBtn: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    newsHistoryBtnText: {
      fontSize: 14,
      fontWeight: "600",
    },

    /* App Info */
    appInfo: {
      alignItems: "center",
      marginTop: 32,
      gap: 4,
    },
    appInfoText: {
      fontSize: 12,
    },

    /* Theme Modal */
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    modalContent: {
      borderTopLeftRadius: tokens.radius + 8,
      borderTopRightRadius: tokens.radius + 8,
      borderWidth: 1,
      paddingTop: tokens.padLg,
      paddingBottom: 40,
      paddingHorizontal: tokens.padLg,
      maxHeight: "70%",
    },
    modalTitle: {
      fontSize: scale(22),
      fontWeight: "700",
      marginBottom: tokens.gap,
      textAlign: "center",
    },
    themeList: {
      marginBottom: 20,
    },
    themeOption: {
      borderWidth: 2,
      borderRadius: tokens.radiusSm,
      padding: tokens.pad,
      marginBottom: tokens.gapSm,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    themeColorRow: {
      flexDirection: "row",
      gap: 6,
    },
    themeSwatch: {
      width: 28,
      height: 28,
      borderRadius: 6,
    },
    themeOptionText: {
      fontSize: scale(16),
      fontWeight: "600",
      flex: 1,
    },
    currencyOptionTextWrap: {
      flex: 1,
      gap: 4,
    },
    checkMark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    checkMarkText: {
      fontSize: 14,
      fontWeight: "700",
    },
    closeBtn: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
    },
    closeBtnText: {
      fontSize: 16,
      fontWeight: "700",
    },

    /* Paste Import Modal */
    pasteModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.92)",
      justifyContent: "flex-start",
    },
    pasteModalContent: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 0,
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
    },
    pasteHint: {
      fontSize: 13,
      lineHeight: 19,
      textAlign: "left",
      marginBottom: 16,
    },
    pasteInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 13,
      fontFamily: "monospace",
      marginBottom: 16,
    },
    pasteActions: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 10,
    },
    pasteBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    pasteBtnText: {
      fontSize: 15,
      fontWeight: "700",
    },

    /* Themed Dialog (replaces Alert.alert) */
    dialogOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 28,
    },
    dialogBox: {
      width: "100%",
      borderWidth: 1,
      borderRadius: 20,
      padding: 24,
    },
    dialogTitle: {
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 10,
      textAlign: "center",
    },
    dialogMessage: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginBottom: 20,
    },
    dialogTip: {
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
      marginTop: -10,
      marginBottom: 14,
      fontStyle: "italic",
    },
    dialogLinkRow: {
      alignItems: "center",
      marginBottom: 16,
    },
    dialogLinkText: {
      fontSize: 14,
      fontWeight: "600",
    },
    /* Update modal */
    updateVersionBadge: {
      alignSelf: "center",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginBottom: 12,
    },
    updateVersionText: {
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    updateReleaseTitle: {
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 12,
    },
    updateHighlightsList: {
      maxHeight: 240,
      marginBottom: 12,
    },
    updateHighlight: {
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 6,
    },
    updateMeta: {
      fontSize: 11,
      textAlign: "center",
      marginBottom: 16,
    },

    dialogActions: {
      gap: 10,
    },
    dialogBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    dialogBtnText: {
      fontSize: scale(15),
      fontWeight: "700",
    },
  });
};

export default ProfileScreen;
