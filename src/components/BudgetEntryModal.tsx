/**
 * BudgetArk - Budget Entry Modal (add + edit)
 * File: src/components/BudgetEntryModal.tsx
 *
 * The one form for creating and editing budget entries. Replaces the former
 * AddBudgetEntryModal/EditBudgetEntryModal pair, which duplicated every
 * field section (~67% of each file) and had already drifted in small ways.
 * Follows the AddDebtModal precedent: one component, a mode switch, one
 * field mapping (entryFormState) that both the initializers and the reset
 * path share so they can't drift when a field is added.
 *
 * Mode differences that are deliberate, not leftovers:
 * - add: multi-line entry drafts (several amounts for one category), a
 *   full-height sheet with the action row pinned under the ScrollView, and
 *   reset-to-defaults on submit/cancel.
 * - edit: a single amount/description seeded from the entry, an 85%-height
 *   sheet with a tap-to-dismiss backdrop, a Delete action, and
 *   InteractionManager "ready" gating so the heavy form renders after the
 *   slide-in animation instead of janking it.
 *
 * The attachment model is unified on the edit semantics, which generalize
 * the add ones: photos added this session sit in newlyStagedIds and are the
 * only files a cancel path may delete. Pre-existing photos' files must
 * outlive removal/save because the Budget screen's Undo toast can restore
 * the pre-edit entry - the orphan sweep collects them once nothing
 * references the ids. In add mode every photo is newly staged, so "delete
 * newly staged on cancel" is exactly the old delete-all-staged behavior.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  InteractionManager,
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
  NewBudgetEntryInput,
  RECURRENCE_INTERVAL_OPTIONS,
  RecurrenceInterval,
  AssetAccount,
  Business,
  Person,
  EntryAttachment,
} from "../types";
import { getRecurrenceInterval } from "../utils/recurrence";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import CategoryPillPicker from "./CategoryPillPicker";
import AttachmentSection from "./AttachmentSection";
import MonthYearPicker from "./MonthYearPicker";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";
import { deleteAttachmentFiles } from "../services/attachments/attachmentStore";
import { normalizePaymentUrl } from "../utils/paymentUrl";
import { clampTaxSetAsideRate } from "../utils/paycheckMath";
import {
  DEFAULT_RECURRENCE_DAY,
  buildEntryDateISO,
  dayOfMonthFromIso,
} from "../utils/entryDate";
import { formatYearMonthLabel } from "../utils/dateFormat";
import { useCurrency } from "../currency/CurrencyProvider";
import { useValueChanged } from "../hooks/useValueChanged";

const INCOME_TYPE_OPTIONS: readonly {
  value: IncomeType | undefined;
  label: string;
}[] = [
  { value: undefined, label: "Regular" },
  { value: "w2", label: "W-2 paycheck" },
  { value: "1099", label: "1099 / contractor" },
];

const LINKABLE_CATEGORIES: ReadonlySet<string> = new Set([
  "Savings",
  "Retirement",
  "Investing",
]);

interface EntryLineDraft {
  id: string;
  amount: string;
  description: string;
}

interface BudgetEntryModalProps {
  mode: "add" | "edit";
  /** add mode's open flag; edit mode derives visibility from `entry`. */
  visible?: boolean;
  /** edit mode's target; null keeps the modal closed. */
  entry?: BudgetEntry | null;
  onClose: () => void;
  /** add mode: receives one payload per valid line. */
  onAdd?: (entries: NewBudgetEntryInput[]) => void;
  /** edit mode: receives the updated entry. */
  onSave?: (updated: BudgetEntry) => void;
  /** edit mode: soft-delete (undoable upstream). */
  onDelete?: (id: string) => void;
  /**
   * Category to preselect when the modal opens (Quick Entry widget deep
   * link). Applied only on the closed -> open transition so it never
   * clobbers a selection the user makes while the modal is up.
   */
  initialCategory?: CategoryName;
  assetAccounts?: AssetAccount[];
  customCategories?: CustomCategory[];
  businesses?: Business[];
  people?: Person[];
}

let nextLineId = 0;
const createEmptyLine = (): EntryLineDraft => ({
  id: `line-${++nextLineId}`,
  amount: "",
  description: "",
});

// Local calendar month, NOT toISOString().slice(0,7) - the UTC month is
// already "next month" on the evening of the last day for users west of
// UTC, silently defaulting new entries into the wrong month's budget.
const todayYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const toYearMonth = (iso: string) => new Date(iso).toISOString().slice(0, 7);

