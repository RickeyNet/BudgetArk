/**
 * BudgetArk - Lesson Index
 * File: src/data/lessonIndex.ts
 *
 * Registry of full lesson bodies. Only "available" chapters have entries
 * here; "coming soon" lessons resolve to their stub (no body) and the
 * Lesson screen renders a "coming soon" placeholder for those.
 *
 * Authoring a new lesson:
 *   1. Drop a file in src/data/lessons/ exporting a `Lesson` default.
 *   2. Import it here and add it to LESSONS_BY_ID.
 *   3. Make sure the lesson id matches the stub in lessonChapters.ts.
 *
 * Kept as a single flat map (rather than per-chapter modules) so future
 * lookups stay O(1) and chapter reorganization doesn't ripple through
 * imports.
 */

import type {
  Chapter,
  ChapterId,
  Lesson,
  LessonStub,
  LessonTopic,
} from "../types";
import {
  ALL_LESSON_STUBS,
  CHAPTERS,
  getChapter,
  getLessonStub,
} from "./lessonChapters";

/* Authored lesson bodies. Register every new lesson here so the screen can
 * find it; the chapter stubs in lessonChapters.ts handle metadata + course
 * order. Lesson ids must match the stub ids exactly. */
import ch1l1 from "./lessons/ch1-l1-what-is-budget";
import ch1l2 from "./lessons/ch1-l2-needs-wants-savings";
import ch1l3 from "./lessons/ch1-l3-tracking-vs-budgeting";
import ch1l4 from "./lessons/ch1-l4-zero-based";
import ch1l5 from "./lessons/ch1-l5-monthly-review";
import ch2l1 from "./lessons/ch2-l1-good-vs-bad-debt";
import ch2l2 from "./lessons/ch2-l2-how-interest-works";
import ch2l3 from "./lessons/ch2-l3-starter-emergency-fund";
import ch2l4 from "./lessons/ch2-l4-snowball-vs-avalanche";
import ch2l5 from "./lessons/ch2-l5-refinancing";
import ch2l6 from "./lessons/ch2-l6-debt-snowflake";
import ch3l1 from "./lessons/ch3-l1-emergency-fund-full";
import ch3l2 from "./lessons/ch3-l2-hysa-basics";
import ch3l3 from "./lessons/ch3-l3-sinking-funds";
import ch3l4 from "./lessons/ch3-l4-short-term-cash";
import ch4l1 from "./lessons/ch4-l1-compounding";
import ch4l2 from "./lessons/ch4-l2-index-funds";
import ch4l3 from "./lessons/ch4-l3-401k-ira-roth";
import ch4l4 from "./lessons/ch4-l4-asset-allocation";
import ch4l5 from "./lessons/ch4-l5-big-mistakes";
import ch5l1 from "./lessons/ch5-l1-net-worth";
import ch5l2 from "./lessons/ch5-l2-buy-vs-rent";
import ch5l3 from "./lessons/ch5-l3-insurance";
import ch5l4 from "./lessons/ch5-l4-estate-basics";

const LESSONS_BY_ID: Record<string, Lesson> = {
  [ch1l1.id]: ch1l1,
  [ch1l2.id]: ch1l2,
  [ch1l3.id]: ch1l3,
  [ch1l4.id]: ch1l4,
  [ch1l5.id]: ch1l5,
  [ch2l1.id]: ch2l1,
  [ch2l2.id]: ch2l2,
  [ch2l3.id]: ch2l3,
  [ch2l4.id]: ch2l4,
  [ch2l5.id]: ch2l5,
  [ch2l6.id]: ch2l6,
  [ch3l1.id]: ch3l1,
  [ch3l2.id]: ch3l2,
  [ch3l3.id]: ch3l3,
  [ch3l4.id]: ch3l4,
  [ch4l1.id]: ch4l1,
  [ch4l2.id]: ch4l2,
  [ch4l3.id]: ch4l3,
  [ch4l4.id]: ch4l4,
  [ch4l5.id]: ch4l5,
  [ch5l1.id]: ch5l1,
  [ch5l2.id]: ch5l2,
  [ch5l3.id]: ch5l3,
  [ch5l4.id]: ch5l4,
};

export const getLessonById = (lessonId: string): Lesson | undefined =>
  LESSONS_BY_ID[lessonId];

