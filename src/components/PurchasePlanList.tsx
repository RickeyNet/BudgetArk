/**
 * BudgetArk - Purchase Plan List
 * File: src/components/PurchasePlanList.tsx
 *
 * The shared "your purchase plans" list: progress rows for every non-EF
 * savings goal plus the contribute and delete modals that manage them.
 * Rendered in two places - the Bridge's always-visible Purchase Plans
 * card (the tracking home) and the Charts tab's Plan a Purchase tool
 * (the planning wizard) - so both surfaces stay in lockstep instead of
 * drifting copies. Mutations go through savingsGoalStorage (tombstoned,
 * synced, exported); the fresh array is handed back via onGoalsChanged.
 */

import React, { useCallback, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareModalOverlay } from "./KeyboardAwareModalOverlay";
import { describeError } from "../utils/errorMessage";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type { SavingsGoal, SavingsGoalCategory } from "../types";
import {
  deleteSavingsGoal,
  updateSavingsGoal,
} from "../storage/savingsGoalStorage";
import { calcRequiredMonthly } from "../utils/purchasePlanner";
import { triggerHaptic } from "../utils/haptics";

/** Purchase-friendly labels for the existing SavingsGoal categories. */
export const PLAN_CATEGORIES: readonly {
  key: SavingsGoalCategory;
  label: string;
  icon: string;
}[] = [
  { key: "car", label: "Car", icon: "🚗" },
  { key: "home", label: "Home", icon: "🏠" },
  { key: "travel", label: "Travel", icon: "✈️" },
  { key: "education", label: "Education", icon: "🎓" },
  { key: "other", label: "Other", icon: "🎁" },
];

export const iconForPlanCategory = (category: SavingsGoalCategory): string =>
  PLAN_CATEGORIES.find((c) => c.key === category)?.icon ?? "🎁";

/** Parse a user-typed amount; NaN-safe, returns 0 for junk. */
export const parsePlanAmount = (text: string): number => {
  const parsed = parseFloat(text.replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatPlanMonthYear = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: "short", year: "numeric" });

/**
 * The goals this list manages: everything except the emergency fund
 * (which has its own row/calculator surfaces), newest first.
 */
export const filterPurchasePlans = (goals: SavingsGoal[]): SavingsGoal[] =>
  goals
    .filter((goal) => goal.category !== "emergency_fund")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

type PurchasePlanListProps = {
  /** Full goals array; the EF filter happens here. */
  savingsGoals: SavingsGoal[];
  /** Receives the live goals array after any mutation this list makes. */
  onGoalsChanged: (goals: SavingsGoal[]) => void;
  /** Rendered when there are no plans; omit to render nothing at all. */
  emptyText?: string;
};

