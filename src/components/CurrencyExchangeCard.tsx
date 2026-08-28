/**
 * BudgetArk - Currency Exchange Card
 * File: src/components/CurrencyExchangeCard.tsx
 *
 * The Charts-tab converter: an amount, From/To currency grids, swap, and a
 * "rates updated" line with manual refresh. Rates resolve through
 * exchangeRates.getConverterRates (its own cache, deliberately separate
 * from the pinned display snapshot - see that module) and only the public
 * rate table ever leaves the phone, never the amount. From defaults to
 * the user's display currency until a chip is tapped. Self-contained;
 * extracted from ChartsScreen.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutAnimation,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useToolStyles } from "../theme/toolStyles";
import { useCurrency } from "../currency/CurrencyProvider";
import CodeChipGrid, { type CodeChipStyles } from "./CodeChipGrid";
import { convertAmount, USD_EXCHANGE_RATES } from "../utils/currencyConversion";
import { getConverterRates } from "../utils/exchangeRates";
import type { RatesSnapshot } from "../utils/exchangeRates";
import {
  crossRate,
  describeRatesSnapshot,
  EXCHANGE_CURRENCIES,
  formatAmountInCurrency,
  formatCrossRate,
  parseAmountInput,
} from "../utils/exchangeCalculator";


const CurrencyExchangeCard: React.FC = () => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { preference } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const tool = useToolStyles();

  /* Currency exchange calculator state. From/To start as null ("not chosen
   * yet"): From follows the user's display currency and To its natural
   * counterpart until a chip is tapped, so the tool opens ready to use. */
  const [fxOpen, setFxOpen] = useState(false);
  const [fxAmountText, setFxAmountText] = useState("100");
  const [fxFrom, setFxFrom] = useState<string | null>(null);
  const [fxTo, setFxTo] = useState<string | null>(null);
  const [fxSnapshot, setFxSnapshot] = useState<RatesSnapshot | null>(null);
  /* "Rates updated X ago" - stamped when a snapshot lands (render must stay
   * pure, so the age is not computed inline). Re-stamped on every open. */
  const [fxRatesLabel, setFxRatesLabel] = useState<string | null>(null);
  const [fxRefreshing, setFxRefreshing] = useState(false);

  /* ── Currency exchange logic ── */

  const toggleFx = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFxOpen((prev) => !prev);
  }, []);

  const applyFxSnapshot = useCallback((snapshot: RatesSnapshot) => {
    setFxSnapshot(snapshot);
    setFxRatesLabel(describeRatesSnapshot(snapshot, Date.now()));
  }, []);

  // Resolve rates when the tool opens. Cache-first: with a fresh converter
  // cache this is a pure storage read, so reopening the tool costs no
  // network call. The converter cache is deliberately separate from the
  // pinned display snapshot (see exchangeRates.ts), so nothing here can
  // move converted balances shown elsewhere in the app.
  useEffect(() => {
    if (!fxOpen) return;
    let active = true;
    void getConverterRates()
      .then((snapshot) => {
        if (active) applyFxSnapshot(snapshot);
      })
      .catch(() => {
        if (active) setFxRatesLabel("Couldn't load rates - tap Refresh to try again.");
      });
    return () => {
      active = false;
    };
  }, [fxOpen, applyFxSnapshot]);

  const handleFxRefresh = useCallback(() => {
    setFxRefreshing(true);
    void getConverterRates({ forceRefresh: true })
      .then(applyFxSnapshot)
      .catch(() =>
        setFxRatesLabel("Couldn't refresh rates - showing the last saved rates."),
      )
      .finally(() => setFxRefreshing(false));
  }, [applyFxSnapshot]);

  const fxFromCode = fxFrom ?? preference.currencyCode;
  const fxToCode = fxTo ?? (fxFromCode === "USD" ? "EUR" : "USD");

  // Memoized so the two currency grids skip re-rendering on every keystroke
  // in the amount field (see CodeChipGrid).
  const fxChipStyles = useMemo<CodeChipStyles>(
    () => ({
      wrap: tool.chipWrap,
      chip: tool.chip,
      chipActive: tool.chipActive,
      text: tool.chipText,
      textActive: tool.chipTextActive,
    }),
    [tool],
  );

  const handleFxSelectFrom = useCallback(
    (code: string) => {
      // Picking the other side's currency swaps the pair instead of
      // producing a same-to-same conversion.
      if (code === fxToCode && code !== fxFromCode) setFxTo(fxFromCode);
      setFxFrom(code);
    },
    [fxFromCode, fxToCode]
  );

  const handleFxSelectTo = useCallback(
    (code: string) => {
      if (code === fxFromCode && code !== fxToCode) setFxFrom(fxToCode);
      setFxTo(code);
    },
    [fxFromCode, fxToCode]
  );

  const handleFxSwap = useCallback(() => {
    setFxFrom(fxToCode);
    setFxTo(fxFromCode);
  }, [fxFromCode, fxToCode]);

  const fxAmount = useMemo(() => parseAmountInput(fxAmountText), [fxAmountText]);
  const fxRates = fxSnapshot?.rates ?? USD_EXCHANGE_RATES;
  const fxToCurrency =
    EXCHANGE_CURRENCIES.find((c) => c.code === fxToCode) ?? EXCHANGE_CURRENCIES[0];
  const fxConverted =
    fxAmount !== null ? convertAmount(fxAmount, fxFromCode, fxToCode, fxRates) : null;
  const fxRate = crossRate(fxFromCode, fxToCode, fxRates);


  return (
    <>
        {/* ── Currency Exchange Tool ── */}
        <TouchableOpacity style={tool.toolHeader} onPress={toggleFx} activeOpacity={0.7}>
          <View>
            <Text style={tool.toolTitle}>Currency Exchange</Text>
            <Text style={tool.toolHint}>Convert an amount between currencies</Text>
          </View>
          <Text style={tool.toolChevron}>{fxOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {fxOpen && (
          <View style={tool.toolBody}>
            {/* Result */}
            <View style={tool.resultCard}>
              <Text style={tool.resultLabel}>CONVERTED VALUE</Text>
              <Text style={tool.resultValue}>
                {fxConverted !== null
                  ? formatAmountInCurrency(fxConverted, fxToCurrency)
                  : "--"}
              </Text>
              <Text style={tool.resultSub}>
                1 {fxFromCode} = {formatCrossRate(fxRate)} {fxToCode}
              </Text>
            </View>

            {/* Amount + currency pickers */}
            <View style={tool.efCard}>
              <Text style={tool.efSectionTitle}>Amount</Text>
              <TextInput
                style={tool.input}
                placeholder="Amount to convert"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={fxAmountText}
                onChangeText={setFxAmountText}
              />

              <Text style={tool.efSectionTitle}>From</Text>
              <CodeChipGrid
                options={EXCHANGE_CURRENCIES}
                selected={fxFromCode}
                onSelect={handleFxSelectFrom}
                styles={fxChipStyles}
                keyPrefix="fx-from-"
              />

              <TouchableOpacity
                style={styles.fxSwapBtn}
                onPress={handleFxSwap}
                activeOpacity={0.7}
              >
                <Text style={styles.fxSwapBtnText}>⇅ Swap</Text>
              </TouchableOpacity>

              <Text style={tool.efSectionTitle}>To</Text>
              <CodeChipGrid
                options={EXCHANGE_CURRENCIES}
                selected={fxToCode}
                onSelect={handleFxSelectTo}
                styles={fxChipStyles}
                keyPrefix="fx-to-"
              />
            </View>

            {/* Rates freshness + manual refresh */}
            {fxRatesLabel !== null && (
              <View style={styles.fxRatesRow}>
                <Text style={tool.efAutoHint}>{fxRatesLabel}</Text>
                <TouchableOpacity
                  onPress={handleFxRefresh}
                  disabled={fxRefreshing}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.fxRefreshText, fxRefreshing && styles.fxRefreshDisabled]}
                  >
                    {fxRefreshing ? "Refreshing…" : "↻ Refresh rates"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Privacy note */}
            <View style={tool.insightCard}>
              <Text style={tool.insightText}>
                Rates come from a free public exchange-rate service, typically updated once a day. Only the request for the day's rate table leaves your phone - never your amounts.
              </Text>
            </View>
          </View>
        )}

    </>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    fxSwapBtn: {
      alignSelf: "center",
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginVertical: 2,
    },
    fxSwapBtnText: {
      fontSize: scale(13),
      color: colors.accent,
      fontWeight: "600",
    },
    fxRatesRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 4,
    },
    fxRefreshText: {
      fontSize: scale(12),
      color: colors.accent,
      fontWeight: "600",
    },
    fxRefreshDisabled: {
      opacity: 0.5,
    },
  });
};

export default React.memo(CurrencyExchangeCard);
