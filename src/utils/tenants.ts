/**
 * BudgetArk - Tenants (rent owed to a business)
 * File: src/utils/tenants.ts
 *
 * Pure rules for a rental business's tenants. A tenant has a monthly rent;
 * every month from their first one the rent falls due, and every income
 * entry tagged to them (`BudgetEntry.tenantId`) is a payment. What they
 * owe is never stored - it is always rent charged so far minus payments
 * received - so a short payment simply leaves the rest of that month
 * owing and carries forward, with nothing for the user to maintain.
 *
 * Deliberately separate from "Owed to You" (utils/loans). A loan is money
 * that LEFT the household and is expected back; unpaid rent is income that
 * has not arrived yet. Rent owed is therefore never an expense and never
 * counts as income until a payment is actually logged.
 *
 * Late fees and one-off charges (`Tenant.charges`) are extra amounts owed
 * from their date. Payments are applied oldest item first (after any
 * opening balance) across rent months and charges alike, so the record
 * shows which months and charges are paid, part paid or unpaid. Nothing here touches storage or React. Ids are supplied by
 * callers - this module stays uuid-free for Jest.
 */

import type {
  BudgetEntry,
  Business,
  RentTerm,
  Tenant,
  TenantCharge,
} from "../types";
import {
  MAX_RENT_TERMS,
  MAX_TENANT_CHARGE_NOTE_LENGTH,
  MAX_TENANT_CHARGES,
  MAX_TENANT_NAME_LENGTH,
  MAX_TENANTS_PER_BUSINESS,
} from "../types";
import { roundToCents } from "./money";
import { isEarnedIncome } from "./refunds";
import { sanitizeTextInput } from "./sanitize";

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
/** Upper bound on one month's rent / an opening balance - a typo guard. */
export const MAX_RENT_AMOUNT = 10_000_000;

export const isMonthKey = (value: unknown): value is string =>
  typeof value === "string" && MONTH_KEY_RE.test(value);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isMoney = (value: unknown, allowZero: boolean): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  (allowZero ? value >= 0 : value > 0) &&
  value <= MAX_RENT_AMOUNT;

const isRentTerm = (value: unknown): value is RentTerm =>
  isObject(value) && isMonthKey(value.from) && isMoney(value.amount, true);

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isDateKey = (value: unknown): value is string =>
  typeof value === "string" &&
  DATE_KEY_RE.test(value) &&
  Number.isFinite(Date.parse(value));

const isTenantCharge = (value: unknown): value is TenantCharge => {
  if (!isObject(value)) return false;
  const { id, date, amount, note, createdAt } = value;
  if (typeof id !== "string" || id.length === 0 || id.length > 120) return false;
  if (!isDateKey(date) || !isMoney(amount, false)) return false;
  if (
    note !== undefined &&
    (typeof note !== "string" ||
      note.length === 0 ||
      note.length > MAX_TENANT_CHARGE_NOTE_LENGTH ||
      sanitizeTextInput(note) !== note)
  ) {
    return false;
  }
  return typeof createdAt === "string" && Number.isFinite(Date.parse(createdAt));
};

/**
 * Trust-boundary shape check for one stored/synced/imported tenant.
 * Fail-closed: a tenant that does not validate is ignored by every reader
 * (see `businessTenants`) rather than half-used.
 */
export const isValidTenant = (value: unknown): value is Tenant => {
  if (!isObject(value)) return false;
  const { id, name, rents, dueDay, openingBalance, endMonth, charges, createdAt } = value;
  if (typeof id !== "string" || id.length === 0 || id.length > 120) return false;
  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.length > MAX_TENANT_NAME_LENGTH ||
    sanitizeTextInput(name) !== name
  ) {
    return false;
  }
  if (!Array.isArray(rents) || rents.length === 0 || rents.length > MAX_RENT_TERMS) {
    return false;
  }
  if (!rents.every(isRentTerm)) return false;
  if (
    dueDay !== undefined &&
    !(typeof dueDay === "number" && Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31)
  ) {
    return false;
  }
  if (openingBalance !== undefined && !isMoney(openingBalance, true)) return false;
  if (endMonth !== undefined && !isMonthKey(endMonth)) return false;
  if (
    charges !== undefined &&
    !(
      Array.isArray(charges) &&
      charges.length <= MAX_TENANT_CHARGES &&
      charges.every(isTenantCharge)
    )
  ) {
    return false;
  }
  return typeof createdAt === "string" && Number.isFinite(Date.parse(createdAt));
};

/** `Business.tenants` as the sync/import validators accept it. */
export const isTenantsValue = (value: unknown): boolean =>
  value === undefined ||
  (Array.isArray(value) &&
    value.length <= MAX_TENANTS_PER_BUSINESS &&
    value.every(isValidTenant));

