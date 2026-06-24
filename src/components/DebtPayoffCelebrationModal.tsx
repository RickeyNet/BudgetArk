import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Debt } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { triggerHaptic } from "../utils/haptics";

interface DebtPayoffCelebrationModalProps {
  visible: boolean;
  debt: Debt | null;
  onClose: () => void;
  onViewHistory?: () => void;
}

const CONFETTI_SEEDS = [
  { left: 0.05, delay: 0, rotate: "-24deg" },
  { left: 0.13, delay: 300, rotate: "18deg" },
  { left: 0.22, delay: 1200, rotate: "-10deg" },
  { left: 0.31, delay: 700, rotate: "28deg" },
  { left: 0.4, delay: 1500, rotate: "-30deg" },
  { left: 0.5, delay: 500, rotate: "12deg" },
  { left: 0.6, delay: 1000, rotate: "-18deg" },
  { left: 0.69, delay: 200, rotate: "24deg" },
  { left: 0.78, delay: 1300, rotate: "-14deg" },
  { left: 0.87, delay: 900, rotate: "16deg" },
  { left: 0.94, delay: 1600, rotate: "-22deg" },
] as const;

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
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      progress.stopAnimation();
      pulse.stopAnimation();
      progress.setValue(0);
      pulse.setValue(0);
      return;
    }

    triggerHaptic("success");

    const confettiLoop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

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

    confettiLoop.start();
    pulseLoop.start();

    return () => {
      confettiLoop.stop();
      pulseLoop.stop();
    };
  }, [progress, pulse, visible]);

  if (!debt) return null;

  const trophyScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.screen}>
        <View pointerEvents="none" style={styles.confettiLayer}>
          {CONFETTI_SEEDS.map((seed, index) => {
            const travel = height * 0.75 + 140;
            const translateY = progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-100 - seed.delay * 0.08, travel - seed.delay * 0.03],
            });
            const opacity = progress.interpolate({
              inputRange: [0, 0.08, 0.9, 1],
              outputRange: [0, 1, 1, 0],
            });

            return (
              <Animated.View
                key={`${seed.left}-${index}`}
                style={[
                  styles.confettiPiece,
                  {
                    left: width * seed.left,
                    backgroundColor: index % 3 === 0 ? colors.accent : index % 3 === 1 ? colors.success : colors.warning,
                    opacity,
                    transform: [
                      { translateY },
                      { rotate: seed.rotate },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>

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
    confettiLayer: {
      ...StyleSheet.absoluteFill,
      overflow: "hidden",
    },
    confettiPiece: {
      position: "absolute",
      top: 0,
      width: 10,
      height: 18,
      borderRadius: 3,
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