/**
 * Single source of truth for mapping an entry (or none = add-mode defaults)
 * to the form fields. Feeds the useState initializers, the render-time
 * reset on entry change, and the add-mode reset, so none of the three can
 * drift when a field is added.
 */
interface EntryFormState {
  type: BudgetEntryType;
  category: CategoryName;
  lines: EntryLineDraft[];
  yearMonth: string;
  recurring: boolean;
  recurrenceInterval: RecurrenceInterval;
  recurrenceDay: number;
  paymentUrl: string;
  linkedAccountId: string | undefined;
  businessId: string | undefined;
  personId: string | undefined;
  incomeType: IncomeType | undefined;
  retirementContribution: string;
  taxSetAsideRate: string;
  attachments: EntryAttachment[];
  isPrivate: boolean;
}

const entryFormState = (entry: BudgetEntry | null): EntryFormState => ({
  type: entry?.type ?? "expense",
  category: entry?.category ?? "Grocery",
  lines: entry
    ? [
        {
          ...createEmptyLine(),
          amount: String(entry.amount),
          description: entry.description ?? "",
        },
      ]
    : [createEmptyLine()],
  yearMonth: entry ? toYearMonth(entry.date) : todayYearMonth(),
  recurring: !!entry?.recurring,
  recurrenceInterval: entry
    ? getRecurrenceInterval(entry)
    : DEFAULT_RECURRENCE_INTERVAL,
  recurrenceDay: entry ? dayOfMonthFromIso(entry.date) : DEFAULT_RECURRENCE_DAY,
  paymentUrl: entry?.paymentUrl ?? "",
  linkedAccountId: entry?.linkedAccountId,
  businessId: entry?.businessId,
  personId: entry?.personId,
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
  isPrivate: !!entry?.isPrivate,
});

