/**
 * BudgetArk - Bank Statement Import Modal
 * File: src/components/BankStatementImportModal.tsx
 *
 * The confirm-the-mapping step between picking a bank CSV and routing its
 * rows into the Review Inbox. The parsing and guessing are pure
 * (utils/bankCsvImport); this modal shows the guess, lets the user fix any
 * column (date, description, one signed amount OR split debit/credit, and
 * the sign convention), previews the first few resulting transactions, and
 * on confirm hands the parsed transactions to csvStatementImport. Confirmed
 * layouts are remembered per header signature so the next statement from the
 * same bank opens pre-filled.
 *
 * Presented from the Profile Data card. Rendered INSIDE no other Modal, but
 * the file picker it launches runs before the modal is shown (the caller
 * awaits the picker, then opens this), so there is no mid-navigation
 * present here.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  type BankCsvMapping,
  type ParsedStatementFile,
  guessBankCsvMapping,
  isMappingComplete,
  normalizeStatementAccountLabel,
  parseStatementRows,
  statementAccountIdFor,
} from "../utils/bankCsvImport";
import { importStatementTransactions } from "../services/connections/csvStatementImport";
import { rememberStatementMapping } from "../storage/statementImportMappingsStorage";
import { useCurrency } from "../currency/CurrencyProvider";
import { useValueChanged } from "../hooks/useValueChanged";
import { triggerHaptic } from "../utils/haptics";

/** How many parsed rows to preview before importing. */
const PREVIEW_ROWS = 6;

export interface BankStatementImportModalProps {
  visible: boolean;
  file: ParsedStatementFile | null;
  /** Header signature of `file`, for remembering the confirmed mapping. */
  signature: string;
  /** Remembered mapping/label for this signature, applied over the guess. */
  remembered?: { mapping: BankCsvMapping; accountLabel: string } | null;
  /** Suggested account label (file name without extension), user-editable. */
  suggestedLabel?: string;
  onClose: () => void;
  /** Called with a human summary after a successful import. */
  onImported: (message: string) => void;
  /** Called with an error message when the import throws. */
  onError: (message: string) => void;
}

type ColumnField = "date" | "description" | "amount" | "debit" | "credit";

