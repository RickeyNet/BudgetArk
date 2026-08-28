/**
 * BudgetArk - Spreadsheet Schema Reference Modal
 * File: src/components/SpreadsheetSchemaModal.tsx
 *
 * Mobile-friendly read-only reference for the CSV / XLSX import schema.
 * Mirrors docs/SPREADSHEET_SCHEMA.md so users can see exactly what their
 * file needs to look like before importing.
 */

import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { BUDGET_CATEGORIES } from "../types";

interface SpreadsheetSchemaModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ColumnSpec {
  name: string;
  required: boolean;
  notes: string;
}

interface SheetSpec {
  title: string;
  csvOnly?: boolean;
  xlsxOnly?: boolean;
  description: string;
  columns: ColumnSpec[];
  footer?: string;
}

const SHEETS: SheetSpec[] = [
  {
    title: "Budget Entries",
    description:
      "The core sheet - required for both CSV and Excel imports. CSVs only contain this sheet.",
    columns: [
      { name: "ID", required: false, notes: "Auto-generated UUID if missing. Keep it for round-trip safety." },
      { name: "Date", required: true, notes: "ISO YYYY-MM-DD, full ISO timestamp, US M/D/YYYY, or Excel native date." },
      { name: "Type", required: true, notes: "Must be income or expense (case-insensitive)." },
      { name: "Category", required: true, notes: "Must match an allowed category exactly (see list below)." },
      { name: "Amount", required: true, notes: "Positive number. Strips $ and commas. Treats (50.00) as -50.00." },
      { name: "Description", required: false, notes: "Optional note. Up to 220 characters." },
      { name: "Recurring", required: false, notes: "yes / no / true / false / 1 / 0." },
      { name: "LinkedAccountId", required: false, notes: "Asset account UUID for savings entries." },
      { name: "BusinessId", required: false, notes: "UUID from the Businesses sheet for business-tagged expenses. Round-trips." },
      { name: "Business", required: false, notes: "Readable business name. Export-only - ignored on import." },
      { name: "PersonId", required: false, notes: "UUID from the People sheet for expenses assigned to a person. Round-trips." },
      { name: "Person", required: false, notes: "Readable person name. Export-only - ignored on import." },
      { name: "Private", required: false, notes: "yes marks a private entry that never syncs to your partner. Round-trips." },
    ],
    footer:
      "Receipt photos never round-trip through spreadsheets - photo files stay on the device that took them.",
  },
  {
    title: "Budget Limits",
    xlsxOnly: true,
    description: "Per-category monthly spending caps. Imported limits land in the current month.",
    columns: [
      { name: "Category", required: true, notes: "One of the allowed categories." },
      { name: "MonthlyLimit", required: true, notes: "Positive number." },
    ],
  },
  {
    title: "Debts",
    xlsxOnly: true,
    description: "Existing debts (cards, loans, etc.).",
    columns: [
      { name: "ID", required: false, notes: "Auto-generated if missing." },
      { name: "Name", required: true, notes: "Up to 80 characters." },
      { name: "Balance", required: true, notes: "Current remaining balance, ≥ 0." },
      { name: "OriginalBalance", required: true, notes: "Starting balance, ≥ 0.01." },
      { name: "Rate", required: true, notes: "APR as a percentage, 0-200." },
      { name: "MinPayment", required: true, notes: "Minimum monthly payment, ≥ 0." },
      { name: "Owner", required: false, notes: "mine / partner / joint. Defaults to mine." },
      { name: "DebtClass", required: false, notes: "personal_credit / car / house. (Legacy car_house splits to house when the name mentions a mortgage, otherwise car.)" },
      { name: "DebtClassSource", required: false, notes: "manual / inferred." },
      { name: "GoalDate", required: false, notes: "Optional payoff target date." },
      { name: "CreatedAt", required: false, notes: "ISO timestamp; defaults to now." },
    ],
  },
  {
    title: "Payments",
    xlsxOnly: true,
    description: "Individual payments applied to a debt.",
    columns: [
      { name: "ID", required: false, notes: "Auto-generated if missing." },
      { name: "DebtID", required: true, notes: "Must match a row's ID in the Debts sheet." },
      { name: "Amount", required: true, notes: "Positive number, ≥ 0.01." },
      { name: "Date", required: true, notes: "ISO date or US M/D/YYYY." },
    ],
  },
  {
    title: "Savings Goals",
    xlsxOnly: true,
    description: "Tracked savings goals.",
    columns: [
      { name: "ID", required: false, notes: "Auto-generated if missing." },
      { name: "Name", required: true, notes: "Up to 80 characters." },
      { name: "Category", required: true, notes: "emergency_fund / travel / home / car / education / other." },
      { name: "TargetAmount", required: true, notes: "Positive number." },
      { name: "CurrentAmount", required: true, notes: "Number, ≥ 0." },
      { name: "TargetDate", required: false, notes: "Optional target date." },
      { name: "CreatedAt", required: false, notes: "ISO timestamp; defaults to now." },
    ],
  },
  {
    title: "Asset Accounts",
    xlsxOnly: true,
    description: "Persistent account balances (savings, retirement, HSA, investment).",
    columns: [
      { name: "ID", required: false, notes: "Auto-generated if missing." },
      { name: "Name", required: true, notes: "Up to 80 characters." },
      { name: "Category", required: true, notes: "savings / retirement / hsa / investment / other." },
      { name: "Balance", required: true, notes: "Number, ≥ 0." },
      { name: "EmergencyFund", required: false, notes: "yes marks a savings account designated as your emergency fund. Round-trips." },
      { name: "CreatedAt", required: false, notes: "ISO timestamp; defaults to now." },
    ],
  },
  {
    title: "Businesses",
    xlsxOnly: true,
    description:
      "Businesses that expense entries can be tagged with (via BusinessId). Only live businesses are exported.",
    columns: [
      { name: "ID", required: false, notes: "Auto-generated if missing. Budget entries reference this via BusinessId." },
      { name: "Name", required: true, notes: "Up to 40 characters." },
      { name: "CreatedAt", required: false, notes: "ISO timestamp; defaults to now." },
    ],
  },
  {
    title: "People",
    xlsxOnly: true,
    description:
      "People that spending can be assigned to (via PersonId). Only live people are exported.",
    columns: [
      { name: "ID", required: false, notes: "Auto-generated if missing. Budget entries reference this via PersonId." },
      { name: "Name", required: true, notes: "Up to 40 characters." },
      { name: "CreatedAt", required: false, notes: "ISO timestamp; defaults to now." },
    ],
  },
  {
    title: "Holdings",
    xlsxOnly: true,
    description:
      "Stock / ETF positions. Prices are fetched on-device and never imported - only the position is.",
    columns: [
      { name: "ID", required: false, notes: "Auto-generated if missing." },
      { name: "Symbol", required: true, notes: "Ticker, e.g. AAPL or VTI. Up to 12 chars (letters, digits, . and -)." },
      { name: "Shares", required: true, notes: "Positive number. Fractional shares allowed." },
      { name: "CostBasis", required: false, notes: "Total dollars invested, ≥ 0. Used for gain/loss." },
      { name: "CreatedAt", required: false, notes: "ISO timestamp; defaults to now." },
    ],
  },
];

