/**
 * BudgetArk - Achievement Unlock Modal
 * File: src/components/AchievementUnlockModal.tsx
 *
 * Celebrates a newly-unlocked badge with confetti, pulse, and haptic.
 * Consumers pass a queue: when the user dismisses, the next badge in the
 * queue takes the stage. When the queue is empty, the modal hides itself.
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
import Medal from "./Medal";
import ConfettiBurst from "./ConfettiBurst";
import type { AchievementDef } from "../data/achievementDefs";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { triggerHaptic } from "../utils/haptics";

interface AchievementUnlockModalProps {
  achievement: AchievementDef | null;
  remainingCount: number;
  onAdvance: () => void;
}

const tierLabel = (tier: AchievementDef["tier"]): string =>
  tier.charAt(0).toUpperCase() + tier.slice(1);

const AchievementUnlockModal: React.FC<AchievementUnlockModalProps> = ({
  achievement,
  remainingCount,
  onAdvance,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // useAnimatedValue instead of useRef(new Animated.Value()).current so no
  // ref is read during render (react-hooks/refs).
  const pulse = useAnimatedValue(0);

  const visible = achievement !== null;
  const achievementId = achievement?.id ?? null;

  useEffect(() => {
    if (!visible) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    void triggerHaptic("success");

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

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
    // Reset the pulse whenever the displayed badge changes so each unlock gets
    // its own fresh pass rather than carrying state forward.
  }, [visible, achievementId, pulse]);

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
        <ConfettiBurst active={visible} />

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
