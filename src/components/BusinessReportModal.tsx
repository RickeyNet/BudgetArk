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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useCurrency } from "../currency/CurrencyProvider";
import { getBudgetEntries } from "../storage/budgetStorage";
import { getBusinessesIncludingDeleted } from "../storage/businessStorage";
import {
  buildBusinessReportCsv,
  computeBusinessReport,
  type BusinessReport,
} from "../utils/businessReport";
import { shareLocalFile } from "../utils/iosNativeShare";
import { useValueChanged } from "../hooks/useValueChanged";
import {
  buildReceiptZip,
  countPlannedReceipts,
  deleteReceiptZip,
} from "../services/attachments/receiptZipExport";
import type { BudgetEntry, Business } from "../types";

interface BusinessReportModalProps {
  visible: boolean;
  onClose: () => void;
}

const BusinessReportModal: React.FC<BusinessReportModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { formatCurrency } = useCurrency();

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
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
        const [storedEntries, storedBusinesses] = await Promise.all([
          getBudgetEntries(),
          getBusinessesIncludingDeleted(),
        ]);
        if (cancelled) return;
        setEntries(storedEntries);
        setBusinesses(storedBusinesses);
      } catch (error) {
        // Show an empty report rather than a stuck "Loading…" screen.
        if (cancelled) return;
        if (__DEV__) console.error("Business report load failed:", error);
        setEntries([]);
        setBusinesses([]);
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
      await shareLocalFile(file.uri, {
        mimeType: "text/csv",
        dialogTitle: "Export Business Expenses",
        UTI: "public.comma-separated-values-text",
      });
    } catch (error: any) {
      Alert.alert(
        "Export failed",
        error?.message || "Could not create the CSV file."
      );
    } finally {
      setExporting(false);
    }
  }, [exporting, report]);

  const runZipExport = useCallback(async () => {
    setExportingZip(true);
    try {
      const result = await buildReceiptZip(report, entries);
      if (!result.file) {
        Alert.alert(
          "No photos on this device",
          "Every receipt photo for this year lives on your partner's device - photos never sync, so export the zip from there."
        );
        return;
      }
      try {
        await shareLocalFile(result.file.uri, {
          mimeType: "application/zip",
          dialogTitle: "Export Receipt Photos",
          UTI: "public.zip-archive",
        });
      } finally {
        // The archive holds decrypted photos - don't leave it on disk once
        // the share sheet is done with it.
        deleteReceiptZip(result.file);
      }
      if (result.missing > 0) {
        Alert.alert(
          "Some photos skipped",
          `${result.missing} ${result.missing === 1 ? "photo lives" : "photos live"} on your partner's device (or couldn't be read) and ${result.missing === 1 ? "was" : "were"} not included.`
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Export failed",
        error?.message || "Could not create the zip file."
      );
    } finally {
      setExportingZip(false);
    }
  }, [entries, report]);

  const handleExportReceipts = useCallback(() => {
    if (exportingZip) return;
    const planned = countPlannedReceipts(report, entries);
    if (planned === 0) {
      Alert.alert(
        "No receipts",
        `No business expenses in ${report.year} have receipt photos.`
      );
      return;
    }
    // Photos are encrypted at rest and never leave the device otherwise -
    // make the decrypt-and-share step an explicit, informed choice.
    Alert.alert(
      "Export receipt photos?",
      `This creates an unencrypted zip of up to ${planned} receipt ${planned === 1 ? "photo" : "photos"} for ${report.year}, named to match the CSV rows, for sharing (e.g. with your accountant). It isn't protected by BudgetArk's encryption once shared.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Export", onPress: () => void runZipExport() },
      ]
    );
  }, [entries, exportingZip, report, runZipExport]);

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
            <Text style={styles.title}>Business Expenses</Text>
            <Text style={styles.subtitle}>
              Everything tagged to a business, by calendar year. Recurring
              bills count once per month they hit, same as the Budget screen.
            </Text>

            {/* ── Year stepper ── */}
            <View style={styles.yearRow}>
              <TouchableOpacity
                onPress={() => setYear((y) => y - 1)}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Previous year"
              >
                <Text style={styles.yearArrow}>←</Text>
              </TouchableOpacity>
              <Text style={styles.yearText}>{year}</Text>
              <TouchableOpacity
                onPress={() => setYear((y) => y + 1)}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Next year"
              >
                <Text style={styles.yearArrow}>→</Text>
              </TouchableOpacity>
            </View>

            {/* ── Grand total ── */}
            {hasData && (
              <View style={styles.grandTotalCard}>
                <Text style={styles.grandTotalLabel}>
                  TOTAL BUSINESS EXPENSES · {year}
                </Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(report.grandTotal)}
                </Text>
              </View>
            )}

            {/* ── Per-business cards ── */}
            {!loaded ? (
              <Text style={styles.emptyText}>Loading…</Text>
            ) : !hasData ? (
              <Text style={styles.emptyText}>
                No business expenses in {year}. Tag an expense to a business
                when adding it on the Budget tab (create businesses under
                Profile → Businesses).
              </Text>
            ) : (
              report.perBusiness.map((group) => (
                <View key={group.businessId} style={styles.businessCard}>
                  <View style={styles.businessHeader}>
                    <Text style={styles.businessName} numberOfLines={1}>
                      💼 {group.name}
                      {group.deleted ? "  (deleted)" : ""}
                    </Text>
                    <Text style={styles.businessTotal}>
                      {formatCurrency(group.total)}
                    </Text>
                  </View>
                  <Text style={styles.businessMeta}>
                    {group.entryCount}{" "}
                    {group.entryCount === 1 ? "expense" : "expenses"}
                    {group.receiptCount > 0
                      ? ` · ${group.receiptCount} with receipt`
                      : ""}
                  </Text>
                  {group.byCategory.map(({ category, total }) => (
                    <View key={category} style={styles.categoryRow}>
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {category}
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
                accessibilityLabel="Export receipt photos as a zip archive"
              >
                <Text style={styles.zipButtonText}>
                  {exportingZip
                    ? "Preparing zip…"
                    : "🧾 Export Receipt Photos (ZIP)"}
                </Text>
                <Text style={styles.zipButtonHint}>
                  File names match the CSV rows (date_business_amount.jpg).
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
              <Text style={styles.closeText}>Close</Text>
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
                {exporting ? "Exporting…" : "Export CSV"}
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
      backgroundColor: "rgba(0, 0, 0, 0.85)",
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
