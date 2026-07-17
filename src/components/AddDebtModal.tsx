/**
 * BudgetArk - AddDebtModal Component
 * File: src/components/AddDebtModal.tsx
 *
 * A full-screen modal that presents a form for adding a new debt.
 * Collects: debt name, total balance, APR, and minimum monthly payment.
 *
 * Design notes:
 * - Slides up from bottom, filling screen to near the top
 * - Buttons are pinned outside the ScrollView so they remain visible when the keyboard is open
 * - Keyboard-aware: uses decimal-pad for number fields
 * - Calls onAdd callback with a complete NewDebtInput object
 * - Dynamic theming support
 *
 * Performance:
 * - Memoized with React.memo to prevent re-renders when parent updates
 * - useCallback on all handlers to maintain stable references
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DEBT_CLASS_OPTIONS,
  DEBT_OWNER_OPTIONS,
  Debt,
  DebtClass,
  DebtOwner,
  NewDebtInput,
} from "../types";
import { calcPaymentForGoalDate, calcMonthsUntilDate } from "../utils/calculations";
import { DEFAULT_DEBT_PAYMENT_DUE_DAY } from "../utils/debtDueCalendar";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";

import { sanitizeTextInput } from "../utils/sanitize";
import { useValueChanged } from "../hooks/useValueChanged";
import { formatYearMonthLabel } from "../utils/dateFormat";
import MonthYearPicker from "./MonthYearPicker";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";

/* ─── Props Interface ─── */
interface AddDebtModalProps {
  /** Whether the modal is currently visible */
  visible: boolean;

  /** Callback to close the modal */
  onClose: () => void;

  /** Callback when user submits a valid debt - receives the form data */
  onAdd: (debt: NewDebtInput) => void;

  /** Optional existing debt to edit - when set, modal acts as an editor */
  editDebt?: Debt | null;

  /** Callback when user saves edits to an existing debt */
  onEdit?: (debtId: string, updates: Partial<Debt>) => void;
}

/**
 * Clamp a stored payment-due-day to the valid 1-31 range, treating anything
 * else (undefined, floats, out-of-range) as "use the app default" (null).
 */
const sanitizeDueDay = (day: number | undefined): number | null =>
  typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 31
    ? day
    : null;

/**
 * Single source of truth for mapping a debt (or none, for add mode) to the
 * form fields. Feeds both the useState initializers and the render-time
 * reset, so the two can't drift when a field is added.
 */
interface DebtFormState {
  name: string;
  balance: string;
  rate: string;
  minPayment: string;
  goalMonth: string;
  owner: DebtOwner;
  debtClass: DebtClass;
  paymentDueDay: number | null;
}

const debtFormState = (editDebt: Debt | null | undefined): DebtFormState => ({
  name: editDebt?.name ?? "",
  balance: editDebt ? String(editDebt.balance) : "",
  rate: editDebt ? String(editDebt.rate) : "",
  minPayment: editDebt ? String(editDebt.minPayment) : "",
  goalMonth: editDebt?.goalDate ? editDebt.goalDate.slice(0, 7) : "",
  owner: editDebt?.owner ?? "mine",
  debtClass: editDebt?.debtClass ?? "personal_credit",
  paymentDueDay: sanitizeDueDay(editDebt?.paymentDueDay),
});

