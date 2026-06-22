import { sanitizeTextInput } from "../sanitize";

describe("sanitizeTextInput", () => {
  it("leaves normal text untouched", () => {
    expect(sanitizeTextInput("Hello world 123")).toBe("Hello world 123");
  });

  it("keeps ordinary whitespace (space, tab, newline)", () => {
    expect(sanitizeTextInput("a\tb\nc d")).toBe("a\tb\nc d");
  });

  it("strips null bytes and control characters", () => {
    expect(sanitizeTextInput("a\x00b\x07c\x1Fd\x7Fe")).toBe("abcde");
  });

  it("returns an empty string when input is only control characters", () => {
    expect(sanitizeTextInput("\x00\x01\x02")).toBe("");
  });
});
