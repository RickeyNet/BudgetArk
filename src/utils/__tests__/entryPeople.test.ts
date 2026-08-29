/**
 * BudgetArk - Entry People Tests
 * File: src/utils/__tests__/entryPeople.test.ts
 *
 * Pins the personId <-> personIds reconciliation: the single field is
 * authoritative for whether an entry is assigned (older peers edit only
 * it), the multi field only counts when it still contains the single one,
 * writes keep the pair consistent, and shares split evenly.
 */

import {
  entryPersonIds,
  formatPersonNames,
  personAssignmentFields,
  personShare,
} from "../entryPeople";

describe("entryPersonIds", () => {
  it("returns [] for an unassigned entry, even with a stale personIds", () => {
    expect(entryPersonIds({})).toEqual([]);
    expect(entryPersonIds({ personId: undefined, personIds: ["a", "b"] })).toEqual([]);
  });

  it("returns the single assignee the pre-multi-person way", () => {
    expect(entryPersonIds({ personId: "a" })).toEqual(["a"]);
  });

  it("returns everyone when personIds still contains personId", () => {
    expect(entryPersonIds({ personId: "a", personIds: ["a", "b", "c"] })).toEqual(["a", "b", "c"]);
  });

  it("lets an older peer's single-field edit win over a stale personIds", () => {
    // Old peer reassigned a -> z without knowing about personIds.
    expect(entryPersonIds({ personId: "z", personIds: ["a", "b"] })).toEqual(["z"]);
  });

  it("dedupes and drops junk ids fail-closed", () => {
    expect(
      entryPersonIds({ personId: "a", personIds: ["a", "a", "", "b", 7 as unknown as string] }),
    ).toEqual(["a", "b"]);
    expect(entryPersonIds({ personId: "a", personIds: "a" as unknown as string[] })).toEqual(["a"]);
  });
});

describe("personAssignmentFields", () => {
  it("clears both fields for no people", () => {
    expect(personAssignmentFields([])).toEqual({ personId: undefined, personIds: undefined });
  });

  it("stores one person as personId only", () => {
    expect(personAssignmentFields(["a"])).toEqual({ personId: "a", personIds: undefined });
  });

  it("stores several people with personId as the first", () => {
    expect(personAssignmentFields(["b", "a", "b", ""])).toEqual({
      personId: "b",
      personIds: ["b", "a"],
    });
  });

  it("round-trips through entryPersonIds", () => {
    for (const ids of [[], ["a"], ["a", "b"], ["c", "a", "b"]]) {
      expect(entryPersonIds(personAssignmentFields(ids))).toEqual(ids);
    }
  });
});

describe("personShare", () => {
  it("splits evenly and never divides by zero", () => {
    expect(personShare(90, 3)).toBe(30);
    expect(personShare(90, 1)).toBe(90);
    expect(personShare(90, 0)).toBe(0);
  });
});

describe("formatPersonNames", () => {
  it("joins names and marks deleted people", () => {
    const names = new Map([["a", "Alex"], ["b", "Sam"]]);
    expect(formatPersonNames(["a", "b"], names)).toBe("Alex, Sam");
    expect(formatPersonNames(["a", "gone"], names)).toBe("Alex, (deleted)");
    expect(formatPersonNames(["gone"], names, "(deleted person)")).toBe("(deleted person)");
    expect(formatPersonNames([], names)).toBe("");
  });
});
