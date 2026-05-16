import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { generateUUID } from "../utils/uuid";
import NetWorthHistoryCard from "../components/NetWorthHistoryCard";
import CashFlowChart, { type CashFlowPoint } from "../components/CashFlowChart";
import Medal from "../components/Medal";
import AchievementsScreen from "./AchievementsScreen";
import AnnualReportModal from "../components/AnnualReportModal";
import { ACHIEVEMENT_DEFS } from "../data/achievementDefs";
import { useAchievements } from "../achievements/AchievementsProvider";
import {
  AssetAccount,
  AssetAccountCategory,
  ASSET_ACCOUNT_CATEGORIES,
  ASSET_ACCOUNT_CATEGORY_LABELS,
  Debt,
  NetWorthSnapshot,
  SavingsGoal,
  BudgetEntry,
} from "../types";
import { getBudgetEntries, saveBudgetEntries } from "../storage/budgetStorage";
import { getDebts } from "../storage/debtStorage";
import { getSavingsGoals, saveSavingsGoals } from "../storage/savingsGoalStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import {
  getAssetAccounts,
  saveAssetAccounts,
  deleteAssetAccount,
} from "../storage/assetAccountStorage";
import { syncNetWorthSnapshot } from "../storage/netWorthSnapshotStorage";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { DensityTokens } from "../theme/density";
import { useCurrency } from "../currency/CurrencyProvider";
import { useTabCoachmark } from "../onboarding/useTabCoachmark";
import { useCoachmarkAnchor } from "../onboarding/CoachmarkAnchorContext";
import type { ThemeColors } from "../theme/themes";
import { calculateNetWorthTotals } from "../utils/netWorth";
import { applyMissedRecurringLinkedAccountContributions } from "../utils/linkedAccountRecurring";

/** Emoji glyph per asset category for the concept's account-row icon chip. */
const ACCOUNT_ICONS: Record<string, string> = {
  savings: "💰",
  retirement: "📈",
  investing: "📊",
  hsa: "🏥",
  cash: "💵",
  other: "💼",
};
const iconForCategory = (category: string): string =>
  ACCOUNT_ICONS[category] ?? "💼";

