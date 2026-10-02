/**
 * BudgetArk - Month Day Calendar
 * File: src/components/MonthDayCalendar.tsx
 *
 * The one seven-column calendar grid behind every day picker in the app:
 * the entry form's one-off date and recurring day, the debt form's
 * minimum-payment due day, and the Bill Calendar's month view. Four
 * copies of this grid used to live in those files and two of them had
 * drifted into a flex-wrap of percentage-width cells plus a pixel gap,
 * which overflows the row on phone widths, wraps at six, and puts every
 * day one column left of its weekday letter (a user report). Here the
 * weekday header and every week share one row style with seven `flex: 1`
 * children, so a letter and its column of days are measured by the same
 * flex pass and cannot drift apart.
 *
 * Two layouts, both from utils/entryDate so the pure part stays tested:
 * - "date": only the days the month has (picking an actual date).
 * - "dayOfMonth": always 1-31 aligned to the month's weekdays, with the
 *   days a short month lacks dimmed but still pickable, because a
 *   recurring day of 29-31 is valid and clamps to the month's last day.
 *
 * The default cell is a selectable day button (today outlined dashed);
 * `renderDay` swaps in a richer body - the Bill Calendar's dots and totals.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import {
  buildDueDayPickerRows,
  buildMonthDayRows,
  lastDayOfYearMonth,
  localYearMonth,
} from "../utils/entryDate";

/** Sunday-first, matching buildMonthDayRows / buildDueDayPickerRows. */
export const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export interface MonthDayCalendarDayInfo {
  day: number;
  weekday: WeekdayKey;
  /** Translated short weekday name, for accessibility labels. */
  weekdayLabel: string;
  isToday: boolean;
  /** "dayOfMonth" only: this month has no such day (29-31 in a short month). */
  isBeyondMonth: boolean;
}

interface MonthDayCalendarProps {
  /** "YYYY-MM" whose weekday layout the grid follows. */
  yearMonth: string;
  mode?: "date" | "dayOfMonth";
  selectedDay?: number | null;
  onSelectDay?: (day: number) => void;
  /** Space between cells and rows; the Bill Calendar packs tighter. */
  gap?: number;
  /** Cell width / height. 1 is square. */
  cellAspectRatio?: number;
  /**
   * Custom cell body. The wrapper already sizes the cell (flex: 1 in its
   * row, the aspect ratio above); return an element that fills it.
   */
  renderDay?: (info: MonthDayCalendarDayInfo) => React.ReactNode;
}

const MonthDayCalendar: React.FC<MonthDayCalendarProps> = ({
  yearMonth,
  mode = "date",
  selectedDay = null,
  onSelectDay,
  gap = 6,
  cellAspectRatio = 1,
  renderDay,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const rows = useMemo(
    () => (mode === "dayOfMonth" ? buildDueDayPickerRows(yearMonth) : buildMonthDayRows(yearMonth)),
    [mode, yearMonth]
  );
  const monthEnd = lastDayOfYearMonth(yearMonth);
  const now = new Date();
  const todayDay = localYearMonth(now) === yearMonth ? now.getDate() : -1;

  const rowStyle = [styles.weekRow, { gap }];

  return (
    <View style={{ gap }}>
      <View style={rowStyle}>
        {WEEKDAY_KEYS.map((key) => (
          <Text key={key} style={styles.weekLabel}>
            {t(`common.weekdays.${key}`)}
          </Text>
        ))}
      </View>
      {rows.map((week, weekIdx) => (
        <View key={weekIdx} style={rowStyle}>
          {week.map((day, cellIdx) => {
            const cellStyle = [styles.cell, { aspectRatio: cellAspectRatio }];
            if (day == null) return <View key={`blank-${cellIdx}`} style={cellStyle} />;
            const weekday = WEEKDAY_KEYS[cellIdx];
            const info: MonthDayCalendarDayInfo = {
              day,
              weekday,
              weekdayLabel: t(`common.weekdays.${weekday}`),
              isToday: day === todayDay,
              isBeyondMonth: day > monthEnd,
            };
            if (renderDay) {
              return (
                <View key={day} style={cellStyle}>
                  {renderDay(info)}
                </View>
              );
            }
            const selected = selectedDay === day;
            return (
              <View key={day} style={cellStyle}>
                <TouchableOpacity
                  style={[
                    styles.dayBtn,
                    info.isBeyondMonth && styles.dayBtnBeyond,
                    info.isToday && styles.dayBtnToday,
                    selected && styles.dayBtnActive,
                  ]}
                  onPress={onSelectDay ? () => onSelectDay(day) : undefined}
                  disabled={!onSelectDay}
                  accessibilityRole="button"
                  accessibilityLabel={`${info.weekdayLabel} ${day}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.dayBtnText, selected && styles.dayBtnTextActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    weekRow: {
      flexDirection: "row",
    },
    weekLabel: {
      flex: 1,
      textAlign: "center",
      color: colors.textDim,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.3,
    },
    cell: {
      flex: 1,
    },
    dayBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    dayBtnActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    dayBtnToday: {
      borderColor: colors.textDim,
      borderStyle: "dashed",
    },
    /* A day this month doesn't reach (29-31): still a valid recurring day. */
    dayBtnBeyond: {
      opacity: 0.5,
    },
    dayBtnText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "600",
    },
    dayBtnTextActive: {
      color: colors.accent,
    },
  });

export default MonthDayCalendar;
