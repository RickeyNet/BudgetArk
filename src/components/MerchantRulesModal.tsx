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
import { useTranslation } from "react-i18next";
import { categoryLabel } from "../i18n/categoryLabel";
import type {
  BudgetEntry,
  Business,
  CategoryName,
  CustomCategory,
  Debt,
  MerchantRule,
  Person,
} from "../types";
import { describeError } from "../utils/errorMessage";
import TagPillPicker, { MultiTagPillPicker } from "./TagPillPicker";
import { entryPersonIds } from "../utils/entryPeople";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import { isBillCandidate } from "../utils/billFulfillment";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useConnections } from "../connections/ConnectionsProvider";
import CategoryPillPicker from "./CategoryPillPicker";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";
import { getMerchantRules } from "../storage/merchantRulesStorage";
import { getDebts } from "../storage/debtStorage";
import {
  debtIdFromOption,
  debtOptionId,
  rankDebtCandidates,
} from "../utils/inboxDebtPayments";
import {
  changeMerchantRule,
  removeMerchantRule,
} from "../services/connections/reviewInboxService";
import { getCategoryIcon } from "../data/categoryIcons";
import { triggerHaptic } from "../utils/haptics";
import { buildMerchantRuleUpdate } from "../utils/merchantRuleUpdate";