/** The usable tenants of a business - invalid records are skipped. */
export const businessTenants = (
  business: Pick<Business, "tenants"> | undefined
): Tenant[] => {
  const raw: unknown = business?.tenants;
  return Array.isArray(raw) ? raw.filter(isValidTenant) : [];
};

export const normalizeTenantName = (raw: string): string =>
  sanitizeTextInput(raw).replace(/\s+/g, " ").trim().slice(0, MAX_TENANT_NAME_LENGTH).trim();

/** Terms sorted oldest first, one per month (the later duplicate wins). */
export const normalizeRentTerms = (terms: readonly RentTerm[]): RentTerm[] => {
  const byMonth = new Map<string, number>();
  for (const term of terms) {
    if (isRentTerm(term)) byMonth.set(term.from, roundToCents(term.amount));
  }
  return Array.from(byMonth, ([from, amount]) => ({ from, amount }))
    .sort((a, b) => a.from.localeCompare(b.from))
    .slice(0, MAX_RENT_TERMS);
};

/**
 * Add or replace the rent that applies from `from`. Earlier months keep
 * the rent they were charged at.
 */
export const setRentFrom = (
  terms: readonly RentTerm[],
  from: string,
  amount: number
): RentTerm[] =>
  normalizeRentTerms([...terms.filter((term) => term.from !== from), { from, amount }]);

export interface TenantDraft {
  id: string;
  name: string;
  rents: readonly RentTerm[];
  dueDay?: number;
  openingBalance?: number;
  endMonth?: string;
  /** Carried through unchanged - charges are edited with the helpers below. */
  charges?: readonly TenantCharge[];
  createdAt: string;
}

/**
 * Clean a tenant from form input into its stored shape, or null when it
 * can't be saved (no name, no rent term, a moved-out month before the
 * first rent month).
 */
export const buildTenant = (draft: TenantDraft): Tenant | null => {
  const name = normalizeTenantName(draft.name);
  const rents = normalizeRentTerms(draft.rents);
  if (!name || rents.length === 0) return null;
  const tenant: Tenant = { id: draft.id, name, rents, createdAt: draft.createdAt };
  if (draft.dueDay !== undefined && draft.dueDay !== 1) {
    tenant.dueDay = Math.max(1, Math.min(31, Math.round(draft.dueDay)));
  }
  const opening = roundToCents(draft.openingBalance ?? 0);
  if (opening > 0) tenant.openingBalance = opening;
  if (draft.endMonth !== undefined) {
    if (!isMonthKey(draft.endMonth) || draft.endMonth < rents[0].from) return null;
    tenant.endMonth = draft.endMonth;
  }
  if (draft.charges && draft.charges.length > 0) tenant.charges = [...draft.charges];
  return isValidTenant(tenant) ? tenant : null;
};

export const normalizeChargeNote = (raw: string | undefined): string | undefined => {
  if (typeof raw !== "string") return undefined;
  const cleaned = sanitizeTextInput(raw)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TENANT_CHARGE_NOTE_LENGTH)
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
};

export interface NewTenantChargeInput {
  id: string;
  date: string;
  amount: number;
  note?: string;
  createdAt: string;
}

/**
 * Add a late fee / one-off charge and return the patched tenant, or null
 * when it can't be recorded: a non-positive or oversized amount, a date
 * that is not YYYY-MM-DD, a duplicate id, or the per-tenant cap. Charges
 * stay sorted oldest first.
 */
export const addTenantCharge = (
  tenant: Tenant,
  input: NewTenantChargeInput
): Tenant | null => {
  const amount = roundToCents(input.amount);
  if (!isMoney(amount, false) || !isDateKey(input.date)) return null;
  const existing = tenant.charges ?? [];
  if (existing.length >= MAX_TENANT_CHARGES) return null;
  if (existing.some((charge) => charge.id === input.id)) return null;
  const note = normalizeChargeNote(input.note);
  const charge: TenantCharge = {
    id: input.id,
    date: input.date,
    amount,
    ...(note ? { note } : {}),
    createdAt: input.createdAt,
  };
  const next: Tenant = {
    ...tenant,
    charges: [...existing, charge].sort((a, b) => a.date.localeCompare(b.date)),
  };
  return isValidTenant(next) ? next : null;
};

/** Drop one charge; returns the same tenant when the id is unknown. */
export const removeTenantCharge = (tenant: Tenant, chargeId: string): Tenant => {
  const existing = tenant.charges ?? [];
  if (!existing.some((charge) => charge.id === chargeId)) return tenant;
  const remaining = existing.filter((charge) => charge.id !== chargeId);
  const next: Tenant = { ...tenant };
  if (remaining.length > 0) next.charges = remaining;
  else delete next.charges;
  return next;
};

