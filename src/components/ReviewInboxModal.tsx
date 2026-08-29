/**
 * BudgetArk - Review Inbox
 * File: src/components/ReviewInboxModal.tsx
 *
 * Where imported bank transactions wait for the user's decision. Grouped by
 * posted date, with heuristic sections ("Likely transfers", "Possibly already
 * in your budget") that offer a Skip-all shortcut. Each row expands into a
 * name field (rename the noisy bank text), a category picker, a business
 * picker (expenses, when businesses exist) and an "always do this" rule
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
  Business,
  CategoryName,
  CustomCategory,
  ExternalAccountLink,
  PendingTransaction,
  Person,
} from "../types";
import { describeError } from "../utils/errorMessage";
import TagPillPicker from "./TagPillPicker";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useCurrency } from "../currency/CurrencyProvider";
import { useConnections } from "../connections/ConnectionsProvider";
import CategoryPillPicker from "./CategoryPillPicker";
import MerchantRulesModal from "./MerchantRulesModal";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";
import {
  applyRulesToInbox,
  approvePendingTransaction,
  dismissAndIgnoreMerchant,
  dismissPendingTransactions,
} from "../services/connections/reviewInboxService";
import { getLinks } from "../storage/externalAccountLinksStorage";
import { triggerHaptic } from "../utils/haptics";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftCategory, setDraftCategory] = useState<CategoryName>(DEFAULT_CATEGORY);
  const [draftName, setDraftName] = useState("");
  const [draftBusinessId, setDraftBusinessId] = useState<string | undefined>(
    undefined,
  );
  const [draftPersonId, setDraftPersonId] = useState<string | undefined>(
    undefined,
  );
  const [draftRecurringId, setDraftRecurringId] = useState<string | undefined>(
    undefined,
  );
  const [rememberRule, setRememberRule] = useState(false);
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
  }, [visible, refresh]);

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const link of links) {
      map.set(link.externalAccountId, link.externalName);
    }
    return map;
  }, [links]);

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
    () => buildInboxSections(pendingTransactions),
    [pendingTransactions]
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
      setDraftPersonId(
        item.suggestedType === "expense" ? item.suggestedPersonId : undefined,
      );
      setDraftRecurringId(
        item.suggestedType === "expense" ? item.suggestedRecurringId : undefined,
      );
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
      personId: string | undefined,
      recurringId: string | undefined,
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
          personId: personId ?? null,
          fulfillsRecurringId: recurringId ?? null,
          rememberRule: remember,
        });
        // "Always" just created an auto-approve rule - sweep the rest of
        // the inbox so matching items are approved now, not next sync.
        if (remember && item.merchant) {
          await applyRulesToInbox();
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
    const accountName = accountNameById.get(item.externalAccountId);
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
                  ? `👤 ${
                      personNameById.get(item.suggestedPersonId) ??
                      "(deleted person)"
                    }`
                  : null,
                item.suggestedRecurringId &&
                billNameById.has(item.suggestedRecurringId)
                  ? `🧾 ${billNameById.get(item.suggestedRecurringId)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
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
            />
            {billCandidates.length > 0 ? (
              <>
                <Text style={styles.label}>APPLIES TO BILL</Text>
                <TagPillPicker
                  options={billCandidates.map((bill) => ({
                    id: bill.id,
                    name: `${bill.description?.trim() || bill.category} · est. ${formatCurrency(
                      bill.amount,
                    )}`,
                  }))}
                  value={draftRecurringId}
                  onChange={setDraftRecurringId}
                  noneLabel="Not a bill"
                  glyph="🧾"
                />
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
            (people.length > 0 || draftPersonId) ? (
              <>
                <Text style={styles.label}>PERSON</Text>
                <TagPillPicker
                    options={people}
                    value={draftPersonId}
                    onChange={setDraftPersonId}
                    noneLabel="Unassigned"
                    glyph="👤"
                    deletedLabel="(deleted person)"
                  />
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
                  void handleApprove(
                    item,
                    draftCategory,
                    rememberRule,
                    draftName,
                    draftBusinessId,
                    draftPersonId,
                    draftRecurringId,
                  )
                }
                disabled={busy}
              >
                <Text style={styles.approveButtonText}>
                  {busy
                    ? "Saving..."
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
              renderSectionHeader={({ section }) => (
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
                </View>
              )}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              extraData={[
                expandedId,
                draftCategory,
                draftName,
                draftBusinessId,
                draftPersonId,
                rememberRule,
                busyId,
                bulkBusy,
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
