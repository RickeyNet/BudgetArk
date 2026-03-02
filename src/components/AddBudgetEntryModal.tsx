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

const todayISODate = () => new Date().toISOString().slice(0, 10);

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
  const [date, setDate] = useState(todayISODate());

  const isValidDate = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(date);
    return !Number.isNaN(parsed.getTime());
  }, [date]);

  const isValid = parseFloat(amount) > 0 && isValidDate;

  const reset = useCallback(() => {
    setType("expense");
    setCategory("Food");
    setAmount("");
    setDate(todayISODate());
  }, []);

  const handleSubmit = useCallback(() => {
    const amountNum = parseFloat(amount);
    if (amountNum <= 0 || !isValidDate) return;

    onAdd({
      type,
      category,
      amount: amountNum,
      date: new Date(`${date}T12:00:00`).toISOString(),
    });

    reset();
  }, [amount, isValidDate, onAdd, type, category, date, reset]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalScroll}
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
                  {BUDGET_CATEGORIES.map((item) => (
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
                <Text style={styles.label}>DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-02-27"
                  placeholderTextColor={colors.textMuted}
                  value={date}
                  onChangeText={setDate}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {!isValidDate && (
                  <Text style={[styles.helperText, { color: colors.warning }]}>Use YYYY-MM-DD.</Text>
                )}
              </View>

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
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
      maxHeight: "85%",
    },
    modalScroll: {
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
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
      marginBottom: 16,
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
