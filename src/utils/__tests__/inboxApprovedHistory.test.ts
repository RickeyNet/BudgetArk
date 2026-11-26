/**
 * Tests for the Review Inbox's "Recently approved" list and its editor
 * (utils/inboxApprovedHistory): which entries count as recent approvals,
 * and exactly which fields an edit writes.
 */

import {
  APPROVED_HISTORY_DAYS,
  MAX_APPROVED_HISTORY,
  approvedEntryDraft,
  approvedEntryPatch,
  recentApprovedEntries,
} from "../inboxApprovedHistory";
import { makeBudgetEntry } from "../../__tests__/fixtures";

const NOW = new Date("2026-11-25T12:00:00.000Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 3600_000).toISOString();

const approved = (id: string, createdAt: string, over = {}) =>
  makeBudgetEntry({
    id,
    source: "bank",
    externalTxId: `tx-${id}`,
    createdAt,
    ...over,
  });

describe("recentApprovedEntries", () => {
  it("lists only live inbox approvals, newest approval first", () => {
    const entries = [
      approved("old", daysAgo(3)),
      makeBudgetEntry({ id: "manual", createdAt: daysAgo(1) }),
      approved("new", daysAgo(1)),
      approved("deleted", daysAgo(1), { deletedAt: daysAgo(0) }),
      makeBudgetEntry({ id: "no-tx", source: "bank", createdAt: daysAgo(1) }),
    ];
    expect(recentApprovedEntries(entries, NOW).map((e) => e.id)).toEqual(["new", "old"]);
  });

  it("orders by when it was approved, not by when the bank posted it", () => {
    const entries = [
      approved("posted-late", daysAgo(5), { date: daysAgo(1) }),
      approved("posted-early", daysAgo(2), { date: daysAgo(20) }),
    ];
    expect(recentApprovedEntries(entries, NOW).map((e) => e.id)).toEqual([
      "posted-early",
      "posted-late",
    ]);
  });

  it("drops approvals older than the window and unparseable stamps", () => {
    const entries = [
      approved("edge", daysAgo(APPROVED_HISTORY_DAYS)),
      approved("expired", daysAgo(APPROVED_HISTORY_DAYS + 1)),
      approved("garbage", "not a date"),
    ];
    expect(recentApprovedEntries(entries, NOW).map((e) => e.id)).toEqual(["edge"]);
  });

  it("keeps only the newest MAX_APPROVED_HISTORY", () => {
    const entries = Array.from({ length: MAX_APPROVED_HISTORY + 5 }, (_, i) =>
      approved(`e${i}`, new Date(NOW.getTime() - i * 60_000).toISOString()),
    );
    const recent = recentApprovedEntries(entries, NOW);
    expect(recent).toHaveLength(MAX_APPROVED_HISTORY);
    expect(recent[0].id).toBe("e0");
  });

  it("does not mutate its input", () => {
    const entries = [approved("a", daysAgo(3)), approved("b", daysAgo(1))];
    recentApprovedEntries(entries, NOW);
    expect(entries.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("approvedEntryDraft / approvedEntryPatch", () => {
  const entry = approved("e", daysAgo(1), {
    description: "Corner Market",
    category: "Grocery",
    businessId: "biz-1",
    personId: "p1",
    personIds: ["p1", "p2"],
  });

  it("an untouched draft writes nothing", () => {
    expect(approvedEntryDraft(entry)).toEqual({
      name: "Corner Market",
      category: "Grocery",
      businessId: "biz-1",
      personIds: ["p1", "p2"],
    });
    expect(approvedEntryPatch(entry, approvedEntryDraft(entry))).toBeNull();
  });

  it("writes only the fields that changed", () => {
    expect(
      approvedEntryPatch(entry, { ...approvedEntryDraft(entry), category: "Dining" }),
    ).toEqual({ category: "Dining" });
    expect(
      approvedEntryPatch(entry, { ...approvedEntryDraft(entry), name: "  Market run \u0007 " }),
    ).toEqual({ description: "Market run" });
  });

  it("clears the name, business and people with explicit undefined keys", () => {
    const patch = approvedEntryPatch(entry, {
      name: "   ",
      category: "Grocery",
      businessId: undefined,
      personIds: [],
    });
    expect(patch).toEqual({
      description: undefined,
      businessId: undefined,
      personId: undefined,
      personIds: undefined,
    });
    expect(Object.keys(patch ?? {}).sort()).toEqual([
      "businessId",
      "description",
      "personId",
      "personIds",
    ]);
  });

  it("stores one person the single-field way and several as a list", () => {
    const draft = approvedEntryDraft(entry);
    expect(approvedEntryPatch(entry, { ...draft, personIds: ["p2"] })).toEqual({
      personId: "p2",
      personIds: undefined,
    });
    expect(approvedEntryPatch(entry, { ...draft, personIds: ["p1", "p2", "p3"] })).toEqual({
      personId: "p1",
      personIds: ["p1", "p2", "p3"],
    });
  });

  it("drops the tenant when the entry moves to another business", () => {
    const rent = approved("rent", daysAgo(1), {
      type: "income",
      category: "Other",
      businessId: "biz-1",
      tenantId: "tenant-1",
    });
    expect(
      approvedEntryPatch(rent, { ...approvedEntryDraft(rent), businessId: "biz-2" }),
    ).toEqual({ businessId: "biz-2", tenantId: undefined });
    // Same business: the tenant stays.
    expect(
      approvedEntryPatch(rent, { ...approvedEntryDraft(rent), name: "June rent" }),
    ).toEqual({ description: "June rent" });
  });

  it("never touches a deposit's earner", () => {
    const paycheck = approved("pay", daysAgo(1), {
      type: "income",
      category: "Other",
      personId: "p1",
    });
    expect(approvedEntryDraft(paycheck).personIds).toEqual([]);
    expect(approvedEntryPatch(paycheck, approvedEntryDraft(paycheck))).toBeNull();
    expect(
      approvedEntryPatch(paycheck, { ...approvedEntryDraft(paycheck), personIds: ["p2"] }),
    ).toBeNull();
  });
});
