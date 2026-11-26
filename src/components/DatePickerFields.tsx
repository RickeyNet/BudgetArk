/**
 * BudgetArk - Date Picker Fields
 * File: src/components/DatePickerFields.tsx
 *
 * Form-field wrappers around the app's two existing pickers, so a month
 * or a date in the tenant forms is picked the same way as in the entry
 * form instead of typed as "YYYY-MM" / "YYYY-MM-DD":
 * - MonthPickerField: a tappable field that opens MonthYearPicker.
 * - DayPickerField: a tappable field that expands to that month field
 *   plus MonthDayCalendar - the entry form's MONTH + DAY pair.
 *
 * No picker UI lives here, only the field button and the wiring. The
 * MonthYearPicker is rendered by the field itself, which sits inside the
 * host sheet's Modal - the placement MonthYearPicker requires on iOS.
 *
 * Values stay the plain strings the forms already validate ("YYYY-MM",
 * "YYYY-MM-DD", or "" for an optional month left unset).
 */

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { currentLanguage } from "../i18n/translate";
import { formatMonthKeyLabel, getMonthKey } from "../utils/budgetMonths";
import { lastDayOfYearMonth } from "../utils/entryDate";
import MonthDayCalendar from "./MonthDayCalendar";
import MonthYearPicker from "./MonthYearPicker";

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/;
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

interface MonthPickerFieldProps {
  /** "YYYY-MM", or "" when nothing is chosen. */
  value: string;
  onChange: (monthKey: string) => void;
  /** Shows a Clear link so the month can be left unset. */
  optional?: boolean;
  accessibilityLabel?: string;
}

export const MonthPickerField: React.FC<MonthPickerFieldProps> = ({
  value,
  onChange,
  optional = false,
  accessibilityLabel,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const hasValue = MONTH_KEY_RE.test(value);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.fieldRow}>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={hasValue ? styles.fieldText : styles.fieldPlaceholder}>
          {hasValue ? formatMonthKeyLabel(value) : t("modals.people.tenants.picker.notSet")}
        </Text>
      </TouchableOpacity>
      {optional && hasValue ? (
        <TouchableOpacity
          onPress={() => onChange("")}
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
        >
          <Text style={styles.clear}>{t("modals.people.tenants.picker.clear")}</Text>
        </TouchableOpacity>
      ) : null}
      <MonthYearPicker
        visible={open}
        value={hasValue ? value : ""}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
};

interface DayPickerFieldProps {
  /** "YYYY-MM-DD". */
  value: string;
  onChange: (dateKey: string) => void;
  accessibilityLabel?: string;
}

export const DayPickerField: React.FC<DayPickerFieldProps> = ({
  value,
  onChange,
  accessibilityLabel,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const hasValue = DATE_KEY_RE.test(value);
  const month = hasValue ? value.slice(0, 7) : getMonthKey();
  const day = hasValue ? Number(value.slice(8)) : null;
  const [open, setOpen] = useState(false);

  const label = hasValue
    ? // Local midnight, so the label can't slip a day across time zones.
      new Date(`${value}T00:00:00`).toLocaleDateString(currentLanguage(), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : t("modals.people.tenants.picker.notSet");

  const setDate = (nextMonth: string, nextDay: number) => {
    // A day can't outlive the month it moved to (Jan 31 -> Feb 28).
    const clamped = Math.min(nextDay, lastDayOfYearMonth(nextMonth));
    onChange(`${nextMonth}-${String(clamped).padStart(2, "0")}`);
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
      >
        <Text style={hasValue ? styles.fieldText : styles.fieldPlaceholder}>{label}</Text>
        <Text style={styles.fieldChevron}>{open ? "▴" : "▾"}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={styles.panel}>
          <MonthPickerField value={month} onChange={(next) => setDate(next, day ?? 1)} />
          <MonthDayCalendar
            yearMonth={month}
            mode="date"
            selectedDay={day}
            onSelectDay={(next) => {
              setDate(month, next);
              setOpen(false);
            }}
          />
        </View>
      ) : null}
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    wrap: { gap: tokens.gapSm },
    fieldRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.gap,
    },
    field: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.gap,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.padSm,
      paddingVertical: tokens.padSm,
    },
    fieldText: { flex: 1, color: colors.text, fontSize: scale(15) },
    fieldPlaceholder: { flex: 1, color: colors.textMuted, fontSize: scale(15) },
    fieldChevron: { color: colors.textDim, fontSize: scale(13) },
    panel: { gap: tokens.gapSm + 2 },
    clear: {
      color: colors.danger,
      fontSize: scale(14),
      fontWeight: "600",
    },
  });
};
