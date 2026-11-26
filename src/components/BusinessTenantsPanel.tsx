/**
 * BudgetArk - Business Tenants
 * File: src/components/BusinessTenantsPanel.tsx
 *
 * The rent roll of one business (a rental property): its tenants, each
 * one's monthly rent, what they owe right now, the month-by-month record
 * a quick "log payment", late fees / one-off charges, and a catch-up that
 * adds a back-dated tenant's past payments in one go. All arithmetic is utils/tenants - rent falls
 * due every month and income tagged to the tenant pays it down, so a short
 * payment simply leaves the rest owing.
 *
 * Deliberately a panel, not its own Modal: it renders INSIDE the Manage
 * Businesses sheet in place of the list, so opening it never presents a
 * second Modal over the first (the iOS silent-present rule).
 *
 * A payment logged here is an ordinary income entry tagged to the business
 * and the tenant - the same record the entry form and the Review Inbox
 * create - so it shows in the budget and the business report with no
 * second ledger to keep in step.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useCurrency } from "../currency/CurrencyProvider";
import { useBusinesses } from "../people/PeopleProvider";
import { addBudgetEntries, addBudgetEntry } from "../storage/budgetStorage";
import type { BudgetEntry, Business, RentTerm, Tenant } from "../types";
import {
  MAX_TENANT_CHARGE_NOTE_LENGTH,
  MAX_TENANT_NAME_LENGTH,
  MAX_TENANTS_PER_BUSINESS,
} from "../types";
import {
  addTenantCharge,
  removeTenantCharge,
  buildRentRoll,
  buildTenant,
  buildTenantLedger,
  businessTenants,
  currentRent,
  isMonthKey,
  MAX_PAST_PAYMENTS,
  MAX_RENT_AMOUNT,
  planPastPayments,
  removeTenant,
  setRentFrom,
  upsertTenant,
  type PastPayment,
  type TenantLedger,
} from "../utils/tenants";
import { formatMonthKeyLabel, getMonthKey } from "../utils/budgetMonths";
import { formatDayLabel } from "../utils/dateFormat";
import { parseMoneyInput } from "../utils/parseMoneyInput";
import { toLocalDateKey } from "../utils/paycheckCycle";
import { generateUUID } from "../utils/uuid";
import { triggerHaptic } from "../utils/haptics";
import { describeError } from "../utils/errorMessage";

interface BusinessTenantsPanelProps {
  business: Business;
  /** Live budget entries - payments are read from these. */
  entries: readonly BudgetEntry[];
  /** Re-read entries after a payment is logged. */
  onEntriesChanged: () => Promise<void>;
  onBack: () => void;
}

