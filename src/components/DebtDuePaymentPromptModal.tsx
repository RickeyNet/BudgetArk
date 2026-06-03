import React, { useMemo } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Debt } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { getEffectivePaymentDueDay } from "../utils/debtDueCalendar";

interface DebtDuePaymentPromptModalProps {
  visible: boolean;
  debt: Debt | null;
  onLogPayment: (debtId: string, amount: number) => void;
  onDismissForMonth: (debtId: string) => void;
  onClose: () => void;
}

const DebtDuePaymentPromptModal: React.FC<DebtDuePaymentPromptModalProps> = ({
  visible,
  debt,
  onLogPayment,
  onDismissForMonth,
  onClose,
}) => {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!debt) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} />
    );
  }

  const dueDay = getEffectivePaymentDueDay(debt);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { marginBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Text style={styles.eyebrow}>MINIMUM DUE TODAY</Text>
          <Text style={styles.title}>{debt.name}</Text>
          <Text style={styles.body}>
            Did you make this month's minimum payment of{" "}
            {formatCurrency(debt.minPayment)}? (Due on day {dueDay} of each month.)
          </Text>
          <Text style={styles.hint}>
            Logging here updates your debt balance and counts toward Budget under Debt
            Payments.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => onLogPayment(debt.id, debt.minPayment)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              Yes, log {formatCurrency(debt.minPayment)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => onDismissForMonth(debt.id)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Not yet this month</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.textBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.textBtnLabel}>Remind me later</Text>
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
      borderRadius: 20,
      padding: 20,
      gap: 12,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: colors.warning,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
    },
    hint: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryBtnText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    secondaryBtnText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    textBtn: {
      alignItems: "center",
      paddingVertical: 8,
    },
    textBtnLabel: {
      color: colors.textDim,
      fontSize: 14,
      fontWeight: "600",
    },
  });

export default React.memo(DebtDuePaymentPromptModal);
