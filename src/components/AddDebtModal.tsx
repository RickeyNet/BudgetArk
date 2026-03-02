/**
 * BudgetBuddy — AddDebtModal Component
 * File: src/components/AddDebtModal.tsx
 *
 * A full-screen modal that presents a form for adding a new debt.
 * Collects: debt name, total balance, APR, and minimum monthly payment.
 *
 * Design notes:
 * - Uses a dark overlay with blur-style backdrop
 * - Form validates all fields before enabling the submit button
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
import { NewDebtInput } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";

/* ─── Props Interface ─── */
interface AddDebtModalProps {
  /** Whether the modal is currently visible */
  visible: boolean;

  /** Callback to close the modal */
  onClose: () => void;

  /** Callback when user submits a valid debt — receives the form data */
  onAdd: (debt: NewDebtInput) => void;
}

/* ─── Component ─── */
const AddDebtModal: React.FC<AddDebtModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  /** Get current theme colors */
  const { colors } = useTheme();

  /** Memoized styles */
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  /** Form field state */
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [rate, setRate] = useState("");
  const [minPayment, setMinPayment] = useState("");

  /**
   * Validates and submits the form.
   * Parses string inputs to numbers, checks all are valid,
   * then calls onAdd and resets the form.
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

    onAdd({
      name: name.trim(),
      balance: balanceNum,
      originalBalance: balanceNum,
      rate: rateNum,
      minPayment: paymentNum,
    });

    /* Reset form fields */
    setName("");
    setBalance("");
    setRate("");
    setMinPayment("");
  }, [name, balance, rate, minPayment, onAdd]);

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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          {/* Prevents modal from closing when tapping inside content */}
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Header ── */}
              <Text style={styles.title}>Add New Debt</Text>
              <Text style={styles.subtitle}>
                Enter the details of the debt you want to track
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
              </View>

              {/* ── Action Buttons ── */}
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
                  <Text style={styles.addButtonText}>Add Debt</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      maxHeight: "92%",
    },
    modalScroll: {
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

    /* Buttons */
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 24,
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
