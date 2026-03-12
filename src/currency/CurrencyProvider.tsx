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

const createCurrencyFormatter = (
  locale: string,
  currencyCode: string,
  compact: boolean
): Intl.NumberFormat => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 2,
    });
  } catch {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: compact ? 1 : 2,
      });
    } catch {
      return new Intl.NumberFormat();
    }
  }
};

export const CurrencyProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [preferenceId, setPreferenceIdState] =
    useState<CurrencyPreferenceId>(DEFAULT_CURRENCY_PREFERENCE_ID);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await getOrCreateUser();
        setPreferenceIdState(user.currencyPreferenceId);
      } catch (error) {
        if (__DEV__) console.error("Failed to load currency preference:", error);
      }
    };
    void load();
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
    () => createCurrencyFormatter(preference.locale, preference.currencyCode, false),
    [preference.currencyCode, preference.locale]
  );

  const compactFormatter = useMemo(
    () => createCurrencyFormatter(preference.locale, preference.currencyCode, true),
    [preference.currencyCode, preference.locale]
  );

  const currencySymbol = useMemo(() => {
    try {
      if (typeof standardFormatter.formatToParts === "function") {
        const part = standardFormatter
          .formatToParts(0)
          .find((item) => item.type === "currency");
        if (part?.value) return part.value;
      }
    } catch {
      // Fall through to currency code.
    }
    return preference.currencyCode;
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