interface TenantForm {
  /** null = adding a new tenant. */
  id: string | null;
  name: string;
  /** New tenant: the rent. Existing tenant: an optional rent change. */
  rent: string;
  /** Month the rent above starts (YYYY-MM). */
  from: string;
  dueDay: string;
  opening: string;
  endMonth: string;
  /** New tenant only: last month already paid in full (YYYY-MM), optional. */
  paidThrough: string;
  /** Existing tenant's rent terms as edited so far. */
  terms: RentTerm[];
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Months shown in a tenant's history before "unpaid only" older ones. */
const HISTORY_MONTHS = 12;

const BusinessTenantsPanel: React.FC<BusinessTenantsPanelProps> = ({
  business,
  entries,
  onEntriesChanged,
  onBack,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const { formatCurrency } = useCurrency();
  const { updateBusiness } = useBusinesses();

  const [form, setForm] = useState<TenantForm | null>(null);
  const [paymentFor, setPaymentFor] = useState<string | null>(null);
  /** Tenant whose "add charge" form (late fee / one-off) is open. */
  const [chargeFor, setChargeFor] = useState<string | null>(null);
  /** Tenant whose "add past payments" catch-up form is open. */
  const [pastFor, setPastFor] = useState<string | null>(null);
  const [draftThrough, setDraftThrough] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tenants = useMemo(() => businessTenants(business), [business]);
  const roll = useMemo(() => buildRentRoll(business, entries), [business, entries]);

  const openAdd = useCallback(() => {
    setForm({
      id: null,
      name: "",
      rent: "",
      from: getMonthKey(),
      dueDay: "1",
      opening: "",
      endMonth: "",
      paidThrough: "",
      terms: [],
    });
    setPaymentFor(null);
    setChargeFor(null);
    setPastFor(null);
    setError(null);
  }, []);

  const openEdit = useCallback((ledger: TenantLedger) => {
    const { tenant } = ledger;
    setForm({
      id: tenant.id,
      name: tenant.name,
      rent: "",
      from: getMonthKey(),
      dueDay: String(tenant.dueDay ?? 1),
      opening: tenant.openingBalance ? String(tenant.openingBalance) : "",
      endMonth: tenant.endMonth ?? "",
      paidThrough: "",
      terms: tenant.rents,
    });
    setPaymentFor(null);
    setChargeFor(null);
    setPastFor(null);
    setError(null);
  }, []);

  const closeForm = useCallback(() => {
    setForm(null);
    setError(null);
  }, []);

  const patchForm = useCallback((patch: Partial<TenantForm>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    setError(null);
  }, []);

  const saveTenants = useCallback(
    async (next: ReturnType<typeof businessTenants>): Promise<boolean> => {
      const result = await updateBusiness(business.id, { tenants: next });
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      return true;
    },
    [business.id, updateBusiness]
  );

  /** Write a catch-up plan as ordinary rent payments (one atomic save). */
  const savePastPayments = useCallback(
    async (tenant: Tenant, plan: readonly PastPayment[]) => {
      const now = new Date().toISOString();
      await addBudgetEntries(
        plan.map((item) => ({
          id: generateUUID(),
          type: "income" as const,
          category: "Other",
          amount: item.amount,
          description: t("modals.people.tenants.paymentDescription", {
            name: tenant.name,
          }),
          // Noon UTC like every manual entry (see utils/entryDate).
          date: `${item.date}T12:00:00.000Z`,
          createdAt: now,
          updatedAt: now,
          businessId: business.id,
          tenantId: tenant.id,
        }))
      );
      await onEntriesChanged();
    },
    [business.id, onEntriesChanged, t]
  );

  const handleSaveTenant = useCallback(async () => {
    if (!form || busy) return;
    const rentText = form.rent.trim();
    const rentAmount = rentText ? parseMoneyInput(rentText) : null;
    let terms = form.terms;
    // A new tenant needs a rent; an existing one only when changing it.
    if (form.id === null || rentText) {
      if (rentAmount === null || !(rentAmount > 0) || rentAmount > MAX_RENT_AMOUNT) {
        setError(t("modals.people.tenants.errors.rentRequired"));
        return;
      }
      const from = form.from.trim();
      if (!isMonthKey(from)) {
        setError(t("modals.people.tenants.errors.monthFormat"));
        return;
      }
      terms = setRentFrom(terms, from, rentAmount);
    }
    const dueDay = Number(form.dueDay.trim() || "1");
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      setError(t("modals.people.tenants.errors.dueDay"));
      return;
    }
    const openingText = form.opening.trim();
    const opening = openingText ? parseMoneyInput(openingText) : 0;
    if (opening === null || opening < 0 || opening > MAX_RENT_AMOUNT) {
      setError(t("modals.people.tenants.errors.opening"));
      return;
    }
    const endMonth = form.endMonth.trim();
    if (endMonth && !isMonthKey(endMonth)) {
      setError(t("modals.people.tenants.errors.monthFormat"));
      return;
    }
    if (endMonth && terms.length > 0 && endMonth < terms[0].from) {
      setError(t("modals.people.tenants.errors.endBeforeStart"));
      return;
    }
    const existing = form.id ? tenants.find((tenant) => tenant.id === form.id) : undefined;
    const built = buildTenant({
      id: form.id ?? generateUUID(),
      name: form.name,
      rents: terms,
      dueDay,
      openingBalance: opening,
      endMonth: endMonth || undefined,
      // Late fees / charges are edited on the card, not in this form.
      charges: existing?.charges,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
    if (!built) {
      setError(t("modals.people.tenants.errors.nameRequired"));
      return;
    }
    const next = upsertTenant(tenants, built);
    if (!next) {
      setError(t("modals.people.tenants.errors.limit", { max: MAX_TENANTS_PER_BUSINESS }));
      return;
    }
    // A back-dated new tenant can be marked paid through a month: the
    // plan is worked out before anything is saved so a bad month or an
    // oversized catch-up stops here.
    const paidThrough = form.id === null ? form.paidThrough.trim() : "";
    let pastPlan: PastPayment[] = [];
    if (paidThrough) {
      if (!isMonthKey(paidThrough)) {
        setError(t("modals.people.tenants.errors.monthFormat"));
        return;
      }
      pastPlan = planPastPayments(
        buildTenantLedger(built, business.id, entries),
        paidThrough
      );
      if (pastPlan.length > MAX_PAST_PAYMENTS) {
        setError(t("modals.people.tenants.errors.tooManyPast", { max: MAX_PAST_PAYMENTS }));
        return;
      }
    }
    setBusy(true);
    try {
      if (await saveTenants(next)) {
        setForm(null);
        if (pastPlan.length > 0) {
          try {
            await savePastPayments(built, pastPlan);
          } catch (err) {
            // The tenant is saved; only the payments failed. They can be
            // added again from "Add past payments" on the card.
            triggerHaptic("error");
            setError(describeError(err, t("modals.people.tenants.errors.paymentFailed")));
            return;
          }
        }
        triggerHaptic("success");
      }
    } catch (err) {
      setError(describeError(err, t("modals.people.tenants.errors.save")));
    } finally {
      setBusy(false);
    }
  }, [business.id, busy, entries, form, savePastPayments, saveTenants, t, tenants]);

  const handleRemoveTenant = useCallback(
    (ledger: TenantLedger) => {
      Alert.alert(
        t("modals.people.tenants.deleteConfirm.title"),
        t("modals.people.tenants.deleteConfirm.message", { name: ledger.tenant.name }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.remove"),
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  if (await saveTenants(removeTenant(tenants, ledger.tenant.id))) {
                    setForm(null);
                  }
                } catch (err) {
                  setError(describeError(err, t("modals.people.tenants.errors.save")));
                }
              })();
            },
          },
        ]
      );
    },
    [saveTenants, t, tenants]
  );

  const openPayment = useCallback((ledger: TenantLedger) => {
    setPaymentFor(ledger.tenant.id);
    setDraftAmount(
      String(ledger.outstanding > 0 ? ledger.outstanding : currentRent(ledger.tenant))
    );
    setDraftDate(toLocalDateKey(new Date()));
    setForm(null);
    setChargeFor(null);
    setPastFor(null);
    setError(null);
  }, []);

  const openCharge = useCallback(
    (ledger: TenantLedger) => {
      setChargeFor(ledger.tenant.id);
      // A late fee is the common case; the label is editable.
      setDraftNote(t("modals.people.tenants.lateFee"));
      setDraftAmount("");
      setDraftDate(toLocalDateKey(new Date()));
      setForm(null);
      setPaymentFor(null);
      setPastFor(null);
      setError(null);
    },
    [t]
  );

  const openPast = useCallback((ledger: TenantLedger) => {
    setPastFor(ledger.tenant.id);
    // Default: everything due so far.
    const last = ledger.months[ledger.months.length - 1];
    setDraftThrough(last ? last.monthKey : getMonthKey());
    setForm(null);
    setPaymentFor(null);
    setChargeFor(null);
    setError(null);
  }, []);

  const handleSavePast = useCallback(
    async (ledger: TenantLedger) => {
      if (busy) return;
      const through = draftThrough.trim();
      if (!isMonthKey(through)) {
        setError(t("modals.people.tenants.errors.monthFormat"));
        return;
      }
      const plan = planPastPayments(ledger, through);
      if (plan.length === 0) {
        setError(t("modals.people.tenants.past.nothing"));
        return;
      }
      if (plan.length > MAX_PAST_PAYMENTS) {
        setError(t("modals.people.tenants.errors.tooManyPast", { max: MAX_PAST_PAYMENTS }));
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await savePastPayments(ledger.tenant, plan);
        setPastFor(null);
        triggerHaptic("success");
      } catch (err) {
        triggerHaptic("error");
        setError(describeError(err, t("modals.people.tenants.errors.paymentFailed")));
      } finally {
        setBusy(false);
      }
    },
    [busy, draftThrough, savePastPayments, t]
  );

  const handleSaveCharge = useCallback(
    async (ledger: TenantLedger) => {
      if (busy) return;
      const amount = parseMoneyInput(draftAmount) ?? 0;
      if (!(amount > 0) || amount > MAX_RENT_AMOUNT) {
        setError(t("modals.people.tenants.errors.chargeAmount"));
        return;
      }
      const next = addTenantCharge(ledger.tenant, {
        id: generateUUID(),
        date: draftDate.trim(),
        amount,
        note: draftNote,
        createdAt: new Date().toISOString(),
      });
      if (!next) {
        // Amount is valid, so what is left is the date (or the cap).
        setError(t("modals.people.tenants.errors.dateFormat"));
        return;
      }
      const list = upsertTenant(tenants, next);
      if (!list) return;
      setBusy(true);
      setError(null);
      try {
        if (await saveTenants(list)) {
          setChargeFor(null);
          triggerHaptic("success");
        }
      } catch (err) {
        triggerHaptic("error");
        setError(describeError(err, t("modals.people.tenants.errors.save")));
      } finally {
        setBusy(false);
      }
    },
    [busy, draftAmount, draftDate, draftNote, saveTenants, t, tenants]
  );

  const handleRemoveCharge = useCallback(
    async (ledger: TenantLedger, chargeId: string) => {
      if (busy) return;
      const list = upsertTenant(tenants, removeTenantCharge(ledger.tenant, chargeId));
      if (!list) return;
      setBusy(true);
      setError(null);
      try {
        if (await saveTenants(list)) triggerHaptic("selection");
      } catch (err) {
        setError(describeError(err, t("modals.people.tenants.errors.save")));
      } finally {
        setBusy(false);
      }
    },
    [busy, saveTenants, t, tenants]
  );

  const handleSavePayment = useCallback(
    async (ledger: TenantLedger) => {
      if (busy) return;
      const amount = parseMoneyInput(draftAmount) ?? 0;
      if (!(amount > 0)) {
        setError(t("modals.people.tenants.errors.amountRequired"));
        return;
      }
      const dateKey = draftDate.trim();
      if (!DATE_KEY_RE.test(dateKey) || !Number.isFinite(Date.parse(dateKey))) {
        setError(t("modals.people.tenants.errors.dateFormat"));
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const now = new Date().toISOString();
        await addBudgetEntry({
          id: generateUUID(),
          type: "income",
          category: "Other",
          amount,
          description: t("modals.people.tenants.paymentDescription", {
            name: ledger.tenant.name,
          }),
          // Noon UTC like every manual entry (see utils/entryDate).
          date: `${dateKey}T12:00:00.000Z`,
          createdAt: now,
          updatedAt: now,
          businessId: business.id,
          tenantId: ledger.tenant.id,
        });
        await onEntriesChanged();
        setPaymentFor(null);
        triggerHaptic("success");
      } catch (err) {
        triggerHaptic("error");
        setError(describeError(err, t("modals.people.tenants.errors.paymentFailed")));
      } finally {
        setBusy(false);
      }
    },
    [business.id, busy, draftAmount, draftDate, onEntriesChanged, t]
  );

  const renderForm = () => {
    if (!form) return null;
    const isNew = form.id === null;
    return (
      <View style={styles.formCard}>
        <Text style={styles.label}>{t("modals.people.tenants.form.nameLabel")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("modals.people.tenants.form.namePlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={form.name}
          onChangeText={(name) => patchForm({ name })}
          maxLength={MAX_TENANT_NAME_LENGTH}
        />

        {!isNew && form.terms.length > 0 ? (
          <>
            <Text style={styles.label}>{t("modals.people.tenants.form.rentHistoryLabel")}</Text>
            {form.terms.map((term) => (
              <View key={term.from} style={styles.termRow}>
                <Text style={styles.termText}>
                  {t("modals.people.tenants.form.rentTerm", {
                    rent: formatCurrency(term.amount),
                    month: formatMonthKeyLabel(term.from),
                  })}
                </Text>
                {form.terms.length > 1 ? (
                  <TouchableOpacity
                    onPress={() =>
                      patchForm({
                        terms: form.terms.filter((other) => other.from !== term.from),
                      })
                    }
                    accessibilityRole="button"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.linkDanger}>{t("common.remove")}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.label}>
          {isNew
            ? t("modals.people.tenants.form.rentLabel")
            : t("modals.people.tenants.form.changeRentLabel")}
        </Text>
        {!isNew ? (
          <Text style={styles.hint}>{t("modals.people.tenants.form.changeRentHint")}</Text>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder={t("modals.people.tenants.form.rentPlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={form.rent}
          onChangeText={(rent) => patchForm({ rent })}
          keyboardType="decimal-pad"
        />
        <Text style={styles.label}>
          {isNew
            ? t("modals.people.tenants.form.firstMonthLabel")
            : t("modals.people.tenants.form.fromMonthLabel")}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="2026-01"
          placeholderTextColor={colors.textMuted}
          value={form.from}
          onChangeText={(from) => patchForm({ from })}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
        />

        <Text style={styles.label}>{t("modals.people.tenants.form.dueDayLabel")}</Text>
        <TextInput
          style={styles.input}
          value={form.dueDay}
          onChangeText={(dueDay) => patchForm({ dueDay })}
          keyboardType="number-pad"
          maxLength={2}
        />

        <Text style={styles.label}>{t("modals.people.tenants.form.openingLabel")}</Text>
        <Text style={styles.hint}>{t("modals.people.tenants.form.openingHint")}</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          value={form.opening}
          onChangeText={(opening) => patchForm({ opening })}
          keyboardType="decimal-pad"
        />

        {isNew ? (
          <>
            <Text style={styles.label}>{t("modals.people.tenants.form.paidThroughLabel")}</Text>
            <Text style={styles.hint}>{t("modals.people.tenants.form.paidThroughHint")}</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-10"
              placeholderTextColor={colors.textMuted}
              value={form.paidThrough}
              onChangeText={(paidThrough) => patchForm({ paidThrough })}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={7}
            />
          </>
        ) : null}

        {!isNew ? (
          <>
            <Text style={styles.label}>{t("modals.people.tenants.form.endMonthLabel")}</Text>
            <Text style={styles.hint}>{t("modals.people.tenants.form.endMonthHint")}</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-12"
              placeholderTextColor={colors.textMuted}
              value={form.endMonth}
              onChangeText={(endMonth) => patchForm({ endMonth })}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={7}
            />
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={closeForm}>
            <Text style={styles.secondaryText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, busy && styles.disabled]}
            onPress={() => void handleSaveTenant()}
            disabled={busy}
          >
            <Text style={styles.primaryText}>
              {isNew
                ? t("modals.people.tenants.form.add")
                : t("modals.people.tenants.form.save")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHistory = (ledger: TenantLedger) => {
    const newestFirst = ledger.months.slice().reverse();
    // Recent months, plus any older month still not fully paid.
    const shown = newestFirst.filter(
      (month, index) => index < HISTORY_MONTHS || month.status !== "paid"
    );
    return (
      <View style={styles.history}>
        {shown.map((month) => (
          <View key={month.monthKey} style={styles.historyRow}>
            <Text style={styles.historyMonth}>{formatMonthKeyLabel(month.monthKey)}</Text>
            <Text
              style={[
                styles.historyStatus,
                { color: month.status === "paid" ? colors.success : colors.danger },
              ]}
            >
              {month.status === "paid"
                ? t("modals.people.tenants.monthPaid", { rent: formatCurrency(month.rent) })
                : month.status === "partial"
                  ? t("modals.people.tenants.monthPartial", {
                      paid: formatCurrency(month.paid),
                      owed: formatCurrency(month.outstanding),
                    })
                  : t("modals.people.tenants.monthUnpaid", {
                      owed: formatCurrency(month.outstanding),
                    })}
            </Text>
          </View>
        ))}
        {ledger.openingBalance > 0 ? (
          <View style={styles.historyRow}>
            <Text style={styles.historyMonth}>{t("modals.people.tenants.openingRow")}</Text>
            <Text
              style={[
                styles.historyStatus,
                {
                  color: ledger.openingOutstanding > 0 ? colors.danger : colors.success,
                },
              ]}
            >
              {ledger.openingOutstanding > 0
                ? t("modals.people.tenants.monthUnpaid", {
                    owed: formatCurrency(ledger.openingOutstanding),
                  })
                : t("modals.people.tenants.monthPaid", {
                    rent: formatCurrency(ledger.openingBalance),
                  })}
            </Text>
          </View>
        ) : null}

        {ledger.charges.length > 0 ? (
          <>
            <Text style={[styles.label, styles.paymentsHeader]}>
              {t("modals.people.tenants.chargesHeader")}
            </Text>
            {ledger.charges
              .slice()
              .reverse()
              .map((line) => (
                <View key={line.charge.id} style={styles.historyRow}>
                  <Text style={[styles.historyMonth, styles.chargeLabel]} numberOfLines={2}>
                    {formatDayLabel(line.charge.date)} ·{" "}
                    {line.charge.note ?? t("modals.people.tenants.chargeFallback")}
                  </Text>
                  <View style={styles.chargeRight}>
                    <Text
                      style={[
                        styles.historyStatus,
                        { color: line.status === "paid" ? colors.success : colors.danger },
                      ]}
                    >
                      {line.status === "paid"
                        ? t("modals.people.tenants.monthPaid", {
                            rent: formatCurrency(line.charge.amount),
                          })
                        : line.status === "partial"
                          ? t("modals.people.tenants.monthPartial", {
                              paid: formatCurrency(line.paid),
                              owed: formatCurrency(line.outstanding),
                            })
                          : t("modals.people.tenants.monthUnpaid", {
                              owed: formatCurrency(line.outstanding),
                            })}
                    </Text>
                    <TouchableOpacity
                      onPress={() => void handleRemoveCharge(ledger, line.charge.id)}
                      accessibilityRole="button"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.linkDanger}>{t("common.remove")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </>
        ) : null}

        <Text style={[styles.label, styles.paymentsHeader]}>
          {t("modals.people.tenants.paymentsHeader")}
        </Text>
        {ledger.payments.length === 0 ? (
          <Text style={styles.hint}>{t("modals.people.tenants.noPayments")}</Text>
        ) : (
          ledger.payments.slice(0, 24).map((payment) => (
            <View key={payment.id} style={styles.historyRow}>
              <Text style={styles.historyMonth}>{formatDayLabel(payment.date)}</Text>
              <Text style={[styles.historyStatus, { color: colors.text }]}>
                {formatCurrency(payment.amount)}
              </Text>
            </View>
          ))
        )}
        <Text style={styles.hint}>{t("modals.people.tenants.paymentsHint")}</Text>
      </View>
    );
  };

  const renderTenant = (ledger: TenantLedger) => {
    const { tenant } = ledger;
    const paying = paymentFor === tenant.id;
    const charging = chargeFor === tenant.id;
    const catchingUp = pastFor === tenant.id;
    const pastPlan = catchingUp ? planPastPayments(ledger, draftThrough.trim()) : [];
    const pastTotal = pastPlan.reduce((sum, item) => sum + item.amount, 0);
    const showHistory = historyFor === tenant.id;
    return (
      <View key={tenant.id} style={styles.tenantCard}>
        <View style={styles.tenantHeader}>
          <View style={styles.tenantTextWrap}>
            <Text style={styles.tenantName} numberOfLines={1}>
              🔑 {tenant.name}
            </Text>
            <Text style={styles.tenantMeta}>
              {ledger.movedOut && tenant.endMonth
                ? t("modals.people.tenants.movedOut", {
                    month: formatMonthKeyLabel(tenant.endMonth),
                  })
                : t("modals.people.tenants.rentMeta", {
                    rent: formatCurrency(currentRent(tenant)),
                    day: tenant.dueDay ?? 1,
                  })}
            </Text>
          </View>
          <View style={styles.balanceWrap}>
            <Text
              style={[
                styles.balance,
                { color: ledger.outstanding > 0 ? colors.danger : colors.success },
              ]}
            >
              {ledger.outstanding > 0
                ? t("modals.people.tenants.owes", {
                    amount: formatCurrency(ledger.outstanding),
                  })
                : ledger.credit > 0
                  ? t("modals.people.tenants.credit", {
                      amount: formatCurrency(ledger.credit),
                    })
                  : t("modals.people.tenants.paidUp")}
            </Text>
            {ledger.unpaidMonthCount > 0 ? (
              <Text style={styles.tenantMeta}>
                {t("modals.people.tenants.unpaidMonths", {
                  months: ledger.unpaidMonthCount,
                })}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => (paying ? setPaymentFor(null) : openPayment(ledger))}
            accessibilityRole="button"
            accessibilityLabel={t("modals.people.tenants.logPaymentA11y", {
              name: tenant.name,
            })}
          >
            <Text style={styles.link}>{t("modals.people.tenants.logPayment")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (charging ? setChargeFor(null) : openCharge(ledger))}
            accessibilityRole="button"
            accessibilityLabel={t("modals.people.tenants.addChargeA11y", {
              name: tenant.name,
            })}
          >
            <Text style={styles.link}>{t("modals.people.tenants.addCharge")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (catchingUp ? setPastFor(null) : openPast(ledger))}
            accessibilityRole="button"
            accessibilityLabel={t("modals.people.tenants.pastPaymentsA11y", {
              name: tenant.name,
            })}
          >
            <Text style={styles.link}>{t("modals.people.tenants.pastPayments")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setHistoryFor(showHistory ? null : tenant.id)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showHistory }}
          >
            <Text style={styles.link}>
              {showHistory
                ? t("modals.people.tenants.hideHistory")
                : t("modals.people.tenants.history")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEdit(ledger)} accessibilityRole="button">
            <Text style={styles.link}>{t("common.edit")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleRemoveTenant(ledger)}
            accessibilityRole="button"
          >
            <Text style={styles.linkDanger}>{t("common.remove")}</Text>
          </TouchableOpacity>
        </View>

        {paying ? (
          <View style={styles.paymentForm}>
            <Text style={styles.label}>{t("modals.people.tenants.payment.amountLabel")}</Text>
            <TextInput
              style={styles.input}
              value={draftAmount}
              onChangeText={(text) => {
                setDraftAmount(text);
                setError(null);
              }}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <Text style={styles.label}>{t("modals.people.tenants.payment.dateLabel")}</Text>
            <TextInput
              style={styles.input}
              value={draftDate}
              onChangeText={(text) => {
                setDraftDate(text);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={10}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setPaymentFor(null)}
              >
                <Text style={styles.secondaryText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, busy && styles.disabled]}
                onPress={() => void handleSavePayment(ledger)}
                disabled={busy}
              >
                <Text style={styles.primaryText}>
                  {t("modals.people.tenants.payment.save")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {charging ? (
          <View style={styles.paymentForm}>
            <Text style={styles.label}>{t("modals.people.tenants.charge.noteLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("modals.people.tenants.charge.notePlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={draftNote}
              onChangeText={setDraftNote}
              maxLength={MAX_TENANT_CHARGE_NOTE_LENGTH}
              selectTextOnFocus
            />
            <Text style={styles.label}>{t("modals.people.tenants.charge.amountLabel")}</Text>
            <TextInput
              style={styles.input}
              value={draftAmount}
              onChangeText={(text) => {
                setDraftAmount(text);
                setError(null);
              }}
              keyboardType="decimal-pad"
            />
            <Text style={styles.label}>{t("modals.people.tenants.payment.dateLabel")}</Text>
            <TextInput
              style={styles.input}
              value={draftDate}
              onChangeText={(text) => {
                setDraftDate(text);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={10}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setChargeFor(null)}
              >
                <Text style={styles.secondaryText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, busy && styles.disabled]}
                onPress={() => void handleSaveCharge(ledger)}
                disabled={busy}
              >
                <Text style={styles.primaryText}>
                  {t("modals.people.tenants.charge.save")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {catchingUp ? (
          <View style={styles.paymentForm}>
            <Text style={styles.label}>{t("modals.people.tenants.past.throughLabel")}</Text>
            <Text style={styles.hint}>{t("modals.people.tenants.past.hint")}</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-10"
              placeholderTextColor={colors.textMuted}
              value={draftThrough}
              onChangeText={(text) => {
                setDraftThrough(text);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={7}
            />
            {pastPlan.length > 0 ? (
              <Text style={styles.termText}>
                {t("modals.people.tenants.past.preview", {
                  payments: pastPlan.length,
                  total: formatCurrency(pastTotal),
                  from: formatMonthKeyLabel(pastPlan[0].monthKey),
                  to: formatMonthKeyLabel(pastPlan[pastPlan.length - 1].monthKey),
                })}
              </Text>
            ) : isMonthKey(draftThrough.trim()) ? (
              <Text style={styles.hint}>{t("modals.people.tenants.past.nothing")}</Text>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setPastFor(null)}
              >
                <Text style={styles.secondaryText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, busy && styles.disabled]}
                onPress={() => void handleSavePast(ledger)}
                disabled={busy}
              >
                <Text style={styles.primaryText}>{t("modals.people.tenants.past.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {showHistory ? renderHistory(ledger) : null}
        {form?.id === tenant.id ? renderForm() : null}
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={onBack} accessibilityRole="button">
        <Text style={styles.link}>{t("modals.people.tenants.back")}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>
        {t("modals.people.tenants.title", { name: business.name })}
      </Text>
      <Text style={styles.subtitle}>{t("modals.people.tenants.subtitle")}</Text>

      {roll.ledgers.length > 0 ? (
        <View style={styles.totalCard}>
          <Text style={styles.label}>{t("modals.people.tenants.totalOwed")}</Text>
          <Text
            style={[
              styles.totalValue,
              { color: roll.totalOutstanding > 0 ? colors.danger : colors.success },
            ]}
          >
            {formatCurrency(roll.totalOutstanding)}
          </Text>
          <Text style={styles.tenantMeta}>
            {t("modals.people.tenants.totalSub", {
              rent: formatCurrency(roll.monthlyRent),
            })}
          </Text>
        </View>
      ) : (
        <Text style={styles.emptyText}>{t("modals.people.tenants.empty")}</Text>
      )}

      {/* An error with no form open (a failed remove) still has to show. */}
      {error && !form && !paymentFor && !chargeFor && !pastFor ? <Text style={styles.errorText}>{error}</Text> : null}

      {roll.ledgers.map(renderTenant)}

      {form?.id === null ? (
        renderForm()
      ) : (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={openAdd}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>{t("modals.people.tenants.addTenant")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    wrap: { gap: tokens.gap },
    title: {
      color: colors.text,
      fontSize: scale(20),
      fontWeight: "800",
    },
    subtitle: {
      color: colors.textDim,
      fontSize: scale(13),
      lineHeight: scale(19),
    },
    label: {
      fontSize: scale(11),
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    hint: {
      color: colors.textMuted,
      fontSize: scale(12),
      lineHeight: scale(17),
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: scale(13),
      fontStyle: "italic",
    },
    errorText: {
      color: colors.danger,
      fontSize: scale(13),
      fontWeight: "600",
    },
    totalCard: {
      alignItems: "center",
      gap: 2,
      padding: tokens.pad,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      backgroundColor: colors.bg,
    },
    totalValue: {
      fontSize: scale(26),
      fontWeight: "800",
    },
    tenantCard: {
      gap: tokens.gapSm,
      padding: tokens.pad,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      backgroundColor: colors.bg,
    },
    tenantHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: tokens.gap,
    },
    tenantTextWrap: { flex: 1 },
    tenantName: {
      color: colors.text,
      fontSize: scale(15),
      fontWeight: "700",
    },
    tenantMeta: {
      color: colors.textMuted,
      fontSize: scale(12),
      marginTop: 2,
    },
    balanceWrap: { alignItems: "flex-end", flexShrink: 1 },
    balance: {
      fontSize: scale(14),
      fontWeight: "700",
      textAlign: "right",
    },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: tokens.pad,
      rowGap: tokens.gapSm,
    },
    link: {
      color: colors.accent,
      fontSize: scale(14),
      fontWeight: "600",
    },
    linkDanger: {
      color: colors.danger,
      fontSize: scale(14),
      fontWeight: "600",
    },
    formCard: {
      gap: tokens.gapSm,
      paddingTop: tokens.gapSm,
    },
    paymentForm: {
      gap: tokens.gapSm,
      paddingTop: tokens.gapSm,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.padSm,
      paddingVertical: tokens.padSm,
      color: colors.text,
      fontSize: scale(15),
    },
    termRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.gap,
    },
    termText: {
      flex: 1,
      color: colors.text,
      fontSize: scale(13),
    },
    buttonRow: {
      flexDirection: "row",
      gap: tokens.gap,
      marginTop: tokens.gapSm,
    },
    primaryButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: tokens.radius,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    primaryText: {
      color: colors.accentButtonText,
      fontSize: scale(15),
      fontWeight: "700",
    },
    secondaryButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: tokens.radius,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    secondaryText: {
      color: colors.textDim,
      fontSize: scale(15),
      fontWeight: "600",
    },
    disabled: { opacity: 0.4 },
    history: {
      gap: tokens.gapSm,
      paddingTop: tokens.gapSm,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    historyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: tokens.gap,
    },
    historyMonth: {
      color: colors.text,
      fontSize: scale(13),
    },
    historyStatus: {
      flexShrink: 1,
      fontSize: scale(13),
      fontWeight: "600",
      textAlign: "right",
    },
    paymentsHeader: { marginTop: tokens.gapSm },
    chargeLabel: { flex: 1 },
    chargeRight: { alignItems: "flex-end", gap: 2, flexShrink: 1 },
  });
};

export default BusinessTenantsPanel;