const BankStatementImportModal: React.FC<BankStatementImportModalProps> = ({
  visible,
  file,
  signature,
  remembered,
  suggestedLabel,
  onClose,
  onImported,
  onError,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [mapping, setMapping] = useState<Partial<BankCsvMapping>>({});
  const [accountLabel, setAccountLabel] = useState("");
  const [rememberLayout, setRememberLayout] = useState(true);
  const [busy, setBusy] = useState(false);
  // Which column the picker sheet is choosing (null = closed).
  const [picking, setPicking] = useState<ColumnField | null>(null);

  // Seed the mapping (remembered layout wins over the guess) and the label
  // on each closed -> open edge, so a fresh file never inherits stale state.
  // Render-time adjustment via useValueChanged, the same pattern
  // MonthYearPicker uses - never touch a ref during render (react-hooks/refs).
  if (useValueChanged(visible) && visible && file) {
    setMapping(remembered?.mapping ?? guessBankCsvMapping(file));
    setAccountLabel(remembered?.accountLabel ?? normalizeStatementAccountLabel(suggestedLabel));
    setRememberLayout(true);
    setPicking(null);
  }

  const headers = file?.headers ?? [];
  const complete = isMappingComplete(mapping);

  const preview = useMemo(() => {
    if (!file || !complete) return null;
    const label = normalizeStatementAccountLabel(accountLabel);
    return parseStatementRows(file, mapping, statementAccountIdFor(label));
  }, [file, complete, mapping, accountLabel]);

  const setField = useCallback((field: ColumnField, column: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (field === "date") next.dateColumn = column;
      else if (field === "description") next.descriptionColumn = column;
      else if (field === "amount") next.amountColumn = column;
      else if (field === "debit") next.debitColumn = column;
      else if (field === "credit") next.creditColumn = column;
      return next;
    });
    setPicking(null);
  }, []);

  const setLayout = useCallback((layout: "signed" | "split") => {
    setMapping((prev) => ({ ...prev, layout }));
  }, []);

  const handleImport = useCallback(async () => {
    if (!file || !isMappingComplete(mapping) || busy) return;
    setBusy(true);
    try {
      const label = normalizeStatementAccountLabel(accountLabel);
      const accountId = statementAccountIdFor(label);
      const { transactions, skipped, zeroRows } = parseStatementRows(file, mapping, accountId);
      if (transactions.length === 0) {
        onError(t("modals.data.import.errors.noneRead"));
        setBusy(false);
        return;
      }
      const summary = await importStatementTransactions(transactions, accountId);
      if (rememberLayout) {
        await rememberStatementMapping(signature, { mapping, accountLabel: label });
      }
      const parts: string[] = [];
      if (summary.added > 0)
        parts.push(t("modals.data.import.summary.added", { count: summary.added }));
      if (summary.autoApproved > 0)
        parts.push(
          t("modals.data.import.summary.autoApproved", { count: summary.autoApproved }),
        );
      if (summary.autoDismissed > 0)
        parts.push(
          t("modals.data.import.summary.autoDismissed", { count: summary.autoDismissed }),
        );
      if (summary.alreadyKnown > 0)
        parts.push(
          t("modals.data.import.summary.alreadyKnown", { count: summary.alreadyKnown }),
        );
      let message: string =
        parts.length > 0
          ? t("modals.data.import.summary.withParts", { label, parts: parts.join(", ") })
          : t("modals.data.import.summary.nothingNew", { label });
      if (summary.flaggedDuplicates > 0) {
        message += `\n\n${t("modals.data.import.summary.flaggedDuplicates", { count: summary.flaggedDuplicates })}`;
      }
      if (summary.deferredForCapacity > 0) {
        message += `\n\n${t("modals.data.import.summary.deferred", { count: summary.deferredForCapacity })}`;
      }
      const readIssues: string[] = [];
      if (skipped.length > 0)
        readIssues.push(
          t("modals.data.import.summary.rowsSkipped", { count: skipped.length }),
        );
      if (zeroRows > 0)
        readIssues.push(t("modals.data.import.summary.zeroRows", { count: zeroRows }));
      if (readIssues.length > 0) message += `\n\n${readIssues.join("; ")}.`;
      triggerHaptic("success");
      onImported(message);
      onClose();
    } catch (error: any) {
      triggerHaptic("error");
      onError(error?.message || t("modals.data.import.errors.generic"));
    } finally {
      setBusy(false);
    }
  }, [file, mapping, busy, accountLabel, rememberLayout, signature, onImported, onError, onClose, t]);

  const fieldRow = (label: string, field: ColumnField, value: string | undefined) => (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.fieldValue, !value && styles.fieldValueEmpty]}
        onPress={() => setPicking(field)}
        accessibilityRole="button"
        accessibilityLabel={
          value
            ? t("modals.data.import.fieldA11y", { label, value })
            : t("modals.data.import.fieldA11yEmpty", { label })
        }
      >
        <Text style={[styles.fieldValueText, !value && styles.fieldValueTextEmpty]} numberOfLines={1}>
          {value || t("modals.data.import.chooseColumn")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <Text style={styles.title}>{t("modals.data.import.title")}</Text>
            <Text style={styles.subtitle}>{t("modals.data.import.subtitle")}</Text>

            <Text style={styles.sectionLabel}>{t("modals.data.import.accountLabelSection")}</Text>
            <TextInput
              style={styles.input}
              value={accountLabel}
              onChangeText={setAccountLabel}
              placeholder={t("modals.data.import.accountLabelPlaceholder")}
              placeholderTextColor={colors.textMuted}
              maxLength={40}
              returnKeyType="done"
            />
            <Text style={styles.hint}>{t("modals.data.import.accountLabelHint")}</Text>

            <Text style={styles.sectionLabel}>{t("modals.data.import.columnsSection")}</Text>
            {file?.headerless ? (
              <Text style={styles.hint}>{t("modals.data.import.headerlessHint")}</Text>
            ) : null}
            {fieldRow(t("modals.data.import.field.date"), "date", mapping.dateColumn)}
            {fieldRow(t("modals.data.import.field.description"), "description", mapping.descriptionColumn)}

            <View style={styles.layoutToggle}>
              <TouchableOpacity
                style={[styles.layoutBtn, mapping.layout !== "split" && styles.layoutBtnActive]}
                onPress={() => setLayout("signed")}
              >
                <Text style={[styles.layoutText, mapping.layout !== "split" && styles.layoutTextActive]}>
                  {t("modals.data.import.layout.signed")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.layoutBtn, mapping.layout === "split" && styles.layoutBtnActive]}
                onPress={() => setLayout("split")}
              >
                <Text style={[styles.layoutText, mapping.layout === "split" && styles.layoutTextActive]}>
                  {t("modals.data.import.layout.split")}
                </Text>
              </TouchableOpacity>
            </View>

            {mapping.layout === "split" ? (
              <>
                {fieldRow(t("modals.data.import.field.debit"), "debit", mapping.debitColumn)}
                {fieldRow(t("modals.data.import.field.credit"), "credit", mapping.creditColumn)}
              </>
            ) : (
              <>
                {fieldRow(t("modals.data.import.field.amount"), "amount", mapping.amountColumn)}
                <TouchableOpacity
                  style={styles.signRow}
                  onPress={() =>
                    setMapping((prev) => ({ ...prev, positiveIsOutflow: !prev.positiveIsOutflow }))
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !!mapping.positiveIsOutflow }}
                >
                  <View style={[styles.checkbox, mapping.positiveIsOutflow && styles.checkboxOn]}>
                    {mapping.positiveIsOutflow ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.signText}>
                    {t("modals.data.import.positiveIsOutflow")}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.sectionLabel}>{t("modals.data.import.previewSection")}</Text>
            {preview && preview.transactions.length > 0 ? (
              <View style={styles.previewCard}>
                {preview.transactions.slice(0, PREVIEW_ROWS).map((tx, i) => (
                  <View key={`${tx.providerTxId}-${i}`} style={styles.previewRow}>
                    <View style={styles.previewTextWrap}>
                      <Text style={styles.previewDesc} numberOfLines={1}>
                        {tx.description || t("modals.data.import.noDescription")}
                      </Text>
                      <Text style={styles.previewDate}>{tx.postedAt.slice(0, 10)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.previewAmount,
                        { color: tx.amount < 0 ? colors.danger : colors.success },
                      ]}
                    >
                      {tx.amount < 0 ? "-" : "+"}
                      {formatCurrency(Math.abs(tx.amount))}
                    </Text>
                  </View>
                ))}
                <Text style={styles.previewFooter}>
                  {t("modals.data.import.previewReady", {
                    count: preview.transactions.length,
                  })}
                  {preview.skipped.length > 0
                    ? t("modals.data.import.previewSkipped", {
                        count: preview.skipped.length,
                      })
                    : ""}
                </Text>
              </View>
            ) : (
              <Text style={styles.hint}>
                {complete
                  ? t("modals.data.import.noPreviewComplete")
                  : t("modals.data.import.noPreviewIncomplete")}
              </Text>
            )}

            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberLayout((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberLayout }}
            >
              <View style={[styles.checkbox, rememberLayout && styles.checkboxOn]}>
                {rememberLayout ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.signText}>
                {t("modals.data.import.remember")}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy}>
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importBtn, (!complete || busy) && styles.importBtnDisabled]}
              onPress={handleImport}
              disabled={!complete || busy}
            >
              <Text style={styles.importText}>
                {busy ? t("modals.data.import.importing") : t("modals.data.import.importButton")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Column picker - nested inside this Modal (iOS one-modal rule). */}
      <Modal
        visible={picking !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicking(null)}
      >
        <View style={styles.pickerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicking(null)} />
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>{t("modals.data.import.pickerTitle")}</Text>
            <ScrollView style={styles.pickerScroll}>
              {headers.map((header) => (
                <TouchableOpacity
                  key={header}
                  style={styles.pickerItem}
                  onPress={() => picking && setField(picking, header)}
                >
                  <Text style={styles.pickerItemText} numberOfLines={1}>
                    {header}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

export default BankStatementImportModal;

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "92%",
      paddingTop: 16,
    },
    scroll: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
    title: { fontSize: 20, fontWeight: "700", color: colors.text },
    subtitle: { fontSize: 13, color: colors.textDim, marginBottom: 8, lineHeight: 18 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1,
      color: colors.textMuted,
      marginTop: 14,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 12 : 8,
      color: colors.text,
      fontSize: 15,
    },
    hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 4 },
    fieldRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
    fieldLabel: { width: 130, fontSize: 14, color: colors.text, fontWeight: "600" },
    fieldValue: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    fieldValueEmpty: { borderColor: colors.warning },
    fieldValueText: { fontSize: 14, color: colors.text },
    fieldValueTextEmpty: { color: colors.textMuted },
    layoutToggle: { flexDirection: "row", gap: 8, marginTop: 12 },
    layoutBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.card,
    },
    layoutBtnActive: { borderColor: colors.accent, backgroundColor: `${colors.accent}20` },
    layoutText: { fontSize: 13, fontWeight: "600", color: colors.textDim },
    layoutTextActive: { color: colors.accent },
    signRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    checkboxMark: { color: colors.white, fontSize: 14, fontWeight: "700" },
    signText: { flex: 1, fontSize: 13, color: colors.textDim, lineHeight: 18 },
    previewCard: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      backgroundColor: colors.card,
      padding: 12,
      gap: 8,
    },
    previewRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    previewTextWrap: { flex: 1 },
    previewDesc: { fontSize: 14, color: colors.text },
    previewDate: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    previewAmount: { fontSize: 14, fontWeight: "700" },
    previewFooter: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    rememberRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
    actions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 28 : 16,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    cancelText: { fontSize: 15, fontWeight: "600", color: colors.textDim },
    importBtn: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    importBtnDisabled: { opacity: 0.4 },
    importText: { fontSize: 15, fontWeight: "700", color: colors.white },
    pickerOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    pickerCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 12,
      maxHeight: "70%",
    },
    pickerTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      paddingVertical: 8,
    },
    pickerScroll: { flexGrow: 0 },
    pickerItem: {
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    pickerItemText: { fontSize: 15, color: colors.text },
  });
