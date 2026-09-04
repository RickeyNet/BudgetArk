/**
 * BudgetArk - Quarterly Taxes Card
 * File: src/components/QuarterlyTaxCard.tsx
 *
 * Charts-tab tool for 1099 earners: per IRS quarter, the 1099 income
 * logged, what the per-entry set-aside rate already reserved, and the
 * estimated payment due on the bundled due date (utils/quarterlyTax -
 * federal income tax + self-employment tax on annualized income, from the
 * same 2026 tables as the Take-Home calculator). A "Mark paid" per quarter
 * is device-local (storage/quarterlyTaxPaidStorage). The screen passes
 * the entries it already loads; the card owns the year, filing status and
 * paid marks. Estimates only - it says so.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useToolStyles } from "../theme/toolStyles";
import { useCurrency } from "../currency/CurrencyProvider";
import { FILING_STATUS_OPTIONS, TAX_DATA_YEAR, type FilingStatus } from "../data/taxData2026";
import {
  buildQuarterlyTaxYear,
  defaultTaxYear,
  earliestTaxYear,
  type QuarterPaidRecord,
  type QuarterRow,
} from "../utils/quarterlyTax";
import {
  getQuarterPaidMap,
  markQuarterPaid,
  unmarkQuarterPaid,
} from "../storage/quarterlyTaxPaidStorage";
import { formatDayLabel } from "../utils/dateFormat";
import { triggerHaptic } from "../utils/haptics";
import { describeError } from "../utils/errorMessage";
import type { BudgetEntry } from "../types";

interface QuarterlyTaxCardProps {
  /** Live budget entries (the screen's focus load). */
  entries: BudgetEntry[];
}

