/**
 * BudgetArk — Profile Screen
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

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Linking,
  Platform,
} from "react-native";
import * as Updates from "expo-updates";
import { useNavigation, useRoute } from "@react-navigation/native";
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
import {
  getOrCreateUser,
  updateDisplayName,
  deleteAccount,
  completeOnboarding,
} from "../storage/userStorage";
import { clearAllData } from "../storage/debtStorage";
import { exportAllData } from "../utils/exportData";
import { importData, importFromString, isEncryptedExport, type ImportResult } from "../utils/importData";
import {
  getUpdatePreferences,
  setLastUpdateCheckAt,
  setManualUpdateMode,
} from "../storage/updatePreferencesStorage";
import { useTheme } from "../theme/ThemeProvider";
import type { UpdatePreferences } from "../types";
import { useCurrency } from "../currency/CurrencyProvider";
import { isUpdateSafe } from "../utils/versionGuard";
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
import type { PairingState, SyncStatus, SyncResult } from "../sync/types";
import PairingModal from "../components/PairingModal";
import FeedbackModal from "../components/FeedbackModal";

type UpdateMetadata = {
  id: string;
  message: string;
  createdAt?: string;
  runtimeVersion?: string;
  appVersion?: string;
};

type ReleaseNoteKey = string;

import { sanitizeTextInput } from "../utils/sanitize";

const ProfileScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootTabParamList, "Profile">>();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  /** Current theme context */
  const { colors, presets, themeId, setThemeId } = useTheme();
  const {
    preference,
    options: currencyOptions,
    setPreferenceId,
  } = useCurrency();

  /** Current user account state */
  const [user, setUser] = useState<UserAccount | null>(null);

  /** Editable display name (local state before saving) */
  const [editName, setEditName] = useState("");

  /** Whether the name input is in edit mode */
  const [isEditing, setIsEditing] = useState(false);

  /** Whether theme selector modal is visible */
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  /** Whether the paste-import modal is visible */
  const [showPasteModal, setShowPasteModal] = useState(false);

  /** Raw JSON text entered in the paste-import modal */
  const [pasteText, setPasteText] = useState("");

  /** Export confirmation modal state */
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportEncrypt, setExportEncrypt] = useState(true);
  const [exportPassword, setExportPassword] = useState("");

  /** Import password modal state (for encrypted exports) */
  const [showImportPasswordModal, setShowImportPasswordModal] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [pendingImportAction, setPendingImportAction] = useState<((pw: string) => void) | null>(null);

  /** Whether the reset confirmation modal is visible */
  const [showResetModal, setShowResetModal] = useState(false);

  /** Whether the import source-choice modal is visible */
  const [showImportModal, setShowImportModal] = useState(false);

  /** Whether the import merge/replace modal is visible (file path) */
  const [showImportModeModal, setShowImportModeModal] = useState(false);

  /** @deprecated How-to docs removed in v1.2.0 — help text moved inline */

  /** Release notes modal and accordion state */
  const [showReleaseNotesModal, setShowReleaseNotesModal] = useState(false);
  const [expandedReleaseNote, setExpandedReleaseNote] =
    useState<ReleaseNoteKey | null>(RELEASE_NOTES[0]?.version || null);

  /** Generic themed info/alert modal (replaces all Alert.alert) */
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);

  /** OTA update preferences and status */
  const [updatePrefs, setUpdatePrefs] = useState<UpdatePreferences>({
    manualUpdateMode: false,
  });
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<UpdateMetadata | null>(null);
  const canCheckUpdates = !__DEV__ && Updates.isEnabled;

  /** Privacy mode — blocks screenshots/screen recording when enabled */
  const [privacyMode, setPrivacyModeState] = useState(false);

  /** Partner sync state */
  const [pairing, setPairing] = useState<PairingState | null>(null);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  /** Load user on mount */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [u, prefs, privacy, pairState, syncMeta] = await Promise.all([
          getOrCreateUser(),
          getUpdatePreferences(),
          getPrivacyMode(),
          getPairingState(),
          getSyncMetadata(),
        ]);
        if (cancelled) return;
        setUser(u);
        setEditName(u.displayName);
        setUpdatePrefs(prefs);
        setPrivacyModeState(privacy);
        setPairing(pairState);
        setLastSyncTime(syncMeta.lastSyncTimestamp);
        if (pairState?.autoSyncEnabled) {
          startMonitoring((result) => {
            if (result.success) {
              setLastSyncTime(result.timestamp);
            }
          });
        }
      } catch (error) {
        if (__DEV__) console.error("Failed to load profile:", error);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!route.params?.openReleaseNotes) return;
    setShowReleaseNotesModal(true);
    navigation.setParams({ openReleaseNotes: undefined });
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
    [setThemeId]
  );

  const handleCurrencySelect = useCallback(
    async (id: CurrencyPreferenceId) => {
      await setPreferenceId(id);
      setUser((current) =>
        current ? { ...current, currencyPreferenceId: id } : current
      );
    },
    [setPreferenceId]
  );

  const formatDateTime = useCallback((iso?: string) => {
    if (!iso) return "Unknown";
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) return "Unknown";
    return new Date(parsed).toLocaleString();
  }, []);

  const extractUpdateMetadata = useCallback((manifest: unknown): UpdateMetadata => {
    const data = (manifest != null && typeof manifest === "object" ? manifest : {}) as Record<string, unknown>;
    const metadata = (data.metadata != null && typeof data.metadata === "object" ? data.metadata : {}) as Record<string, unknown>;
    const extras = (data.extra != null && typeof data.extra === "object" ? data.extra : {}) as Record<string, unknown>;
    const eas = (extras.eas != null && typeof extras.eas === "object" ? extras.eas : {}) as Record<string, unknown>;
    const expoClient = (extras.expoClient != null && typeof extras.expoClient === "object" ? extras.expoClient : {}) as Record<string, unknown>;

    const id = typeof data.id === "string" ? data.id : "unknown";
    const createdAt = typeof data.createdAt === "string" ? data.createdAt : undefined;
    const runtimeVersion =
      typeof data.runtimeVersion === "string" ? data.runtimeVersion : undefined;

    const messageCandidates = [
      metadata.message,
      metadata.updateMessage,
      eas.message,
      data.description,
      data.message,
    ];
    const message =
      messageCandidates.find((candidate) => typeof candidate === "string") ||
      "A new update is ready to install.";

    // Try to extract the app version from several manifest locations
    const versionCandidates = [
      expoClient.version,
      extras.version,
      metadata.version,
      metadata.appVersion,
      eas.appVersion,
      data.version,
    ];
    const appVersion =
      versionCandidates.find((candidate) => typeof candidate === "string") as string | undefined;

    return { id, createdAt, runtimeVersion, message, appVersion };
  }, []);

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
          (fetchResult as Record<string, unknown>).manifest || (checkResult as Record<string, unknown>).manifest || null;
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
          const raw = error?.message || String(error);
          const isNetworkError =
            raw.includes("failed to check") ||
            raw.includes("network") ||
            raw.includes("timeout");
          setInfoModal({
            title: "Update Check Failed",
            message: isNetworkError
              ? "Could not reach the update server. Check your internet connection and try again."
              : raw || "Unable to check for updates right now. Please try again shortly.",
          });
        }
      } finally {
        setIsCheckingUpdates(false);
      }
    },
    [canCheckUpdates, extractUpdateMetadata, formatDateTime, isCheckingUpdates]
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
    if (syncStatus === "syncing" || syncStatus === "discovering" || syncStatus === "connecting") return;
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
    setPairing(null);
    setLastSyncTime(null);
    setShowUnpairConfirm(false);
    setInfoModal({
      title: "Unpaired",
      message: "Partner sync has been disconnected. Your data is still on this device.",
    });
  }, []);

  const handleSetHomeNetwork = useCallback(async () => {
    if (Platform.OS === "android") {
      const granted = await requestLocationPermission();
      if (!granted) {
        setInfoModal({
          title: "Permission Required",
          message: "Location permission is needed to read the WiFi network name for auto-sync. Your location is never stored or shared.",
        });
        return;
      }
    }
    const ssid = await getCurrentSSID();
    if (!ssid) {
      setInfoModal({
        title: "No WiFi Detected",
        message: Platform.OS === "ios"
          ? "Unable to read your WiFi network name. Make sure you are connected to WiFi, then check:\n\n1. Settings > Privacy & Security > Location Services — turn on for BudgetArk (\"While Using\")\n2. Settings > Privacy & Security > Local Network — turn on for BudgetArk\n\niOS requires location access to read the WiFi name. Your location is never stored or shared."
          : "Connect to your home WiFi first, then try again.",
      });
      return;
    }
    await updateHomeSSID(ssid);
    setPairing((prev) => prev ? { ...prev, homeSSID: ssid } : null);
    setInfoModal({
      title: "Home Network Set",
      message: `Auto-sync will trigger when both devices are on "${ssid}".`,
    });
  }, []);

  const handleToggleAutoSync = useCallback(async () => {
    if (!pairing) return;
    const next = !pairing.autoSyncEnabled;
    await setAutoSyncEnabled(next);
    setPairing((prev) => prev ? { ...prev, autoSyncEnabled: next } : null);
    if (next) {
      startMonitoring((result) => {
        if (result.success) setLastSyncTime(result.timestamp);
      });
    } else {
      stopMonitoring();
    }
  }, [pairing]);

  const installPendingUpdate = useCallback(async () => {
    try {
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
  }, []);


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
    await clearAllData();
    await clearPairingState();
    stopMonitoring();
    await deleteAccount();
    await getOrCreateUser();
    const freshUser = await completeOnboarding();
    await setPreferenceId(DEFAULT_CURRENCY_PREFERENCE_ID);
    setUser(freshUser);
    setEditName(freshUser.displayName);
    setPairing(null);
    setLastSyncTime(null);
    setInfoModal({ title: "Done", message: "All data has been reset successfully." });
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
        message: "Please enter a password with at least 4 characters, or turn off encryption.",
      });
      return;
    }
    setShowExportModal(false);
    try {
      await exportAllData(exportEncrypt ? exportPassword : undefined);
    } catch (error: any) {
      setInfoModal({
        title: "Export Failed",
        message: error?.message || "Something went wrong while exporting your data.",
      });
    }
    setExportPassword("");
  }, [exportEncrypt, exportPassword]);

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
  const executeImport = useCallback(async (
    importFn: (password?: string) => Promise<ImportResult | null>,
    label: string,
    password?: string
  ) => {
    try {
      const result = await importFn(password);
      if (!result) return;
      let message = `${label} ${result.debts} debts, ${result.payments} payments, ${result.budgetEntries} budget entries, and ${result.budgetLimits} budget limits.`;
      if (result.staleDays !== undefined && result.staleDays > 30) {
        message += `\n\nNote: This export is ${result.staleDays} days old. Some data may be outdated.`;
      }
      setInfoModal({
        title: "Import Complete",
        message,
      });
    } catch (error: any) {
      if (error?.message?.includes("password-encrypted")) {
        // Need password — show the password prompt
        setPendingImportAction(() => (pw: string) =>
          executeImport(importFn, label, pw)
        );
        setImportPassword("");
        setShowImportPasswordModal(true);
      } else {
        setInfoModal({
          title: "Import Failed",
          message: error?.message || "Something went wrong while importing your data.",
        });
      }
    }
  }, []);

  const confirmImportPassword = useCallback(() => {
    if (!pendingImportAction) return;
    setShowImportPasswordModal(false);
    pendingImportAction(importPassword);
    setImportPassword("");
    setPendingImportAction(null);
  }, [pendingImportAction, importPassword]);

  /**
   * File-picker: run the document picker with the chosen mode.
   */
  const confirmFileImport = useCallback(async (mode: "merge" | "replace") => {
    setShowImportModeModal(false);
    const label = mode === "merge" ? "Merged" : "Imported";
    await executeImport(
      (password) => importData(mode, password),
      label
    );
  }, [executeImport]);

  /**
   * Paste-text path: parse the pasted JSON and write to storage.
   */
  const handlePasteImport = useCallback(
    (mode: "merge" | "replace") => {
      const text = pasteText.trim();
      if (!text) {
        setInfoModal({ title: "Empty", message: "Please paste your exported JSON data first." });
        return;
      }
      setShowPasteModal(false);
      setPasteText("");
      const label = mode === "merge" ? "Merged" : "Imported";
      executeImport(
        (password) => importFromString(text, mode, password),
        label
      );
    },
    [pasteText, executeImport]
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.textDim, fontSize: 14 }}>Loading profile...</Text>
      </View>
    );
  }

  /** Get current theme display name */
  const currentTheme = presets.find((p) => p.id === themeId);
  const latestRelease: ReleaseNote = RELEASE_NOTES[0];

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
      >
        {/* ── Header ── */}
        <View style={styles.titleSection}>
          <Text style={[styles.appLabel, { color: colors.textDim }]}>
            BudgetArk
          </Text>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Profile</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
            Your anonymous account settings.
          </Text>
        </View>

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

            {/* Display name — tap to edit */}
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
                    onChangeText={(text) => setEditName(sanitizeTextInput(text))}
                    autoFocus
                    maxLength={20}
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.success }]}
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

        {/* ── Send Feedback ── */}
        <View style={styles.settingsSection}>
          <View style={[styles.groupedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setShowFeedbackModal(true)}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>Send Feedback</Text>
                <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>Bug reports & feature requests</Text>
              </View>
              <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Appearance (Theme + Currency) ── */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textMuted }]}>
            APPEARANCE
          </Text>

          <View style={[styles.groupedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setShowThemeModal(true)}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Theme
                </Text>
                <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
                  {currentTheme?.name || "Forest Gold"}
                </Text>
              </View>
              <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Partner Sync (compressed) ── */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textMuted }]}>PARTNER SYNC</Text>

          {!pairing ? (
            <View style={[styles.groupedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={styles.groupedRow}
                onPress={() => setShowPairingModal(true)}
              >
                <View>
                  <Text style={[styles.settingsRowText, { color: colors.text }]}>Pair with Partner</Text>
                  <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
                    Sync budgets over WiFi — no account needed
                  </Text>
                </View>
                <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.groupedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={styles.groupedRow}
                onPress={handleSetHomeNetwork}
              >
                <View>
                  <Text style={[styles.settingsRowText, { color: colors.text }]}>
                    {pairing.partnerName}
                  </Text>
                  <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
                    {pairing.homeSSID
                      ? `Auto-sync ${pairing.autoSyncEnabled ? "on" : "off"} · "${pairing.homeSSID}"`
                      : "Tap to set home WiFi for auto-sync"}
                    {pairing.homeSSID ? (
                      <Text
                        style={{ color: colors.textMuted }}
                        onPress={handleToggleAutoSync}
                      > · {pairing.autoSyncEnabled ? "Disable" : "Enable"}</Text>
                    ) : null}
                  </Text>
                </View>
                <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
              </TouchableOpacity>

              <View style={[styles.groupedDivider, { backgroundColor: colors.cardBorder }]} />

              <TouchableOpacity
                style={[styles.groupedRow, (syncStatus !== "idle" && syncStatus !== "error") && { opacity: 0.7 }]}
                onPress={handleSyncNow}
                disabled={syncStatus !== "idle" && syncStatus !== "error"}
              >
                <View>
                  <Text style={[styles.settingsRowText, { color: colors.accent }]}>Sync Now</Text>
                  <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
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
                <Text style={[styles.settingsRowArrow, { color: colors.accent }]}>
                  {syncStatus !== "idle" && syncStatus !== "error" ? "..." : "→"}
                </Text>
              </TouchableOpacity>

              <View style={[styles.groupedDivider, { backgroundColor: colors.cardBorder }]} />

              <TouchableOpacity
                style={styles.groupedRow}
                onPress={() => setShowUnpairConfirm(true)}
              >
                <Text style={[styles.settingsRowText, { color: colors.danger }]}>Unpair</Text>
                <Text style={[styles.settingsRowArrow, { color: colors.danger }]}>→</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Data (Export, Import, Reset) ── */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textMuted }]}>
            DATA
          </Text>

          <View style={[styles.groupedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={handleExportData}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>Export</Text>
                <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>Encrypted backup to file</Text>
              </View>
              <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
            </TouchableOpacity>

            <View style={[styles.groupedDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={styles.groupedRow}
              onPress={handleImportData}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>Import</Text>
                <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>From file or clipboard</Text>
              </View>
              <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
            </TouchableOpacity>

            <View style={[styles.groupedDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={styles.groupedRow}
              onPress={handleResetData}
            >
              <Text style={[styles.settingsRowText, { color: colors.danger }]}>Reset All Data</Text>
              <Text style={[styles.settingsRowArrow, { color: colors.danger }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Settings (privacy, updates) ── */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textMuted }]}>
            SETTINGS
          </Text>

          <View style={[styles.groupedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setShowCurrencyModal(true)}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>Currency</Text>
                <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
                  {preference.label}
                </Text>
              </View>
              <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
            </TouchableOpacity>

            <View style={[styles.groupedDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={styles.groupedRow}
              onPress={togglePrivacyMode}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>Privacy Mode</Text>
                <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
                  {privacyMode
                    ? "Screenshots & screen recording blocked"
                    : "Screenshots & screen recording allowed"}
                </Text>
              </View>
              <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
                {privacyMode ? "On" : "Off"}
              </Text>
            </TouchableOpacity>

            <View style={[styles.groupedDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={[styles.groupedRow, isCheckingUpdates && { opacity: 0.7 }]}
              onPress={() => checkForUpdates("manual")}
              disabled={isCheckingUpdates}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>Check for Updates</Text>
                <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
                  {updatePrefs.lastCheckedAt
                    ? `Last checked ${formatDateTime(updatePrefs.lastCheckedAt)}`
                    : "Never checked"}
                </Text>
              </View>
              <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
                {isCheckingUpdates ? "..." : "→"}
              </Text>
            </TouchableOpacity>

            <View style={[styles.groupedDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={styles.groupedRow}
              onPress={toggleManualMode}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>Auto Updates</Text>
                <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
                  {updatePrefs.manualUpdateMode ? "Off — manual checks only" : "On — checks automatically"}
                </Text>
              </View>
              <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
                {updatePrefs.manualUpdateMode ? "Off" : "On"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── About (release notes, github) ── */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textMuted }]}>
            ABOUT
          </Text>

          <View style={[styles.groupedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setShowReleaseNotesModal(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  v{latestRelease.version} — {latestRelease.title}
                </Text>
                <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
                  Tap for release notes
                </Text>
              </View>
              <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
            </TouchableOpacity>

            <View style={[styles.groupedDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => Linking.openURL("https://github.com/RickeyNet")}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>GitHub</Text>
                <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>github.com/RickeyNet</Text>
              </View>
              <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── App Info ── */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textMuted }]}>
            BudgetArk v{CURRENT_APP_VERSION}
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
                      <Text style={[styles.checkMarkText, { color: preset.colors.white }]}>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Currency & Locale</Text>

            <ScrollView style={styles.themeList}>
              {currencyOptions.map((option) => {
                const isSelected = option.id === preference.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.themeOption,
                      {
                        borderColor: isSelected ? colors.accent : colors.cardBorder,
                        backgroundColor: isSelected ? `${colors.accent}10` : "transparent",
                      },
                    ]}
                    onPress={() =>
                      handleCurrencySelect(option.id as CurrencyPreferenceId)
                    }
                  >
                    <View style={styles.currencyOptionTextWrap}>
                      <Text style={[styles.themeOptionText, { color: colors.text }]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}> 
                        {new Intl.NumberFormat(option.locale, {
                          style: "currency",
                          currency: option.currencyCode,
                        }).format(1234.56)}
                      </Text>
                    </View>

                    {isSelected && (
                      <View style={[styles.checkMark, { backgroundColor: colors.accent }]}> 
                        <Text style={[styles.checkMarkText, { color: colors.white }]}>✓</Text>
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
              <Text style={[styles.closeBtnText, { color: colors.white }]}>Done</Text>
            </TouchableOpacity>
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
              { backgroundColor: colors.card, borderColor: colors.cardBorder, maxHeight: "80%" },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Release Notes</Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>Browse current and past versions.</Text>

            <ScrollView contentContainerStyle={styles.faqList} showsVerticalScrollIndicator={false}>
              {RELEASE_NOTES.map((release) => {
                const isExpanded = expandedReleaseNote === release.version;
                return (
                  <TouchableOpacity
                    key={release.version}
                    style={[
                      styles.faqItem,
                      { backgroundColor: colors.bg, borderColor: colors.cardBorder },
                    ]}
                    onPress={() => toggleReleaseNote(release.version)}
                  >
                    <View style={styles.faqHeader}>
                      <Text style={[styles.faqQuestion, { color: colors.text }]}>
                        v{release.version} - {release.title}
                      </Text>
                      <Text style={[styles.faqArrow, { color: colors.textMuted }]}>
                        {isExpanded ? "v" : ">"}
                      </Text>
                    </View>
                    {isExpanded ? (
                      <>
                        <Text style={[styles.faqAnswer, { color: colors.textMuted }]}>Released {release.releasedAt}</Text>
                        {release.highlights.map((item) => (
                          <Text key={`${release.version}-${item}`} style={[styles.faqAnswer, { color: colors.textDim }]}>- {item}</Text>
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
              <Text style={[styles.dialogBtnText, { color: colors.white }]}>Done</Text>
            </TouchableOpacity>
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
        <View style={styles.dialogOverlay}>
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
                  backgroundColor: exportEncrypt ? colors.accent : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                {exportEncrypt ? (
                  <Text style={{ color: colors.white, fontSize: 14, fontWeight: "700" }}>
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
        </View>
      </Modal>

      {/* ── Import Password Modal ── */}
      <Modal
        visible={showImportPasswordModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowImportPasswordModal(false);
          setPendingImportAction(null);
          setImportPassword("");
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
              Encrypted Export
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              This export was encrypted with a password. Enter the password to decrypt it.
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
                  setPendingImportAction(null);
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
        </View>
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

      {/* ── Paste Import Modal ── */}
      <Modal
        visible={showPasteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasteModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.pasteModalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <View
            style={[
              styles.pasteModalContent,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Paste Export Data</Text>
            <Text style={[styles.pasteHint, { color: colors.textDim }]}>Paste the JSON text you copied from Export My Data.</Text>

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
                <Text style={[styles.pasteBtnText, { color: colors.bg }]}>Merge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pasteBtn, { backgroundColor: colors.danger }]}
                onPress={() => handlePasteImport("replace")}
              >
                <Text style={[styles.pasteBtnText, { color: colors.bg }]}>Replace</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.cardBorder }]}
              onPress={() => {
                setShowPasteModal(false);
                setPasteText("");
              }}
            >
              <Text style={[styles.closeBtnText, { color: colors.text }]}>Cancel</Text>
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
              { backgroundColor: colors.card, borderColor: colors.cardBorder, maxHeight: "80%" },
            ]}
          >
            {(() => {
              const updateVersion = pendingUpdate?.appVersion;
              const matchedRelease = updateVersion
                ? RELEASE_NOTES.find((r) => r.version === updateVersion)
                : undefined;

              return (
                <>
                  <Text style={[styles.dialogTitle, { color: colors.text }]}>Update Ready</Text>

                  {updateVersion ? (
                    <View style={[styles.updateVersionBadge, { backgroundColor: `${colors.accent}20` }]}>
                      <Text style={[styles.updateVersionText, { color: colors.accent }]}>
                        v{updateVersion}
                      </Text>
                    </View>
                  ) : null}

                  {matchedRelease ? (
                    <>
                      <Text style={[styles.updateReleaseTitle, { color: colors.text }]}>
                        {matchedRelease.title}
                      </Text>
                      <ScrollView style={styles.updateHighlightsList} showsVerticalScrollIndicator={false}>
                        {matchedRelease.highlights.map((item) => (
                          <Text key={item} style={[styles.updateHighlight, { color: colors.textDim }]}>
                            {"\u2022"} {item}
                          </Text>
                        ))}
                      </ScrollView>
                    </>
                  ) : (
                    <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
                      {pendingUpdate?.message || "A new update is ready to install."}
                    </Text>
                  )}

                  {pendingUpdate?.createdAt ? (
                    <Text style={[styles.updateMeta, { color: colors.textMuted }]}>
                      Published {formatDateTime(pendingUpdate.createdAt)}
                    </Text>
                  ) : null}

                  <View style={styles.dialogActions}>
                    <TouchableOpacity
                      style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                      onPress={() => setPendingUpdate(null)}
                    >
                      <Text style={[styles.dialogBtnText, { color: colors.text }]}>Later</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                      onPress={installPendingUpdate}
                    >
                      <Text style={[styles.dialogBtnText, { color: colors.white }]}>Install Now</Text>
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
              This will disconnect partner sync. Your data stays on this device, but
              you'll need to pair again to sync.
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
    </>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  titleSection: {
    paddingTop: 56,
    paddingBottom: 20,
    alignItems: "center",
  },
  appLabel: {
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 4,
    textAlign: "center",
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  screenSubtitle: {
    fontSize: 14,
    textAlign: "center",
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  settingsRowText: {
    fontSize: 15,
    fontWeight: "500",
  },
  settingsRowSubtext: {
    fontSize: 13,
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
    borderRadius: 14,
    overflow: "hidden",
  },
  groupedRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    borderRadius: 16,
    overflow: "hidden",
  },
  newsItem: {
    padding: 16,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  themeList: {
    marginBottom: 20,
  },
  themeOption: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    fontSize: 16,
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
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ProfileScreen;
