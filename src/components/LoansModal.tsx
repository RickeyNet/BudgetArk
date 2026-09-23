/**
 * BudgetArk - Owed to You
 * File: src/components/LoansModal.tsx
 *
 * The money-lent-out tracker under Profile → People: every expense marked
 * "lent to" someone (BudgetEntry.lentTo), grouped by borrower with what
 * they still owe, and a "Log payment" form per loan that records what
 * came back (BudgetEntry.loanRepayments). Sibling of PersonReportModal.
 * Loads its own entries on open; the arithmetic and grouping live in
 * utils/loans, the writes go through budgetStorage's queued mutators so
 * two quick taps can't overpay a loan.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import SheetModal, { useSheetStyles } from "./SheetModal";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useCurrency } from "../currency/CurrencyProvider";
import {
  addLoanRepaymentToEntry,
  getBudgetEntries,
  removeLoanRepaymentFromEntry,
} from "../storage/budgetStorage";
import {
  buildLoanLedger,
  LOAN_REPAYMENT_NOTE_MAX_LENGTH,
  type BorrowerBalance,
  type LoanLine,
} from "../utils/loans";
import { formatDayLabel } from "../utils/dateFormat";
import { useCategoryLabel } from "../i18n/categoryLabel";
import { parseMoneyInput } from "../utils/parseMoneyInput";
import { toLocalDateKey } from "../utils/paycheckCycle";
import { generateUUID } from "../utils/uuid";
import { useValueChanged } from "../hooks/useValueChanged";
import { triggerHaptic } from "../utils/haptics";
import { describeError } from "../utils/errorMessage";
import type { BudgetEntry } from "../types";

interface LoansModalProps {
  visible: boolean;
  onClose: () => void;
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const LoansModal: React.FC<LoansModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const sheet = useSheetStyles();
  const { formatCurrency } = useCurrency();

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showSettled, setShowSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Loan whose "Log payment" form is open, with its draft fields. */
  const [formLoanId, setFormLoanId] = useState<string | null>(null);
  const [draftAmount, setDraftAmount] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftNote, setDraftNote] = useState("");

  // Fresh open: drop the previous open's data so stale totals don't flash.
  if (useValueChanged(visible) && visible && loaded) {
    setLoaded(false);
    setFormLoanId(null);
  }

  const reload = useCallback(async () => {
    const stored = await getBudgetEntries();
    setEntries(stored);
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void (async () => {
      try {
        const stored = await getBudgetEntries();
        if (cancelled) return;
        setEntries(stored);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setEntries([]);
        setError(describeError(err, t("modals.people.loans.errors.load")));
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [t, visible]);

  const ledger = useMemo(() => buildLoanLedger(entries), [entries]);
  const hiddenSettledCount = useMemo(
    () =>
      ledger.borrowers.reduce(
        (n, b) => n + b.loans.filter((l) => l.settled).length,
        0
      ),
    [ledger]
  );

  const openForm = useCallback((line: LoanLine) => {
    setFormLoanId(line.entry.id);
    setDraftAmount(String(line.outstanding));
    setDraftDate(toLocalDateKey(new Date()));
    setDraftNote("");
    setError(null);
  }, []);

  const closeForm = useCallback(() => {
    setFormLoanId(null);
    setError(null);
  }, []);

  const handleSavePayment = useCallback(
    async (line: LoanLine) => {
      if (busy) return;
      const amount = parseMoneyInput(draftAmount) ?? 0;
      if (!(amount > 0)) {
        setError(t("modals.people.loans.errors.amountRequired"));
        return;
      }
      if (amount > line.outstanding + 0.001) {
        setError(
          t("modals.people.loans.errors.overpay", {
            amount: formatCurrency(line.outstanding),
          })
        );
        return;
      }
      const dateKey = draftDate.trim();
      if (!DATE_KEY_RE.test(dateKey) || !Number.isFinite(Date.parse(dateKey))) {
        setError(t("modals.people.loans.errors.dateFormat"));
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const updated = await addLoanRepaymentToEntry(line.entry.id, {
          id: generateUUID(),
          amount,
          date: `${dateKey}T12:00:00.000Z`,
          note: draftNote,
          createdAt: new Date().toISOString(),
        });
        if (!updated) {
          setError(t("modals.people.loans.errors.recordFailedReopen"));
          triggerHaptic("error");
        } else {
          await reload();
          setFormLoanId(null);
          triggerHaptic("success");
        }
      } catch (err) {
        triggerHaptic("error");
        setError(describeError(err, t("modals.people.loans.errors.recordFailed")));
      } finally {
        setBusy(false);
      }
    },
    [busy, draftAmount, draftDate, draftNote, formatCurrency, reload, t]
  );

  const handleRemovePayment = useCallback(
    async (entryId: string, repaymentId: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        await removeLoanRepaymentFromEntry(entryId, repaymentId);
        await reload();
        triggerHaptic("selection");
      } catch (err) {
        triggerHaptic("error");
        setError(describeError(err, t("modals.people.loans.errors.removeFailed")));
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, t]
  );

  const renderLoan = (line: LoanLine) => {
    const { entry } = line;
    const formOpen = formLoanId === entry.id;
    const title = entry.description?.trim() || categoryLabel(entry.category);
    return (
      <View key={entry.id} style={styles.loanRow}>
        <View style={styles.loanHeader}>
          <View style={styles.loanTitleWrap}>
            <Text style={styles.loanTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.loanMeta}>
              {t("modals.people.loans.loanMeta", {
                date: formatDayLabel(entry.date),
                amount: formatCurrency(entry.amount),
              })}
              {line.repaid > 0
                ? ` · ${t("modals.people.loans.repaidBack", { amount: formatCurrency(line.repaid) })}`
                : ""}
            </Text>
          </View>
          <Text style={[styles.loanOutstanding, line.settled && styles.loanSettled]}>
            {line.settled ? t("modals.people.loans.paidBack") : formatCurrency(line.outstanding)}
          </Text>
        </View>

        {(entry.loanRepayments ?? []).map((repayment) => (
          <View key={repayment.id} style={styles.repaymentRow}>
            <Text style={styles.repaymentText} numberOfLines={1}>
              {t("modals.people.loans.repaymentLine", {
                date: formatDayLabel(repayment.date),
                amount: formatCurrency(repayment.amount),
              })}
              {repayment.note ? ` · ${repayment.note}` : ""}
            </Text>
            <TouchableOpacity
              onPress={() => void handleRemovePayment(entry.id, repayment.id)}
              disabled={busy}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t("modals.people.loans.removeRepaymentA11y", { amount: formatCurrency(repayment.amount) })}
            >
              <Text style={styles.repaymentRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {!line.settled && !formOpen ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => openForm(line)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("modals.people.loans.logPaymentA11y", { name: entry.lentTo ?? t("modals.people.loans.borrowerFallback") })}
          >
            <Text style={styles.secondaryButtonText}>{t("modals.people.loans.logPayment")}</Text>
          </TouchableOpacity>
        ) : null}

        {formOpen ? (
          <View style={styles.form}>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>{t("modals.people.loans.form.amount")}</Text>
                <TextInput
                  style={styles.input}
                  value={draftAmount}
                  onChangeText={setDraftAmount}
                  keyboardType="decimal-pad"
                  placeholder={t("modals.people.loans.form.amountPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>{t("modals.people.loans.form.receivedOn")}</Text>
                <TextInput
                  style={styles.input}
                  value={draftDate}
                  onChangeText={setDraftDate}
                  placeholder={t("modals.people.loans.form.datePlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
            </View>
            <Text style={styles.formLabel}>{t("modals.people.loans.form.note")}</Text>
            <TextInput
              style={styles.input}
              value={draftNote}
              onChangeText={setDraftNote}
              placeholder={t("modals.people.loans.form.notePlaceholder")}
              placeholderTextColor={colors.textMuted}
              maxLength={LOAN_REPAYMENT_NOTE_MAX_LENGTH}
              returnKeyType="done"
            />
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryButton, busy && styles.buttonDisabled]}
                onPress={() => void handleSavePayment(line)}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>
                  {busy ? t("modals.people.loans.form.saving") : t("modals.people.loans.form.save")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setDraftAmount(String(line.outstanding))}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t("modals.people.loans.form.paidInFullA11y")}
              >
                <Text style={styles.secondaryButtonText}>
                  {t("modals.people.loans.form.paidInFull", {
                    amount: formatCurrency(line.outstanding),
                  })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={closeForm}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderBorrower = (balance: BorrowerBalance) => {
    const loans = showSettled ? balance.loans : balance.loans.filter((l) => !l.settled);
    if (loans.length === 0) return null;
    const settled = balance.outstanding <= 0;
    return (
      <View key={balance.key} style={styles.borrowerCard}>
        <View style={styles.borrowerHeader}>
          <Text style={styles.borrowerName} numberOfLines={1}>
            🤝 {balance.name}
          </Text>
          <Text style={[styles.borrowerOutstanding, settled && styles.loanSettled]}>
            {settled ? t("modals.people.loans.allPaidBack") : formatCurrency(balance.outstanding)}
          </Text>
        </View>
        <Text style={styles.borrowerMeta}>
          {t("modals.people.loans.borrowerMeta", {
            count: balance.loans.length,
            lent: formatCurrency(balance.lent),
          })}
          {balance.repaid > 0
            ? ` · ${t("modals.people.loans.borrowerRepaid", { amount: formatCurrency(balance.repaid) })}`
            : ""}
        </Text>
        {loans.map(renderLoan)}
      </View>
    );
  };

  const hasLoans = ledger.loanCount > 0;

  return (
    <SheetModal
      visible={visible}
      onRequestClose={onClose}
      keyboardAvoiding
      contentContainerStyle={styles.sheetContent}
      footer={
        <TouchableOpacity style={sheet.closeButton} onPress={onClose}>
          <Text style={sheet.closeText}>{t("common.close")}</Text>
        </TouchableOpacity>
      }
    >
      <Text style={sheet.title}>{t("modals.people.loans.title")}</Text>
      <Text style={sheet.subtitle}>{t("modals.people.loans.subtitle")}</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {hasLoans ? (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{t("modals.people.loans.stillOwed")}</Text>
          <Text style={styles.totalValue}>{formatCurrency(ledger.totalOutstanding)}</Text>
          <Text style={styles.totalSub}>
            {t("modals.people.loans.totalSub", {
              lent: formatCurrency(ledger.totalLent),
              repaid: formatCurrency(ledger.totalRepaid),
            })}
          </Text>
        </View>
      ) : null}

      {!loaded ? (
        <Text style={styles.emptyText}>{t("modals.people.loans.loading")}</Text>
      ) : !hasLoans ? (
        <Text style={styles.emptyText}>{t("modals.people.loans.empty")}</Text>
      ) : (
        <>
          {ledger.borrowers.map(renderBorrower)}
          {hiddenSettledCount > 0 ? (
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setShowSettled((v) => !v)}
              accessibilityRole="button"
            >
              <Text style={styles.toggleText}>
                {showSettled
                  ? t("modals.people.loans.hideSettled")
                  : t("modals.people.loans.showSettled", { count: hiddenSettledCount })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </SheetModal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) =>
  StyleSheet.create({
    sheetContent: {
      paddingBottom: tokens.pad,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      marginBottom: tokens.gapSm,
    },
    totalCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      alignItems: "center",
      marginVertical: tokens.gap,
    },
    totalLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      color: colors.textDim,
    },
    totalValue: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      marginTop: 4,
    },
    totalSub: {
      fontSize: 12,
      color: colors.textDim,
      marginTop: 2,
    },
    emptyText: {
      color: colors.textDim,
      fontSize: 14,
      textAlign: "center",
      marginVertical: tokens.gap,
      lineHeight: 20,
    },
    borrowerCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gapSm + 2,
    },
    borrowerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.gapSm,
    },
    borrowerName: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    borrowerOutstanding: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.warning,
    },
    borrowerMeta: {
      fontSize: 12,
      color: colors.textDim,
      marginTop: 2,
      marginBottom: tokens.gapSm,
    },
    loanRow: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: tokens.gapSm,
      marginTop: tokens.gapSm,
    },
    loanHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.gapSm,
    },
    loanTitleWrap: {
      flex: 1,
    },
    loanTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    loanMeta: {
      fontSize: 12,
      color: colors.textDim,
      marginTop: 1,
    },
    loanOutstanding: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.warning,
    },
    loanSettled: {
      color: colors.success,
    },
    repaymentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.gapSm,
      marginTop: 4,
      paddingLeft: 4,
    },
    repaymentText: {
      flex: 1,
      fontSize: 12,
      color: colors.textDim,
    },
    repaymentRemove: {
      fontSize: 13,
      color: colors.textMuted,
      paddingHorizontal: 4,
    },
    form: {
      marginTop: tokens.gapSm,
      gap: 6,
    },
    formRow: {
      flexDirection: "row",
      gap: tokens.gapSm,
    },
    formField: {
      flex: 1,
      gap: 6,
    },
    formLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      color: colors.textDim,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      backgroundColor: colors.bg,
      color: colors.text,
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.gapSm,
      marginTop: 4,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    primaryButtonText: {
      color: colors.accentButtonText,
      fontSize: 13,
      fontWeight: "700",
    },
    secondaryButton: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginTop: 6,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    toggleRow: {
      alignItems: "center",
      paddingVertical: tokens.gapSm,
    },
    toggleText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "600",
    },
  });

export default LoansModal;
