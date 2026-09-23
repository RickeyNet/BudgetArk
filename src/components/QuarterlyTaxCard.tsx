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
import { useTranslation } from "react-i18next";
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
import { triggerHaptic } from "../utils/haptics";
import { describeError } from "../utils/errorMessage";
import type { BudgetEntry } from "../types";

interface QuarterlyTaxCardProps {
  /** Live budget entries (the screen's focus load). */
  entries: BudgetEntry[];
}

/** "Apr 15" / "15. Apr." in the app language; falls back to the raw ISO date. */
const formatDay = (iso: string, locale: string): string => {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  try {
    return new Date(parsed).toLocaleDateString(locale, { month: "short", day: "numeric" });
  } catch {
    return new Date(parsed).toLocaleDateString();
  }
};

/** Short month name for a 1-based month number, in the app language. */
const shortMonth = (month: number, locale: string): string => {
  const date = new Date(2026, month - 1, 1);
  try {
    return date.toLocaleDateString(locale, { month: "short" });
  } catch {
    return date.toLocaleDateString(undefined, { month: "short" });
  }
};

const QuarterlyTaxCard: React.FC<QuarterlyTaxCardProps> = ({ entries }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
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
        setError(describeError(err, t("charts.tax.quarterly.updateFailed")));
      } finally {
        setBusyKey(null);
      }
    },
    [busyKey, t]
  );

  const thisYear = new Date().getFullYear();
  const firstYear = useMemo(() => earliestTaxYear(entries), [entries]);
  const statusLabel = (row: QuarterRow): { text: string; color: string } => {
    switch (row.status) {
      case "paid":
        return {
          text: t("charts.tax.quarterly.status.paid", { date: formatDay(row.paid?.paidAt ?? "", locale) }),
          color: colors.success,
        };
      case "overdue":
        return {
          text: t("charts.tax.quarterly.status.overdue", { date: formatDay(row.dueDate.toISOString(), locale) }),
          color: colors.danger,
        };
      case "due-soon":
        return {
          text: t("charts.tax.quarterly.status.due", { date: formatDay(row.dueDate.toISOString(), locale) }),
          color: colors.warning,
        };
      case "upcoming":
        return {
          text: t("charts.tax.quarterly.status.due", { date: formatDay(row.dueDate.toISOString(), locale) }),
          color: colors.textDim,
        };
      default:
        return { text: t("charts.tax.quarterly.status.none"), color: colors.textMuted };
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
        accessibilityLabel={t("charts.tax.quarterly.title")}
      >
        <View>
          <Text style={tool.toolTitle}>{t("charts.tax.quarterly.title")}</Text>
          <Text style={tool.toolHint}>
            {model.hasIncome
              ? t("charts.tax.quarterly.hintWithIncome", {
                  year,
                  setAside: formatCurrency(model.totalSetAside),
                  estimated: formatCurrency(model.totalEstimatedDue),
                })
              : t("charts.tax.quarterly.hintEmpty")}
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
                accessibilityLabel={t("charts.tax.quarterly.prevYear")}
              >
                <Text style={styles.yearBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.yearLabel}>{t("charts.tax.quarterly.taxYear", { year })}</Text>
              <TouchableOpacity
                onPress={() => setYear((y) => Math.min(thisYear, y + 1))}
                style={[styles.yearBtn, year >= thisYear && styles.yearBtnDisabled]}
                disabled={year >= thisYear}
                accessibilityRole="button"
                accessibilityLabel={t("charts.tax.quarterly.nextYear")}
              >
                <Text style={styles.yearBtnText}>›</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>{t("charts.tax.quarterly.filingStatusLabel")}</Text>
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
                    {t(`charts.tax.filingStatus.${opt.value}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {!model.hasIncome ? (
            <View style={tool.efCard}>
              <Text style={tool.refiEmptyText}>{t("charts.tax.quarterly.empty", { year })}</Text>
            </View>
          ) : (
            <>
              <View style={tool.resultCard}>
                <Text style={tool.resultLabel}>{t("charts.tax.quarterly.summary.label", { year })}</Text>
                <Text style={tool.resultValue}>{formatCurrency(model.totalEstimatedDue)}</Text>
                <Text style={tool.resultSub}>
                  {t("charts.tax.quarterly.summary.sub", {
                    income: formatCurrency(model.totalIncome),
                    setAside: formatCurrency(model.totalSetAside),
                  })}
                  {model.reserveGap < -0.5
                    ? t("charts.tax.quarterly.summary.short", {
                        amount: formatCurrency(Math.abs(model.reserveGap)),
                      })
                    : model.reserveGap > 0.5
                      ? t("charts.tax.quarterly.summary.spare", {
                          amount: formatCurrency(model.reserveGap),
                        })
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
                        {t("charts.tax.quarterly.row.title", {
                          quarter: row.quarter.label,
                          from: shortMonth(row.quarter.months[0], locale),
                          to: shortMonth(row.quarter.months[row.quarter.months.length - 1], locale),
                        })}
                      </Text>
                      <Text style={[styles.rowStatus, { color: label.color }]}>{label.text}</Text>
                    </View>
                    <View style={styles.breakRow}>
                      <Text style={styles.breakLabel}>{t("charts.tax.quarterly.row.income")}</Text>
                      <Text style={styles.breakValue}>{formatCurrency(row.income1099)}</Text>
                    </View>
                    <View style={styles.breakRow}>
                      <Text style={styles.breakLabel}>{t("charts.tax.quarterly.row.setAside")}</Text>
                      <Text style={styles.breakValue}>{formatCurrency(row.setAside)}</Text>
                    </View>
                    <View style={styles.breakRow}>
                      <Text style={styles.breakLabel}>{t("charts.tax.quarterly.row.estimated")}</Text>
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
                          {row.paid ? t("charts.tax.quarterly.row.undoPaid") : t("charts.tax.quarterly.row.markPaid")}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}

              <View style={tool.insightCard}>
                <Text style={tool.insightText}>
                  {t("charts.tax.quarterly.disclaimer", { year: TAX_DATA_YEAR })}
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
