/**
 * BudgetArk — AddDebtModal Component
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import {
  DEBT_CLASS_OPTIONS,
  DEBT_OWNER_OPTIONS,
  Debt,
  DebtClass,
  DebtOwner,
  NewDebtInput,
} from "../types";
import { calcPaymentForGoalDate, calcMonthsUntilDate } from "../utils/calculations";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const formatYearMonthLabel = (yearMonth: string): string => {
  const [yearStr, monthStr] = yearMonth.split("-");
  const monthIndex = Number(monthStr) - 1;
  const monthLabel = MONTH_LABELS[monthIndex] || "Jan";
  return `${monthLabel} ${yearStr}`;
};

/* ─── Props Interface ─── */
interface AddDebtModalProps {
  /** Whether the modal is currently visible */
  visible: boolean;

  /** Callback to close the modal */
  onClose: () => void;

  /** Callback when user submits a valid debt — receives the form data */
  onAdd: (debt: NewDebtInput) => void;

  /** Optional existing debt to edit — when set, modal acts as an editor */
  editDebt?: Debt | null;

  /** Callback when user saves edits to an existing debt */
  onEdit?: (debtId: string, updates: Partial<Debt>) => void;
}

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

  /** Memoized styles */
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const isEditing = !!editDebt;

  /** Form field state */
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [rate, setRate] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [goalMonth, setGoalMonth] = useState("");
  const [owner, setOwner] = useState<DebtOwner>("mine");
  const [debtClass, setDebtClass] = useState<DebtClass>("personal_credit");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  /** Pre-fill form when editing */
  React.useEffect(() => {
    if (editDebt) {
      setName(editDebt.name);
      setBalance(String(editDebt.balance));
      setRate(String(editDebt.rate));
      setMinPayment(String(editDebt.minPayment));
      setGoalMonth(editDebt.goalDate ? editDebt.goalDate.slice(0, 7) : "");
      setOwner(editDebt.owner ?? "mine");
      setDebtClass(editDebt.debtClass ?? "personal_credit");
    } else {
      setName("");
      setBalance("");
      setRate("");
      setMinPayment("");
      setGoalMonth("");
      setOwner("mine");
      setDebtClass("personal_credit");
    }
  }, [editDebt]);

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

    /* Validate: all fields must be filled and positive */
    if (!name.trim()) return;
    if (isNaN(balanceNum) || balanceNum <= 0) return;
    if (isNaN(rateNum) || rateNum < 0) return;
    if (isNaN(paymentNum) || paymentNum <= 0) return;

    const parsedGoalDate = goalMonth.trim() ? `${goalMonth.trim()}-01` : undefined;

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
  }, [
    name,
    balance,
    rate,
    minPayment,
    goalMonth,
    onAdd,
    owner,
    debtClass,
    isEditing,
    onEdit,
    editDebt,
  ]);

  const selectGoalMonth = useCallback(
    (monthIndex: number) => {
      const month = String(monthIndex + 1).padStart(2, "0");
      setGoalMonth(`${pickerYear}-${month}`);
      setShowMonthPicker(false);
    },
    [pickerYear]
  );

  /** Check if form is valid (for button state) */
  const isValid =
    name.trim().length > 0 &&
    parseFloat(balance) > 0 &&
    parseFloat(rate) >= 0 &&
    parseFloat(minPayment) > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.overlay}
      >
        {/* Modal sheet — fills from near top to bottom */}
        <View style={styles.modalSheet}>
          {/* Scrollable form content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
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
                  onChangeText={setName}
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

              {/* Goal Date (optional) */}
              <View style={styles.field}>
                <Text style={styles.label}>PAYOFF GOAL DATE (OPTIONAL)</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => {
                    const parsedYear = Number(goalMonth.split("-")[0]);
                    if (!Number.isNaN(parsedYear)) {
                      setPickerYear(parsedYear);
                    }
                    setShowMonthPicker(true);
                  }}
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
                    Goal date is too soon — not achievable
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* ── Action Buttons — pinned at bottom, always visible above keyboard ── */}
          <View style={styles.buttonRow}>
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
      </KeyboardAvoidingView>

      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setPickerYear((y) => y - 1)}>
                <Text style={styles.pickerArrow}>←</Text>
              </TouchableOpacity>
              <Text style={styles.pickerYear}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear((y) => y + 1)}>
                <Text style={styles.pickerArrow}>→</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.monthGrid}>
              {MONTH_LABELS.map((label, index) => {
                const monthValue = String(index + 1).padStart(2, "0");
                const isSelected = goalMonth === `${pickerYear}-${monthValue}`;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.monthBtn, isSelected && styles.monthBtnActive]}
                    onPress={() => selectGoalMonth(index)}
                  >
                    <Text style={[styles.monthBtnText, isSelected && styles.monthBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowMonthPicker(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    pickerArrow: {
      fontSize: 20,
      color: colors.text,
      fontWeight: "700",
      paddingHorizontal: 8,
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

    /* Buttons — outside ScrollView so they stay above keyboard */
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