const QuarterlyTaxCard: React.FC<QuarterlyTaxCardProps> = ({ entries }) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const tool = useToolStyles();

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => defaultTaxYear());
  const [status, setStatus] = useState<FilingStatus>("single");
  const [paid, setPaid] = useState<Record<string, QuarterPaidRecord>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getQuarterPaidMap()
      .then((map) => {
        if (!cancelled) setPaid(map);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

  const model = useMemo(
    () => buildQuarterlyTaxYear({ entries, year, status, paid }),
    [entries, year, status, paid]
  );

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  }, []);

  const handleTogglePaid = useCallback(
    async (row: QuarterRow) => {
      if (busyKey) return;
      setBusyKey(row.key);
      setError(null);
      try {
        const next = row.paid
          ? await unmarkQuarterPaid(row.key)
          : await markQuarterPaid(row.key, {
              paidAt: new Date().toISOString(),
              amount: row.estimatedDue,
            });
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setPaid(next);
        triggerHaptic(row.paid ? "selection" : "success");
      } catch (err) {
        triggerHaptic("error");
        setError(describeError(err, "Couldn't update that quarter."));
      } finally {
        setBusyKey(null);
      }
    },
    [busyKey]
  );

  const thisYear = new Date().getFullYear();
  const firstYear = useMemo(() => earliestTaxYear(entries), [entries]);
  const statusLabel = (row: QuarterRow): { text: string; color: string } => {
    switch (row.status) {
      case "paid":
        return { text: `Paid ${formatDayLabel(row.paid?.paidAt ?? "")}`, color: colors.success };
      case "overdue":
        return { text: `Was due ${formatDayLabel(row.dueDate.toISOString())}`, color: colors.danger };
      case "due-soon":
        return { text: `Due ${formatDayLabel(row.dueDate.toISOString())}`, color: colors.warning };
      case "upcoming":
        return { text: `Due ${formatDayLabel(row.dueDate.toISOString())}`, color: colors.textDim };
      default:
        return { text: "No 1099 income", color: colors.textMuted };
    }
  };

  return (
    <>
      <TouchableOpacity
        style={tool.toolHeader}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Quarterly Taxes"
      >
        <View>
          <Text style={tool.toolTitle}>Quarterly Taxes</Text>
          <Text style={tool.toolHint}>
            {model.hasIncome
              ? `${year}: set aside ${formatCurrency(model.totalSetAside)} of ~${formatCurrency(model.totalEstimatedDue)} estimated`
              : "Estimated payments on your 1099 income"}
          </Text>
        </View>
        <Text style={tool.toolChevron}>{open ? "▾" : "›"}</Text>
      </TouchableOpacity>

      {open ? (
        <View style={tool.toolBody}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={tool.efCard}>
            <View style={styles.yearRow}>
              <TouchableOpacity
                onPress={() => setYear((y) => Math.max(firstYear, y - 1))}
                style={[styles.yearBtn, year <= firstYear && styles.yearBtnDisabled]}
                disabled={year <= firstYear}
                accessibilityRole="button"
                accessibilityLabel="Previous year"
              >
                <Text style={styles.yearBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.yearLabel}>Tax year {year}</Text>
              <TouchableOpacity
                onPress={() => setYear((y) => Math.min(thisYear, y + 1))}
                style={[styles.yearBtn, year >= thisYear && styles.yearBtnDisabled]}
                disabled={year >= thisYear}
                accessibilityRole="button"
                accessibilityLabel="Next year"
              >
                <Text style={styles.yearBtnText}>›</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Filing status</Text>
            <View style={tool.chipWrap}>
              {FILING_STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[tool.chip, status === opt.value && tool.chipActive]}
                  onPress={() => setStatus(opt.value)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: status === opt.value }}
                >
                  <Text style={[tool.chipText, status === opt.value && tool.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {!model.hasIncome ? (
            <View style={tool.efCard}>
              <Text style={tool.refiEmptyText}>
                No 1099 income logged for {year}. Mark income entries as 1099 (with a tax
                set-aside rate) in the Add Entry form and the quarters fill in here.
              </Text>
            </View>
          ) : (
            <>
              <View style={tool.resultCard}>
                <Text style={tool.resultLabel}>{year} ESTIMATED PAYMENTS</Text>
                <Text style={tool.resultValue}>{formatCurrency(model.totalEstimatedDue)}</Text>
                <Text style={tool.resultSub}>
                  on {formatCurrency(model.totalIncome)} of 1099 income · set aside{" "}
                  {formatCurrency(model.totalSetAside)}
                  {model.reserveGap < -0.5
                    ? ` (${formatCurrency(Math.abs(model.reserveGap))} short)`
                    : model.reserveGap > 0.5
                      ? ` (${formatCurrency(model.reserveGap)} to spare)`
                      : ""}
                </Text>
              </View>

              {model.rows.map((row) => {
                const label = statusLabel(row);
                const busy = busyKey === row.key;
                const reserved = row.estimatedDue > 0 ? Math.min(1, row.setAside / row.estimatedDue) : 1;
                return (
                  <View key={row.key} style={tool.efCard}>
                    <View style={styles.rowHeader}>
                      <Text style={styles.rowTitle}>
                        {row.quarter.label} · {row.quarter.monthsLabel}
                      </Text>
                      <Text style={[styles.rowStatus, { color: label.color }]}>{label.text}</Text>
                    </View>
                    <View style={styles.breakRow}>
                      <Text style={styles.breakLabel}>1099 income</Text>
                      <Text style={styles.breakValue}>{formatCurrency(row.income1099)}</Text>
                    </View>
                    <View style={styles.breakRow}>
                      <Text style={styles.breakLabel}>Set aside</Text>
                      <Text style={styles.breakValue}>{formatCurrency(row.setAside)}</Text>
                    </View>
                    <View style={styles.breakRow}>
                      <Text style={styles.breakLabel}>Estimated payment</Text>
                      <Text style={[styles.breakValue, { color: colors.accent }]}>
                        {formatCurrency(row.estimatedDue)}
                      </Text>
                    </View>
                    {row.estimatedDue > 0 ? (
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            {
                              width: `${Math.round(reserved * 100)}%`,
                              backgroundColor: reserved >= 1 ? colors.success : colors.warning,
                            },
                          ]}
                        />
                      </View>
                    ) : null}
                    {row.status !== "none" ? (
                      <TouchableOpacity
                        style={[
                          row.paid ? styles.secondaryButton : styles.primaryButton,
                          busy && styles.buttonDisabled,
                        ]}
                        onPress={() => void handleTogglePaid(row)}
                        disabled={busyKey !== null}
                        accessibilityRole="button"
                      >
                        <Text style={row.paid ? styles.secondaryButtonText : styles.primaryButtonText}>
                          {row.paid ? "Undo paid" : "Mark paid"}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}

              <View style={tool.insightCard}>
                <Text style={tool.insightText}>
                  Estimates from the {TAX_DATA_YEAR} federal tables: self-employment tax plus income
                  tax on your annualized 1099 income, with the standard deduction. No state tax,
                  credits, W-2 withholding or other income - if you also have a W-2 job, your
                  real installment may differ. Due dates are the IRS calendar; the paid mark stays
                  on this phone.
                </Text>
              </View>
            </>
          )}
        </View>
      ) : null}
    </>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    yearRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    yearBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    yearBtnDisabled: {
      opacity: 0.35,
    },
    yearBtnText: {
      fontSize: scale(18),
      color: colors.accent,
      fontWeight: "700",
    },
    yearLabel: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
    },
    inputLabel: {
      fontSize: scale(12),
      color: colors.textDim,
      fontWeight: "500",
      marginTop: 4,
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.gapSm,
    },
    rowTitle: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
    },
    rowStatus: {
      fontSize: scale(12),
      fontWeight: "600",
    },
    breakRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 2,
    },
    breakLabel: {
      fontSize: scale(13),
      color: colors.textDim,
    },
    breakValue: {
      fontSize: scale(13),
      color: colors.text,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.cardBorder,
      overflow: "hidden",
      marginTop: 4,
    },
    fill: {
      height: "100%",
      borderRadius: 3,
    },
    primaryButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusSm + 2,
      paddingHorizontal: tokens.pad,
      paddingVertical: tokens.padSm,
      marginTop: 4,
    },
    primaryButtonText: {
      color: colors.accentButtonText,
      fontWeight: "700",
      fontSize: scale(13),
    },
    secondaryButton: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm + 2,
      paddingHorizontal: tokens.pad,
      paddingVertical: tokens.padSm,
      marginTop: 4,
    },
    secondaryButtonText: {
      color: colors.textDim,
      fontWeight: "600",
      fontSize: scale(13),
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    errorText: {
      fontSize: scale(12),
      color: colors.danger,
    },
  });
};

export default React.memo(QuarterlyTaxCard);
