import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CURRENCY_PREFERENCE_OPTIONS,
  CurrencyPreferenceId,
  CurrencyPreferenceOption,
  DEFAULT_CURRENCY_PREFERENCE_ID,
} from "../types";
import {
  getOrCreateUser,
  updateCurrencyPreference,
} from "../storage/userStorage";
import { getCurrencyPreferenceOption } from "../utils/currencyPreferences";

type CurrencyContextValue = Readonly<{
  preferenceId: CurrencyPreferenceId;
  preference: CurrencyPreferenceOption;
  options: readonly CurrencyPreferenceOption[];
  currencySymbol: string;
  setPreferenceId: (id: CurrencyPreferenceId) => Promise<void>;
  formatCurrency: (amount: number) => string;
  formatCompactCurrency: (amount: number) => string;
}>;

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export const CurrencyProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [preferenceId, setPreferenceIdState] =
    useState<CurrencyPreferenceId>(DEFAULT_CURRENCY_PREFERENCE_ID);

  useEffect(() => {
    const load = async () => {
      const user = await getOrCreateUser();
      setPreferenceIdState(user.currencyPreferenceId);
    };
    load();
  }, []);

  const setPreferenceId = useCallback(async (id: CurrencyPreferenceId) => {
    const updatedUser = await updateCurrencyPreference(id);
    setPreferenceIdState(updatedUser.currencyPreferenceId);
  }, []);

  const preference = useMemo(
    () => getCurrencyPreferenceOption(preferenceId),
    [preferenceId]
  );

  const standardFormatter = useMemo(
    () =>
      new Intl.NumberFormat(preference.locale, {
        style: "currency",
        currency: preference.currencyCode,
        maximumFractionDigits: 2,
      }),
    [preference.currencyCode, preference.locale]
  );

  const compactFormatter = useMemo(
    () =>
      new Intl.NumberFormat(preference.locale, {
        style: "currency",
        currency: preference.currencyCode,
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [preference.currencyCode, preference.locale]
  );

  const currencySymbol = useMemo(() => {
    const part = standardFormatter
      .formatToParts(0)
      .find((item) => item.type === "currency");
    return part?.value || preference.currencyCode;
  }, [preference.currencyCode, standardFormatter]);

  const formatCurrency = useCallback(
    (amount: number) => standardFormatter.format(amount),
    [standardFormatter]
  );

  const formatCompactCurrency = useCallback(
    (amount: number) => compactFormatter.format(amount),
    [compactFormatter]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      preferenceId,
      preference,
      options: CURRENCY_PREFERENCE_OPTIONS,
      currencySymbol,
      setPreferenceId,
      formatCurrency,
      formatCompactCurrency,
    }),
    [
      preferenceId,
      preference,
      currencySymbol,
      setPreferenceId,
      formatCurrency,
      formatCompactCurrency,
    ]
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextValue => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency() must be used inside <CurrencyProvider>.");
  }
  return ctx;
};