const BridgeScreen: React.FC = () => {
  const { colors, themeId } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const coachmark = useTabCoachmark("Bridge");
  const listRef = useRef<FlatList>(null);
  const anchorBridgeOverview = useCoachmarkAnchor("bridge-overview-card", { scrollRef: listRef });
  const anchorBridgeAccounts = useCoachmarkAnchor("bridge-accounts-card", { scrollRef: listRef });
  const anchorBridgeHistory = useCoachmarkAnchor("bridge-history-card", { scrollRef: listRef });
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
  const [netWorthSnapshots, setNetWorthSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [keelTarget, setKeelTarget] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetAccount | null>(null);
  const [assetName, setAssetName] = useState("");
  const [assetBalance, setAssetBalance] = useState("");
  const [assetCategory, setAssetCategory] = useState<AssetAccountCategory>("savings");
  const [showEfContribModal, setShowEfContribModal] = useState(false);
  const [efContribAmount, setEfContribAmount] = useState("");
  const [showAchievements, setShowAchievements] = useState(false);
  const [showAnnualReport, setShowAnnualReport] = useState(false);
  const {
    unlocked: achievementUnlocked,
    totalCount: totalAchievements,
    runCheck: refreshAchievements,
  } = useAchievements();

  const refreshNetWorthSnapshots = useCallback(async () => {
    const nextSnapshots = await syncNetWorthSnapshot();
    setNetWorthSnapshots(nextSnapshots);
    return nextSnapshots;
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAchievements();
    }, [refreshAchievements])
  );

  useFocusEffect(
    useCallback(() => {
      // Cancellation flag — prevents a slower load from overwriting a newer
      // one's state when the user re-focuses the tab quickly.
      let cancelled = false;
      const loadBridgeData = async () => {
        try {
          const [storedEntries, storedDebts, storedGoals, storedAssets, milestonePlan] =
            await Promise.all([
              getBudgetEntries(),
              getDebts(),
              getSavingsGoals(),
              getAssetAccounts(),
              getDebtMilestonePlan(),
            ]);
          if (cancelled) return;

          const keelStep = milestonePlan.steps.find((step) => step.key === "keel");
          const processed = applyMissedRecurringLinkedAccountContributions(
            storedEntries,
            storedAssets
          );

          if (processed.changed) {
            // Sequence the two saves: commit the lastAppliedMonth marker on
            // the entries first, *then* the asset balance. Reversing this
            // (or running them concurrently) opens a race window where
            // another reader (e.g. BudgetScreen on a quick tab switch) can
            // see the new asset balance with the OLD lastAppliedMonth and
            // re-apply the contribution — silently double-crediting the
            // asset.
            await saveBudgetEntries(processed.entries);
            await saveAssetAccounts(processed.assetAccounts);
          }
          if (cancelled) return;

          setEntries(processed.entries);
          setDebts(storedDebts);
          setSavingsGoals(storedGoals);
          setAssetAccounts(processed.assetAccounts);
          setKeelTarget(keelStep?.targetAmount ?? 1000);
          await refreshNetWorthSnapshots();
          if (cancelled) return;
        } catch (error) {
          if (cancelled) return;
          if (__DEV__) console.error("Failed to load bridge:", error);
          setEntries([]);
          setDebts([]);
          setSavingsGoals([]);
          setAssetAccounts([]);
          setNetWorthSnapshots([]);
          setKeelTarget(0);
        }
        if (!cancelled) setIsLoaded(true);
      };

      loadBridgeData();
      return () => {
        cancelled = true;
      };
    }, [refreshNetWorthSnapshots])
  );

  // Emergency-fund derived current amount. Only the "Savings" category
  // counts toward the EF; Retirement and Investing aren't liquid emergency
  // money and feed the Gather Animals milestone separately.
  const savingsReserve = useMemo(
    () =>
      entries
        .filter(
          (entry) =>
            entry.type === "expense" && entry.category === "Savings"
        )
        .reduce((sum, entry) => sum + entry.amount, 0),
    [entries]
  );

  const emergencyFundGoal = useMemo(() => {
    const explicit = savingsGoals.find((goal) => goal.category === "emergency_fund");
    if (explicit) return explicit;
    if (keelTarget > 0 || savingsReserve > 0) {
      return {
        id: "__keel_ef__",
        name: "Emergency Fund",
        category: "emergency_fund" as const,
        targetAmount: keelTarget,
        currentAmount: savingsReserve,
        createdAt: "",
        updatedAt: "",
      } satisfies SavingsGoal;
    }
    return null;
  }, [keelTarget, savingsGoals, savingsReserve]);

  const netWorthTotals = useMemo(
    () =>
      calculateNetWorthTotals({
        entries,
        debts,
        savingsGoals,
        assetAccounts,
      }),
    [assetAccounts, debts, entries, savingsGoals]
  );

  const totalAssetBalance = useMemo(
    () => assetAccounts.reduce((sum, account) => sum + account.balance, 0),
    [assetAccounts]
  );

  const trackedAccountsTotal = totalAssetBalance + (emergencyFundGoal?.currentAmount ?? 0);

  // Trailing 6 months of income vs expense, oldest → newest, for the cash
  // flow panel. Recurring entries are counted in every month from their
  // start onward (mirrors how the Budget screen rolls them forward).
  const cashFlow = useMemo<CashFlowPoint[]>(() => {
    const now = new Date();
    const buckets: CashFlowPoint[] = [];
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      let income = 0;
      let expense = 0;
      for (const entry of entries) {
        const entryMonth = `${new Date(entry.date).getFullYear()}-${String(
          new Date(entry.date).getMonth() + 1
        ).padStart(2, "0")}`;
        const counts = entry.recurring
          ? entryMonth <= monthKey
          : entryMonth === monthKey;
        if (!counts) continue;
        if (entry.type === "income") income += entry.amount;
        else expense += entry.amount;
      }
      buckets.push({
        label: d.toLocaleDateString(undefined, { month: "short" }),
        income,
        expense,
      });
    }
    return buckets;
  }, [entries]);

  const hasCashFlow = cashFlow.some((m) => m.income > 0 || m.expense > 0);

  const openAddAssetModal = useCallback(() => {
    setEditingAsset(null);
    setAssetName("");
    setAssetBalance("");
    setAssetCategory("savings");
    setShowAssetModal(true);
  }, []);

  const openEditAssetModal = useCallback((account: AssetAccount) => {
    setEditingAsset(account);
    setAssetName(account.name);
    setAssetBalance(String(account.balance));
    setAssetCategory(account.category);
    setShowAssetModal(true);
  }, []);

  const closeAssetModal = useCallback(() => {
    setShowAssetModal(false);
    setEditingAsset(null);
    setAssetName("");
    setAssetBalance("");
    setAssetCategory("savings");
  }, []);

  const saveAsset = useCallback(async () => {
    const parsedBalance = parseFloat(assetBalance);
    if (!assetName.trim() || Number.isNaN(parsedBalance) || parsedBalance < 0) return;

    const now = new Date().toISOString();
    let nextAccounts: AssetAccount[];

    if (editingAsset) {
      nextAccounts = assetAccounts.map((account) =>
        account.id === editingAsset.id
          ? {
              ...account,
              name: assetName.trim(),
              balance: parsedBalance,
              category: assetCategory,
              updatedAt: now,
            }
          : account
      );
    } else {
      nextAccounts = [
        ...assetAccounts,
        {
          id: generateUUID(),
          name: assetName.trim(),
          balance: parsedBalance,
          category: assetCategory,
          createdAt: now,
          updatedAt: now,
        },
      ];
    }

    setAssetAccounts(nextAccounts);
    await saveAssetAccounts(nextAccounts);
    await refreshNetWorthSnapshots();
    closeAssetModal();
    void refreshAchievements();
  }, [assetAccounts, assetBalance, assetCategory, assetName, closeAssetModal, editingAsset, refreshAchievements, refreshNetWorthSnapshots]);

  const deleteAsset = useCallback(async (id: string) => {
    // Soft-delete so the partner's next sync removes this account locally.
    const nextAccounts = await deleteAssetAccount(id);
    setAssetAccounts(nextAccounts);
    await refreshNetWorthSnapshots();
    closeAssetModal();
    void refreshAchievements();
  }, [closeAssetModal, refreshAchievements, refreshNetWorthSnapshots]);

  const handleEfContribution = useCallback(async () => {
    const parsed = parseFloat(efContribAmount);
    if (Number.isNaN(parsed) || parsed === 0) return;

    const now = new Date().toISOString();
    const existing = savingsGoals.find((goal) => goal.category === "emergency_fund");

    let updatedGoals: SavingsGoal[];

    if (existing) {
      const updatedGoal = {
        ...existing,
        currentAmount: Math.max(0, existing.currentAmount + parsed),
        updatedAt: now,
      };
      updatedGoals = savingsGoals.map((goal) =>
        goal.id === existing.id ? updatedGoal : goal
      );
    } else {
      updatedGoals = [
        ...savingsGoals,
        {
          id: generateUUID(),
          name: "Emergency Fund",
          category: "emergency_fund",
          targetAmount: keelTarget,
          currentAmount: Math.max(0, parsed),
          createdAt: now,
          updatedAt: now,
        },
      ];
    }

    setSavingsGoals(updatedGoals);
    await saveSavingsGoals(updatedGoals);
    await refreshNetWorthSnapshots();
    setShowEfContribModal(false);
    setEfContribAmount("");
    void refreshAchievements();
  }, [efContribAmount, keelTarget, refreshAchievements, refreshNetWorthSnapshots, savingsGoals]);

  const listHeader = (
    <View>
      <View style={styles.titleSection}>
        <Text style={styles.appLabel}>BudgetArk</Text>
        <Text style={styles.screenTitle}>The Bridge</Text>
        <Text style={styles.screenSubtitle}>Net worth, accounts, and progress.</Text>
      </View>

      <View ref={anchorBridgeHistory} collapsable={false}>
        <NetWorthHistoryCard
          snapshots={netWorthSnapshots}
          netWorth={netWorthTotals.netWorth}
          totalAssets={netWorthTotals.totalAssets}
          totalDebt={netWorthTotals.totalDebt}
          formatCurrency={formatCurrency}
          formatCompactCurrency={formatCompactCurrency}
          colors={colors}
        />
      </View>

      {hasCashFlow ? (
        <CashFlowChart
          data={cashFlow}
          colors={colors}
          formatCompactCurrency={formatCompactCurrency}
        />
      ) : null}

      <View ref={anchorBridgeOverview} collapsable={false}>
        <View style={styles.statsStrip}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Tracked Accounts</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(trackedAccountsTotal)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Emergency Fund</Text>
            <Text style={[styles.statValue, { color: colors.teal }]}>
              {formatCurrency(emergencyFundGoal?.currentAmount ?? 0)}
            </Text>
          </View>
        </View>
        {emergencyFundGoal?.targetAmount ? (
          <Text style={styles.overviewHint}>
            Emergency Fund target: {formatCurrency(emergencyFundGoal.targetAmount)}
          </Text>
        ) : (
          <Text style={styles.overviewHint}>Track savings, retirement, HSA, and investment balances here.</Text>
        )}
      </View>

      <View ref={anchorBridgeAccounts} collapsable={false} style={styles.accountsCard}>
        <View style={styles.topHairline} />
        <View style={styles.accountsHeaderRow}>
          <Text style={styles.accountsTitle}>Accounts</Text>
          <TouchableOpacity onPress={openAddAssetModal}>
            <Text style={[styles.accountsAddBtn, { color: colors.accent }]}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {assetAccounts.length === 0 && !emergencyFundGoal ? (
          <Text style={styles.accountsEmpty}>
            Track your savings, 401k, HSA, and other account balances here.
          </Text>
        ) : (
          <>
            {emergencyFundGoal ? (
              <TouchableOpacity
                style={styles.accountRow}
                onPress={() => {
                  setEfContribAmount("");
                  setShowEfContribModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.accountIcon, { backgroundColor: colors.tealDim }]}>
                  <Text style={styles.accountIconGlyph}>🛡️</Text>
                </View>
                <View style={styles.accountRowLeft}>
                  <Text style={styles.accountName} numberOfLines={1}>Emergency Fund</Text>
                  <Text style={styles.accountCategory}>
                    {emergencyFundGoal.targetAmount > 0
                      ? `${formatCurrency(emergencyFundGoal.currentAmount)} / ${formatCurrency(emergencyFundGoal.targetAmount)}`
                      : "Savings Goal"}
                  </Text>
                </View>
                <Text style={[styles.accountBalance, { color: colors.teal }]}>
                  {formatCurrency(emergencyFundGoal.currentAmount)}
                </Text>
              </TouchableOpacity>
            ) : null}

            {assetAccounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={styles.accountRow}
                onPress={() => openEditAssetModal(account)}
                activeOpacity={0.7}
              >
                <View style={[styles.accountIcon, { backgroundColor: `${colors.accent}1f` }]}>
                  <Text style={styles.accountIconGlyph}>{iconForCategory(account.category)}</Text>
                </View>
                <View style={styles.accountRowLeft}>
                  <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
                  <Text style={styles.accountCategory}>
                    {ASSET_ACCOUNT_CATEGORY_LABELS[account.category]}
                  </Text>
                </View>
                <Text style={[styles.accountBalance, { color: colors.success }]}>
                  {formatCurrency(account.balance)}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.accountTotalRow}>
              <Text style={styles.accountTotalLabel}>Total</Text>
              <Text style={[styles.accountTotalValue, { color: colors.success }]}>
                {formatCurrency(trackedAccountsTotal)}
              </Text>
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        style={styles.shipsLogCard}
        onPress={() => setShowAchievements(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open Ship's Log achievements"
      >
        <View style={styles.shipsLogPreview}>
          {ACHIEVEMENT_DEFS.slice(0, 4).map((def) => (
            <View key={def.id} style={styles.shipsLogMedal}>
              <Medal
                tier={def.tier}
                glyph={def.glyph}
                locked={achievementUnlocked[def.id] === undefined}
                size={44}
              />
            </View>
          ))}
        </View>
        <View style={styles.shipsLogTextBlock}>
          <Text style={styles.shipsLogTitle}>Ship's Log</Text>
          <Text style={styles.shipsLogSubtitle}>
            {`${Object.keys(achievementUnlocked).length}/${totalAchievements} earned`}
          </Text>
        </View>
        <Text style={[styles.shipsLogChevron, { color: colors.accent }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.annualReportCard}
        onPress={() => setShowAnnualReport(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open your annual financial report"
      >
        <Text style={styles.annualReportGlyph}>📅</Text>
        <View style={styles.annualReportTextBlock}>
          <Text style={styles.annualReportTitle}>Annual Report</Text>
          <Text style={styles.annualReportSubtitle}>
            Your {new Date().getFullYear()} year in review
          </Text>
        </View>
        <Text style={[styles.shipsLogChevron, { color: colors.accent }]}>›</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      style={[
        styles.screen,
        themeId === "deep_space" && styles.screenTransparent,
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {isLoaded ? (
        <FlatList
          ref={listRef}
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      <Modal
        visible={showAssetModal}
        transparent
        animationType="fade"
        onRequestClose={closeAssetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingAsset ? "Edit Account" : "Add Account"}</Text>
            <Text style={styles.modalSub}>Track a balance that will feed your net worth history.</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Account name"
              placeholderTextColor={colors.textMuted}
              value={assetName}
              onChangeText={setAssetName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Balance"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={assetBalance}
              onChangeText={setAssetBalance}
            />

            <View style={styles.assetCategoryRow}>
              {ASSET_ACCOUNT_CATEGORIES.map((category) => {
                const isSelected = assetCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.assetCategoryChip,
                      {
                        borderColor: isSelected ? colors.accent : colors.cardBorder,
                        backgroundColor: isSelected ? `${colors.accent}20` : colors.bg,
                      },
                    ]}
                    onPress={() => setAssetCategory(category)}
                  >
                    <Text
                      style={[
                        styles.assetCategoryChipText,
                        { color: isSelected ? colors.accent : colors.textDim },
                      ]}
                    >
                      {ASSET_ACCOUNT_CATEGORY_LABELS[category]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              {editingAsset ? (
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => deleteAsset(editingAsset.id)}>
                  <Text style={[styles.modalCancelText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={closeAssetModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveAsset}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEfContribModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEfContribModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Emergency Fund</Text>
            <Text style={styles.modalSub}>
              Current balance: {formatCurrency(emergencyFundGoal?.currentAmount ?? 0)}
              {emergencyFundGoal?.targetAmount
                ? ` / ${formatCurrency(emergencyFundGoal.targetAmount)}`
                : ""}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Amount to add (or negative to withdraw)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={efContribAmount}
              onChangeText={setEfContribAmount}
            />

            <Text style={styles.modalHint}>
              Enter a positive number to contribute, or negative to withdraw.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEfContribModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleEfContribution}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <AchievementsScreen
        visible={showAchievements}
        onClose={() => {
          setShowAchievements(false);
          void refreshAchievements();
        }}
      />
      <AnnualReportModal
        visible={showAnnualReport}
        onClose={() => setShowAnnualReport(false)}
      />

      {coachmark}
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    screenTransparent: {
      backgroundColor: "transparent",
    },
    listContent: {
      paddingHorizontal: tokens.pad,
      paddingBottom: 110,
    },
    titleSection: {
      paddingTop: 56,
      paddingBottom: tokens.gap,
      alignItems: "flex-start",
    },
    appLabel: {
      fontSize: scale(10),
      fontWeight: "600",
      color: colors.textDim,
      letterSpacing: 3,
      marginBottom: 3,
      textTransform: "uppercase",
    },
    screenTitle: {
      fontSize: scale(28),
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
      letterSpacing: -0.5,
    },
    screenSubtitle: {
      fontSize: scale(13),
      color: colors.textMuted,
    },
    statsStrip: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      overflow: "hidden",
      marginBottom: tokens.gapSm + 2,
    },
    statCell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: tokens.padSm + 2,
      paddingHorizontal: 8,
    },
    statDivider: {
      width: 1,
      marginVertical: tokens.padSm,
      backgroundColor: colors.cardBorder,
    },
    statLabel: {
      fontSize: scale(9),
      fontWeight: "600",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: colors.textDim,
      marginBottom: 4,
    },
    statValue: {
      fontSize: scale(16),
      fontWeight: "800",
      letterSpacing: -0.5,
      fontVariant: ["tabular-nums"] as any,
    },
    overviewHint: {
      fontSize: scale(12),
      color: colors.textDim,
      marginBottom: tokens.gap,
      paddingHorizontal: 2,
    },
    topHairline: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.accent,
      opacity: 0.18,
    },
    accountIcon: {
      width: 34,
      height: 34,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    accountIconGlyph: {
      fontSize: scale(15),
    },
    accountsCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gap,
      overflow: "hidden",
    },
    accountsHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: tokens.gapSm + 4,
    },
    accountsTitle: {
      fontSize: scale(18),
      fontWeight: "700",
      color: colors.text,
    },
    accountsAddBtn: {
      fontSize: scale(14),
      fontWeight: "700",
    },
    accountsEmpty: {
      fontSize: scale(13),
      color: colors.textDim,
      textAlign: "center",
      paddingVertical: tokens.padSm - 4,
    },
    accountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: tokens.padSm,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    accountRowLeft: {
      flex: 1,
    },
    accountName: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    accountCategory: {
      fontSize: scale(11),
      color: colors.textDim,
      marginTop: 1,
    },
    accountBalance: {
      fontSize: scale(14),
      fontWeight: "700",
      fontVariant: ["tabular-nums"] as any,
    },
    accountTotalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: tokens.padSm - 2,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    accountTotalLabel: {
      fontSize: scale(13),
      fontWeight: "700",
      color: colors.textDim,
    },
    accountTotalValue: {
      fontSize: scale(15),
      fontWeight: "700",
      fontVariant: ["tabular-nums"] as any,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      paddingHorizontal: tokens.padLg,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
    },
    modalTitle: {
      fontSize: scale(18),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    modalSub: {
      fontSize: scale(14),
      color: colors.textDim,
      marginBottom: 12,
    },
    modalInput: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm + 2,
      paddingHorizontal: tokens.padSm + 2,
      paddingVertical: tokens.padSm,
      color: colors.text,
      fontSize: scale(15),
      marginBottom: 8,
    },
    modalHint: {
      fontSize: scale(12),
      color: colors.textMuted,
    },
    modalActions: {
      flexDirection: "row",
      gap: tokens.gapSm + 4,
      marginTop: tokens.gap,
    },
    modalCancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm + 2,
      paddingVertical: tokens.padSm,
      alignItems: "center",
    },
    modalCancelText: {
      color: colors.textDim,
      fontSize: scale(14),
      fontWeight: "600",
    },
    modalSaveBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusSm + 2,
      paddingVertical: tokens.padSm,
      alignItems: "center",
    },
    modalSaveText: {
      color: colors.white,
      fontSize: scale(14),
      fontWeight: "700",
    },
    assetCategoryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.gapSm + 2,
      marginBottom: 8,
    },
    assetCategoryChip: {
      borderWidth: 1,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.padSm - 2,
      paddingVertical: tokens.padSm - 5,
    },
    assetCategoryChipText: {
      fontSize: scale(12),
      fontWeight: "600",
    },
    shipsLogCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gap,
      gap: tokens.gapSm + 4,
    },
    shipsLogPreview: {
      flexDirection: "row",
    },
    shipsLogMedal: {
      marginRight: -10,
    },
    shipsLogTextBlock: {
      flex: 1,
      marginLeft: 14,
    },
    shipsLogTitle: {
      fontSize: scale(16),
      fontWeight: "700",
      color: colors.text,
    },
    shipsLogSubtitle: {
      fontSize: scale(12),
      color: colors.textDim,
      marginTop: 2,
    },
    shipsLogChevron: {
      fontSize: scale(28),
      fontWeight: "300",
      paddingHorizontal: 4,
    },
    annualReportCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      marginBottom: tokens.gap,
      gap: tokens.gapSm + 4,
    },
    annualReportGlyph: {
      fontSize: scale(30),
    },
    annualReportTextBlock: {
      flex: 1,
      marginLeft: 6,
    },
    annualReportTitle: {
      fontSize: scale(16),
      fontWeight: "700",
      color: colors.text,
    },
    annualReportSubtitle: {
      fontSize: scale(12),
      color: colors.textDim,
      marginTop: 2,
    },
  });
};

export default BridgeScreen;
