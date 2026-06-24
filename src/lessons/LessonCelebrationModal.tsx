/**
 * BudgetArk - Lesson Celebration Modal
 * File: src/lessons/LessonCelebrationModal.tsx
 *
 * Confetti + haptic celebration that fires when the user marks a lesson
 * complete. Modeled on DebtPayoffCelebrationModal but scaled down: this
 * fires for an in-flow milestone, not a once-per-debt life event, so the
 * copy and layout stay tighter and the "Next lesson" button keeps the
 * reader moving instead of dumping them back to the Charts tab.
 *
 * Stacks on top of LessonScreen. Two open modals work fine on iOS and
 * Android; we just dismiss in the correct order (celebration first, then
 * optionally the underlying LessonScreen via the Next handler).
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
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import type { Chapter, LessonStub } from "../types";
import { triggerHaptic } from "../utils/haptics";

interface LessonCelebrationModalProps {
  visible: boolean;
  /** Lesson the user just completed. */
  stub: LessonStub | null;
  /** Resolved chapter for that lesson, for progress copy. */
  chapter: Chapter | null;
  /** Total authored lessons across the whole curriculum. */
  totalAuthored: number;
  /** Authored lessons already complete (post-write, includes this one). */
  totalCompleted: number;
  /** Completed lessons inside the current chapter (post-write). */
  chapterCompleted: number;
  /** Total authored lessons inside the current chapter. */
  chapterTotal: number;
  /** True when this was the user's first ever completed lesson. */
  isFirstEver: boolean;
  /** True when this completion finished the chapter. */
  isChapterComplete: boolean;
  /** True when this completion finished the entire authored curriculum. */
  isCourseComplete: boolean;
  /** Stub for the next lesson, if one exists in the curriculum. */
  nextStub: LessonStub | null;
  onClose: () => void;
  /** Called when the user taps "Next lesson". Receives the next stub. */
  onNext: (stub: LessonStub) => void;
}

const CONFETTI_SEEDS = [
  { left: 0.06, delay: 0, rotate: "-22deg" },
  { left: 0.16, delay: 250, rotate: "16deg" },
  { left: 0.27, delay: 1100, rotate: "-8deg" },
  { left: 0.38, delay: 600, rotate: "26deg" },
  { left: 0.5, delay: 1400, rotate: "-28deg" },
  { left: 0.62, delay: 400, rotate: "10deg" },
  { left: 0.74, delay: 950, rotate: "-16deg" },
  { left: 0.85, delay: 200, rotate: "22deg" },
  { left: 0.94, delay: 1250, rotate: "-12deg" },
] as const;

const LessonCelebrationModal: React.FC<LessonCelebrationModalProps> = ({
  visible,
  stub,
  chapter,
  totalAuthored,
  totalCompleted,
  chapterCompleted,
  chapterTotal,
  isFirstEver,
  isChapterComplete,
  isCourseComplete,
  nextStub,
  onClose,
  onNext,
}) => {
  const { colors } = useTheme();
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
        duration: 2400,
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

  if (!stub || !chapter) return null;

  const glyphScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const kicker = isCourseComplete
    ? "CAPTAIN'S COURSE COMPLETE"
    : isChapterComplete
      ? `CHAPTER ${chapter.number} COMPLETE`
      : isFirstEver
        ? "FIRST LESSON COMPLETE"
        : "LESSON COMPLETE";

  const title = isCourseComplete
    ? "You've finished every lesson aboard."
    : isChapterComplete
      ? `${chapter.title}: chapter cleared`
      : stub.title;

  const subtitle = isCourseComplete
    ? `${totalCompleted} of ${totalAuthored} lessons read. Welcome to the wheelhouse.`
    : isChapterComplete
      ? `Ch ${chapter.number} done. ${totalCompleted} of ${totalAuthored} lessons across the course.`
      : isFirstEver
        ? "One down. The course is yours to set the pace on from here."
        : `Ch ${chapter.number} · ${chapterCompleted} of ${chapterTotal} lessons read`;

  const heroGlyph = isCourseComplete ? "🏴‍☠️" : isChapterComplete ? chapter.glyph : "✨";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <View pointerEvents="none" style={styles.confettiLayer}>
          {CONFETTI_SEEDS.map((seed, index) => {
            const travel = height * 0.7 + 120;
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
          <Animated.Text
            style={[styles.heroGlyph, { transform: [{ scale: glyphScale }] }]}
          >
            {heroGlyph}
          </Animated.Text>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Course progress mini-bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    totalAuthored > 0
                      ? `${Math.round((totalCompleted / totalAuthored) * 100)}%`
                      : "0%",
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {totalCompleted} / {totalAuthored} course lessons read
          </Text>

          <View style={styles.actions}>
            {nextStub ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => onNext(nextStub)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Next lesson</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[
                nextStub ? styles.secondaryButton : styles.primaryButton,
                nextStub ? null : { backgroundColor: colors.accent },
              ]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text
                style={
                  nextStub ? styles.secondaryButtonText : styles.primaryButtonText
                }
              >
                {nextStub ? "Done" : "Close"}
              </Text>
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
    heroGlyph: {
      fontSize: 56,
      marginBottom: 10,
    },
    kicker: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.4,
      color: colors.success,
      marginBottom: 8,
      textAlign: "center",
    },
    title: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textDim,
      textAlign: "center",
      marginBottom: 20,
    },
    progressTrack: {
      width: "100%",
      height: 6,
      backgroundColor: `${colors.accent}20`,
      borderRadius: 999,
      overflow: "hidden",
      marginBottom: 6,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.accent,
      borderRadius: 999,
      minWidth: 2,
    },
    progressLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 22,
      fontVariant: ["tabular-nums"],
    },
    actions: {
      width: "100%",
      gap: 10,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#fff",
    },
  });

export default LessonCelebrationModal;
