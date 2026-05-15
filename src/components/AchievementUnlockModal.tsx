/**
 * BudgetArk - Achievement Unlock Modal
 * File: src/components/AchievementUnlockModal.tsx
 *
 * Celebrates a newly-unlocked badge with confetti, pulse, and haptic.
 * Consumers pass a queue: when the user dismisses, the next badge in the
 * queue takes the stage. When the queue is empty, the modal hides itself.
 */

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
import Medal from "./Medal";
import type { AchievementDef } from "../data/achievementDefs";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { triggerHaptic } from "../utils/haptics";

interface AchievementUnlockModalProps {
  achievement: AchievementDef | null;
  remainingCount: number;
  onAdvance: () => void;
}

const CONFETTI_SEEDS = [
  { left: 0.06, delay: 0, rotate: "-22deg" },
  { left: 0.16, delay: 320, rotate: "16deg" },
  { left: 0.27, delay: 1100, rotate: "-8deg" },
  { left: 0.36, delay: 680, rotate: "26deg" },
  { left: 0.46, delay: 1450, rotate: "-30deg" },
  { left: 0.55, delay: 480, rotate: "10deg" },
  { left: 0.64, delay: 980, rotate: "-18deg" },
  { left: 0.74, delay: 210, rotate: "22deg" },
  { left: 0.83, delay: 1250, rotate: "-12deg" },
  { left: 0.92, delay: 880, rotate: "16deg" },
] as const;

const tierLabel = (tier: AchievementDef["tier"]): string =>
  tier.charAt(0).toUpperCase() + tier.slice(1);

const AchievementUnlockModal: React.FC<AchievementUnlockModalProps> = ({
  achievement,
  remainingCount,
  onAdvance,
}) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const visible = achievement !== null;
  const achievementId = achievement?.id ?? null;

  useEffect(() => {
    if (!visible) {
      progress.stopAnimation();
      pulse.stopAnimation();
      progress.setValue(0);
      pulse.setValue(0);
      return;
    }

    void triggerHaptic("success");

    const confettiLoop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 880,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 880,
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
    // Reset animations whenever the displayed badge changes so each unlock
    // gets its own fresh confetti pass rather than carrying state forward.
  }, [visible, achievementId, progress, pulse]);

  if (!achievement) return null;

  const medalScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const primaryLabel = remainingCount > 1 ? "Next badge" : "Keep Going";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onAdvance}
    >
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
                    backgroundColor:
                      index % 3 === 0
                        ? colors.accent
                        : index % 3 === 1
                          ? colors.success
                          : colors.warning,
                    opacity,
                    transform: [{ translateY }, { rotate: seed.rotate }],
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.content}>
          <Text style={styles.kicker}>BADGE UNLOCKED</Text>
          <Animated.View style={{ transform: [{ scale: medalScale }] }}>
            <Medal
              tier={achievement.tier}
              glyph={achievement.glyph}
              size={140}
            />
          </Animated.View>
          <Text style={styles.tier}>{tierLabel(achievement.tier)}</Text>
          <Text style={styles.title}>{achievement.title}</Text>
          <Text style={styles.subtitle}>{achievement.description}</Text>

          {remainingCount > 1 && (
            <Text style={styles.queueHint}>
              +{remainingCount - 1} more to celebrate
            </Text>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            onPress={onAdvance}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.accentButtonText ?? colors.white },
              ]}
            >
              {primaryLabel}
            </Text>
          </TouchableOpacity>
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
      ...StyleSheet.absoluteFillObject,
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
    kicker: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.6,
      color: colors.success,
      marginBottom: 16,
    },
    tier: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.4,
      color: colors.accent,
      marginTop: 16,
      textTransform: "uppercase",
    },
    title: {
      fontSize: 26,
      lineHeight: 32,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginTop: 8,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textDim,
      textAlign: "center",
      marginTop: 10,
      marginBottom: 22,
    },
    queueHint: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 16,
    },
    primaryButton: {
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 40,
      alignItems: "center",
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: "800",
    },
  });

export default AchievementUnlockModal;
