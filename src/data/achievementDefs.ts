/**
 * BudgetArk - Achievement Definitions
 * File: src/data/achievementDefs.ts
 *
 * Source of truth for every Ark badge. Each definition is pure data plus
 * a `check(ctx)` predicate that runs against the user's existing storage -
 * no separate "earn" event is fired anywhere in the app. The evaluator in
 * src/utils/achievements.ts loads context once and walks this list.
 *
 * Adding a badge: append a new entry. Removing one: delete it and bump
 * ACHIEVEMENTS_STORAGE_VERSION if you also need to invalidate prior unlocks.
 */

import type {
  Achievement,
  AchievementTier,
  AchievementStats,
  CategoryBudgetLimit,
  Debt,
  Payment,
  SavingsGoal,
  BudgetEntry,
  DebtMilestonePlan,
  NetWorthSnapshot,
} from "../types";
import { isEntryActiveInMonth } from "../utils/recurrence";

export interface AchievementContext {
  debts: Debt[];
  payments: Payment[];
  savingsGoals: SavingsGoal[];
  budgetEntries: BudgetEntry[];
  milestonePlan: DebtMilestonePlan;
  netWorthSnapshots: NetWorthSnapshot[];
  isPaired: boolean;
  /** Counters for badges not derivable from financial data alone. */
  stats: AchievementStats;
  /** YYYY-MM → saved category limits for that month. */
  limitsByMonth: Record<string, CategoryBudgetLimit[]>;
}

/** Progress toward an achievement. `target` is what fully unlocks it. */
export interface AchievementProgress {
  current: number;
  target: number;
  /** Optional human-readable formatter override (e.g. "$1,250 / $10,000"). */
  format?: (current: number, target: number) => string;
}

export interface AchievementDef extends Achievement {
  check: (ctx: AchievementContext) => boolean;
  /**
   * Optional progress reporter. Returns null/undefined for binary badges
   * with no meaningful partial state (e.g. "exported once", "paired"). When
   * present, `current` is clamped to [0, target] by callers - defs can
   * return raw counts without worrying about overflow.
   */
  progress?: (ctx: AchievementContext) => AchievementProgress | null;
  /**
   * If true, the evaluator removes this badge from the unlocked map when
   * `check(ctx)` later returns false. Use for state-based badges (current
   * net worth, current debt-free status, current pairing) but NOT for
   * historical/once-achieved badges ("first payment", "opened review 3
   * times", "30-day streak best") - those should stay earned forever.
   * Defaults to false.
   */
  revocable?: boolean;
}

/* ─── Tier display order (used for sorting in the UI) ─── */

export const TIER_ORDER: Record<AchievementTier, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  legendary: 3,
};

/* ─── Helpers ─── */

const latestNetWorth = (ctx: AchievementContext): number => {
  const snap = ctx.netWorthSnapshots[ctx.netWorthSnapshots.length - 1];
  return snap?.netWorth ?? 0;
};

const consecutiveSavingsMonths = (ctx: AchievementContext): number => {
  const months = new Set<string>();
  for (const entry of ctx.budgetEntries) {
    if (entry.category !== "Savings") continue;
    const d = new Date(entry.date);
    if (Number.isNaN(d.getTime())) continue;
    months.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  if (months.size === 0) return 0;
  let cursor = new Date();
  cursor.setDate(1);
  let count = 0;
  // Walk backwards from this month while every month has an entry.
  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    if (!months.has(key)) break;
    count += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  }
  return count;
};