/** True when the lesson has a registered body (i.e. is not "coming soon"). */
export const hasLessonBody = (lessonId: string): boolean =>
  lessonId in LESSONS_BY_ID;

/** Stubs for a chapter, in display order. Empty array for unknown ids. */
export const getLessonsForChapter = (
  chapterId: ChapterId
): readonly LessonStub[] => getChapter(chapterId)?.lessons ?? [];

/**
 * Resolves the next stub in the curriculum after `lessonId` (chapter
 * boundary crossing supported). Returns undefined past the last lesson.
 */
export const getNextLessonStub = (
  lessonId: string
): LessonStub | undefined => {
  const idx = ALL_LESSON_STUBS.findIndex((stub) => stub.id === lessonId);
  if (idx < 0 || idx >= ALL_LESSON_STUBS.length - 1) return undefined;
  return ALL_LESSON_STUBS[idx + 1];
};

/** Mirror of getNextLessonStub for back-navigation. */
export const getPrevLessonStub = (
  lessonId: string
): LessonStub | undefined => {
  const idx = ALL_LESSON_STUBS.findIndex((stub) => stub.id === lessonId);
  if (idx <= 0) return undefined;
  return ALL_LESSON_STUBS[idx - 1];
};

/** All stubs whose `topics` array contains the given topic. */
export const getLessonsForTopic = (
  topic: LessonTopic
): readonly LessonStub[] =>
  ALL_LESSON_STUBS.filter((stub) => stub.topics.includes(topic));

/**
 * Picks the lesson the Resume CTA should jump to. Strategy:
 *   1. If the user has no completed lessons yet, force the first lesson with
 *      a body so "Start here" always begins at Chapter 1.
 *   2. Otherwise, use the stored `currentLessonId` when it still exists in
 *      the curriculum and isn't already completed.
 *   3. The first stub (in course order) that has a body AND isn't completed.
 *   4. The first lesson with a body (course fully complete).
 *   5. The very first stub in the curriculum (no available chapters at all -
 *      unreachable today since Ch 1 ships with content).
 */
export const pickResumeLesson = (
  completedLessons: Record<string, string>,
  currentLessonId: string | undefined
): LessonStub | undefined => {
  const hasCompletedLessons = Object.keys(completedLessons).length > 0;
  if (!hasCompletedLessons) {
    const firstWithBody = ALL_LESSON_STUBS.find((stub) => hasLessonBody(stub.id));
    return firstWithBody ?? ALL_LESSON_STUBS[0];
  }

  if (currentLessonId) {
    const current = getLessonStub(currentLessonId);
    if (current && !completedLessons[current.id]) return current;
  }
  const firstIncompleteWithBody = ALL_LESSON_STUBS.find(
    (stub) => hasLessonBody(stub.id) && !completedLessons[stub.id]
  );
  if (firstIncompleteWithBody) return firstIncompleteWithBody;

  const firstWithBody = ALL_LESSON_STUBS.find((stub) =>
    hasLessonBody(stub.id)
  );
  return firstWithBody ?? ALL_LESSON_STUBS[0];
};

/**
 * Chapter-level progress summary used by the chapter list rows.
 * "Coming soon" chapters return zero completion regardless of state.
 */
export interface ChapterProgress {
  chapter: Chapter;
  completed: number;
  total: number;
}

export const getChapterProgress = (
  completedLessons: Record<string, string>
): readonly ChapterProgress[] =>
  CHAPTERS.map((chapter) => {
    const total = chapter.lessons.length;
    const completed =
      chapter.status === "coming-soon"
        ? 0
        : chapter.lessons.filter(
            (stub) => completedLessons[stub.id]
          ).length;
    return { chapter, completed, total };
  });

/**
 * Overall Captain's Course progress fraction (across every authored lesson).
 * "Coming soon" lessons are excluded from the denominator so the bar reflects
 * what the user can actually finish today.
 */
export const getOverallProgress = (
  completedLessons: Record<string, string>
): { completed: number; total: number } => {
  const authored = ALL_LESSON_STUBS.filter((stub) => hasLessonBody(stub.id));
  const completed = authored.filter(
    (stub) => completedLessons[stub.id]
  ).length;
  return { completed, total: authored.length };
};