/** Insert or replace by id; null when the per-business cap is hit. */
export const upsertTenant = (
  tenants: readonly Tenant[],
  tenant: Tenant
): Tenant[] | null => {
  if (tenants.some((existing) => existing.id === tenant.id)) {
    return tenants.map((existing) => (existing.id === tenant.id ? tenant : existing));
  }
  if (tenants.length >= MAX_TENANTS_PER_BUSINESS) return null;
  return [...tenants, tenant];
};

export const removeTenant = (tenants: readonly Tenant[], tenantId: string): Tenant[] =>
  tenants.filter((tenant) => tenant.id !== tenantId);

/* ── Month arithmetic (local wall-clock, like utils/budgetMonths) ── */

const monthKeyOf = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const nextMonthKey = (monthKey: string): string => {
  const [year, month] = monthKey.split("-").map(Number);
  return month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, "0")}`;
};

const previousMonthKey = (monthKey: string): string => {
  const [year, month] = monthKey.split("-").map(Number);
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, "0")}`;
};

const daysInMonth = (monthKey: string): number => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
};

/** Rent in effect for a month; 0 before the first term. */
export const rentForMonth = (tenant: Pick<Tenant, "rents">, monthKey: string): number => {
  let amount = 0;
  for (const term of tenant.rents) {
    if (term.from <= monthKey) amount = term.amount;
    else break;
  }
  return amount;
};

/** The rent the tenant pays now (their latest term that has started). */
export const currentRent = (tenant: Tenant, today: Date = new Date()): number => {
  const now = monthKeyOf(today);
  return rentForMonth(tenant, now) || tenant.rents[0].amount;
};

/**
 * Latest month whose rent has fallen due: this month once its due day has
 * arrived (clamped, so "the 31st" is due on the 30th in a 30-day month),
 * otherwise last month.
 */
export const lastDueMonth = (tenant: Pick<Tenant, "dueDay">, today: Date): string => {
  const thisMonth = monthKeyOf(today);
  const dueDay = Math.min(tenant.dueDay ?? 1, daysInMonth(thisMonth));
  return today.getDate() >= dueDay ? thisMonth : previousMonthKey(thisMonth);
};

/**
 * Whether an entry is a rent payment from this tenant: live, earned,
 * one-off income tagged to the business and the tenant. A recurring
 * income entry is an estimate of rent to come, never a payment.
 */
export const isRentPayment = (
  entry: BudgetEntry,
  businessId: string,
  tenantId: string
): boolean =>
  !entry.deletedAt &&
  !entry.recurring &&
  isEarnedIncome(entry) &&
  entry.businessId === businessId &&
  entry.tenantId === tenantId &&
  Number.isFinite(entry.amount) &&
  entry.amount > 0;

export type RentMonthStatus = "paid" | "partial" | "unpaid";

export interface RentMonth {
  monthKey: string;
  rent: number;
  /** Payments applied to this month (oldest month first). */
  paid: number;
  outstanding: number;
  status: RentMonthStatus;
}

/** One late fee / one-off charge with what has been paid toward it. */
export interface ChargeLine {
  charge: TenantCharge;
  paid: number;
  outstanding: number;
  status: RentMonthStatus;
}

export interface TenantLedger {
  tenant: Tenant;
  /** Rent charged for every month that has fallen due (excludes the opening balance). */
  charged: number;
  openingBalance: number;
  /** How much of the opening balance is still unpaid. */
  openingOutstanding: number;
  /** Every payment received. */
  paid: number;
  /** What the tenant owes right now; 0 when paid up or ahead. */
  outstanding: number;
  /** Paid beyond everything due so far - counts toward coming months. */
  credit: number;
  /** Months charged, oldest first. */
  months: RentMonth[];
  /** Months not fully paid. */
  unpaidMonthCount: number;
  /** Late fees and one-off charges dated today or earlier, oldest first. */
  charges: ChargeLine[];
  /** Sum of those charges (not part of `charged`). */
  extraCharged: number;
  /** Payment entries, newest first. */
  payments: BudgetEntry[];
  /** The tenant's `endMonth` has passed - no further rent is charged. */
  movedOut: boolean;
}

/** Guard on the month loop: 100 years of rent is a corrupt start month. */
const MAX_LEDGER_MONTHS = 1200;

