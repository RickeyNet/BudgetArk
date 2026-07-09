/**
 * BudgetArk - Lesson Screen
 * File: src/lessons/LessonScreen.tsx
 *
 * Full-screen Modal that renders a single lesson. Handles its own progress
 * persistence (markLessonComplete + setCurrentLesson on open). When the
 * lesson's stub exists but no body is registered yet, renders a "Coming
 * soon" placeholder rather than failing.
 *
 * Navigation between lessons is intra-modal: prev/next swap the lesson
 * inside the same Modal without unmounting it. The parent ChartsScreen
 * only sees the open/close transitions.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type {
  Chapter,
  LearningProgress,
  Lesson,
  LessonStub,
  LessonTopic,
} from "../types";
import { CHAPTERS } from "../data/lessonChapters";
import { LEARNING_DISCLAIMER } from "../data/learningDisclaimer";
import {
  getLessonById,
  getNextLessonStub,
  getOverallProgress,
  getPrevLessonStub,
  hasLessonBody,
} from "../data/lessonIndex";
import {
  getLearningProgress,
  markLessonComplete,
  setCurrentLesson,
} from "../storage/learningProgressStorage";
import LessonRenderer from "./LessonRenderer";
import ResourceCard from "./ResourceCard";
import LessonCelebrationModal from "./LessonCelebrationModal";
import { useAchievements } from "../achievements/AchievementsProvider";

interface LessonScreenProps {
  visible: boolean;
  /** Stub to open. When null the modal renders nothing (controlled close). */
  stub: LessonStub | null;
  onClose: () => void;
  /** Caller is told which lesson id should be opened next (prev/next nav). */
  onNavigateTo: (stub: LessonStub) => void;
  /**
   * Lesson action CTA invocation. Parent owns route resolution since
   * routes often map to other tabs.
   */
  onOpenAction?: (route: string) => void;
  /** Tool resource tapped. Parent routes to the matching calculator. */
  onOpenTool?: (route: string) => void;
}

interface CelebrationSnapshot {
  stub: LessonStub;
  chapter: Chapter;
  totalAuthored: number;
  totalCompleted: number;
  chapterCompleted: number;
  chapterTotal: number;
  isFirstEver: boolean;
  isChapterComplete: boolean;
  isCourseComplete: boolean;
  nextStub: LessonStub | null;
}

const TOPIC_PILL_LABELS: Record<LessonTopic, string> = {
  budgeting: "Budgeting",
  debt: "Debt",
  saving: "Saving",
  investing: "Investing",
  taxes: "Taxes",
  insurance: "Insurance",
  real_estate: "Real Estate",
  retirement: "Retirement",
  mindset: "Mindset",
};

