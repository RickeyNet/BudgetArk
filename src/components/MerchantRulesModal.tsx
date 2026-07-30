/**
 * BudgetArk - Merchant Rules Manager
 * File: src/components/MerchantRulesModal.tsx
 *
 * Where "Always do this" decisions from the Review Inbox can be changed
 * later. Lists every remembered merchant rule; each row expands so the user
 * can flip it between "always skip", auto-approve, and suggest-only
 * ("always categorize as X"), pick a different category, edit the
 * remembered rename/business/person, or delete it. Changes are re-applied
 * to items still in
 * the inbox via reviewInboxService; already-skipped transactions stay
 * skipped (the ingest ledger remembers them), which the header explains.
 *
 * Modal-as-sub-screen (ConnectionsModal pattern), presented on top of the
 * Review Inbox sheet with a nested fade dialog for delete confirmation.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  Business,
  CategoryName,
  CustomCategory,
  MerchantRule,
  Person,
} from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useConnections } from "../connections/ConnectionsProvider";
import CategoryPillPicker from "./CategoryPillPicker";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";
import { getMerchantRules } from "../storage/merchantRulesStorage";
import {
  changeMerchantRule,
  removeMerchantRule,
} from "../services/connections/reviewInboxService";
import { getCategoryIcon } from "../data/categoryIcons";
import { triggerHaptic } from "../utils/haptics";

interface MerchantRulesModalProps {
  visible: boolean;
  onClose: () => void;
  customCategories: CustomCategory[];
  /** Live businesses, for the expense business tag. Empty = pills hidden. */
  businesses: Business[];
  /** Live people, for the expense person assignment. Empty = pills hidden. */
  people: Person[];
}

