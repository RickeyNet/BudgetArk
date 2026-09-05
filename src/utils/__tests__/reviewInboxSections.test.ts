/**
 * Tests for buildInboxSections - the Review Inbox's SectionList grouping.
 *
 * The load-bearing rule: an item flagged both duplicate-likely AND
 * transfer-likely must appear in exactly one section ("Likely transfers"),
 * so a "Skip all" never acts on a transaction the user is also looking at
 * somewhere else in the list.
 */

import {
  buildInboxSections,
  buildInboxSectionsByMerchant,
  groupDefaultCategory,
  DUPLICATES_SECTION_TITLE,
  MERCHANT_NO_KEY_TITLE,
  TRANSFERS_SECTION_TITLE,
} from "../reviewInboxSections";
import { formatDayLabel } from "../dateFormat";
import { makePendingTransaction } from "../../__tests__/fixtures";

const dayTitle = (day: string) =>
  formatDayLabel(`${day}T12:00:00Z`, { weekday: true });

describe("buildInboxSections", () => {
  it("returns nothing for an empty inbox", () => {
    expect(buildInboxSections([])).toEqual([]);
  });

  it("groups plain items by posted day, newest day first", () => {
    const sections = buildInboxSections([
      makePendingTransaction({ id: "a", postedAt: "2026-06-01T09:00:00.000Z" }),
      makePendingTransaction({ id: "b", postedAt: "2026-06-03T09:00:00.000Z" }),
      makePendingTransaction({ id: "c", postedAt: "2026-06-01T18:00:00.000Z" }),
    ]);

    expect(sections.map((s) => s.title)).toEqual([
      dayTitle("2026-06-03"),
      dayTitle("2026-06-01"),
    ]);
    expect(sections[0].data.map((i) => i.id)).toEqual(["b"]);
    // Within a day, the caller's order is preserved.
    expect(sections[1].data.map((i) => i.id)).toEqual(["a", "c"]);
    expect(sections.every((s) => s.bulkSkippable === undefined)).toBe(true);
  });

  it("puts duplicate- and transfer-likely items in their own skippable sections", () => {
    const sections = buildInboxSections([
      makePendingTransaction({ id: "plain" }),
      makePendingTransaction({ id: "dupe", duplicateLikely: true }),
      makePendingTransaction({ id: "xfer", transferLikely: true }),
    ]);

    expect(sections.map((s) => s.title)).toEqual([
      dayTitle("2026-06-01"),
      DUPLICATES_SECTION_TITLE,
      TRANSFERS_SECTION_TITLE,
    ]);
    expect(sections[0].data.map((i) => i.id)).toEqual(["plain"]);
    expect(sections[1]).toMatchObject({ bulkSkippable: true });
    expect(sections[1].data.map((i) => i.id)).toEqual(["dupe"]);
    expect(sections[2]).toMatchObject({ bulkSkippable: true });
    expect(sections[2].data.map((i) => i.id)).toEqual(["xfer"]);
  });

  it("lists an item that is both duplicate- and transfer-likely once, under transfers", () => {
    const sections = buildInboxSections([
      makePendingTransaction({
        id: "both",
        duplicateLikely: true,
        transferLikely: true,
      }),
    ]);

    const appearances = sections.flatMap((s) =>
      s.data.filter((i) => i.id === "both").map(() => s.title)
    );
    expect(appearances).toEqual([TRANSFERS_SECTION_TITLE]);
    expect(sections.map((s) => s.title)).toEqual([TRANSFERS_SECTION_TITLE]);
  });

  it("omits empty heuristic sections and the dated sections alike", () => {
    const onlyTransfers = buildInboxSections([
      makePendingTransaction({ id: "xfer", transferLikely: true }),
    ]);
    expect(onlyTransfers.map((s) => s.title)).toEqual([
      TRANSFERS_SECTION_TITLE,
    ]);

    const onlyDuplicates = buildInboxSections([
      makePendingTransaction({ id: "dupe", duplicateLikely: true }),
    ]);
    expect(onlyDuplicates.map((s) => s.title)).toEqual([
      DUPLICATES_SECTION_TITLE,
    ]);
  });

  it("preserves the caller's order inside each heuristic section", () => {
    const sections = buildInboxSections([
      makePendingTransaction({ id: "d2", duplicateLikely: true }),
      makePendingTransaction({ id: "d1", duplicateLikely: true }),
      makePendingTransaction({ id: "t2", transferLikely: true }),
      makePendingTransaction({ id: "t1", transferLikely: true }),
    ]);

    expect(sections[0].data.map((i) => i.id)).toEqual(["d2", "d1"]);
    expect(sections[1].data.map((i) => i.id)).toEqual(["t2", "t1"]);
  });
});

