/**
 * BudgetArk - Merchant Rule Update Builder
 * File: src/utils/merchantRuleUpdate.ts
 *
 * Turns the Merchant Rules editor's draft fields into the change payload
 * `reviewInboxService.changeMerchantRule` consumes, where `undefined` means
 * "leave the stored value alone" and `null` means "clear it".
 *
 * Extracted from MerchantRulesModal's save handler: the tri-state is easy
 * to get subtly wrong, and the "always skip" branch deliberately sends
 * `undefined` for every category field so flipping a rule to skip and back
 * restores its old category/rename/business/person instead of wiping them.
 * `updatedAt` is not set here - `updateMerchantRule` stamps it on write.
 */

import type { CategoryName, MerchantRule } from "../types";

export type MerchantRuleAction = NonNullable<MerchantRule["action"]>;

/** The expanded row's draft state. */
export interface MerchantRuleEditForm {
  /** "Always skip" leading pill. Wins over `autoApprove`. */
  ignore: boolean;
  autoApprove: boolean;
  category: CategoryName;
  /** Raw text field; empty clears the rename (the service trims/sanitizes). */
  renameTo: string;
  /** Undefined = "Personal" / no business. */
  businessId?: string;
  /** Everyone picked, in pill order; [] = "Unassigned". */
  personIds: readonly string[];
  /** Undefined = no bill - approved expenses are plain entries. */
  recurringEntryId?: string;
}

/**
 * Structurally the `ChangeRuleOptions` the service takes - declared here so
 * this helper stays free of the service's storage imports.
 */
export interface MerchantRuleUpdate {
  ruleId: string;
  action: MerchantRuleAction;
  category?: CategoryName;
  renameTo?: string;
  businessId?: string | null;
  personIds?: readonly string[] | null;
  recurringEntryId?: string | null;
}

export const buildMerchantRuleUpdate = (
  form: MerchantRuleEditForm,
  existingRule: MerchantRule,
): MerchantRuleUpdate => ({
  ruleId: existingRule.id,
  action: form.ignore ? "ignore" : form.autoApprove ? "approve" : "categorize",
  category: form.ignore ? undefined : form.category,
  // Ignore rules never read rename/business - keep whatever was
  // stored so flipping back to categorize restores it.
  renameTo: form.ignore ? undefined : form.renameTo,
  businessId: form.ignore ? undefined : form.businessId ?? null,
  personIds: form.ignore
    ? undefined
    : form.personIds.length > 0
      ? form.personIds
      : null,
  recurringEntryId: form.ignore ? undefined : form.recurringEntryId ?? null,
});
