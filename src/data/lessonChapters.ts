/**
 * BudgetArk - Learning Curriculum Chapters
 * File: src/data/lessonChapters.ts
 *
 * The Captain's Course outline: 5 chapters, 24 lessons. Ch 1 and Ch 2 are
 * the v1 shipping content (full lesson bodies live in src/data/lessons/);
 * Ch 3-5 are "coming soon" - their stubs are listed so the IA is real and
 * users see the full path on day one. Soft gating: every chapter is
 * tappable; "coming soon" chapters render lesson titles without bodies.
 *
 * Adding a lesson body later is a content-only change - drop a file into
 * src/data/lessons/, register it in lessonIndex.ts, and flip the chapter
 * status to "available" once all its lessons are authored.
 */

import type { Chapter, ChapterId, LessonStub, LessonTopic } from "../types";

/**
 * Internal helper: lesson-stub factory that wires up `chapterId` + `number`
 * from the array index so the curriculum block stays readable.
 */
const stubsFor = (
  chapterId: ChapterId,
  lessons: ReadonlyArray<{
    id: string;
    title: string;
    readMin: number | null;
    topics: readonly LessonTopic[];
  }>
): readonly LessonStub[] =>
  lessons.map((lesson, idx) => ({
    id: lesson.id,
    chapterId,
    number: idx + 1,
    title: lesson.title,
    readMin: lesson.readMin,
    topics: lesson.topics,
  }));

export const CHAPTERS: readonly Chapter[] = [
  {
    id: "ch1",
    number: 1,
    title: "Setting Sail",
    subtitle: "Budgeting Basics",
    glyph: "⛵",
    status: "available",
    lessons: stubsFor("ch1", [
      {
        id: "ch1-l1-what-is-budget",
        title: "What a budget really is",
        readMin: 3,
        topics: ["budgeting", "mindset"],
      },
      {
        id: "ch1-l2-needs-wants-savings",
        title: "Needs, Wants, Savings (50/30/20)",
        readMin: 4,
        topics: ["budgeting"],
      },
      {
        id: "ch1-l3-tracking-vs-budgeting",
        title: "Tracking vs. budgeting",
        readMin: 5,
        topics: ["budgeting"],
      },
      {
        id: "ch1-l4-zero-based",
        title: "Zero-based budgeting",
        readMin: 6,
        topics: ["budgeting"],
      },
      {
        id: "ch1-l5-monthly-review",
        title: "Reading your monthly review",
        readMin: 4,
        topics: ["budgeting", "mindset"],
      },
    ]),
  },
  {
    id: "ch2",
    number: 2,
    title: "Patching the Hull",
    subtitle: "Debt",
    glyph: "🔨",
    status: "available",
    lessons: stubsFor("ch2", [
      {
        id: "ch2-l1-good-vs-bad-debt",
        title: "Good debt vs bad debt",
        readMin: 4,
        topics: ["debt", "mindset"],
      },
      {
        id: "ch2-l2-how-interest-works",
        title: "How interest actually works",
        readMin: 6,
        topics: ["debt"],
      },
      {
        id: "ch2-l3-starter-emergency-fund",
        title: "The $1,000 starter emergency fund",
        readMin: 5,
        topics: ["debt", "saving"],
      },
      {
        id: "ch2-l4-snowball-vs-avalanche",
        title: "Snowball vs Avalanche",
        readMin: 7,
        topics: ["debt", "mindset"],
      },
      {
        id: "ch2-l5-refinancing",
        title: "Refinancing — when it pays",
        readMin: 6,
        topics: ["debt", "real_estate"],
      },
      {
        id: "ch2-l6-debt-snowflake",
        title: "The debt snowflake (windfalls)",
        readMin: 4,
        topics: ["debt", "mindset"],
      },
    ]),
  },
  {
    id: "ch3",
    number: 3,
    title: "Stocking the Galley",
    subtitle: "Saving",
    glyph: "🍞",
    status: "coming-soon",
    lessons: stubsFor("ch3", [
      {
        id: "ch3-l1-emergency-fund-full",
        title: "Emergency fund — 3 to 6 months",
        readMin: null,
        topics: ["saving"],
      },
      {
        id: "ch3-l2-hysa-basics",
        title: "High-yield savings 101",
        readMin: null,
        topics: ["saving"],
      },
      {
        id: "ch3-l3-sinking-funds",
        title: "Sinking funds",
        readMin: null,
        topics: ["saving", "budgeting"],
      },
      {
        id: "ch3-l4-short-term-cash",
        title: "Where to park short-term cash",
        readMin: null,
        topics: ["saving"],
      },
    ]),
  },
  {
    id: "ch4",
    number: 4,
    title: "Catching Wind",
    subtitle: "Investing",
    glyph: "📈",
    status: "coming-soon",
    lessons: stubsFor("ch4", [
      {
        id: "ch4-l1-compounding",
        title: "Why compounding is the whole game",
        readMin: null,
        topics: ["investing"],
      },
      {
        id: "ch4-l2-index-funds",
        title: "Index funds in one page",
        readMin: null,
        topics: ["investing"],
      },
      {
        id: "ch4-l3-401k-ira-roth",
        title: "401(k), IRA, Roth — which first?",
        readMin: null,
        topics: ["investing", "retirement", "taxes"],
      },
      {
        id: "ch4-l4-asset-allocation",
        title: "Asset allocation by decade",
        readMin: null,
        topics: ["investing", "retirement"],
      },
      {
        id: "ch4-l5-big-mistakes",
        title: "Avoiding the big mistakes",
        readMin: null,
        topics: ["investing", "mindset"],
      },
    ]),
  },
  {
    id: "ch5",
    number: 5,
    title: "Charting Far Waters",
    subtitle: "Wealth & Beyond",
    glyph: "🗺️",
    status: "coming-soon",
    lessons: stubsFor("ch5", [
      {
        id: "ch5-l1-net-worth",
        title: "Net worth — the only score",
        readMin: null,
        topics: ["mindset", "investing"],
      },
      {
        id: "ch5-l2-buy-vs-rent",
        title: "Buy vs rent the math",
        readMin: null,
        topics: ["real_estate"],
      },
      {
        id: "ch5-l3-insurance",
        title: "Insurance — what you actually need",
        readMin: null,
        topics: ["insurance"],
      },
      {
        id: "ch5-l4-estate-basics",
        title: "Estate basics (will, beneficiaries, TOD)",
        readMin: null,
        topics: ["mindset"],
      },
    ]),
  },
] as const;

export const getChapter = (id: ChapterId): Chapter | undefined =>
  CHAPTERS.find((chapter) => chapter.id === id);

/** Flat list of every lesson stub across the curriculum, in course order. */
export const ALL_LESSON_STUBS: readonly LessonStub[] = CHAPTERS.flatMap(
  (chapter) => chapter.lessons
);

export const TOTAL_LESSON_COUNT = ALL_LESSON_STUBS.length;

export const getLessonStub = (lessonId: string): LessonStub | undefined =>
  ALL_LESSON_STUBS.find((lesson) => lesson.id === lessonId);
