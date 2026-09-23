/**
 * BudgetArk - Spreadsheet Schema Reference Modal
 * File: src/components/SpreadsheetSchemaModal.tsx
 *
 * Mobile-friendly read-only reference for the CSV / XLSX import schema.
 * Mirrors docs/SPREADSHEET_SCHEMA.md so users can see exactly what their
 * file needs to look like before importing.
 */

import React, { useMemo } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
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

/** Sheet titles and column names are file identifiers - only the notes are localized. */
const buildSheets = (t: TFunction): SheetSpec[] => [
  {
    title: "Budget Entries",
    description: t("modals.data.schema.sheets.entries.description"),
    columns: [
      { name: "ID", required: false, notes: t("modals.data.schema.sheets.entries.columns.id") },
      { name: "Date", required: true, notes: t("modals.data.schema.sheets.entries.columns.date") },
      { name: "Type", required: true, notes: t("modals.data.schema.sheets.entries.columns.type") },
      { name: "Category", required: true, notes: t("modals.data.schema.sheets.entries.columns.category") },
      { name: "Amount", required: true, notes: t("modals.data.schema.sheets.entries.columns.amount") },
      { name: "Description", required: false, notes: t("modals.data.schema.sheets.entries.columns.description") },
      { name: "Recurring", required: false, notes: t("modals.data.schema.sheets.entries.columns.recurring") },
      { name: "LinkedAccountId", required: false, notes: t("modals.data.schema.sheets.entries.columns.linkedAccountId") },
      { name: "BusinessId", required: false, notes: t("modals.data.schema.sheets.entries.columns.businessId") },
      { name: "Business", required: false, notes: t("modals.data.schema.sheets.entries.columns.business") },
      { name: "PersonId", required: false, notes: t("modals.data.schema.sheets.entries.columns.personId") },
      { name: "PersonIds", required: false, notes: t("modals.data.schema.sheets.entries.columns.personIds") },
      { name: "Person", required: false, notes: t("modals.data.schema.sheets.entries.columns.person") },
      { name: "Private", required: false, notes: t("modals.data.schema.sheets.entries.columns.private") },
    ],
    footer: t("modals.data.schema.sheets.entries.footer"),
  },
  {
    title: "Budget Limits",
    xlsxOnly: true,
    description: t("modals.data.schema.sheets.limits.description"),
    columns: [
      { name: "Category", required: true, notes: t("modals.data.schema.sheets.limits.columns.category") },
      { name: "MonthlyLimit", required: true, notes: t("modals.data.schema.sheets.limits.columns.monthlyLimit") },
    ],
  },
  {
    title: "Debts",
    xlsxOnly: true,
    description: t("modals.data.schema.sheets.debts.description"),
    columns: [
      { name: "ID", required: false, notes: t("modals.data.schema.sheets.debts.columns.id") },
      { name: "Name", required: true, notes: t("modals.data.schema.sheets.debts.columns.name") },
      { name: "Balance", required: true, notes: t("modals.data.schema.sheets.debts.columns.balance") },
      { name: "OriginalBalance", required: true, notes: t("modals.data.schema.sheets.debts.columns.originalBalance") },
      { name: "Rate", required: true, notes: t("modals.data.schema.sheets.debts.columns.rate") },
      { name: "MinPayment", required: true, notes: t("modals.data.schema.sheets.debts.columns.minPayment") },
      { name: "Owner", required: false, notes: t("modals.data.schema.sheets.debts.columns.owner") },
      { name: "DebtClass", required: false, notes: t("modals.data.schema.sheets.debts.columns.debtClass") },
      { name: "DebtClassSource", required: false, notes: t("modals.data.schema.sheets.debts.columns.debtClassSource") },
      { name: "GoalDate", required: false, notes: t("modals.data.schema.sheets.debts.columns.goalDate") },
      { name: "CreatedAt", required: false, notes: t("modals.data.schema.sheets.debts.columns.createdAt") },
    ],
  },
  {
    title: "Payments",
    xlsxOnly: true,
    description: t("modals.data.schema.sheets.payments.description"),
    columns: [
      { name: "ID", required: false, notes: t("modals.data.schema.sheets.payments.columns.id") },
      { name: "DebtID", required: true, notes: t("modals.data.schema.sheets.payments.columns.debtId") },
      { name: "Amount", required: true, notes: t("modals.data.schema.sheets.payments.columns.amount") },
      { name: "Date", required: true, notes: t("modals.data.schema.sheets.payments.columns.date") },
    ],
  },
  {
    title: "Savings Goals",
    xlsxOnly: true,
    description: t("modals.data.schema.sheets.savingsGoals.description"),
    columns: [
      { name: "ID", required: false, notes: t("modals.data.schema.sheets.savingsGoals.columns.id") },
      { name: "Name", required: true, notes: t("modals.data.schema.sheets.savingsGoals.columns.name") },
      { name: "Category", required: true, notes: t("modals.data.schema.sheets.savingsGoals.columns.category") },
      { name: "TargetAmount", required: true, notes: t("modals.data.schema.sheets.savingsGoals.columns.targetAmount") },
      { name: "CurrentAmount", required: true, notes: t("modals.data.schema.sheets.savingsGoals.columns.currentAmount") },
      { name: "TargetDate", required: false, notes: t("modals.data.schema.sheets.savingsGoals.columns.targetDate") },
      { name: "Priority", required: false, notes: t("modals.data.schema.sheets.savingsGoals.columns.priority") },
      { name: "UsesPerMonth", required: false, notes: t("modals.data.schema.sheets.savingsGoals.columns.usesPerMonth") },
      { name: "UsefulLifeYears", required: false, notes: t("modals.data.schema.sheets.savingsGoals.columns.usefulLifeYears") },
      { name: "CreatedAt", required: false, notes: t("modals.data.schema.sheets.savingsGoals.columns.createdAt") },
      { name: "UpdatedAt", required: false, notes: t("modals.data.schema.sheets.savingsGoals.columns.updatedAt") },
    ],
  },
  {
    title: "Asset Accounts",
    xlsxOnly: true,
    description: t("modals.data.schema.sheets.assetAccounts.description"),
    columns: [
      { name: "ID", required: false, notes: t("modals.data.schema.sheets.assetAccounts.columns.id") },
      { name: "Name", required: true, notes: t("modals.data.schema.sheets.assetAccounts.columns.name") },
      { name: "Category", required: true, notes: t("modals.data.schema.sheets.assetAccounts.columns.category") },
      { name: "Balance", required: true, notes: t("modals.data.schema.sheets.assetAccounts.columns.balance") },
      { name: "EmergencyFund", required: false, notes: t("modals.data.schema.sheets.assetAccounts.columns.emergencyFund") },
      { name: "CreatedAt", required: false, notes: t("modals.data.schema.sheets.assetAccounts.columns.createdAt") },
    ],
  },
  {
    title: "Businesses",
    xlsxOnly: true,
    description: t("modals.data.schema.sheets.businesses.description"),
    columns: [
      { name: "ID", required: false, notes: t("modals.data.schema.sheets.businesses.columns.id") },
      { name: "Name", required: true, notes: t("modals.data.schema.sheets.businesses.columns.name") },
      { name: "CreatedAt", required: false, notes: t("modals.data.schema.sheets.businesses.columns.createdAt") },
    ],
  },
  {
    title: "People",
    xlsxOnly: true,
    description: t("modals.data.schema.sheets.people.description"),
    columns: [
      { name: "ID", required: false, notes: t("modals.data.schema.sheets.people.columns.id") },
      { name: "Name", required: true, notes: t("modals.data.schema.sheets.people.columns.name") },
      { name: "CreatedAt", required: false, notes: t("modals.data.schema.sheets.people.columns.createdAt") },
    ],
  },
  {
    title: "Holdings",
    xlsxOnly: true,
    description: t("modals.data.schema.sheets.holdings.description"),
    columns: [
      { name: "ID", required: false, notes: t("modals.data.schema.sheets.holdings.columns.id") },
      { name: "Symbol", required: true, notes: t("modals.data.schema.sheets.holdings.columns.symbol") },
      { name: "Shares", required: true, notes: t("modals.data.schema.sheets.holdings.columns.shares") },
      { name: "CostBasis", required: false, notes: t("modals.data.schema.sheets.holdings.columns.costBasis") },
      { name: "CreatedAt", required: false, notes: t("modals.data.schema.sheets.holdings.columns.createdAt") },
    ],
  },
];

