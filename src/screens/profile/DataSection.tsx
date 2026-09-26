/**
 * BudgetArk - Data Section
 * File: src/screens/profile/DataSection.tsx
 *
 * The DATA card (Export, Import, Automatic Backups, Reset) and every modal
 * in those flows. Export and Import are single rows that open a hub sheet
 * listing the concrete options (encrypted backup / spreadsheet; backup file /
 * pasted backup / spreadsheet / bank statement) - six rows collapsed to two,
 * so the card reads as four actions instead of a wall of import variants.
 * Beyond the hubs: export confirmation + blocking spinner, import
 * mode/password, spreadsheet format/mode/schema, paste import, and the reset
 * confirmation. Owns all flow-local state (passwords, paste text, in-flight
 * guards) so typing in these modals re-renders only this section.
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
import { useTranslation } from "react-i18next";
import { buildExportMessage, shareExportMessage } from "../../utils/exportData";
import { recordExport } from "../../storage/achievementStatsStorage";
import { useAchievements } from "../../achievements/AchievementsProvider";
import { useCustomCategories } from "../../categories/CustomCategoriesProvider";
import {
  importData,
  importFromString,
  isPasswordRequiredError,
  type ImportResult,
} from "../../utils/importData";
import {
  exportSpreadsheet,
  type SpreadsheetFormat,
} from "../../utils/spreadsheetExport";
import { waitForIosModalTeardown } from "../../utils/iosNativeShare";
import { importSpreadsheet } from "../../utils/spreadsheetImport";
import { openDocumentPicker } from "../../utils/importData";
import { File as ExpoFile } from "expo-file-system";
import {
  MAX_STATEMENT_FILE_BYTES,
  parseStatementCsv,
  statementHeaderSignature,
  type BankCsvMapping,
  type ParsedStatementFile,
} from "../../utils/bankCsvImport";
import {
  getRememberedStatementMapping,
} from "../../storage/statementImportMappingsStorage";
import BankStatementImportModal from "../../components/BankStatementImportModal";
import { listAutoBackups } from "../../services/autoBackup/autoBackupStore";
import { getAutoBackupSettings } from "../../storage/autoBackupSettingsStorage";
import AutoBackupModal from "../../components/AutoBackupModal";
import { KeyboardAwareModalOverlay } from "../../components/KeyboardAwareModalOverlay";
import SpreadsheetSchemaModal from "../../components/SpreadsheetSchemaModal";
import SheetModal, { useSheetStyles } from "../../components/SheetModal";
import { usePresentAfterDismiss } from "../../hooks/usePresentAfterDismiss";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

/**
 * Rows of the Export / Import hub sheets, in display order. Translation
 * keys are spelled out as literals (not built from the menu + id) so the
 * typed key tree checks every one.
 */
const HUB_OPTIONS = {
  export: [
    {
      id: "backup",
      title: "profile.data.exportMenu.backup.title",
      subtitle: "profile.data.exportMenu.backup.subtitle",
    },
    {
      id: "spreadsheet",
      title: "profile.data.exportMenu.spreadsheet.title",
      subtitle: "profile.data.exportMenu.spreadsheet.subtitle",
    },
  ],
  import: [
    {
      id: "backupFile",
      title: "profile.data.importMenu.backupFile.title",
      subtitle: "profile.data.importMenu.backupFile.subtitle",
    },
    {
      id: "backupPaste",
      title: "profile.data.importMenu.backupPaste.title",
      subtitle: "profile.data.importMenu.backupPaste.subtitle",
    },
    {
      id: "spreadsheet",
      title: "profile.data.importMenu.spreadsheet.title",
      subtitle: "profile.data.importMenu.spreadsheet.subtitle",
    },
    {
      id: "bankStatement",
      title: "profile.data.importMenu.bankStatement.title",
      subtitle: "profile.data.importMenu.bankStatement.subtitle",
    },
  ],
} as const;
type HubRow = (typeof HUB_OPTIONS)[keyof typeof HUB_OPTIONS][number];
type HubOption = HubRow["id"];