const MerchantRulesModal: React.FC<MerchantRulesModalProps> = ({
  visible,
  onClose,
  customCategories,
  businesses,
  people,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { refresh } = useConnections();

  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftIgnore, setDraftIgnore] = useState(false);
  const [draftAutoApprove, setDraftAutoApprove] = useState(false);
  const [draftCategory, setDraftCategory] = useState<CategoryName>("Other");
  const [draftRename, setDraftRename] = useState("");
  const [draftBusinessId, setDraftBusinessId] = useState<string | undefined>(
    undefined,
  );
  const [draftPersonId, setDraftPersonId] = useState<string | undefined>(
    undefined,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  const loadRules = useCallback(
    () =>
      getMerchantRules().then((loaded) =>
        setRules(
          [...loaded].sort((a, b) => a.merchantKey.localeCompare(b.merchantKey)),
        ),
      ),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    void loadRules();
  }, [visible, loadRules]);

  const handleClose = useCallback(() => {
    setExpandedId(null);
    onClose();
  }, [onClose]);

  const toggleExpand = useCallback((rule: MerchantRule) => {
    setExpandedId((prev) => {
      if (prev === rule.id) return null;
      setDraftIgnore(rule.action === "ignore");
      setDraftAutoApprove(rule.action === "approve");
      setDraftCategory(rule.category);
      setDraftRename(rule.renameTo ?? "");
      setDraftBusinessId(rule.businessId);
      setDraftPersonId(rule.personId);
      return rule.id;
    });
  }, []);

  const handleSave = useCallback(
    async (rule: MerchantRule) => {
      setBusyId(rule.id);
      try {
        await changeMerchantRule({
          ruleId: rule.id,
          action: draftIgnore
            ? "ignore"
            : draftAutoApprove
              ? "approve"
              : "categorize",
          category: draftIgnore ? undefined : draftCategory,
          // Ignore rules never read rename/business - keep whatever was
          // stored so flipping back to categorize restores it.
          renameTo: draftIgnore ? undefined : draftRename,
          businessId: draftIgnore ? undefined : draftBusinessId ?? null,
          personId: draftIgnore ? undefined : draftPersonId ?? null,
        });
        await loadRules();
        await refresh();
        triggerHaptic("success");
        setExpandedId(null);
      } finally {
        setBusyId(null);
      }
    },
    [
      draftAutoApprove,
      draftBusinessId,
      draftCategory,
      draftIgnore,
      draftPersonId,
      draftRename,
      loadRules,
      refresh,
    ],
  );

  const handleDelete = useCallback(
    async (ruleId: string) => {
      setBusyId(ruleId);
      try {
        await removeMerchantRule(ruleId);
        setConfirmingDeleteId(null);
        await loadRules();
        await refresh();
        triggerHaptic("selection");
        setExpandedId(null);
      } finally {
        setBusyId(null);
      }
    },
    [loadRules, refresh],
  );

  const behaviorLabel = (rule: MerchantRule): string => {
    if (rule.action === "ignore") return "Always skip - never imports";
    const parts = [
      `${rule.action === "approve" ? "Auto-approves" : "Suggests"} ${getCategoryIcon(rule.category, customCategories)} ${rule.category}`,
    ];
    if (rule.renameTo) parts.push(`as "${rule.renameTo}"`);
    if (rule.businessId) {
      parts.push(
        `💼 ${businesses.find((b) => b.id === rule.businessId)?.name ?? "(deleted business)"}`,
      );
    }
    if (rule.personId) {
      parts.push(
        `👤 ${people.find((p) => p.id === rule.personId)?.name ?? "(deleted person)"}`,
      );
    }
    return parts.join(" ");
  };

  const renderRule = ({ item: rule }: { item: MerchantRule }) => {
    const expanded = expandedId === rule.id;
    const busy = busyId === rule.id;
    return (
      <View style={styles.ruleCard}>
        <TouchableOpacity
          style={styles.ruleHeader}
          onPress={() => toggleExpand(rule)}
          activeOpacity={0.7}
        >
          <View style={styles.ruleTextWrap}>
            <Text style={styles.ruleMerchant} numberOfLines={1}>
              {rule.merchantKey}
            </Text>
            <Text style={styles.ruleMeta} numberOfLines={1}>
              {[
                behaviorLabel(rule),
                rule.useCount > 1 ? `used ${rule.useCount}×` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          <Text style={styles.ruleChevron}>{expanded ? "▾" : "▸"}</Text>
        </TouchableOpacity>

        {expanded ? (
          <View style={styles.expandedArea}>
            <Text style={styles.label}>WHEN THIS MERCHANT IMPORTS</Text>
            <CategoryPillPicker
              value={draftCategory}
              onChange={(category) => {
                setDraftIgnore(false);
                setDraftCategory(category);
              }}
              customCategories={customCategories}
              leadingOption={{
                label: "🚫 Always skip",
                selected: draftIgnore,
                onPress: () => setDraftIgnore(true),
              }}
              pinCurrentValue
            />
            {!draftIgnore ? (
              <TouchableOpacity
                style={styles.autoApproveRow}
                onPress={() => setDraftAutoApprove((prev) => !prev)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    draftAutoApprove && styles.checkboxActive,
                  ]}
                >
                  {draftAutoApprove ? (
                    <Text style={styles.checkboxCheck}>✓</Text>
                  ) : null}
                </View>
                <Text style={styles.autoApproveLabel}>
                  Auto-approve without review - matching imports go straight
                  into your budget with this rule's choices. Unchecked, they
                  wait in the inbox with the category suggested.
                </Text>
              </TouchableOpacity>
            ) : null}
            {!draftIgnore ? (
              <>
                <Text style={styles.label}>RENAME TO (OPTIONAL)</Text>
                <TextInput
                  style={styles.nameInput}
                  value={draftRename}
                  onChangeText={setDraftRename}
                  placeholder="Keep the bank's description"
                  placeholderTextColor={colors.textMuted}
                  maxLength={220}
                  returnKeyType="done"
                />
              </>
            ) : null}
            {!draftIgnore &&
            rule.type === "expense" &&
            (businesses.length > 0 || draftBusinessId) ? (
              <>
                <Text style={styles.label}>BUSINESS</Text>
                <View style={styles.businessWrap}>
                  <TouchableOpacity
                    style={[
                      styles.businessPill,
                      !draftBusinessId && styles.businessPillActive,
                    ]}
                    onPress={() => setDraftBusinessId(undefined)}
                  >
                    <Text
                      style={[
                        styles.businessPillText,
                        !draftBusinessId && styles.businessPillTextActive,
                      ]}
                    >
                      Personal
                    </Text>
                  </TouchableOpacity>
                  {businesses.map((business) => (
                    <TouchableOpacity
                      key={business.id}
                      style={[
                        styles.businessPill,
                        draftBusinessId === business.id &&
                          styles.businessPillActive,
                      ]}
                      onPress={() => setDraftBusinessId(business.id)}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.businessPillText,
                          draftBusinessId === business.id &&
                            styles.businessPillTextActive,
                        ]}
                      >
                        💼 {business.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {draftBusinessId &&
                  !businesses.some((b) => b.id === draftBusinessId) ? (
                    <TouchableOpacity
                      style={[styles.businessPill, styles.businessPillActive]}
                      onPress={() => setDraftBusinessId(undefined)}
                    >
                      <Text
                        style={[
                          styles.businessPillText,
                          styles.businessPillTextActive,
                        ]}
                      >
                        💼 (deleted business)
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </>
            ) : null}
            {!draftIgnore &&
            rule.type === "expense" &&
            (people.length > 0 || draftPersonId) ? (
              <>
                <Text style={styles.label}>PERSON</Text>
                <View style={styles.businessWrap}>
                  <TouchableOpacity
                    style={[
                      styles.businessPill,
                      !draftPersonId && styles.businessPillActive,
                    ]}
                    onPress={() => setDraftPersonId(undefined)}
                  >
                    <Text
                      style={[
                        styles.businessPillText,
                        !draftPersonId && styles.businessPillTextActive,
                      ]}
                    >
                      Unassigned
                    </Text>
                  </TouchableOpacity>
                  {people.map((person) => (
                    <TouchableOpacity
                      key={person.id}
                      style={[
                        styles.businessPill,
                        draftPersonId === person.id &&
                          styles.businessPillActive,
                      ]}
                      onPress={() => setDraftPersonId(person.id)}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.businessPillText,
                          draftPersonId === person.id &&
                            styles.businessPillTextActive,
                        ]}
                      >
                        👤 {person.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {draftPersonId &&
                  !people.some((p) => p.id === draftPersonId) ? (
                    <TouchableOpacity
                      style={[styles.businessPill, styles.businessPillActive]}
                      onPress={() => setDraftPersonId(undefined)}
                    >
                      <Text
                        style={[
                          styles.businessPillText,
                          styles.businessPillTextActive,
                        ]}
                      >
                        👤 (deleted person)
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </>
            ) : null}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.deleteButton, busy && styles.buttonDisabled]}
                onPress={() => setConfirmingDeleteId(rule.id)}
                disabled={busy}
              >
                <Text style={styles.deleteButtonText}>Delete Rule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, busy && styles.buttonDisabled]}
                onPress={() => void handleSave(rule)}
                disabled={busy}
              >
                <Text style={styles.saveButtonText}>
                  {busy ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const confirmingRule = confirmingDeleteId
    ? rules.find((r) => r.id === confirmingDeleteId)
    : undefined;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SheetKeyboardAvoider style={styles.avoider}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Merchant Rules</Text>
          <Text style={styles.subtitle}>
            {rules.length > 0
              ? `${rules.length} remembered rule${rules.length === 1 ? "" : "s"}. Changes apply to future imports and anything still in your inbox - transactions you already skipped stay skipped.`
              : "Rules remember what to do when a merchant's transactions import."}
          </Text>
        </View>

        {rules.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyGlyph}>📌</Text>
            <Text style={styles.emptyText}>
              No rules yet. In the Review Inbox, check "Always do this" when
              approving or skipping a transaction - the rule will appear here,
              where you can change or delete it anytime.
            </Text>
          </View>
        ) : (
          <FlatList
            data={rules}
            keyExtractor={(rule) => rule.id}
            renderItem={renderRule}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            extraData={[
              expandedId,
              draftIgnore,
              draftAutoApprove,
              draftCategory,
              draftRename,
              draftBusinessId,
              draftPersonId,
              busyId,
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
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
      </SheetKeyboardAvoider>

      <Modal
        visible={confirmingDeleteId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingDeleteId(null)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Delete this rule?</Text>
            <Text style={styles.dialogBody}>
              {confirmingRule?.action === "ignore"
                ? `Future "${confirmingRule?.merchantKey ?? ""}" transactions will import into your Review Inbox again. Ones already skipped won't come back.`
                : confirmingRule?.action === "approve"
                  ? `Future "${confirmingRule?.merchantKey ?? ""}" transactions will wait in your Review Inbox for manual approval. Entries already created are not changed.`
                  : `Future "${confirmingRule?.merchantKey ?? ""}" transactions will arrive without a suggested category. Approved entries are not changed.`}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancel}
                onPress={() => setConfirmingDeleteId(null)}
                disabled={busyId !== null}
              >
                <Text style={styles.dialogCancelText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dialogDelete,
                  busyId !== null && styles.buttonDisabled,
                ]}
                onPress={() =>
                  confirmingDeleteId
                    ? void handleDelete(confirmingDeleteId)
                    : undefined
                }
                disabled={busyId !== null}
              >
                <Text style={styles.dialogDeleteText}>
                  {busyId !== null ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    avoider: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: colors.card,
    },
    header: {
      padding: 24,
      paddingBottom: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textDim,
      marginTop: 4,
      lineHeight: 18,
    },
    listContent: {
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    ruleCard: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      marginBottom: 8,
      overflow: "hidden",
    },
    ruleHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 10,
    },
    ruleTextWrap: {
      flex: 1,
    },
    ruleMerchant: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    ruleMeta: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    ruleChevron: {
      color: colors.textDim,
      fontSize: 13,
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
    autoApproveRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    autoApproveLabel: {
      color: colors.textDim,
      fontSize: 12,
      flex: 1,
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
    businessWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    businessPill: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 7,
      // Same long-name guard as ReviewInboxModal's businessPill.
      maxWidth: "100%",
    },
    businessPillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    businessPillText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "600",
    },
    businessPillTextActive: {
      color: colors.accentButtonText,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 2,
    },
    deleteButton: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.warning,
      alignItems: "center",
    },
    deleteButtonText: {
      color: colors.warning,
      fontSize: 13,
      fontWeight: "600",
    },
    saveButton: {
      flex: 2,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    saveButtonText: {
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
    dialogOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    dialogBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 20,
      width: "100%",
      maxWidth: 400,
      gap: 10,
    },
    dialogTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    dialogBody: {
      fontSize: 13,
      color: colors.textDim,
      lineHeight: 19,
    },
    dialogActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 6,
    },
    dialogCancel: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    dialogCancelText: {
      color: colors.textDim,
      fontSize: 13,
      fontWeight: "600",
    },
    dialogDelete: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: colors.warning,
      alignItems: "center",
    },
    dialogDeleteText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: "700",
    },
  });

export default React.memo(MerchantRulesModal);