/** YYYY-MM that immediately follows the given key. */
const nextMonthKey = (key: string): string => {
  const [y, m] = key.split("-").map((n) => parseInt(n, 10));
  const d = new Date(y, m, 1); // m is 1-based → Date month index = next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Months that had saved category limits where *every* limited category
 * stayed at or under its cap, sorted ascending. Recurring expenses apply
 * from their start month onward; one-offs only in their own month - the
 * same rule the budget screen and Annual Report use.
 */
const underBudgetMonths = (ctx: AchievementContext): string[] => {
  const result: string[] = [];
  for (const monthKey of Object.keys(ctx.limitsByMonth)) {
    const limits = ctx.limitsByMonth[monthKey];
    if (!limits || limits.length === 0) continue;

    const spend: Partial<Record<string, number>> = {};
    for (const e of ctx.budgetEntries) {
      if (e.type !== "expense") continue;
      if (!Number.isFinite(e.amount) || e.amount <= 0) continue;
      if (!isEntryActiveInMonth(e, monthKey)) continue;
      spend[e.category] = (spend[e.category] ?? 0) + e.amount;
    }

    const allUnder = limits.every(
      (lim) => (spend[lim.category] ?? 0) <= lim.monthlyLimit,
    );
    if (allUnder) result.push(monthKey);
  }
  return result.sort();
};

/** Compact currency formatter for progress strings ("$1.2k / $10k"). */
const formatCurrencyProgress = (current: number, target: number): string => {
  const fmt = (n: number): string => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000) return `$${Math.round(n / 1000)}k`;
    if (abs >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${Math.round(n)}`;
  };
  return `${fmt(current)} / ${fmt(target)}`;
};

/** Longest run of consecutive calendar months in a sorted YYYY-MM list. */
const longestConsecutiveRun = (sortedMonthKeys: string[]): number => {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sortedMonthKeys) {
    run = prev !== null && nextMonthKey(prev) === key ? run + 1 : 1;
    if (run > best) best = run;
    prev = key;
  }
  return best;
};

/* ─── Definitions ─── */

export const ACHIEVEMENT_DEFS: readonly AchievementDef[] = [
  {
    id: "first_steps",
    glyph: "⚓", // ⚓
    tier: "bronze",
    title: "First Steps",
    description: "Logged your first debt and set sail.",
    hint: "Add a debt to the Debt Tracker.",
    check: (ctx) => ctx.debts.length > 0,
  },
  {
    id: "patched_the_hull",
    glyph: "🔨", // 🔨
    tier: "bronze",
    title: "Patched the Hull",
    description: "Recorded your first debt payment.",
    hint: "Record a payment toward any debt.",
    check: (ctx) => ctx.payments.length > 0,
  },
  {
    id: "half_mast",
    glyph: "🚩", // 🚩
    tier: "silver",
    title: "Half Mast",
    description: "Paid off half of your original non-mortgage debt total.",
    hint: "Pay down 50% of your starting debt.",
    revocable: true,
    check: (ctx) => {
      const nonMortgage = ctx.debts.filter((d) => d.debtClass !== "house");
      const original = nonMortgage.reduce((s, d) => s + d.originalBalance, 0);
      const current = nonMortgage.reduce((s, d) => s + d.balance, 0);
      if (original <= 0) return false;
      return (original - current) / original >= 0.5;
    },
    progress: (ctx) => {
      const nonMortgage = ctx.debts.filter((d) => d.debtClass !== "house");
      const original = nonMortgage.reduce((s, d) => s + d.originalBalance, 0);
      const current = nonMortgage.reduce((s, d) => s + d.balance, 0);
      if (original <= 0) return null;
      const paid = Math.max(0, original - current);
      const target = original / 2;
      return { current: paid, target, format: formatCurrencyProgress };
    },
  },
  {
    id: "debt_free_captain",
    glyph: "🏴‍☠️", // 🏴‍☠️
    tier: "gold",
    title: "Debt-Free Captain",
    description: "All non-mortgage debts cleared. The crew salutes you.",
    hint: "Clear every debt except your mortgage.",
    revocable: true,
    check: (ctx) => {
      const nonMortgage = ctx.debts.filter((d) => d.debtClass !== "house");
      if (nonMortgage.length === 0) return false;
      return nonMortgage.every((d) => d.balance <= 0.01);
    },
    progress: (ctx) => {
      const nonMortgage = ctx.debts.filter((d) => d.debtClass !== "house");
      if (nonMortgage.length === 0) return null;
      const cleared = nonMortgage.filter((d) => d.balance <= 0.01).length;
      return { current: cleared, target: nonMortgage.length };
    },
  },
  {
    id: "galley_stocked",
    glyph: "🍞", // 🍞
    tier: "silver",
    title: "Galley Stocked",
    description: "Your emergency fund reached $1,000.",
    hint: "Save $1,000 for emergencies.",
    revocable: true,
    check: (ctx) => {
      const ef = ctx.savingsGoals.find((g) => g.category === "emergency_fund");
      if (ef && ef.currentAmount >= 1000) return true;
      // Fall back to "Savings" expense entries (matches Bridge screen logic).
      const savings = ctx.budgetEntries
        .filter((e) => e.type === "expense" && e.category === "Savings")
        .reduce((s, e) => s + e.amount, 0);
      return savings >= 1000;
    },
    progress: (ctx) => {
      const ef = ctx.savingsGoals.find((g) => g.category === "emergency_fund");
      const efAmount = ef?.currentAmount ?? 0;
      const savings = ctx.budgetEntries
        .filter((e) => e.type === "expense" && e.category === "Savings")
        .reduce((s, e) => s + e.amount, 0);
      const best = Math.max(efAmount, savings);
      return { current: best, target: 1000, format: formatCurrencyProgress };
    },
  },
  {
    id: "sextant_sharp",
    glyph: "🧭", // 🧭
    tier: "silver",
    title: "Sextant Sharp",
    description: "Hit your first savings goal target.",
    hint: "Complete any savings goal.",
    check: (ctx) =>
      ctx.savingsGoals.some(
        (g) => g.targetAmount > 0 && g.currentAmount >= g.targetAmount,
      ),
    progress: (ctx) => {
      // Best-progressed goal so the ring tracks the user's closest finish.
      let best: { current: number; target: number } | null = null;
      let bestRatio = -1;
      for (const g of ctx.savingsGoals) {
        if (g.targetAmount <= 0) continue;
        const ratio = g.currentAmount / g.targetAmount;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = { current: g.currentAmount, target: g.targetAmount };
        }
      }
      if (!best) return null;
      return { ...best, format: formatCurrencyProgress };
    },
  },
  {
    id: "treasure_i",
    glyph: "🪙", // 🪙
    tier: "bronze",
    title: "Treasure Hoard I",
    description: "Net worth crossed $10,000.",
    hint: "Grow net worth above $10k.",
    revocable: true,
    check: (ctx) => latestNetWorth(ctx) >= 10_000,
    progress: (ctx) => ({
      current: Math.max(0, latestNetWorth(ctx)),
      target: 10_000,
      format: formatCurrencyProgress,
    }),
  },
  {
    id: "treasure_ii",
    glyph: "💎", // 💎
    tier: "silver",
    title: "Treasure Hoard II",
    description: "Net worth crossed $25,000.",
    hint: "Grow net worth above $25k.",
    revocable: true,
    check: (ctx) => latestNetWorth(ctx) >= 25_000,
    progress: (ctx) => ({
      current: Math.max(0, latestNetWorth(ctx)),
      target: 25_000,
      format: formatCurrencyProgress,
    }),
  },
  {
    id: "treasure_iii",
    glyph: "👑", // 👑
    tier: "gold",
    title: "Treasure Hoard III",
    description: "Net worth crossed $100,000.",
    hint: "Grow net worth above $100k.",
    revocable: true,
    check: (ctx) => latestNetWorth(ctx) >= 100_000,
    progress: (ctx) => ({
      current: Math.max(0, latestNetWorth(ctx)),
      target: 100_000,
      format: formatCurrencyProgress,
    }),
  },
  {
    id: "ark_builder",
    glyph: "🛠️", // 🛠️
    tier: "gold",
    title: "Ark Builder",
    description: "Completed your first milestone step.",
    hint: "Finish a Hull/Deck/Supplies milestone.",
    check: (ctx) => ctx.milestonePlan.steps.some((s) => s.isCompleted),
  },
  {
    id: "first_mate",
    glyph: "🤝", // 🤝
    tier: "silver",
    title: "First Mate",
    description: "Paired with a partner for cross-device sync.",
    hint: "Pair with your partner from Profile → Sync.",
    revocable: false,
    check: (ctx) => ctx.isPaired,
  },
  {
    id: "doubloon_streak",
    glyph: "🔥", // 🔥
    tier: "gold",
    title: "Doubloon Streak",
    description: "12 consecutive months of savings contributions.",
    hint: "Add a Savings entry every month for a year.",
    check: (ctx) => consecutiveSavingsMonths(ctx) >= 12,
    progress: (ctx) => ({
      current: consecutiveSavingsMonths(ctx),
      target: 12,
      format: (c, t) => `${c} / ${t} mo`,
    }),
  },
  {
    id: "cartographer",
    glyph: "🗺️", // 🗺️
    tier: "bronze",
    title: "Cartographer",
    description: "Charted a course - exported your data at least once.",
    hint: "Export your data from Profile → Data.",
    check: (ctx) => ctx.stats.exportCount > 0,
  },
  {
    id: "crows_nest",
    glyph: "🔭", // 🔭
    tier: "bronze",
    title: "Crow's Nest",
    description: "Kept watch - opened the Monthly Review three times.",
    hint: "Open the Monthly Review from the Budget screen 3 times.",
    check: (ctx) => ctx.stats.monthlyReviewOpens >= 3,
    progress: (ctx) => ({
      current: ctx.stats.monthlyReviewOpens,
      target: 3,
    }),
  },
  {
    id: "steady_crew",
    glyph: "⚖️", // ⚖️
    tier: "silver",
    title: "Steady Crew",
    description: "Three months running with every category under budget.",
    hint: "Stay under all category limits 3 months in a row.",
    check: (ctx) => longestConsecutiveRun(underBudgetMonths(ctx)) >= 3,
    progress: (ctx) => ({
      current: longestConsecutiveRun(underBudgetMonths(ctx)),
      target: 3,
      format: (c, t) => `${c} / ${t} mo`,
    }),
  },
  {
    id: "lighthouse_keeper",
    glyph: "🗼", // 🗼
    tier: "silver",
    title: "Lighthouse Keeper",
    description: "Opened the app 30 days in a row.",
    hint: "Keep a 30-day app-open streak.",
    check: (ctx) => ctx.stats.longestAppOpenStreak >= 30,
    progress: (ctx) => ({
      current: ctx.stats.longestAppOpenStreak,
      target: 30,
      format: (c, t) => `${c} / ${t} days`,
    }),
  },
  {
    id: "all_sails_set",
    glyph: "⛵", // ⛵
    tier: "gold",
    title: "All Sails Set",
    description: "Held every budget category under its limit for a month.",
    hint: "Keep all category limits for one full month.",
    check: (ctx) => underBudgetMonths(ctx).length > 0,
  },
  {
    id: "admiral",
    glyph: "🏅", // 🏅
    tier: "legendary",
    title: "Admiral",
    description: "Completed every milestone. The Ark is built.",
    hint: "Complete every step in the milestone plan.",
    revocable: true,
    check: (ctx) =>
      ctx.milestonePlan.steps.length > 0 &&
      ctx.milestonePlan.steps.every((s) => s.isCompleted),
    progress: (ctx) => {
      const total = ctx.milestonePlan.steps.length;
      if (total === 0) return null;
      const done = ctx.milestonePlan.steps.filter((s) => s.isCompleted).length;
      return { current: done, target: total };
    },
  },
];

export const ACHIEVEMENT_DEFS_BY_ID: Record<string, AchievementDef> =
  ACHIEVEMENT_DEFS.reduce<Record<string, AchievementDef>>((acc, def) => {
    acc[def.id] = def;
    return acc;
  }, {});

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENT_DEFS.length;
