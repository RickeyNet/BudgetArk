import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Debt, SavingsGoal, SavingsGoalCategory } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { simulatePayoffPlan } from "../utils/calculations";
import { generateUUID } from "../utils/uuid";

type PlannerStrategy = "avalanche" | "snowball";
type SmartPlanSection = "hull" | "deck" | "supplies";
type ArkPhase = "keel" | "hull" | "deck" | "supplies" | "sail";

interface SmartPlanModalProps {
  visible: boolean;
  onClose: () => void;
  debts: Debt[];
  selectedStrategy: "custom" | "avalanche" | "snowball";
  onSelectStrategy: (strategy: PlannerStrategy) => void;
  savingsReserve: number;
  monthlyEssentialsEstimate: number;
  onUpdateMonthlyEssentialsEstimate: (value: number) => void;
  goals: SavingsGoal[];
  onAddGoal: (goal: SavingsGoal) => void;
  onUpdateGoal: (goalId: string, updates: Partial<SavingsGoal>) => void;
  onDeleteGoal: (goalId: string) => void;
  initialSection?: SmartPlanSection;
}

const QUICK_EXTRA_AMOUNTS = [50, 100, 250, 500] as const;
const QUICK_GOAL_ADD_AMOUNTS = [50, 100, 250] as const;

const formatMonths = (months: number): string => {
  if (!Number.isFinite(months)) return "Not solvable";
  if (months <= 0) return "0 months";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years <= 0) return `${remainingMonths} mo`;
  if (remainingMonths <= 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
};

const getRunwayStatus = (months: number): string => {
  if (months < 1) return "Deck at risk";
  if (months < 3) return "Building deck";
  if (months < 6) return "Solid deck";
  return "Storm-ready deck";
};

const categoryLabel = (category: SavingsGoalCategory): string => {
  if (category === "emergency_fund") return "Emergency Fund";
  if (category === "travel") return "Travel";
  if (category === "home") return "Home";
  if (category === "car") return "Car";
  if (category === "education") return "Education";
  return "Other";
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.bg },
    container: { flex: 1, paddingHorizontal: 18 },
    title: { fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: 6 },
    subtitle: { fontSize: 14, color: colors.textDim, marginBottom: 12 },
    phaseCard: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      backgroundColor: colors.card,
      padding: 10,
      marginBottom: 12,
      gap: 8,
    },
    phaseHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    phaseHeaderTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
    phaseHeaderValue: { fontSize: 12, fontWeight: "700", color: colors.textDim },
    phaseRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    phaseChip: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: colors.bg,
    },
    phaseChipDone: {
      borderColor: colors.success,
      backgroundColor: colors.successDim,
    },
    phaseChipText: { fontSize: 11, color: colors.textDim, fontWeight: "700" },
    phaseChipTextDone: { color: colors.success },
    tabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    tabBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 999,
      paddingVertical: 9,
      alignItems: "center",
      backgroundColor: colors.card,
    },
    tabBtnActive: { borderColor: colors.accent, backgroundColor: `${colors.accent}20` },
    tabText: { fontSize: 13, fontWeight: "700", color: colors.textDim },
    tabTextActive: { color: colors.accent },
    card: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      backgroundColor: colors.card,
      padding: 14,
      marginBottom: 12,
      gap: 10,
    },
    cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    cardHint: { fontSize: 13, color: colors.textDim },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: colors.textDim,
      marginBottom: 8,
    },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
    valueLarge: { fontSize: 28, fontWeight: "700", color: colors.text },
    valueLabel: { fontSize: 13, color: colors.textDim },
    statusChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: colors.bg,
    },
    statusText: { fontSize: 12, fontWeight: "700", color: colors.textDim },
    runwayTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.cardBorder,
      overflow: "hidden",
      marginTop: 4,
    },
    runwayFill: { height: "100%", borderRadius: 999, backgroundColor: colors.success },
    markerRow: { flexDirection: "row", justifyContent: "space-between" },
    markerText: { fontSize: 11, color: colors.textMuted },
    input: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      backgroundColor: colors.bg,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 10,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.bg,
    },
    chipText: { color: colors.textDim, fontWeight: "700", fontSize: 13 },
    metricRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    metricLabel: { fontSize: 12, color: colors.textDim },
    metricValue: { fontSize: 14, fontWeight: "700", color: colors.text },
    savingsRow: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    savingsText: { fontSize: 13, fontWeight: "700", color: colors.success },
    useBtn: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    useBtnActive: { borderColor: colors.accent, backgroundColor: `${colors.accent}20` },
    useBtnText: { fontSize: 13, fontWeight: "700", color: colors.textDim },
    useBtnTextActive: { color: colors.accent },
    recommendationBox: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
      gap: 4,
    },
    recommendationText: { fontSize: 12, color: colors.textDim, lineHeight: 18 },
    actionBtn: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.bg,
      marginTop: 6,
    },
    actionBtnText: { fontSize: 13, fontWeight: "700", color: colors.textDim },
    goalName: { fontSize: 16, fontWeight: "700", color: colors.text },
    goalSub: { fontSize: 12, color: colors.textDim },
    deleteText: { fontSize: 12, color: colors.danger, fontWeight: "700" },
    doneBtn: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.card,
      marginTop: 4,
    },
    doneText: { fontSize: 16, fontWeight: "700", color: colors.text },
  });

