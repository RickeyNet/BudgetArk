/**
 * BudgetArk - Automatic Backups Modal
 * File: src/components/AutoBackupModal.tsx
 *
 * Profile → Data → Automatic Backups. Toggle + cadence for the scheduled
 * local backup, a Back Up Now button, and the on-phone backup list with a
 * restore flow (merge or replace, confirmed inline - no stacked modals).
 * Mounted only while open; the parent refreshes its row subtext on close.
 *
 * Restores feed the decrypted export JSON through the same importFromString
 * path as manual imports, so validation, bounds, and merge semantics are
 * identical.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  type AutoBackupCadence,
  type AutoBackupFileInfo,
  type AutoBackupSettings,
  cadenceLabel,
  formatBackupSize,
} from "../services/autoBackup/autoBackupPlan";
import {
  createAutoBackupNow,
  runAutoBackupIfDue,
} from "../services/autoBackup/autoBackupRunner";
import { listAutoBackups, readAutoBackupJson } from "../services/autoBackup/autoBackupStore";
import { getAutoBackupSettings, setAutoBackupSettings } from "../storage/autoBackupSettingsStorage";
import { importFromString, type ImportResult } from "../utils/importData";
import { useCustomCategories } from "../categories/CustomCategoriesProvider";
import { useAchievements } from "../achievements/AchievementsProvider";
import { waitForIosModalTeardown } from "../utils/iosNativeShare";
import { triggerHaptic } from "../utils/haptics";

type AutoBackupModalProps = {
  onClose: () => void;
  /** Surface the restore result via ProfileScreen's shared info modal. */
  showInfo: (info: { title: string; message: string }) => void;
};

const summarizeRestore = (result: ImportResult): string => {
  const parts = [
    `${result.debts} debts`,
    `${result.payments} payments`,
    `${result.budgetEntries} budget entries`,
    `${result.budgetLimits} budget limits`,
  ];
  if (result.savingsGoals > 0) parts.push(`${result.savingsGoals} savings goals`);
  if (result.assetAccounts > 0) parts.push(`${result.assetAccounts} asset accounts`);
  if (result.holdings > 0) parts.push(`${result.holdings} holdings`);
  if (result.customCategories > 0) parts.push(`${result.customCategories} custom categories`);
  if (result.businesses > 0) parts.push(`${result.businesses} businesses`);
  if (result.people > 0) parts.push(`${result.people} people`);
  return `Restored ${parts.join(", ")}.`;
};