describe("buildInboxSectionsByMerchant", () => {
  it("groups by merchant, biggest group first then alphabetical", () => {
    const items = [
      makePendingTransaction({ id: "c1", merchant: "COSTCO", postedAt: "2026-01-05T12:00:00.000Z" }),
      makePendingTransaction({ id: "c2", merchant: "COSTCO", postedAt: "2026-02-05T12:00:00.000Z" }),
      makePendingTransaction({ id: "a1", merchant: "AMAZON", postedAt: "2026-01-09T12:00:00.000Z" }),
      makePendingTransaction({ id: "c3", merchant: "COSTCO", postedAt: "2026-03-05T12:00:00.000Z" }),
    ];
    const sections = buildInboxSectionsByMerchant(items);
    expect(sections.map((s) => s.title)).toEqual(["COSTCO · 3", "AMAZON · 1"]);
    // Within a group, newest posted first.
    expect(sections[0].data.map((i) => i.id)).toEqual(["c3", "c2", "c1"]);
    expect(sections[0].groupKey).toBe("COSTCO");
    expect(sections[0].bulkCategorizable).toBe(true);
  });

  it("collects merchant-less items into one non-categorizable section", () => {
    const sections = buildInboxSectionsByMerchant([
      makePendingTransaction({ id: "m", merchant: "TARGET" }),
      makePendingTransaction({ id: "n1", merchant: "" }),
      makePendingTransaction({ id: "n2", merchant: "" }),
    ]);
    const other = sections.find((s) => s.title === MERCHANT_NO_KEY_TITLE);
    expect(other?.data.map((i) => i.id).sort()).toEqual(["n1", "n2"]);
    expect(other?.bulkCategorizable).toBeUndefined();
  });

  it("keeps duplicates and transfers in their own trailing sections", () => {
    const sections = buildInboxSectionsByMerchant([
      makePendingTransaction({ id: "reg", merchant: "COSTCO" }),
      makePendingTransaction({ id: "dup", merchant: "COSTCO", duplicateLikely: true }),
      makePendingTransaction({ id: "xfer", merchant: "COSTCO", transferLikely: true }),
      makePendingTransaction({ id: "both", merchant: "COSTCO", duplicateLikely: true, transferLikely: true }),
    ]);
    const titles = sections.map((s) => s.title);
    expect(titles).toContain(DUPLICATES_SECTION_TITLE);
    expect(titles).toContain(TRANSFERS_SECTION_TITLE);
    const dup = sections.find((s) => s.title === DUPLICATES_SECTION_TITLE)!;
    const xfer = sections.find((s) => s.title === TRANSFERS_SECTION_TITLE)!;
    // A duplicate+transfer item appears only under transfers (one section rule).
    expect(dup.data.map((i) => i.id)).toEqual(["dup"]);
    expect(xfer.data.map((i) => i.id).sort()).toEqual(["both", "xfer"]);
    // The merchant group holds only the plain regular item.
    expect(sections[0].data.map((i) => i.id)).toEqual(["reg"]);
  });
});

describe("groupDefaultCategory", () => {
  it("returns the most-suggested category, else undefined", () => {
    expect(
      groupDefaultCategory([
        makePendingTransaction({ id: "1", suggestedCategory: "Grocery" }),
        makePendingTransaction({ id: "2", suggestedCategory: "Grocery" }),
        makePendingTransaction({ id: "3", suggestedCategory: "Shopping" }),
      ]),
    ).toBe("Grocery");
    expect(groupDefaultCategory([makePendingTransaction({ id: "x" })])).toBeUndefined();
  });
});
