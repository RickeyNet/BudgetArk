/**
 * BudgetArk - Review Inbox
 * File: src/components/ReviewInboxModal.tsx
 *
 * Where imported bank transactions wait for the user's decision. Grouped by
 * posted date, with heuristic sections ("Likely transfers", "Possibly already
 * in your budget") that offer a Skip-all shortcut. Each row expands into a
 * name field (rename the noisy bank text), a category picker, a business
 * picker (expenses, when businesses exist), an "Applies to bill" picker
 * that lists the month's recurring bills AND the Debt tracker's debts (a
 * card payment logged against its debt records a Payment there instead of
 * an expense - utils/inboxDebtPayments), and an "always do this" rule
 * checkbox - on Approve it creates an auto-approve rule (future imports
 * become entries without stopping here, and matching items still in the
 * inbox are approved on the spot); on Skip it creates an ignore rule so
 * the merchant (credit-card payments, debt payments) never imports again.
 * A bulk bar
 * approves everything that already has a rule-suggested category. The Rules
 * header button opens MerchantRulesModal, where saved rules can be changed
 * or deleted later.
 *
 * Approvals run through reviewInboxService (entry -> ledger -> inbox write
 * order); the host screen refreshes its entry list via `onChanged`.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  BudgetEntry,
  MerchantRule,
  SavingsGoal,
  Business,
  CategoryName,
  CustomCategory,
  Debt,
  ExternalAccountLink,
  PendingTransaction,
  Person,
} from "../types";
import { describeError } from "../utils/errorMessage";
import TagPillPicker, { MultiTagPillPicker } from "./TagPillPicker";
import { entryPersonIds, formatPersonNames } from "../utils/entryPeople";
import { LENT_TO_MAX_LENGTH, lentToSuggestions } from "../utils/loans";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useCurrency } from "../currency/CurrencyProvider";
import { useConnections } from "../connections/ConnectionsProvider";
import CategoryPillPicker from "./CategoryPillPicker";
import MerchantRulesModal from "./MerchantRulesModal";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";
import {
  applyPendingPaymentToDebt,
  applyPendingTransferToPlan,
  applyRulesToInbox,
  approvePendingGroup,
  approvePendingTransaction,
  dismissAndIgnoreMerchant,
  dismissPendingTransactions,
} from "../services/connections/reviewInboxService";
import { suggestRuleFromHistory } from "../services/connections/ruleNudges";
import { describeUnusualCharge, flagUnusualCharges } from "../utils/unusualCharges";
import { getLinks } from "../storage/externalAccountLinksStorage";
import { statementAccountLabelFrom } from "../utils/bankCsvImport";
import { getMerchantRules } from "../storage/merchantRulesStorage";
import { getSavingsGoals } from "../storage/savingsGoalStorage";
import { getDebts } from "../storage/debtStorage";
import {
  debtIdFromOption,
  debtOptionId,
  rankDebtCandidates,
} from "../utils/inboxDebtPayments";
import { remainingForPlan } from "../utils/purchasePlanner";
import { triggerHaptic } from "../utils/haptics";
import { generateUUID } from "../utils/uuid";
import { sanitizeTextInput } from "../utils/sanitize";
import { addBudgetEntry } from "../storage/budgetStorage";
import { buildEntryDateISO, lastDayOfYearMonth } from "../utils/entryDate";
import {
  detectRecurringBill,
  type RecurringBillSuggestion,
} from "../utils/recurringBillDetection";
import { useTipJar } from "../tipjar/TipJarProvider";
import { useValueChanged } from "../hooks/useValueChanged";
import type { TipNudgeCopy } from "../utils/tipJarNudge";
import TipJarNudgeCard from "./TipJarNudgeCard";
import {
  entryMonthKey,
  isBillCandidate,
  rankBillCandidates,
} from "../utils/billFulfillment";
import {
  buildInboxSections,
  buildInboxSectionsByMerchant,
  groupDefaultCategory,
  type InboxSection,
} from "../utils/reviewInboxSections";

interface ReviewInboxModalProps {
  visible: boolean;
  onClose: () => void;
  customCategories: CustomCategory[];
  /** Live businesses, for expense tagging. Empty = picker hidden. */
  businesses: Business[];
  /** Live people, for assigning who spent it. Empty = picker hidden. */
  people: Person[];
  /**
   * Live budget entries, so an expense can be approved as the actual charge
   * for one of the month's recurring bills (utils/billFulfillment).
   */
  entries: BudgetEntry[];
  /** Called after approvals/dismissals so the Budget screen reloads entries. */
  onChanged: () => void | Promise<void>;
}

const DEFAULT_CATEGORY: CategoryName = "Other";


