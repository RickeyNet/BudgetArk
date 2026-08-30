/**
 * Tests for the lesson-index topic filter: every Topics chip must resolve
 * to at least one lesson, filtered rows must only contain matching lessons
 * with counts computed over that subset, and filtering must never mutate
 * the canonical CHAPTERS curriculum.
 */

import { LESSON_TOPICS } from "../../types";
import { CHAPTERS } from "../lessonChapters";
import {
  getLessonsForTopic,
  getTopicChapterProgress,
} from "../lessonIndex";

describe("topic taxonomy", () => {
  it("every topic chip has at least one tagged lesson (no dead chips)", () => {
    for (const topic of LESSON_TOPICS) {
      expect(getLessonsForTopic(topic).length).toBeGreaterThan(0);
    }
  });
});

describe("getTopicChapterProgress", () => {
  it("returns only chapters with matching lessons, all tagged with the topic", () => {
    for (const topic of LESSON_TOPICS) {
      const rows = getTopicChapterProgress({}, topic);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.chapter.lessons.length).toBeGreaterThan(0);
        for (const stub of row.chapter.lessons) {
          expect(stub.topics).toContain(topic);
        }
      }
    }
  });

  it("drops chapters that have no lessons for the topic", () => {
    // "insurance" only appears in Chapter 5 today; if the curriculum grows
    // this assertion still holds: every returned chapter must have a match.
    const rows = getTopicChapterProgress({}, "insurance");
    const returnedIds = rows.map((row) => row.chapter.id);
    const expectedIds = CHAPTERS.filter((chapter) =>
      chapter.lessons.some((stub) => stub.topics.includes("insurance"))
    ).map((chapter) => chapter.id);
    expect(returnedIds).toEqual(expectedIds);
  });

  it("computes completed/total over the filtered subset only", () => {
    const debtRows = getTopicChapterProgress({}, "debt");
    const ch2 = debtRows.find((row) => row.chapter.id === "ch2");
    expect(ch2).toBeDefined();
    expect(ch2!.completed).toBe(0);
    expect(ch2!.total).toBe(ch2!.chapter.lessons.length);

    // Complete one debt-tagged Ch2 lesson and one lesson outside the filter;
    // only the in-filter completion should count.
    const debtLessonId = ch2!.chapter.lessons[0].id;
    const completed = {
      [debtLessonId]: "2026-07-20T00:00:00.000Z",
      "ch1-l1-what-is-budget": "2026-07-20T00:00:00.000Z",
    };
    const rows = getTopicChapterProgress(completed, "debt");
    const ch2After = rows.find((row) => row.chapter.id === "ch2");
    expect(ch2After!.completed).toBe(1);
    expect(ch2After!.total).toBe(ch2!.total);
  });

  it("does not mutate CHAPTERS", () => {
    const lessonCountsBefore = CHAPTERS.map(
      (chapter) => chapter.lessons.length
    );
    getTopicChapterProgress({}, "mindset");
    const lessonCountsAfter = CHAPTERS.map(
      (chapter) => chapter.lessons.length
    );
    expect(lessonCountsAfter).toEqual(lessonCountsBefore);
  });
});
