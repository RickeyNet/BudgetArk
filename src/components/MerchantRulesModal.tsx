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
import { describeError } from "../utils/errorMessage";
import TagPillPicker from "./TagPillPicker";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
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

type RuleStyles = ReturnType<typeof makeStyles>;

interface MerchantRuleRowProps {
  rule: MerchantRule;
  expanded: boolean;
  /** Pre-built "Suggests 🍔 Food as ... · used 3×" line - a string so the memo holds. */
  meta: string;
  styles: RuleStyles;
  onToggle: (rule: MerchantRule) => void;
  /** The editor, passed only for the expanded row (null keeps collapsed rows memoized). */
  children?: React.ReactNode;
}

/**
 * One rule card. Memoized so typing in the expanded row's rename field
 * (which lives in the modal's draft state) re-renders only that row -
 * previously every keystroke rebuilt the whole list through an inline
 * renderItem + 8-value extraData.
 */
const MerchantRuleRow = React.memo(
  ({ rule, expanded, meta, styles, onToggle, children }: MerchantRuleRowProps) => (
    <View style={styles.ruleCard}>
      <TouchableOpacity
        style={styles.ruleHeader}
        onPress={() => onToggle(rule)}
        activeOpacity={0.7}
      >
        <View style={styles.ruleTextWrap}>
          <Text style={styles.ruleMerchant} numberOfLines={1}>
            {rule.merchantKey}
          </Text>
          <Text style={styles.ruleMeta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Text style={styles.ruleChevron}>{expanded ? "▾" : "▸"}</Text>
      </TouchableOpacity>
      {children}
    </View>
  ),
);
MerchantRuleRow.displayName = "MerchantRuleRow";

const MerchantRulesModal: React.FC<MerchantRulesModalProps> = ({
  visible,
  onClose,
  customCategories,
  businesses,
  people,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
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
  /** Last failed load/save/delete, shown under the header until the next action. */
  const [actionError, setActionError] = useState<string | null>(null);

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
    void loadRules()
      .then(() => setActionError(null))
      .catch((error: unknown) =>
        setActionError(describeError(error, "Couldn't load your rules.")),
      );
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
      setActionError(null);
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
      } catch (error) {
        triggerHaptic("error");
        setActionError(describeError(error, "Couldn't save this rule."));
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
      setActionError(null);
      try {
        await removeMerchantRule(ruleId);
        setConfirmingDeleteId(null);
        await loadRules();
        await refresh();
        triggerHaptic("selection");
        setExpandedId(null);
      } catch (error) {
        triggerHaptic("error");
        setActionError(describeError(error, "Couldn't delete this rule."));
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

  const metaLabel = (rule: MerchantRule): string =>
    [behaviorLabel(rule), rule.useCount > 1 ? `used ${rule.useCount}×` : null]
      .filter(Boolean)
      .join(" · ");

  const renderRule = ({ item: rule }: { item: MerchantRule }) => {
    const expanded = expandedId === rule.id;
    const busy = busyId === rule.id;
    return (
      <MerchantRuleRow
        rule={rule}
        expanded={expanded}
        meta={metaLabel(rule)}
        styles={styles}
        onToggle={toggleExpand}
      >
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
            {!draftIgnore &&
            rule.type === "expense" &&
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
      </MerchantRuleRow>
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
          {actionError ? (
            <Text style={styles.errorText}>{actionError}</Text>
          ) : null}
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

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    avoider: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: colors.card,
    },
    header: {
      padding: tokens.padLg,
      paddingBottom: tokens.padSm,
    },
    title: {
      fontSize: scale(22),
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: scale(13),
      color: colors.textDim,
      marginTop: 4,
      lineHeight: scale(18),
    },
    errorText: {
      fontSize: scale(13),
      color: colors.danger,
      marginTop: tokens.gapSm,
    },
    listContent: {
      paddingHorizontal: tokens.padLg,
      paddingBottom: tokens.pad * 2,
    },
    ruleCard: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      marginBottom: tokens.gapSm,
      overflow: "hidden",
    },
    ruleHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: tokens.pad,
      gap: tokens.gapSm,
    },
    ruleTextWrap: {
      flex: 1,
    },
    ruleMerchant: {
      color: colors.text,
      fontSize: scale(14),
      fontWeight: "600",
    },
    ruleMeta: {
      color: colors.textMuted,
      fontSize: scale(12),
      marginTop: 2,
    },
    ruleChevron: {
      color: colors.textDim,
      fontSize: scale(13),
    },
    expandedArea: {
      padding: tokens.pad,
      paddingTop: 4,
      gap: tokens.gapSm,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    label: {
      fontSize: scale(11),
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginTop: tokens.gapSm,
    },
    nameInput: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      backgroundColor: colors.card,
      color: colors.text,
      fontSize: scale(14),
      paddingHorizontal: tokens.padSm,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
    },
    autoApproveRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.gapSm,
    },
    autoApproveLabel: {
      color: colors.textDim,
      fontSize: scale(12),
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
      color: colors.accentButtonText,
      fontSize: scale(12),
      fontWeight: "700",
      lineHeight: scale(14),
    },
    actionRow: {
      flexDirection: "row",
      gap: tokens.gapSm,
      marginTop: 2,
    },
    deleteButton: {
      flex: 1,
      paddingVertical: tokens.pad,
      borderRadius: tokens.radius,
      borderWidth: 1,
      borderColor: colors.warning,
      alignItems: "center",
    },
    deleteButtonText: {
      color: colors.warning,
      fontSize: scale(13),
      fontWeight: "600",
    },
    saveButton: {
      flex: 2,
      paddingVertical: tokens.pad,
      borderRadius: tokens.radius,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    saveButtonText: {
      color: colors.accentButtonText,
      fontSize: scale(13),
      fontWeight: "700",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.gapSm,
      padding: tokens.padLg,
    },
    emptyGlyph: {
      fontSize: scale(40),
    },
    emptyText: {
      color: colors.textDim,
      fontSize: scale(14),
      textAlign: "center",
      lineHeight: scale(20),
    },
    buttonRow: {
      paddingHorizontal: tokens.padLg,
      paddingTop: tokens.padSm,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    closeButton: {
      paddingVertical: tokens.pad,
      borderRadius: tokens.radius,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    closeButtonText: {
      color: colors.textDim,
      fontSize: scale(15),
      fontWeight: "600",
    },
    dialogOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: tokens.padLg,
    },
    dialogBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.padLg,
      width: "100%",
      maxWidth: 400,
      gap: tokens.gapSm,
    },
    dialogTitle: {
      fontSize: scale(17),
      fontWeight: "700",
      color: colors.text,
    },
    dialogBody: {
      fontSize: scale(13),
      color: colors.textDim,
      lineHeight: scale(19),
    },
    dialogActions: {
      flexDirection: "row",
      gap: tokens.gapSm,
      marginTop: tokens.gapSm,
    },
    dialogCancel: {
      flex: 1,
      paddingVertical: tokens.pad,
      borderRadius: tokens.radius,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    dialogCancelText: {
      color: colors.textDim,
      fontSize: scale(13),
      fontWeight: "600",
    },
    dialogDelete: {
      flex: 1,
      paddingVertical: tokens.pad,
      borderRadius: tokens.radius,
      backgroundColor: colors.warning,
      alignItems: "center",
    },
    dialogDeleteText: {
      color: colors.white,
      fontSize: scale(13),
      fontWeight: "700",
    },
  });
};

export default React.memo(MerchantRulesModal);
