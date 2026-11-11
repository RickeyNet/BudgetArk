/**
 * BudgetArk - Export Password Check tests
 *
 * Guards the "typo makes an unrestorable backup" bug: the export dialog may
 * only encrypt when the password is long enough and typed identically twice.
 */

import {
  checkExportPassword,
  EXPORT_PASSWORD_MIN_LENGTH,
} from "../exportPassword";

describe("checkExportPassword", () => {
  it("accepts a matching password of the minimum length", () => {
    expect(EXPORT_PASSWORD_MIN_LENGTH).toBe(4);
    expect(checkExportPassword("abcd", "abcd")).toBe("ok");
  });

  it("accepts a long matching password", () => {
    const pw = "correct horse battery staple";
    expect(checkExportPassword(pw, pw)).toBe("ok");
  });

  it("rejects a password under the minimum length", () => {
    expect(checkExportPassword("", "")).toBe("tooShort");
    expect(checkExportPassword("abc", "abc")).toBe("tooShort");
  });

  it("reports tooShort before mismatch", () => {
    expect(checkExportPassword("abc", "")).toBe("tooShort");
    expect(checkExportPassword("abc", "xyz")).toBe("tooShort");
  });

  it("rejects an empty confirmation", () => {
    expect(checkExportPassword("hunter22", "")).toBe("mismatch");
  });

  it("rejects a one-character typo", () => {
    expect(checkExportPassword("hunter22", "hunter23")).toBe("mismatch");
    expect(checkExportPassword("hunter22", "hunter2")).toBe("mismatch");
  });

  it("is case-sensitive", () => {
    expect(checkExportPassword("Hunter22", "hunter22")).toBe("mismatch");
  });

  it("does not trim whitespace", () => {
    expect(checkExportPassword("hunter22 ", "hunter22")).toBe("mismatch");
    expect(checkExportPassword(" hunter22", " hunter22")).toBe("ok");
  });

  it("does not Unicode-normalize (the KDF sees raw code units)", () => {
    const composed = "café!";
    const decomposed = "café!";
    expect(checkExportPassword(composed, decomposed)).toBe("mismatch");
  });
});
