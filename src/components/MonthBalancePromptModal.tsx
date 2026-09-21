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
import { describeError } from "../utils/errorMessage";
import { parseMoneyInput } from "../utils/parseMoneyInput";
import { useTranslation } from "react-i18next";
import { getMonthDateFromKey, getMonthKey } from "../utils/budgetMonths";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
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

/** Shared money rule (utils/parseMoneyInput); negatives allowed - overdrawn happens. */
const parseBalanceInput = (text: string): number | null => {
  const value = parseMoneyInput(text, { allowNegative: true });
  return value === null ? null : roundCashAmount(value);
};

const MonthBalancePromptModal: React.FC<MonthBalancePromptModalProps> = ({
  monthKey,
  isPrompt,
  existingBalance,
  onSaved,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  // Month name in the app language (the shared util formats in the device
  // locale, which can differ from a fixed in-app language choice).
  const monthLabel = useMemo(
    () =>
      getMonthDateFromKey(monthKey).toLocaleDateString(i18n.language, {
        month: "long",
        year: "numeric",
      }),
    [i18n.language, monthKey]
  );

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
  const isCurrent = monthKey === getMonthKey();
  // A single checking account can safely mirror the entered total; more
  // than one can't be distributed from one number.
  const accountToUpdate =
    isCurrent && checkingAccounts.length === 1 ? checkingAccounts[0] : null;

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (parsed === null || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const balances = await setMonthStartBalance(monthKey, parsed);
      let accounts: AssetAccount[] | null = null;
      if (accountToUpdate && accountToUpdate.balance !== parsed) {
        accounts = await updateAssetAccount(accountToUpdate.id, {
          balance: parsed,
        });
      }
      onSaved(balances, accounts);
    } catch (error) {
      // Storage failure: keep the modal open so the entry isn't lost, and
      // say why the Save didn't take.
      setSaving(false);
      setSaveError(describeError(error, t("budget.cards.monthBalance.saveFailed")));
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAwareModalOverlay style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {isPrompt
              ? t("budget.cards.monthBalance.promptTitle")
              : t("budget.cards.monthBalance.title")}
          </Text>
          <Text style={styles.subtitle}>
            {t("budget.cards.monthBalance.subtitle", { month: monthLabel })}
          </Text>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t("budget.cards.monthBalance.inputPlaceholder")}
            placeholderTextColor={colors.textDim}
            keyboardType="numbers-and-punctuation"
            autoFocus
            accessibilityLabel={t("budget.cards.monthBalance.inputA11y")}
          />

          {checkingTotal !== null && parsed !== checkingTotal && (
            <TouchableOpacity
              style={styles.prefillChip}
              onPress={() => setInput(String(checkingTotal))}
              accessibilityRole="button"
            >
              <Text style={styles.prefillChipText}>
                {t("budget.cards.monthBalance.usePrefill", {
                  amount: formatCurrency(checkingTotal),
                })}
              </Text>
            </TouchableOpacity>
          )}

          {accountToUpdate && parsed !== null && parsed !== accountToUpdate.balance && (
            <Text style={styles.note}>
              {t("budget.cards.monthBalance.alsoUpdates", { account: accountToUpdate.name })}
            </Text>
          )}
          {saveError ? (
            <Text style={[styles.note, { color: colors.danger }]}>{saveError}</Text>
          ) : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving}
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>
                {isPrompt ? t("budget.cards.monthBalance.notNow") : t("common.cancel")}
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
                {saving ? t("budget.cards.monthBalance.saving") : t("common.save")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareModalOverlay>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: tokens.padLg,
    },
    card: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: tokens.radius,
      padding: tokens.padLg,
    },
    title: {
      fontSize: scale(17),
      fontWeight: "700",
      color: colors.text,
      marginBottom: tokens.gapSm,
    },
    subtitle: {
      fontSize: scale(13),
      lineHeight: scale(18),
      color: colors.textMuted,
      marginBottom: tokens.gap,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      backgroundColor: colors.bg,
      color: colors.text,
      fontSize: scale(22),
      fontWeight: "600",
      paddingHorizontal: tokens.pad,
      paddingVertical: tokens.padSm,
    },
    prefillChip: {
      alignSelf: "flex-start",
      marginTop: tokens.gapSm,
      paddingHorizontal: tokens.padSm,
      paddingVertical: tokens.padSm,
      borderRadius: tokens.radiusSm,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    prefillChipText: {
      fontSize: scale(12),
      color: colors.accent,
      fontWeight: "600",
    },
    note: {
      marginTop: tokens.gapSm,
      fontSize: scale(12),
      lineHeight: scale(16),
      color: colors.textDim,
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: tokens.gapSm,
      marginTop: tokens.gap,
    },
    cancelBtn: {
      paddingHorizontal: tokens.pad,
      paddingVertical: tokens.padSm,
    },
    cancelBtnText: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.textMuted,
    },
    saveBtn: {
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.padLg,
      paddingVertical: tokens.padSm,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      fontSize: scale(14),
      fontWeight: "700",
      color: colors.accentButtonText,
    },
  });
};

export default MonthBalancePromptModal;
