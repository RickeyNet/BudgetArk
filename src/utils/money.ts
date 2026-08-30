// BudgetArk - Money Math
//
// The one shared cent-rounding helper. Three independent copies used to
// exist (connections/types, paycheckMath, an inline in currencyConversion),
// which is exactly how rounding rules drift; new money math should import
// from here. Amounts are floats app-wide, so any arithmetic that will be
// displayed or persisted should pass through roundToCents to shed binary
// artifacts like 6180.049999999999.

/** Round to cents (2 decimals). Non-finite input returns 0 - never NaN. */
export const roundToCents = (value: number): number =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

/**
 * A bank-reported balance in the BANK's currency (ExternalAccountLink
 * .currency), deliberately NOT the app's display currency: the link row
 * shows what the provider said, unconverted, so the user can compare it to
 * the Bridge account it updates. Unknown or missing codes fall back to a
 * plain 2-decimal number with the code appended instead of throwing (Intl
 * rejects codes it doesn't know).
 */
export const formatBankBalance = (amount: number, currency?: string): string => {
  const code = (currency ?? "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    }).format(roundToCents(amount));
  } catch {
    return `${roundToCents(amount).toFixed(2)} ${code}`;
  }
};
