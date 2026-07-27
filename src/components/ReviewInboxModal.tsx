/**
 * BudgetArk - Review Inbox
 * File: src/components/ReviewInboxModal.tsx
 *
 * Where imported bank transactions wait for the user's decision. Grouped by
 * posted date, with heuristic sections ("Likely transfers", "Possibly already
 * in your budget") that offer a Skip-all shortcut. Each row expands into a
 * category picker with an "always do this" rule checkbox - on Approve it
 * remembers the category; on Skip it creates an ignore rule so the merchant
 * (credit-card payments, debt payments) never imports again. A bulk bar
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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  CategoryName,
  CustomCategory,
  ExternalAccountLink,
  PendingTransaction,
} from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useCurrency } from "../currency/CurrencyProvider";
import { useConnections } from "../connections/ConnectionsProvider";
import CategoryPillPicker from "./CategoryPillPicker";
import MerchantRulesModal from "./MerchantRulesModal";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";
import {
  approvePendingTransaction,
  dismissAndIgnoreMerchant,
  dismissPendingTransactions,
} from "../services/connections/reviewInboxService";
import { getLinks } from "../storage/externalAccountLinksStorage";
import { triggerHaptic } from "../utils/haptics";
import { formatDayLabel } from "../utils/dateFormat";

interface ReviewInboxModalProps {
  visible: boolean;
  onClose: () => void;
  customCategories: CustomCategory[];
  /** Called after approvals/dismissals so the Budget screen reloads entries. */
  onChanged: () => void | Promise<void>;
}

interface InboxSection {
  title: string;
  data: PendingTransaction[];
  /** Show a "Skip all" action on the section header (heuristic sections). */
  bulkSkippable?: boolean;
}

const DEFAULT_CATEGORY: CategoryName = "Other";


const ReviewInboxModal: React.FC<ReviewInboxModalProps> = ({
  visible,
  onClose,
  customCategories,
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
  const [rememberRule, setRememberRule] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (!visible) return;
    void refresh();
    void getLinks().then(setLinks);
  }, [visible, refresh]);

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const link of links) {
      map.set(link.externalAccountId, link.externalName);
    }
    return map;
  }, [links]);

  const sections = useMemo<InboxSection[]>(() => {
    const regular = pendingTransactions.filter(
      (item) => !item.transferLikely && !item.duplicateLikely,
    );
    const duplicates = pendingTransactions.filter(
      (item) => item.duplicateLikely && !item.transferLikely,
    );
    const transfers = pendingTransactions.filter((item) => item.transferLikely);

    const byDay = new Map<string, PendingTransaction[]>();
    for (const item of regular) {
      const day = item.postedAt.slice(0, 10);
      const list = byDay.get(day) ?? [];
      list.push(item);
      byDay.set(day, list);
    }
    const result: InboxSection[] = Array.from(byDay.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, data]) => ({
        title: formatDayLabel(`${day}T12:00:00Z`, { weekday: true }),
        data,
      }));
    if (duplicates.length > 0) {
      result.push({
        title: "Possibly already in your budget",
        data: duplicates,
        bulkSkippable: true,
      });
    }
    if (transfers.length > 0) {
      result.push({
        title: "Likely transfers",
        data: transfers,
        bulkSkippable: true,
      });
    }
    return result;
  }, [pendingTransactions]);

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
      setRememberRule(false);
      return item.id;
    });
  }, []);

  const handleApprove = useCallback(
    async (item: PendingTransaction, category: CategoryName, remember: boolean) => {
      setBusyId(item.id);
      try {
        await approvePendingTransaction({
          pendingId: item.id,
          category,
          rememberRule: remember,
        });
        await refresh();
        await onChanged();
        triggerHaptic("success");
        setExpandedId(null);
      } finally {
        setBusyId(null);
      }
    },
    [onChanged, refresh],
  );

  const handleSkip = useCallback(
    async (item: PendingTransaction, remember: boolean) => {
      setBusyId(item.id);
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
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const handleSkipSection = useCallback(
    async (items: PendingTransaction[]) => {
      setBulkBusy(true);
      try {
        await dismissPendingTransactions(items.map((item) => item.id));
        await refresh();
        triggerHaptic("selection");
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
    } finally {
      setBulkBusy(false);
    }
  }, [onChanged, pendingTransactions, refresh]);

  const renderItem = ({ item }: { item: PendingTransaction }) => {
    const expanded = expandedId === item.id;
    const busy = busyId === item.id;
    const isExpense = item.amount < 0;
    const accountName = accountNameById.get(item.externalAccountId);
    return (
      <View style={styles.itemCard}>
        <TouchableOpacity
          style={styles.itemHeader}
          onPress={() => toggleExpand(item)}
          activeOpacity={0.7}
        >
          <View style={styles.itemTextWrap}>
            <Text style={styles.itemMerchant} numberOfLines={1}>
              {item.merchant || item.description || "(no description)"}
            </Text>
            <Text style={styles.itemMeta} numberOfLines={1}>
              {[
                accountName,
                item.pending ? "pending" : null,
                item.suggestedCategory
                  ? `suggested: ${item.suggestedCategory}`
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
            <Text style={styles.label}>CATEGORY</Text>
            <CategoryPillPicker
              value={draftCategory}
              onChange={setDraftCategory}
              customCategories={customCategories}
            />
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
                  Always do this for "{item.merchant}" - use this category on
                  Approve, or never import it again on Skip
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
                onPress={() => void handleApprove(item, draftCategory, rememberRule)}
                disabled={busy}
              >
                <Text style={styles.approveButtonText}>
                  {busy ? "Saving..." : "Approve"}
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
              onPress={() => void syncNow()}
              disabled={isSyncing || connections.length === 0}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={colors.textDim} />
              ) : (
                <Text style={styles.syncButtonText}>Sync</Text>
              )}
            </TouchableOpacity>
          </View>

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
              extraData={[expandedId, draftCategory, rememberRule, busyId, bulkBusy]}
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
      />
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
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
      color: colors.white,
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
