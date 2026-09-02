/**
 * BudgetArk - Paycheck Cycle Card
 * File: src/components/PaycheckCycleCard.tsx
 *
 * Budget-tab "Until payday" card: the month sliced into pay periods. Once
 * the user tells it their schedule (weekly / every two weeks anchored on a
 * recent payday, twice a month, or monthly - device-local, see
 * storage/paycheckCycleStorage) it shows the next payday, everything still
 * due before it (unpaid bills + unpaid debt minimums from the same
 * calendars the reminder banners use), and - when the month-start
 * checking balance is recorded - what is safe to spend until then and per
 * day. Rendered by the screen for the current month only; the screen
 * supplies the entries / debts / payments it already holds so this card
 * and the Cash Flow card can never disagree about the ledger. The setup
 * form is inline (no Modal) so it can never hit the iOS silent-present
 * failure this codebase keeps meeting.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type { BudgetEntry, Debt, Payment } from "../types";
import {
  buildPaycheckPeriodView,
  formatPaydayLabel,
  LAST_DAY,
  PAY_FREQUENCIES,
  PAY_FREQUENCY_LABELS,
  SEMIMONTHLY_PRESETS,
  toLocalDateKey,
  type PaycheckCycleSettings,
  type PayFrequency,
} from "../utils/paycheckCycle";
import {
  getPaycheckCycleSettings,
  savePaycheckCycleSettings,
} from "../storage/paycheckCycleStorage";
import { triggerHaptic } from "../utils/haptics";
import { describeError } from "../utils/errorMessage";

interface PaycheckCycleCardProps {
  entries: BudgetEntry[];
  debts: Debt[];
  payments: Payment[];
  /** The current month's recorded starting balance, or null. */
  startingBalance: number | null;
  onSetBalance: () => void;
}

/** How many of the most recent days the anchor picker offers (two full weeks). */
const ANCHOR_DAYS = 14;

/** Day-of-month choices for a monthly schedule; 31 stands for "last day". */
const MONTHLY_DAYS = [1, 5, 10, 15, 20, 25, LAST_DAY];

const MAX_DUE_ROWS = 6;

