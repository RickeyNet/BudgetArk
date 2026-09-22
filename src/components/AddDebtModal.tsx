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

import React, { useState, useCallback, useEffect } from "react";
import {
  Alert,
  Linking,
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
import { useTranslation } from "react-i18next";
import {
  DEBT_CLASS_OPTIONS,
  DEBT_OWNER_OPTIONS,
  Debt,
  DebtClass,
  DebtOwner,
  ExternalAccountLink,
  NewDebtInput,
} from "../types";
import { calcPaymentForGoalDate, calcMonthsUntilDate } from "../utils/calculations";
import { DEFAULT_DEBT_PAYMENT_DUE_DAY } from "../utils/debtDueCalendar";
import {
  KEEP_ALIVE_DEFAULT_LEAD_DAYS,
  KEEP_ALIVE_DEFAULT_WINDOW_MONTHS,
  getEffectiveKeepAliveLeadDays,
  getEffectiveKeepAliveWindowMonths,
} from "../utils/cardKeepAlive";
import { getLinks } from "../storage/externalAccountLinksStorage";
import { debtBalanceFromProvider } from "../services/connections/debtBalances";
import { ensureCardKeepAlivePermissions } from "../notifications/cardKeepAliveReminders";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";

import { parseMoneyInput } from "../utils/parseMoneyInput";
import { sanitizeTextInput } from "../utils/sanitize";
import { useValueChanged } from "../hooks/useValueChanged";
import MonthYearPicker from "./MonthYearPicker";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";

/**
 * Bank-link side effects the parent screen owns: the link row lives in
 * externalAccountLinksStorage (per-device), not on the Debt, and on add the
 * screen is the one that knows the new debt's id. `linkId` null = not
 * connected (clear any link pointing at this debt); `updateBalance` is the
 * link's balance-mirroring toggle (keep-alive stamping rides the same link
 * whenever the watch is on). Undefined extras = not a personal-credit card,
 * leave links untouched.
 */
export interface DebtBankLinkExtras {
  linkId: string | null;
  updateBalance: boolean;
}

/** "Jun 25" (in the app language) for a link's lastExternalBalanceAt, or null when unknown. */
const formatBankAsOfDate = (iso: string | undefined, locale: string): string | null => {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  try {
    return parsed.toLocaleDateString(locale, { month: "short", day: "numeric" });
  } catch {
    return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
};

/** "Jul 2026" (in the app language) for a "YYYY-MM" goal month. */
const formatGoalMonth = (yearMonth: string, locale: string): string => {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return yearMonth;
  }
  const date = new Date(year, monthIndex, 1);
  try {
    return date.toLocaleDateString(locale, { month: "short", year: "numeric" });
  } catch {
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }
};

/* ─── Props Interface ─── */
interface AddDebtModalProps {
  /** Whether the modal is currently visible */
  visible: boolean;

  /** Callback to close the modal */
  onClose: () => void;

  /** Callback when user submits a valid debt - receives the form data */
  onAdd: (debt: NewDebtInput, keepAlive?: DebtBankLinkExtras) => void;

  /** Optional existing debt to edit - when set, modal acts as an editor */
  editDebt?: Debt | null;

  /** Callback when user saves edits to an existing debt */
  onEdit?: (
    debtId: string,
    updates: Partial<Debt>,
    keepAlive?: DebtBankLinkExtras
  ) => void;
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
  keepAliveEnabled: boolean;
  keepAliveWindowMonths: number;
  keepAliveLeadDays: number;
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
  keepAliveEnabled: editDebt?.keepAliveEnabled === true,
  keepAliveWindowMonths: editDebt
    ? getEffectiveKeepAliveWindowMonths(editDebt)
    : KEEP_ALIVE_DEFAULT_WINDOW_MONTHS,
  keepAliveLeadDays: editDebt
    ? getEffectiveKeepAliveLeadDays(editDebt)
    : KEEP_ALIVE_DEFAULT_LEAD_DAYS,
});

