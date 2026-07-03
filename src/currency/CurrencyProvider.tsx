import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { InteractionManager } from "react-native";
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
import { USD_EXCHANGE_RATES } from "../utils/currencyConversion";
import { getCurrentRates, getStoredRates } from "../utils/exchangeRates";

type CurrencyContextValue = Readonly<{
  preferenceId: CurrencyPreferenceId;
  preference: CurrencyPreferenceOption;
  options: readonly CurrencyPreferenceOption[];
  currencySymbol: string;
  /**
   * Best-available units-per-USD rate table (live -> cache -> static). Used to
   * convert live external values - currently stock/crypto quotes, which arrive
   * in their own quote currency - into the display currency. Stored balances
   * are already localized by the currency-switch migration, so they need no
   * conversion here.
   */
  rates: Record<string, number>;
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
  // Seed with the static fallback so conversions always have a usable table,
  // even before the async resolve completes (and offline).
  const [rates, setRates] = useState<Record<string, number>>(USD_EXCHANGE_RATES);

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

  // Load the PINNED rates snapshot - never the network. Rates are fetched
  // exactly once, at the moment the user changes currency (see
  // setPreferenceId), and then stay fixed so day-to-day FX moves can't
  // wiggle converted balances the user didn't touch. USD users skip even
  // the read: the table converts holdings quotes into a NON-USD display
  // currency, and USD->USD is 1:1 against the static seed. Deferred past
  // the first paint so the read never sits in the startup window.
  useEffect(() => {
    if (getCurrencyPreferenceOption(preferenceId).currencyCode === "USD") return;
    let active = true;
    const task = InteractionManager.runAfterInteractions(() => {
      void getStoredRates()
        .then((snapshot) => {
          if (active) setRates(snapshot.rates);
        })
        .catch(() => {
          // Static seed remains; nothing to do.
        });
    });
    return () => {
      active = false;
      task.cancel();
    };
  }, [preferenceId]);

  const setPreferenceId = useCallback(async (id: CurrencyPreferenceId) => {
    const updatedUser = await updateCurrencyPreference(id);
    setPreferenceIdState(updatedUser.currencyPreferenceId);
    // Re-pin the rates snapshot at the moment of the change - the ONLY time
    // the network is consulted for display rates. Default (non-force) resolve
    // deliberately reuses the fresh cache the conversion prompt just wrote,
    // so the pinned table matches the rate the amounts were converted with;
    // a switch that skipped conversion (paired device / same currency unit)
    // fetches live here instead. Back on USD the table is unused - reset to
    // the static seed rather than leave a stale pin in state.
    const code = getCurrencyPreferenceOption(updatedUser.currencyPreferenceId).currencyCode;
    if (code === "USD") {
      setRates(USD_EXCHANGE_RATES);
      return;
    }
    try {
      const snapshot = await getCurrentRates();
      setRates(snapshot.rates);
    } catch {
      // Keep whatever table we had; getCurrentRates practically never throws.
    }
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
      rates,
      setPreferenceId,
      formatCurrency,
      formatCompactCurrency,
    }),
    [
      preferenceId,
      preference,
      currencySymbol,
      rates,
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
