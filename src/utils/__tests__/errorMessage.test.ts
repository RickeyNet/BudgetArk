// BudgetArk - describeError tests
//
// The inline-error surfaces added across the modals all route through this
// helper; it must never hand them an empty string or a non-string.

import { describeError } from "../errorMessage";

describe("describeError", () => {
  it("passes through a non-empty Error message", () => {
    expect(describeError(new Error("Encryption is unavailable"), "fallback")).toBe(
      "Encryption is unavailable"
    );
  });

  it("falls back for blank Error messages", () => {
    expect(describeError(new Error("   "), "Couldn't save.")).toBe("Couldn't save.");
    expect(describeError(new Error(), "Couldn't save.")).toBe("Couldn't save.");
  });

  it("falls back for non-Error throws", () => {
    expect(describeError("boom", "fallback")).toBe("fallback");
    expect(describeError(undefined, "fallback")).toBe("fallback");
    expect(describeError({ message: "not an Error" }, "fallback")).toBe("fallback");
  });
});
