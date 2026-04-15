import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BUDGET_CATEGORIES,
  BudgetEntry,
  BudgetEntryType,
  BudgetCategory,
  AssetAccount,
} from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";

const LINKABLE_CATEGORIES: ReadonlySet<BudgetCategory> = new Set([
  "Savings",
  "Retirement",
  "Investing",
]);

interface EditBudgetEntryModalProps {
  entry: BudgetEntry | null;
  onClose: () => void;
  onSave: (updated: BudgetEntry) => void;
  onDelete: (id: string) => void;
  assetAccounts?: AssetAccount[];
}

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

const toYearMonth = (iso: string) => new Date(iso).toISOString().slice(0, 7);

const formatYearMonthLabel = (yearMonth: string): string => {
  const [yearStr, monthStr] = yearMonth.split("-");
  const monthIndex = Number(monthStr) - 1;
  const monthLabel = MONTH_LABELS[monthIndex] || "Jan";
  return `${monthLabel} ${yearStr}`;
};

const SELECTABLE_BUDGET_CATEGORIES: BudgetCategory[] = BUDGET_CATEGORIES.filter(
  (category) =>
    category !== "Freelance" &&
    category !== "Debt Payments" &&
    category !== "Food"
) as BudgetCategory[];

const EditBudgetEntryModal: React.FC<EditBudgetEntryModalProps> = ({
  entry,
  onClose,
  onSave,
  onDelete,
  assetAccounts = [],
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<BudgetEntryType>("expense");
  const [category, setCategory] = useState<BudgetCategory>("Grocery");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [yearMonth, setYearMonth] = useState("");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [recurring, setRecurring] = useState(false);
  const [linkedAccountId, setLinkedAccountId] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (entry) {
      setType(entry.type);
      setCategory(entry.category);
      setAmount(String(entry.amount));
      setDescription(entry.description ?? "");
      const ym = toYearMonth(entry.date);
      setYearMonth(ym);
      setPickerYear(Number(ym.split("-")[0]) || new Date().getFullYear());
      setRecurring(!!entry.recurring);
      setLinkedAccountId(entry.linkedAccountId);
      setReady(false);
      setShowMonthPicker(false);
      return;
    }

    setReady(false);
    setShowMonthPicker(false);
  }, [entry]);

  const isValid = parseFloat(amount) > 0;
  const showAccountPicker = LINKABLE_CATEGORIES.has(category) && assetAccounts.length > 0;

  const categoryOptions = useMemo(() => {
    if (SELECTABLE_BUDGET_CATEGORIES.includes(category)) {
      return SELECTABLE_BUDGET_CATEGORIES;
    }
    return [category, ...SELECTABLE_BUDGET_CATEGORIES];
  }, [category]);

  const handleSave = useCallback(() => {
    if (!entry || !isValid) return;
    const amountNum = parseFloat(amount);

    onSave({
      ...entry,
      type,
      category,
      amount: amountNum,
      description: description.trim() || undefined,
      date: new Date(`${yearMonth}-15T12:00:00`).toISOString(),
      recurring: recurring || undefined,
      linkedAccountId: showAccountPicker ? linkedAccountId : undefined,
      updatedAt: new Date().toISOString(),
    });
  }, [
    amount,
    category,
    description,
    entry,
    isValid,
    linkedAccountId,
    onSave,
    recurring,
    showAccountPicker,
    type,
    yearMonth,
  ]);

  const selectMonth = useCallback(
    (monthIndex: number) => {
      const month = String(monthIndex + 1).padStart(2, "0");
      setYearMonth(`${pickerYear}-${month}`);
      setShowMonthPicker(false);
    },
    [pickerYear]
  );

  const handleDelete = useCallback(() => {
    if (!entry) return;
    onDelete(entry.id);
  }, [entry, onDelete]);

  const handleShow = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
  }, []);

  if (!entry) return null;

  return (
    <>
    <Modal visible={!!entry} animationType="slide" transparent onRequestClose={onClose} onShow={handleShow}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        {/* Tap-to-dismiss area above the sheet */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Modal sheet */}
        <View style={styles.modalContent}>
          <ScrollView
            contentContainerStyle={[styles.modalScroll, { paddingBottom: Math.max(insets.bottom, 16) }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Edit Entry</Text>
            <Text style={styles.subtitle}>Update or delete this budget entry.</Text>

            {ready ? (
              <>
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
                    {categoryOptions.map((item) => (
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

                <TouchableOpacity
                  style={styles.recurringRow}
                  onPress={() => setRecurring((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.recurringToggle,
                      recurring && {
                        backgroundColor: colors.accent,
                        borderColor: colors.accent,
                      },
                    ]}
                  >
                    {recurring && <Text style={styles.recurringCheck}>✓</Text>}
                  </View>
                  <View style={styles.recurringTextWrap}>
                    <Text style={styles.recurringLabel}>Monthly Recurring</Text>
                    <Text style={styles.recurringHint}>
                      This entry will appear in every month from the start month onward.
                    </Text>
                  </View>
                </TouchableOpacity>

                {showAccountPicker && (
                  <View style={styles.field}>
                    <Text style={styles.label}>LINK TO ACCOUNT</Text>
                    <Text style={styles.accountPickerHint}>
                      Contributions will be added to this account's balance.
                    </Text>
                    <View style={styles.categoryWrap}>
                      <TouchableOpacity
                        style={[
                          styles.categoryPill,
                          !linkedAccountId && styles.categoryPillActive,
                        ]}
                        onPress={() => setLinkedAccountId(undefined)}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            !linkedAccountId && styles.categoryPillTextActive,
                          ]}
                        >
                          None
                        </Text>
                      </TouchableOpacity>
                      {assetAccounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={[
                            styles.categoryPill,
                            linkedAccountId === account.id && styles.categoryPillActive,
                          ]}
                          onPress={() => setLinkedAccountId(account.id)}
                        >
                          <Text
                            style={[
                              styles.categoryPillText,
                              linkedAccountId === account.id && styles.categoryPillTextActive,
                            ]}
                          >
                            {account.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={!isValid}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.loadingPlaceholder}>
                <Text style={styles.subtitle}>Loading...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
                  style={[styles.monthBtn, isSelected && styles.monthBtnActive]}
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
    </>
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
    loadingPlaceholder: {
      alignItems: "center",
      paddingVertical: 40,
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
    /* Recurring toggle */
    recurringRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 4,
    },
    recurringToggle: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    recurringCheck: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 18,
    },
    recurringTextWrap: {
      flex: 1,
    },
    recurringLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    recurringHint: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    accountPickerHint: {
      color: colors.textMuted,
      fontSize: 12,
    },

    buttonRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
    deleteButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      alignItems: "center",
    },
    deleteText: {
      color: colors.danger,
      fontSize: 15,
      fontWeight: "600",
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
    saveButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    saveButtonDisabled: {
      opacity: 0.4,
    },
    saveButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
  });

export default React.memo(EditBudgetEntryModal);
