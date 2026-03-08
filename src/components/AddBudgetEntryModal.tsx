import React, { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BUDGET_CATEGORIES,
  BudgetEntryType,
  BudgetCategory,
  NewBudgetEntryInput,
} from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";

interface AddBudgetEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (entry: NewBudgetEntryInput) => void;
}

const todayYearMonth = () => new Date().toISOString().slice(0, 7);

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

const SELECTABLE_BUDGET_CATEGORIES: BudgetCategory[] = BUDGET_CATEGORIES.filter(
  (category) => category !== "Freelance" && category !== "Debt Payments"
) as BudgetCategory[];

const AddBudgetEntryModal: React.FC<AddBudgetEntryModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [type, setType] = useState<BudgetEntryType>("expense");
  const [category, setCategory] = useState<BudgetCategory>("Food");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [yearMonth, setYearMonth] = useState(todayYearMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const isValid = parseFloat(amount) > 0;

  const reset = useCallback(() => {
    setType("expense");
    setCategory("Food");
    setAmount("");
    setDescription("");
    setYearMonth(todayYearMonth());
    setPickerYear(new Date().getFullYear());
  }, []);

  const handleSubmit = useCallback(() => {
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) return;

    onAdd({
      type,
      category,
      amount: amountNum,
      description: description.trim() || undefined,
      date: new Date(`${yearMonth}-15T12:00:00`).toISOString(),
    });

    reset();
  }, [amount, description, onAdd, type, category, yearMonth, reset]);

  const selectMonth = useCallback((monthIndex: number) => {
    const month = String(monthIndex + 1).padStart(2, "0");
    setYearMonth(`${pickerYear}-${month}`);
    setShowMonthPicker(false);
  }, [pickerYear]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
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
            <Text style={styles.title}>Add Budget Entry</Text>
            <Text style={styles.subtitle}>Track income and expenses by category.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>ENTRY TYPE</Text>
              <View style={styles.typeRow}>
                {(["expense", "income"] as const).map((entryType) => (
                  <TouchableOpacity
                    key={entryType}
                    style={[
                      styles.typeButton,
                      type === entryType && styles.typeButtonActive,
                      type === entryType && {
                        borderColor:
                          entryType === "expense" ? colors.warning : colors.success,
                      },
                    ]}
                    onPress={() => setType(entryType)}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        type === entryType && {
                          color: entryType === "expense" ? colors.warning : colors.success,
                        },
                      ]}
                    >
                      {entryType === "expense" ? "Expense" : "Income"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>CATEGORY</Text>
              <View style={styles.categoryWrap}>
                {SELECTABLE_BUDGET_CATEGORIES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.categoryPill,
                      category === item && styles.categoryPillActive,
                    ]}
                    onPress={() => setCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        category === item && styles.categoryPillTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>AMOUNT</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grocery run, Netflix, etc."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                maxLength={100}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>MONTH</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => {
                  const parsedYear = Number(yearMonth.split("-")[0]);
                  if (!Number.isNaN(parsedYear)) {
                    setPickerYear(parsedYear);
                  }
                  setShowMonthPicker(true);
                }}
              >
                <Text style={{ color: colors.text, fontSize: 15 }}>
                  {formatYearMonthLabel(yearMonth)}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* ── Action Buttons — pinned at bottom, always visible above keyboard ── */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, !isValid && styles.addButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isValid}
            >
              <Text style={styles.addButtonText}>Add Entry</Text>
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
                const isSelected = yearMonth === `${pickerYear}-${monthValue}`;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.monthBtn,
                      isSelected && styles.monthBtnActive,
                    ]}
                    onPress={() => selectMonth(index)}
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
      gap: 14,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 8,
    },
    field: {
      gap: 8,
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
    typeRow: {
      flexDirection: "row",
      gap: 10,
    },
    typeButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    typeButtonActive: {
      borderWidth: 2,
    },
    typeText: {
      color: colors.textDim,
      fontSize: 14,
      fontWeight: "600",
    },
    categoryWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    categoryPill: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    categoryPillActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    categoryPillText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "500",
    },
    categoryPillTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    helperText: {
      fontSize: 12,
      fontWeight: "500",
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

export default React.memo(AddBudgetEntryModal);