const SmartPlanModal: React.FC<SmartPlanModalProps> = ({
  visible,
  onClose,
  debts,
  selectedStrategy,
  onSelectStrategy,
  savingsReserve,
  monthlyEssentialsEstimate,
  onUpdateMonthlyEssentialsEstimate,
  goals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  initialSection = "hull",
}) => {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [section, setSection] = useState<SmartPlanSection>(initialSection);
  const [extraDraft, setExtraDraft] = useState("100");
  const [essentialsDraft, setEssentialsDraft] = useState(String(Math.round(monthlyEssentialsEstimate)));
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalCategory, setNewGoalCategory] = useState<SavingsGoalCategory>("other");

  useEffect(() => {
    if (visible) setSection(initialSection);
  }, [initialSection, visible]);

  useEffect(() => {
    setEssentialsDraft(String(Math.round(monthlyEssentialsEstimate)));
  }, [monthlyEssentialsEstimate]);

  const activeDebts = useMemo(() => debts.filter((debt) => debt.balance > 0), [debts]);
  const extraAmount = useMemo(() => {
    const parsed = parseFloat(extraDraft);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }, [extraDraft]);

  const avalancheBase = useMemo(() => simulatePayoffPlan(activeDebts, "avalanche", 0), [activeDebts]);
  const avalancheWhatIf = useMemo(
    () => simulatePayoffPlan(activeDebts, "avalanche", extraAmount),
    [activeDebts, extraAmount]
  );
  const snowballBase = useMemo(() => simulatePayoffPlan(activeDebts, "snowball", 0), [activeDebts]);
  const snowballWhatIf = useMemo(
    () => simulatePayoffPlan(activeDebts, "snowball", extraAmount),
    [activeDebts, extraAmount]
  );

  const interestRecommendation = useMemo(() => {
    if (!avalancheWhatIf.isPayoffPossible || !snowballWhatIf.isPayoffPossible) {
      return "Recommended for lowest interest: Increase minimum/extra payments until both plans are solvable.";
    }
    if (avalancheWhatIf.totalInterestPaid < snowballWhatIf.totalInterestPaid) {
      return "Recommended for lowest interest: Avalanche.";
    }
    if (snowballWhatIf.totalInterestPaid < avalancheWhatIf.totalInterestPaid) {
      return "Recommended for lowest interest: Snowball.";
    }
    return "Recommended for lowest interest: Tie (both methods cost the same interest).";
  }, [avalancheWhatIf, snowballWhatIf]);

  const runwayMonths = monthlyEssentialsEstimate > 0 ? savingsReserve / monthlyEssentialsEstimate : 0;
  const runwayProgress = Math.min(runwayMonths / 6, 1);

  const completedGoalsCount = useMemo(
    () => goals.filter((goal) => goal.currentAmount >= goal.targetAmount).length,
    [goals]
  );

  const arkPhases = useMemo(
    (): Array<{ key: ArkPhase; label: string; done: boolean }> => [
      { key: "keel", label: "Keel", done: savingsReserve >= 1000 },
      {
        key: "hull",
        label: "Hull",
        done: activeDebts.length === 0 || (selectedStrategy === "avalanche" || selectedStrategy === "snowball"),
      },
      { key: "deck", label: "Deck", done: runwayMonths >= 3 },
      { key: "supplies", label: "Supplies", done: goals.length > 0 },
      { key: "sail", label: "Sail", done: completedGoalsCount > 0 },
    ],
    [activeDebts.length, completedGoalsCount, goals.length, runwayMonths, savingsReserve, selectedStrategy]
  );

  const arkProgressPercent = Math.round(
    (arkPhases.filter((phase) => phase.done).length / arkPhases.length) * 100
  );

  const renderPayoffCard = (
    method: PlannerStrategy,
    title: string,
    hint: string,
    base: ReturnType<typeof simulatePayoffPlan>,
    withExtra: ReturnType<typeof simulatePayoffPlan>
  ) => {
    const interestSaved = Math.max(0, base.totalInterestPaid - withExtra.totalInterestPaid);
    const monthsSaved = Math.max(0, base.monthsToPayoff - withExtra.monthsToPayoff);
    const selected = selectedStrategy === method;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardHint}>{hint}</Text>
        <View style={styles.metricRow}>
          <View>
            <Text style={styles.metricLabel}>Current Plan</Text>
            <Text style={styles.metricValue}>{formatMonths(base.monthsToPayoff)}</Text>
            <Text style={styles.metricValue}>{formatCurrency(base.totalInterestPaid)} interest</Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>With +{formatCurrency(extraAmount)}/mo</Text>
            <Text style={styles.metricValue}>{formatMonths(withExtra.monthsToPayoff)}</Text>
            <Text style={styles.metricValue}>{formatCurrency(withExtra.totalInterestPaid)} interest</Text>
          </View>
        </View>
        <View style={styles.savingsRow}>
          <Text style={styles.savingsText}>Save {formatCurrency(interestSaved)} interest</Text>
          <Text style={styles.savingsText}>{monthsSaved} months faster</Text>
        </View>
        <TouchableOpacity
          style={[styles.useBtn, selected && styles.useBtnActive]}
          onPress={() => onSelectStrategy(method)}
        >
          <Text style={[styles.useBtnText, selected && styles.useBtnTextActive]}>
            {selected ? "Current Preferred Method" : `Use ${title}`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleSaveEssentials = () => {
    const parsed = parseFloat(essentialsDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onUpdateMonthlyEssentialsEstimate(parsed);
  };

  const handleCreateGoal = () => {
    const target = parseFloat(newGoalTarget);
    if (!newGoalName.trim() || !Number.isFinite(target) || target <= 0) return;
    const now = new Date().toISOString();
    onAddGoal({
      id: generateUUID(),
      name: newGoalName.trim(),
      category: newGoalCategory,
      targetAmount: target,
      currentAmount: 0,
      createdAt: now,
      updatedAt: now,
    });
    setNewGoalName("");
    setNewGoalTarget("");
    setNewGoalCategory("other");
  };

  const emergencyGoal = goals.find((goal) => goal.category === "emergency_fund");

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              paddingTop: Math.max(insets.top, 20) + 10,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <Text style={styles.title}>Build Your Ark</Text>
          <Text style={styles.subtitle}>Strengthen your plan so a financial flood does not sink your progress.</Text>

          <View style={styles.phaseCard}>
            <View style={styles.phaseHeader}>
              <Text style={styles.phaseHeaderTitle}>Ark Progress</Text>
              <Text style={styles.phaseHeaderValue}>{arkProgressPercent}% built</Text>
            </View>
            <View style={styles.phaseRow}>
              {arkPhases.map((phase) => (
                <View key={phase.key} style={[styles.phaseChip, phase.done && styles.phaseChipDone]}>
                  <Text style={[styles.phaseChipText, phase.done && styles.phaseChipTextDone]}>
                    {phase.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.tabRow}>
            {([
              ["hull", "Hull"],
              ["deck", "Deck"],
              ["supplies", "Supplies"],
            ] as const).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.tabBtn, section === key && styles.tabBtnActive]}
                onPress={() => setSection(key)}
              >
                <Text style={[styles.tabText, section === key && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {section === "hull" && (
              <>
                <View style={styles.recommendationBox}>
                  <Text style={styles.recommendationText}>{interestRecommendation.replace("Recommended", "Best hull strategy")}</Text>
                  <Text style={styles.recommendationText}>
                    Momentum bonus: Snowball can create quicker wins that keep you rowing through rough months.
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>EXTRA MONTHLY PAYMENT</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={extraDraft}
                  onChangeText={(value) => setExtraDraft(value.replace(/[^0-9.]/g, ""))}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />

                <View style={styles.chips}>
                  {QUICK_EXTRA_AMOUNTS.map((amount) => (
                    <TouchableOpacity key={amount} style={styles.chip} onPress={() => setExtraDraft(String(amount))}>
                      <Text style={styles.chipText}>+{formatCurrency(amount)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {renderPayoffCard(
                  "avalanche",
                  "Avalanche",
                  "Highest APR first. Usually lowest total interest cost.",
                  avalancheBase,
                  avalancheWhatIf
                )}
                {renderPayoffCard(
                  "snowball",
                  "Snowball",
                  "Smaller balances first for quicker visible wins.",
                  snowballBase,
                  snowballWhatIf
                )}
              </>
            )}

            {section === "deck" && (
              <>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <View>
                      <Text style={styles.valueLarge}>{runwayMonths.toFixed(1)} months</Text>
                      <Text style={styles.valueLabel}>Deck strength based on essentials estimate</Text>
                    </View>
                    <View style={styles.statusChip}>
                      <Text style={styles.statusText}>{getRunwayStatus(runwayMonths)}</Text>
                    </View>
                  </View>

                  <View style={styles.runwayTrack}>
                    <View style={[styles.runwayFill, { width: `${Math.round(runwayProgress * 100)}%` }]} />
                  </View>
                  <View style={styles.markerRow}>
                    <Text style={styles.markerText}>1 mo</Text>
                    <Text style={styles.markerText}>3 mo</Text>
                    <Text style={styles.markerText}>6 mo</Text>
                  </View>

                  <Text style={styles.metricLabel}>Current reserve: {formatCurrency(savingsReserve)}</Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>MONTHLY DECK LOAD (ESSENTIALS)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={essentialsDraft}
                    onChangeText={(value) => setEssentialsDraft(value.replace(/[^0-9.]/g, ""))}
                    placeholder="3000"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity style={styles.actionBtn} onPress={handleSaveEssentials}>
                    <Text style={styles.actionBtnText}>Save Deck Load</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>KEEL TARGET (EMERGENCY FUND)</Text>
                  <Text style={styles.goalSub}>
                    {emergencyGoal
                      ? `${formatCurrency(emergencyGoal.currentAmount)} / ${formatCurrency(emergencyGoal.targetAmount)}`
                      : "Create an Emergency Fund goal in Supplies tab to track your keel build here."}
                  </Text>
                </View>
              </>
            )}

            {section === "supplies" && (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>ADD SUPPLIES GOAL</Text>
                  <TextInput
                    style={styles.input}
                    value={newGoalName}
                    onChangeText={setNewGoalName}
                    placeholder="Goal name (e.g., Family Safety Net)"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    value={newGoalTarget}
                    onChangeText={(value) => setNewGoalTarget(value.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    placeholder="Target amount"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.chips}>
                    {([
                      "emergency_fund",
                      "travel",
                      "home",
                      "other",
                    ] as const).map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.chip,
                          newGoalCategory === category && {
                            borderColor: colors.accent,
                            backgroundColor: `${colors.accent}20`,
                          },
                        ]}
                        onPress={() => setNewGoalCategory(category)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            newGoalCategory === category && { color: colors.accent },
                          ]}
                        >
                          {categoryLabel(category)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleCreateGoal}>
                    <Text style={styles.actionBtnText}>Add Supplies Goal</Text>
                  </TouchableOpacity>
                </View>

                {goals.map((goal) => {
                  const progress = goal.targetAmount > 0 ? Math.min(goal.currentAmount / goal.targetAmount, 1) : 0;
                  return (
                    <View key={goal.id} style={styles.card}>
                      <View style={styles.row}>
                        <View>
                          <Text style={styles.goalName}>{goal.name}</Text>
                          <Text style={styles.goalSub}>{categoryLabel(goal.category)}</Text>
                        </View>
                        <TouchableOpacity onPress={() => onDeleteGoal(goal.id)}>
                          <Text style={styles.deleteText}>Delete</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.goalSub}>
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)} ({Math.round(progress * 100)}%)
                      </Text>
                      <View style={styles.runwayTrack}>
                        <View style={[styles.runwayFill, { width: `${Math.round(progress * 100)}%` }]} />
                      </View>

                      <View style={styles.chips}>
                        {QUICK_GOAL_ADD_AMOUNTS.map((amount) => (
                          <TouchableOpacity
                            key={amount}
                            style={styles.chip}
                            onPress={() => onUpdateGoal(goal.id, { currentAmount: goal.currentAmount + amount })}
                          >
                            <Text style={styles.chipText}>+{formatCurrency(amount)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneText}>Close Ark Plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(SmartPlanModal);