interface MerchantRulesModalProps {
  visible: boolean;
  onClose: () => void;
  customCategories: CustomCategory[];
  /** Live businesses, for the expense business tag. Empty = pills hidden. */
  businesses: Business[];
  /** Live people, for the expense person assignment. Empty = pills hidden. */
  people: Person[];
  /** Live budget entries - the recurring bills a rule can fulfil. */
  entries: BudgetEntry[];
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
  entries,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const insets = useSafeAreaInsets();
  const { refresh } = useConnections();
  const { t } = useTranslation();

  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftIgnore, setDraftIgnore] = useState(false);
  const [draftAutoApprove, setDraftAutoApprove] = useState(false);
  const [draftCategory, setDraftCategory] = useState<CategoryName>("Other");
  const [draftRename, setDraftRename] = useState("");
  const [draftBusinessId, setDraftBusinessId] = useState<string | undefined>(
    undefined,
  );
  // Multi-select, like the entry form and the inbox: one rule can assign
  // the family grocery store to everyone.
  const [draftPersonIds, setDraftPersonIds] = useState<string[]>([]);
  // A bill's entry id or a debt pill ("debt:<id>", utils/inboxDebtPayments)
  // - the two share the "Applies to bill" picker, like the inbox.
  const [draftRecurringId, setDraftRecurringId] = useState<string | undefined>(
    undefined,
  );
  /** Debt tracker debts a rule can log payments on. */
  const [debts, setDebts] = useState<Debt[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  /** Last failed load/save/delete, shown under the header until the next action. */
  const [actionError, setActionError] = useState<string | null>(null);

  // Every live recurring bill, whatever its cadence - a rule is ongoing, so
  // it isn't limited to the bills on cycle this month.
  const billOptions = useMemo(
    () =>
      entries.filter(isBillCandidate).map((bill) => ({
        id: bill.id,
        name: t("modals.data.rules.billOption", {
          name: bill.description?.trim() || categoryLabel(t, bill.category),
          amount: formatCurrency(bill.amount),
        }),
      })),
    [entries, formatCurrency, t],
  );

  // Live debts with a balance (plus whichever one the open rule already
  // names), so a rule can log this merchant's payments on a debt.
  const debtOptions = useMemo(
    () =>
      rankDebtCandidates(debts, {
        keepId: debtIdFromOption(draftRecurringId),
      }).map((debt) => ({
        id: debtOptionId(debt.id),
        name: t("modals.data.rules.debtOption", {
          name: debt.name,
          amount: formatCurrency(debt.minPayment),
        }),
      })),
    [debts, draftRecurringId, formatCurrency, t],
  );

  const debtNameById = useMemo(
    () => new Map(debts.map((debt) => [debt.id, debt.name])),
    [debts],
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
    void loadRules()
      .then(() => setActionError(null))
      .catch((error: unknown) =>
        setActionError(describeError(error, t("modals.data.rules.errors.load"))),
      );
    // Debts are offered in the bill picker; a failed read just hides them.
    void getDebts()
      .then(setDebts)
      .catch(() => setDebts([]));
  }, [visible, loadRules, t]);

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
      setDraftPersonIds(entryPersonIds(rule));
      setDraftRecurringId(
        rule.debtId ? debtOptionId(rule.debtId) : rule.recurringEntryId,
      );
      return rule.id;
    });
  }, []);

  const handleSave = useCallback(
    async (rule: MerchantRule) => {
      setBusyId(rule.id);
      setActionError(null);
      try {
        // undefined = leave the stored value alone, null = clear it; the
        // "always skip" branch preserves everything. See
        // utils/merchantRuleUpdate.
        // The picker holds a bill OR a debt; split it so the rule never
        // carries both.
        const draftDebtId = debtIdFromOption(draftRecurringId);
        await changeMerchantRule(
          buildMerchantRuleUpdate(
            {
              ignore: draftIgnore,
              autoApprove: draftAutoApprove,
              category: draftCategory,
              renameTo: draftRename,
              businessId: draftBusinessId,
              personIds: draftPersonIds,
              recurringEntryId: draftDebtId ? undefined : draftRecurringId,
              debtId: draftDebtId,
            },
            rule,
          ),
        );
        await loadRules();
        await refresh();
        triggerHaptic("success");
        setExpandedId(null);
      } catch (error) {
        triggerHaptic("error");
        setActionError(describeError(error, t("modals.data.rules.errors.save")));
      } finally {
        setBusyId(null);
      }
    },
    [
      t,
      draftAutoApprove,
      draftBusinessId,
      draftCategory,
      draftIgnore,
      draftPersonIds,
      draftRecurringId,
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
        setActionError(describeError(error, t("modals.data.rules.errors.delete")));
      } finally {
        setBusyId(null);
      }
    },
    [loadRules, refresh, t],
  );

  const behaviorLabel = (rule: MerchantRule): string => {
    if (rule.action === "ignore") return t("modals.data.rules.behavior.alwaysSkip");
    if (rule.debtId) {
      // A debt rule logs a Payment on the debt, never an entry.
      const name =
        debtNameById.get(rule.debtId) ??
        t("modals.data.rules.behavior.deletedDebt");
      return rule.action === "approve"
        ? t("modals.data.rules.behavior.logsDebtPayment", { name })
        : t("modals.data.rules.behavior.suggestsDebtPayment", { name });
    }
    const parts: string[] = [
      t(
        rule.action === "approve"
          ? "modals.data.rules.behavior.autoApproves"
          : "modals.data.rules.behavior.suggests",
        {
          icon: getCategoryIcon(rule.category, customCategories),
          category: categoryLabel(t, rule.category),
        },
      ),
    ];
    if (rule.renameTo) {
      parts.push(
        t("modals.data.rules.behavior.renameAs", { name: rule.renameTo }),
      );
    }
    if (rule.businessId) {
      parts.push(
        `💼 ${businesses.find((b) => b.id === rule.businessId)?.name ?? t("modals.data.rules.behavior.deletedBusiness")}`,
      );
    }
    const rulePeople = entryPersonIds(rule);
    if (rulePeople.length > 0) {
      parts.push(
        `👤 ${rulePeople
          .map(
            (id) =>
              people.find((p) => p.id === id)?.name ??
              t("modals.data.rules.behavior.deletedPerson"),
          )
          .join(", ")}`,
      );
    }
    if (rule.recurringEntryId) {
      parts.push(
        `🧾 ${billOptions.find((b) => b.id === rule.recurringEntryId)?.name ?? t("modals.data.rules.behavior.deletedBill")}`,
      );
    }
    return parts.join(" ");
  };

  const metaLabel = (rule: MerchantRule): string =>
    [
      behaviorLabel(rule),
      rule.useCount > 1
        ? t("modals.data.rules.behavior.usedCount", { count: rule.useCount })
        : null,
    ]
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
            <Text style={styles.label}>{t("modals.data.rules.editor.whenImports")}</Text>
            <CategoryPillPicker
              value={draftCategory}
              onChange={(category) => {
                setDraftIgnore(false);
                setDraftCategory(category);
              }}
              customCategories={customCategories}
              leadingOption={{
                label: t("modals.data.rules.editor.alwaysSkipPill"),
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
                  {t("modals.data.rules.editor.autoApproveHelp")}
                </Text>
              </TouchableOpacity>
            ) : null}
            {!draftIgnore ? (
              <>
                <Text style={styles.label}>{t("modals.data.rules.editor.renameLabel")}</Text>
                <TextInput
                  style={styles.nameInput}
                  value={draftRename}
                  onChangeText={setDraftRename}
                  placeholder={t("modals.data.rules.editor.renamePlaceholder")}
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
                <Text style={styles.label}>{t("modals.data.rules.editor.businessLabel")}</Text>
                <TagPillPicker
                    options={businesses}
                    value={draftBusinessId}
                    onChange={setDraftBusinessId}
                    noneLabel={t("modals.data.rules.editor.personalPill")}
                    glyph="💼"
                    deletedLabel={t("modals.data.rules.behavior.deletedBusiness")}
                  />
              </>
            ) : null}
            {!draftIgnore &&
            rule.type === "expense" &&
            (people.length > 0 || draftPersonIds.length > 0) ? (
              <>
                <Text style={styles.label}>{t("modals.data.rules.editor.peopleLabel")}</Text>
                <MultiTagPillPicker
                    options={people}
                    values={draftPersonIds}
                    onChange={setDraftPersonIds}
                    noneLabel={t("modals.data.rules.editor.unassignedPill")}
                    glyph="👤"
                    deletedLabel={t("modals.data.rules.behavior.deletedPerson")}
                  />
              </>
            ) : null}
            {!draftIgnore &&
            rule.type === "expense" &&
            (billOptions.length > 0 || debtOptions.length > 0 || draftRecurringId) ? (
              <>
                <Text style={styles.label}>{t("modals.data.rules.editor.billLabel")}</Text>
                <TagPillPicker
                    options={[...billOptions, ...debtOptions]}
                    value={draftRecurringId}
                    onChange={setDraftRecurringId}
                    noneLabel={t("modals.data.rules.editor.notABillPill")}
                    glyph="🧾"
                    deletedLabel={t("modals.data.rules.behavior.deletedBill")}
                  />
                {debtIdFromOption(draftRecurringId) ? (
                  <Text style={styles.autoApproveLabel}>
                    {t("modals.data.rules.editor.debtHelp")}
                  </Text>
                ) : null}
              </>
            ) : null}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.deleteButton, busy && styles.buttonDisabled]}
                onPress={() => setConfirmingDeleteId(rule.id)}
                disabled={busy}
              >
                <Text style={styles.deleteButtonText}>{t("modals.data.rules.editor.deleteRule")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, busy && styles.buttonDisabled]}
                onPress={() => void handleSave(rule)}
                disabled={busy}
              >
                <Text style={styles.saveButtonText}>
                  {busy ? t("modals.data.rules.editor.saving") : t("common.save")}
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
          <Text style={styles.title}>{t("modals.data.rules.title")}</Text>
          <Text style={styles.subtitle}>
            {rules.length > 0
              ? t("modals.data.rules.subtitleCount", { count: rules.length })
              : t("modals.data.rules.subtitleEmpty")}
          </Text>
          {actionError ? (
            <Text style={styles.errorText}>{actionError}</Text>
          ) : null}
        </View>

        {rules.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyGlyph}>📌</Text>
            <Text style={styles.emptyText}>
              {t("modals.data.rules.emptyBody")}
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
              draftPersonIds,
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
            <Text style={styles.closeButtonText}>{t("common.done")}</Text>
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
            <Text style={styles.dialogTitle}>{t("modals.data.rules.confirmDelete.title")}</Text>
            <Text style={styles.dialogBody}>
              {t(
                confirmingRule?.action === "ignore"
                  ? "modals.data.rules.confirmDelete.bodyIgnore"
                  : confirmingRule?.action === "approve"
                    ? "modals.data.rules.confirmDelete.bodyApprove"
                    : "modals.data.rules.confirmDelete.bodySuggest",
                { merchant: confirmingRule?.merchantKey ?? "" },
              )}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancel}
                onPress={() => setConfirmingDeleteId(null)}
                disabled={busyId !== null}
              >
                <Text style={styles.dialogCancelText}>{t("modals.data.rules.confirmDelete.keep")}</Text>
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
                  {busyId !== null
                    ? t("modals.data.rules.confirmDelete.deleting")
                    : t("common.delete")}
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