const ReviewInboxModal: React.FC<ReviewInboxModalProps> = ({
  visible,
  onClose,
  customCategories,
  businesses,
  people,
  entries,
  onChanged,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { formatCurrency } = useCurrency();
  const {
    connections,
    pendingTransactions,
    isSyncing,
    refresh,
    syncNow,
  } = useConnections();

  const [links, setLinks] = useState<ExternalAccountLink[]>([]);
  /** Live merchant rules, so the "make it a rule" nudge knows what's covered. */
  const [rules, setRules] = useState<MerchantRule[]>([]);
  /** Purchase plans (never the emergency fund) an outflow can be added to. */
  const [plans, setPlans] = useState<SavingsGoal[]>([]);
  /** Debt tracker debts an outflow can be logged as a payment on. */
  const [debts, setDebts] = useState<Debt[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftCategory, setDraftCategory] = useState<CategoryName>(DEFAULT_CATEGORY);
  const [draftName, setDraftName] = useState("");
  const [draftBusinessId, setDraftBusinessId] = useState<string | undefined>(
    undefined,
  );
  // Multi-select, like the entry form: a grocery run is the whole family's.
  const [draftPersonIds, setDraftPersonIds] = useState<string[]>([]);
  // Either a recurring bill's entry id or a debt pill ("debt:<id>", see
  // utils/inboxDebtPayments) - the two share one "Applies to bill" picker.
  const [draftRecurringId, setDraftRecurringId] = useState<string | undefined>(
    undefined,
  );
  /** "Lent to someone?" - free text, "" = not a loan (see BudgetEntry.lentTo). */
  const [draftLentTo, setDraftLentTo] = useState("");
  const [rememberRule, setRememberRule] = useState(false);
  // "By vendor" grouping: fold every transaction from one merchant into a
  // single section so a big multi-month import is triaged vendor by vendor.
  const [groupByMerchant, setGroupByMerchant] = useState(false);
  // The merchant group whose inline "Categorize all" controls are open, and
  // the category / remember-rule the user picked for it.
  const [categorizeGroupKey, setCategorizeGroupKey] = useState<string | null>(null);
  const [groupCategory, setGroupCategory] = useState<CategoryName>(DEFAULT_CATEGORY);
  const [groupRemember, setGroupRemember] = useState(false);
  const lentToChips = useMemo(
    () => lentToSuggestions(entries).filter((name) => name !== draftLentTo),
    [entries, draftLentTo],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showRules, setShowRules] = useState(false);
  /** Last failed load/approve/skip, shown under the header until the next action. */
  const [actionError, setActionError] = useState<string | null>(null);
  /**
   * The occasional Tip Jar note after a charge is filed against a bill.
   * Rendered inline (this sheet stays open across approvals) and dropped
   * when the sheet closes - render-time reset, not an effect.
   */
  const [inboxNudge, setInboxNudge] = useState<TipNudgeCopy | null>(null);
  /** Pending id whose "make it a recurring bill" is being created. */
  const [creatingBillId, setCreatingBillId] = useState<string | null>(null);
  const { noteWin, openTipJar } = useTipJar();
  if (useValueChanged(visible) && !visible && inboxNudge) setInboxNudge(null);

  useEffect(() => {
    if (!visible) return;
    void refresh()
      .then(() => setActionError(null))
      .catch((error: unknown) =>
        setActionError(describeError(error, "Couldn't load the inbox.")),
      );
    // Account names are cosmetic here - a failed read just shows ids.
    void getLinks()
      .then(setLinks)
      .catch(() => setLinks([]));
    // Both nudges degrade to "not shown" when their read fails.
    void getMerchantRules()
      .then(setRules)
      .catch(() => setRules([]));
    void getSavingsGoals()
      .then((goals) =>
        setPlans(goals.filter((goal) => goal.category !== "emergency_fund")),
      )
      .catch(() => setPlans([]));
    // Debts are offered in the bill picker; a failed read just hides them.
    void getDebts()
      .then(setDebts)
      .catch(() => setDebts([]));
  }, [visible, refresh]);

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const link of links) {
      map.set(link.externalAccountId, link.externalName);
    }
    return map;
  }, [links]);

  const debtNameById = useMemo(
    () => new Map(debts.map((debt) => [debt.id, debt.name])),
    [debts],
  );

  const billNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      if (isBillCandidate(entry)) {
        map.set(entry.id, entry.description?.trim() || entry.category);
      }
    }
    return map;
  }, [entries]);

  const businessNameById = useMemo(
    () => new Map(businesses.map((b) => [b.id, b.name])),
    [businesses],
  );

  const personNameById = useMemo(
    () => new Map(people.map((p) => [p.id, p.name])),
    [people],
  );

  // Dated day sections, then the two heuristic "Skip all" sections. An
  // item flagged both duplicate- and transfer-likely appears only under
  // "Likely transfers" - see utils/reviewInboxSections.
  const sections = useMemo<InboxSection[]>(
    () =>
      groupByMerchant
        ? buildInboxSectionsByMerchant(pendingTransactions)
        : buildInboxSections(pendingTransactions),
    [groupByMerchant, pendingTransactions]
  );

  // Warning lines for charges far above the merchant's usual, or large
  // first-ever ones (utils/unusualCharges). Flags only - never auto-skipped.
  const unusualById = useMemo(
    () => flagUnusualCharges(pendingTransactions, entries),
    [entries, pendingTransactions],
  );

  const suggestedReadyCount = useMemo(
    () =>
      pendingTransactions.filter(
        (item) =>
          item.suggestedCategory && !item.transferLikely && !item.duplicateLikely,
      ).length,
    [pendingTransactions],
  );

  const toggleExpand = useCallback((item: PendingTransaction) => {
    setExpandedId((prev) => {
      if (prev === item.id) return null;
      setDraftCategory(item.suggestedCategory ?? DEFAULT_CATEGORY);
      setDraftName(item.suggestedName ?? item.description);
      setDraftBusinessId(
        item.suggestedType === "expense" ? item.suggestedBusinessId : undefined,
      );
      setDraftPersonIds(
        item.suggestedType === "expense"
          ? entryPersonIds({
              personId: item.suggestedPersonId,
              personIds: item.suggestedPersonIds,
            })
          : [],
      );
      // A rule's debt wins over its bill - the two share one picker.
      setDraftRecurringId(
        item.suggestedType !== "expense"
          ? undefined
          : item.suggestedDebtId
            ? debtOptionId(item.suggestedDebtId)
            : item.suggestedRecurringId,
      );
      setDraftLentTo("");
      setRememberRule(false);
      return item.id;
    });
  }, []);

  const handleApprove = useCallback(
    async (
      item: PendingTransaction,
      category: CategoryName,
      remember: boolean,
      name: string,
      businessId: string | undefined,
      personIds: string[],
      recurringId: string | undefined,
      lentTo: string,
    ) => {
      setBusyId(item.id);
      setActionError(null);
      try {
        await approvePendingTransaction({
          pendingId: item.id,
          category,
          description: name,
          // null = explicitly personal/unassigned/not a bill; never fall
          // back to the suggestion the user just cleared.
          businessId: businessId ?? null,
          personIds: personIds.length > 0 ? personIds : null,
          fulfillsRecurringId: recurringId ?? null,
          lentTo: lentTo.trim() || null,
          rememberRule: remember,
        });
        // "Always" just created an auto-approve rule - sweep the rest of
        // the inbox so matching items are approved now, not next sync.
        if (remember && item.merchant) {
          await applyRulesToInbox();
          void getMerchantRules()
            .then(setRules)
            .catch(() => undefined);
        }
        await refresh();
        await onChanged();
        triggerHaptic("success");
        setExpandedId(null);
        // Filing a real charge against its bill is a win; only the
        // occasional one (utils/tipJarNudge cadence) returns copy to show.
        if (recurringId) {
          const nudge = await noteWin({
            kind: "bill-paid",
            label: billNameById.get(recurringId),
          });
          if (nudge) setInboxNudge(nudge);
        }
      } catch (error) {
        triggerHaptic("error");
        setActionError(describeError(error, "Couldn't approve this transaction."));
      } finally {
        setBusyId(null);
      }
    },
    [billNameById, noteWin, onChanged, refresh],
  );

  const handleSkip = useCallback(
    async (item: PendingTransaction, remember: boolean) => {
      setBusyId(item.id);
      setActionError(null);
      try {
        // "Always" + Skip = ignore this merchant on every future sync (and
        // clear its other inbox items right now).
        if (remember && item.merchant) {
          await dismissAndIgnoreMerchant(item.id);
        } else {
          await dismissPendingTransactions([item.id]);
        }
        await refresh();
        triggerHaptic("selection");
        setExpandedId(null);
      } catch (error) {
        triggerHaptic("error");
        setActionError(describeError(error, "Couldn't skip this transaction."));
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const handleTransferToPlan = useCallback(
    async (item: PendingTransaction, goal: SavingsGoal) => {
      setBusyId(item.id);
      setActionError(null);
      try {
        const goals = await applyPendingTransferToPlan(item.id, goal.id);
        if (goals) {
          setPlans(goals.filter((candidate) => candidate.category !== "emergency_fund"));
        }
        await refresh();
        await onChanged();
        triggerHaptic("success");
        setExpandedId(null);
      } catch (error) {
        triggerHaptic("error");
        setActionError(describeError(error, "Couldn't add this to the plan."));
      } finally {
        setBusyId(null);
      }
    },
    [onChanged, refresh],
  );

  /**
   * "Applies to bill" → a debt: log the outflow as a payment on that debt
   * (Debt tab balance + history) and retire the row without an expense
   * entry - see applyPendingPaymentToDebt for why no entry.
   */
  const handleLogDebtPayment = useCallback(
    async (item: PendingTransaction, debtId: string, remember: boolean) => {
      setBusyId(item.id);
      setActionError(null);
      try {
        const result = await applyPendingPaymentToDebt(item.id, debtId, {
          rememberRule: remember,
        });
        if (result) setDebts(result.debts);
        // "Always" just created a debt rule - sweep the rest of the inbox
        // so this merchant's other rows are logged now, not next sync.
        if (remember && item.merchant) {
          await applyRulesToInbox();
          void getMerchantRules()
            .then(setRules)
            .catch(() => undefined);
        }
        await refresh();
        await onChanged();
        triggerHaptic("success");
        setExpandedId(null);
        if (result) {
          // Same win the Debt tab counts for a logged payment.
          const nudge = await noteWin(
            result.paidOff
              ? { kind: "debt-payoff", label: result.paidOff.name }
              : { kind: "debt-payment" },
          );
          if (nudge) setInboxNudge(nudge);
        }
      } catch (error) {
        triggerHaptic("error");
        setActionError(describeError(error, "Couldn't log this debt payment."));
      } finally {
        setBusyId(null);
      }
    },
    [noteWin, onChanged, refresh],
  );

  const handleSkipSection = useCallback(
    async (items: PendingTransaction[]) => {
      setBulkBusy(true);
      setActionError(null);
      try {
        await dismissPendingTransactions(items.map((item) => item.id));
        await refresh();
        triggerHaptic("selection");
      } catch (error) {
        triggerHaptic("error");
        setActionError(describeError(error, "Couldn't skip those transactions."));
      } finally {
        setBulkBusy(false);
      }
    },
    [refresh],
  );

  /**
   * "Make it a recurring bill" (utils/recurringBillDetection): create the
   * bill from the draft name/category with the average charge as its
   * estimate, starting this month on the usual posting day, then preselect
   * it as the bill this charge fulfils and tick "Always do this" so the
   * merchant rule files future charges against it automatically. The host
   * reloads entries via onChanged, which is what makes the new bill appear
   * in the "Applies to bill" picker.
   */
  const handleCreateBill = useCallback(
    async (item: PendingTransaction, suggestion: RecurringBillSuggestion) => {
      if (creatingBillId) return;
      setCreatingBillId(item.id);
      setActionError(null);
      try {
        const now = new Date().toISOString();
        const monthKey = entryMonthKey(item.postedAt);
        const day = Math.min(suggestion.dayOfMonth, lastDayOfYearMonth(monthKey));
        const bill: BudgetEntry = {
          id: generateUUID(),
          type: "expense",
          category: draftCategory,
          amount: suggestion.averageAmount,
          description: sanitizeTextInput(draftName.trim() || suggestion.label) || undefined,
          date: buildEntryDateISO(monthKey, day),
          recurring: true,
          recurrenceInterval: 1,
          // Remembered so the detector never re-offers this merchant.
          merchant: suggestion.merchant,
          createdAt: now,
          updatedAt: now,
        };
        await addBudgetEntry(bill);
        await onChanged();
        setDraftRecurringId(bill.id);
        setRememberRule(true);
        triggerHaptic("success");
      } catch (error) {
        triggerHaptic("error");
        setActionError(describeError(error, "Couldn't create the recurring bill."));
      } finally {
        setCreatingBillId(null);
      }
    },
    [creatingBillId, draftCategory, draftName, onChanged],
  );

  // Switch grouping; closing any open item/group editor so nothing points at
  // a section that no longer exists in the new layout.
  const toggleGrouping = useCallback((byMerchant: boolean) => {
    setGroupByMerchant(byMerchant);
    setExpandedId(null);
    setCategorizeGroupKey(null);
  }, []);

  // Open (or close) a merchant group's inline "Categorize all" controls,
  // seeding the category from what most of the group was already suggested.
  const toggleCategorizeGroup = useCallback((section: InboxSection) => {
    setCategorizeGroupKey((prev) => {
      if (prev === section.groupKey) return null;
      setGroupCategory(groupDefaultCategory(section.data) ?? DEFAULT_CATEGORY);
      setGroupRemember(false);
      return section.groupKey ?? null;
    });
  }, []);

  const handleApproveGroup = useCallback(
    async (section: InboxSection) => {
      if (!section.groupKey || section.data.length === 0) return;
      setBulkBusy(true);
      setActionError(null);
      try {
        await approvePendingGroup(
          section.data.map((item) => item.id),
          groupCategory,
          { rememberRule: groupRemember },
        );
        // A remembered rule can cover items outside this group (other months
        // already in the inbox); sweep so they are handled now too.
        if (groupRemember) {
          await applyRulesToInbox();
          void getMerchantRules()
            .then(setRules)
            .catch(() => undefined);
        }
        setCategorizeGroupKey(null);
        await refresh();
        await onChanged();
        triggerHaptic("success");
      } catch (error) {
        triggerHaptic("error");
        setActionError(
          describeError(error, "Couldn't categorize this vendor's transactions."),
        );
        await refresh().catch(() => undefined);
      } finally {
        setBulkBusy(false);
      }
    },
    [groupCategory, groupRemember, onChanged, refresh],
  );

  const handleBulkApprove = useCallback(async () => {
    const ready = pendingTransactions.filter(
      (item) =>
        item.suggestedCategory && !item.transferLikely && !item.duplicateLikely,
    );
    if (ready.length === 0) return;
    setBulkBusy(true);
    setActionError(null);
    try {
      for (const item of ready) {
        await approvePendingTransaction({
          pendingId: item.id,
          category: item.suggestedCategory as CategoryName,
        });
      }
      await refresh();
      await onChanged();
      triggerHaptic("success");
    } catch (error) {
      // Approvals already written stay written (each is its own atomic
      // save); refresh so the list reflects exactly what landed.
      triggerHaptic("error");
      setActionError(
        describeError(error, "Couldn't approve all of the suggested transactions."),
      );
      await refresh().catch(() => undefined);
    } finally {
      setBulkBusy(false);
    }
  }, [onChanged, pendingTransactions, refresh]);

  const renderItem = ({ item }: { item: PendingTransaction }) => {
    const expanded = expandedId === item.id;
    const busy = busyId === item.id;
    const isExpense = item.amount < 0;
    // Statement-file rows have no ExternalAccountLink to name them; their
    // label is carried in the account id (utils/bankCsvImport).
    const accountName =
      accountNameById.get(item.externalAccountId) ??
      statementAccountLabelFrom(item.externalAccountId);
    // The picked pill, when it is a debt rather than a bill.
    const draftDebtId = expanded ? debtIdFromOption(draftRecurringId) : undefined;
    // Bills this charge could stand in for, in the month it posted - best
    // guess first (same category, closest estimate).
    const billCandidates =
      expanded && item.suggestedType === "expense"
        ? rankBillCandidates(entries, entryMonthKey(item.postedAt), {
            category: draftCategory,
            amount: Math.abs(item.amount),
            keepId: draftRecurringId,
          })
        : [];
    // Debts the outflow could be a payment on (utils/inboxDebtPayments) -
    // the Budget's "Debt Payments" rows come from the Debt tracker, not
    // from entries, so they are offered here alongside the bills. Debts
    // lead when the category says it's a debt payment; bills otherwise.
    const debtCandidates =
      expanded && item.suggestedType === "expense"
        ? rankDebtCandidates(debts, {
            amount: Math.abs(item.amount),
            keepId: draftDebtId,
          })
        : [];
    const billOptions = billCandidates.map((bill) => ({
      id: bill.id,
      name: `${bill.description?.trim() || bill.category} · est. ${formatCurrency(
        bill.amount,
      )}`,
    }));
    const debtOptions = debtCandidates.map((debt) => ({
      id: debtOptionId(debt.id),
      name: `${debt.name} · min ${formatCurrency(debt.minPayment)}`,
    }));
    const applyToOptions =
      draftCategory === "Debt Payments"
        ? [...debtOptions, ...billOptions]
        : [...billOptions, ...debtOptions];
    // A merchant that has charged once a month for three months with no
    // bill on file: offer to create one (hidden once a bill is picked).
    const billSuggestion =
      expanded && item.suggestedType === "expense" && !draftRecurringId
        ? detectRecurringBill(item, entries)
        : null;
    // Same merchant filed by hand into the same category a few times with
    // no rule: offer the rule (hidden once "always" is already ticked, and
    // when a debt is picked - the nudge's rule would file entries, not
    // payments; the "always" checkbox below covers the debt case).
    const ruleNudge =
      expanded && !rememberRule && !draftDebtId
        ? suggestRuleFromHistory(item, entries, rules)
        : null;
    const planChoices = expanded && isExpense ? plans : [];
    return (
      <View style={styles.itemCard}>
        <TouchableOpacity
          style={styles.itemHeader}
          onPress={() => toggleExpand(item)}
          activeOpacity={0.7}
        >
          <View style={styles.itemTextWrap}>
            <Text style={styles.itemMerchant} numberOfLines={1}>
              {item.suggestedName ||
                item.merchant ||
                item.description ||
                "(no description)"}
            </Text>
            <Text style={styles.itemMeta} numberOfLines={1}>
              {[
                accountName,
                item.pending ? "pending" : null,
                item.suggestedCategory
                  ? `suggested: ${item.suggestedCategory}`
                  : null,
                item.suggestedBusinessId
                  ? `💼 ${
                      businessNameById.get(item.suggestedBusinessId) ??
                      "(deleted business)"
                    }`
                  : null,
                item.suggestedPersonId
                  ? `👤 ${formatPersonNames(
                      entryPersonIds({
                        personId: item.suggestedPersonId,
                        personIds: item.suggestedPersonIds,
                      }),
                      personNameById,
                      "(deleted person)",
                    )}`
                  : null,
                item.suggestedDebtId
                  ? `💳 ${debtNameById.get(item.suggestedDebtId) ?? "(deleted debt)"}`
                  : item.suggestedRecurringId &&
                      billNameById.has(item.suggestedRecurringId)
                    ? `🧾 ${billNameById.get(item.suggestedRecurringId)}`
                    : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {unusualById.has(item.id) ? (
              <Text style={styles.unusualTag} numberOfLines={1}>
                ⚠️ {describeUnusualCharge(unusualById.get(item.id)!, formatCurrency)}
              </Text>
            ) : null}
          </View>
          <Text
            style={[
              styles.itemAmount,
              { color: isExpense ? colors.warning : colors.success },
            ]}
          >
            {isExpense ? "-" : "+"}
            {formatCurrency(Math.abs(item.amount))}
          </Text>
        </TouchableOpacity>

        {expanded ? (
          <View style={styles.expandedArea}>
            <Text style={styles.label}>NAME</Text>
            <TextInput
              style={styles.nameInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder={item.description || "Name this transaction"}
              placeholderTextColor={colors.textMuted}
              maxLength={220}
              returnKeyType="done"
            />
            <Text style={styles.label}>CATEGORY</Text>
            <CategoryPillPicker
              value={draftCategory}
              onChange={setDraftCategory}
              customCategories={customCategories}
              allowCreate
            />
            {billSuggestion ? (
              <View style={styles.billSuggestCard}>
                <Text style={styles.billSuggestTitle}>🧾 Looks like a monthly bill</Text>
                <Text style={styles.billSuggestText}>
                  {billSuggestion.label} has posted once a month for{" "}
                  {billSuggestion.months.length} months, averaging{" "}
                  {formatCurrency(billSuggestion.averageAmount)}. Make it a
                  recurring bill and this charge - and future ones - file
                  against it instead of stacking on the estimate.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.billSuggestButton,
                    creatingBillId !== null && styles.buttonDisabled,
                  ]}
                  onPress={() => void handleCreateBill(item, billSuggestion)}
                  disabled={creatingBillId !== null || busy}
                >
                  <Text style={styles.billSuggestButtonText}>
                    {creatingBillId === item.id
                      ? "Creating..."
                      : `Make it a recurring bill · ${formatCurrency(
                          billSuggestion.averageAmount,
                        )}/mo`}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {ruleNudge ? (
              <View style={styles.billSuggestCard}>
                <Text style={styles.billSuggestTitle}>🔁 You've done this before</Text>
                <Text style={styles.billSuggestText}>
                  You've approved "{ruleNudge.merchant}" as {ruleNudge.category}{" "}
                  {ruleNudge.count} times. Make it a rule and future imports from
                  this merchant approve themselves with the same category.
                </Text>
                <TouchableOpacity
                  style={[styles.billSuggestButton, busy && styles.buttonDisabled]}
                  onPress={() =>
                    void handleApprove(
                      item,
                      ruleNudge.category,
                      true,
                      draftName,
                      draftBusinessId,
                      draftPersonIds,
                      draftRecurringId,
                      draftLentTo,
                    )
                  }
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                >
                  <Text style={styles.billSuggestButtonText}>
                    {busy ? "Saving..." : `Always approve as ${ruleNudge.category}`}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {applyToOptions.length > 0 ? (
              <>
                <Text style={styles.label}>APPLIES TO BILL</Text>
                <TagPillPicker
                  options={applyToOptions}
                  value={draftRecurringId}
                  onChange={setDraftRecurringId}
                  noneLabel="Not a bill"
                  glyph="🧾"
                />
                {draftDebtId ? (
                  <Text style={styles.planHint}>
                    Logged as a payment on this debt - its balance and payment
                    history update on the Debts tab, and the Budget counts it
                    under Debt Payments. No separate expense is created, and
                    the category above is not used. Tick "Always do this"
                    below and future payments to this merchant are logged on
                    the debt without stopping here.
                  </Text>
                ) : null}
              </>
            ) : null}
            {item.suggestedType === "expense" &&
            (businesses.length > 0 || draftBusinessId) ? (
              <>
                <Text style={styles.label}>BUSINESS</Text>
                <TagPillPicker
                    options={businesses}
                    value={draftBusinessId}
                    onChange={setDraftBusinessId}
                    noneLabel="Personal"
                    glyph="💼"
                    deletedLabel="(deleted business)"
                  />
              </>
            ) : null}
            {item.suggestedType === "expense" &&
            (people.length > 0 || draftPersonIds.length > 0) ? (
              <>
                <Text style={styles.label}>PEOPLE</Text>
                <MultiTagPillPicker
                    options={people}
                    values={draftPersonIds}
                    onChange={setDraftPersonIds}
                    noneLabel="Unassigned"
                    glyph="👤"
                    deletedLabel="(deleted person)"
                  />
              </>
            ) : null}
            {item.suggestedType === "expense" ? (
              <>
                <Text style={styles.label}>LENT TO SOMEONE?</Text>
                <Text style={styles.planHint}>
                  Money you expect back? Name who has it and track what they
                  pay back under Profile → People → Owed to You.
                </Text>
                <TextInput
                  style={styles.nameInput}
                  value={draftLentTo}
                  onChangeText={setDraftLentTo}
                  placeholder="Leave blank if this isn't a loan"
                  placeholderTextColor={colors.textMuted}
                  maxLength={LENT_TO_MAX_LENGTH}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
                {lentToChips.length > 0 ? (
                  <View style={styles.planChipRow}>
                    {lentToChips.map((name) => (
                      <TouchableOpacity
                        key={name}
                        style={styles.planChip}
                        onPress={() => setDraftLentTo(name)}
                        accessibilityRole="button"
                        accessibilityLabel={`Lent to ${name}`}
                      >
                        <Text style={styles.planChipText} numberOfLines={1}>
                          🤝 {name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
            {planChoices.length > 0 ? (
              <>
                <Text style={styles.label}>ADD TO A PURCHASE PLAN</Text>
                <Text style={styles.planHint}>
                  Moved this money into savings for one of your plans? Tap the
                  plan and the amount lands on its balance instead of being
                  filed as an expense.
                </Text>
                <View style={styles.planChipRow}>
                  {planChoices.map((goal) => {
                    const remaining = remainingForPlan(goal);
                    return (
                      <TouchableOpacity
                        key={goal.id}
                        style={[styles.planChip, busy && styles.buttonDisabled]}
                        onPress={() => void handleTransferToPlan(item, goal)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${formatCurrency(
                          Math.abs(item.amount),
                        )} to ${goal.name}`}
                      >
                        <Text style={styles.planChipText} numberOfLines={1}>
                          {goal.name}
                          {remaining > 0
                            ? ` · ${formatCurrency(remaining)} to go`
                            : " · funded"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}
            {item.merchant ? (
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberRule((prev) => !prev)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.checkbox, rememberRule && styles.checkboxActive]}
                >
                  {rememberRule ? <Text style={styles.checkboxCheck}>✓</Text> : null}
                </View>
                <Text style={styles.rememberLabel}>
                  Always do this for "{item.merchant}" - on Approve, matching
                  transactions here and in future imports are approved
                  automatically with these choices; on Skip, it never imports
                  again
                </Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.skipButton, busy && styles.buttonDisabled]}
                onPress={() => void handleSkip(item, rememberRule)}
                disabled={busy}
              >
                <Text style={styles.skipButtonText}>
                  {rememberRule && item.merchant ? "Always Skip" : "Skip"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveButton, busy && styles.buttonDisabled]}
                onPress={() =>
                  void (draftDebtId
                    ? handleLogDebtPayment(item, draftDebtId, rememberRule)
                    : handleApprove(
                        item,
                        draftCategory,
                        rememberRule,
                        draftName,
                        draftBusinessId,
                        draftPersonIds,
                        draftRecurringId,
                        draftLentTo,
                      ))
                }
                disabled={busy}
              >
                <Text style={styles.approveButtonText}>
                  {busy
                    ? "Saving..."
                    : draftDebtId
                      ? rememberRule && item.merchant
                        ? "Always Log Payment"
                        : "Log Payment"
                      : rememberRule && item.merchant
                        ? "Always Approve"
                        : "Approve"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SheetKeyboardAvoider style={styles.overlay}>
        <View style={styles.modalSheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Review Inbox</Text>
              <Text style={styles.subtitle}>
                {pendingTransactions.length > 0
                  ? `${pendingTransactions.length} imported transaction${
                      pendingTransactions.length === 1 ? "" : "s"
                    } waiting for approval`
                  : "Nothing to review"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={() => setShowRules(true)}
            >
              <Text style={styles.syncButtonText}>Rules</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.syncButton, isSyncing && styles.buttonDisabled]}
              onPress={() =>
                // A sync can now auto-approve items into real entries, so
                // the host screen must reload its entry list afterwards.
                void (async () => {
                  await syncNow();
                  await onChanged();
                })()
              }
              disabled={isSyncing || connections.length === 0}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={colors.textDim} />
              ) : (
                <Text style={styles.syncButtonText}>Sync</Text>
              )}
            </TouchableOpacity>
          </View>

          {actionError ? (
            <Text style={styles.errorText}>{actionError}</Text>
          ) : null}

          {inboxNudge ? (
            <TipJarNudgeCard
              copy={inboxNudge}
              onTip={() => {
                // Close this sheet first; the provider presents the Tip Jar
                // after the dismiss settles (iOS never stacks two Modals).
                setInboxNudge(null);
                onClose();
                openTipJar();
              }}
              onDismiss={() => setInboxNudge(null)}
              style={styles.nudgeCard}
            />
          ) : null}

          {pendingTransactions.length > 1 ? (
            <View style={styles.groupToggleRow}>
              <Text style={styles.groupToggleLabel}>Group by</Text>
              <View style={styles.groupToggle}>
                <TouchableOpacity
                  style={[styles.groupToggleBtn, !groupByMerchant && styles.groupToggleBtnActive]}
                  onPress={() => toggleGrouping(false)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !groupByMerchant }}
                >
                  <Text
                    style={[
                      styles.groupToggleText,
                      !groupByMerchant && styles.groupToggleTextActive,
                    ]}
                  >
                    Date
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.groupToggleBtn, groupByMerchant && styles.groupToggleBtnActive]}
                  onPress={() => toggleGrouping(true)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: groupByMerchant }}
                >
                  <Text
                    style={[
                      styles.groupToggleText,
                      groupByMerchant && styles.groupToggleTextActive,
                    ]}
                  >
                    Vendor
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {suggestedReadyCount > 0 ? (
            <TouchableOpacity
              style={[styles.bulkBar, bulkBusy && styles.buttonDisabled]}
              onPress={() => void handleBulkApprove()}
              disabled={bulkBusy}
            >
              <Text style={styles.bulkBarText}>
                {bulkBusy
                  ? "Approving..."
                  : `Approve ${suggestedReadyCount} with suggested categories`}
              </Text>
            </TouchableOpacity>
          ) : null}

          {pendingTransactions.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyGlyph}>📥</Text>
              <Text style={styles.emptyText}>
                Inbox zero. New transactions land here after a sync.
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              renderSectionHeader={({ section }) => {
                const categorizing =
                  section.bulkCategorizable &&
                  section.groupKey != null &&
                  categorizeGroupKey === section.groupKey;
                return (
                  <View>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionHeader}>{section.title}</Text>
                      {section.bulkSkippable ? (
                        <TouchableOpacity
                          onPress={() => void handleSkipSection(section.data)}
                          disabled={bulkBusy}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text
                            style={[
                              styles.sectionSkipAll,
                              bulkBusy && styles.buttonDisabled,
                            ]}
                          >
                            Skip all
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {section.bulkCategorizable ? (
                        <TouchableOpacity
                          onPress={() => toggleCategorizeGroup(section)}
                          disabled={bulkBusy}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text
                            style={[
                              styles.sectionSkipAll,
                              bulkBusy && styles.buttonDisabled,
                            ]}
                          >
                            {categorizing ? "Close" : "Categorize all"}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {categorizing ? (
                      <View style={styles.groupCategorizer}>
                        <CategoryPillPicker
                          value={groupCategory}
                          onChange={setGroupCategory}
                          pinCurrentValue
                        />
                        <TouchableOpacity
                          style={styles.rememberRow}
                          onPress={() => setGroupRemember((v) => !v)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: groupRemember }}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              groupRemember && styles.checkboxActive,
                            ]}
                          >
                            {groupRemember ? (
                              <Text style={styles.checkboxCheck}>✓</Text>
                            ) : null}
                          </View>
                          <Text style={styles.rememberLabel}>
                            Always file this vendor here
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.groupApproveBtn, bulkBusy && styles.buttonDisabled]}
                          onPress={() => void handleApproveGroup(section)}
                          disabled={bulkBusy}
                        >
                          <Text style={styles.groupApproveText}>
                            {bulkBusy
                              ? "Working..."
                              : `Approve ${section.data.length} as ${groupCategory}`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                );
              }}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              extraData={[
                expandedId,
                draftCategory,
                draftName,
                draftBusinessId,
                draftPersonIds,
                draftLentTo,
                rememberRule,
                busyId,
                bulkBusy,
                groupByMerchant,
                categorizeGroupKey,
                groupCategory,
                groupRemember,
              ]}
            />
          )}

          <View
            style={[
              styles.buttonRow,
              Platform.OS === "android" && insets.bottom > 0
                ? { paddingBottom: insets.bottom + 12 }
                : null,
            ]}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SheetKeyboardAvoider>

      <MerchantRulesModal
        visible={showRules}
        onClose={() => setShowRules(false)}
        customCategories={customCategories}
        businesses={businesses}
        people={people}
        entries={entries}
      />
    </Modal>
  );
};

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
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 24,
      paddingBottom: 12,
      gap: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textDim,
      marginTop: 2,
    },
    errorText: {
      fontSize: 13,
      color: colors.danger,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    nudgeCard: {
      marginHorizontal: 24,
      marginBottom: 8,
    },
    billSuggestCard: {
      marginTop: 10,
      backgroundColor: `${colors.accent}12`,
      borderWidth: 1,
      borderColor: `${colors.accent}35`,
      borderRadius: 12,
      padding: 12,
      gap: 6,
    },
    billSuggestTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
    },
    billSuggestText: {
      color: colors.textDim,
      fontSize: 12,
      lineHeight: 17,
    },
    billSuggestButton: {
      marginTop: 4,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    billSuggestButtonText: {
      color: colors.accentButtonText,
      fontSize: 13,
      fontWeight: "700",
    },
    syncButton: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      minWidth: 64,
      alignItems: "center",
    },
    syncButtonText: {
      color: colors.textDim,
      fontSize: 13,
      fontWeight: "600",
    },
    bulkBar: {
      marginHorizontal: 24,
      marginBottom: 8,
      backgroundColor: `${colors.accent}20`,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    bulkBarText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "700",
    },
    listContent: {
      paddingHorizontal: 24,
      paddingBottom: 32,
      gap: 8,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionHeader: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginTop: 14,
      marginBottom: 6,
    },
    sectionSkipAll: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "700",
    },
    groupToggleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 4,
      marginBottom: 4,
    },
    groupToggleLabel: {
      fontSize: 12,
      color: colors.textDim,
      fontWeight: "600",
    },
    groupToggle: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      overflow: "hidden",
    },
    groupToggleBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: colors.bg,
    },
    groupToggleBtnActive: {
      backgroundColor: colors.accent,
    },
    groupToggleText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textDim,
    },
    groupToggleTextActive: {
      color: colors.white,
    },
    groupCategorizer: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      backgroundColor: colors.bg,
      padding: 12,
      marginBottom: 8,
      gap: 10,
    },
    groupApproveBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    groupApproveText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
    itemCard: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      marginBottom: 8,
      overflow: "hidden",
    },
    itemHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 10,
    },
    itemTextWrap: {
      flex: 1,
    },
    itemMerchant: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    itemMeta: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    itemAmount: {
      fontSize: 14,
      fontWeight: "700",
    },
    expandedArea: {
      padding: 14,
      paddingTop: 4,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    label: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginTop: 8,
    },
    nameInput: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      backgroundColor: colors.card,
      color: colors.text,
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
    },
    rememberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    planHint: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    unusualTag: {
      fontSize: 12,
      color: colors.warning,
      fontWeight: "600",
      marginTop: 2,
    },
    planChipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    planChip: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 7,
      maxWidth: "100%",
    },
    planChipText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: "600",
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkboxCheck: {
      color: colors.accentButtonText,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 14,
    },
    rememberLabel: {
      color: colors.textDim,
      fontSize: 12,
      flex: 1,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 2,
    },
    skipButton: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    skipButtonText: {
      color: colors.textDim,
      fontSize: 13,
      fontWeight: "600",
    },
    approveButton: {
      flex: 2,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    approveButtonText: {
      color: colors.accentButtonText,
      fontSize: 13,
      fontWeight: "700",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: 32,
    },
    emptyGlyph: {
      fontSize: 40,
    },
    emptyText: {
      color: colors.textDim,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    buttonRow: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    closeButton: {
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    closeButtonText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },
  });

export default React.memo(ReviewInboxModal);