/* ─── Component ─── */
const AddDebtModal: React.FC<AddDebtModalProps> = ({
  visible,
  onClose,
  onAdd,
  editDebt,
  onEdit,
}) => {
  /** Get current theme colors */
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const insets = useSafeAreaInsets();

  /** Memoized styles */
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const isEditing = !!editDebt;

  // Form field state - seeded from editDebt (via debtFormState, the one
  // field mapping) so a mount mid-edit prefills without an effect pass.
  const [initialForm] = useState(() => debtFormState(editDebt));
  const [name, setName] = useState(initialForm.name);
  const [balance, setBalance] = useState(initialForm.balance);
  const [rate, setRate] = useState(initialForm.rate);
  const [minPayment, setMinPayment] = useState(initialForm.minPayment);
  const [goalMonth, setGoalMonth] = useState(initialForm.goalMonth);
  const [owner, setOwner] = useState<DebtOwner>(initialForm.owner);
  const [debtClass, setDebtClass] = useState<DebtClass>(initialForm.debtClass);
  // null = use app default (DEFAULT_DEBT_PAYMENT_DUE_DAY) without persisting a
  // value, so future default changes flow through and the user's intent stays
  // distinguishable from "I happened to pick 15."
  const [paymentDueDay, setPaymentDueDay] = useState<number | null>(
    initialForm.paymentDueDay
  );
  // MonthYearPicker (confirm mode) owns the year/tentative-month state and
  // seeds it from goalMonth on each open, so cancelling leaves the saved
  // goal untouched.
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  /**
   * Pre-fill / reset the form when the target debt changes. Render-time
   * adjustment (see useValueChanged) so the whole form updates in one pass
   * instead of an effect-driven second render with stale fields. Values come
   * from debtFormState (which maps null to the add-mode defaults), so this
   * block can't drift from the initializers above.
   */
  if (useValueChanged(editDebt)) {
    const next = debtFormState(editDebt);
    setName(next.name);
    setBalance(next.balance);
    setRate(next.rate);
    setMinPayment(next.minPayment);
    setGoalMonth(next.goalMonth);
    setOwner(next.owner);
    setDebtClass(next.debtClass);
    setPaymentDueDay(next.paymentDueDay);
  }

  /** Calculate required payment for goal date */
  const goalPaymentInfo = React.useMemo(() => {
    if (!goalMonth) return null;
    const balanceNum = parseFloat(balance);
    const rateNum = parseFloat(rate);
    if (isNaN(balanceNum) || balanceNum <= 0 || isNaN(rateNum) || rateNum < 0) return null;
    const months = calcMonthsUntilDate(`${goalMonth}-01`);
    if (months <= 0) return null;
    const required = calcPaymentForGoalDate(balanceNum, rateNum, months);
    return { months, required };
  }, [goalMonth, balance, rate]);

  /**
   * Validates and submits the form.
   * Parses string inputs to numbers, checks all are valid,
   * then calls onAdd/onEdit and resets the form.
   */
  const handleSubmit = useCallback(() => {
    const balanceNum = parseFloat(balance);
    const rateNum = parseFloat(rate);
    const paymentNum = parseFloat(minPayment);

    /* Validate: all fields must be filled, finite, and positive */
    if (!name.trim()) return;
    if (!Number.isFinite(balanceNum) || balanceNum <= 0) return;
    if (!Number.isFinite(rateNum) || rateNum < 0) return;
    if (!Number.isFinite(paymentNum) || paymentNum <= 0) return;

    const parsedGoalDate = goalMonth.trim() ? `${goalMonth.trim()}-01` : undefined;

    const paymentDueDayValue = paymentDueDay ?? undefined;

    if (isEditing && onEdit && editDebt) {
      onEdit(editDebt.id, {
        name: name.trim(),
        balance: balanceNum,
        rate: rateNum,
        minPayment: paymentNum,
        goalDate: parsedGoalDate,
        owner,
        debtClass,
        debtClassSource: "manual",
        paymentDueDay: paymentDueDayValue,
      });
    } else {
      onAdd({
        name: name.trim(),
        balance: balanceNum,
        originalBalance: balanceNum,
        rate: rateNum,
        minPayment: paymentNum,
        goalDate: parsedGoalDate,
        owner,
        debtClass,
        debtClassSource: "manual",
        paymentDueDay: paymentDueDayValue,
      });
    }

    /* Reset form fields */
    setName("");
    setBalance("");
    setRate("");
    setMinPayment("");
    setGoalMonth("");
    setOwner("mine");
    setDebtClass("personal_credit");
    setPaymentDueDay(null);
  }, [
    name,
    balance,
    rate,
    minPayment,
    goalMonth,
    onAdd,
    owner,
    debtClass,
    paymentDueDay,
    isEditing,
    onEdit,
    editDebt,
  ]);

  /** Check if form is valid (for button state) */
  const balanceParsed = parseFloat(balance);
  const rateParsed = parseFloat(rate);
  const minPaymentParsed = parseFloat(minPayment);
  const isValid =
    name.trim().length > 0 &&
    Number.isFinite(balanceParsed) && balanceParsed > 0 &&
    Number.isFinite(rateParsed) && rateParsed >= 0 &&
    Number.isFinite(minPaymentParsed) && minPaymentParsed > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <SheetKeyboardAvoider style={styles.overlay}>
        {/* Modal sheet - fills from near top to bottom */}
        <View style={styles.modalSheet}>
          {/* Scrollable form content. automaticallyAdjustKeyboardInsets keeps
              the focused input above the keyboard on iOS. */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {/* ── Header ── */}
            <Text style={styles.title}>{isEditing ? "Edit Debt" : "Add New Debt"}</Text>
            <Text style={styles.subtitle}>
              {isEditing
                ? "Update the details of this debt"
                : "Enter the details of the debt you want to track"}
            </Text>

            {/* ── Form Fields ── */}
            <View style={styles.fieldGroup}>
              {/* Debt Name */}
              <View style={styles.field}>
                <Text style={styles.label}>DEBT NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Chase Visa, Student Loan"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={(text) => setName(sanitizeTextInput(text))}
                  autoFocus
                  maxLength={50}
                />
              </View>

              {/* Total Balance */}
              <View style={styles.field}>
                <Text style={styles.label}>TOTAL BALANCE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  value={balance}
                  onChangeText={setBalance}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>OWNER</Text>
                <View style={styles.ownerRow}>
                  {DEBT_OWNER_OPTIONS.map((option) => {
                    const selected = owner === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.ownerBtn,
                          {
                            borderColor: selected ? colors.accent : colors.cardBorder,
                            backgroundColor: selected ? `${colors.accent}20` : colors.bg,
                          },
                        ]}
                        onPress={() => setOwner(option.id)}
                      >
                        <Text
                          style={[
                            styles.ownerBtnText,
                            { color: selected ? colors.accent : colors.textDim },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>DEBT TYPE</Text>
                <View style={styles.ownerRow}>
                  {DEBT_CLASS_OPTIONS.map((option) => {
                    const selected = debtClass === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.ownerBtn,
                          {
                            borderColor: selected ? colors.accent : colors.cardBorder,
                            backgroundColor: selected ? `${colors.accent}20` : colors.bg,
                          },
                        ]}
                        onPress={() => setDebtClass(option.id)}
                      >
                        <Text
                          style={[
                            styles.ownerBtnText,
                            { color: selected ? colors.accent : colors.textDim },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* APR and Min Payment (side-by-side) */}
              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>APR (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.0"
                    placeholderTextColor={colors.textMuted}
                    value={rate}
                    onChangeText={setRate}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>MIN PAYMENT</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={minPayment}
                    onChangeText={setMinPayment}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>MINIMUM PAYMENT DUE DAY</Text>
                <Text style={styles.dueDayHint}>
                  Day of each month your minimum is due. Day 29-31 falls back to
                  the last day in shorter months.
                </Text>
                <View style={styles.dueDayModeRow}>
                  <TouchableOpacity
                    style={[
                      styles.dueDayModeBtn,
                      paymentDueDay === null && styles.dueDayModeBtnActive,
                    ]}
                    onPress={() => setPaymentDueDay(null)}
                  >
                    <Text
                      style={[
                        styles.dueDayModeBtnText,
                        paymentDueDay === null && styles.dueDayModeBtnTextActive,
                      ]}
                    >
                      Use default (day {DEFAULT_DEBT_PAYMENT_DUE_DAY})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dueDayModeBtn,
                      paymentDueDay !== null && styles.dueDayModeBtnActive,
                    ]}
                    onPress={() =>
                      setPaymentDueDay(
                        paymentDueDay ?? DEFAULT_DEBT_PAYMENT_DUE_DAY
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.dueDayModeBtnText,
                        paymentDueDay !== null && styles.dueDayModeBtnTextActive,
                      ]}
                    >
                      Set custom day
                    </Text>
                  </TouchableOpacity>
                </View>
                {paymentDueDay !== null && (
                  <View style={styles.dueDayGrid}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dueDayBtn,
                          paymentDueDay === day && styles.dueDayBtnActive,
                        ]}
                        onPress={() => setPaymentDueDay(day)}
                      >
                        <Text
                          style={[
                            styles.dueDayBtnText,
                            paymentDueDay === day && styles.dueDayBtnTextActive,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Goal Date (optional) */}
              <View style={styles.field}>
                <Text style={styles.label}>PAYOFF GOAL DATE (OPTIONAL)</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowMonthPicker(true)}
                >
                  <Text style={{ color: goalMonth ? colors.text : colors.textMuted, fontSize: 15 }}>
                    {goalMonth ? formatYearMonthLabel(goalMonth) : "Select month"}
                  </Text>
                </TouchableOpacity>
                {goalMonth ? (
                  <TouchableOpacity onPress={() => setGoalMonth("")}>
                    <Text style={[styles.goalHint, { color: colors.textMuted }]}>Clear goal month</Text>
                  </TouchableOpacity>
                ) : null}
                {goalPaymentInfo && isFinite(goalPaymentInfo.required) && (
                  <Text style={[styles.goalHint, { color: colors.accent }]}> 
                    Pay {formatCurrency(goalPaymentInfo.required)}/mo to be debt-free in {goalPaymentInfo.months} months
                  </Text>
                )}
                {goalPaymentInfo && !isFinite(goalPaymentInfo.required) && (
                  <Text style={[styles.goalHint, { color: colors.danger || "#ff5252" }]}>
                    Goal date is too soon - not achievable
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* ── Action Buttons - pinned at bottom, always visible above keyboard ── */}
          <View
            style={[
              styles.buttonRow,
              Platform.OS === "android" && insets.bottom > 0
                ? { paddingBottom: insets.bottom + 12 }
                : null,
            ]}
          >
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.addButton,
                !isValid && styles.addButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isValid}
            >
              <Text style={styles.addButtonText}>{isEditing ? "Save Changes" : "Add Debt"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SheetKeyboardAvoider>

      <MonthYearPicker
        visible={showMonthPicker}
        value={goalMonth}
        onSelect={setGoalMonth}
        onClose={() => setShowMonthPicker(false)}
        confirm
        title="Set payoff goal date"
        minYear={new Date().getFullYear()}
      />
    </Modal>
  );
};

/**
 * Style factory function - creates styles based on current theme
 */
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      flex: 1,
      marginTop: Platform.OS === "ios" ? 44 : 32,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      overflow: "hidden",
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      // Extra room so the last fields can scroll clear of the keyboard.
      paddingBottom: 56,
    },

    /* Header */
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 24,
    },

    /* Form */
    fieldGroup: {
      gap: 16,
    },
    field: {
      gap: 4,
    },
    label: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    goalHint: {
      fontSize: 12,
      fontWeight: "600",
      marginTop: 6,
    },
    ownerRow: {
      flexDirection: "row",
      gap: 8,
    },
    ownerBtn: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    ownerBtnText: {
      fontSize: 13,
      fontWeight: "600",
    },
    dueDayHint: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
      marginBottom: 8,
    },
    dueDayModeRow: {
      flexDirection: "row",
      gap: 8,
    },
    dueDayModeBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    dueDayModeBtnActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    dueDayModeBtnText: {
      color: colors.textDim,
      fontSize: 13,
      fontWeight: "600",
    },
    dueDayModeBtnTextActive: {
      color: colors.accent,
    },
    dueDayGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 10,
    },
    dueDayBtn: {
      width: "13%",
      aspectRatio: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    dueDayBtnActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    dueDayBtnText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "600",
    },
    dueDayBtnTextActive: {
      color: colors.accent,
    },

    /* Buttons - outside ScrollView so they stay above keyboard */
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
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
    addButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    addButtonDisabled: {
      opacity: 0.4,
    },
    addButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
  });

export default React.memo(AddDebtModal);
