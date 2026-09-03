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
        setError(describeError(err, "Couldn't load your loans."));
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

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
      const amount = parseFloat(draftAmount.replace(/[^0-9.]/g, ""));
      if (!(amount > 0)) {
        setError("Enter the amount they paid.");
        return;
      }
      if (amount > line.outstanding + 0.001) {
        setError(
          `That's more than the ${formatCurrency(line.outstanding)} still owed.`
        );
        return;
      }
      const dateKey = draftDate.trim();
      if (!DATE_KEY_RE.test(dateKey) || !Number.isFinite(Date.parse(dateKey))) {
        setError("Date must look like 2026-09-15.");
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
          setError("Couldn't record that payment - reopen and try again.");
          triggerHaptic("error");
        } else {
          await reload();
          setFormLoanId(null);
          triggerHaptic("success");
        }
      } catch (err) {
        triggerHaptic("error");
        setError(describeError(err, "Couldn't record the payment."));
      } finally {
        setBusy(false);
      }
    },
    [busy, draftAmount, draftDate, draftNote, formatCurrency, reload]
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
        setError(describeError(err, "Couldn't remove the payment."));
      } finally {
        setBusy(false);
      }
    },
    [busy, reload]
  );

  const renderLoan = (line: LoanLine) => {
    const { entry } = line;
    const formOpen = formLoanId === entry.id;
    const title = entry.description?.trim() || entry.category;
    return (
      <View key={entry.id} style={styles.loanRow}>
        <View style={styles.loanHeader}>
          <View style={styles.loanTitleWrap}>
            <Text style={styles.loanTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.loanMeta}>
              {formatDayLabel(entry.date)} · lent {formatCurrency(entry.amount)}
              {line.repaid > 0 ? ` · ${formatCurrency(line.repaid)} back` : ""}
            </Text>
          </View>
          <Text style={[styles.loanOutstanding, line.settled && styles.loanSettled]}>
            {line.settled ? "Paid back" : formatCurrency(line.outstanding)}
          </Text>
        </View>

        {(entry.loanRepayments ?? []).map((repayment) => (
          <View key={repayment.id} style={styles.repaymentRow}>
            <Text style={styles.repaymentText} numberOfLines={1}>
              ↳ {formatDayLabel(repayment.date)} · {formatCurrency(repayment.amount)}
              {repayment.note ? ` · ${repayment.note}` : ""}
            </Text>
            <TouchableOpacity
              onPress={() => void handleRemovePayment(entry.id, repayment.id)}
              disabled={busy}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Remove the ${formatCurrency(repayment.amount)} payment`}
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
            accessibilityLabel={`Log a payment from ${entry.lentTo ?? "the borrower"}`}
          >
            <Text style={styles.secondaryButtonText}>Log payment</Text>
          </TouchableOpacity>
        ) : null}

        {formOpen ? (
          <View style={styles.form}>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>AMOUNT</Text>
                <TextInput
                  style={styles.input}
                  value={draftAmount}
                  onChangeText={setDraftAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>RECEIVED ON</Text>
                <TextInput
                  style={styles.input}
                  value={draftDate}
                  onChangeText={setDraftDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
            </View>
            <Text style={styles.formLabel}>NOTE (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={draftNote}
              onChangeText={setDraftNote}
              placeholder="Cash, Venmo, ..."
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
                  {busy ? "Saving..." : "Save payment"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setDraftAmount(String(line.outstanding))}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Fill in the full amount still owed"
              >
                <Text style={styles.secondaryButtonText}>
                  Paid in full · {formatCurrency(line.outstanding)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={closeForm}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
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
            {settled ? "All paid back" : formatCurrency(balance.outstanding)}
          </Text>
        </View>
        <Text style={styles.borrowerMeta}>
          {formatCurrency(balance.lent)} lent across {balance.loans.length}{" "}
          {balance.loans.length === 1 ? "loan" : "loans"}
          {balance.repaid > 0 ? ` · ${formatCurrency(balance.repaid)} paid back` : ""}
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
          <Text style={sheet.closeText}>Close</Text>
        </TouchableOpacity>
      }
    >
      <Text style={sheet.title}>Owed to You</Text>
      <Text style={sheet.subtitle}>
        Money you've lent out. Mark an expense "lent to" someone when you log
        it (or in the Review Inbox), then record what they pay back here.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {hasLoans ? (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>STILL OWED TO YOU</Text>
          <Text style={styles.totalValue}>{formatCurrency(ledger.totalOutstanding)}</Text>
          <Text style={styles.totalSub}>
            {formatCurrency(ledger.totalLent)} lent · {formatCurrency(ledger.totalRepaid)}{" "}
            paid back
          </Text>
        </View>
      ) : null}

      {!loaded ? (
        <Text style={styles.emptyText}>Loading…</Text>
      ) : !hasLoans ? (
        <Text style={styles.emptyText}>
          Nothing lent out yet. When you add an expense on the Budget tab, fill
          in "Lent to someone?" with the person's name and it will show up
          here.
        </Text>
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
                  ? "Hide paid-back loans"
                  : `Show ${hiddenSettledCount} paid-back ${
                      hiddenSettledCount === 1 ? "loan" : "loans"
                    }`}
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