const AutoBackupModal: React.FC<AutoBackupModalProps> = ({
  onClose,
  showInfo,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const { refresh: refreshCustomCategories } = useCustomCategories();
  const { runCheck: refreshAchievements } = useAchievements();

  const [settings, setSettings] = useState<AutoBackupSettings | null>(null);
  const [files, setFiles] = useState<AutoBackupFileInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [inlineNote, setInlineNote] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  /** Backup name awaiting the inline merge/replace confirmation. */
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [loadedSettings, loadedFiles] = await Promise.all([
      getAutoBackupSettings(),
      listAutoBackups(),
    ]);
    setSettings(loadedSettings);
    setFiles(loadedFiles);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getAutoBackupSettings(), listAutoBackups()]).then(
      ([loadedSettings, loadedFiles]) => {
        if (cancelled) return;
        setSettings(loadedSettings);
        setFiles(loadedFiles);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    async (next: AutoBackupSettings) => {
      setSettings(next);
      setInlineError(null);
      try {
        await setAutoBackupSettings(next);
        if (next.enabled) {
          // Turning it on (or shortening the cadence) may make a backup
          // immediately due - honor that now instead of at the next launch.
          await runAutoBackupIfDue();
          await refresh();
        }
      } catch {
        setInlineError("Couldn't save the setting. Please try again.");
      }
    },
    [refresh]
  );

  const handleToggle = useCallback(() => {
    if (!settings || busy) return;
    triggerHaptic("selection");
    void persist({ ...settings, enabled: !settings.enabled });
  }, [busy, persist, settings]);

  const handleCadence = useCallback(
    (cadence: AutoBackupCadence) => {
      if (!settings || busy || settings.cadence === cadence) return;
      triggerHaptic("selection");
      void persist({ ...settings, cadence });
    },
    [busy, persist, settings]
  );

  const handleBackupNow = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setInlineNote(null);
    setInlineError(null);
    try {
      await createAutoBackupNow();
      await refresh();
      triggerHaptic("success");
      setInlineNote("Backed up just now.");
    } catch {
      triggerHaptic("error");
      setInlineError(
        "Couldn't write the backup. If this keeps happening, your phone's secure storage may be unavailable."
      );
    } finally {
      setBusy(false);
    }
  }, [busy, refresh]);

  const handleRestore = useCallback(
    async (name: string, mode: "merge" | "replace") => {
      if (busy) return;
      setBusy(true);
      setInlineError(null);
      try {
        const json = await readAutoBackupJson(name);
        if (json === null) {
          throw new Error(
            "This backup could not be read. It may be damaged, or it was made before the app's encryption key changed."
          );
        }
        const result = await importFromString(json, mode);
        void refreshCustomCategories();
        triggerHaptic("success");
        onClose();
        await waitForIosModalTeardown(350);
        showInfo({
          title: "Backup Restored",
          message: summarizeRestore(result),
        });
        // Deferred like DataSection's export flow: the unlock celebration
        // is a Modal and must not present mid-teardown.
        setTimeout(() => {
          void refreshAchievements();
        }, 500);
      } catch (error) {
        triggerHaptic("error");
        setInlineError(
          error instanceof Error && error.message
            ? error.message
            : "Something went wrong while restoring."
        );
        setBusy(false);
        setRestoreTarget(null);
        return;
      }
      setBusy(false);
    },
    [busy, onClose, refreshAchievements, refreshCustomCategories, showInfo]
  );

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View
        style={[
          styles.screen,
          {
            backgroundColor: colors.bg,
            paddingTop: insets.top + tokens.pad,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            Automatic Backups
          </Text>
          <TouchableOpacity
            onPress={onClose}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Close automatic backups"
          >
            <Text style={[styles.closeText, { color: colors.textDim }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.intro, { color: colors.textDim }]}>
            BudgetArk can quietly save an encrypted copy of your data inside
            its own storage on this phone, so a bad import or an accidental
            delete is never the end of the story.
          </Text>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity style={styles.row} onPress={handleToggle}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowText, { color: colors.text }]}>
                  Automatic backups
                </Text>
                <Text style={[styles.rowSubtext, { color: colors.textDim }]}>
                  {settings?.enabled
                    ? `${cadenceLabel(settings.cadence)}, keeping the last 3`
                    : "Off - only manual backups"}
                </Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.textDim }]}>
                {settings?.enabled ? "On" : "Off"}
              </Text>
            </TouchableOpacity>

            {settings?.enabled ? (
              <View style={styles.cadenceRow}>
                {(["weekly", "monthly"] as const).map((cadence) => {
                  const selected = settings.cadence === cadence;
                  return (
                    <TouchableOpacity
                      key={cadence}
                      style={[
                        styles.cadenceChip,
                        {
                          backgroundColor: selected ? colors.accent : colors.bg,
                          borderColor: selected
                            ? colors.accent
                            : colors.cardBorder,
                        },
                      ]}
                      onPress={() => handleCadence(cadence)}
                      accessibilityRole="button"
                      accessibilityLabel={`Back up ${cadenceLabel(cadence).toLowerCase()}`}
                    >
                      <Text
                        style={[
                          styles.cadenceChipText,
                          { color: selected ? colors.white : colors.text },
                        ]}
                      >
                        {cadenceLabel(cadence)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.backupNowButton,
              { backgroundColor: colors.accent },
              busy && { opacity: 0.7 },
            ]}
            onPress={handleBackupNow}
            disabled={busy || settings === null}
          >
            {busy && restoreTarget === null ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.backupNowText, { color: colors.white }]}>
                Back Up Now
              </Text>
            )}
          </TouchableOpacity>

          {inlineNote ? (
            <Text style={[styles.inlineNote, { color: colors.success }]}>
              {inlineNote}
            </Text>
          ) : null}
          {inlineError ? (
            <Text style={[styles.inlineNote, { color: colors.danger }]}>
              {inlineError}
            </Text>
          ) : null}

          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            BACKUPS ON THIS PHONE
          </Text>

          {files.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textDim }]}>
              No backups yet.
              {settings?.enabled
                ? " The first one is written automatically, or tap Back Up Now."
                : " Turn automatic backups on, or tap Back Up Now."}
            </Text>
          ) : (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              {files.map((file, index) => {
                const size = formatBackupSize(file.sizeBytes);
                const isTarget = restoreTarget === file.name;
                return (
                  <View key={file.name}>
                    {index > 0 ? (
                      <View
                        style={[
                          styles.divider,
                          { backgroundColor: colors.cardBorder },
                        ]}
                      />
                    ) : null}
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() => {
                        setInlineError(null);
                        setRestoreTarget(isTarget ? null : file.name);
                      }}
                      disabled={busy}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowText, { color: colors.text }]}>
                          {new Date(file.timestampMs).toLocaleString()}
                        </Text>
                        <Text
                          style={[styles.rowSubtext, { color: colors.textDim }]}
                        >
                          {index === 0 ? "Most recent" : "Older backup"}
                          {size ? ` · ${size}` : ""}
                        </Text>
                      </View>
                      <Text style={[styles.rowValue, { color: colors.accent }]}>
                        Restore
                      </Text>
                    </TouchableOpacity>
                    {isTarget ? (
                      <View style={styles.restoreConfirm}>
                        <Text
                          style={[styles.restoreText, { color: colors.textDim }]}
                        >
                          Merge adds anything missing and keeps newer edits.
                          Replace erases what's on the phone now and restores
                          exactly this backup.
                        </Text>
                        <View style={styles.restoreButtons}>
                          <TouchableOpacity
                            style={[
                              styles.restoreButton,
                              { backgroundColor: colors.accent },
                            ]}
                            onPress={() => void handleRestore(file.name, "merge")}
                            disabled={busy}
                          >
                            {busy && isTarget ? (
                              <ActivityIndicator color={colors.white} />
                            ) : (
                              <Text
                                style={[
                                  styles.restoreButtonText,
                                  { color: colors.white },
                                ]}
                              >
                                Merge
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.restoreButton,
                              { backgroundColor: colors.dangerDim },
                            ]}
                            onPress={() =>
                              void handleRestore(file.name, "replace")
                            }
                            disabled={busy}
                          >
                            <Text
                              style={[
                                styles.restoreButtonText,
                                { color: colors.danger },
                              ]}
                            >
                              Replace
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.restoreButton,
                              { backgroundColor: colors.bg },
                            ]}
                            onPress={() => setRestoreTarget(null)}
                            disabled={busy}
                          >
                            <Text
                              style={[
                                styles.restoreButtonText,
                                { color: colors.textDim },
                              ]}
                            >
                              Cancel
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          <Text style={[styles.caution, { color: colors.textMuted }]}>
            These backups are encrypted like everything else and never leave
            your phone - but they're deleted if you uninstall the app, and
            they can't be read on another device. For moving phones or an
            off-device copy, use Export.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: tokens.pad,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: tokens.gap,
    },
    title: {
      fontSize: 19 * tokens.fontScale,
      fontWeight: "700",
    },
    closeText: {
      fontSize: 15 * tokens.fontScale,
      fontWeight: "600",
      padding: 4,
    },
    scrollContent: {
      paddingBottom: tokens.pad * 2,
    },
    intro: {
      fontSize: 13 * tokens.fontScale,
      lineHeight: 19 * tokens.fontScale,
      marginBottom: tokens.gap,
    },
    card: {
      borderWidth: 1,
      borderRadius: tokens.radius,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: tokens.pad,
      paddingVertical: 12,
    },
    rowText: {
      fontSize: 15 * tokens.fontScale,
      fontWeight: "600",
    },
    rowSubtext: {
      fontSize: 12 * tokens.fontScale,
      marginTop: 2,
    },
    rowValue: {
      fontSize: 14 * tokens.fontScale,
      fontWeight: "600",
      marginLeft: tokens.gap,
    },
    cadenceRow: {
      flexDirection: "row",
      gap: tokens.gap,
      paddingHorizontal: tokens.pad,
      paddingBottom: 12,
    },
    cadenceChip: {
      borderWidth: 1,
      borderRadius: tokens.radiusPill,
      paddingHorizontal: 16,
      paddingVertical: 7,
    },
    cadenceChipText: {
      fontSize: 13 * tokens.fontScale,
      fontWeight: "600",
    },
    backupNowButton: {
      borderRadius: tokens.radius,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: tokens.gap,
    },
    backupNowText: {
      fontSize: 15 * tokens.fontScale,
      fontWeight: "700",
    },
    inlineNote: {
      fontSize: 13 * tokens.fontScale,
      fontWeight: "600",
      textAlign: "center",
      marginTop: tokens.gap,
    },
    sectionTitle: {
      fontSize: 12 * tokens.fontScale,
      fontWeight: "700",
      letterSpacing: 0.8,
      marginTop: tokens.gap * 2,
      marginBottom: tokens.gap,
    },
    emptyText: {
      fontSize: 13 * tokens.fontScale,
      lineHeight: 19 * tokens.fontScale,
    },
    divider: {
      height: 1,
      marginHorizontal: tokens.pad,
    },
    restoreConfirm: {
      paddingHorizontal: tokens.pad,
      paddingBottom: 12,
    },
    restoreText: {
      fontSize: 12 * tokens.fontScale,
      lineHeight: 17 * tokens.fontScale,
      marginBottom: 10,
    },
    restoreButtons: {
      flexDirection: "row",
      gap: tokens.gap,
    },
    restoreButton: {
      flex: 1,
      borderRadius: tokens.radiusSm,
      paddingVertical: 10,
      alignItems: "center",
    },
    restoreButtonText: {
      fontSize: 13 * tokens.fontScale,
      fontWeight: "700",
    },
    caution: {
      fontSize: 12 * tokens.fontScale,
      lineHeight: 17 * tokens.fontScale,
      marginTop: tokens.gap * 2,
    },
  });

export default AutoBackupModal;