const BudgetEntryModal: React.FC<BudgetEntryModalProps> = ({
  mode,
  visible = false,
  entry = null,
  onClose,
  onAdd,
  onSave,
  onDelete,
  initialCategory,
  assetAccounts = [],
  customCategories = [],
  businesses = [],
  people = [],
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { formatCurrency } = useCurrency();

  const isEdit = mode === "edit";

  // Seeded from `entry` (via entryFormState - the one field mapping) so a
  // mount mid-edit prefills without an effect pass.
  const [initialForm] = useState(() => entryFormState(entry));
  const [type, setType] = useState<BudgetEntryType>(initialForm.type);
  const [category, setCategory] = useState<CategoryName>(initialForm.category);
  const [lines, setLines] = useState<EntryLineDraft[]>(initialForm.lines);
  const [yearMonth, setYearMonth] = useState(initialForm.yearMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
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
  const [personId, setPersonId] = useState<string | undefined>(
    initialForm.personId
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
  const [isPrivate, setIsPrivate] = useState(initialForm.isPrivate);
  // See the header comment for the attachment lifecycle. Files are written
  // at pick time; newlyStagedIds tracks which ones a cancel may delete.
  const [attachments, setAttachments] = useState<EntryAttachment[]>(
    initialForm.attachments
  );
  const [newlyStagedIds, setNewlyStagedIds] = useState<Set<string>>(new Set());
  // Bumped whenever a staging context ends (submit, save, cancel, entry
  // switch) so a photo import still in flight is discarded by
  // AttachmentSection instead of ghost-staging onto the next entry.
  const [stagingSession, setStagingSession] = useState(0);

  // Edit mode defers the heavy form body until the slide-in animation is
  // done; add mode renders immediately (its defaults are cheap).
  const [ready, setReady] = useState(!isEdit);

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
      setLines(next.lines);
      setYearMonth(next.yearMonth);
      setRecurring(next.recurring);
      setRecurrenceInterval(next.recurrenceInterval);
      setRecurrenceDay(next.recurrenceDay);
      setPaymentUrl(next.paymentUrl);
      setLinkedAccountId(next.linkedAccountId);
      setBusinessId(next.businessId);
      setPersonId(next.personId);
      setIncomeType(next.incomeType);
      setRetirementContribution(next.retirementContribution);
      setTaxSetAsideRate(next.taxSetAsideRate);
      setAttachments(next.attachments);
      setIsPrivate(next.isPrivate);
    }
    setNewlyStagedIds(new Set());
    setStagingSession((s) => s + 1);
    if (isEdit) setReady(false);
    setShowMonthPicker(false);
  }

  // Apply the widget-provided category on the closed -> open edge only.
  const wasVisible = useRef(false);
  useEffect(() => {
    if (visible && !wasVisible.current && initialCategory) {
      setType("expense");
      setCategory(initialCategory);
    }
    wasVisible.current = visible;
  }, [visible, initialCategory]);

  const showDayPicker = recurring && type === "expense";

  const showAccountPicker =
    LINKABLE_CATEGORIES.has(category) && assetAccounts.length > 0;

  // Business tagging is expense-only; the row appears once the user has
  // created a business - or, in edit mode, when the entry is already tagged
  // with a business that has since been deleted (the user must be able to
  // untag).
  const showBusinessPicker =
    type === "expense" && (businesses.length > 0 || !!businessId);
  const taggedBusinessMissing =
    !!businessId && !businesses.some((b) => b.id === businessId);

  // Person assignment mirrors the business picker exactly (expense-only,
  // appears once a person exists, must allow untagging a deleted person).
  const showPersonPicker =
    type === "expense" && (people.length > 0 || !!personId);
  const assignedPersonMissing =
    !!personId && !people.some((p) => p.id === personId);

  const validLineCount = useMemo(
    () => lines.filter((line) => parseFloat(line.amount) > 0).length,
    [lines]
  );

  const isValid = validLineCount > 0;

  // Live "set aside $X for taxes" preview for 1099 income - the sum of the
  // valid lines times the entered rate (each saved entry carries the rate,
  // so the per-entry math downstream matches this total).
  const taxSetAsidePreview = useMemo(() => {
    if (type !== "income" || incomeType !== "1099") return 0;
    const total = lines.reduce((sum, line) => {
      const amountNum = parseFloat(line.amount);
      return amountNum > 0 ? sum + amountNum : sum;
    }, 0);
    const rate = clampTaxSetAsideRate(parseFloat(taxSetAsideRate));
    return Math.round(total * rate) / 100;
  }, [incomeType, lines, taxSetAsideRate, type]);

  const updateLine = useCallback(
    (lineId: string, patch: Partial<Pick<EntryLineDraft, "amount" | "description">>) => {
      setLines((prev) =>
        prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
      );
    },
    []
  );

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, createEmptyLine()]);
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((line) => line.id !== lineId);
    });
  }, []);

  /** Add-mode reset to defaults (submit and cancel both go through it). */
  const reset = useCallback(() => {
    const next = entryFormState(null);
    setType(next.type);
    setCategory(next.category);
    setLines(next.lines);
    setYearMonth(next.yearMonth);
    setShowMonthPicker(false);
    setRecurring(next.recurring);
    setRecurrenceInterval(next.recurrenceInterval);
    setRecurrenceDay(next.recurrenceDay);
    setPaymentUrl(next.paymentUrl);
    setLinkedAccountId(next.linkedAccountId);
    setBusinessId(next.businessId);
    setPersonId(next.personId);
    setIncomeType(next.incomeType);
    setRetirementContribution(next.retirementContribution);
    setTaxSetAsideRate(next.taxSetAsideRate);
    setIsPrivate(next.isPrivate);
    // Deliberately does NOT delete staged photo files - submit commits them
    // to the saved entry, so only the cancel path (handleCancel) deletes.
    setAttachments([]);
    setNewlyStagedIds(new Set());
    setStagingSession((s) => s + 1);
  }, []);

  const handleAddSubmit = useCallback(() => {
    if (!onAdd) return;
    const entryDate = buildEntryDateISO(
      yearMonth,
      showDayPicker ? recurrenceDay : DEFAULT_RECURRENCE_DAY
    );
    const normalizedPaymentUrl = showDayPicker
      ? normalizePaymentUrl(paymentUrl) ?? undefined
      : undefined;

    const entryIncomeType = type === "income" ? incomeType : undefined;
    const contributionNum = parseFloat(retirementContribution);
    const entryTaxSetAsideRate =
      entryIncomeType === "1099"
        ? clampTaxSetAsideRate(parseFloat(taxSetAsideRate))
        : undefined;

    const payloads: NewBudgetEntryInput[] = [];
    for (const line of lines) {
      const amountNum = parseFloat(line.amount);
      // NaN-safe: parseFloat("") is NaN and `NaN <= 0` is false, so a bare
      // `<= 0` check would let a blank extra line through as a NaN entry -
      // which would also steal the payloads[0] attachments slot below.
      if (!(amountNum > 0)) continue;

      payloads.push({
        type,
        category,
        amount: amountNum,
        description: line.description.trim() || undefined,
        date: entryDate,
        recurring: recurring || undefined,
        recurrenceInterval: recurring ? recurrenceInterval : undefined,
        paymentUrl: normalizedPaymentUrl,
        linkedAccountId: showAccountPicker ? linkedAccountId : undefined,
        businessId: showBusinessPicker ? businessId : undefined,
        personId: showPersonPicker ? personId : undefined,
        incomeType: entryIncomeType,
        taxSetAsideRate: entryTaxSetAsideRate,
        isPrivate: isPrivate || undefined,
        // Photos land on the FIRST valid line (the UI hints at this when
        // multiple lines are open).
        attachments: undefined,
      });
    }

    if (payloads.length === 0) return;
    if (attachments.length > 0) {
      payloads[0] = { ...payloads[0], attachments };
    }
    // Like photos, the 401(k) contribution lands on the FIRST valid line -
    // it was withheld once from one paycheck, so duplicating it across
    // extra lines would double-count the monthly rollup.
    if (entryIncomeType === "w2" && contributionNum > 0) {
      payloads[0] = { ...payloads[0], retirementContribution: contributionNum };
    }

    onAdd(payloads);
    reset();
  }, [
    attachments,
    businessId,
    category,
    incomeType,
    isPrivate,
    lines,
    linkedAccountId,
    onAdd,
    paymentUrl,
    personId,
    recurring,
    recurrenceDay,
    recurrenceInterval,
    reset,
    retirementContribution,
    showAccountPicker,
    showBusinessPicker,
    showDayPicker,
    showPersonPicker,
    taxSetAsideRate,
    type,
    yearMonth,
  ]);

  const handleEditSave = useCallback(() => {
    if (!entry || !onSave || !isValid) return;
    const line = lines[0];
    const amountNum = parseFloat(line?.amount ?? "");
    if (!(amountNum > 0)) return;

    const entryIncomeType = type === "income" ? incomeType : undefined;
    const contributionNum = parseFloat(retirementContribution);

    onSave({
      ...entry,
      type,
      category,
      amount: amountNum,
      description: line.description.trim() || undefined,
      date: buildEntryDateISO(
        yearMonth,
        showDayPicker ? recurrenceDay : dayOfMonthFromIso(entry.date)
      ),
      recurring: recurring || undefined,
      recurrenceInterval: recurring ? recurrenceInterval : undefined,
      paymentUrl: showDayPicker
        ? normalizePaymentUrl(paymentUrl) ?? undefined
        : undefined,
      linkedAccountId: showAccountPicker ? linkedAccountId : undefined,
      // Cleared when the type flips to income (mirrors linkedAccountId).
      businessId: type === "expense" ? businessId : undefined,
      personId: type === "expense" ? personId : undefined,
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
      isPrivate: isPrivate || undefined,
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
    attachments,
    businessId,
    category,
    entry,
    incomeType,
    isPrivate,
    isValid,
    lines,
    linkedAccountId,
    onSave,
    paymentUrl,
    personId,
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
   * them - Cancel restored the reference). In add mode every staged photo
   * is "added this session", so this deletes them all - the entry they
   * would have belonged to was never created.
   */
  const handleCancel = useCallback(() => {
    if (newlyStagedIds.size > 0) {
      void deleteAttachmentFiles(Array.from(newlyStagedIds));
      setNewlyStagedIds(new Set());
    }
    if (isEdit) {
      setStagingSession((s) => s + 1);
    } else {
      reset();
    }
    onClose();
  }, [isEdit, newlyStagedIds, onClose, reset]);

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

  const handleDelete = useCallback(() => {
    if (!entry || !onDelete) return;
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
    if (!isEdit) return;
    InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
  }, [isEdit]);

  const addButtonLabel =
    validLineCount <= 1 ? "Add Entry" : `Add ${validLineCount} Entries`;

  if (isEdit && !entry) return null;

  const formBody = (
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
            W-2 tracks your take-home paycheck and 401(k). 1099 shows how much
            of each payment to set aside for taxes.
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
                    incomeType === opt.value && styles.categoryPillTextActive,
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
            {isEdit
              ? "The amount below is your take-home (net) pay. If part of this paycheck went to a 401(k), record it here - it's tracked separately, not added to income."
              : "Enter your take-home (net) pay as the amount below. If part of this paycheck went to a 401(k), record it here - it's tracked separately, not added to income."}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={retirementContribution}
            onChangeText={setRetirementContribution}
            keyboardType="decimal-pad"
          />
          {validLineCount > 1 && parseFloat(retirementContribution) > 0 && (
            <Text style={styles.linesHint}>
              The 401(k) amount attaches to the first entry.
            </Text>
          )}
        </View>
      )}

      {type === "income" && incomeType === "1099" && (
        <View style={styles.field}>
          <Text style={styles.label}>TAX SET-ASIDE PERCENT</Text>
          <Text style={styles.accountPickerHint}>
            Nothing is withheld from 1099 pay, so set a slice aside for
            end-of-year taxes. 25-30% is a common starting point.
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
              Set aside {formatCurrency(taxSetAsidePreview)} of this for taxes.
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
          pinCurrentValue={isEdit}
        />
      </View>

      {isEdit ? (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>AMOUNT</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={lines[0]?.amount ?? ""}
              onChangeText={(text) =>
                lines[0] && updateLine(lines[0].id, { amount: text })
              }
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Grocery run, Netflix, etc."
              placeholderTextColor={colors.textMuted}
              value={lines[0]?.description ?? ""}
              onChangeText={(text) =>
                lines[0] && updateLine(lines[0].id, { description: text })
              }
              maxLength={100}
            />
          </View>
        </>
      ) : (
        <View style={styles.field}>
          <View style={styles.linesHeader}>
            <Text style={styles.label}>ENTRIES</Text>
            <TouchableOpacity
              style={styles.addLineButton}
              onPress={addLine}
              accessibilityLabel="Add another entry line"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.addLineButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.linesHint}>
            Add multiple amounts for the same category (e.g. several grocery
            purchases from a bank statement).
          </Text>
          {lines.map((line, index) => (
            <View key={line.id} style={styles.lineCard}>
              <View style={styles.lineCardHeader}>
                <Text style={styles.lineCardLabel}>
                  {lines.length > 1 ? `Entry ${index + 1}` : "Amount"}
                </Text>
                {lines.length > 1 ? (
                  <TouchableOpacity
                    onPress={() => removeLine(line.id)}
                    accessibilityLabel={`Remove entry ${index + 1}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removeLineText}>×</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={line.amount}
                onChangeText={(text) => updateLine(line.id, { amount: text })}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, styles.lineDescriptionInput]}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textMuted}
                value={line.description}
                onChangeText={(text) => updateLine(line.id, { description: text })}
                maxLength={100}
              />
            </View>
          ))}
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>MONTH</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowMonthPicker(true)}
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
            This entry will repeat from the start month onward at the frequency
            you choose below.
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.recurringRow}
        onPress={() => setIsPrivate((prev) => !prev)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.recurringToggle,
            isPrivate && {
              backgroundColor: colors.accent,
              borderColor: colors.accent,
            },
          ]}
        >
          {isPrivate && <Text style={styles.recurringCheck}>✓</Text>}
        </View>
        <View style={styles.recurringTextWrap}>
          <Text style={styles.recurringLabel}>🔒 Private</Text>
          <Text style={styles.recurringHint}>
            Never syncs to your partner's device. Still counts in your budget
            and rides your own backups and exports.
            {isEdit && !entry?.isPrivate && isPrivate
              ? " If this entry synced before, your partner keeps the copy they already have."
              : ""}
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
            Link to the payment site for this bill. https:// is added if you
            leave it off.
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
                style={[styles.dayBtn, recurrenceDay === day && styles.dayBtnActive]}
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
            {isEdit
              ? "Tag this expense to a business for the tax-time report."
              : "Tag this expense to a business for the tax-time report. It still counts in your personal budget."}
          </Text>
          <View style={styles.categoryWrap}>
            <TouchableOpacity
              style={[styles.categoryPill, !businessId && styles.categoryPillActive]}
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

      {showPersonPicker && (
        <View style={styles.field}>
          <Text style={styles.label}>PERSON (OPTIONAL)</Text>
          <Text style={styles.accountPickerHint}>
            Assign this spending to someone so it's clear who spent it.
          </Text>
          <View style={styles.categoryWrap}>
            <TouchableOpacity
              style={[styles.categoryPill, !personId && styles.categoryPillActive]}
              onPress={() => setPersonId(undefined)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  !personId && styles.categoryPillTextActive,
                ]}
              >
                Unassigned
              </Text>
            </TouchableOpacity>
            {people.map((person) => (
              <TouchableOpacity
                key={person.id}
                style={[
                  styles.categoryPill,
                  personId === person.id && styles.categoryPillActive,
                ]}
                onPress={() => setPersonId(person.id)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    personId === person.id && styles.categoryPillTextActive,
                  ]}
                >
                  👤 {person.name}
                </Text>
              </TouchableOpacity>
            ))}
            {assignedPersonMissing && (
              <TouchableOpacity
                style={[styles.categoryPill, styles.categoryPillActive]}
                onPress={() => setPersonId(undefined)}
              >
                <Text style={[styles.categoryPillText, styles.categoryPillTextActive]}>
                  👤 (deleted person)
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
      {!isEdit && attachments.length > 0 && validLineCount > 1 && (
        <Text style={styles.linesHint}>Photos attach to the first entry.</Text>
      )}
    </>
  );

  return (
    <>
      <Modal
        visible={isEdit ? !!entry : visible}
        animationType="slide"
        transparent
        onRequestClose={handleCancel}
        onShow={handleShow}
      >
        <SheetKeyboardAvoider style={styles.overlay}>
          {isEdit ? (
            <>
              {/* Tap-to-dismiss area above the sheet */}
              <Pressable style={styles.backdrop} onPress={handleCancel} />

              <View style={styles.editSheet}>
                <ScrollView
                  contentContainerStyle={[
                    styles.editScroll,
                    { paddingBottom: Math.max(insets.bottom, 16) },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  automaticallyAdjustKeyboardInsets
                >
                  <Text style={styles.title}>Edit Entry</Text>
                  <Text style={styles.subtitle}>
                    Update or delete this budget entry.
                  </Text>

                  {ready ? (
                    <>
                      {formBody}

                      <View style={styles.editButtonRow}>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={handleDelete}
                        >
                          <Text style={styles.deleteText}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={handleCancel}
                        >
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.submitButton,
                            !isValid && styles.submitButtonDisabled,
                          ]}
                          onPress={handleEditSave}
                          disabled={!isValid}
                        >
                          <Text style={styles.submitButtonText}>Save</Text>
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
            </>
          ) : (
            /* Add sheet - fills from near top to bottom, buttons pinned */
            <View style={styles.addSheet}>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.addScroll}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
              >
                <Text style={styles.title}>Add Budget Entry</Text>
                <Text style={styles.subtitle}>
                  Track income and expenses by category.
                </Text>

                {formBody}
              </ScrollView>

              {/* Action buttons - pinned at bottom, always visible above keyboard */}
              <View
                style={[
                  styles.addButtonRow,
                  Platform.OS === "android" && insets.bottom > 0
                    ? { paddingBottom: insets.bottom + 12 }
                    : null,
                ]}
              >
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
                  onPress={handleAddSubmit}
                  disabled={!isValid}
                >
                  <Text style={styles.submitButtonText}>{addButtonLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SheetKeyboardAvoider>
      </Modal>

      <MonthYearPicker
        visible={showMonthPicker}
        value={yearMonth}
        onSelect={setYearMonth}
        onClose={() => setShowMonthPicker(false)}
      />
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
    /* Add mode: full-height sheet with the button row outside the scroll. */
    addSheet: {
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
    addScroll: {
      padding: 24,
      gap: 14,
      // Extra room so the last fields can scroll clear of the keyboard.
      paddingBottom: 56,
    },
    /* Edit mode: 85% sheet under a tap-to-dismiss backdrop. */
    editSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      maxHeight: "85%",
    },
    editScroll: {
      padding: 24,
      gap: 14,
    },
    loadingPlaceholder: {
      alignItems: "center",
      paddingVertical: 40,
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
    linesHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    addLineButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}18`,
      alignItems: "center",
      justifyContent: "center",
    },
    addLineButtonText: {
      color: colors.accent,
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 20,
      marginTop: -1,
    },
    linesHint: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    lineCard: {
      gap: 8,
      paddingTop: 4,
    },
    lineCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    lineCardLabel: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    removeLineText: {
      color: colors.textMuted,
      fontSize: 22,
      fontWeight: "600",
      lineHeight: 24,
      paddingHorizontal: 4,
    },
    lineDescriptionInput: {
      marginTop: 0,
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

    /* Add mode: pinned outside the ScrollView, above the keyboard. */
    addButtonRow: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    /* Edit mode: inline at the end of the scroll, with Delete. */
    editButtonRow: {
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
    submitButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    submitButtonDisabled: {
      opacity: 0.4,
    },
    submitButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
  });

export default React.memo(BudgetEntryModal);
