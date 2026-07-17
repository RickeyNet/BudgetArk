/**
 * BudgetArk - Month/Year Picker
 * File: src/components/MonthYearPicker.tsx
 *
 * The fade-in month-grid picker that Add/EditBudgetEntryModal and
 * AddDebtModal each carried a private copy of (~150 lines apiece of JSX +
 * styles). Two behaviors live here once:
 *
 * - immediate (default): tapping a month commits and closes - the budget
 *   entry modals' "MONTH" field.
 * - confirm: tapping highlights a tentative month; "Done" commits - the
 *   debt payoff-goal flow, where cancelling must leave the saved goal
 *   untouched.
 *
 * The picker owns its year/tentative-month state, seeded from `value` on
 * each closed -> open edge, so callers no longer track pickerYear at all.
 */

import React, { useCallback, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { MONTH_LABELS } from "../utils/dateFormat";
import { useValueChanged } from "../hooks/useValueChanged";

interface MonthYearPickerProps {
  visible: boolean;
  /** Committed "YYYY-MM" (or "" when nothing is set) - seeds the picker. */
  value: string;
  /** Receives the chosen "YYYY-MM"; the picker closes itself via onClose. */
  onSelect: (yearMonth: string) => void;
  onClose: () => void;
  /** Tentative-select + Done/Cancel (debt goal) instead of tap-to-commit. */
  confirm?: boolean;
  /** Card title - only rendered when provided (debt goal flow). */
  title?: string;
  /** Floor for the year stepper's decrement (debt goals can't be past). */
  minYear?: number;
}

/** Parse the year out of "YYYY-MM", falling back to the current year. */
const seedYear = (value: string): number => {
  const parsed = Number(value.split("-")[0]);
  // Number("") === 0 (not NaN), so an unset value would otherwise seed the
  // picker at year 0 - making the steppers look like a day-of-month counter.
  return Number.isInteger(parsed) && parsed >= 1900
    ? parsed
    : new Date().getFullYear();
};

/** Parse the month index out of "YYYY-MM"; null when unset/invalid. */
const seedMonth = (value: string): number | null => {
  const parsed = Number(value.split("-")[1]);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12
    ? parsed - 1
    : null;
};

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  visible,
  value,
  onSelect,
  onClose,
  confirm = false,
  title,
  minYear,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [pickerYear, setPickerYear] = useState(() => seedYear(value));
  // Confirm mode's highlighted-but-not-committed month; null = none yet.
  const [pickerMonth, setPickerMonth] = useState<number | null>(() =>
    seedMonth(value)
  );

  // Re-seed from the committed value on every closed -> open edge (render-
  // time adjustment, see useValueChanged) so stale year/month from a
  // cancelled session never leaks into the next open.
  if (useValueChanged(visible) && visible) {
    setPickerYear(seedYear(value));
    setPickerMonth(seedMonth(value));
  }

  const decrementYear = useCallback(() => {
    setPickerYear((y) => (minYear !== undefined ? Math.max(minYear, y - 1) : y - 1));
  }, [minYear]);

  const commitMonth = useCallback(
    (monthIndex: number) => {
      const month = String(monthIndex + 1).padStart(2, "0");
      onSelect(`${pickerYear}-${month}`);
      onClose();
    },
    [onClose, onSelect, pickerYear]
  );

  const handleMonthPress = useCallback(
    (monthIndex: number) => {
      if (confirm) {
        setPickerMonth(monthIndex);
      } else {
        commitMonth(monthIndex);
      }
    },
    [commitMonth, confirm]
  );

  const handleDone = useCallback(() => {
    if (pickerMonth === null) return;
    commitMonth(pickerMonth);
  }, [commitMonth, pickerMonth]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerCard}>
          {title ? <Text style={styles.pickerTitle}>{title}</Text> : null}

          {confirm ? (
            /* Year stepper with caption - arrows change the YEAR only */
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                style={styles.pickerYearBtn}
                onPress={decrementYear}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.pickerArrowConfirm}>‹</Text>
              </TouchableOpacity>
              <View style={styles.pickerYearCenter}>
                <Text style={styles.pickerYearCaption}>YEAR</Text>
                <Text style={styles.pickerYear}>{pickerYear}</Text>
              </View>
              <TouchableOpacity
                style={styles.pickerYearBtn}
                onPress={() => setPickerYear((y) => y + 1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.pickerArrowConfirm}>›</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={decrementYear}>
                <Text style={styles.pickerArrow}>←</Text>
              </TouchableOpacity>
              <Text style={styles.pickerYear}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear((y) => y + 1)}>
                <Text style={styles.pickerArrow}>→</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.monthGrid}>
            {MONTH_LABELS.map((label, index) => {
              const monthValue = String(index + 1).padStart(2, "0");
              const isSelected = confirm
                ? pickerMonth === index
                : value === `${pickerYear}-${monthValue}`;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.monthBtn, isSelected && styles.monthBtnActive]}
                  onPress={() => handleMonthPress(index)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${label} ${pickerYear}`}
                >
                  <Text
                    style={[
                      styles.monthBtnText,
                      isSelected && styles.monthBtnTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {confirm ? (
            <>
              <Text style={styles.pickerSelection}>
                {pickerMonth !== null
                  ? `Selected: ${MONTH_LABELS[pickerMonth]} ${pickerYear}`
                  : "Tap a month to set your goal"}
              </Text>
              <View style={styles.pickerActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.doneButton,
                    pickerMonth === null && styles.doneButtonDisabled,
                  ]}
                  onPress={handleDone}
                  disabled={pickerMonth === null}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default MonthYearPicker;

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    pickerCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    pickerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    pickerYearBtn: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
    },
    pickerYearCenter: {
      alignItems: "center",
    },
    pickerYearCaption: {
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 1,
      color: colors.textMuted,
    },
    pickerArrow: {
      fontSize: 20,
      color: colors.text,
      fontWeight: "700",
      paddingHorizontal: 8,
    },
    pickerArrowConfirm: {
      fontSize: 22,
      color: colors.text,
      fontWeight: "700",
    },
    pickerYear: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    monthBtn: {
      width: "22%",
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    monthBtnActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    monthBtnText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "600",
    },
    monthBtnTextActive: {
      color: colors.accent,
    },
    pickerSelection: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textDim,
      textAlign: "center",
    },
    pickerActions: {
      flexDirection: "row",
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    cancelText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },
    doneButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    doneButtonDisabled: {
      opacity: 0.4,
    },
    doneButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
  });
