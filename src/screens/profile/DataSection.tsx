/**
 * BudgetArk - Data Section
 * File: src/screens/profile/DataSection.tsx
 *
 * The DATA card (export, import, spreadsheet export/import, reset) and every
 * modal in those flows: export confirmation + blocking spinner, import
 * source/mode/password, spreadsheet format/mode/schema, paste import, and
 * the reset confirmation. Owns all flow-local state (passwords, paste text,
 * in-flight guards) so typing in these modals re-renders only this section.
 * The reset itself stays in ProfileScreen (it clears pairing, user, and
 * reminder state owned there); exposes openExport() through a ref so the
 * backup reminder banner can start an export.
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { buildExportMessage, shareExportMessage } from "../../utils/exportData";
import { recordExport } from "../../storage/achievementStatsStorage";
import { useAchievements } from "../../achievements/AchievementsProvider";
import { useCustomCategories } from "../../categories/CustomCategoriesProvider";
import {
  importData,
  importFromString,
  type ImportResult,
} from "../../utils/importData";
import {
  exportSpreadsheet,
  type SpreadsheetFormat,
} from "../../utils/spreadsheetExport";
import { waitForIosModalTeardown } from "../../utils/iosNativeShare";
import { importSpreadsheet } from "../../utils/spreadsheetImport";
import { listAutoBackups } from "../../services/autoBackup/autoBackupStore";
import { cadenceLabel } from "../../services/autoBackup/autoBackupPlan";
import { getAutoBackupSettings } from "../../storage/autoBackupSettingsStorage";
import AutoBackupModal from "../../components/AutoBackupModal";
import { KeyboardAwareModalOverlay } from "../../components/KeyboardAwareModalOverlay";
import SpreadsheetSchemaModal from "../../components/SpreadsheetSchemaModal";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

export type DataSectionHandle = {
  /** Opens the export confirmation modal (used by the backup banner). */
  openExport: () => void;
};

type DataSectionProps = {
  showInfo: (info: { title: string; message: string }) => void;
  /** Re-reads the backup reminder state after a successful export. */
  onRefreshBackupState: () => Promise<void>;
  /** Runs the full data reset (owned by ProfileScreen). */
  onConfirmReset: () => Promise<void>;
};