const SpreadsheetSchemaModal: React.FC<SpreadsheetSchemaModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.bottom),
    [colors, insets.bottom]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.cardContent}>
            <Text style={styles.title}>Spreadsheet Format</Text>
            <Text style={styles.subtitle}>
              Headers are matched case-insensitively. CSV files contain only the
              Budget Entries sheet. Excel files can contain any of the sheets
              below.
            </Text>

            <View style={styles.tipBox}>
              <Text style={styles.tipLabel}>TIP</Text>
              <Text style={styles.tipText}>
                Easiest way to learn the format: tap{" "}
                <Text style={styles.tipBold}>Export Spreadsheet</Text> (XLSX),
                open the file in Excel or Google Sheets, edit, then re-import.
                IDs round-trip so existing rows update in place. Even with an
                empty app, the export is a ready-made blank template - every
                sheet has the correct headers, just no rows yet.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Limits</Text>
              <Text style={styles.bullet}>• File size: 5 MB max</Text>
              <Text style={styles.bullet}>• Up to 5,000 rows per sheet</Text>
              <Text style={styles.bullet}>• Up to 6,000 records total per import</Text>
              <Text style={styles.bullet}>
                • Rows missing required fields are silently skipped (you'll see
                a count after import).
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Allowed Categories</Text>
              <Text style={styles.subtle}>
                Used for both Budget Entries and Budget Limits. Match exactly.
              </Text>
              <View style={styles.chipRow}>
                {BUDGET_CATEGORIES.map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text style={styles.chipText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>

            {SHEETS.map((sheet) => (
              <View key={sheet.title} style={styles.section}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sectionTitle}>{sheet.title}</Text>
                  {sheet.csvOnly && (
                    <View style={[styles.tag, { backgroundColor: colors.accent }]}>
                      <Text style={styles.tagText}>CSV</Text>
                    </View>
                  )}
                  {sheet.xlsxOnly && (
                    <View style={[styles.tag, { backgroundColor: colors.success }]}>
                      <Text style={styles.tagText}>Excel only</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.subtle}>{sheet.description}</Text>
                {sheet.columns.map((col) => (
                  <View key={col.name} style={styles.colRow}>
                    <View style={styles.colHeader}>
                      <Text style={styles.colName}>{col.name}</Text>
                      <Text
                        style={[
                          styles.colRequired,
                          col.required ? styles.required : styles.optional,
                        ]}
                      >
                        {col.required ? "Required" : "Optional"}
                      </Text>
                    </View>
                    <Text style={styles.colNotes}>{col.notes}</Text>
                  </View>
                ))}
                {sheet.footer && <Text style={styles.footer}>{sheet.footer}</Text>}
              </View>
            ))}

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, bottomInset: number) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlayStrong,
      justifyContent: "flex-end",
    },
    card: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      maxHeight: "92%",
    },
    cardContent: {
      padding: 24,
      paddingBottom: Math.max(24, bottomInset),
      gap: 18,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textDim,
      lineHeight: 20,
    },
    tipBox: {
      backgroundColor: colors.bg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
      gap: 6,
    },
    tipLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1,
      color: colors.accent,
    },
    tipText: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 19,
    },
    tipBold: {
      fontWeight: "700",
      color: colors.text,
    },
    section: {
      gap: 8,
      paddingTop: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    tag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    tagText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.5,
    },
    subtle: {
      fontSize: 13,
      color: colors.textDim,
      lineHeight: 18,
    },
    bullet: {
      fontSize: 13,
      color: colors.textDim,
      lineHeight: 19,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
    },
    chip: {
      backgroundColor: colors.bg,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    chipText: {
      fontSize: 12,
      color: colors.text,
    },
    colRow: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 8,
      gap: 4,
    },
    colHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    colName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      fontFamily: "Courier",
    },
    colRequired: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    required: {
      color: colors.danger,
    },
    optional: {
      color: colors.textDim,
    },
    colNotes: {
      fontSize: 13,
      color: colors.textDim,
      lineHeight: 18,
    },
    footer: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: "italic",
      paddingTop: 4,
    },
    closeBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 12,
    },
    closeText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
  });

export default SpreadsheetSchemaModal;
