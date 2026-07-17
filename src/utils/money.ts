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
