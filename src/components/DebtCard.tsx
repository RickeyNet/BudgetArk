/**
 * BudgetArk — DebtCard Component
 * File: src/components/DebtCard.tsx
 *
 * Displays a single debt entry as an interactive card.
 * Shows: name, remaining balance, paid amount, APR, progress ring,
 * payoff timeline, and action buttons (make payment / delete).
 *
 * Features:
 * - Animated progress ring color-coded by payoff percentage
 * - Inline payment input (collapsible)
 * - Status badges (Almost there / Making progress / Keep going)
 * - Estimated months to payoff
 * - Dynamic theming support
 *
 * Performance: Uses React.memo to prevent unnecessary re-renders
 * when sibling debt cards update.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { DEBT_CLASS_OPTIONS, DEBT_OWNER_OPTIONS, Debt } from "../types";
import {
  calcMonthsToPayoff,
  calcMonthsUntilDate,
  calcPaymentForGoalDate,
} from "../utils/calculations";
import ProgressRing from "./ProgressRing";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";

/* ─── Props Interface ─── */
interface DebtCardProps {
  /** The debt data to display */
  debt: Debt;

  /** Callback when user submits a payment — receives (debtId, amount) */
  onPayment: (debtId: string, amount: number) => void;

  /** Callback when user deletes this debt — receives debtId */
  onDelete: (debtId: string) => void;

  /** Callback when user wants to edit this debt */
  onEdit: (debt: Debt) => void;
}

