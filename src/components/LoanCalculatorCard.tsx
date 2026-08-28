/**
 * BudgetArk - Loan / Mortgage Calculator Card
 * File: src/components/LoanCalculatorCard.tsx
 *
 * The Charts-tab loan tool: amount / APR / term sliders with tap-to-type,
 * monthly payment, principal-vs-interest breakdown, the first-five-years
 * interest highlight, a yearly summary and a paged amortization schedule
 * with CSV export (shared, then deleted). Self-contained - it owns its
 * open/closed state and all inputs - which is why it could leave
 * ChartsScreen (formerly several hundred of that file's lines). Layout comes from
 * theme/toolStyles + SliderRow; only the schedule table styles live here.
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useToolStyles } from "../theme/toolStyles";
import { useCurrency } from "../currency/CurrencyProvider";
import SliderRow from "./SliderRow";
import { File as ExpoFile, Paths } from "expo-file-system";
import { shareLocalFileThenDelete } from "../utils/shareTempFile";
import { calcPaymentForGoalDate, generatePayoffSchedule } from "../utils/calculations";
import {
  buildLoanScheduleCsv,
  buildLoanScheduleFilename,
  buildLoanYearlySummary,
  summarizeLoanCosts,
} from "../utils/chartCalculators";
import type { LoanScheduleRow } from "../utils/chartCalculators";
import { useSliderValueEditor } from "../hooks/useSliderValueEditor";
import { useValueChanged } from "../hooks/useValueChanged";

type SliderConfig = {
  label: string;
  min: number;
  max: number;
  step: number;
};

/* ── Loan Calculator Config ── */

const LOAN_SLIDERS: Record<"loanAmount" | "loanRate" | "loanTerm", SliderConfig> = {
  loanAmount: { label: "Loan Amount", min: 1000, max: 1000000, step: 1000 },
  loanRate: { label: "Interest Rate (APR)", min: 0.5, max: 30, step: 0.25 },
  loanTerm: { label: "Loan Term", min: 1, max: 30, step: 1 },
};

const LOAN_TERM_PRESETS = [15, 20, 30] as const;
const LOAN_SCHEDULE_PAGE_SIZE = 12;


