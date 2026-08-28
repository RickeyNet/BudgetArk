/**
 * BudgetArk - Take-Home Pay Calculator Card
 * File: src/components/TaxCalculatorCard.tsx
 *
 * The Charts-tab US income tax estimator: gross income + filing status +
 * state + optional pre-tax deductions in, a paycheck-level take-home
 * breakdown out (federal, state, Social Security, Medicare, effective and
 * marginal rates), plus a compare-a-state line for relocation daydreams.
 * Everything computes on-device from the bundled 2026 tables in
 * src/data/taxData2026.ts / stateTaxData2026.ts - no network, ever. All
 * math lives in utils/taxCalc (pure, unit-tested); this is the thin shell.
 * Deliberately formats in US dollars regardless of display currency - the
 * tool models US taxes only, and the card says so.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  LayoutAnimation,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CodeChipGrid, { type CodeChipStyles } from "./CodeChipGrid";
import { parseMoneyInput } from "../utils/parseMoneyInput";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  FILING_STATUS_OPTIONS,
  TAX_DATA_YEAR,
  type FilingStatus,
} from "../data/taxData2026";
import { findStateTax, STATE_TAX_2026 } from "../data/stateTaxData2026";
import {
  calcTakeHome,
  PAY_FREQUENCY_OPTIONS,
  type TakeHomeResult,
} from "../utils/taxCalc";

/** Shared money rule (utils/parseMoneyInput); empty/invalid reads as 0 here. */
const parseMoney = (text: string): number => parseMoneyInput(text) ?? 0;

const usd = (value: number, decimals = 0): string =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

const pct = (fraction: number): string => `${(fraction * 100).toFixed(1)}%`;

const PERIOD_NOUN: Record<number, string> = {
  52: "week",
  26: "two weeks",
  24: "half-month",
  12: "month",
};

