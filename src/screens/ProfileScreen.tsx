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
import { importData, importFromString } from "../utils/importData";
import {
  getUpdatePreferences,
  setLastUpdateCheckAt,
  setManualUpdateMode,
} from "../storage/updatePreferencesStorage";
import { useTheme } from "../theme/ThemeProvider";
import type { UpdatePreferences } from "../types";
import { useCurrency } from "../currency/CurrencyProvider";

type UpdateMetadata = {
  id: string;
  message: string;
  createdAt?: string;
  runtimeVersion?: string;
};

type HowToDocKey = "export" | "import";
type ReleaseNoteKey = string;

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

  /** Whether the reset confirmation modal is visible */
  const [showResetModal, setShowResetModal] = useState(false);

  /** Whether the import source-choice modal is visible */
  const [showImportModal, setShowImportModal] = useState(false);

  /** Whether the import merge/replace modal is visible (file path) */
  const [showImportModeModal, setShowImportModeModal] = useState(false);

  /** How-to docs modal and accordion state */
  const [showHowToDocsModal, setShowHowToDocsModal] = useState(false);
  const [expandedHowToDoc, setExpandedHowToDoc] = useState<HowToDocKey | null>(null);

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

  /** Load user on mount */
  useEffect(() => {
    const load = async () => {
      const [u, prefs] = await Promise.all([
        getOrCreateUser(),
        getUpdatePreferences(),
      ]);
      setUser(u);
      setEditName(u.displayName);
      setUpdatePrefs(prefs);
    };
    load();
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
    const data = (manifest ?? {}) as any;
    const metadata = (data.metadata ?? {}) as any;
    const extras = (data.extra ?? {}) as any;

    const id = typeof data.id === "string" ? data.id : "unknown";
    const createdAt = typeof data.createdAt === "string" ? data.createdAt : undefined;
    const runtimeVersion =
      typeof data.runtimeVersion === "string" ? data.runtimeVersion : undefined;

    const messageCandidates = [
      metadata.message,
      metadata.updateMessage,
      extras?.eas?.message,
      data.description,
      data.message,
    ];
    const message =
      messageCandidates.find((candidate) => typeof candidate === "string") ||
      "A new update is ready to install.";

    return { id, createdAt, runtimeVersion, message };
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
          (fetchResult as any).manifest || (checkResult as any).manifest || null;
        setPendingUpdate(extractUpdateMetadata(manifest));
      } catch (error: any) {
        if (source === "manual") {
          setInfoModal({
            title: "Update Check Failed",
            message:
              error?.message ||
              "Unable to check for updates right now. Please try again shortly.",
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

  const toggleHowToDoc = useCallback((key: HowToDocKey) => {
    setExpandedHowToDoc((current) => (current === key ? null : key));
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
    await deleteAccount();
    await getOrCreateUser();
    const freshUser = await completeOnboarding();
    await setPreferenceId(DEFAULT_CURRENCY_PREFERENCE_ID);
    setUser(freshUser);
    setEditName(freshUser.displayName);
    setInfoModal({ title: "Done", message: "All data has been reset successfully." });
  }, [setPreferenceId]);

  const handleExportData = useCallback(async () => {
    try {
      await exportAllData();
    } catch (error: any) {
      setInfoModal({
        title: "Export Failed",
        message: error?.message || "Something went wrong while exporting your data.",
      });
    }
  }, []);

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
   * File-picker: run the document picker with the chosen mode.
   */
  const confirmFileImport = useCallback(async (mode: "merge" | "replace") => {
    setShowImportModeModal(false);
    try {
      const result = await importData(mode);
      if (!result) return;
      const label = mode === "merge" ? "Merged" : "Imported";
      setInfoModal({
        title: "Import Complete",
        message: `${label} ${result.debts} debts, ${result.payments} payments, ${result.budgetEntries} budget entries, and ${result.budgetLimits} budget limits.`,
      });
    } catch (error: any) {
      setInfoModal({
        title: "Import Failed",
        message: error?.message || "Something went wrong while importing your data.",
      });
    }
  }, []);

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
      const run = async () => {
        try {
          const result = await importFromString(text, mode);
          setShowPasteModal(false);
          setPasteText("");
          const label = mode === "merge" ? "Merged" : "Imported";
          setInfoModal({
            title: "Import Complete",
            message: `${label} ${result.debts} debts, ${result.payments} payments, ${result.budgetEntries} budget entries, and ${result.budgetLimits} budget limits.`,
          });
        } catch (error: any) {
          setInfoModal({
            title: "Import Failed",
            message: error?.message || "Something went wrong while importing your data.",
          });
        }
      };
      run();
    },
    [pasteText]
  );

  if (!user) return null;

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
          {/* Avatar circle */}
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarText, { color: colors.white }]}>
              {user.displayName[0].toUpperCase()}
            </Text>
          </View>

          {/* Display name — tap to edit */}
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
                onChangeText={setEditName}
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
                Tap to edit
              </Text>
            </TouchableOpacity>
          )}

          {/* Anonymous ID badge */}
          <View style={[styles.idBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.idLabel, { color: colors.textMuted }]}>
              ACCOUNT ID
            </Text>
            <Text style={[styles.idValue, { color: colors.textDim }]}>
              {user.id.slice(0, 8)}...
            </Text>
          </View>
        </View>

        {/* ── Privacy Info ── */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.card,
              borderColor: `${colors.success}20`,
            },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            🔒 Privacy First
          </Text>
          <Text style={[styles.infoText, { color: colors.textDim }]}>
            Your data is stored locally on this device and is never sent to any
            server.
          </Text>
        </View>

        {/* ── Settings Section ── */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textMuted }]}>
            APPEARANCE
          </Text>

          <TouchableOpacity
            style={[
              styles.settingsRow,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
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
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}> 
              →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingsRow,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => setShowCurrencyModal(true)}
          >
            <View>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>Currency & Locale</Text>
              <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
                {preference.label}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textMuted }]}>APP UPDATES</Text>

          <TouchableOpacity
            style={[
              styles.settingsRow,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={toggleManualMode}
          >
            <View>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>Manual update mode (advanced)</Text>
              <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
                {updatePrefs.manualUpdateMode
                  ? "Checks happen only when requested"
                  : "Automatic checks are enabled"}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {updatePrefs.manualUpdateMode ? "On" : "Off"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingsRow,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
              isCheckingUpdates && { opacity: 0.7 },
            ]}
            onPress={() => checkForUpdates("manual")}
            disabled={isCheckingUpdates}
          >
            <View>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>Check for Updates</Text>
              <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>View metadata before installation</Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              {isCheckingUpdates ? "..." : "->"}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.settingsRow,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>Last Checked</Text>
              <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
                {formatDateTime(updatePrefs.lastCheckedAt)}
              </Text>
            </View>
          </View>

        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textMuted }]}>
            DATA MANAGEMENT
          </Text>

          <TouchableOpacity
            style={[
              styles.settingsRow,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={handleExportData}
          >
            <Text style={[styles.settingsRowText, { color: colors.text }]}>
              Export My Data
            </Text>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingsRow,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={handleImportData}
          >
            <Text style={[styles.settingsRowText, { color: colors.text }]}>
              Import My Data
            </Text>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingsRow,
              styles.dangerRow,
              { backgroundColor: colors.card },
            ]}
            onPress={handleResetData}
          >
            <Text style={[styles.settingsRowText, { color: colors.text }]}>
              Reset All Data
            </Text>
            <Text style={[styles.settingsRowArrow, { color: colors.text }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textMuted }]}>HOW TO DOCS</Text>

          <TouchableOpacity
            style={[
              styles.settingsRow,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => {
              setShowHowToDocsModal(true);
              setExpandedHowToDoc("export");
            }}
          >
            <View>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>Open How to Docs</Text>
              <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>Step-by-step instructions for import/export.</Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ── What's New ── */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textMuted }]}>
            WHAT'S NEW
          </Text>
          <View style={[styles.newsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.newsItem}>
              <View style={[styles.newsBadge, { backgroundColor: `${colors.accent}20` }]}>
                <Text style={[styles.newsBadgeText, { color: colors.accent }]}>v{latestRelease.version}</Text>
              </View>
              <Text style={[styles.newsTitle, { color: colors.text }]}>{latestRelease.title}</Text>
              {latestRelease.highlights.map((item) => (
                <Text key={item} style={[styles.newsBody, { color: colors.textDim }]}>- {item}</Text>
              ))}
            </View>
            <View style={[styles.newsDivider, { backgroundColor: colors.cardBorder }]} />
            <TouchableOpacity
              style={styles.newsHistoryBtn}
              onPress={() => setShowReleaseNotesModal(true)}
            >
              <Text style={[styles.newsHistoryBtnText, { color: colors.accent }]}>View release history</Text>
              <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── App Info ── */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textMuted }]}>
            BudgetArk v{CURRENT_APP_VERSION}
          </Text>
          <Text style={[styles.appInfoText, { color: colors.textMuted }]}>
            Built with React Native + Expo
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
                      backgroundColor:
                        themeId === preset.id
                          ? `${preset.colors.accent}10`
                          : "transparent",
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
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Release Notes</Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>Browse current and past versions.</Text>

            <View style={styles.faqList}>
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
            </View>

            <TouchableOpacity
              style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowReleaseNotesModal(false)}
            >
              <Text style={[styles.dialogBtnText, { color: colors.white }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── How To Docs Modal ── */}
      <Modal
        visible={showHowToDocsModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowHowToDocsModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>How to Docs</Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>Tap a topic to expand instructions.</Text>

            <View style={styles.faqList}>
              <TouchableOpacity
                style={[
                  styles.faqItem,
                  { backgroundColor: colors.bg, borderColor: colors.cardBorder },
                ]}
                onPress={() => toggleHowToDoc("export")}
              >
                <View style={styles.faqHeader}>
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>How do I export my data?</Text>
                  <Text style={[styles.faqArrow, { color: colors.textMuted }]}>
                    {expandedHowToDoc === "export" ? "v" : ">"}
                  </Text>
                </View>
                {expandedHowToDoc === "export" ? (
                  <Text style={[styles.faqAnswer, { color: colors.textDim }]}>Go to Data Management {">"} Export My Data, then save or share the JSON backup.</Text>
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.faqItem,
                  { backgroundColor: colors.bg, borderColor: colors.cardBorder },
                ]}
                onPress={() => toggleHowToDoc("import")}
              >
                <View style={styles.faqHeader}>
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>How do I import my data?</Text>
                  <Text style={[styles.faqArrow, { color: colors.textMuted }]}>
                    {expandedHowToDoc === "import" ? "v" : ">"}
                  </Text>
                </View>
                {expandedHowToDoc === "import" ? (
                  <Text style={[styles.faqAnswer, { color: colors.textDim }]}>Go to Data Management {">"} Import My Data, then choose Pick File or Paste Text.</Text>
                ) : null}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowHowToDocsModal(false)}
            >
              <Text style={[styles.dialogBtnText, { color: colors.white }]}>Done</Text>
            </TouchableOpacity>
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
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Update Ready</Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>Update ID: {pendingUpdate?.id}</Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>Message: {pendingUpdate?.message}</Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>Published: {formatDateTime(pendingUpdate?.createdAt)}</Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>Runtime: {pendingUpdate?.runtimeVersion || "Unknown"}</Text>
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
  },
  appLabel: {
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
  },

  /* Profile Card */
  profileCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginTop: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
  },
  displayName: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  editHint: {
    fontSize: 12,
    textAlign: "center",
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
  idBadge: {
    marginTop: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  idLabel: {
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 2,
  },
  idValue: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },

  /* Privacy Info */
  infoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
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
