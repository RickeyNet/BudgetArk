/**
 * BudgetArk - Debt Payoff Celebration
 * File: src/components/DebtPayoffCelebrationModal.tsx
 *
 * The "you paid it off" moment when a debt's balance reaches zero: an
 * animated congratulation card with confetti. Presented by
 * DebtDueReminderHost and the DebtTracker payment flow.
 */

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
import { useTranslation } from "react-i18next";
import { Debt } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { triggerHaptic } from "../utils/haptics";
import type { TipNudgeCopy } from "../utils/tipJarNudge";
import ConfettiBurst from "./ConfettiBurst";
import TipJarNudgeCard from "./TipJarNudgeCard";

interface DebtPayoffCelebrationModalProps {
  visible: boolean;
  debt: Debt | null;
  onClose: () => void;
  onViewHistory?: () => void;
  /**
   * The occasional Tip Jar note (utils/tipJarNudge decides which wins get
   * one). Rendered inside this screen rather than as a second Modal.
   */
  tipNudge?: TipNudgeCopy | null;
  /** Host closes this screen, then opens the Tip Jar after the dismiss settles. */
  onTipJar?: () => void;
}

const ownerKickerKey = (owner: Debt["owner"]) =>
  owner === "partner"
    ? ("debts.moments.payoff.kicker.partner" as const)
    : owner === "joint"
      ? ("debts.moments.payoff.kicker.joint" as const)
      : ("debts.moments.payoff.kicker.own" as const);

const DebtPayoffCelebrationModal: React.FC<DebtPayoffCelebrationModalProps> = ({
  visible,
  debt,
  onClose,
  onViewHistory,
  tipNudge = null,
  onTipJar,
}) => {
  const { t } = useTranslation();
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
          <Text style={styles.kicker}>{t(ownerKickerKey(debt.owner)).toUpperCase()}</Text>
          <Text style={styles.title}>{t("debts.moments.payoff.title", { name: debt.name })}</Text>
          <Text style={styles.subtitle}>
            {t("debts.moments.payoff.subtitle", { zero: formatCurrency(0) })}
          </Text>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}> 
              <Text style={styles.statLabel}>{t("debts.moments.payoff.totalCleared")}</Text>
              <Text style={styles.statValue}>{formatCurrency(debt.originalBalance)}</Text>
            </View>
            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}> 
              <Text style={styles.statLabel}>{t("debts.moments.payoff.paymentFreed")}</Text>
              <Text style={styles.statValue}>{t("debts.moments.payoff.perMonth", { amount: formatCurrency(debt.minPayment) })}</Text>
            </View>
          </View>

          <View style={[styles.noteCard, { borderColor: colors.cardBorder }]}> 
            <Text style={styles.noteTitle}>{t("debts.moments.payoff.tipTitle")}</Text>
            <Text style={styles.noteText}>
              {t("debts.moments.payoff.tipBody", { amount: formatCurrency(debt.minPayment) })}
            </Text>
          </View>

          {tipNudge && onTipJar ? (
            <TipJarNudgeCard copy={tipNudge} onTip={onTipJar} style={styles.nudge} />
          ) : null}

          <View style={styles.actions}>
            {onViewHistory ? (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
                onPress={onViewHistory}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{t("debts.moments.payoff.viewHistory")}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              onPress={onClose}
            >
              <Text style={[styles.primaryButtonText, { color: colors.accentButtonText }]}>{t("debts.moments.payoff.keepGoing")}</Text>
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
    nudge: {
      marginBottom: 22,
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
