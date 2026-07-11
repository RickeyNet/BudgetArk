import React, { useEffect, useMemo } from "react";
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useAnimatedValue,
} from "react-native";
import { Debt } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { triggerHaptic } from "../utils/haptics";
import ConfettiBurst from "./ConfettiBurst";

interface DebtPayoffCelebrationModalProps {
  visible: boolean;
  debt: Debt | null;
  onClose: () => void;
  onViewHistory?: () => void;
}

const getOwnerHeadline = (owner: Debt["owner"]): string => {
  if (owner === "partner") return "Partner debt cleared";
  if (owner === "joint") return "Joint debt cleared";
  return "Debt cleared";
};

const DebtPayoffCelebrationModal: React.FC<DebtPayoffCelebrationModalProps> = ({
  visible,
  debt,
  onClose,
  onViewHistory,
}) => {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // useAnimatedValue instead of useRef(new Animated.Value()).current so no
  // ref is read during render (react-hooks/refs).
  const pulse = useAnimatedValue(0);

  useEffect(() => {
    if (!visible) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    triggerHaptic("success");

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulse, visible]);

  if (!debt) return null;

  const trophyScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.screen}>
        <ConfettiBurst active={visible} />

        <View style={styles.content}>
          <Animated.Text style={[styles.emoji, { transform: [{ scale: trophyScale }] }]}>🎉</Animated.Text>
          <Text style={styles.kicker}>{getOwnerHeadline(debt.owner).toUpperCase()}</Text>
          <Text style={styles.title}>You paid off {debt.name}</Text>
          <Text style={styles.subtitle}>
            One more balance at {formatCurrency(0)}. Keep rolling freed-up cash into next target.
          </Text>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}> 
              <Text style={styles.statLabel}>TOTAL CLEARED</Text>
              <Text style={styles.statValue}>{formatCurrency(debt.originalBalance)}</Text>
            </View>
            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}> 
              <Text style={styles.statLabel}>PAYMENT FREED</Text>
              <Text style={styles.statValue}>{formatCurrency(debt.minPayment)}/mo</Text>
            </View>
          </View>

          <View style={[styles.noteCard, { borderColor: colors.cardBorder }]}> 
            <Text style={styles.noteTitle}>Momentum tip</Text>
            <Text style={styles.noteText}>
              Redirect at least {formatCurrency(debt.minPayment)} each month to next debt for snowball effect.
            </Text>
          </View>

          <View style={styles.actions}>
            {onViewHistory ? (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
                onPress={onViewHistory}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>View History</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              onPress={onClose}
            >
              <Text style={[styles.primaryButtonText, { color: colors.accentButtonText }]}>Keep Going</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    content: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 28,
      paddingHorizontal: 24,
      paddingVertical: 32,
      alignItems: "center",
    },
    emoji: {
      fontSize: 64,
      marginBottom: 12,
    },
    kicker: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.4,
      color: colors.success,
      marginBottom: 10,
      textAlign: "center",
    },
    title: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textDim,
      textAlign: "center",
      marginBottom: 24,
    },
    statsRow: {
      width: "100%",
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 16,
      backgroundColor: colors.bg,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginBottom: 8,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    noteCard: {
      width: "100%",
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.bg,
      marginBottom: 22,
    },
    noteTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.accent,
      marginBottom: 6,
    },
    noteText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textDim,
    },
    actions: {
      width: "100%",
      gap: 10,
    },
    secondaryButton: {
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: "700",
    },
    primaryButton: {
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: "800",
    },
  });

export default DebtPayoffCelebrationModal;
