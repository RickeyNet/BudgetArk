/**
 * BudgetArk - Business Expense Report
 * File: src/components/BusinessReportModal.tsx
 *
 * Tax-time view: per-business expense totals for one calendar year, with a
 * category breakdown and a one-way CSV export. Data is loaded on open and
 * aggregated by the pure helpers in utils/businessReport.ts. Business
 * expenses stay in the personal budget math everywhere else - this modal is
 * the separated view.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { File as ExpoFile, Paths } from "expo-file-system";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useCurrency } from "../currency/CurrencyProvider";
import { getBudgetEntries } from "../storage/budgetStorage";
import { useBusinesses } from "../people/PeopleProvider";
import { useCategoryLabel } from "../i18n/categoryLabel";
import {
  buildBusinessReportCsv,
  computeBusinessReport,
  type BusinessReport,
} from "../utils/businessReport";
import { shareLocalFile } from "../utils/iosNativeShare";
import { shareLocalFileThenDelete } from "../utils/shareTempFile";
import { useValueChanged } from "../hooks/useValueChanged";
import {
  buildReceiptZip,
  countPlannedReceipts,
  deleteReceiptZip,
} from "../services/attachments/receiptZipExport";
import type { BudgetEntry } from "../types";

interface BusinessReportModalProps {
  visible: boolean;
  onClose: () => void;
}

const BusinessReportModal: React.FC<BusinessReportModalProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { formatCurrency } = useCurrency();

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const { businessesIncludingDeleted: businesses } = useBusinesses();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loaded, setLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);

  // Render-time adjustment: drop the previous open's data on a fresh open
  // so stale totals don't flash while the reload below is in flight.
  if (useValueChanged(visible) && visible && loaded) {
    setLoaded(false);
  }

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void (async () => {
      try {
        const storedEntries = await getBudgetEntries();
        if (cancelled) return;
        setEntries(storedEntries);
      } catch (error) {
        // Show an empty report rather than a stuck "Loading…" screen.
        if (cancelled) return;
        if (__DEV__) console.error("Business report load failed:", error);
        setEntries([]);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const report: BusinessReport = useMemo(
    () => computeBusinessReport(entries, businesses, year),
    [businesses, entries, year]
  );

  const handleExportCsv = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const csv = buildBusinessReportCsv(report);
      const filename = `budgetark-business-expenses-${report.year}.csv`;
      const fileDir = Platform.OS === "ios" ? Paths.document : Paths.cache;
      const file = new ExpoFile(fileDir, filename);
      file.create({ overwrite: true });
      file.write(csv, { encoding: "utf8" });
      // Plaintext expense data - deleted once the share sheet closes.
      await shareLocalFileThenDelete(file, {
        mimeType: "text/csv",
        dialogTitle: t("modals.people.businessReport.shareTitle"),
        UTI: "public.comma-separated-values-text",
      });
    } catch (error: any) {
      Alert.alert(
        t("modals.people.report.exportFailed.title"),
        error?.message || t("modals.people.report.exportFailed.csv")
      );
    } finally {
      setExporting(false);
    }
  }, [exporting, report, t]);

  const runZipExport = useCallback(async () => {
    setExportingZip(true);
    try {
      const result = await buildReceiptZip(report, entries);
      if (!result.file) {
        Alert.alert(
          t("modals.people.businessReport.receipts.noneOnDevice.title"),
          t("modals.people.businessReport.receipts.noneOnDevice.message")
        );
        return;
      }
      try {
        await shareLocalFile(result.file.uri, {
          mimeType: "application/zip",
          dialogTitle: t("modals.people.businessReport.receipts.shareTitle"),
          UTI: "public.zip-archive",
        });
      } finally {
        // The archive holds decrypted photos - don't leave it on disk once
        // the share sheet is done with it.
        deleteReceiptZip(result.file);
      }
      if (result.missing > 0) {
        Alert.alert(
          t("modals.people.businessReport.receipts.skipped.title"),
          t("modals.people.businessReport.receipts.skipped.message", {
            count: result.missing,
          })
        );
      }
    } catch (error: any) {
      Alert.alert(
        t("modals.people.report.exportFailed.title"),
        error?.message || t("modals.people.report.exportFailed.zip")
      );
    } finally {
      setExportingZip(false);
    }
  }, [entries, report, t]);

  const handleExportReceipts = useCallback(() => {
    if (exportingZip) return;
    const planned = countPlannedReceipts(report, entries);
    if (planned === 0) {
      Alert.alert(
        t("modals.people.businessReport.receipts.none.title"),
        t("modals.people.businessReport.receipts.none.message", { year: report.year })
      );
      return;
    }
    // Photos are encrypted at rest and never leave the device otherwise -
    // make the decrypt-and-share step an explicit, informed choice.
    Alert.alert(
      t("modals.people.businessReport.receipts.confirm.title"),
      t("modals.people.businessReport.receipts.confirm.message", {
        count: planned,
        year: report.year,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("modals.people.businessReport.receipts.confirm.export"),
          onPress: () => void runZipExport(),
        },
      ]
    );
  }, [entries, exportingZip, report, runZipExport, t]);

  const hasData = report.perBusiness.length > 0;
  const hasReceipts = report.perBusiness.some((g) => g.receiptCount > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalSheet}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.title}>{t("modals.people.businessReport.title")}</Text>
            <Text style={styles.subtitle}>{t("modals.people.businessReport.subtitle")}</Text>

            {/* ── Year stepper ── */}
            <View style={styles.yearRow}>
              <TouchableOpacity
                onPress={() => setYear((y) => y - 1)}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t("modals.people.report.previousYear")}
              >
                <Text style={styles.yearArrow}>←</Text>
              </TouchableOpacity>
              <Text style={styles.yearText}>{year}</Text>
              <TouchableOpacity
                onPress={() => setYear((y) => y + 1)}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t("modals.people.report.nextYear")}
              >
                <Text style={styles.yearArrow}>→</Text>
              </TouchableOpacity>
            </View>

            {/* ── Grand total ── */}
            {hasData && (
              <View style={styles.grandTotalCard}>
                <Text style={styles.grandTotalLabel}>
                  {t("modals.people.businessReport.grandTotal", { year })}
                </Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(report.grandTotal)}
                </Text>
              </View>
            )}

            {/* ── Per-business cards ── */}
            {!loaded ? (
              <Text style={styles.emptyText}>{t("modals.people.report.loading")}</Text>
            ) : !hasData ? (
              <Text style={styles.emptyText}>
                {t("modals.people.businessReport.empty", { year })}
              </Text>
            ) : (
              report.perBusiness.map((group) => (
                <View key={group.businessId} style={styles.businessCard}>
                  <View style={styles.businessHeader}>
                    <Text style={styles.businessName} numberOfLines={1}>
                      💼 {group.name}
                      {group.deleted ? `  ${t("modals.people.report.deletedSuffix")}` : ""}
                    </Text>
                    <Text style={styles.businessTotal}>
                      {formatCurrency(group.total)}
                    </Text>
                  </View>
                  <Text style={styles.businessMeta}>
                    {t("modals.people.report.expenses", { count: group.entryCount })}
                    {group.receiptCount > 0
                      ? ` · ${t("modals.people.businessReport.withReceipt", { count: group.receiptCount })}`
                      : ""}
                  </Text>
                  {group.byCategory.map(({ category, total }) => (
                    <View key={category} style={styles.categoryRow}>
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {categoryLabel(category)}
                      </Text>
                      <Text style={styles.categoryTotal}>
                        {formatCurrency(total)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}

            {/* ── Receipt zip export ── */}
            {loaded && hasData && hasReceipts && (
              <TouchableOpacity
                style={[
                  styles.zipButton,
                  exportingZip && styles.exportButtonDisabled,
                ]}
                onPress={handleExportReceipts}
                disabled={exportingZip}
                accessibilityRole="button"
                accessibilityLabel={t("modals.people.businessReport.receipts.buttonA11y")}
              >
                <Text style={styles.zipButtonText}>
                  {exportingZip
                    ? t("modals.people.businessReport.receipts.preparing")
                    : t("modals.people.businessReport.receipts.button")}
                </Text>
                <Text style={styles.zipButtonHint}>
                  {t("modals.people.businessReport.receipts.hint")}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View
            style={[
              styles.buttonRow,
              Platform.OS === "android" && insets.bottom > 0
                ? { paddingBottom: insets.bottom + 12 }
                : null,
            ]}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>{t("common.close")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.exportButton,
                (!hasData || exporting) && styles.exportButtonDisabled,
              ]}
              onPress={handleExportCsv}
              disabled={!hasData || exporting}
            >
              <Text style={styles.exportText}>
                {exporting ? t("modals.people.report.exporting") : t("modals.people.report.exportCsv")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlayStrong,
      justifyContent: "flex-end",
    },
    modalSheet: {
      flex: 1,
      marginTop: Platform.OS === "ios" ? 44 : 32,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      overflow: "hidden",
    },
    scrollArea: { flex: 1 },
    scrollContent: { padding: 24, gap: 14 },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 8,
    },
    yearRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
    },
    yearArrow: {
      fontSize: 20,
      color: colors.accent,
      fontWeight: "700",
      paddingHorizontal: 8,
    },
    yearText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      minWidth: 64,
      textAlign: "center",
    },
    grandTotalCard: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      gap: 4,
    },
    grandTotalLabel: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    grandTotalValue: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.accent,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
      fontStyle: "italic",
      lineHeight: 19,
    },
    businessCard: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 14,
      gap: 6,
    },
    businessHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    businessName: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    businessTotal: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    businessMeta: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: 4,
    },
    categoryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 3,
    },
    categoryName: {
      flex: 1,
      color: colors.textDim,
      fontSize: 13,
    },
    categoryTotal: {
      color: colors.textDim,
      fontSize: 13,
      fontWeight: "600",
    },
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    closeButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    closeText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },
    exportButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    exportButtonDisabled: { opacity: 0.4 },
    exportText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
    zipButton: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.bg,
    },
    zipButtonText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "700",
    },
    zipButtonHint: {
      color: colors.textMuted,
      fontSize: 11,
      textAlign: "center",
    },
  });

export default React.memo(BusinessReportModal);