export const buildTenantLedger = (
  tenant: Tenant,
  businessId: string,
  entries: readonly BudgetEntry[],
  today: Date = new Date()
): TenantLedger => {
  const payments = entries
    .filter((entry) => isRentPayment(entry, businessId, tenant.id))
    .sort((a, b) => b.date.localeCompare(a.date));
  const paid = roundToCents(payments.reduce((sum, entry) => sum + entry.amount, 0));

  const dueThrough = lastDueMonth(tenant, today);
  const lastCharged =
    tenant.endMonth !== undefined && tenant.endMonth < dueThrough
      ? tenant.endMonth
      : dueThrough;

  const openingBalance = roundToCents(tenant.openingBalance ?? 0);
  let remaining = paid;
  const openingPaid = Math.min(openingBalance, remaining);
  remaining = roundToCents(remaining - openingPaid);

  // Everything owed, in the order it fell due: each month on its due day
  // and each charge on its date (a month wins a same-day tie). Payments
  // are poured over that timeline oldest first.
  const months: RentMonth[] = [];
  const charges: ChargeLine[] = [];
  const timeline: { due: string; order: number; line: RentMonth | ChargeLine; amount: number }[] = [];
  let charged = 0;
  let cursor = tenant.rents[0].from;
  for (let i = 0; cursor <= lastCharged && i < MAX_LEDGER_MONTHS; i += 1) {
    const rent = rentForMonth(tenant, cursor);
    if (rent > 0) {
      charged += rent;
      const month: RentMonth = {
        monthKey: cursor,
        rent,
        paid: 0,
        outstanding: rent,
        status: "unpaid",
      };
      months.push(month);
      const dueDay = Math.min(tenant.dueDay ?? 1, daysInMonth(cursor));
      timeline.push({
        due: `${cursor}-${String(dueDay).padStart(2, "0")}`,
        order: 0,
        line: month,
        amount: rent,
      });
    }
    cursor = nextMonthKey(cursor);
  }
  charged = roundToCents(charged);

  // A charge dated in the future is not owed yet.
  const todayKey = `${monthKeyOf(today)}-${String(today.getDate()).padStart(2, "0")}`;
  let extraCharged = 0;
  for (const charge of tenant.charges ?? []) {
    if (charge.date > todayKey) continue;
    extraCharged += charge.amount;
    const line: ChargeLine = {
      charge,
      paid: 0,
      outstanding: charge.amount,
      status: "unpaid",
    };
    charges.push(line);
    timeline.push({ due: charge.date, order: 1, line, amount: charge.amount });
  }
  extraCharged = roundToCents(extraCharged);
  charges.sort((a, b) => a.charge.date.localeCompare(b.charge.date));

  timeline.sort((a, b) => a.due.localeCompare(b.due) || a.order - b.order);
  for (const item of timeline) {
    const applied = Math.min(item.amount, remaining);
    remaining = roundToCents(remaining - applied);
    item.line.paid = roundToCents(applied);
    item.line.outstanding = roundToCents(item.amount - applied);
    item.line.status =
      item.line.outstanding <= 0 ? "paid" : applied > 0 ? "partial" : "unpaid";
  }

  const balance = roundToCents(openingBalance + charged + extraCharged - paid);
  return {
    tenant,
    charged,
    openingBalance,
    openingOutstanding: roundToCents(openingBalance - openingPaid),
    paid,
    outstanding: Math.max(0, balance),
    credit: Math.max(0, roundToCents(-balance)),
    months,
    unpaidMonthCount: months.filter((month) => month.status !== "paid").length,
    charges,
    extraCharged,
    payments,
    movedOut: tenant.endMonth !== undefined && tenant.endMonth < monthKeyOf(today),
  };
};

export interface RentRoll {
  businessId: string;
  /** Tenants who owe first (largest balance on top), then by name. */
  ledgers: TenantLedger[];
  totalOutstanding: number;
  /** Rent due each month from tenants who have not moved out. */
  monthlyRent: number;
}

/** Every tenant of one business with what they owe. */
export const buildRentRoll = (
  business: Pick<Business, "id" | "tenants">,
  entries: readonly BudgetEntry[],
  today: Date = new Date()
): RentRoll => {
  const ledgers = businessTenants(business)
    .map((tenant) => buildTenantLedger(tenant, business.id, entries, today))
    .sort(
      (a, b) =>
        b.outstanding - a.outstanding || a.tenant.name.localeCompare(b.tenant.name)
    );
  return {
    businessId: business.id,
    ledgers,
    totalOutstanding: roundToCents(
      ledgers.reduce((sum, ledger) => sum + ledger.outstanding, 0)
    ),
    monthlyRent: roundToCents(
      ledgers.reduce(
        (sum, ledger) =>
          ledger.movedOut ? sum : sum + currentRent(ledger.tenant, today),
        0
      )
    ),
  };
};

/**
 * The tenant id an income entry may keep: only a real tenant of the
 * entry's business, and never on a refund or an expense. Everything else
 * resolves to undefined so a stale tag can't follow an entry to another
 * business.
 */
export const resolveTenantId = (
  tenantId: string | null | undefined,
  business: Pick<Business, "tenants"> | undefined,
  entry: { type: BudgetEntry["type"]; refund?: boolean }
): string | undefined => {
  if (!tenantId || entry.type !== "income" || entry.refund) return undefined;
  return businessTenants(business).some((tenant) => tenant.id === tenantId)
    ? tenantId
    : undefined;
};