const LoanCalculatorCard: React.FC = () => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const tool = useToolStyles();

  /* Loan calculator state */
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState(300000);
  const [loanRate, setLoanRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const loanEditor = useSliderValueEditor({
    loanAmount: { ...LOAN_SLIDERS.loanAmount, set: setLoanAmount, commitMode: "round-int" },
    loanRate: {
      ...LOAN_SLIDERS.loanRate,
      set: setLoanRate,
      decimal: true,
      commitMode: "snap-step-2dp",
    },
    loanTerm: { ...LOAN_SLIDERS.loanTerm, set: setLoanTerm, commitMode: "round-int" },
  });
  const [loanYearlySummaryOpen, setLoanYearlySummaryOpen] = useState(true);
  const [loanScheduleVisibleRows, setLoanScheduleVisibleRows] = useState(LOAN_SCHEDULE_PAGE_SIZE);
  const [isLoanExporting, setIsLoanExporting] = useState(false);
  const [loanExportMessage, setLoanExportMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  /* ── Loan calculator logic ── */

  const toggleLoan = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoanOpen((prev) => !prev);
  }, []);

  const loanMonthlyPayment = useMemo(
    () => calcPaymentForGoalDate(loanAmount, loanRate, loanTerm * 12),
    [loanAmount, loanRate, loanTerm]
  );
  const loanSchedule = useMemo<LoanScheduleRow[]>(
    () =>
      isFinite(loanMonthlyPayment)
        ? generatePayoffSchedule(loanAmount, loanRate, loanMonthlyPayment)
        : [],
    [loanAmount, loanMonthlyPayment, loanRate]
  );
  const loanYearlySummary = useMemo(
    () => buildLoanYearlySummary(loanSchedule),
    [loanSchedule]
  );
  const {
    totalPaid: loanTotalPaid,
    totalInterest: loanTotalInterest,
    interestFirstFiveYears: loanInterestFirstFiveYears,
    principalFirstFiveYears: loanPrincipalFirstFiveYears,
    interestFirstFiveYearsShare: loanInterestFirstFiveYearsShare,
  } = useMemo(() => summarizeLoanCosts(loanSchedule), [loanSchedule]);
  const visibleLoanSchedule = useMemo(
    () => loanSchedule.slice(0, loanScheduleVisibleRows),
    [loanSchedule, loanScheduleVisibleRows]
  );
  const hasMoreLoanScheduleRows = loanScheduleVisibleRows < loanSchedule.length;
  const canCollapseLoanSchedule = loanSchedule.length > LOAN_SCHEDULE_PAGE_SIZE;

  // Any change to the loan inputs collapses the schedule pagination and
  // clears the stale export blurb. Render-time adjustment (see
  // useValueChanged) so the reset lands in the same pass instead of
  // rendering the full stale schedule first.
  if (useValueChanged(`${loanAmount}|${loanRate}|${loanTerm}`)) {
    setLoanScheduleVisibleRows(LOAN_SCHEDULE_PAGE_SIZE);
    setLoanExportMessage(null);
  }

  const renderLoanSlider = (key: "loanAmount" | "loanRate" | "loanTerm", value: number) => {
    const cfg = LOAN_SLIDERS[key];
    const displayValue =
      key === "loanAmount"
        ? formatCurrency(value)
        : key === "loanRate"
          ? `${value}%`
          : `${value} yr`;

    return (
      <SliderRow
        key={key}
        label={cfg.label}
        value={value}
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        displayValue={displayValue}
        onValueChange={(val) => loanEditor.setValue(key, val)}
        onAdjust={(delta) => loanEditor.adjustBy(key, delta)}
        editor={{
          active: loanEditor.editingKey === key,
          text: loanEditor.editingText,
          decimal: key === "loanRate",
          onBegin: () => loanEditor.beginEditing(key, value),
          onChangeText: (text) => loanEditor.changeEditingText(key, text),
          onCommit: () => loanEditor.commitEditing(key),
        }}
      />
    );
  };

  const handleShowMoreLoanSchedule = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoanScheduleVisibleRows((prev) => Math.min(prev + LOAN_SCHEDULE_PAGE_SIZE, loanSchedule.length));
  }, [loanSchedule.length]);

  const handleShowLessLoanSchedule = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoanScheduleVisibleRows(LOAN_SCHEDULE_PAGE_SIZE);
  }, []);

  const toggleLoanYearlySummary = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoanYearlySummaryOpen((prev) => !prev);
  }, []);

  const handleExportLoanSchedule = useCallback(async () => {
    if (loanSchedule.length === 0 || isLoanExporting) return;

    try {
      setIsLoanExporting(true);
      setLoanExportMessage(null);

      const fileDir = Platform.OS === "ios" ? Paths.document : Paths.cache;
      const file = new ExpoFile(fileDir, buildLoanScheduleFilename());
      file.create({ overwrite: true });
      file.write(buildLoanScheduleCsv(loanSchedule), { encoding: "utf8" });

      // Deleted once the share sheet closes - no export file lingers on disk.
      await shareLocalFileThenDelete(file, {
        mimeType: "text/csv",
        dialogTitle: "Export Amortization Schedule",
        UTI: "public.comma-separated-values-text",
      });

      setLoanExportMessage({
        type: "success",
        text: "CSV export opened. Save or share it from the sheet.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Loan schedule export failed.";
      setLoanExportMessage({ type: "error", text: message });
    } finally {
      setIsLoanExporting(false);
    }
  }, [isLoanExporting, loanSchedule]);


  return (
    <>
        {/* ── Loan / Mortgage Calculator Tool ── */}
        <TouchableOpacity style={tool.toolHeader} onPress={toggleLoan} activeOpacity={0.7}>
          <View>
            <Text style={tool.toolTitle}>Loan / Mortgage Calculator</Text>
            <Text style={tool.toolHint}>See your monthly payment and total interest</Text>
          </View>
          <Text style={tool.toolChevron}>{loanOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {loanOpen && (
          <View style={tool.toolBody}>
            {/* Result */}
            <View style={tool.resultCard}>
              <Text style={tool.resultLabel}>MONTHLY PAYMENT</Text>
              <Text style={tool.resultValue}>
                {isFinite(loanMonthlyPayment) ? formatCurrency(loanMonthlyPayment) : "--"}
              </Text>
              <Text style={tool.resultSub}>
                {formatCurrency(loanAmount)} loan · {loanRate}% APR · {loanTerm} years
              </Text>
            </View>

            {/* Sliders */}
            <View style={tool.slidersCard}>
              {renderLoanSlider("loanAmount", loanAmount)}
              {renderLoanSlider("loanRate", loanRate)}
              {renderLoanSlider("loanTerm", loanTerm)}

              <View style={tool.presetRow}>
                {LOAN_TERM_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[tool.presetBtn, loanTerm === preset && tool.presetBtnActive]}
                    onPress={() => setLoanTerm(preset)}
                  >
                    <Text style={[tool.presetBtnText, loanTerm === preset && tool.presetBtnTextActive]}>
                      {preset}yr
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Breakdown */}
            <View style={tool.breakdownCard}>
              <Text style={tool.breakdownTitle}>Cost Breakdown</Text>
              <View style={tool.breakdownRow}>
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.success }]}>
                    {formatCurrency(loanAmount)}
                  </Text>
                  <Text style={tool.breakdownLabel}>Principal</Text>
                </View>
                <View style={tool.breakdownDivider} />
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.danger }]}>
                    {formatCurrency(loanTotalInterest)}
                  </Text>
                  <Text style={tool.breakdownLabel}>Total Interest</Text>
                </View>
              </View>
              {loanTotalPaid > 0 && (
                <View style={tool.ratioBar}>
                  <View
                    style={[
                      tool.ratioFillContrib,
                      { width: `${(loanAmount / loanTotalPaid) * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      tool.ratioFillInterest,
                      { width: `${(loanTotalInterest / loanTotalPaid) * 100}%`, backgroundColor: colors.danger },
                    ]}
                  />
                </View>
              )}
              {loanTotalPaid > 0 && (
                <Text style={tool.ratioText}>
                  You'll pay {formatCurrency(loanTotalPaid)} total over {loanTerm} years
                </Text>
              )}
            </View>

            {/* First-5-years highlight */}
            <View style={styles.loanHighlightCard}>
              <Text style={tool.resultLabel}>INTEREST IN FIRST 5 YEARS</Text>
              <Text style={[styles.loanHighlightValue, { color: colors.danger }]}>
                {formatCurrency(loanInterestFirstFiveYears)}
              </Text>
              <Text style={styles.loanHighlightText}>
                {loanSchedule.length >= 60
                  ? `${(loanInterestFirstFiveYearsShare * 100).toFixed(0)}% of your total interest is paid in the first 60 months.`
                  : "This loan ends before year 5, so this reflects the full-term interest cost."}
              </Text>
              <Text style={styles.loanHighlightSubtext}>
                Principal paid in that span: {formatCurrency(loanPrincipalFirstFiveYears)}
              </Text>
            </View>

            {/* Yearly summary */}
            <View style={styles.scheduleCard}>
              <TouchableOpacity
                style={styles.scheduleHeader}
                onPress={toggleLoanYearlySummary}
                activeOpacity={0.7}
              >
                <View style={styles.scheduleHeaderTextWrap}>
                  <Text style={tool.breakdownTitle}>Yearly Summary</Text>
                  <Text style={styles.scheduleHint}>
                    Groups every 12 payments from the loan start. Final year may be shorter.
                  </Text>
                </View>
                <View style={styles.scheduleHeaderActions}>
                  <Text style={styles.scheduleMeta}>{loanYearlySummary.length} yr</Text>
                  <Text style={styles.scheduleChevron}>{loanYearlySummaryOpen ? "▾" : "›"}</Text>
                </View>
              </TouchableOpacity>

              {loanYearlySummaryOpen && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.scheduleTable}>
                    <View style={[styles.scheduleRow, styles.scheduleHeaderRow]}>
                      <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleMonthCell]}>
                        Year
                      </Text>
                      <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                        Payments
                      </Text>
                      <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                        Principal
                      </Text>
                      <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                        Interest
                      </Text>
                      <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleBalanceCell]}>
                        End Balance
                      </Text>
                    </View>

                    {loanYearlySummary.map((row, index) => {
                      const isLastRow = index === loanYearlySummary.length - 1;
                      return (
                        <View key={row.year} style={[styles.scheduleRow, isLastRow && styles.scheduleRowLast]}>
                          <Text style={[styles.scheduleCell, styles.scheduleMonthCell]}>{row.year}</Text>
                          <Text style={[styles.scheduleCell, styles.scheduleValueCell]}>
                            {formatCurrency(row.payment)}
                          </Text>
                          <Text style={[styles.scheduleCell, styles.scheduleValueCell, { color: colors.success }]}>
                            {formatCurrency(row.principal)}
                          </Text>
                          <Text style={[styles.scheduleCell, styles.scheduleValueCell, { color: colors.danger }]}>
                            {formatCurrency(row.interest)}
                          </Text>
                          <Text style={[styles.scheduleCell, styles.scheduleBalanceCell]}>
                            {formatCurrency(row.endingBalance)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Amortization schedule */}
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <View style={styles.scheduleHeaderTextWrap}>
                  <Text style={tool.breakdownTitle}>Amortization Schedule</Text>
                  <Text style={styles.scheduleHint}>
                    Month-by-month payment, principal, interest, and remaining balance.
                  </Text>
                </View>
                <Text style={styles.scheduleMeta}>{loanSchedule.length} mo</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.scheduleTable}>
                  <View style={[styles.scheduleRow, styles.scheduleHeaderRow]}>
                    <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleMonthCell]}>
                      Month
                    </Text>
                    <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                      Payment
                    </Text>
                    <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                      Principal
                    </Text>
                    <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                      Interest
                    </Text>
                    <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleBalanceCell]}>
                      Balance
                    </Text>
                  </View>

                  {visibleLoanSchedule.map((row, index) => {
                    const payment = row.principalPaid + row.interestPaid;
                    const isLastVisibleRow = index === visibleLoanSchedule.length - 1;
                    return (
                      <View
                        key={row.month}
                        style={[styles.scheduleRow, isLastVisibleRow && styles.scheduleRowLast]}
                      >
                        <Text style={[styles.scheduleCell, styles.scheduleMonthCell]}>{row.month}</Text>
                        <Text style={[styles.scheduleCell, styles.scheduleValueCell]}>
                          {formatCurrency(payment)}
                        </Text>
                        <Text style={[styles.scheduleCell, styles.scheduleValueCell, { color: colors.success }]}>
                          {formatCurrency(row.principalPaid)}
                        </Text>
                        <Text style={[styles.scheduleCell, styles.scheduleValueCell, { color: colors.danger }]}>
                          {formatCurrency(row.interestPaid)}
                        </Text>
                        <Text style={[styles.scheduleCell, styles.scheduleBalanceCell]}>
                          {formatCurrency(row.balance)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.scheduleFooter}>
                <Text style={styles.scheduleFooterText}>
                  Showing {visibleLoanSchedule.length} of {loanSchedule.length} months
                </Text>
                <View style={styles.scheduleActions}>
                  <TouchableOpacity
                    style={styles.scheduleMoreBtn}
                    onPress={handleExportLoanSchedule}
                    disabled={isLoanExporting || loanSchedule.length === 0}
                  >
                    <Text style={styles.scheduleMoreBtnText}>
                      {isLoanExporting ? "Preparing CSV..." : "Export CSV"}
                    </Text>
                  </TouchableOpacity>
                  {hasMoreLoanScheduleRows ? (
                    <TouchableOpacity style={styles.scheduleMoreBtn} onPress={handleShowMoreLoanSchedule}>
                      <Text style={styles.scheduleMoreBtnText}>
                        Show {Math.min(LOAN_SCHEDULE_PAGE_SIZE, loanSchedule.length - loanScheduleVisibleRows)} more
                      </Text>
                    </TouchableOpacity>
                  ) : canCollapseLoanSchedule ? (
                    <TouchableOpacity style={styles.scheduleMoreBtn} onPress={handleShowLessLoanSchedule}>
                      <Text style={styles.scheduleMoreBtnText}>Show less</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              {loanExportMessage && (
                <Text
                  style={[
                    styles.scheduleStatus,
                    { color: loanExportMessage.type === "error" ? colors.danger : colors.success },
                  ]}
                >
                  {loanExportMessage.text}
                </Text>
              )}
            </View>
          </View>
        )}

    </>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    loanHighlightCard: {
      backgroundColor: `${colors.danger}12`,
      borderWidth: 1,
      borderColor: `${colors.danger}35`,
      borderRadius: 16,
      padding: 18,
      alignItems: "center",
      gap: 6,
    },
    loanHighlightValue: {
      fontSize: scale(28),
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      textAlign: "center",
    },
    loanHighlightText: {
      fontSize: 13,
      color: colors.textDim,
      lineHeight: 18,
      textAlign: "center",
    },
    loanHighlightSubtext: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
    },
    scheduleCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 18,
      gap: 12,
    },
    scheduleHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    scheduleHeaderTextWrap: {
      flex: 1,
    },
    scheduleHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 2,
    },
    scheduleHint: {
      fontSize: 12,
      color: colors.textDim,
      lineHeight: 17,
      marginTop: -6,
    },
    scheduleMeta: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      marginTop: 2,
    },
    scheduleChevron: {
      fontSize: 16,
      color: colors.textDim,
      fontWeight: "700",
      lineHeight: 18,
    },
    scheduleTable: {
      minWidth: 560,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      overflow: "hidden",
    },
    scheduleRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    scheduleHeaderRow: {
      backgroundColor: colors.bg,
    },
    scheduleRowLast: {
      borderBottomWidth: 0,
    },
    scheduleCell: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 12,
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    scheduleHeaderCell: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    scheduleMonthCell: {
      width: 64,
    },
    scheduleValueCell: {
      width: 120,
      textAlign: "right",
    },
    scheduleBalanceCell: {
      width: 136,
      textAlign: "right",
    },
    scheduleFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    scheduleFooterText: {
      fontSize: 12,
      color: colors.textDim,
    },
    scheduleActions: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },
    scheduleMoreBtn: {
      borderWidth: 1,
      borderColor: `${colors.accent}40`,
      backgroundColor: `${colors.accent}12`,
      borderRadius: tokens.radiusPill,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    scheduleMoreBtnText: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: "700",
    },
    scheduleStatus: {
      fontSize: 12,
      lineHeight: 17,
    },
  });
};

export default React.memo(LoanCalculatorCard);