const TaxCalculatorCard: React.FC = () => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [open, setOpen] = useState(false);
  const [grossText, setGrossText] = useState("");
  const [status, setStatus] = useState<FilingStatus>("single");
  const [stateCode, setStateCode] = useState("");
  const [payPeriods, setPayPeriods] = useState<number>(26);
  const [k401Text, setK401Text] = useState("");
  const [hsaText, setHsaText] = useState("");
  const [premiumText, setPremiumText] = useState("");
  const [compareCode, setCompareCode] = useState("");

  // Memoized so the two 51-chip state grids skip re-rendering on every
  // keystroke in the salary/deduction inputs (see CodeChipGrid).
  const stateChipStyles = useMemo<CodeChipStyles>(
    () => ({
      wrap: styles.chipWrap,
      chip: styles.stateChip,
      chipActive: styles.chipActive,
      text: styles.chipText,
      textActive: styles.chipTextActive,
    }),
    [styles],
  );
  const compareOptions = useMemo(
    () => STATE_TAX_2026.filter((s) => s.code !== stateCode),
    [stateCode],
  );
  const handleCompareSelect = useCallback(
    (code: string) => setCompareCode((prev) => (prev === code ? "" : code)),
    [],
  );

  const toggleOpen = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  }, []);

  const gross = parseMoney(grossText);
  const selectedState = stateCode ? findStateTax(stateCode) : undefined;
  const ready = gross > 0 && !!selectedState;

  const input = useMemo(
    () => ({
      grossAnnual: gross,
      status,
      stateCode,
      retirement401kPercent: parseMoney(k401Text),
      hsaAnnual: parseMoney(hsaText),
      healthPremiumMonthly: parseMoney(premiumText),
      payPeriodsPerYear: payPeriods,
    }),
    [gross, status, stateCode, k401Text, hsaText, premiumText, payPeriods]
  );

  const result: TakeHomeResult | null = useMemo(
    () => (ready ? calcTakeHome(input) : null),
    [ready, input]
  );

  const compareResult: TakeHomeResult | null = useMemo(
    () =>
      ready && compareCode && compareCode !== stateCode
        ? calcTakeHome({ ...input, stateCode: compareCode })
        : null,
    [ready, compareCode, stateCode, input]
  );

  /** Where-each-dollar segments (fractions of gross, take-home first). */
  const segments = useMemo(() => {
    if (!result || result.grossAnnual <= 0) return [];
    const g = result.grossAnnual;
    return [
      { key: "home", label: "Take-home", value: result.takeHomeAnnual / g, color: colors.success },
      { key: "saved", label: "Pre-tax savings", value: (result.pretax401k + result.pretaxCafeteria) / g, color: colors.accent },
      { key: "fed", label: "Federal", value: result.federalTax / g, color: colors.warning },
      { key: "state", label: "State", value: result.stateTax / g, color: colors.danger },
      { key: "fica", label: "FICA", value: result.fica.total / g, color: colors.textMuted },
    ].filter((s) => s.value > 0.001);
  }, [result, colors]);

  const breakdownRow = (label: string, value: string, dim = false) => (
    <View style={styles.breakRow} key={label}>
      <Text style={[styles.breakLabel, dim && { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.breakValue, dim && { color: colors.textMuted }]}>{value}</Text>
    </View>
  );

  return (
    <>
      <TouchableOpacity style={styles.toolHeader} onPress={toggleOpen} activeOpacity={0.7}>
        <View>
          <Text style={styles.toolTitle}>Take-Home Pay</Text>
          <Text style={styles.toolHint}>
            Estimate US federal, state, and payroll tax on a salary
          </Text>
        </View>
        <Text style={styles.toolChevron}>{open ? "▾" : "›"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.toolBody}>
          {/* Income + filing status + frequency */}
          <View style={styles.efCard}>
            <Text style={styles.efSectionTitle}>Your income</Text>
            <Text style={styles.inputLabel}>Gross annual salary (USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 75000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={grossText}
              onChangeText={setGrossText}
              maxLength={12}
            />
            <Text style={styles.inputLabel}>Filing status</Text>
            <View style={styles.chipWrap}>
              {FILING_STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, status === opt.value && styles.chipActive]}
                  onPress={() => setStatus(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, status === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputLabel}>Paid every</Text>
            <View style={styles.chipWrap}>
              {PAY_FREQUENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, payPeriods === opt.value && styles.chipActive]}
                  onPress={() => setPayPeriods(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, payPeriods === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* State */}
          <View style={styles.efCard}>
            <Text style={styles.efSectionTitle}>State</Text>
            <CodeChipGrid
              options={STATE_TAX_2026}
              selected={stateCode}
              onSelect={setStateCode}
              styles={stateChipStyles}
            />
            {selectedState ? (
              <Text style={styles.efAutoHint}>
                {selectedState.name}
                {selectedState.type === "none" ? " - no state income tax on wages" : ""}
                {selectedState.note ? `. ${selectedState.note}` : ""}
              </Text>
            ) : (
              <Text style={styles.efAutoHint}>Pick your state to see the estimate.</Text>
            )}
          </View>

          {/* Pre-tax deductions */}
          <View style={styles.efCard}>
            <Text style={styles.efSectionTitle}>Pre-tax deductions (optional)</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>401(k) % of pay</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={k401Text}
                  onChangeText={setK401Text}
                  maxLength={5}
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>HSA per year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={hsaText}
                  onChangeText={setHsaText}
                  maxLength={8}
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Health / month</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={premiumText}
                  onChangeText={setPremiumText}
                  maxLength={8}
                />
              </View>
            </View>
            <Text style={styles.efAutoHint}>
              Traditional 401(k) lowers income tax; HSA and health premiums lower
              payroll (FICA) tax too.
            </Text>
          </View>

          {/* Result */}
          {result && (
            <>
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>
                  TAKE-HOME PER {PERIOD_NOUN[payPeriods]?.toUpperCase() ?? "PERIOD"}
                </Text>
                <Text style={styles.resultValue}>{usd(result.takeHomePerPeriod, 2)}</Text>
                <Text style={styles.resultSub}>
                  {usd(result.takeHomeAnnual)} / year · {usd(result.takeHomeAnnual / 12)} / month
                </Text>
              </View>

              {/* Where each dollar goes */}
              {segments.length > 0 && (
                <View style={styles.efCard}>
                  <Text style={styles.efSectionTitle}>Where each dollar goes</Text>
                  <View style={styles.dollarBar}>
                    {segments.map((s) => (
                      <View
                        key={s.key}
                        style={{ flex: s.value, backgroundColor: s.color }}
                      />
                    ))}
                  </View>
                  <View style={styles.legendWrap}>
                    {segments.map((s) => (
                      <View style={styles.legendItem} key={s.key}>
                        <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                        <Text style={styles.legendText}>
                          {s.label} {pct(s.value)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.efCard}>
                <Text style={styles.efSectionTitle}>Yearly breakdown</Text>
                {breakdownRow("Gross salary", usd(result.grossAnnual))}
                {result.pretax401k > 0 &&
                  breakdownRow("401(k) contribution", `-${usd(result.pretax401k)}`)}
                {result.pretaxCafeteria > 0 &&
                  breakdownRow("HSA + health premiums", `-${usd(result.pretaxCafeteria)}`)}
                {breakdownRow("Federal income tax", `-${usd(result.federalTax)}`)}
                {breakdownRow(
                  `${selectedState?.name ?? "State"} income tax`,
                  `-${usd(result.stateTax)}`
                )}
                {breakdownRow("Social Security", `-${usd(result.fica.socialSecurity)}`)}
                {breakdownRow(
                  "Medicare",
                  `-${usd(result.fica.medicare + result.fica.additionalMedicare)}`
                )}
                <View style={styles.breakDivider} />
                {breakdownRow("Take-home", usd(result.takeHomeAnnual))}
                {breakdownRow(
                  "Effective tax rate",
                  pct(result.effectiveRate),
                  true
                )}
                {breakdownRow(
                  "Federal marginal bracket",
                  pct(result.marginalFederalRate),
                  true
                )}
              </View>

              {/* Compare states */}
              <View style={styles.efCard}>
                <Text style={styles.efSectionTitle}>What if you moved?</Text>
                <CodeChipGrid
                  options={compareOptions}
                  selected={compareCode}
                  onSelect={handleCompareSelect}
                  styles={stateChipStyles}
                  keyPrefix="compare-"
                />
                {compareResult && (
                  <Text style={styles.compareText}>
                    Same salary in {findStateTax(compareCode)?.name}:{" "}
                    {usd(compareResult.takeHomeAnnual)} take-home -{" "}
                    {compareResult.takeHomeAnnual > result.takeHomeAnnual
                      ? `${usd(compareResult.takeHomeAnnual - result.takeHomeAnnual)} MORE per year.`
                      : compareResult.takeHomeAnnual < result.takeHomeAnnual
                        ? `${usd(result.takeHomeAnnual - compareResult.takeHomeAnnual)} LESS per year.`
                        : "the same."}
                  </Text>
                )}
              </View>
            </>
          )}

          {/* Disclaimer + data source */}
          <View style={styles.insightCard}>
            <Text style={styles.insightText}>
              Estimate only - actual tax depends on credits, deductions, local
              taxes, and other factors not modeled here. Not tax advice.
              Computed entirely on your phone from bundled {TAX_DATA_YEAR} tables
              (IRS Rev. Proc. 2025-32; Tax Foundation state data) - nothing you
              type leaves the device.
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
    toolHeader: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: tokens.radius,
      paddingVertical: tokens.pad,
      paddingHorizontal: tokens.pad + 2,
      marginBottom: tokens.gapSm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    toolTitle: {
      fontSize: scale(16),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    toolHint: {
      fontSize: 12,
      color: colors.textMuted,
    },
    toolChevron: {
      fontSize: 18,
      color: colors.textMuted,
      fontWeight: "600",
      marginLeft: 12,
    },
    toolBody: {
      gap: tokens.gapSm,
      marginBottom: tokens.gapSm,
    },
    efCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 16,
      gap: 8,
    },
    efSectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    efAutoHint: {
      fontSize: 12,
      color: colors.textDim,
      lineHeight: 17,
    },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: scale(15),
      color: colors.text,
    },
    inputRow: {
      flexDirection: "row",
      gap: 10,
    },
    inputHalf: {
      flex: 1,
      gap: 4,
    },
    inputLabel: {
      fontSize: 12,
      color: colors.textDim,
      fontWeight: "500",
      marginTop: 4,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: "center",
    },
    stateChip: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
      alignItems: "center",
      minWidth: 42,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}15`,
    },
    chipText: {
      fontSize: scale(13),
      color: colors.text,
      fontWeight: "600",
    },
    chipTextActive: {
      color: colors.accent,
    },
    resultCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
      gap: 4,
    },
    resultLabel: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    resultValue: {
      fontSize: scale(30),
      fontWeight: "800",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    resultSub: {
      fontSize: 13,
      color: colors.textDim,
    },
    dollarBar: {
      flexDirection: "row",
      height: 10,
      borderRadius: 5,
      overflow: "hidden",
      backgroundColor: colors.bg,
    },
    legendWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 2,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 11,
      color: colors.textDim,
    },
    breakRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 2,
    },
    breakLabel: {
      fontSize: 13,
      color: colors.textDim,
    },
    breakValue: {
      fontSize: 13,
      color: colors.text,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    breakDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 6,
    },
    compareText: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 19,
      marginTop: 2,
    },
    insightCard: {
      backgroundColor: `${colors.accent}0D`,
      borderWidth: 1,
      borderColor: `${colors.accent}25`,
      borderRadius: 14,
      padding: 14,
    },
    insightText: {
      fontSize: 12,
      color: colors.textDim,
      lineHeight: 18,
    },
  });
};

export default React.memo(TaxCalculatorCard);