const PaycheckCycleCard: React.FC<PaycheckCycleCardProps> = ({
  entries,
  debts,
  payments,
  startingBalance,
  onSetBalance,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [settings, setSettings] = useState<PaycheckCycleSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAllDue, setShowAllDue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Draft schedule while editing */
  const [draftFrequency, setDraftFrequency] = useState<PayFrequency>("biweekly");
  const [draftAnchor, setDraftAnchor] = useState<string | null>(null);
  const [draftPreset, setDraftPreset] = useState<string>(SEMIMONTHLY_PRESETS[0].id);
  const [draftMonthlyDay, setDraftMonthlyDay] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;
    void getPaycheckCycleSettings()
      .then((stored) => {
        if (cancelled) return;
        setSettings(stored);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useMemo(
    () =>
      settings
        ? buildPaycheckPeriodView({ settings, entries, debts, payments, startingBalance })
        : null,
    [settings, entries, debts, payments, startingBalance]
  );

  const anchorChoices = useMemo(() => {
    const today = new Date();
    const out: { key: string; label: string }[] = [];
    for (let back = 0; back < ANCHOR_DAYS; back++) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
      out.push({ key: toLocalDateKey(day), label: formatPaydayLabel(day) });
    }
    return out;
  }, []);

  const beginEdit = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setError(null);
    if (settings) {
      setDraftFrequency(settings.frequency);
      setDraftAnchor(settings.anchorDate ?? null);
      if (settings.frequency === "semimonthly" && settings.payDays) {
        const match = SEMIMONTHLY_PRESETS.find(
          (preset) => preset.days[0] === settings.payDays?.[0] && preset.days[1] === settings.payDays?.[1]
        );
        setDraftPreset(match?.id ?? SEMIMONTHLY_PRESETS[0].id);
      }
      if (settings.frequency === "monthly" && settings.payDays?.[0]) {
        setDraftMonthlyDay(settings.payDays[0]);
      }
    }
    setEditing(true);
  }, [settings]);

  const cancelEdit = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditing(false);
  }, []);

  const draftComplete =
    draftFrequency === "weekly" || draftFrequency === "biweekly" ? draftAnchor !== null : true;

  const handleSave = useCallback(async () => {
    const next: PaycheckCycleSettings =
      draftFrequency === "weekly" || draftFrequency === "biweekly"
        ? { frequency: draftFrequency, anchorDate: draftAnchor ?? undefined }
        : draftFrequency === "semimonthly"
          ? {
              frequency: "semimonthly",
              payDays: [
                ...(SEMIMONTHLY_PRESETS.find((p) => p.id === draftPreset) ?? SEMIMONTHLY_PRESETS[0]).days,
              ],
            }
          : { frequency: "monthly", payDays: [draftMonthlyDay] };
    try {
      const saved = await savePaycheckCycleSettings(next);
      if (!saved) {
        setError("Pick a recent payday first.");
        return;
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSettings(saved);
      setEditing(false);
      setError(null);
      triggerHaptic("success");
    } catch (err) {
      triggerHaptic("error");
      setError(describeError(err, "Couldn't save your pay schedule."));
    }
  }, [draftAnchor, draftFrequency, draftMonthlyDay, draftPreset]);

  if (!loaded) return null;

  const renderSetup = () => (
    <View style={styles.setupWrap}>
      <Text style={styles.fieldLabel}>How often are you paid?</Text>
      <View style={styles.chipWrap}>
        {PAY_FREQUENCIES.map((frequency) => {
          const active = draftFrequency === frequency;
          return (
            <TouchableOpacity
              key={frequency}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setDraftFrequency(frequency)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {PAY_FREQUENCY_LABELS[frequency]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {draftFrequency === "weekly" || draftFrequency === "biweekly" ? (
        <>
          <Text style={styles.fieldLabel}>Your most recent payday</Text>
          <View style={styles.chipWrap}>
            {anchorChoices.map((choice) => {
              const active = draftAnchor === choice.key;
              return (
                <TouchableOpacity
                  key={choice.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDraftAnchor(choice.key)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{choice.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : draftFrequency === "semimonthly" ? (
        <>
          <Text style={styles.fieldLabel}>Paydays</Text>
          <View style={styles.chipWrap}>
            {SEMIMONTHLY_PRESETS.map((preset) => {
              const active = draftPreset === preset.id;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDraftPreset(preset.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{preset.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Payday</Text>
          <View style={styles.chipWrap}>
            {MONTHLY_DAYS.map((day) => {
              const active = draftMonthlyDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDraftMonthlyDay(day)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {day === LAST_DAY ? "Last day" : `${day}${ordinal(day)}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryBtn, !draftComplete && styles.btnDisabled]}
          onPress={() => void handleSave()}
          disabled={!draftComplete}
          accessibilityRole="button"
        >
          <Text style={styles.primaryBtnText}>Save schedule</Text>
        </TouchableOpacity>
        {settings ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={cancelEdit} accessibilityRole="button">
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.hint}>Stays on this phone. Only used to slice your budget into pay periods.</Text>
    </View>
  );

  if (!settings || editing) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Until Payday</Text>
        {!editing ? (
          <>
            <Text style={styles.emptyText}>
              Tell BudgetArk when you get paid and it will show what is due before your next
              check - and what is safe to spend until then.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={beginEdit} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>Set up pay periods</Text>
            </TouchableOpacity>
          </>
        ) : (
          renderSetup()
        )}
      </View>
    );
  }

  if (!view) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Until Payday</Text>
          <TouchableOpacity onPress={beginEdit} accessibilityRole="button">
            <Text style={styles.updateLink}>Change</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.emptyText}>Your pay schedule couldn&apos;t produce a next payday - check it.</Text>
      </View>
    );
  }

  const dueRows = showAllDue ? view.due : view.due.slice(0, MAX_DUE_ROWS);
  const hiddenDue = view.due.length - dueRows.length;
  const safe = view.safeToSpend;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Until Payday</Text>
        <TouchableOpacity onPress={beginEdit} accessibilityRole="button">
          <Text style={styles.updateLink}>Change</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.periodLine}>
        Next check {formatPaydayLabel(view.period.nextPayday)} ·{" "}
        {view.period.daysUntilNext === 1 ? "tomorrow" : `in ${view.period.daysUntilNext} days`}
      </Text>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Due before then</Text>
        <Text style={styles.rowValue}>{formatCurrency(view.dueTotal)}</Text>
      </View>
      {dueRows.length === 0 ? (
        <Text style={styles.hint}>Nothing on the calendar before your next check.</Text>
      ) : (
        dueRows.map((item) => (
          <View key={item.id} style={styles.dueRow}>
            <Text style={styles.dueLabel} numberOfLines={1}>
              {item.kind === "debt" ? "💳 " : "📅 "}
              {item.label}
            </Text>
            <Text style={styles.dueMeta}>
              {item.daysUntil === 0 ? "today" : formatPaydayLabel(item.date)}
            </Text>
            <Text style={styles.dueAmount}>{formatCurrency(item.amount)}</Text>
          </View>
        ))
      )}
      {hiddenDue > 0 || showAllDue ? (
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowAllDue((prev) => !prev);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.updateLink}>{showAllDue ? "Show fewer" : `+${hiddenDue} more`}</Text>
        </TouchableOpacity>
      ) : null}

      {safe !== null && view.cashNow !== null && view.perDay !== null ? (
        <>
          <View style={[styles.row, styles.safeRow]}>
            <Text style={styles.safeLabel}>{safe >= 0 ? "Safe to spend until payday" : "Short before payday by"}</Text>
            <Text style={[styles.safeValue, { color: safe >= 0 ? colors.success : colors.danger }]}>
              {formatCurrency(Math.abs(safe))}
            </Text>
          </View>
          <Text style={styles.hint}>
            {safe >= 0
              ? `About ${formatCurrency(Math.max(0, view.perDay))} a day. `
              : ""}
            Cash now ≈ {formatCurrency(view.cashNow)}: your starting balance plus what the ledger
            says has landed so far this month.
          </Text>
        </>
      ) : (
        <TouchableOpacity onPress={onSetBalance} style={styles.safeRow} accessibilityRole="button">
          <Text style={styles.hint}>
            Record this month&apos;s starting checking balance and this card will also say what is
            safe to spend until payday. <Text style={styles.updateLink}>Set it</Text>
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const ordinal = (day: number): string => {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gap,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 2,
    },
    title: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
    },
    updateLink: {
      fontSize: scale(13),
      fontWeight: "600",
      color: colors.accent,
    },
    periodLine: {
      fontSize: scale(13),
      color: colors.textDim,
      marginBottom: tokens.gapSm,
    },
    emptyText: {
      fontSize: scale(13),
      lineHeight: scale(18),
      color: colors.textMuted,
      marginTop: tokens.gapSm,
      marginBottom: tokens.gap,
    },
    setupWrap: {
      marginTop: tokens.gapSm,
      gap: tokens.gapSm,
    },
    fieldLabel: {
      fontSize: scale(12),
      fontWeight: "600",
      color: colors.textDim,
      marginTop: 4,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      borderRadius: tokens.radiusPill,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    chipText: {
      fontSize: scale(12),
      fontWeight: "600",
      color: colors.textDim,
    },
    chipTextActive: {
      color: colors.accent,
    },
    actionRow: {
      flexDirection: "row",
      gap: tokens.gapSm,
      marginTop: 4,
    },
    primaryBtn: {
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.pad,
      paddingVertical: tokens.padSm,
    },
    primaryBtnText: {
      fontSize: scale(13),
      fontWeight: "700",
      color: colors.accentButtonText,
    },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.pad,
      paddingVertical: tokens.padSm,
    },
    secondaryBtnText: {
      fontSize: scale(13),
      fontWeight: "600",
      color: colors.textDim,
    },
    btnDisabled: {
      opacity: 0.5,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    rowLabel: {
      fontSize: scale(13),
      color: colors.textMuted,
    },
    rowValue: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    dueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.gapSm,
      paddingVertical: 3,
    },
    dueLabel: {
      flex: 1,
      fontSize: scale(13),
      color: colors.text,
    },
    dueMeta: {
      fontSize: scale(11),
      color: colors.textDim,
    },
    dueAmount: {
      fontSize: scale(13),
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
      minWidth: 64,
      textAlign: "right",
    },
    safeRow: {
      marginTop: 4,
      paddingTop: tokens.gapSm,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    safeLabel: {
      fontSize: scale(14),
      fontWeight: "700",
      color: colors.text,
      flexShrink: 1,
    },
    safeValue: {
      fontSize: scale(18),
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    hint: {
      fontSize: scale(11),
      lineHeight: scale(15),
      color: colors.textDim,
      marginTop: 4,
    },
    errorText: {
      fontSize: scale(12),
      color: colors.danger,
    },
  });
};

export default React.memo(PaycheckCycleCard);
