/**
 * BudgetArk - Asset Category Hint
 * File: src/services/connections/assetCategoryHint.ts
 *
 * Guesses which Bridge category a provider account belongs in from its name,
 * so the wizard's "+ New account" form and the Connections manager's editor
 * preselect "401k / Retirement" for "Fidelity 401(k)" instead of defaulting
 * everything to Checking (which is how synced accounts ended up
 * miscategorized). SimpleFIN reports no account type at all and Teller's
 * subtype is lost in normalization, so the name is all we have; the guess
 * is only a default - the user can always pick another pill.
 *
 * Pure and dependency-free (Jest on Node). Order matters: the first matching
 * rule wins, so the more specific words (roth, ira, hsa) sit above the
 * generic ones (savings, checking).
 */

import type { AssetAccountCategory } from "../../types";

type Rule = { category: AssetAccountCategory; pattern: RegExp };

const RULES: readonly Rule[] = [
  // Retirement: 401(k)/403(b)/457, IRAs of every flavor, pensions, TSP.
  { category: "retirement", pattern: /\b(401\s*\(?k\)?|403\s*\(?b\)?|457\s*\(?b\)?|roth|ira|sep|simple ira|pension|retirement|tsp|thrift)\b/ },
  // Health savings accounts.
  { category: "hsa", pattern: /\b(hsa|health savings)\b/ },
  // Brokerage / investment.
  { category: "investment", pattern: /\b(brokerage|investment|investing|invest|stocks?|etf|mutual fund|529|taxable)\b/ },
  { category: "savings", pattern: /\b(savings?|money market|mma|cd|certificate|emergency|high[- ]yield|hysa)\b/ },
  { category: "checking", pattern: /\b(checking|chequing|current|everyday|spending|cash management|debit)\b/ },
];

/**
 * Best-guess Bridge category for a provider account name. Falls back to
 * "checking" (the most common linked account) when nothing matches.
 */
export const suggestAssetCategory = (accountName: string): AssetAccountCategory => {
  const name = accountName.toLowerCase().replace(/[_./-]+/g, " ");
  for (const rule of RULES) {
    if (rule.pattern.test(name)) return rule.category;
  }
  return "checking";
};
