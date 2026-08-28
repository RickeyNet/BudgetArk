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
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useCurrency } from "../currency/CurrencyProvider";
import { getBudgetEntries } from "../storage/budgetStorage";
import { getPeopleIncludingDeleted } from "../storage/personStorage";
import {
  buildPersonReportCsv,
  computePersonReport,
  type PersonReport,
} from "../utils/personReport";
import { shareLocalFileThenDelete } from "../utils/shareTempFile";
import { useValueChanged } from "../hooks/useValueChanged";
import type { BudgetEntry, Person } from "../types";

interface PersonReportModalProps {
  visible: boolean;
  onClose: () => void;
}

const PersonReportModal: React.FC<PersonReportModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const insets = useSafeAreaInsets();
  const { formatCurrency } = useCurrency();

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
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
        const [storedEntries, storedPeople] = await Promise.all([
          getBudgetEntries(),
          getPeopleIncludingDeleted(),
        ]);
        if (cancelled) return;
        setEntries(storedEntries);
        setPeople(storedPeople);
      } catch (error) {
        // Show an empty report rather than a stuck "Loading…" screen.
        if (cancelled) return;
        if (__DEV__) console.error("Person report load failed:", error);
        setEntries([]);
        setPeople([]);
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
        dialogTitle: "Export Person Spending",
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

  const hasData = report.perPerson.length > 0;

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
            <Text style={styles.title}>Person Spending</Text>
            <Text style={styles.subtitle}>
              Everything assigned to a person, by calendar year. Recurring
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
                  TOTAL ASSIGNED SPENDING · {year}
                </Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(report.grandTotal)}
                </Text>
              </View>
            )}

            {/* ── Per-person cards ── */}
            {!loaded ? (
              <Text style={styles.emptyText}>Loading…</Text>
            ) : !hasData ? (
              <Text style={styles.emptyText}>
                No assigned spending in {year}. Assign an expense to a person
                when adding it on the Budget tab (add people under Profile →
                People).
              </Text>
            ) : (
              report.perPerson.map((group) => (
                <View key={group.personId} style={styles.personCard}>
                  <View style={styles.personHeader}>
                    <Text style={styles.personName} numberOfLines={1}>
                      👤 {group.name}
                      {group.deleted ? "  (deleted)" : ""}
                    </Text>
                    <Text style={styles.personTotal}>
                      {formatCurrency(group.total)}
                    </Text>
                  </View>
                  <Text style={styles.personMeta}>
                    {group.entryCount}{" "}
                    {group.entryCount === 1 ? "expense" : "expenses"}
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

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      flex: 1,
      marginTop: Platform.OS === "ios" ? 44 : 32,
      backgroundColor: colors.card,
      borderTopLeftRadius: tokens.radius + 8,
      borderTopRightRadius: tokens.radius + 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      overflow: "hidden",
    },
    scrollArea: { flex: 1 },
    scrollContent: { padding: tokens.padLg, gap: tokens.gap },
    title: {
      fontSize: scale(22),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: scale(14),
      color: colors.textDim,
      marginBottom: tokens.gapSm,
    },
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
    buttonRow: {
      flexDirection: "row",
      gap: tokens.gap,
      paddingHorizontal: tokens.padLg,
      paddingTop: tokens.padSm,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    closeButton: {
      flex: 1,
      paddingVertical: tokens.pad,
      borderRadius: tokens.radius,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    closeText: {
      color: colors.textDim,
      fontSize: scale(15),
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
