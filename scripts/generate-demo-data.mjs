/**
 * BudgetArk - Demo Data Generator (screenshot fixtures)
 * File: scripts/generate-demo-data.mjs
 *
 * Builds `screenshots/demo-data.json`: a curated, realistic-looking dataset
 * in the app's JSON-export format, imported on a device via Profile ->
 * Import Data -> Replace for App Store screenshots. A script (not an in-app
 * button) on purpose: no demo-data code ever ships in the production bundle,
 * and the file goes through the same validated import path as a real backup.
 *
 * Dates are computed relative to the run date, so the current month, the
 * Monthly Review trends, and the net-worth chart always look alive -
 * re-run before each screenshot session:  node scripts/generate-demo-data.mjs
 *
 * WORKFLOW (on the screenshot device):
 *   1. Profile -> Export Data first if the device holds real data!
 *   2. Import demo-data.json in REPLACE mode.
 *   3. Take screenshots (drop raw PNGs in screenshots/raw/...).
 *   4. Restore the real backup (Import -> Replace) when done.
 */

import { promises as fs } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(ROOT, "screenshots", "demo-data.json");

/* ── Deterministic PRNG (mulberry32) so amounts vary but re-runs on the
 *    same day produce identical output ── */
let seed = 0xb0d6e7;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** Random dollars in [min, max] rounded to cents. */
const dollars = (min, max) => Math.round((min + rand() * (max - min)) * 100) / 100;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

/* ── Date helpers - everything anchors to the run date ── */
const now = new Date();
/** Month cursor `offset` months back from the current month. */
const monthCursor = (offset) =>
  new Date(now.getFullYear(), now.getMonth() - offset, 1);