const LessonScreen: React.FC<LessonScreenProps> = ({
  visible,
  stub,
  onClose,
  onNavigateTo,
  onOpenAction,
  onOpenTool,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const scrollRef = useRef<ScrollView>(null);
  const { runCheck: runAchievementsCheck } = useAchievements();
  const [progress, setProgress] = useState<LearningProgress | null>(null);

  /* Celebration state. Captured at completion time so the celebration UI
   * reflects the milestone the user just crossed (chapter completed, course
   * completed, first-ever lesson) even if `progress` changes underneath. */
  const [celebration, setCelebration] = useState<CelebrationSnapshot | null>(
    null
  );

  /* On open, record the lesson as the user's resume target. Re-read
   * progress so the "Mark complete" button reflects the latest state when
   * the modal reopens for a previously-completed lesson. Depends on the
   * lesson id, not the stub object, so a re-created stub with the same id
   * doesn't re-run the effect (which would also reset the scroll). */
  const stubId = stub?.id;
  useEffect(() => {
    if (!visible || !stubId) return;
    let cancelled = false;
    (async () => {
      try {
        await setCurrentLesson(stubId);
        const fresh = await getLearningProgress();
        if (!cancelled) setProgress(fresh);
      } catch (err) {
        if (__DEV__) console.warn("[LessonScreen] load progress", err);
      }
    })();
    /* Scroll the body back to top whenever the visible lesson changes so
     * prev/next never strands the reader mid-scroll on the new content. */
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    return () => {
      cancelled = true;
    };
  }, [visible, stubId]);

  const lesson: Lesson | undefined = stub ? getLessonById(stub.id) : undefined;
  const stubHasBody = !!stub && hasLessonBody(stub.id);
  const chapter = stub
    ? CHAPTERS.find((c) => c.id === stub.chapterId)
    : undefined;
  const isCompleted = !!(stub && progress?.completedLessons[stub.id]);

  const prevStub = stub ? getPrevLessonStub(stub.id) : undefined;
  const nextStub = stub ? getNextLessonStub(stub.id) : undefined;

  const handleMarkComplete = useCallback(async () => {
    if (!stub || !chapter) return;
    try {
      /* Snapshot pre-write state so we can detect the "first lesson ever"
       * case (couldn't compute this from `fresh` alone after the write). */
      const wasEmpty = Object.keys(progress?.completedLessons ?? {}).length === 0;

      await markLessonComplete(stub.id);
      const fresh = await getLearningProgress();
      setProgress(fresh);

      const completedMap = fresh.completedLessons;
      const overall = getOverallProgress(completedMap);
      /* Chapter completion counts authored lessons only - "coming soon"
       * stubs don't have bodies and can't be completed, so they shouldn't
       * inflate the chapter denominator. */
      const authoredChapterStubs = chapter.lessons.filter((s) =>
        hasLessonBody(s.id)
      );
      const chapterCompleted = authoredChapterStubs.filter(
        (s) => completedMap[s.id]
      ).length;
      const chapterTotal = authoredChapterStubs.length;
      const nextAuthoredStub = (() => {
        let cursor = getNextLessonStub(stub.id);
        while (cursor && !hasLessonBody(cursor.id)) {
          cursor = getNextLessonStub(cursor.id);
        }
        return cursor ?? null;
      })();

      setCelebration({
        stub,
        chapter,
        totalAuthored: overall.total,
        totalCompleted: overall.completed,
        chapterCompleted,
        chapterTotal,
        isFirstEver: wasEmpty,
        isChapterComplete:
          chapterTotal > 0 && chapterCompleted === chapterTotal,
        isCourseComplete:
          overall.total > 0 && overall.completed === overall.total,
        nextStub: nextAuthoredStub,
      });
    } catch (err) {
      if (__DEV__) console.warn("[LessonScreen] mark complete", err);
    }
  }, [stub, chapter, progress?.completedLessons]);

  const handleCelebrationClose = useCallback(() => {
    setCelebration(null);
    /* Evaluate badges AFTER the lesson celebration closes so the Ship's Log
     * unlock modal doesn't fight with the confetti card for the same screen
     * space. The AchievementsProvider queues unlocks and pops them next. */
    void runAchievementsCheck();
  }, [runAchievementsCheck]);

  const handleCelebrationNext = useCallback(
    (nextStub: LessonStub) => {
      setCelebration(null);
      void runAchievementsCheck();
      onNavigateTo(nextStub);
    },
    [onNavigateTo, runAchievementsCheck]
  );

  const handleAction = useCallback(() => {
    if (!lesson?.action || !onOpenAction) return;
    onOpenAction(lesson.action.route);
  }, [lesson?.action, onOpenAction]);

  if (!stub || !chapter) {
    return (
      <Modal
        visible={visible}
        onRequestClose={onClose}
        transparent={false}
        animationType="slide"
      />
    );
  }

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      transparent={false}
      animationType="slide"
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top },
        ]}
      >
        {/* Header bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.headerBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerCrumb}>
              Ch {chapter.number} · Lesson {stub.number}
            </Text>
          </View>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + tokens.padLg + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroGlyph}>
              {lesson?.glyph ?? chapter.glyph}
            </Text>
            <Text style={styles.heroTitle}>{stub.title}</Text>
            <Text style={styles.heroMeta}>
              {stub.readMin ? `${stub.readMin} min read` : "Coming soon"}
              {stub.topics.length > 0 ? " · " : ""}
              {stub.topics.map((t) => TOPIC_PILL_LABELS[t]).join(", ")}
            </Text>
          </View>

          {stubHasBody && lesson ? (
            <>
              <Text style={styles.disclaimer}>{LEARNING_DISCLAIMER}</Text>

              {lesson.summary ? (
                <Text style={styles.summary}>{lesson.summary}</Text>
              ) : null}

              {lesson.whyItMatters ? (
                <View style={styles.whyCard}>
                  <Text style={styles.whyEyebrow}>WHY THIS MATTERS</Text>
                  <Text style={styles.whyText}>{lesson.whyItMatters}</Text>
                </View>
              ) : null}

              <LessonRenderer sections={lesson.body} />

              {lesson.keyTakeaway ? (
                <View style={styles.takeawayCard}>
                  <Text style={styles.takeawayEyebrow}>KEY TAKEAWAY</Text>
                  <Text style={styles.takeawayText}>{lesson.keyTakeaway}</Text>
                </View>
              ) : null}

              {/* Mark complete */}
              <TouchableOpacity
                style={[
                  styles.completeBtn,
                  isCompleted && styles.completeBtnDone,
                ]}
                onPress={isCompleted ? undefined : handleMarkComplete}
                activeOpacity={isCompleted ? 1 : 0.8}
              >
                <Text
                  style={[
                    styles.completeBtnText,
                    isCompleted && styles.completeBtnTextDone,
                  ]}
                >
                  {isCompleted ? "✓ Completed" : "Mark complete"}
                </Text>
              </TouchableOpacity>

              {lesson.action ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleAction}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnEyebrow}>TRY IT</Text>
                  <Text style={styles.actionBtnLabel}>
                    {lesson.action.label}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {lesson.resources && lesson.resources.length > 0 ? (
                <View style={styles.resourcesSection}>
                  <Text style={styles.resourcesHeader}>GO DEEPER</Text>
                  <View style={styles.resourcesList}>
                    {lesson.resources.map((res, idx) => (
                      <ResourceCard
                        key={idx}
                        resource={res}
                        showAffiliateLinks={
                          progress?.showAffiliateLinks ?? false
                        }
                        onOpenTool={onOpenTool}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            /* "Coming soon" placeholder for stubs without a body. */
            <View style={styles.comingSoonCard}>
              <Text style={styles.comingSoonGlyph}>🚧</Text>
              <Text style={styles.comingSoonTitle}>Lesson in progress</Text>
              <Text style={styles.comingSoonBody}>
                {chapter.title} ships in a future update. The chapter outline
                is here so you can see the full course path. Check back soon.
              </Text>
            </View>
          )}

          {/* Prev / Next */}
          <View style={styles.navStrip}>
            <TouchableOpacity
              style={[styles.navBtn, !prevStub && styles.navBtnDisabled]}
              onPress={prevStub ? () => onNavigateTo(prevStub) : undefined}
              disabled={!prevStub}
              activeOpacity={prevStub ? 0.7 : 1}
            >
              <Text
                style={[
                  styles.navBtnArrow,
                  !prevStub && styles.navBtnTextDisabled,
                ]}
              >
                ‹
              </Text>
              <View style={styles.navBtnLabels}>
                <Text
                  style={[
                    styles.navBtnEyebrow,
                    !prevStub && styles.navBtnTextDisabled,
                  ]}
                >
                  Previous
                </Text>
                <Text
                  style={[
                    styles.navBtnTitle,
                    !prevStub && styles.navBtnTextDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {prevStub ? prevStub.title : "-"}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, !nextStub && styles.navBtnDisabled]}
              onPress={nextStub ? () => onNavigateTo(nextStub) : undefined}
              disabled={!nextStub}
              activeOpacity={nextStub ? 0.7 : 1}
            >
              <View style={[styles.navBtnLabels, styles.navBtnLabelsRight]}>
                <Text
                  style={[
                    styles.navBtnEyebrow,
                    !nextStub && styles.navBtnTextDisabled,
                  ]}
                >
                  Next
                </Text>
                <Text
                  style={[
                    styles.navBtnTitle,
                    !nextStub && styles.navBtnTextDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {nextStub ? nextStub.title : "-"}
                </Text>
              </View>
              <Text
                style={[
                  styles.navBtnArrow,
                  !nextStub && styles.navBtnTextDisabled,
                ]}
              >
                ›
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      <LessonCelebrationModal
        visible={celebration !== null}
        stub={celebration?.stub ?? null}
        chapter={celebration?.chapter ?? null}
        totalAuthored={celebration?.totalAuthored ?? 0}
        totalCompleted={celebration?.totalCompleted ?? 0}
        chapterCompleted={celebration?.chapterCompleted ?? 0}
        chapterTotal={celebration?.chapterTotal ?? 0}
        isFirstEver={celebration?.isFirstEver ?? false}
        isChapterComplete={celebration?.isChapterComplete ?? false}
        isCourseComplete={celebration?.isCourseComplete ?? false}
        nextStub={celebration?.nextStub ?? null}
        onClose={handleCelebrationClose}
        onNext={handleCelebrationNext}
      />
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: tokens.pad,
      gap: tokens.gap,
    },
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      paddingHorizontal: tokens.pad,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    headerBtn: {
      minWidth: 40,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerBtnText: {
      fontSize: scale(24),
      color: colors.text,
      fontWeight: "600",
    },
    headerCenter: {
      flex: 1,
      alignItems: "center",
    },
    headerCrumb: {
      fontSize: scale(12),
      color: colors.textMuted,
      letterSpacing: 1.2,
      fontWeight: "600",
    },
    hero: {
      alignItems: "center",
      paddingTop: tokens.padLg,
      paddingBottom: tokens.padSm,
    },
    heroGlyph: {
      fontSize: scale(48),
      marginBottom: 8,
    },
    heroTitle: {
      fontSize: scale(24),
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: 6,
    },
    heroMeta: {
      fontSize: scale(12),
      color: colors.textMuted,
      textAlign: "center",
    },
    disclaimer: {
      fontSize: scale(11),
      lineHeight: scale(16),
      color: colors.textMuted,
      textAlign: "center",
    },
    summary: {
      fontSize: scale(15),
      lineHeight: scale(22),
      color: colors.textDim,
      fontStyle: "italic",
      textAlign: "center",
    },
    whyCard: {
      backgroundColor: `${colors.accent}14`,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      borderRadius: tokens.radius,
      paddingVertical: tokens.padSm,
      paddingHorizontal: tokens.pad,
      gap: 4,
    },
    whyEyebrow: {
      fontSize: scale(11),
      color: colors.accent,
      letterSpacing: 1.5,
      fontWeight: "700",
    },
    whyText: {
      fontSize: scale(14),
      lineHeight: scale(20),
      color: colors.text,
    },
    takeawayCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}40`,
      borderRadius: tokens.radius + 4,
      padding: tokens.pad,
      gap: 6,
    },
    takeawayEyebrow: {
      fontSize: scale(11),
      color: colors.accent,
      letterSpacing: 1.5,
      fontWeight: "700",
    },
    takeawayText: {
      fontSize: scale(15),
      lineHeight: scale(22),
      color: colors.text,
      fontWeight: "600",
    },
    completeBtn: {
      backgroundColor: colors.accent,
      borderRadius: tokens.radius,
      paddingVertical: 14,
      alignItems: "center",
    },
    completeBtnDone: {
      backgroundColor: `${colors.success}26`,
      borderWidth: 1,
      borderColor: colors.success,
    },
    completeBtnText: {
      fontSize: scale(15),
      color: "#fff",
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    completeBtnTextDone: {
      color: colors.success,
    },
    actionBtn: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      paddingVertical: tokens.pad,
      paddingHorizontal: tokens.pad,
      alignItems: "center",
      gap: 4,
    },
    actionBtnEyebrow: {
      fontSize: scale(11),
      color: colors.accent,
      letterSpacing: 1.5,
      fontWeight: "700",
    },
    actionBtnLabel: {
      fontSize: scale(15),
      color: colors.text,
      fontWeight: "600",
    },
    resourcesSection: {
      gap: tokens.gapSm,
    },
    resourcesHeader: {
      fontSize: scale(12),
      color: colors.accent,
      letterSpacing: 2,
      fontWeight: "700",
    },
    resourcesList: {
      gap: 8,
    },
    comingSoonCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius + 4,
      padding: tokens.padLg,
      alignItems: "center",
      gap: 8,
    },
    comingSoonGlyph: {
      fontSize: scale(40),
    },
    comingSoonTitle: {
      fontSize: scale(18),
      fontWeight: "700",
      color: colors.text,
    },
    comingSoonBody: {
      fontSize: scale(14),
      lineHeight: scale(20),
      color: colors.textMuted,
      textAlign: "center",
    },
    navStrip: {
      flexDirection: "row",
      gap: 8,
      marginTop: tokens.gap,
    },
    navBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      paddingVertical: tokens.padSm,
      paddingHorizontal: tokens.padSm,
    },
    navBtnDisabled: {
      opacity: 0.4,
    },
    navBtnArrow: {
      fontSize: scale(22),
      color: colors.accent,
      fontWeight: "600",
    },
    navBtnLabels: {
      flex: 1,
    },
    navBtnLabelsRight: {
      alignItems: "flex-end",
    },
    navBtnEyebrow: {
      fontSize: scale(10),
      color: colors.textMuted,
      letterSpacing: 1.2,
      fontWeight: "700",
    },
    navBtnTitle: {
      fontSize: scale(13),
      color: colors.text,
      fontWeight: "600",
    },
    navBtnTextDisabled: {
      color: colors.textMuted,
    },
  });
};

export default LessonScreen;
