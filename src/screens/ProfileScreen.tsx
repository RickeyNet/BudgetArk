/**
 * BudgetBuddy — Profile Screen
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
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { UserAccount } from "../types";
import {
  getOrCreateUser,
  updateDisplayName,
  deleteAccount,
} from "../storage/userStorage";
import { clearAllData } from "../storage/debtStorage";
import { exportAllData } from "../utils/exportData";
import { importData } from "../utils/importData";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemePreset } from "../theme/themes";

const ProfileScreen: React.FC = () => {
  /** Current theme context */
  const { colors, presets, themeId, setThemeId } = useTheme();

  /** Current user account state */
  const [user, setUser] = useState<UserAccount | null>(null);

  /** Editable display name (local state before saving) */
  const [editName, setEditName] = useState("");

  /** Whether the name input is in edit mode */
  const [isEditing, setIsEditing] = useState(false);

  /** Whether theme selector modal is visible */
  const [showThemeModal, setShowThemeModal] = useState(false);

  /** Load user on mount */
  useEffect(() => {
    const load = async () => {
      const u = await getOrCreateUser();
      setUser(u);
      setEditName(u.displayName);
    };
    load();
  }, []);

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
      setShowThemeModal(false);
    },
    [setThemeId]
  );

  /**
   * Resets all app data after user confirmation.
   * Clears debts, payments, and user account.
   * Creates a fresh anonymous account immediately after.
   */
  const handleResetData = useCallback(() => {
    Alert.alert(
      "Reset All Data",
      "This will permanently delete all your debts, payments, and account data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            await deleteAccount();
            const freshUser = await getOrCreateUser();
            setUser(freshUser);
            setEditName(freshUser.displayName);
          },
        },
      ]
    );
  }, []);

  const handleExportData = useCallback(async () => {
    try {
      await exportAllData();
    } catch (error: any) {
      Alert.alert(
        "Export Failed",
        error?.message || "Something went wrong while exporting your data."
      );
    }
  }, []);

  const handleImportData = useCallback(() => {
    Alert.alert(
      "Import Data",
      "How would you like to import? Merge keeps your existing data and adds the imported data. Replace wipes your current data first.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Merge",
          onPress: async () => {
            try {
              const result = await importData("merge");
              if (!result) return; // user cancelled picker
              Alert.alert(
                "Import Complete",
                `Merged ${result.debts} debts, ${result.payments} payments, ${result.budgetEntries} budget entries, and ${result.budgetLimits} budget limits.`
              );
            } catch (error: any) {
              Alert.alert(
                "Import Failed",
                error?.message || "Something went wrong while importing your data."
              );
            }
          },
        },
        {
          text: "Replace",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await importData("replace");
              if (!result) return;
              Alert.alert(
                "Import Complete",
                `Imported ${result.debts} debts, ${result.payments} payments, ${result.budgetEntries} budget entries, and ${result.budgetLimits} budget limits.`
              );
            } catch (error: any) {
              Alert.alert(
                "Import Failed",
                error?.message || "Something went wrong while importing your data."
              );
            }
          },
        },
      ]
    );
  }, []);

  if (!user) return null;

  /** Get current theme display name */
  const currentTheme = presets.find((p) => p.id === themeId);

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
      >
        {/* ── Header ── */}
        <View style={styles.titleSection}>
          <Text style={[styles.appLabel, { color: colors.textDim }]}>
            BUDGETARC
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

        {/* ── App Info ── */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textMuted }]}>
            BudgetArc v1.0.0
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
});

export default ProfileScreen;