const DataSection = forwardRef<DataSectionHandle, DataSectionProps>(
  ({ showInfo, onRefreshBackupState, onConfirmReset }, ref) => {
    const { colors } = useTheme();
    const { tokens } = useDensity();
    const styles = useProfileStyles(tokens);

    const { runCheck: refreshAchievements } = useAchievements();
    const { refresh: refreshCustomCategories } = useCustomCategories();

    const spreadsheetExportInFlightRef = useRef(false);
    const spreadsheetExportOpIdRef = useRef(0);
    // Guards both file and spreadsheet import handlers: a double-tap on the
    // merge/replace button during the modal-dismiss window would otherwise
    // fire the document picker twice and trip expo-document-picker's
    // "Different document picking in progress" lock-up. One shared ref also
    // stops launching the spreadsheet picker while the file picker is still
    // open (or vice versa).
    const importPickerInFlightRef = useRef(false);

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
    const [showImportPasswordModal, setShowImportPasswordModal] =
      useState(false);
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

    /** Automatic Backups row subtext + management modal visibility. */
    const [autoBackupSummary, setAutoBackupSummary] = useState("Loading...");
    const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);

    const refreshAutoBackupSummary = useCallback(async () => {
      try {
        const [settings, files] = await Promise.all([
          getAutoBackupSettings(),
          listAutoBackups(),
        ]);
        const newest = files[0] ?? null;
        const lastLabel = newest
          ? `last ${new Date(newest.timestampMs).toLocaleDateString()}`
          : "none yet";
        setAutoBackupSummary(
          settings.enabled
            ? `${cadenceLabel(settings.cadence)} · ${lastLabel}`
            : `Off · ${lastLabel}`,
        );
      } catch {
        setAutoBackupSummary("Unavailable");
      }
    }, []);

    useFocusEffect(
      useCallback(() => {
        // The launch-time runner may have just written a backup; keep the
        // row honest every time the tab regains focus.
        void refreshAutoBackupSummary();
        return undefined;
      }, [refreshAutoBackupSummary]),
    );

    const closeAutoBackupModal = useCallback(() => {
      setShowAutoBackupModal(false);
      void refreshAutoBackupSummary();
    }, [refreshAutoBackupSummary]);

    /** Spreadsheet export format-picker modal */
    const [showSpreadsheetExportModal, setShowSpreadsheetExportModal] =
      useState(false);

    /** Spreadsheet import merge/replace modal */
    const [showSpreadsheetImportModal, setShowSpreadsheetImportModal] =
      useState(false);

    /** Spreadsheet format reference modal (shared by import and export flows) */
    const [showSpreadsheetSchemaModal, setShowSpreadsheetSchemaModal] =
      useState(false);

    const handleExportData = useCallback(() => {
      setExportEncrypt(true);
      setExportPassword("");
      setShowExportModal(true);
    }, []);

    useImperativeHandle(ref, () => ({ openExport: handleExportData }), [
      handleExportData,
    ]);

    const confirmExport = useCallback(async () => {
      if (exportEncrypt && exportPassword.length < 4) {
        showInfo({
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
        await onRefreshBackupState();
        await recordExport();
        exported = true;
      } catch (error: any) {
        triggerHaptic("error");
        showInfo({
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
    }, [
      exportEncrypt,
      exportPassword,
      onRefreshBackupState,
      refreshAchievements,
      showInfo,
    ]);

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
          if (result.businesses > 0)
            parts.push(`${result.businesses} businesses`);
          if (result.people > 0) parts.push(`${result.people} people`);
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
          showInfo({
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
            showInfo({
              title: "Import Failed",
              message:
                error?.message ||
                "Something went wrong while importing your data.",
            });
          }
        }
      },
      [refreshCustomCategories, showInfo],
    );

    const confirmImportPassword = useCallback(() => {
      if (!pendingImport) return;
      setShowImportPasswordModal(false);
      void executeImport(
        pendingImport.importFn,
        pendingImport.label,
        importPassword,
      );
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
          showInfo({
            title: `${formatLabel} Export Ready`,
            message: note,
          });
          await onRefreshBackupState();
          if (!isActiveOp()) return;
          await recordExport();
          if (!isActiveOp()) return;
          exported = true;
        } catch (error: any) {
          if (!isActiveOp()) return;
          triggerHaptic("error");
          showInfo({
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
      [
        closeSpreadsheetExportModal,
        onRefreshBackupState,
        refreshAchievements,
        showInfo,
      ],
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
          showInfo({
            title: "Import Complete",
            message,
          });
        } catch (error: any) {
          triggerHaptic("error");
          showInfo({
            title: "Import Failed",
            message:
              error?.message ||
              "Something went wrong while importing the spreadsheet.",
          });
        } finally {
          importPickerInFlightRef.current = false;
        }
      },
      [showInfo],
    );

    /**
     * Paste-text path: parse the pasted JSON and write to storage.
     */
    const handlePasteImport = useCallback(
      (mode: "merge" | "replace") => {
        const text = pasteText.trim();
        if (!text) {
          showInfo({
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
      [pasteText, executeImport, showInfo],
    );

    return (
      <>
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
              onPress={() => setShowAutoBackupModal(true)}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Automatic Backups
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {autoBackupSummary}
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
              onPress={() => setShowResetModal(true)}
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

        {/* ── Exporting Spinner Overlay ──
            Blocking, non-dismissable. The native ActivityIndicator keeps
            animating on the UI thread even while the JS thread is frozen by
            the synchronous PBKDF2 key derivation, so the user sees clear
            "working" feedback instead of a dead screen. */}
        <Modal
          visible={isExporting}
          animationType="fade"
          transparent
          presentationStyle={
            Platform.OS === "ios" ? "overFullScreen" : undefined
          }
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
                    borderColor: exportEncrypt
                      ? colors.accent
                      : colors.textMuted,
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
                This will permanently delete all your debts, payments, and
                account data. This cannot be undone.
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
                  onPress={() => {
                    // Close first, then run the parent-owned reset - same
                    // order as the original confirmReset.
                    setShowResetModal(false);
                    void onConfirmReset();
                  }}
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
                Merge keeps your existing data and adds the imported data.
                Replace wipes your current data first.
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
          presentationStyle={
            Platform.OS === "ios" ? "overFullScreen" : undefined
          }
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

        {/* ── Automatic Backups Modal ── */}
        {showAutoBackupModal ? (
          <AutoBackupModal onClose={closeAutoBackupModal} showInfo={showInfo} />
        ) : null}

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
      </>
    );
  },
);

DataSection.displayName = "DataSection";

export default DataSection;