const SpreadsheetSchemaModal: React.FC<SpreadsheetSchemaModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.bottom),
    [colors, insets.bottom]
  );
  const sheets = useMemo(() => buildSheets(t), [t]);

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
            <Text style={styles.title}>{t("modals.data.schema.title")}</Text>
            <Text style={styles.subtitle}>{t("modals.data.schema.subtitle")}</Text>

            <View style={styles.tipBox}>
              <Text style={styles.tipLabel}>{t("modals.data.schema.tipLabel")}</Text>
              <Text style={styles.tipText}>
                {t("modals.data.schema.tipBefore")}
                <Text style={styles.tipBold}>{t("modals.data.schema.tipAction")}</Text>
                {t("modals.data.schema.tipAfter")}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("modals.data.schema.presets.title")}</Text>
              <Text style={styles.subtle}>{t("modals.data.schema.presets.body")}</Text>
              <Text style={styles.bullet}>{t("modals.data.schema.presets.ynab")}</Text>
              <Text style={styles.bullet}>{t("modals.data.schema.presets.mint")}</Text>
              <Text style={styles.bullet}>{t("modals.data.schema.presets.monarch")}</Text>
              <Text style={styles.bullet}>{t("modals.data.schema.presets.categories")}</Text>
              <Text style={styles.bullet}>{t("modals.data.schema.presets.transfers")}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("modals.data.schema.limits.title")}</Text>
              <Text style={styles.bullet}>{t("modals.data.schema.limits.fileSize")}</Text>
              <Text style={styles.bullet}>{t("modals.data.schema.limits.rowsPerSheet")}</Text>
              <Text style={styles.bullet}>{t("modals.data.schema.limits.recordsTotal")}</Text>
              <Text style={styles.bullet}>{t("modals.data.schema.limits.skipped")}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("modals.data.schema.allowedCategories.title")}</Text>
              <Text style={styles.subtle}>{t("modals.data.schema.allowedCategories.body")}</Text>
              <View style={styles.chipRow}>
                {BUDGET_CATEGORIES.map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text style={styles.chipText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>

            {sheets.map((sheet) => (
              <View key={sheet.title} style={styles.section}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sectionTitle}>{sheet.title}</Text>
                  {sheet.csvOnly && (
                    <View style={[styles.tag, { backgroundColor: colors.accent }]}>
                      <Text style={styles.tagText}>{t("modals.data.schema.csvTag")}</Text>
                    </View>
                  )}
                  {sheet.xlsxOnly && (
                    <View style={[styles.tag, { backgroundColor: colors.success }]}>
                      <Text style={styles.tagText}>{t("modals.data.schema.excelOnlyTag")}</Text>
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
                        {col.required
                          ? t("modals.data.schema.required")
                          : t("modals.data.schema.optional")}
                      </Text>
                    </View>
                    <Text style={styles.colNotes}>{col.notes}</Text>
                  </View>
                ))}
                {sheet.footer && <Text style={styles.footer}>{sheet.footer}</Text>}
              </View>
            ))}

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>{t("common.close")}</Text>
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
