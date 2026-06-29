import React, { useEffect, useMemo } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Debt } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { triggerHaptic } from "../utils/haptics";
import ConfettiBurst from "./ConfettiBurst";

interface DebtPaymentCelebrationModalProps {
  visible: boolean;
  debt: Debt | null;
  /** Amount just logged, for the confirmation line. */
  amount: number;
  onClose: () => void;
}

/**
 * Lightweight confetti acknowledgment shown after any confirmed reminder
 * payment that did NOT clear the debt. A full payoff gets the richer
 * DebtPayoffCelebrationModal instead; this keeps the everyday "minimum paid"
 * moment celebratory without a full-screen takeover.
 */
const DebtPaymentCelebrationModal: React.FC<DebtPaymentCelebrationModalProps> = ({
  visible,
  debt,
  amount,
  onClose,
}) => {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (visible) triggerHaptic("success");
  }, [visible]);

  if (!debt) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ConfettiBurst active={visible} />
        <View style={[styles.card, { marginBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.kicker}>PAYMENT LOGGED</Text>
          <Text style={styles.title}>Nice work</Text>
          <Text style={styles.subtitle}>
            {formatCurrency(amount)} logged toward {debt.name}.
          </Text>

          <View style={[styles.balanceCard, { borderColor: colors.cardBorder }]}>
            <Text style={styles.balanceLabel}>BALANCE NOW</Text>
            <Text style={styles.balanceValue}>{formatCurrency(debt.balance)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: colors.accentButtonText }]}>
              Keep Going
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      justifyContent: "flex-end",
      paddingHorizontal: 20,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 24,
      paddingHorizontal: 24,
      paddingVertical: 28,
      alignItems: "center",
      gap: 6,
    },
    emoji: {
      fontSize: 52,
      marginBottom: 4,
    },
    kicker: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.4,
      color: colors.success,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textDim,
      textAlign: "center",
      marginBottom: 16,
    },
    balanceCard: {
      width: "100%",
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.bg,
      alignItems: "center",
      marginBottom: 20,
    },
    balanceLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginBottom: 6,
    },
    balanceValue: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    button: {
      width: "100%",
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    buttonText: {
      fontSize: 15,
      fontWeight: "800",
    },
  });

export default React.memo(DebtPaymentCelebrationModal);
