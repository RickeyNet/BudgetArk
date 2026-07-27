/**
 * BudgetArk - Month Balance Prompt Modal
 * File: src/components/MonthBalancePromptModal.tsx
 *
 * Asks for the month's starting checking balance - fired once per calendar
 * month from the Budget tab (skippable, never re-nags until next month) and
 * reachable any time from the Cash Flow card's Set/Update button. Saving
 * writes the month's record to monthlyBalanceStorage; when the month is the
 * CURRENT month and exactly one live checking account exists, the account's
 * Bridge balance is updated in the same step so net worth stays correct
 * (with multiple checking accounts a single total can't be distributed, so
 * only the month record is written and the accounts are left alone).
 *
 * Mounted only while open (parent conditionally renders), so its account
 * read happens on demand.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import type { AssetAccount } from "../types";
import { KeyboardAwareModalOverlay } from "./KeyboardAwareModalOverlay";
import { getAssetAccounts, updateAssetAccount } from "../storage/assetAccountStorage";
import { setMonthStartBalance } from "../storage/monthlyBalanceStorage";
import { roundCashAmount, type MonthStartBalanceMap } from "../utils/cashFlow";

interface MonthBalancePromptModalProps {
  /** Month being recorded (YYYY-MM). */
  monthKey: string;
  /** True when the modal fired as the once-per-month nudge (softer copy). */
  isPrompt: boolean;
  /** Existing record's balance when editing, or null for a fresh entry. */
  existingBalance: number | null;
  /**
   * Balance saved. `accounts` carries the refreshed account list when the
   * save also updated the single checking account, else null.
   */
  onSaved: (balances: MonthStartBalanceMap, accounts: AssetAccount[] | null) => void;
  onClose: () => void;
}

const monthLabel = (monthKey: string): string =>
  new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

const currentMonthKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

/** Accepts "1,234.56" and "1234,56" style typing; null when not a number. */
const parseBalanceInput = (text: string): number | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  // If a comma appears but no dot, treat the comma as the decimal separator;
  // otherwise commas are thousands separators and drop out.
  const normalized =
    trimmed.includes(",") && !trimmed.includes(".")
      ? trimmed.replace(/,/g, ".")
      : trimmed.replace(/,/g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value) || Math.abs(value) > 1_000_000_000) return null;
  return roundCashAmount(value);
};

const MonthBalancePromptModal: React.FC<MonthBalancePromptModalProps> = ({
  monthKey,
  isPrompt,
  existingBalance,
  onSaved,
  onClose,
}) => {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [input, setInput] = useState(
    existingBalance !== null ? String(existingBalance) : ""
  );
  const [checkingAccounts, setCheckingAccounts] = useState<AssetAccount[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAssetAccounts()
      .then((accounts) => {
        if (cancelled) return;
        setCheckingAccounts(accounts.filter((a) => a.category === "checking"));
      })
      .catch(() => {
        // Prefill is a convenience - the manual input still works without it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const checkingTotal = useMemo(
    () =>
      checkingAccounts.length > 0
        ? roundCashAmount(
            checkingAccounts.reduce((sum, a) => sum + a.balance, 0)
          )
        : null,
    [checkingAccounts]
  );

  const parsed = parseBalanceInput(input);
  const isCurrent = monthKey === currentMonthKey();
  // A single checking account can safely mirror the entered total; more
  // than one can't be distributed from one number.
  const accountToUpdate =
    isCurrent && checkingAccounts.length === 1 ? checkingAccounts[0] : null;

  const handleSave = async () => {
    if (parsed === null || saving) return;
    setSaving(true);
    try {
      const balances = await setMonthStartBalance(monthKey, parsed);
      let accounts: AssetAccount[] | null = null;
      if (accountToUpdate && accountToUpdate.balance !== parsed) {
        accounts = await updateAssetAccount(accountToUpdate.id, {
          balance: parsed,
        });
      }
      onSaved(balances, accounts);
    } catch {
      // Storage failure: keep the modal open so the entry isn't lost.
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAwareModalOverlay style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {isPrompt ? "New month - update your balance" : "Starting balance"}
          </Text>
          <Text style={styles.subtitle}>
            What's in checking at the start of {monthLabel(monthKey)}? BudgetArk
            uses it to project your end-of-month cash and what's safe to spend.
          </Text>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="0.00"
            placeholderTextColor={colors.textDim}
            keyboardType="numbers-and-punctuation"
            autoFocus
            accessibilityLabel="Starting checking balance"
          />

          {checkingTotal !== null && parsed !== checkingTotal && (
            <TouchableOpacity
              style={styles.prefillChip}
              onPress={() => setInput(String(checkingTotal))}
              accessibilityRole="button"
            >
              <Text style={styles.prefillChipText}>
                Use Bridge checking total: {formatCurrency(checkingTotal)}
              </Text>
            </TouchableOpacity>
          )}

          {accountToUpdate && parsed !== null && parsed !== accountToUpdate.balance && (
            <Text style={styles.note}>
              Also updates "{accountToUpdate.name}" on your Bridge so net worth
              stays current.
            </Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving}
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>
                {isPrompt ? "Not now" : "Cancel"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (parsed === null || saving) && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={parsed === null || saving}
              accessibilityRole="button"
            >
              <Text style={styles.saveBtnText}>
                {saving ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareModalOverlay>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 20,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      marginBottom: 14,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      backgroundColor: colors.bg,
      color: colors.text,
      fontSize: 22,
      fontWeight: "600",
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    prefillChip: {
      alignSelf: "flex-start",
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    prefillChipText: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: "600",
    },
    note: {
      marginTop: 10,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textDim,
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 18,
    },
    cancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
    },
    saveBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 22,
      paddingVertical: 10,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.accentButtonText,
    },
  });

export default MonthBalancePromptModal;
