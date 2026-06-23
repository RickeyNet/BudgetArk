import {
  CURRENCY_PREFERENCE_OPTIONS,
  CurrencyPreferenceId,
  CurrencyPreferenceOption,
  DEFAULT_CURRENCY_PREFERENCE_ID,
} from "../types";

// Built on a prototype-less object so `value in OPTIONS_BY_ID` matches only
// real preference ids - not inherited keys like "toString" or "constructor".
const OPTIONS_BY_ID = CURRENCY_PREFERENCE_OPTIONS.reduce<
  Record<string, CurrencyPreferenceOption>
>((acc, option) => {
  acc[option.id] = option;
  return acc;
}, Object.create(null));

export const isCurrencyPreferenceId = (
  value: unknown
): value is CurrencyPreferenceId =>
  typeof value === "string" && value in OPTIONS_BY_ID;

export const getCurrencyPreferenceOption = (
  id?: string
): CurrencyPreferenceOption => {
  if (id && id in OPTIONS_BY_ID) {
    return OPTIONS_BY_ID[id];
  }
  return OPTIONS_BY_ID[DEFAULT_CURRENCY_PREFERENCE_ID];
};
