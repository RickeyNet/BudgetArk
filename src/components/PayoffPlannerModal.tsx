import React, { useMemo, useState } from "react";
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
import type { Debt } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { simulatePayoffPlan } from "../utils/calculations";

type PlannerStrategy = "avalanche" | "snowball";

interface PayoffPlannerModalProps {
  visible: boolean;
  onClose: () => void;
  debts: Debt[];
  selectedStrategy: "custom" | "avalanche" | "snowball";
  onSelectStrategy: (strategy: PlannerStrategy) => void;
}

const QUICK_EXTRA_AMOUNTS = [50, 100, 250, 500] as const;

const formatMonths = (months: number): string => {
  if (!Number.isFinite(months)) return "Not solvable";
  if (months <= 0) return "0 months";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years <= 0) return `${remainingMonths} mo`;
  if (remainingMonths <= 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.bg },
    container: { flex: 1, paddingHorizontal: 18 },
    title: { fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: 6 },
    subtitle: { fontSize: 14, color: colors.textDim, marginBottom: 16 },
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
    sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: colors.textDim, marginBottom: 8 },
    inputRow: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 12 },
    extraInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      backgroundColor: colors.card,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      fontWeight: "700",
    },
    quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
    quickChip: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.card,
    },
    quickChipText: { color: colors.textDim, fontWeight: "700", fontSize: 13 },
    card: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      backgroundColor: colors.card,
      padding: 14,
      marginBottom: 12,
      gap: 10,
    },
    cardActive: { borderColor: colors.accent, backgroundColor: `${colors.accent}12` },
    cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    cardHint: { fontSize: 13, color: colors.textDim },
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
    momentumBox: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      backgroundColor: colors.bg,
      padding: 12,
      marginBottom: 16,
      gap: 6,
    },
    momentumTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
    momentumText: { fontSize: 12, lineHeight: 18, color: colors.textDim },
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

const PayoffPlannerModal: React.FC<PayoffPlannerModalProps> = ({
  visible,
  onClose,
  debts,
  selectedStrategy,
  onSelectStrategy,
}) => {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [extraDraft, setExtraDraft] = useState("100");

  const activeDebts = useMemo(() => debts.filter((debt) => debt.balance > 0), [debts]);
  const extraAmount = useMemo(() => {
    const parsed = parseFloat(extraDraft);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }, [extraDraft]);

  const avalancheBase = useMemo(
    () => simulatePayoffPlan(activeDebts, "avalanche", 0),
    [activeDebts]
  );
  const avalancheWhatIf = useMemo(
    () => simulatePayoffPlan(activeDebts, "avalanche", extraAmount),
    [activeDebts, extraAmount]
  );
  const snowballBase = useMemo(
    () => simulatePayoffPlan(activeDebts, "snowball", 0),
    [activeDebts]
  );
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

  const renderMethodCard = (
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
      <View style={[styles.card, selected && styles.cardActive]}>
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
          <Text style={styles.title}>What-if Payoff Planner</Text>
          <Text style={styles.subtitle}>
            Compare Avalanche and Snowball. See interest savings and payoff speed with extra payments.
          </Text>
          {activeDebts.length > 0 && (
            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationText}>{interestRecommendation}</Text>
              <Text style={styles.recommendationText}>
                Recommended for motivation momentum: Snowball (quicker early wins can improve consistency).
              </Text>
            </View>
          )}

          {activeDebts.length === 0 ? (
            <View style={styles.momentumBox}>
              <Text style={styles.momentumTitle}>No active debts</Text>
              <Text style={styles.momentumText}>Add debts with remaining balances to run payoff comparisons.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>EXTRA MONTHLY PAYMENT</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.extraInput}
                  keyboardType="decimal-pad"
                  value={extraDraft}
                  onChangeText={(value) => setExtraDraft(value.replace(/[^0-9.]/g, ""))}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.quickRow}>
                {QUICK_EXTRA_AMOUNTS.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickChip}
                    onPress={() => setExtraDraft(String(amount))}
                  >
                    <Text style={styles.quickChipText}>+{formatCurrency(amount)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {renderMethodCard(
                "avalanche",
                "Avalanche",
                "Highest APR first. Usually lowest total interest cost.",
                avalancheBase,
                avalancheWhatIf
              )}

              {renderMethodCard(
                "snowball",
                "Snowball",
                "Smallest balances first inside each debt class.",
                snowballBase,
                snowballWhatIf
              )}

              <View style={styles.momentumBox}>
                <Text style={styles.momentumTitle}>Why Snowball can help motivation</Text>
                <Text style={styles.momentumText}>
                  Snowball often produces earlier small wins. Closing accounts sooner can build confidence,
                  reduce stress, and make it easier to stay consistent month after month.
                </Text>
                <Text style={styles.momentumText}>
                  Debts cleared in first year: Snowball {snowballWhatIf.debtsClearedInFirstYear} vs Avalanche {avalancheWhatIf.debtsClearedInFirstYear}.
                </Text>
              </View>
            </ScrollView>
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(PayoffPlannerModal);
