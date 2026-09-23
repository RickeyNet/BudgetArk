/**
 * BudgetArk - Person Spending Report
 * File: src/components/PersonReportModal.tsx
 *
 * Year-by-year view of who spent what: per-person totals with category
 * breakdowns and a one-way CSV export. A deliberate mirror of
 * BusinessReportModal minus the receipt-zip export (receipts are a
 * tax-time concern; this report is household bookkeeping). Loads its own
 * data on open, people INCLUDING deleted so a removed household member
 * still reports under their real name.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { File as ExpoFile, Paths } from "expo-file-system";
import { useTranslation } from "react-i18next";
import SheetModal, { useSheetStyles } from "./SheetModal";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useCurrency } from "../currency/CurrencyProvider";
import { getBudgetEntries } from "../storage/budgetStorage";
import { usePeople } from "../people/PeopleProvider";
import { useCategoryLabel } from "../i18n/categoryLabel";
import {
  buildPersonReportCsv,
  computePersonReport,
  type PersonReport,
} from "../utils/personReport";
import { shareLocalFileThenDelete } from "../utils/shareTempFile";
import { useValueChanged } from "../hooks/useValueChanged";
import type { BudgetEntry } from "../types";

interface PersonReportModalProps {
  visible: boolean;
  onClose: () => void;
}

const PersonReportModal: React.FC<PersonReportModalProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const sheet = useSheetStyles();
  const { formatCurrency } = useCurrency();

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const { peopleIncludingDeleted: people } = usePeople();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loaded, setLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

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
        if (__DEV__) console.error("Person report load failed:", error);
        setEntries([]);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const report: PersonReport = useMemo(
    () => computePersonReport(entries, people, year),
    [entries, people, year]
  );

  const handleExportCsv = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const csv = buildPersonReportCsv(report);
      const filename = `budgetark-person-spending-${report.year}.csv`;
      const fileDir = Platform.OS === "ios" ? Paths.document : Paths.cache;
      const file = new ExpoFile(fileDir, filename);
      file.create({ overwrite: true });
      file.write(csv, { encoding: "utf8" });
      // Plaintext spending data - deleted once the share sheet closes.
      await shareLocalFileThenDelete(file, {
        mimeType: "text/csv",
        dialogTitle: t("modals.people.personReport.shareTitle"),
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

  const hasData = report.perPerson.length > 0;

  return (
    <SheetModal
      visible={visible}
      onRequestClose={onClose}
      contentContainerStyle={styles.sheetContent}
      footer={
        <>
          <TouchableOpacity style={sheet.closeButton} onPress={onClose}>
            <Text style={sheet.closeText}>{t("common.close")}</Text>
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
        </>
      }
    >
            <Text style={sheet.title}>{t("modals.people.personReport.title")}</Text>
            <Text style={sheet.subtitle}>{t("modals.people.personReport.subtitle")}</Text>

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
                  {t("modals.people.personReport.grandTotal", { year })}
                </Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(report.grandTotal)}
                </Text>
              </View>
            )}

            {/* ── Per-person cards ── */}
            {!loaded ? (
              <Text style={styles.emptyText}>{t("modals.people.report.loading")}</Text>
            ) : !hasData ? (
              <Text style={styles.emptyText}>
                {t("modals.people.personReport.empty", { year })}
              </Text>
            ) : (
              report.perPerson.map((group) => (
                <View key={group.personId} style={styles.personCard}>
                  <View style={styles.personHeader}>
                    <Text style={styles.personName} numberOfLines={1}>
                      👤 {group.name}
                      {group.deleted ? `  ${t("modals.people.report.deletedSuffix")}` : ""}
                    </Text>
                    <Text style={styles.personTotal}>
                      {formatCurrency(group.total)}
                    </Text>
                  </View>
                  <Text style={styles.personMeta}>
                    {t("modals.people.report.expenses", { count: group.entryCount })}
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
    </SheetModal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    sheetContent: { gap: tokens.gap },
    yearRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.gapLg,
    },
    yearArrow: {
      fontSize: scale(20),
      color: colors.accent,
      fontWeight: "700",
      paddingHorizontal: tokens.padSm,
    },
    yearText: {
      color: colors.text,
      fontSize: scale(18),
      fontWeight: "700",
      minWidth: 64,
      textAlign: "center",
    },
    grandTotalCard: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      alignItems: "center",
      gap: 4,
    },
    grandTotalLabel: {
      fontSize: scale(11),
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    grandTotalValue: {
      fontSize: scale(24),
      fontWeight: "700",
      color: colors.accent,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: scale(13),
      fontStyle: "italic",
      lineHeight: scale(19),
    },
    personCard: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      gap: tokens.gapSm,
    },
    personHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.gap,
    },
    personName: {
      flex: 1,
      color: colors.text,
      fontSize: scale(15),
      fontWeight: "700",
    },
    personTotal: {
      color: colors.text,
      fontSize: scale(15),
      fontWeight: "700",
    },
    personMeta: {
      color: colors.textMuted,
      fontSize: scale(12),
      marginBottom: 4,
    },
    categoryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: tokens.gap,
      paddingVertical: 3,
    },
    categoryName: {
      flex: 1,
      color: colors.textDim,
      fontSize: scale(13),
    },
    categoryTotal: {
      color: colors.textDim,
      fontSize: scale(13),
      fontWeight: "600",
    },
    exportButton: {
      flex: 1,
      paddingVertical: tokens.pad,
      borderRadius: tokens.radius,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    exportButtonDisabled: { opacity: 0.4 },
    exportText: {
      color: colors.accentButtonText,
      fontSize: scale(15),
      fontWeight: "700",
    },
  });
};

export default React.memo(PersonReportModal);