export type DataSectionHandle = {
  /** Opens the export confirmation modal (used by the backup banner). */
  openExport: () => void;
  /** Opens the bank-statement CSV picker (feature-spotlight deep link). */
  openBankStatementImport: () => void;
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
    const styles = useProfileStyles(tokens, colors);
    const { t, i18n } = useTranslation();

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

    /**
     * Which hub sheet is open: the Export row's option list, the Import
     * row's, or neither. Every option closes the hub first and presents its
     * own modal / picker after the dismiss animation (see openFromHub).
     */
    const [hub, setHub] = useState<"export" | "import" | null>(null);
    const presentAfterDismiss = usePresentAfterDismiss();
    const sheet = useSheetStyles();

    /**
     * Bank-statement CSV import: the parsed file + its remembered mapping,
     * held while the mapping-confirm modal is open. Null = modal closed.
     */
    const [statementImport, setStatementImport] = useState<{
      file: ParsedStatementFile;
      signature: string;
      remembered: { mapping: BankCsvMapping; accountLabel: string } | null;
      suggestedLabel: string;
    } | null>(null);

    /** Whether the import merge/replace modal is visible (file path) */
    const [showImportModeModal, setShowImportModeModal] = useState(false);

    /** Automatic Backups row subtext + management modal visibility. */
    const [autoBackupSummary, setAutoBackupSummary] = useState<string>(() =>
      t("profile.data.autoBackup.loading"),
    );
    const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);

    const refreshAutoBackupSummary = useCallback(async () => {
      try {
        const [settings, files] = await Promise.all([
          getAutoBackupSettings(),
          listAutoBackups(),
        ]);
        const newest = files[0] ?? null;
        const lastLabel = newest
          ? t("profile.data.autoBackup.lastOn", {
              date: new Date(newest.timestampMs).toLocaleDateString(i18n.language),
            })
          : t("profile.data.autoBackup.noneYet");
        setAutoBackupSummary(
          settings.enabled
            ? t("profile.data.autoBackup.summaryEnabled", {
                cadence: t(`profile.data.autoBackup.cadence.${settings.cadence}`),
                last: lastLabel,
              })
            : t("profile.data.autoBackup.summaryOff", { last: lastLabel }),
        );
      } catch {
        setAutoBackupSummary(t("profile.data.autoBackup.unavailable"));
      }
    }, [t, i18n.language]);

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

    const confirmExport = useCallback(async () => {
      if (exportEncrypt && exportPassword.length < 4) {
        showInfo({
          title: t("profile.data.export.passwordTooShort.title"),
          message: t("profile.data.export.passwordTooShort.message"),
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
          // can fail to fire its completion callback, leaving the share
          // promise pending forever - which is what stranded users on the
          // spinner. (shareExportMessage now writes a temp file and shares
          // it via expo-sharing - same path as the spreadsheet export - so
          // large backups no longer hit Android's Intent size ceiling.)
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
          title: t("profile.data.export.failed.title"),
          message: error?.message || t("profile.data.export.failed.message"),
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
      t,
    ]);

    /** Import row: open the hub listing the four import sources. */
    const handleImportData = useCallback(() => {
      setHub("import");
    }, []);

    /**
     * Close the hub, then run the chosen option once the sheet's dismiss
     * animation has finished - the iOS silent-present rule. Options that
     * open a document picker (bank statement) already wait out the
     * teardown themselves, so they pass `immediate`.
     */
    const openFromHub = useCallback(
      (present: () => void, opts: { immediate?: boolean } = {}) => {
        setHub(null);
        if (opts.immediate) {
          present();
          return;
        }
        presentAfterDismiss(present);
      },
      [presentAfterDismiss],
    );

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
          const sep = t("profile.data.import.listSeparator");
          const parts: string[] = [
            t("profile.data.import.counts.debts", { count: result.debts }),
            t("profile.data.import.counts.payments", { count: result.payments }),
            t("profile.data.import.counts.budgetEntries", { count: result.budgetEntries }),
            t("profile.data.import.counts.budgetLimits", { count: result.budgetLimits }),
          ];
          if (result.savingsGoals > 0)
            parts.push(t("profile.data.import.counts.savingsGoals", { count: result.savingsGoals }));
          if (result.assetAccounts > 0)
            parts.push(t("profile.data.import.counts.assetAccounts", { count: result.assetAccounts }));
          if (result.holdings > 0)
            parts.push(t("profile.data.import.counts.holdings", { count: result.holdings }));
          if (result.netWorthSnapshots > 0)
            parts.push(
              t("profile.data.import.counts.netWorthSnapshots", { count: result.netWorthSnapshots }),
            );
          if (result.customCategories > 0)
            parts.push(
              t("profile.data.import.counts.customCategories", { count: result.customCategories }),
            );
          if (result.businesses > 0)
            parts.push(t("profile.data.import.counts.businesses", { count: result.businesses }));
          if (result.people > 0)
            parts.push(t("profile.data.import.counts.people", { count: result.people }));
          const extras: string[] = [];
          if (result.debtMilestones) extras.push(t("profile.data.import.extras.milestonePlan"));
          if (result.payoffStrategy) extras.push(t("profile.data.import.extras.payoffStrategy"));
          let message: string = t("profile.data.import.summary", { label, parts: parts.join(sep) });
          if (extras.length > 0) {
            message += t("profile.data.import.alsoRestored", { extras: extras.join(sep) });
          }
          if (result.staleDays !== undefined && result.staleDays > 30) {
            message += t("profile.data.import.staleNote", { days: result.staleDays });
          }
          void refreshCustomCategories();
          triggerHaptic("success");
          showInfo({
            title: t("profile.data.import.complete.title"),
            message,
          });
        } catch (error: any) {
          if (isPasswordRequiredError(error)) {
            // Need password - stash the request and show the password prompt;
            // confirmImportPassword re-runs it with the entered password.
            setPendingImport({ importFn, label });
            setImportPassword("");
            setShowImportPasswordModal(true);
          } else {
            triggerHaptic("error");
            showInfo({
              title: t("profile.data.import.failed.title"),
              message: error?.message || t("profile.data.import.failed.message"),
            });
          }
        }
      },
      [refreshCustomCategories, showInfo, t],
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
        const label =
          mode === "merge"
            ? t("profile.data.import.labelMerged")
            : t("profile.data.import.labelImported");
        try {
          await executeImport((password) => importData(mode, password), label);
        } finally {
          importPickerInFlightRef.current = false;
        }
      },
      [executeImport, t],
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
          const formatLabel =
            format === "csv"
              ? t("profile.data.spreadsheet.export.dialog.csv")
              : t("profile.data.spreadsheet.export.dialog.excel");
          let note: string =
            format === "csv"
              ? t("profile.data.spreadsheet.export.csvNote")
              : t("profile.data.spreadsheet.export.excelNote", { count: result.entryCount });
          if (result.partial) {
            note += t("profile.data.spreadsheet.export.partialNote", {
              sections: result.missingSections.join(t("profile.data.import.listSeparator")),
            });
          }
          triggerHaptic("success");
          showInfo({
            title: t("profile.data.spreadsheet.export.readyTitle", { format: formatLabel }),
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
            title: t("profile.data.export.failed.title"),
            message: error?.message || t("profile.data.spreadsheet.export.failedMessage"),
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
        t,
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
        const label =
          mode === "merge"
            ? t("profile.data.import.labelMerged")
            : t("profile.data.import.labelImported");
        try {
          const result = await importSpreadsheet(mode);
          if (!result) return;
          const sep = t("profile.data.import.listSeparator");
          const parts: string[] = [
            t("profile.data.import.counts.budgetEntries", { count: result.budgetEntries }),
            t("profile.data.import.counts.limits", { count: result.budgetLimits }),
            t("profile.data.import.counts.debts", { count: result.debts }),
            t("profile.data.import.counts.payments", { count: result.payments }),
          ];
          if (result.savingsGoals > 0)
            parts.push(t("profile.data.import.counts.savingsGoals", { count: result.savingsGoals }));
          if (result.assetAccounts > 0)
            parts.push(t("profile.data.import.counts.assetAccounts", { count: result.assetAccounts }));
          if (result.holdings > 0)
            parts.push(t("profile.data.import.counts.holdings", { count: result.holdings }));
          let message: string = result.preset
            ? t("profile.data.spreadsheet.import.recognizedPreset", {
                preset: result.preset,
                label,
                parts: parts.join(sep),
              })
            : t("profile.data.spreadsheet.import.fromSpreadsheet", {
                label,
                parts: parts.join(sep),
              });
          if (result.preset && (result.presetDroppedRows ?? 0) > 0) {
            message += t("profile.data.spreadsheet.import.droppedRows", {
              count: result.presetDroppedRows ?? 0,
            });
          }
          if (result.skippedRows > 0) {
            message += t("profile.data.spreadsheet.import.skippedRows", {
              count: result.skippedRows,
            });
            // List the first few offending rows so the user can find and fix
            // them; cap the list so a very messy file doesn't fill the modal.
            const MAX_LISTED = 8;
            const shown = result.skippedRowDetails.slice(0, MAX_LISTED);
            for (const detail of shown) {
              message += t("profile.data.spreadsheet.import.skippedRowLine", {
                sheet: detail.sheet,
                descriptor: detail.descriptor,
                reason: detail.reason,
              });
            }
            const remaining = result.skippedRowDetails.length - shown.length;
            if (remaining > 0) {
              message += t("profile.data.spreadsheet.import.andMore", { count: remaining });
            }
          }
          if (result.staleDays !== undefined && result.staleDays > 30) {
            message += t("profile.data.spreadsheet.import.staleNote", { days: result.staleDays });
          }
          triggerHaptic("success");
          showInfo({
            title: t("profile.data.import.complete.title"),
            message,
          });
        } catch (error: any) {
          triggerHaptic("error");
          showInfo({
            title: t("profile.data.import.failed.title"),
            message: error?.message || t("profile.data.spreadsheet.import.failedMessage"),
          });
        } finally {
          importPickerInFlightRef.current = false;
        }
      },
      [showInfo, t],
    );

    /**
     * Bank-statement path: pick a CSV downloaded from a bank, parse it, and
     * open the mapping-confirm sheet. Shares the picker in-flight guard with
     * the other import handlers so a double-tap can't trip
     * expo-document-picker's "picking in progress" lock.
     */
    const handleImportBankStatement = useCallback(async () => {
      if (importPickerInFlightRef.current) return;
      importPickerInFlightRef.current = true;
      // Same iOS modal-teardown race as the other pickers: launching the
      // document picker over a dismissing <Modal> strands it.
      await waitForIosModalTeardown(350);
      try {
        const picked = await openDocumentPicker({
          type: ["text/csv", "text/comma-separated-values", "text/plain"],
          copyToCacheDirectory: true,
        });
        if (picked.canceled) return;
        const asset = picked.assets[0];
        if (!asset?.uri) throw new Error(t("profile.data.bankStatement.noFile"));
        const size = typeof asset.size === "number" ? asset.size : 0;
        if (size > MAX_STATEMENT_FILE_BYTES) {
          throw new Error(
            t("profile.data.bankStatement.tooLarge", {
              size: (size / 1024 / 1024).toFixed(1),
            }),
          );
        }
        const text = await new ExpoFile(asset.uri).text();
        const file = parseStatementCsv(text);
        const signature = statementHeaderSignature(file);
        const remembered = await getRememberedStatementMapping(signature);
        const suggestedLabel =
          remembered?.accountLabel ??
          (asset.name ?? "").replace(/\.[a-z0-9]+$/i, "").trim();
        setStatementImport({
          file,
          signature,
          remembered: remembered
            ? { mapping: remembered.mapping, accountLabel: remembered.accountLabel }
            : null,
          suggestedLabel,
        });
      } catch (error: any) {
        triggerHaptic("error");
        showInfo({
          title: t("profile.data.bankStatement.readFailed.title"),
          message: error?.message || t("profile.data.bankStatement.readFailed.message"),
        });
      } finally {
        importPickerInFlightRef.current = false;
      }
    }, [showInfo, t]);

    /** Route a tapped hub row to its flow. Wiring lives here, copy in i18n. */
    /** Rows for whichever hub is open (empty while closed / dismissing). */
    const hubRows: readonly HubRow[] = hub ? HUB_OPTIONS[hub] : [];

    const handleHubOption = useCallback(
      (option: HubOption) => {
        switch (option) {
          case "backup":
            openFromHub(handleExportData);
            return;
          case "spreadsheet":
            // Same id in both menus; the open hub decides which flow.
            openFromHub(
              hub === "export"
                ? handleExportSpreadsheet
                : handleImportSpreadsheet,
            );
            return;
          case "backupFile":
            openFromHub(() => setShowImportModeModal(true));
            return;
          case "backupPaste":
            openFromHub(() => {
              setPasteText("");
              setShowPasteModal(true);
            });
            return;
          case "bankStatement":
            // Waits out the modal teardown itself before the document picker.
            openFromHub(() => void handleImportBankStatement(), {
              immediate: true,
            });
            return;
        }
      },
      [
        hub,
        openFromHub,
        handleExportData,
        handleExportSpreadsheet,
        handleImportSpreadsheet,
        handleImportBankStatement,
      ],
    );

    useImperativeHandle(
      ref,
      () => ({
        openExport: handleExportData,
        openBankStatementImport: handleImportBankStatement,
      }),
      [handleExportData, handleImportBankStatement],
    );

    /**
     * Paste-text path: parse the pasted JSON and write to storage.
     */
    const handlePasteImport = useCallback(
      (mode: "merge" | "replace") => {
        const text = pasteText.trim();
        if (!text) {
          showInfo({
            title: t("profile.data.import.paste.empty.title"),
            message: t("profile.data.import.paste.empty.message"),
          });
          return;
        }
        setShowPasteModal(false);
        setPasteText("");
        const label =
          mode === "merge"
            ? t("profile.data.import.labelMerged")
            : t("profile.data.import.labelImported");
        executeImport(
          (password) => importFromString(text, mode, password),
          label,
        );
      },
      [pasteText, executeImport, showInfo, t],
    );

    return (
      <>
        {/* ── Data (Export, Import, Reset) ── */}
        <View style={styles.settingsSection}>
          <Text
            style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
          >
            {t("profile.data.sectionTitle")}
          </Text>

          <View
            style={[
              styles.groupedCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setHub("export")}
              accessibilityRole="button"
              accessibilityLabel={t("profile.data.rows.export.title")}
            >
              <View style={styles.rowTextWrap}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  {t("profile.data.rows.export.title")}
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {t("profile.data.rows.export.subtitle")}
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
              accessibilityRole="button"
              accessibilityLabel={t("profile.data.rows.import.title")}
            >
              <View style={styles.rowTextWrap}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  {t("profile.data.rows.import.title")}
                </Text>
                <Text
                  style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                >
                  {t("profile.data.rows.import.subtitle")}
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
                  {t("profile.data.rows.autoBackup.title")}
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
              onPress={() => setShowResetModal(true)}
            >
              <Text style={[styles.settingsRowText, { color: colors.danger }]}>
                {t("profile.data.rows.reset.title")}
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
                {t("profile.data.export.spinner.title")}
              </Text>
              <Text
                style={{
                  color: colors.textDim,
                  fontSize: 12,
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                {t("profile.data.export.spinner.subtitle")}
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
                {t("profile.data.export.dialog.title")}
              </Text>
              <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
                {exportEncrypt
                  ? t("profile.data.export.dialog.encryptedNote")
                  : t("profile.data.export.dialog.plaintextNote")}
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
                        color: colors.accentButtonText,
                        fontSize: 14,
                        fontWeight: "700",
                      }}
                    >
                      ✓
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: colors.text, fontSize: 14 }}>
                  {t("profile.data.export.dialog.encryptToggle")}
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
                  placeholder={t("profile.data.export.dialog.passwordPlaceholder")}
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
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                  onPress={confirmExport}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.accentButtonText }]}>
                    {exportEncrypt
                      ? t("profile.data.export.dialog.encryptAndShare")
                      : t("profile.data.export.dialog.sharePlaintext")}
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
                {t("profile.data.import.password.title")}
              </Text>
              <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
                {t("profile.data.import.password.message")}
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
                placeholder={t("profile.data.import.password.placeholder")}
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
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                  onPress={confirmImportPassword}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.accentButtonText }]}>
                    {t("profile.data.import.password.confirm")}
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
                {t("profile.data.reset.dialog.title")}
              </Text>
              <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
                {t("profile.data.reset.dialog.message")}
              </Text>
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                  onPress={() => setShowResetModal(false)}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                    {t("common.cancel")}
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
                    {t("profile.data.reset.dialog.confirm")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Import Source Modal ── */}
        {/* ── Export / Import hubs ──
            One sheet component, two option lists. Each option closes the
            sheet and hands off through openFromHub so the follow-up modal
            or picker never presents mid-dismiss. */}
        <SheetModal
          visible={hub !== null}
          onRequestClose={() => setHub(null)}
          footer={
            <TouchableOpacity
              style={sheet.closeButton}
              onPress={() => setHub(null)}
              accessibilityRole="button"
              accessibilityLabel={t("common.cancel")}
            >
              <Text style={sheet.closeText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          }
        >
          <Text style={sheet.title}>
            {hub === "export"
              ? t("profile.data.exportMenu.title")
              : t("profile.data.importMenu.title")}
          </Text>
          <View
            style={[
              styles.groupedCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            {hubRows.map(
              (option, index) => (
                <React.Fragment key={option.id}>
                  {index > 0 && (
                    <View
                      style={[
                        styles.groupedDivider,
                        { backgroundColor: colors.cardBorder },
                      ]}
                    />
                  )}
                  <TouchableOpacity
                    style={styles.groupedRow}
                    onPress={() => handleHubOption(option.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t(option.title)}
                  >
                    <View style={styles.rowTextWrap}>
                      <Text
                        style={[styles.settingsRowText, { color: colors.text }]}
                      >
                        {t(option.title)}
                      </Text>
                      <Text
                        style={[
                          styles.settingsRowSubtext,
                          { color: colors.textDim },
                        ]}
                      >
                        {t(option.subtitle)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.settingsRowArrow, { color: colors.textDim }]}
                    >
                      →
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ),
            )}
          </View>
        </SheetModal>

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
                {t("profile.data.import.mode.title")}
              </Text>
              <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
                {t("profile.data.import.mode.message")}
              </Text>
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                  onPress={() => setShowImportModeModal(false)}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.success }]}
                  onPress={() => confirmFileImport("merge")}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.bg }]}>
                    {t("profile.data.import.mode.merge")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.danger }]}
                  onPress={() => confirmFileImport("replace")}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.bg }]}>
                    {t("profile.data.import.mode.replace")}
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
                {t("profile.data.spreadsheet.export.dialog.title")}
              </Text>
              <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
                {t("profile.data.spreadsheet.export.dialog.message")}
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
                  {t("profile.data.spreadsheet.formatReference")}
                </Text>
              </TouchableOpacity>
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                  onPress={closeSpreadsheetExportModal}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                  onPress={() => confirmSpreadsheetExport("csv")}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.accentButtonText }]}>
                    {t("profile.data.spreadsheet.export.dialog.csv")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                  onPress={() => confirmSpreadsheetExport("xlsx")}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.accentButtonText }]}>
                    {t("profile.data.spreadsheet.export.dialog.excel")}
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
                {t("profile.data.spreadsheet.import.dialog.title")}
              </Text>
              <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
                {t("profile.data.spreadsheet.import.dialog.message")}
              </Text>
              <Text style={[styles.dialogTip, { color: colors.textMuted }]}>
                {t("profile.data.spreadsheet.import.dialog.tip")}
              </Text>
              <TouchableOpacity
                style={styles.dialogLinkRow}
                onPress={() => {
                  setShowSpreadsheetImportModal(false);
                  setShowSpreadsheetSchemaModal(true);
                }}
              >
                <Text style={[styles.dialogLinkText, { color: colors.accent }]}>
                  {t("profile.data.spreadsheet.formatReference")}
                </Text>
              </TouchableOpacity>
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                  onPress={() => setShowSpreadsheetImportModal(false)}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.success }]}
                  onPress={() => confirmSpreadsheetImport("merge")}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.bg }]}>
                    {t("profile.data.import.mode.merge")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.danger }]}
                  onPress={() => confirmSpreadsheetImport("replace")}
                >
                  <Text style={[styles.dialogBtnText, { color: colors.bg }]}>
                    {t("profile.data.import.mode.replace")}
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

        {/* ── Bank Statement Import Modal ── */}
        <BankStatementImportModal
          visible={statementImport !== null}
          file={statementImport?.file ?? null}
          signature={statementImport?.signature ?? ""}
          remembered={statementImport?.remembered ?? null}
          suggestedLabel={statementImport?.suggestedLabel}
          onClose={() => setStatementImport(null)}
          onImported={(message) => {
            triggerHaptic("success");
            showInfo({ title: t("profile.data.bankStatement.importedTitle"), message });
          }}
          onError={(message) => {
            triggerHaptic("error");
            showInfo({ title: t("profile.data.import.failed.title"), message });
          }}
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
                {t("profile.data.import.paste.title")}
              </Text>
              <Text style={[styles.pasteHint, { color: colors.textDim }]}>
                {t("profile.data.import.paste.hint")}
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
                placeholder={t("profile.data.import.paste.placeholder")}
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
                    {t("profile.data.import.mode.merge")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pasteBtn, { backgroundColor: colors.danger }]}
                  onPress={() => handlePasteImport("replace")}
                >
                  <Text style={[styles.pasteBtnText, { color: colors.bg }]}>
                    {t("profile.data.import.mode.replace")}
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
                  {t("common.cancel")}
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