const PurchasePlanList: React.FC<PurchasePlanListProps> = ({
  savingsGoals,
  onGoalsChanged,
  emptyText,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = React.useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [contributeText, setContributeText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);
  /** Last failed contribute/delete, shown inside the plan dialog. */
  const [actionError, setActionError] = useState<string | null>(null);

  const plans = filterPurchasePlans(savingsGoals);

  const handleContribute = useCallback(async () => {
    if (!contributeGoal) return;
    const amount = parsePlanAmount(contributeText);
    if (amount === 0) {
      setContributeGoal(null);
      setContributeText("");
      return;
    }
    setActionError(null);
    try {
      const updated = await updateSavingsGoal(contributeGoal.id, {
        currentAmount: Math.max(0, contributeGoal.currentAmount + amount),
      });
      triggerHaptic("success");
      setContributeGoal(null);
      setContributeText("");
      onGoalsChanged(updated);
    } catch (error) {
      // Dialog stays open with the typed amount so the user can retry.
      triggerHaptic("error");
      setActionError(describeError(error, "Couldn't save this contribution."));
    }
  }, [contributeGoal, contributeText, onGoalsChanged]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      const updated = await deleteSavingsGoal(deleteTarget.id);
      triggerHaptic("warning");
      setDeleteTarget(null);
      setContributeGoal(null);
      onGoalsChanged(updated);
    } catch (error) {
      // Back out of the confirm; the plan dialog underneath shows why.
      triggerHaptic("error");
      setDeleteTarget(null);
      setActionError(describeError(error, "Couldn't delete this plan."));
    }
  }, [deleteTarget, onGoalsChanged]);

  if (plans.length === 0 && !emptyText) return null;

  return (
    <>
      {plans.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        plans.map((goal) => {
          const funded =
            goal.currentAmount >= goal.targetAmount && goal.targetAmount > 0;
          const progress =
            goal.targetAmount > 0
              ? Math.min(1, goal.currentAmount / goal.targetAmount)
              : 0;
          const planRequired = goal.targetDate
            ? calcRequiredMonthly(
                goal.targetAmount,
                goal.currentAmount,
                goal.targetDate.slice(0, 7)
              )
            : null;
          return (
            <TouchableOpacity
              key={goal.id}
              style={styles.planRow}
              onPress={() => {
                setContributeText("");
                setContributeGoal(goal);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Add funds to ${goal.name}`}
            >
              <Text style={styles.planIcon}>
                {iconForPlanCategory(goal.category)}
              </Text>
              <View style={styles.planBody}>
                <Text style={styles.planName} numberOfLines={1}>
                  {goal.name}
                </Text>
                <View style={styles.planTrack}>
                  <View
                    style={[
                      styles.planFill,
                      {
                        width: `${Math.round(progress * 100)}%`,
                        backgroundColor: funded ? colors.success : colors.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.planMeta}>
                  {funded
                    ? "Funded - ready to buy 🎉"
                    : `${formatCurrency(goal.currentAmount)} of ${formatCurrency(goal.targetAmount)}${
                        planRequired && planRequired > 0
                          ? ` · ${formatCurrency(planRequired)}/mo to hit ${formatPlanMonthYear(new Date(`${goal.targetDate?.slice(0, 7)}-15`))}`
                          : ""
                      }`}
                </Text>
              </View>
              <Text style={styles.planChevron}>›</Text>
            </TouchableOpacity>
          );
        })
      )}

      {/* Contribute modal */}
      <Modal
        visible={contributeGoal !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setContributeGoal(null)}
      >
        <KeyboardAwareModalOverlay style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>
              {contributeGoal
                ? `${iconForPlanCategory(contributeGoal.category)} ${contributeGoal.name}`
                : ""}
            </Text>
            <Text style={styles.dialogMessage}>
              {contributeGoal
                ? `${formatCurrency(contributeGoal.currentAmount)} of ${formatCurrency(contributeGoal.targetAmount)} saved.`
                : ""}
            </Text>
            {actionError ? (
              <Text style={[styles.dialogMessage, { color: colors.danger }]}>
                {actionError}
              </Text>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Amount to add"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              value={contributeText}
              onChangeText={setContributeText}
              maxLength={12}
              autoFocus
            />
            <Text style={styles.inputHint}>
              Use a negative amount to correct a mistake.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setContributeGoal(null)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={handleContribute}
              >
                <Text style={[styles.dialogBtnText, { color: colors.accentButtonText }]}>
                  Add funds
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.deleteLink}
              onPress={() => {
                if (contributeGoal) setDeleteTarget(contributeGoal);
              }}
            >
              <Text style={[styles.deleteLinkText, { color: colors.danger }]}>
                Delete this plan
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareModalOverlay>
      </Modal>

      {/* Delete confirm */}
      <Modal
        visible={deleteTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Delete plan?</Text>
            <Text style={styles.dialogMessage}>
              {deleteTarget
                ? `"${deleteTarget.name}" and its ${formatCurrency(deleteTarget.currentAmount)} saved-so-far record will be removed. The money itself stays wherever you keep it.`
                : ""}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Keep it
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.danger }]}
                onPress={handleDelete}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    emptyText: {
      fontSize: scale(13),
      color: colors.textDim,
      textAlign: "center",
      paddingVertical: 8,
      lineHeight: 18,
    },
    planRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    planIcon: {
      fontSize: 22,
    },
    planBody: {
      flex: 1,
      gap: 4,
    },
    planName: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    planTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.bg,
      overflow: "hidden",
    },
    planFill: {
      height: "100%",
      borderRadius: 3,
    },
    planMeta: {
      fontSize: 12,
      color: colors.textDim,
      fontVariant: ["tabular-nums"],
    },
    planChevron: {
      fontSize: 18,
      color: colors.textMuted,
    },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: scale(15),
      color: colors.text,
    },
    inputHint: {
      fontSize: 12,
      color: colors.textDim,
    },
    dialogOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    dialogBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 20,
      gap: 10,
    },
    dialogTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    dialogMessage: {
      fontSize: 13,
      color: colors.textDim,
      textAlign: "center",
      lineHeight: 18,
    },
    dialogActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    dialogBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    dialogBtnText: {
      fontSize: 14,
      fontWeight: "700",
    },
    deleteLink: {
      alignItems: "center",
      paddingVertical: 6,
    },
    deleteLinkText: {
      fontSize: 13,
      fontWeight: "600",
    },
  });
};

export default PurchasePlanList;
