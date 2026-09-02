/**
 * BudgetArk - Settle Up
 * File: src/components/SettleUpModal.tsx
 *
 * Month-by-month "who owes what" from person assignments (utils/settleUp):
 * each person's share of the month's assigned expenses, what's been marked
 * settled, and the outstanding balance, with Mark settled / Undo per
 * person. Sibling of PersonReportModal (the yearly view); loads its own
 * entries and settlement records on open, people INCLUDING deleted so a
 * removed household member's open balance still shows.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import SheetModal, { useSheetStyles } from "./SheetModal";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useCurrency } from "../currency/CurrencyProvider";
import { getBudgetEntries } from "../storage/budgetStorage";
import {
  addSettlement,
  getSettlements,
  removeSettlementsFor,
} from "../storage/settlementsStorage";
import { usePeople } from "../people/PeopleProvider";
import { computeSettleUp, type PersonBalance, type SettlementRecord } from "../utils/settleUp";
import { formatMonthKeyLabel, getMonthKey, getMonthKeyOffset } from "../utils/budgetMonths";
import { useValueChanged } from "../hooks/useValueChanged";
import { triggerHaptic } from "../utils/haptics";
import { describeError } from "../utils/errorMessage";
import type { BudgetEntry } from "../types";

interface SettleUpModalProps {
  visible: boolean;
  onClose: () => void;
}

const SettleUpModal: React.FC<SettleUpModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const sheet = useSheetStyles();
  const { formatCurrency } = useCurrency();
  const { peopleIncludingDeleted: people } = usePeople();

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [monthKey, setMonthKey] = useState(() => getMonthKey());
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fresh open: drop the previous open's data so stale totals don't flash.
  if (useValueChanged(visible) && visible && loaded) {
    setLoaded(false);
  }

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void (async () => {
      try {
        const [storedEntries, storedSettlements] = await Promise.all([
          getBudgetEntries(),
          getSettlements(),
        ]);
        if (cancelled) return;
        setEntries(storedEntries);
        setSettlements(storedSettlements);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setEntries([]);
        setSettlements([]);
        setError(describeError(err, "Couldn't load this month."));
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const summary = useMemo(
    () => computeSettleUp(entries, people, monthKey, settlements),
    [entries, monthKey, people, settlements],
  );
  const thisMonth = getMonthKey();

  const handleMarkSettled = useCallback(
    async (balance: PersonBalance) => {
      if (busyId || balance.outstanding <= 0) return;
      setBusyId(balance.personId);
      setError(null);
      try {
        const next = await addSettlement({
          personId: balance.personId,
          monthKey,
          amount: balance.outstanding,
          settledAt: new Date().toISOString(),
        });
        setSettlements(next);
        triggerHaptic("success");
      } catch (err) {
        triggerHaptic("error");
        setError(describeError(err, "Couldn't record the settlement."));
      } finally {
        setBusyId(null);
      }
    },
    [busyId, monthKey],
  );

  const handleUndo = useCallback(
    async (balance: PersonBalance) => {
      if (busyId) return;
      setBusyId(balance.personId);
      setError(null);
      try {
        setSettlements(await removeSettlementsFor(balance.personId, monthKey));
        triggerHaptic("selection");
      } catch (err) {
        triggerHaptic("error");
        setError(describeError(err, "Couldn't undo the settlement."));
      } finally {
        setBusyId(null);
      }
    },
    [busyId, monthKey],
  );

  const hasData = summary.people.length > 0;

  return (
    <SheetModal
      visible={visible}
      onRequestClose={onClose}
      contentContainerStyle={styles.sheetContent}
      footer={
        <TouchableOpacity style={sheet.closeButton} onPress={onClose}>
          <Text style={sheet.closeText}>Close</Text>
        </TouchableOpacity>
      }
    >
      <Text style={sheet.title}>Settle Up</Text>
      <Text style={sheet.subtitle}>
        What each person owes you for the month: their share of every expense
        assigned to them, shared entries split evenly. Mark a person settled
        when they've paid you back.
      </Text>

      <View style={styles.monthRow}>
        <TouchableOpacity
          onPress={() => setMonthKey((key) => getMonthKeyOffset(-1, new Date(`${key}-15T12:00:00`)))}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Text style={styles.monthArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{formatMonthKeyLabel(monthKey)}</Text>
        <TouchableOpacity
          onPress={() => setMonthKey((key) => getMonthKeyOffset(1, new Date(`${key}-15T12:00:00`)))}
          disabled={monthKey >= thisMonth}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Text style={[styles.monthArrow, monthKey >= thisMonth && styles.monthArrowDisabled]}>
            →
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {hasData ? (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>STILL OWED TO YOU</Text>
          <Text style={styles.totalValue}>{formatCurrency(summary.totalOutstanding)}</Text>
          <Text style={styles.totalSub}>
            of {formatCurrency(summary.totalOwed)} assigned this month
          </Text>
        </View>
      ) : null}

      {!loaded ? (
        <Text style={styles.emptyText}>Loading…</Text>
      ) : !hasData ? (
        <Text style={styles.emptyText}>
          Nothing assigned to anyone in {formatMonthKeyLabel(monthKey)}. Assign an
          expense to a person when adding it on the Budget tab (add people under
          Profile → People).
        </Text>
      ) : (
        summary.people.map((balance) => {
          const busy = busyId === balance.personId;
          const settled = balance.outstanding <= 0;
          return (
            <View key={balance.personId} style={styles.personCard}>
              <View style={styles.personHeader}>
                <Text style={styles.personName} numberOfLines={1}>
                  👤 {balance.name}
                  {balance.deleted ? "  (deleted)" : ""}
                </Text>
                <Text style={[styles.personOutstanding, settled && styles.personSettled]}>
                  {settled ? "Settled" : formatCurrency(balance.outstanding)}
                </Text>
              </View>
              <Text style={styles.personMeta}>
                {formatCurrency(balance.owed)} across {balance.entryCount}{" "}
                {balance.entryCount === 1 ? "expense" : "expenses"}
                {balance.settled > 0 ? ` · ${formatCurrency(balance.settled)} settled` : ""}
              </Text>
              <View style={styles.actionRow}>
                {!settled ? (
                  <TouchableOpacity
                    style={[styles.primaryButton, busy && styles.buttonDisabled]}
                    onPress={() => void handleMarkSettled(balance)}
                    disabled={busyId !== null}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${balance.name} settled`}
                  >
                    <Text style={styles.primaryButtonText}>
                      {busy ? "Saving..." : `Mark settled · ${formatCurrency(balance.outstanding)}`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {balance.settled > 0 ? (
                  <TouchableOpacity
                    style={[styles.secondaryButton, busy && styles.buttonDisabled]}
                    onPress={() => void handleUndo(balance)}
                    disabled={busyId !== null}
                    accessibilityRole="button"
                    accessibilityLabel={`Undo settlement for ${balance.name}`}
                  >
                    <Text style={styles.secondaryButtonText}>Undo</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </SheetModal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) =>
  StyleSheet.create({
    sheetContent: {
      paddingBottom: tokens.pad,
    },
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.gap + 4,
      marginVertical: tokens.gap,
    },
    monthArrow: {
      fontSize: 20,
      color: colors.accent,
      fontWeight: "700",
    },
    monthArrowDisabled: {
      color: colors.textMuted,
    },
    monthText: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      minWidth: 150,
      textAlign: "center",
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
      marginBottom: tokens.gap,
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
    personCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gapSm + 2,
    },
    personHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.gapSm,
    },
    personName: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    personOutstanding: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.warning,
    },
    personSettled: {
      color: colors.success,
    },
    personMeta: {
      fontSize: 12,
      color: colors.textDim,
      marginTop: 2,
    },
    actionRow: {
      flexDirection: "row",
      gap: tokens.gapSm,
      marginTop: tokens.gapSm + 2,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusSm + 2,
      paddingVertical: tokens.padSm,
      alignItems: "center",
    },
    primaryButtonText: {
      color: colors.accentButtonText,
      fontWeight: "700",
      fontSize: 13,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm + 2,
      paddingVertical: tokens.padSm,
      paddingHorizontal: tokens.pad,
      alignItems: "center",
    },
    secondaryButtonText: {
      color: colors.textDim,
      fontWeight: "600",
      fontSize: 13,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });

export default React.memo(SettleUpModal);