/** Window chips offered in the UI (months of allowed inactivity). */
const KEEP_ALIVE_WINDOW_CHOICES = [3, 6, 12, 24] as const;

/** Lead-time chips offered in the UI (days of warning before the deadline). */
const KEEP_ALIVE_LEAD_CHOICES = [14, 30, 60] as const;

/* ─── Component ─── */
const AddDebtModal: React.FC<AddDebtModalProps> = ({
  visible,
  onClose,
  onAdd,
  editDebt,
  onEdit,
}) => {
  const { t, i18n } = useTranslation();
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
  const [keepAliveEnabled, setKeepAliveEnabled] = useState(
    initialForm.keepAliveEnabled
  );
  const [keepAliveWindowMonths, setKeepAliveWindowMonths] = useState(
    initialForm.keepAliveWindowMonths
  );
  const [keepAliveLeadDays, setKeepAliveLeadDays] = useState(
    initialForm.keepAliveLeadDays
  );
  // Connected-account links, for the "this bank account is this card"
  // picker. Loaded per open; selection is seeded from whichever link already
  // points at the debt being edited. null = not connected.
  const [accountLinks, setAccountLinks] = useState<ExternalAccountLink[]>([]);
  const [bankLinkId, setBankLinkId] = useState<string | null>(null);
  // Balance half of the link (ExternalAccountLink.updateDebtBalance): on by
  // default, and undefined on a stored link counts as on.
  const [bankUpdateBalance, setBankUpdateBalance] = useState(true);
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
    setKeepAliveEnabled(next.keepAliveEnabled);
    setKeepAliveWindowMonths(next.keepAliveWindowMonths);
    setKeepAliveLeadDays(next.keepAliveLeadDays);
  }

  // Load connected-account links each time the modal opens and seed the
  // picker with whichever link already feeds this debt. Async by necessity
  // (storage read), unlike the render-time form reset above.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void getLinks()
      .then((links) => {
        if (cancelled) return;
        setAccountLinks(links);
        const linked = editDebt
          ? links.find((l) => l.debtId === editDebt.id)
          : undefined;
        setBankLinkId(linked?.id ?? null);
        setBankUpdateBalance(linked ? linked.updateDebtBalance !== false : true);
      })
      .catch(() => {
        if (!cancelled) setAccountLinks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, editDebt]);

  const isCreditCard = debtClass === "personal_credit";

  /**
   * The connected account chosen for this card and, when its balance half
   * is on and the bank has reported a balance, the amount owed the bank
   * last saw. Non-null means the balance field is read-only: the bank owns
   * it from here (and re-owns it on every sync), so a typed number the next
   * sync would overwrite is not offered.
   */
  const bankLink = React.useMemo(
    () =>
      isCreditCard
        ? (accountLinks.find((l) => l.id === bankLinkId) ?? null)
        : null,
    [isCreditCard, accountLinks, bankLinkId]
  );
  const bankBalance = React.useMemo(
    () =>
      bankLink &&
      bankUpdateBalance &&
      typeof bankLink.lastExternalBalance === "number" &&
      Number.isFinite(bankLink.lastExternalBalance)
        ? debtBalanceFromProvider(bankLink.lastExternalBalance)
        : null,
    [bankLink, bankUpdateBalance]
  );

  const bankAsOfDate = bankLink
    ? formatBankAsOfDate(bankLink.lastExternalBalanceAt, i18n.language)
    : null;

  /** Calculate required payment for goal date */
  const goalPaymentInfo = React.useMemo(() => {
    if (!goalMonth) return null;
    const balanceNum = bankBalance ?? parseMoneyInput(balance) ?? NaN;
    const rateNum = parseMoneyInput(rate) ?? NaN;
    if (isNaN(balanceNum) || balanceNum <= 0 || isNaN(rateNum) || rateNum < 0) return null;
    const months = calcMonthsUntilDate(`${goalMonth}-01`);
    if (months <= 0) return null;
    const required = calcPaymentForGoalDate(balanceNum, rateNum, months);
    return { months, required };
  }, [goalMonth, balance, bankBalance, rate]);

  /**
   * Keep-alive toggle. Turning it on asks for notification permission (the
   * scheduled nudges need it), but a denial does NOT block enabling: the
   * in-app banner works without OS notifications, and the alert says so.
   */
  const handleKeepAliveToggle = useCallback(() => {
    if (keepAliveEnabled) {
      setKeepAliveEnabled(false);
      return;
    }
    setKeepAliveEnabled(true);
    void ensureCardKeepAlivePermissions().then((permitted) => {
      if (permitted) return;
      Alert.alert(
        t("debts.form.alerts.notificationsOff.title"),
        t("debts.form.alerts.notificationsOff.message"),
        [
          { text: t("common.ok"), style: "cancel" },
          {
            text: t("debts.form.alerts.notificationsOff.openSettings"),
            onPress: () => void Linking.openSettings(),
          },
        ]
      );
    });
  }, [keepAliveEnabled, t]);

  /**
   * Validates and submits the form.
   * Parses string inputs to numbers, checks all are valid,
   * then calls onAdd/onEdit and resets the form.
   */
  const handleSubmit = useCallback(() => {
    const balanceNum = bankBalance ?? parseMoneyInput(balance) ?? NaN;
    const rateNum = parseMoneyInput(rate) ?? NaN;
    const paymentNum = parseMoneyInput(minPayment) ?? NaN;

    /* Validate: all fields must be filled, finite, and positive. Credit
       cards may be $0 balance / $0 minimum - a paid-off card tracked purely
       for keep-alive is exactly that. */
    if (!name.trim()) return;
    if (!Number.isFinite(balanceNum)) return;
    if (isCreditCard ? balanceNum < 0 : balanceNum <= 0) return;
    if (!Number.isFinite(rateNum) || rateNum < 0) return;
    if (!Number.isFinite(paymentNum)) return;
    if (isCreditCard ? paymentNum < 0 : paymentNum <= 0) return;

    const parsedGoalDate = goalMonth.trim() ? `${goalMonth.trim()}-01` : undefined;

    const paymentDueDayValue = paymentDueDay ?? undefined;

    /**
     * Keep-alive fields ride the debt record (they sync with it). Only
     * written for credit cards; other classes leave whatever is stored
     * untouched (edit) or unset (add). Enable-time anchor: a card enabled
     * with no last-used date is stamped "now" - real activity may predate
     * what a bank sync can see, so starting the clock today is the
     * conservative choice.
     */
    const keepAliveFields: Partial<Debt> = isCreditCard
      ? {
          keepAliveEnabled,
          keepAliveWindowMonths,
          keepAliveLeadDays,
          ...(keepAliveEnabled && !editDebt?.keepAliveLastUsedAt
            ? { keepAliveLastUsedAt: new Date().toISOString() }
            : {}),
        }
      : {};
    const bankLinkExtras: DebtBankLinkExtras | undefined = isCreditCard
      ? { linkId: bankLinkId, updateBalance: bankUpdateBalance }
      : undefined;
    // Bank-owned balance: originalBalance is a high-water mark so the payoff
    // ring can't go negative after new charges (same rule as the sync path).
    const bankOriginalBalance: Partial<Debt> =
      bankBalance !== null && editDebt && bankBalance > editDebt.originalBalance
        ? { originalBalance: bankBalance }
        : {};

    if (isEditing && onEdit && editDebt) {
      onEdit(
        editDebt.id,
        {
          name: name.trim(),
          balance: balanceNum,
          rate: rateNum,
          minPayment: paymentNum,
          goalDate: parsedGoalDate,
          owner,
          debtClass,
          debtClassSource: "manual",
          paymentDueDay: paymentDueDayValue,
          ...keepAliveFields,
          ...bankOriginalBalance,
        },
        bankLinkExtras
      );
    } else {
      onAdd(
        {
          name: name.trim(),
          balance: balanceNum,
          // Older peers' isDebtItem requires originalBalance >= 0.01 and the
          // DebtTracker corrupted-record filter requires > 0, so a $0 card
          // gets the smallest passing value instead of 0.
          originalBalance: balanceNum > 0 ? balanceNum : 0.01,
          rate: rateNum,
          minPayment: paymentNum,
          goalDate: parsedGoalDate,
          owner,
          debtClass,
          debtClassSource: "manual",
          paymentDueDay: paymentDueDayValue,
          ...keepAliveFields,
        },
        bankLinkExtras
      );
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
    setKeepAliveEnabled(false);
    setKeepAliveWindowMonths(KEEP_ALIVE_DEFAULT_WINDOW_MONTHS);
    setKeepAliveLeadDays(KEEP_ALIVE_DEFAULT_LEAD_DAYS);
    setBankLinkId(null);
    setBankUpdateBalance(true);
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
    keepAliveEnabled,
    keepAliveWindowMonths,
    keepAliveLeadDays,
    bankLinkId,
    bankUpdateBalance,
    bankBalance,
    isCreditCard,
    isEditing,
    onEdit,
    editDebt,
  ]);

  /** Check if form is valid (for button state) */
  const balanceParsed = parseMoneyInput(balance) ?? NaN;
  const rateParsed = parseMoneyInput(rate) ?? NaN;
  const minPaymentParsed = parseMoneyInput(minPayment) ?? NaN;
  const balanceValid =
    bankBalance !== null ||
    (Number.isFinite(balanceParsed) &&
      (isCreditCard ? balanceParsed >= 0 : balanceParsed > 0));
  const isValid =
    name.trim().length > 0 &&
    balanceValid &&
    Number.isFinite(rateParsed) && rateParsed >= 0 &&
    Number.isFinite(minPaymentParsed) &&
    (isCreditCard ? minPaymentParsed >= 0 : minPaymentParsed > 0);

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
            <Text style={styles.title}>
              {isEditing ? t("debts.form.title.edit") : t("debts.form.title.add")}
            </Text>
            <Text style={styles.subtitle}>
              {isEditing ? t("debts.form.subtitle.edit") : t("debts.form.subtitle.add")}
            </Text>

            {/* ── Form Fields ── */}
            <View style={styles.fieldGroup}>
              {/* Debt Name */}
              <View style={styles.field}>
                <Text style={styles.label}>{t("debts.form.name.label")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("debts.form.name.placeholder")}
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={(text) => setName(sanitizeTextInput(text))}
                  autoFocus
                  maxLength={50}
                />
              </View>

              {/* Total Balance - read-only while a connected account owns it */}
              <View style={styles.field}>
                <Text style={styles.label}>{t("debts.form.balance.label")}</Text>
                {bankBalance !== null && bankLink ? (
                  <>
                    <View style={[styles.input, styles.bankBalanceBox]}>
                      <Text style={styles.bankBalanceValue}>
                        {formatCurrency(bankBalance)}
                      </Text>
                    </View>
                    <Text style={styles.dueDayHint}>
                      {t("debts.form.balance.fromBank", {
                        account: bankLink.externalName,
                        asOf: bankAsOfDate
                          ? t("debts.form.balance.asOf", { date: bankAsOfDate })
                          : "",
                      })}
                    </Text>
                  </>
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder={t("debts.form.balance.placeholder")}
                    placeholderTextColor={colors.textMuted}
                    value={balance}
                    onChangeText={setBalance}
                    keyboardType="decimal-pad"
                  />
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t("debts.form.owner.label")}</Text>
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
                          {t(`debts.form.owner.options.${option.id}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t("debts.form.type.label")}</Text>
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
                          {t(`debts.form.type.options.${option.id}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* APR and Min Payment (side-by-side) */}
              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>{t("debts.form.apr.label")}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("debts.form.apr.placeholder")}
                    placeholderTextColor={colors.textMuted}
                    value={rate}
                    onChangeText={setRate}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>{t("debts.form.minPayment.label")}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("debts.form.minPayment.placeholder")}
                    placeholderTextColor={colors.textMuted}
                    value={minPayment}
                    onChangeText={setMinPayment}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t("debts.form.dueDay.label")}</Text>
                <Text style={styles.dueDayHint}>{t("debts.form.dueDay.hint")}</Text>
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
                      {t("debts.form.dueDay.useDefault", { day: DEFAULT_DEBT_PAYMENT_DUE_DAY })}
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
                      {t("debts.form.dueDay.custom")}
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
                <Text style={styles.label}>{t("debts.form.goal.label")}</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowMonthPicker(true)}
                >
                  <Text style={{ color: goalMonth ? colors.text : colors.textMuted, fontSize: 15 }}>
                    {goalMonth ? formatGoalMonth(goalMonth, i18n.language) : t("debts.form.goal.selectMonth")}
                  </Text>
                </TouchableOpacity>
                {goalMonth ? (
                  <TouchableOpacity onPress={() => setGoalMonth("")}>
                    <Text style={[styles.goalHint, { color: colors.textMuted }]}>{t("debts.form.goal.clear")}</Text>
                  </TouchableOpacity>
                ) : null}
                {goalPaymentInfo && isFinite(goalPaymentInfo.required) && (
                  <Text style={[styles.goalHint, { color: colors.accent }]}>
                    {t("debts.form.goal.payHint", {
                      amount: formatCurrency(goalPaymentInfo.required),
                      count: goalPaymentInfo.months,
                    })}
                  </Text>
                )}
                {goalPaymentInfo && !isFinite(goalPaymentInfo.required) && (
                  <Text style={[styles.goalHint, { color: colors.danger }]}>
                    {t("debts.form.goal.tooSoon")}
                  </Text>
                )}
              </View>

              {/* ── Connected bank account (credit cards only) ── */}
              {isCreditCard && (
                <View style={styles.field}>
                  <Text style={styles.label}>{t("debts.form.bank.label")}</Text>
                  {accountLinks.length === 0 ? (
                    <Text style={styles.dueDayHint}>{t("debts.form.bank.emptyHint")}</Text>
                  ) : (
                    <>
                      <Text style={styles.dueDayHint}>{t("debts.form.bank.pickHint")}</Text>
                      <View style={styles.keepAliveLinkList}>
                        <TouchableOpacity
                          style={[
                            styles.dueDayModeBtn,
                            bankLinkId === null && styles.dueDayModeBtnActive,
                          ]}
                          onPress={() => setBankLinkId(null)}
                        >
                          <Text
                            style={[
                              styles.dueDayModeBtnText,
                              bankLinkId === null &&
                                styles.dueDayModeBtnTextActive,
                            ]}
                          >
                            {t("debts.form.bank.notConnected")}
                          </Text>
                        </TouchableOpacity>
                        {accountLinks.map((link) => {
                          const selected = bankLinkId === link.id;
                          return (
                            <TouchableOpacity
                              key={link.id}
                              style={[
                                styles.dueDayModeBtn,
                                selected && styles.dueDayModeBtnActive,
                              ]}
                              onPress={() => setBankLinkId(link.id)}
                            >
                              <Text
                                style={[
                                  styles.dueDayModeBtnText,
                                  selected && styles.dueDayModeBtnTextActive,
                                ]}
                                numberOfLines={1}
                              >
                                {link.externalName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {bankLink && (
                        <>
                          <Text style={styles.keepAliveSubLabel}>
                            {t("debts.form.bank.updatesLabel")}
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.dueDayModeBtn,
                              bankUpdateBalance && styles.dueDayModeBtnActive,
                            ]}
                            onPress={() => setBankUpdateBalance((v) => !v)}
                          >
                            <Text
                              style={[
                                styles.dueDayModeBtnText,
                                bankUpdateBalance &&
                                  styles.dueDayModeBtnTextActive,
                              ]}
                            >
                              {bankUpdateBalance
                                ? t("debts.form.bank.balanceOn")
                                : t("debts.form.bank.balanceOff")}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* ── Card Keep-Alive (credit cards only) ── */}
              {isCreditCard && (
                <View style={styles.field}>
                  <Text style={styles.label}>{t("debts.form.keepAlive.label")}</Text>
                  <Text style={styles.dueDayHint}>{t("debts.form.keepAlive.hint")}</Text>
                  <TouchableOpacity
                    style={[
                      styles.dueDayModeBtn,
                      keepAliveEnabled && styles.dueDayModeBtnActive,
                    ]}
                    onPress={handleKeepAliveToggle}
                  >
                    <Text
                      style={[
                        styles.dueDayModeBtnText,
                        keepAliveEnabled && styles.dueDayModeBtnTextActive,
                      ]}
                    >
                      {keepAliveEnabled
                        ? t("debts.form.keepAlive.on")
                        : t("debts.form.keepAlive.off")}
                    </Text>
                  </TouchableOpacity>

                  {keepAliveEnabled && (
                    <>
                      <Text style={styles.keepAliveSubLabel}>
                        {t("debts.form.keepAlive.windowLabel")}
                      </Text>
                      <View style={styles.ownerRow}>
                        {KEEP_ALIVE_WINDOW_CHOICES.map((months) => {
                          const selected = keepAliveWindowMonths === months;
                          return (
                            <TouchableOpacity
                              key={months}
                              style={[
                                styles.dueDayModeBtn,
                                selected && styles.dueDayModeBtnActive,
                              ]}
                              onPress={() => setKeepAliveWindowMonths(months)}
                            >
                              <Text
                                style={[
                                  styles.dueDayModeBtnText,
                                  selected && styles.dueDayModeBtnTextActive,
                                ]}
                              >
                                {t("debts.form.keepAlive.windowChip", { count: months })}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text style={styles.keepAliveSubLabel}>
                        {t("debts.form.keepAlive.leadLabel")}
                      </Text>
                      <View style={styles.ownerRow}>
                        {KEEP_ALIVE_LEAD_CHOICES.map((days) => {
                          const selected = keepAliveLeadDays === days;
                          return (
                            <TouchableOpacity
                              key={days}
                              style={[
                                styles.dueDayModeBtn,
                                selected && styles.dueDayModeBtnActive,
                              ]}
                              onPress={() => setKeepAliveLeadDays(days)}
                            >
                              <Text
                                style={[
                                  styles.dueDayModeBtnText,
                                  selected && styles.dueDayModeBtnTextActive,
                                ]}
                              >
                                {t("debts.form.keepAlive.leadChip", { count: days })}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text style={styles.keepAliveSubLabel}>
                        {t("debts.form.keepAlive.lastUsedLabel")}
                      </Text>
                      <Text style={styles.dueDayHint}>
                        {bankLink
                          ? t("debts.form.keepAlive.lastUsedLinked", { account: bankLink.externalName })
                          : accountLinks.length > 0
                            ? t("debts.form.keepAlive.lastUsedWithLinks")
                            : t("debts.form.keepAlive.lastUsedNoLinks")}
                      </Text>
                    </>
                  )}
                </View>
              )}
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
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.addButton,
                !isValid && styles.addButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isValid}
            >
              <Text style={styles.addButtonText}>
                {isEditing ? t("debts.form.buttons.saveChanges") : t("debts.form.buttons.addDebt")}
              </Text>
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
        title={t("debts.form.goal.pickerTitle")}
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
      backgroundColor: colors.overlayStrong,
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
    keepAliveSubLabel: {
      fontSize: 10,
      color: colors.textMuted,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginTop: 10,
      marginBottom: 6,
    },
    keepAliveLinkList: {
      gap: 8,
    },
    bankBalanceBox: {
      justifyContent: "center",
    },
    bankBalanceValue: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
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
