import { normalizePaymentUrl, isAcceptablePaymentUrl } from "../paymentUrl";

describe("normalizePaymentUrl", () => {
  it("returns null for empty or nullish input", () => {
    expect(normalizePaymentUrl(null)).toBeNull();
    expect(normalizePaymentUrl(undefined)).toBeNull();
    expect(normalizePaymentUrl("   ")).toBeNull();
  });

  it("auto-prepends https:// when no scheme is given", () => {
    expect(normalizePaymentUrl("electric.example.com/pay")).toBe(
      "https://electric.example.com/pay"
    );
  });

  it("keeps an existing https URL", () => {
    expect(normalizePaymentUrl("https://pay.example.com")).toBe(
      "https://pay.example.com/"
    );
  });

  it("strips surrounding quotes/brackets pasted from emails", () => {
    expect(normalizePaymentUrl("<https://pay.example.com>")).toBe(
      "https://pay.example.com/"
    );
  });

  it("rejects non-http(s) schemes (javascript, data, file, deep links)", () => {
    expect(normalizePaymentUrl("javascript:alert(1)")).toBeNull();
    expect(normalizePaymentUrl("data:text/html,<h1>x</h1>")).toBeNull();
    expect(normalizePaymentUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects hosts without a dot", () => {
    expect(normalizePaymentUrl("https://localhost")).toBeNull();
  });
});

describe("isAcceptablePaymentUrl", () => {
  it("accepts undefined, null, and empty string (cleared field)", () => {
    expect(isAcceptablePaymentUrl(undefined)).toBe(true);
    expect(isAcceptablePaymentUrl(null)).toBe(true);
    expect(isAcceptablePaymentUrl("")).toBe(true);
  });

  it("accepts a valid URL and rejects a malicious one", () => {
    expect(isAcceptablePaymentUrl("https://pay.example.com")).toBe(true);
    expect(isAcceptablePaymentUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isAcceptablePaymentUrl(123)).toBe(false);
    expect(isAcceptablePaymentUrl({})).toBe(false);
  });
});
