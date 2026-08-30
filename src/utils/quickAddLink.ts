/**
 * BudgetArk - Quick-add deep link build + validation
 * File: src/utils/quickAddLink.ts
 *
 * The home-screen Quick Entry widget deep-links into the app with
 * `budgetark://quick-add?category=<name>`. This module is the single source
 * of truth for building those URIs (widget side) and validating them (app
 * side), so the two can never drift.
 *
 * Validation is fail-closed (see TODO.md security hardening: "Add deep link
 * validation if deep link routing is implemented"): anything that isn't
 * exactly a quick-add link is rejected, and a category that isn't a known
 * built-in falls back to "no preselection" rather than flowing an arbitrary
 * external string into app state.
 */

import { BUDGET_CATEGORIES, BudgetCategory } from "../types";

export const QUICK_ADD_SCHEME = "budgetark";
export const QUICK_ADD_HOST = "quick-add";

/**
 * Hard cap on accepted URL length. Real quick-add links are ~45 chars; a
 * longer URL is malformed or hostile, never legitimate.
 */
const MAX_URL_LENGTH = 256;

const BUILT_IN_CATEGORY_SET = new Set<string>(BUDGET_CATEGORIES);

export interface QuickAddLink {
  /** Preselected category, only ever a known built-in. */
  category?: BudgetCategory;
}

/** Builds the deep link the widget embeds in its category buttons. */
export const buildQuickAddUri = (category?: BudgetCategory): string => {
  const base = `${QUICK_ADD_SCHEME}://${QUICK_ADD_HOST}`;
  if (!category) return base;
  return `${base}?category=${encodeURIComponent(category)}`;
};

/**
 * Parses and validates an incoming URL. Returns null unless the URL is a
 * well-formed quick-add link; returns `{ category: undefined }` when the
 * link is valid but carries no (or an unrecognized) category.
 */
export const parseQuickAddUri = (
  url: string | null | undefined
): QuickAddLink | null => {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_URL_LENGTH) return null;

  // budgetark://quick-add, optional single trailing slash, optional ?query.
  // Anchored so nothing can smuggle extra path segments or a fragment.
  const match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]+)\/?(?:\?([^#]*))?$/.exec(
    trimmed
  );
  if (!match) return null;

  const [, scheme, host, query] = match;
  if (scheme.toLowerCase() !== QUICK_ADD_SCHEME) return null;
  if (host.toLowerCase() !== QUICK_ADD_HOST) return null;

  return { category: extractCategory(query) };
};

const extractCategory = (query: string | undefined): BudgetCategory | undefined => {
  if (!query) return undefined;

  for (const pair of query.split("&")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq) !== "category") continue;

    let value: string;
    try {
      value = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, " "));
    } catch {
      return undefined; // malformed percent-encoding - fail closed
    }

    // Control characters can't appear in a legitimate category name.
    if (hasControlChars(value)) return undefined;

    // Only built-ins ride the link: the widget is generated from
    // BUDGET_CATEGORIES, so anything else is stale or forged.
    if (BUILT_IN_CATEGORY_SET.has(value)) return value as BudgetCategory;
    return undefined;
  }
  return undefined;
};

/** True when the string contains ASCII control characters (C0 range or DEL). */
const hasControlChars = (value: string): boolean => {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
};