const monthKeyAt = (offset) => {
  const d = monthCursor(offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const daysInMonthAt = (offset) => {
  const d = monthCursor(offset);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};
/** Noon UTC ISO for day `day` of the month `offset` months back (clamped). */
const iso = (offset, day) => {
  const clamped = Math.min(day, daysInMonthAt(offset));
  return `${monthKeyAt(offset)}-${String(clamped).padStart(2, "0")}T12:00:00.000Z`;
};
const daysAgoIso = (days) =>
  new Date(now.getTime() - days * 86_400_000).toISOString();
const dayKeyDaysAgo = (days) => daysAgoIso(days).slice(0, 10);
const nowIso = now.toISOString();
const todayDay = now.getDate();

/** Months of history: current month plus five prior (Monthly Review window). */
const MONTHS_BACK = 5;

/* ── People / businesses / custom categories ── */
const PERSON_ALEX = "demo-person-alex";
const PERSON_SAM = "demo-person-sam";
const BUSINESS_ID = "demo-biz-maple-lane";

const people = [
  { id: PERSON_ALEX, name: "Alex", createdAt: iso(MONTHS_BACK, 1), updatedAt: iso(MONTHS_BACK, 1) },
  { id: PERSON_SAM, name: "Sam", createdAt: iso(MONTHS_BACK, 1), updatedAt: iso(MONTHS_BACK, 1) },
];

const businesses = [
  { id: BUSINESS_ID, name: "Maple Lane Studio", createdAt: iso(MONTHS_BACK, 1), updatedAt: iso(MONTHS_BACK, 1) },
];

const customCategories = [
  { id: "demo-cat-pets", name: "Pets", icon: "🐾", defaultBucket: "wants", createdAt: iso(MONTHS_BACK, 1), updatedAt: iso(MONTHS_BACK, 1) },
];

/* ── Debts + payment history ── */
const debts = [
  { id: "demo-debt-visa", name: "Sapphire Card", balance: 1840.55, originalBalance: 4200, rate: 22.9, minPayment: 65, paymentDueDay: 15 },
  { id: "demo-debt-car", name: "Car Loan", balance: 8950.12, originalBalance: 15500, rate: 6.4, minPayment: 285, paymentDueDay: 3 },
  { id: "demo-debt-student", name: "Student Loan", balance: 11200.4, originalBalance: 18000, rate: 5.05, minPayment: 180, paymentDueDay: 21 },
  { id: "demo-debt-store", name: "Store Card", balance: 140.25, originalBalance: 900, rate: 26.99, minPayment: 35, paymentDueDay: 8 },
].map((d) => ({ ...d, createdAt: iso(MONTHS_BACK, 1), updatedAt: iso(0, 1) }));

const PAYMENT_AMOUNTS = {
  "demo-debt-visa": 120,
  "demo-debt-car": 285,
  "demo-debt-student": 180,
  "demo-debt-store": 35,
};

const payments = [];
for (let m = MONTHS_BACK; m >= 0; m--) {
  for (const debt of debts) {
    // Current month: only log the payment if its due day already passed,
    // so the ledger never shows a future-dated payment.
    if (m === 0 && debt.paymentDueDay > todayDay) continue;
    const date = iso(m, debt.paymentDueDay);
    payments.push({
      id: `demo-pay-${debt.id.slice(10)}-${monthKeyAt(m)}`,
      debtId: debt.id,
      amount: PAYMENT_AMOUNTS[debt.id],
      date,
      updatedAt: date,
    });
  }
}

// Keep the due-day reminder prompt out of screenshots for any debt whose
// current-month payment hasn't "happened" yet.
const debtDueDismissals = {};
for (const debt of debts) {
  if (debt.paymentDueDay > todayDay) {
    debtDueDismissals[`${debt.id}:${monthKeyAt(0)}`] = nowIso;
  }
}

/* ── Budget entries ── */
const budgetEntries = [];
let entrySeq = 0;
const entry = (fields) => {
  entrySeq += 1;
  const record = {
    id: `demo-entry-${String(entrySeq).padStart(3, "0")}`,
    createdAt: fields.date,
    updatedAt: fields.date,
    ...fields,
  };
  budgetEntries.push(record);
};

// Recurring backbone (one record each; the app expands months on read).
entry({ type: "income", category: "Salary", amount: 4850, description: "Paycheck", date: iso(MONTHS_BACK, 1), recurring: true, recurrenceInterval: 1, incomeType: "w2", retirementContribution: 350 });
entry({ type: "expense", category: "Housing", amount: 1650, description: "Rent", date: iso(MONTHS_BACK, 1), recurring: true, recurrenceInterval: 1 });
entry({ type: "expense", category: "Utilities", amount: 145, description: "Electric + water", date: iso(MONTHS_BACK, 4), recurring: true, recurrenceInterval: 1 });
entry({ type: "expense", category: "Entertainment", amount: 32.99, description: "Streaming bundle", date: iso(MONTHS_BACK, 6), recurring: true, recurrenceInterval: 1 });
entry({ type: "expense", category: "Fitness", amount: 45, description: "Gym membership", date: iso(MONTHS_BACK, 2), recurring: true, recurrenceInterval: 1 });
entry({ type: "expense", category: "Insurance", amount: 128, description: "Auto insurance", date: iso(MONTHS_BACK, 10), recurring: true, recurrenceInterval: 1 });
entry({ type: "expense", category: "Tech", amount: 9.99, description: "Cloud storage", date: iso(MONTHS_BACK, 12), recurring: true, recurrenceInterval: 1 });
entry({ type: "expense", category: "Savings", amount: 300, description: "Emergency fund transfer", date: iso(MONTHS_BACK, 1), recurring: true, recurrenceInterval: 1 });

const GROCERY_STORES = ["Fresh Market", "Weekly groceries", "Corner grocery run", "Farmers market haul"];
const RESTAURANTS = ["Ramen night", "Taco truck lunch", "Coffee + pastries", "Pizza Friday", "Brunch out"];
const SHOPPING = ["New running shoes", "Birthday gift", "Household bits", "Book haul"];
const ENTERTAINMENT = ["Movie night", "Concert tickets", "Mini golf", "Arcade evening"];

for (let m = MONTHS_BACK; m >= 0; m--) {
  const people3 = [PERSON_ALEX, PERSON_SAM, undefined];

  // Groceries: 4x/month, monthly total stays under the $500 limit.
  for (const day of [2, 9, 16, 23]) {
    entry({ type: "expense", category: "Grocery", amount: dollars(62, 112), description: pick(GROCERY_STORES), date: iso(m, day) });
  }
  // Restaurants: 3x/month, some person-assigned.
  for (const day of [6, 14, 27]) {
    entry({ type: "expense", category: "Restaurant", amount: dollars(18, 74), description: pick(RESTAURANTS), date: iso(m, day), personId: pick(people3) });
  }
  // Gas 2x/month.
  for (const day of [5, 19]) {
    entry({ type: "expense", category: "Transportation", amount: dollars(38, 54), description: "Gas fill-up", date: iso(m, day) });
  }
  entry({ type: "expense", category: "Shopping", amount: dollars(45, 118), description: pick(SHOPPING), date: iso(m, 12), personId: pick(people3) });
  entry({ type: "expense", category: "Entertainment", amount: dollars(24, 58), description: pick(ENTERTAINMENT), date: iso(m, 20) });
  entry({ type: "expense", category: "Pets", amount: dollars(35, 60), description: "Dog food + treats", date: iso(m, 8) });
  entry({ type: "expense", category: "Giving", amount: 50, description: "Monthly giving", date: iso(m, 1) });
  entry({ type: "expense", category: "Other", amount: dollars(40, 85), description: "Client print run", date: iso(m, 17), businessId: BUSINESS_ID });
  if (m % 3 === 0) {
    entry({ type: "expense", category: "Healthcare", amount: 85, description: "Dental copay", date: iso(m, 11) });
  }
  if (m === 4 || m === 1) {
    entry({ type: "income", category: "Freelance", amount: dollars(350, 700), description: "Logo project", date: iso(m, 22), incomeType: "1099", taxSetAsideRate: 25 });
  }
}

// A month with a trip in it makes the category-comparison card interesting.
entry({ type: "expense", category: "Travel", amount: 428.6, description: "Weekend cabin trip", date: iso(2, 15) });

// Current-month flavor: bank-imported provenance + a private entry.
entry({ type: "expense", category: "Grocery", amount: 84.12, description: "Costco", date: iso(0, Math.min(todayDay, 26)), source: "bank", merchant: "COSTCO WHSE", externalTxId: "simplefin:demo:tx-001" });
entry({ type: "expense", category: "Shopping", amount: 64.99, description: "Surprise gift", date: iso(0, Math.min(todayDay, 25)), isPrivate: true, personId: PERSON_ALEX });

/* ── Category limits (all months under -> streak) ── */
const LIMITS = [
  ["Grocery", 500],
  ["Restaurant", 250],
  ["Transportation", 160],
  ["Shopping", 200],
  ["Entertainment", 150],
  ["Pets", 80],
];
const budgetLimitsByMonth = {};
for (let m = MONTHS_BACK; m >= 0; m--) {
  budgetLimitsByMonth[monthKeyAt(m)] = LIMITS.map(([category, monthlyLimit]) => ({
    category,
    monthlyLimit,
    updatedAt: iso(m, 1),
  }));
}
const budgetLimits = budgetLimitsByMonth[monthKeyAt(0)];

/* ── Savings goals / asset accounts / holdings ── */
const savingsGoals = [
  { id: "demo-goal-efund", name: "Emergency Fund", category: "emergency_fund", targetAmount: 10000, currentAmount: 6800, createdAt: iso(MONTHS_BACK, 1), updatedAt: iso(0, 1) },
  { id: "demo-goal-japan", name: "Japan Trip", category: "travel", targetAmount: 4500, currentAmount: 1900, targetDate: iso(-8, 1), createdAt: iso(4, 1), updatedAt: iso(0, 1) },
  { id: "demo-goal-laptop", name: "New Laptop", category: "other", targetAmount: 2400, currentAmount: 2150, createdAt: iso(3, 1), updatedAt: iso(0, 1) },
];

const assetAccounts = [
  { id: "demo-acct-checking", name: "Everyday Checking", category: "checking", balance: 2843.55 },
  { id: "demo-acct-savings", name: "High-Yield Savings", category: "savings", balance: 12480 },
  { id: "demo-acct-401k", name: "401k", category: "retirement", balance: 0 },
  { id: "demo-acct-brokerage", name: "Brokerage", category: "investment", balance: 0 },
  { id: "demo-acct-hsa", name: "HSA", category: "hsa", balance: 1350 },
].map((a) => ({ ...a, createdAt: iso(MONTHS_BACK, 1), updatedAt: iso(0, 1) }));

const holdings = [
  { id: "demo-hold-voo", symbol: "VOO", shares: 14, costBasis: 5600, accountId: "demo-acct-brokerage", createdAt: iso(MONTHS_BACK, 1), updatedAt: iso(0, 1) },
  { id: "demo-hold-aapl", symbol: "AAPL", shares: 22, costBasis: 3400, accountId: "demo-acct-brokerage", createdAt: iso(MONTHS_BACK, 1), updatedAt: iso(0, 1) },
  { id: "demo-hold-target", name: "Target 2055 Fund", symbol: "VTI", anchorValue: 18500, anchorPrice: 245.3, accountId: "demo-acct-401k", createdAt: iso(MONTHS_BACK, 1), updatedAt: iso(0, 1) },
  { id: "demo-hold-espp", name: "Company stock plan", manualValue: 3200, createdAt: iso(3, 1), updatedAt: iso(0, 1) },
];

/* ── Net-worth history: gentle upward trend over ~4 months ── */
const netWorthSnapshots = [];
const POINTS = 40;
for (let i = POINTS - 1; i >= 0; i--) {
  const daysBack = i * 3;
  const progress = (POINTS - 1 - i) / (POINTS - 1);
  const totalAssets = Math.round((51_200 + progress * 6_300 + (rand() - 0.5) * 600) * 100) / 100;
  const totalDebt = Math.round((23_400 - progress * 1_270 + (rand() - 0.5) * 120) * 100) / 100;
  netWorthSnapshots.push({
    dayKey: dayKeyDaysAgo(daysBack),
    capturedAt: daysAgoIso(daysBack),
    totalAssets,
    totalDebt,
    netWorth: Math.round((totalAssets - totalDebt) * 100) / 100,
  });
}

/* ── Month-start balances (cash-flow card anchor) ── */
const monthStartBalances = {
  [monthKeyAt(1)]: { balance: 2415.1, capturedAt: iso(1, 1), updatedAt: iso(1, 1) },
  [monthKeyAt(0)]: { balance: 2610.4, capturedAt: iso(0, 1), updatedAt: iso(0, 1) },
};

/* ── Assemble the export payload ── */
const payload = {
  exportedAt: nowIso,
  appVersion: JSON.parse(await fs.readFile(join(ROOT, "package.json"), "utf8")).version,
  user: {
    id: "demo-user",
    displayName: "Jordan",
    createdAt: iso(MONTHS_BACK, 1),
    onboardingComplete: true,
    currencyPreferenceId: "usd_us",
  },
  debts,
  payments,
  budgetEntries,
  budgetLimits,
  budgetLimitsByMonth,
  savingsGoals,
  assetAccounts,
  holdings,
  payoffStrategy: "avalanche",
  payoffStrategyUpdatedAt: daysAgoIso(45),
  netWorthSnapshots,
  customCategories,
  businesses,
  people,
  monthStartBalances,
  debtDueDismissals,
};

/* ── Self-check: mirror the app's import validators loosely so a bad tweak
 *    fails HERE with a message instead of on the device ── */
const BUILT_IN_CATEGORIES = new Set([
  "Salary", "Freelance", "Housing", "Food", "Grocery", "Restaurant", "Tech",
  "Fitness", "Transportation", "Utilities", "Healthcare", "Insurance",
  "Debt Payments", "Giving", "Retirement", "Investing", "Savings",
  "Entertainment", "Shopping", "Travel", "Other",
]);
const customNames = new Set(customCategories.map((c) => c.name));
const problems = [];
const ids = new Set();
for (const e of budgetEntries) {
  if (ids.has(e.id)) problems.push(`duplicate entry id ${e.id}`);
  ids.add(e.id);
  if (!BUILT_IN_CATEGORIES.has(e.category) && !customNames.has(e.category)) {
    problems.push(`${e.id}: unknown category "${e.category}"`);
  }
  if (!(e.amount >= 0.01)) problems.push(`${e.id}: bad amount ${e.amount}`);
  if (Number.isNaN(Date.parse(e.date))) problems.push(`${e.id}: bad date`);
}
for (const p of payments) {
  if (!(p.amount >= 0.01)) problems.push(`${p.id}: bad amount`);
  if (!debts.some((d) => d.id === p.debtId)) problems.push(`${p.id}: orphan debtId`);
}
for (const key of Object.keys(budgetLimitsByMonth)) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) problems.push(`bad month key ${key}`);
}
if (problems.length > 0) {
  console.error("Demo data failed self-check:\n  " + problems.join("\n  "));
  process.exit(1);
}

await fs.mkdir(dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload));

console.log(`Wrote ${OUTPUT_PATH}`);
console.log(
  `  ${budgetEntries.length} budget entries, ${payments.length} payments, ` +
  `${debts.length} debts, ${netWorthSnapshots.length} net-worth points, ` +
  `${people.length} people, ${holdings.length} holdings`,
);
console.log("\nOn the screenshot device:");
console.log("  1. Profile -> Export Data FIRST if the device holds real data");
console.log("  2. Send demo-data.json to the device, Profile -> Import Data -> Replace");
console.log("  3. Screenshot, then restore your real backup the same way");
