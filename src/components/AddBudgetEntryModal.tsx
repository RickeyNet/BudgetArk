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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BUDGET_CATEGORIES,
  BudgetEntryType,
  BudgetCategory,
  CategoryName,
  CustomCategory,
  DEFAULT_RECURRENCE_INTERVAL,
  NewBudgetEntryInput,
  RECURRENCE_INTERVAL_OPTIONS,
  RecurrenceInterval,
  AssetAccount,
} from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { getCategoryIcon } from "../data/categoryIcons";
import { normalizePaymentUrl } from "../utils/paymentUrl";

const LINKABLE_CATEGORIES: ReadonlySet<string> = new Set([
  "Savings",
  "Retirement",
  "Investing",
]);

interface AddBudgetEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (entry: NewBudgetEntryInput) => void;
  assetAccounts?: AssetAccount[];
  customCategories?: CustomCategory[];
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

const DEFAULT_RECURRENCE_DAY = 15;

const lastDayOfYearMonth = (yearMonth: string): number => {
  const [yStr, mStr] = yearMonth.split("-");
  return new Date(Number(yStr), Number(mStr), 0).getDate();
};

const buildEntryDateISO = (yearMonth: string, day: number): string => {
  const clamped = Math.max(1, Math.min(day, lastDayOfYearMonth(yearMonth)));
  const dd = String(clamped).padStart(2, "0");
  return new Date(`${yearMonth}-${dd}T12:00:00`).toISOString();
};

const SELECTABLE_BUDGET_CATEGORIES: BudgetCategory[] = BUDGET_CATEGORIES.filter(
  (category) =>
    category !== "Freelance" &&
    category !== "Debt Payments" &&
    category !== "Food"
) as BudgetCategory[];

const AddBudgetEntryModal: React.FC<AddBudgetEntryModalProps> = ({
  visible,
  onClose,
  onAdd,
  assetAccounts = [],
  customCategories = [],
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const selectableCategories = useMemo<CategoryName[]>(
    () => [
      ...SELECTABLE_BUDGET_CATEGORIES,
      ...customCategories.map((c) => c.name),
    ],
    [customCategories]
  );

  const [type, setType] = useState<BudgetEntryType>("expense");
  const [category, setCategory] = useState<CategoryName>("Grocery");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [yearMonth, setYearMonth] = useState(todayYearMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [recurring, setRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>(
    DEFAULT_RECURRENCE_INTERVAL
  );
  const [recurrenceDay, setRecurrenceDay] = useState<number>(DEFAULT_RECURRENCE_DAY);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState<string | undefined>(undefined);

  const showDayPicker = recurring && type === "expense";

  const showAccountPicker = LINKABLE_CATEGORIES.has(category) && assetAccounts.length > 0;

  const isValid = parseFloat(amount) > 0;

  const reset = useCallback(() => {
    setType("expense");
    setCategory("Grocery");
    setAmount("");
    setDescription("");
    setYearMonth(todayYearMonth());
    setShowMonthPicker(false);
    setPickerYear(new Date().getFullYear());
    setRecurring(false);
    setRecurrenceInterval(DEFAULT_RECURRENCE_INTERVAL);
    setRecurrenceDay(DEFAULT_RECURRENCE_DAY);
    setPaymentUrl("");
    setLinkedAccountId(undefined);
  }, []);

  const handleSubmit = useCallback(() => {
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) return;

    onAdd({
      type,
      category,
      amount: amountNum,
      description: description.trim() || undefined,
      date: buildEntryDateISO(yearMonth, showDayPicker ? recurrenceDay : DEFAULT_RECURRENCE_DAY),
      recurring: recurring || undefined,
      recurrenceInterval: recurring ? recurrenceInterval : undefined,
      paymentUrl: showDayPicker ? normalizePaymentUrl(paymentUrl) ?? undefined : undefined,
      linkedAccountId: showAccountPicker ? linkedAccountId : undefined,
    });

    reset();
  }, [
    amount,
    category,
    description,
    linkedAccountId,
    onAdd,
    paymentUrl,
    recurring,
    recurrenceDay,
    recurrenceInterval,
    reset,
    showAccountPicker,
    showDayPicker,
    type,
    yearMonth,
  ]);

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
        {/* Modal sheet - fills from near top to bottom */}
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
                {selectableCategories.map((item) => (
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
                      {getCategoryIcon(item, customCategories)} {item}
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
                <Text style={styles.recurringLabel}>Recurring</Text>
                <Text style={styles.recurringHint}>
                  This entry will repeat from the start month onward at the
                  frequency you choose below.
                </Text>
              </View>
            </TouchableOpacity>

            {recurring && (
              <View style={styles.field}>
                <Text style={styles.label}>FREQUENCY</Text>
                <View style={styles.categoryWrap}>
                  {RECURRENCE_INTERVAL_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.categoryPill,
                        recurrenceInterval === opt.value && styles.categoryPillActive,
                      ]}
                      onPress={() => setRecurrenceInterval(opt.value)}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          recurrenceInterval === opt.value && styles.categoryPillTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {showDayPicker && (
              <View style={styles.field}>
                <Text style={styles.label}>PAY URL (OPTIONAL)</Text>
                <Text style={styles.accountPickerHint}>
                  Link to the payment site for this bill. https:// is added if
                  you leave it off.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. mybill.example.com/pay"
                  placeholderTextColor={colors.textMuted}
                  value={paymentUrl}
                  onChangeText={setPaymentUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  maxLength={512}
                />
              </View>
            )}

            {showDayPicker && (
              <View style={styles.field}>
                <Text style={styles.label}>DAY OF MONTH</Text>
                <Text style={styles.accountPickerHint}>
                  The day this bill hits. Day 29-31 falls back to the last day in
                  shorter months.
                </Text>
                <View style={styles.dayGrid}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayBtn,
                        recurrenceDay === day && styles.dayBtnActive,
                      ]}
                      onPress={() => setRecurrenceDay(day)}
                    >
                      <Text
                        style={[
                          styles.dayBtnText,
                          recurrenceDay === day && styles.dayBtnTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

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

    /* Day-of-month grid (7 cols, ~31 entries) */
    dayGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    dayBtn: {
      width: "13%",
      aspectRatio: 1,
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
    dayBtnText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "600",
    },
    dayBtnTextActive: {
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

export default React.memo(AddBudgetEntryModal);
