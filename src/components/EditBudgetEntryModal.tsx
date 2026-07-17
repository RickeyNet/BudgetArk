import React, { useCallback, useMemo, useState } from "react";
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
  BudgetEntry,
  BudgetEntryType,
  CategoryName,
  CustomCategory,
  DEFAULT_RECURRENCE_INTERVAL,
  DEFAULT_TAX_SET_ASIDE_RATE,
  IncomeType,
  RECURRENCE_INTERVAL_OPTIONS,
  RecurrenceInterval,
  AssetAccount,
  Business,
  EntryAttachment,
} from "../types";
import { getRecurrenceInterval } from "../utils/recurrence";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import CategoryPillPicker from "./CategoryPillPicker";
import AttachmentSection from "./AttachmentSection";
import { deleteAttachmentFiles } from "../services/attachments/attachmentStore";
import { normalizePaymentUrl } from "../utils/paymentUrl";
import { clampTaxSetAsideRate } from "../utils/paycheckMath";
import {
  DEFAULT_RECURRENCE_DAY,
  buildEntryDateISO,
  dayOfMonthFromIso,
} from "../utils/entryDate";
import { MONTH_LABELS, formatYearMonthLabel } from "../utils/dateFormat";
import { useCurrency } from "../currency/CurrencyProvider";
import { useValueChanged } from "../hooks/useValueChanged";

const LINKABLE_CATEGORIES: ReadonlySet<string> = new Set([
  "Savings",
  "Retirement",
  "Investing",
]);

const INCOME_TYPE_OPTIONS: readonly {
  value: IncomeType | undefined;
  label: string;
}[] = [
  { value: undefined, label: "Regular" },
  { value: "w2", label: "W-2 paycheck" },
  { value: "1099", label: "1099 / contractor" },
];

interface EditBudgetEntryModalProps {
  entry: BudgetEntry | null;
  onClose: () => void;
  onSave: (updated: BudgetEntry) => void;
  onDelete: (id: string) => void;
  assetAccounts?: AssetAccount[];
  customCategories?: CustomCategory[];
  businesses?: Business[];
}

const toYearMonth = (iso: string) => new Date(iso).toISOString().slice(0, 7);

/**
 * Single source of truth for mapping an entry (or none) to the form fields.
 * Feeds both the useState initializers and the render-time reset, so the
 * two can't drift when a field is added.
 */
interface EntryFormState {
  type: BudgetEntryType;
  category: CategoryName;
  amount: string;
  description: string;
  yearMonth: string;
  pickerYear: number;
  recurring: boolean;
  recurrenceInterval: RecurrenceInterval;
  recurrenceDay: number;
  paymentUrl: string;
  linkedAccountId: string | undefined;
  businessId: string | undefined;
  incomeType: IncomeType | undefined;
  retirementContribution: string;
  taxSetAsideRate: string;
  attachments: EntryAttachment[];
}

const entryFormState = (entry: BudgetEntry | null): EntryFormState => {
  const ym = entry ? toYearMonth(entry.date) : "";
  return {
    type: entry?.type ?? "expense",
    category: entry?.category ?? "Grocery",
    amount: entry ? String(entry.amount) : "",
    description: entry?.description ?? "",
    yearMonth: ym,
    pickerYear:
      (entry ? Number(ym.split("-")[0]) : NaN) || new Date().getFullYear(),
    recurring: !!entry?.recurring,
    recurrenceInterval: entry
      ? getRecurrenceInterval(entry)
      : DEFAULT_RECURRENCE_INTERVAL,
    recurrenceDay: entry ? dayOfMonthFromIso(entry.date) : DEFAULT_RECURRENCE_DAY,
    paymentUrl: entry?.paymentUrl ?? "",
    linkedAccountId: entry?.linkedAccountId,
    businessId: entry?.businessId,
    incomeType: entry?.incomeType,
    retirementContribution:
      entry?.retirementContribution !== undefined
        ? String(entry.retirementContribution)
        : "",
    taxSetAsideRate:
      entry?.taxSetAsideRate !== undefined
        ? String(entry.taxSetAsideRate)
        : String(DEFAULT_TAX_SET_ASIDE_RATE),
    attachments: entry?.attachments ?? [],
  };
};