/* ─── Component ─── */
const DebtCard: React.FC<DebtCardProps> = ({ debt, onPayment, onDelete, onEdit }) => {
  /** Get current theme colors */
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();

  /** Memoized styles - only recreate when colors change */
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  /** Local state for the payment input visibility and value */
  const [showPayInput, setShowPayInput] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  /** Derived calculations */
  const percentPaid = debt.originalBalance > 0
    ? ((debt.originalBalance - debt.balance) / debt.originalBalance) * 100
    : 0;

  const monthsLeft = calcMonthsToPayoff(
    debt.balance,
    debt.rate,
    debt.minPayment
  );

  /** Goal date calculations */
  const goalInfo = React.useMemo(() => {
    if (!debt.goalDate || debt.balance <= 0) return null;
    const monthsUntilGoal = calcMonthsUntilDate(debt.goalDate);
    if (monthsUntilGoal <= 0) return { expired: true, monthsUntilGoal: 0, requiredPayment: 0 };
    const requiredPayment = calcPaymentForGoalDate(debt.balance, debt.rate, monthsUntilGoal);
    const onTrack = monthsLeft <= monthsUntilGoal;
    return { expired: false, monthsUntilGoal, requiredPayment, onTrack };
  }, [debt.goalDate, debt.balance, debt.rate, monthsLeft]);

  /** Color coding based on progress */
  const ringColor =
    percentPaid >= 75
      ? colors.success
      : percentPaid >= 40
      ? colors.warning || colors.accent
      : colors.accent;

  const statusBg =
    percentPaid >= 75
      ? colors.successDim
      : percentPaid >= 40
      ? (colors.warningDim || `${colors.accent}20`)
      : `${colors.accent}20`;

  const statusText =
    percentPaid >= 75
      ? "Almost there!"
      : percentPaid >= 40
      ? "Making progress"
      : "Keep going";

  const ownerLabel =
    DEBT_OWNER_OPTIONS.find((option) => option.id === debt.owner)?.label || "Mine";
  const debtClassLabel =
    DEBT_CLASS_OPTIONS.find((option) => option.id === debt.debtClass)?.label ||
    "Credit / Personal";
  const usesInferredType = debt.debtClassSource !== "manual";

  /**
   * Handles payment submission.
   * Validates the amount is positive and doesn't exceed the balance.
   * Uses useCallback to prevent child re-renders.
   */
  const handlePayment = useCallback(() => {
    const amount = parseFloat(payAmount);
    if (amount > 0 && amount <= debt.balance) {
      onPayment(debt.id, amount);
      setPayAmount("");
      setShowPayInput(false);
    }
  }, [payAmount, debt.id, debt.balance, onPayment]);

  return (
    <View style={styles.card}>
      {/* ── Header: Name + Status Badge + Progress Ring ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.nameRow}>
            <Text style={styles.debtName}>{debt.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: ringColor }]}>
                {statusText}
              </Text>
            </View>
          </View>
          <Text style={styles.rateText}>
            {debt.rate}% APR · {formatCurrency(debt.minPayment)}/mo minimum
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.ownerText}>Owner: {ownerLabel} · Type: {debtClassLabel}</Text>
            {usesInferredType && (
              <View style={[styles.inferredBadge, { backgroundColor: colors.warningDim || `${colors.warning || colors.accent}20` }]}>
                <Text style={[styles.inferredBadgeText, { color: colors.warning || colors.accent }]}>Review type</Text>
              </View>
            )}
          </View>
        </View>

        {/* Progress Ring with percent label */}
        <View style={styles.ringContainer}>
          <ProgressRing percent={percentPaid} color={ringColor} />
          <Text style={[styles.ringLabel, { color: ringColor }]}>
            {Math.round(percentPaid)}%
          </Text>
        </View>
      </View>

      {/* ── Balance Row: Remaining vs Paid ── */}
      <View style={styles.balanceRow}>
        <View>
          <Text style={styles.balanceLabel}>REMAINING</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(debt.balance)}
          </Text>
        </View>
        <View style={styles.balanceRight}>
          <Text style={styles.balanceLabel}>PAID OFF</Text>
          <Text style={[styles.balanceAmount, { color: colors.success }]}>
            {formatCurrency(debt.originalBalance - debt.balance)}
          </Text>
        </View>
      </View>

      {/* ── Progress Bar ── */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentPaid}%`,
              backgroundColor: ringColor,
            },
          ]}
        />
      </View>

      {/* ── Goal Date Info ── */}
      {goalInfo && (
        <View style={[styles.goalRow, { backgroundColor: goalInfo.expired ? (colors.dangerDim || "#ff525220") : goalInfo.onTrack ? colors.successDim : `${colors.accent}20` }]}>
          {goalInfo.expired ? (
            <Text style={[styles.goalText, { color: colors.danger || "#ff5252" }]}>
              Goal date has passed
            </Text>
          ) : (
            <>
              <Text style={[styles.goalText, { color: goalInfo.onTrack ? colors.success : colors.accent }]}>
                Goal: {new Date(debt.goalDate!).toLocaleDateString()} ({goalInfo.monthsUntilGoal} mo left)
              </Text>
              {isFinite(goalInfo.requiredPayment) && (
                <Text style={[styles.goalText, { color: goalInfo.onTrack ? colors.success : colors.accent }]}>
                  {goalInfo.onTrack ? "On track" : `Need ${formatCurrency(goalInfo.requiredPayment)}/mo`}
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* ── Footer: Timeline + Action Buttons ── */}
      <View style={styles.footerRow}>
        <Text style={styles.timelineText}>
          {monthsLeft === Infinity
            ? "Adjust payment plan"
            : `${monthsLeft} months to payoff`}
        </Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: colors.accent }]}
            onPress={() => setShowPayInput(!showPayInput)}
          >
            <Text style={[styles.payButtonText, { color: colors.accentButtonText }]}>
              Pay
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: `${colors.accent}20` }]}
            onPress={() => onEdit(debt)}
          >
            <Text style={[styles.editButtonText, { color: colors.accent }]}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.dangerDim || '#ff525220' }]}
            onPress={() => onDelete(debt.id)}
          >
            <Text style={[styles.deleteButtonText, { color: colors.danger || '#ff5252' }]}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Collapsible Payment Input ── */}
      {showPayInput && (
        <View style={styles.payInputRow}>
          <TextInput
            style={[
              styles.payInput,
              {
                backgroundColor: colors.bg,
                borderColor: colors.cardBorder,
                color: colors.text,
              },
            ]}
            placeholder="Payment amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={payAmount}
            onChangeText={setPayAmount}
          />
          <TouchableOpacity
            style={[styles.confirmPayButton, { backgroundColor: colors.success }]}
            onPress={handlePayment}
          >
            <Text style={[styles.confirmPayText, { color: colors.bg }]}>
              ✓
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/**
 * Style factory function - creates styles based on current theme
 * Memoized at call site to prevent unnecessary recreation
 */
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
    },

    /* Header */
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    headerLeft: {
      flex: 1,
      marginRight: 12,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    debtName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 20,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "600",
    },
    rateText: {
      fontSize: 13,
      color: colors.textDim,
    },
    ownerText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 2,
      flexWrap: "wrap",
    },
    inferredBadge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    inferredBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.2,
    },

    /* Progress Ring */
    ringContainer: {
      width: 64,
      height: 64,
      justifyContent: "center",
      alignItems: "center",
    },
    ringLabel: {
      position: "absolute",
      fontSize: 13,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },

    /* Balance Row */
    balanceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 16,
    },
    balanceRight: {
      alignItems: "flex-end",
    },
    balanceLabel: {
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 2,
    },
    balanceAmount: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },

    /* Progress Bar */
    progressTrack: {
      height: 6,
      backgroundColor: colors.cardBorder,
      borderRadius: 3,
      marginTop: 12,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
    },

    /* Goal */
    goalRow: {
      borderRadius: 10,
      padding: 10,
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    goalText: {
      fontSize: 12,
      fontWeight: "600",
    },

    /* Footer */
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
    },
    timelineText: {
      fontSize: 12,
      color: colors.textDim,
    },
    actionButtons: {
      flexDirection: "row",
      gap: 8,
    },
    payButton: {
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    payButtonText: {
      fontSize: 12,
      fontWeight: "600",
    },
    editButton: {
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    editButtonText: {
      fontSize: 12,
      fontWeight: "600",
    },
    deleteButton: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    deleteButtonText: {
      fontSize: 12,
    },

    /* Payment Input */
    payInputRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    payInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      fontVariant: ["tabular-nums"],
    },
    confirmPayButton: {
      borderRadius: 8,
      paddingHorizontal: 16,
      justifyContent: "center",
    },
    confirmPayText: {
      fontWeight: "700",
      fontSize: 14,
    },
  });

export default React.memo(DebtCard);