const EditBudgetEntryModal: React.FC<EditBudgetEntryModalProps> = ({
  entry,
  onClose,
  onSave,
  onDelete,
  assetAccounts = [],
  customCategories = [],
  businesses = [],
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { formatCurrency } = useCurrency();

  // Seeded from `entry` (via entryFormState - the one field mapping) so a
  // mount mid-edit prefills without an effect pass.
  const [initialForm] = useState(() => entryFormState(entry));
  const [type, setType] = useState<BudgetEntryType>(initialForm.type);
  const [category, setCategory] = useState<CategoryName>(initialForm.category);
  const [amount, setAmount] = useState(initialForm.amount);
  const [description, setDescription] = useState(initialForm.description);
  const [yearMonth, setYearMonth] = useState(initialForm.yearMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(initialForm.pickerYear);
  const [recurring, setRecurring] = useState(initialForm.recurring);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>(
    initialForm.recurrenceInterval
  );
  const [recurrenceDay, setRecurrenceDay] = useState<number>(
    initialForm.recurrenceDay
  );
  const [paymentUrl, setPaymentUrl] = useState(initialForm.paymentUrl);
  const [linkedAccountId, setLinkedAccountId] = useState<string | undefined>(
    initialForm.linkedAccountId
  );
  const [businessId, setBusinessId] = useState<string | undefined>(
    initialForm.businessId
  );
  const [incomeType, setIncomeType] = useState<IncomeType | undefined>(
    initialForm.incomeType
  );
  const [retirementContribution, setRetirementContribution] = useState(
    initialForm.retirementContribution
  );
  const [taxSetAsideRate, setTaxSetAsideRate] = useState(
    initialForm.taxSetAsideRate
  );
  // Cancel-safe photo editing: added photos are imported (files written)
  // immediately but tracked in newlyStagedIds so Cancel can delete them.
  // Removing a pre-existing photo NEVER deletes its files here - the
  // Budget screen's Undo toast can restore the pre-edit entry (attachments
  // included), so the files must outlive the save; the orphan sweep
  // collects them once nothing references the ids anymore.
  const [attachments, setAttachments] = useState<EntryAttachment[]>(
    initialForm.attachments
  );
  const [newlyStagedIds, setNewlyStagedIds] = useState<Set<string>>(new Set());
  // Same ghost-staging guard as the Add modal - see AttachmentSection.
  const [stagingSession, setStagingSession] = useState(0);

  const showDayPicker = recurring && type === "expense";
  const [ready, setReady] = useState(false);

  /**
   * Re-fill the form when the edited entry changes. Render-time adjustment
   * (see useValueChanged) so the form updates in one pass instead of an
   * effect-driven second render. Field values come from entryFormState so
   * this block can't drift from the initializers above.
   */
  if (useValueChanged(entry)) {
    if (entry) {
      const next = entryFormState(entry);
      setType(next.type);
      setCategory(next.category);
      setAmount(next.amount);
      setDescription(next.description);
      setYearMonth(next.yearMonth);
      setPickerYear(next.pickerYear);
      setRecurring(next.recurring);
      setRecurrenceInterval(next.recurrenceInterval);
      setRecurrenceDay(next.recurrenceDay);
      setPaymentUrl(next.paymentUrl);
      setLinkedAccountId(next.linkedAccountId);
      setBusinessId(next.businessId);
      setIncomeType(next.incomeType);
      setRetirementContribution(next.retirementContribution);
      setTaxSetAsideRate(next.taxSetAsideRate);
      setAttachments(next.attachments);
    }
    setNewlyStagedIds(new Set());
    setStagingSession((s) => s + 1);
    setReady(false);
    setShowMonthPicker(false);
  }

  const isValid = parseFloat(amount) > 0;
  const showAccountPicker = LINKABLE_CATEGORIES.has(category) && assetAccounts.length > 0;
  // Expense-only, but also shown when the entry is already tagged with a
  // business that has since been deleted - the user must be able to untag.
  const showBusinessPicker =
    type === "expense" && (businesses.length > 0 || !!businessId);
  const taggedBusinessMissing =
    !!businessId && !businesses.some((b) => b.id === businessId);

  // Live "set aside $X for taxes" preview for 1099 income.
  const taxSetAsidePreview = useMemo(() => {
    if (type !== "income" || incomeType !== "1099") return 0;
    const amountNum = parseFloat(amount);
    if (!(amountNum > 0)) return 0;
    const rate = clampTaxSetAsideRate(parseFloat(taxSetAsideRate));
    return Math.round(amountNum * rate) / 100;
  }, [amount, incomeType, taxSetAsideRate, type]);

  const handleSave = useCallback(() => {
    if (!entry || !isValid) return;
    const amountNum = parseFloat(amount);

    const entryIncomeType = type === "income" ? incomeType : undefined;
    const contributionNum = parseFloat(retirementContribution);

    onSave({
      ...entry,
      type,
      category,
      amount: amountNum,
      description: description.trim() || undefined,
      date: buildEntryDateISO(
        yearMonth,
        showDayPicker ? recurrenceDay : dayOfMonthFromIso(entry.date)
      ),
      recurring: recurring || undefined,
      recurrenceInterval: recurring ? recurrenceInterval : undefined,
      paymentUrl: showDayPicker ? normalizePaymentUrl(paymentUrl) ?? undefined : undefined,
      linkedAccountId: showAccountPicker ? linkedAccountId : undefined,
      // Cleared when the type flips to income (mirrors linkedAccountId).
      businessId: type === "expense" ? businessId : undefined,
      // Cleared when the type flips to expense or the income type changes
      // (mirrors businessId in the other direction).
      incomeType: entryIncomeType,
      retirementContribution:
        entryIncomeType === "w2" && contributionNum > 0
          ? contributionNum
          : undefined,
      taxSetAsideRate:
        entryIncomeType === "1099"
          ? clampTaxSetAsideRate(parseFloat(taxSetAsideRate))
          : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      updatedAt: new Date().toISOString(),
    });

    // Save confirmed. Removed photos' files are intentionally NOT deleted
    // here: the Undo toast can restore the pre-edit entry (and the parent's
    // persist is async and may still fail) - the orphan sweep collects the
    // files once no entry references them. Newly staged photos now belong
    // to the saved entry and must not be deleted by any later cancel path.
    setNewlyStagedIds(new Set());
    setStagingSession((s) => s + 1);
  }, [
    amount,
    attachments,
    businessId,
    category,
    description,
    entry,
    incomeType,
    isValid,
    linkedAccountId,
    onSave,
    paymentUrl,
    recurring,
    recurrenceDay,
    recurrenceInterval,
    retirementContribution,
    showAccountPicker,
    showDayPicker,
    taxSetAsideRate,
    type,
    yearMonth,
  ]);

  /**
   * Cancel/dismiss path: delete only the files added THIS session; photos
   * removed from the strip keep their files (the entry still references
   * them - Cancel restored the reference).
   */
  const handleCancel = useCallback(() => {
    if (newlyStagedIds.size > 0) {
      void deleteAttachmentFiles(Array.from(newlyStagedIds));
      setNewlyStagedIds(new Set());
    }
    setStagingSession((s) => s + 1);
    onClose();
  }, [newlyStagedIds, onClose]);

  const handleAttachmentAdd = useCallback((attachment: EntryAttachment) => {
    setAttachments((prev) => [...prev, attachment]);
    setNewlyStagedIds((prev) => new Set(prev).add(attachment.id));
  }, []);

  const handleAttachmentRemove = useCallback(
    (id: string) => {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      if (newlyStagedIds.has(id)) {
        // Added this session and removed again - the file is ours alone.
        void deleteAttachmentFiles([id]);
        setNewlyStagedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      // Pre-existing photo: only the reference goes (on Save). The files
      // stay so the Undo toast can restore them; the orphan sweep collects
      // them once no live/tombstoned entry references the id.
    },
    [newlyStagedIds]
  );

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
    // Photos staged this session were never saved onto any entry - clean
    // them up like Cancel does. The entry's own photos stay (the delete is
    // soft and undoable).
    if (newlyStagedIds.size > 0) {
      void deleteAttachmentFiles(Array.from(newlyStagedIds));
      setNewlyStagedIds(new Set());
    }
    setStagingSession((s) => s + 1);
    onDelete(entry.id);
  }, [entry, newlyStagedIds, onDelete]);

  const handleShow = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
  }, []);

  if (!entry) return null;

  return (
    <>
    <Modal visible={!!entry} animationType="slide" transparent onRequestClose={handleCancel} onShow={handleShow}>
      <KeyboardAvoidingView
        // iOS leans on automaticallyAdjustKeyboardInsets below (also scrolls
        // the focused field into view), so KAV stays off. The RN Modal's
        // Android window isn't auto-resized for the keyboard, so Android needs
        // the KAV to lift the sheet - padding slides it up smoothly, while
        // "height" re-lays-out the subtree each frame and glitches on dismiss.
        behavior={Platform.OS === "android" ? "padding" : undefined}
        style={styles.overlay}
      >
        {/* Tap-to-dismiss area above the sheet */}
        <Pressable style={styles.backdrop} onPress={handleCancel} />

        {/* Modal sheet */}
        <View style={styles.modalContent}>
          <ScrollView
            contentContainerStyle={[styles.modalScroll, { paddingBottom: Math.max(insets.bottom, 16) }]}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
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

                {type === "income" && (
                  <View style={styles.field}>
                    <Text style={styles.label}>INCOME TYPE</Text>
                    <Text style={styles.accountPickerHint}>
                      W-2 tracks your take-home paycheck and 401(k). 1099 shows
                      how much of each payment to set aside for taxes.
                    </Text>
                    <View style={styles.categoryWrap}>
                      {INCOME_TYPE_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.label}
                          style={[
                            styles.categoryPill,
                            incomeType === opt.value && styles.categoryPillActive,
                          ]}
                          onPress={() => setIncomeType(opt.value)}
                        >
                          <Text
                            style={[
                              styles.categoryPillText,
                              incomeType === opt.value &&
                                styles.categoryPillTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {type === "income" && incomeType === "w2" && (
                  <View style={styles.field}>
                    <Text style={styles.label}>401(K) THIS PAYCHECK (OPTIONAL)</Text>
                    <Text style={styles.accountPickerHint}>
                      The amount below is your take-home (net) pay. If part of
                      this paycheck went to a 401(k), record it here - it's
                      tracked separately, not added to income.
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      value={retirementContribution}
                      onChangeText={setRetirementContribution}
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}

                {type === "income" && incomeType === "1099" && (
                  <View style={styles.field}>
                    <Text style={styles.label}>TAX SET-ASIDE PERCENT</Text>
                    <Text style={styles.accountPickerHint}>
                      Nothing is withheld from 1099 pay, so set a slice aside
                      for end-of-year taxes. 25-30% is a common starting point.
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder={String(DEFAULT_TAX_SET_ASIDE_RATE)}
                      placeholderTextColor={colors.textMuted}
                      value={taxSetAsideRate}
                      onChangeText={setTaxSetAsideRate}
                      keyboardType="decimal-pad"
                      maxLength={5}
                    />
                    {taxSetAsidePreview > 0 && (
                      <Text style={[styles.helperText, { color: colors.success }]}>
                        Set aside {formatCurrency(taxSetAsidePreview)} of this
                        for taxes.
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={styles.label}>CATEGORY</Text>
                  <CategoryPillPicker
                    value={category}
                    onChange={setCategory}
                    customCategories={customCategories}
                    pinCurrentValue
                  />
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
                              recurrenceInterval === opt.value &&
                                styles.categoryPillTextActive,
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
                      Link to the payment site for this bill. https:// is added
                      if you leave it off.
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
                      The day this bill hits. Day 29-31 falls back to the last
                      day in shorter months.
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

                {showBusinessPicker && (
                  <View style={styles.field}>
                    <Text style={styles.label}>BUSINESS (OPTIONAL)</Text>
                    <Text style={styles.accountPickerHint}>
                      Tag this expense to a business for the tax-time report.
                    </Text>
                    <View style={styles.categoryWrap}>
                      <TouchableOpacity
                        style={[
                          styles.categoryPill,
                          !businessId && styles.categoryPillActive,
                        ]}
                        onPress={() => setBusinessId(undefined)}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            !businessId && styles.categoryPillTextActive,
                          ]}
                        >
                          Personal
                        </Text>
                      </TouchableOpacity>
                      {businesses.map((business) => (
                        <TouchableOpacity
                          key={business.id}
                          style={[
                            styles.categoryPill,
                            businessId === business.id && styles.categoryPillActive,
                          ]}
                          onPress={() => setBusinessId(business.id)}
                        >
                          <Text
                            style={[
                              styles.categoryPillText,
                              businessId === business.id && styles.categoryPillTextActive,
                            ]}
                          >
                            💼 {business.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {taggedBusinessMissing && (
                        <TouchableOpacity
                          style={[styles.categoryPill, styles.categoryPillActive]}
                          onPress={() => setBusinessId(undefined)}
                        >
                          <Text style={[styles.categoryPillText, styles.categoryPillTextActive]}>
                            💼 (deleted business)
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                <AttachmentSection
                  attachments={attachments}
                  stagingSession={stagingSession}
                  onAdd={handleAttachmentAdd}
                  onRemove={handleAttachmentRemove}
                />

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
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
