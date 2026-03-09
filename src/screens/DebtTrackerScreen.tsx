/**
 * BudgetArk — Debt Tracker Screen
 * File: src/screens/DebtTrackerScreen.tsx
 *
 * The primary screen of the app. Displays:
 * 1. A summary card with total debt, total paid, and overall progress ring
 * 2. A scrollable list of individual debt cards
 * 3. An "Add Debt" button that opens the AddDebtModal
 * 4. An empty state when no debts exist
 *
 * Data flow:
 * - On mount, loads debts from AsyncStorage via debtStorage utility
 * - All mutations (add, delete, pay) update both local state and storage
 * - Uses useCallback extensively to prevent unnecessary child re-renders
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { generateUUID } from "../utils/uuid";
import {
  DEBT_CLASS_OPTIONS,
  DEBT_OWNER_OPTIONS,
  Debt,
  DebtClass,
  DebtMilestoneKey,
  DebtMilestonePlan,
  DebtOwner,
  NewDebtInput,
} from "../types";
import { getDebts, saveDebts, recordPayment, updateDebt } from "../storage/debtStorage";
import { getBudgetEntries } from "../storage/budgetStorage";
import {
  getDebtMilestonePlan,
  saveDebtMilestonePlan,
  updateDebtMilestoneStep,
} from "../storage/debtMilestoneStorage";
import DebtCard from "../components/DebtCard";
import AddDebtModal from "../components/AddDebtModal";
import ProgressRing from "../components/ProgressRing";
import PaymentHistoryModal from "../components/PaymentHistoryModal";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";


type PayoffStrategy = "custom" | "avalanche" | "snowball";
type DebtOwnerFilter = "all" | DebtOwner;

type ComputedMilestone = {
  key: DebtMilestoneKey;
  title: string;
  description: string;
  isCompleted: boolean;
  targetAmount?: number;
  progress: number;
  metricLabel: string;
  nextAction: string;
};

const ESSENTIAL_CATEGORIES = [
  "Housing",
  "Utilities",
  "Insurance",
  "Grocery",
  "Transportation",
  "Healthcare",
] as const;

const getSnowballPriority = (debt: Debt): number => {
  return debt.debtClass === "car_house" ? 1 : 0;
};

const getMilestoneCongratsMessage = (key: DebtMilestoneKey): string => {
  if (key === "starter_cushion") return "Great start. You just built real financial breathing room.";
  if (key === "non_mortgage_debt") return "Huge win. You knocked out a major debt burden.";
  if (key === "core_emergency_fund") return "Excellent discipline. Your safety net is getting stronger.";
  if (key === "retirement_momentum") return "Nice momentum. Your future self will thank you.";
  if (key === "home_vehicle_paydown") return "Outstanding progress. You are building long-term equity.";
  return "Congratulations! Another milestone complete. Keep going.";
};

const DebtTrackerScreen: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDeleteDebt, setPendingDeleteDebt] = useState<Debt | null>(null);
  const [strategy, setStrategy] = useState<PayoffStrategy>("custom");
  const [showHistory, setShowHistory] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<DebtOwnerFilter>("all");
  const [showClassifyModal, setShowClassifyModal] = useState(false);
  const [classDraftByDebtId, setClassDraftByDebtId] = useState<Record<string, DebtClass>>({});
  const [milestonePlan, setMilestonePlan] = useState<DebtMilestonePlan | null>(null);
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);
  const [savingsReserve, setSavingsReserve] = useState(0);
  const [retirementInvestingMonthly, setRetirementInvestingMonthly] = useState(0);
  const [monthlyEssentialsEstimate, setMonthlyEssentialsEstimate] = useState(3000);
  const [expandedMilestones, setExpandedMilestones] = useState<
    Record<DebtMilestoneKey, boolean>
  >({
    starter_cushion: false,
    non_mortgage_debt: false,
    core_emergency_fund: false,
    retirement_momentum: false,
    home_vehicle_paydown: false,
    wealth_building: false,
  });
  const [targetDraftByStep, setTargetDraftByStep] = useState<Record<DebtMilestoneKey, string>>({
    starter_cushion: "",
    non_mortgage_debt: "",
    core_emergency_fund: "",
    retirement_momentum: "",
    home_vehicle_paydown: "",
    wealth_building: "",
  });

  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();

  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  /** Load debts from device storage whenever this tab is focused */
  useFocusEffect(
    useCallback(() => {
      const loadDebts = async () => {
        try {
          const [stored, budgetEntries, storedMilestones] = await Promise.all([
            getDebts(),
            getBudgetEntries(),
            getDebtMilestonePlan(),
          ]);
          // Filter out any corrupted entries from earlier sessions
          const valid = stored.filter(
            (d) =>
              d &&
              typeof d.id === "string" &&
              typeof d.balance === "number" &&
              typeof d.originalBalance === "number" &&
              d.originalBalance > 0
          );
          if (valid.length !== stored.length) {
            // Clean up corrupted data
            await saveDebts(valid);
          }
          setDebts(valid);
          setMilestonePlan(storedMilestones);

          const savings = budgetEntries
            .filter(
              (entry) =>
                entry.type === "expense" &&
                ["Savings", "Retirement", "Investing"].includes(entry.category)
            )
            .reduce((sum, entry) => sum + entry.amount, 0);
          setSavingsReserve(savings);

          const monthTotals = budgetEntries.reduce<Record<string, number>>((acc, entry) => {
            if (
              entry.type === "expense" &&
              ["Retirement", "Investing"].includes(entry.category)
            ) {
              const monthKey = entry.date.slice(0, 7);
              acc[monthKey] = (acc[monthKey] || 0) + entry.amount;
            }
            return acc;
          }, {});
          const retirementMonths = Object.values(monthTotals);
          const retirementAverage =
            retirementMonths.length > 0
              ? retirementMonths.reduce((sum, value) => sum + value, 0) /
                retirementMonths.length
              : 0;
          setRetirementInvestingMonthly(retirementAverage);

          const essentialsByMonth = budgetEntries.reduce<Record<string, number>>(
            (acc, entry) => {
              if (
                entry.type === "expense" &&
                ESSENTIAL_CATEGORIES.includes(
                  entry.category as (typeof ESSENTIAL_CATEGORIES)[number]
                )
              ) {
                const monthKey = entry.date.slice(0, 7);
                acc[monthKey] = (acc[monthKey] || 0) + entry.amount;
              }
              return acc;
            },
            {}
          );
          const essentialMonths = Object.values(essentialsByMonth);
          const essentialsAverage =
            essentialMonths.length > 0
              ? essentialMonths.reduce((sum, value) => sum + value, 0) /
                essentialMonths.length
              : 3000;
          setMonthlyEssentialsEstimate(essentialsAverage);
        } catch (error) {
          console.error("Failed to load debts:", error);
          setDebts([]);
        }
        setIsLoading(false);
      };
      loadDebts();
    }, [])
  );

  const filteredDebts = React.useMemo(() => {
    return ownerFilter === "all"
      ? debts
      : debts.filter((debt) => debt.owner === ownerFilter);
  }, [debts, ownerFilter]);

  /** Derived summary values */
  const totalDebt = filteredDebts.reduce((sum, d) => sum + d.balance, 0);
  const totalOriginal = filteredDebts.reduce((sum, d) => sum + d.originalBalance, 0);
  const totalPaid = totalOriginal - totalDebt;
  const overallPercent = totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0;
  const totalMine = debts
    .filter((debt) => debt.owner === "mine")
    .reduce((sum, debt) => sum + debt.balance, 0);
  const totalPartner = debts
    .filter((debt) => debt.owner === "partner")
    .reduce((sum, debt) => sum + debt.balance, 0);
  const totalJoint = debts
    .filter((debt) => debt.owner === "joint")
    .reduce((sum, debt) => sum + debt.balance, 0);

  const nonMortgageDebts = debts.filter((debt) => debt.debtClass === "personal_credit");
  const nonMortgageRemaining = nonMortgageDebts.reduce(
    (sum, debt) => sum + debt.balance,
    0
  );
  const nonMortgageOriginal = nonMortgageDebts.reduce(
    (sum, debt) => sum + debt.originalBalance,
    0
  );

  const securedDebts = debts.filter((debt) => debt.debtClass === "car_house");
  const securedRemaining = securedDebts.reduce((sum, debt) => sum + debt.balance, 0);
  const securedOriginal = securedDebts.reduce(
    (sum, debt) => sum + debt.originalBalance,
    0
  );

  const computedMilestones = React.useMemo<ComputedMilestone[]>(() => {
    if (!milestonePlan) return [];

    return milestonePlan.steps.map((step) => {
      if (step.key === "starter_cushion") {
        const target = step.targetAmount || 1000;
        const progress = target > 0 ? Math.min(savingsReserve / target, 1) : 0;
        return {
          ...step,
          progress,
          metricLabel: `${formatCurrency(savingsReserve)} / ${formatCurrency(target)}`,
          nextAction: "Direct next extra dollars into emergency savings until target is hit.",
        };
      }

      if (step.key === "non_mortgage_debt") {
        const progress =
          nonMortgageOriginal > 0
            ? Math.min((nonMortgageOriginal - nonMortgageRemaining) / nonMortgageOriginal, 1)
            : 0;
        return {
          ...step,
          progress,
          metricLabel: `${formatCurrency(nonMortgageRemaining)} remaining`,
          nextAction: "Apply extra payment to the first debt in your current payoff order.",
        };
      }

      if (step.key === "core_emergency_fund") {
        const target = step.targetAmount || monthlyEssentialsEstimate * 3;
        const progress = target > 0 ? Math.min(savingsReserve / target, 1) : 0;
        return {
          ...step,
          progress,
          metricLabel: `${formatCurrency(savingsReserve)} / ${formatCurrency(target)}`,
          nextAction: "Aim for 3-6 months of essentials before shifting to aggressive investing.",
        };
      }

      if (step.key === "retirement_momentum") {
        const target = step.targetAmount || 500;
        const progress = target > 0 ? Math.min(retirementInvestingMonthly / target, 1) : 0;
        return {
          ...step,
          progress,
          metricLabel: `${formatCurrency(retirementInvestingMonthly)} /mo`,
          nextAction: "Set automatic monthly transfers into retirement and investing categories.",
        };
      }

      if (step.key === "home_vehicle_paydown") {
        const progress =
          securedOriginal > 0
            ? Math.min((securedOriginal - securedRemaining) / securedOriginal, 1)
            : 0;
        return {
          ...step,
          progress,
          metricLabel: `${formatCurrency(securedRemaining)} remaining`,
          nextAction: "Apply consistent extra principal payments to your secured balances.",
        };
      }

      return {
        ...step,
        progress: step.isCompleted ? 1 : 0,
        metricLabel: step.isCompleted ? "Completed" : "Not started",
        nextAction: "Use this stage for long-term investing, giving, and legacy planning.",
      };
    });
  }, [
    formatCurrency,
    milestonePlan,
    monthlyEssentialsEstimate,
    nonMortgageOriginal,
    nonMortgageRemaining,
    retirementInvestingMonthly,
    savingsReserve,
    securedOriginal,
    securedRemaining,
  ]);

  const completedMilestones = computedMilestones.filter((step) => step.isCompleted).length;

  /** Add a new debt */
  const handleAddDebt = useCallback(async (input: NewDebtInput) => {
    const newDebt: Debt = {
      ...input,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
    };
    setDebts((prev) => {
      const updated = [...prev, newDebt];
      saveDebts(updated);
      return updated;
    });
    setShowModal(false);
  }, []);

  /** Record a payment against a debt */
  const handlePayment = useCallback(async (debtId: string, amount: number) => {
    setDebts((prev) => {
      const updated = prev.map((d) =>
        d.id === debtId ? { ...d, balance: Math.max(0, d.balance - amount) } : d
      );
      saveDebts(updated);
      return updated;
    });
    await recordPayment({
      id: generateUUID(),
      debtId,
      amount,
      date: new Date().toISOString(),
    });
  }, []);

  /** Open edit modal for a debt */
  const handleEdit = useCallback((debt: Debt) => {
    setEditingDebt(debt);
    setShowModal(true);
  }, []);

  /** Save edits to an existing debt */
  const handleSaveEdit = useCallback(async (debtId: string, updates: Partial<Debt>) => {
    const updated = await updateDebt(debtId, updates);
    if (updated) {
      setDebts((prev) => prev.map((d) => (d.id === debtId ? { ...d, ...updates } : d)));
    }
    setShowModal(false);
    setEditingDebt(null);
  }, []);

  /** Delete a debt */
  const handleDelete = useCallback(async (debtId: string) => {
    const target = debts.find((d) => d.id === debtId) ?? null;
    setPendingDeleteDebt(target);
  }, [debts]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteDebt) return;
    const debtId = pendingDeleteDebt.id;
    setDebts((prev) => {
      const updated = prev.filter((d) => d.id !== debtId);
      saveDebts(updated);
      return updated;
    });
    setPendingDeleteDebt(null);
  }, [pendingDeleteDebt]);

  const openClassifyModal = useCallback(() => {
    const nextDraft: Record<string, DebtClass> = {};
    debts.forEach((debt) => {
      nextDraft[debt.id] = debt.debtClass;
    });
    setClassDraftByDebtId(nextDraft);
    setShowClassifyModal(true);
  }, [debts]);

  const setDebtClassDraft = useCallback((debtId: string, debtClass: DebtClass) => {
    setClassDraftByDebtId((current) => ({ ...current, [debtId]: debtClass }));
  }, []);

  const saveClassifications = useCallback(async () => {
    const updatedDebts = debts.map((debt) => ({
      ...debt,
      debtClass: classDraftByDebtId[debt.id] || debt.debtClass,
      debtClassSource: "manual" as const,
    }));
    setDebts(updatedDebts);
    await saveDebts(updatedDebts);
    setShowClassifyModal(false);
  }, [classDraftByDebtId, debts]);

  const handleToggleMilestoneComplete = useCallback(
    async (step: ComputedMilestone) => {
      const nextPlan = await updateDebtMilestoneStep(step.key, {
        isCompleted: !step.isCompleted,
      });
      setMilestonePlan(nextPlan);
    },
    []
  );

  const handleSetCurrentMilestone = useCallback(
    async (key: DebtMilestoneKey) => {
      if (!milestonePlan) return;
      const nextPlan: DebtMilestonePlan = {
        ...milestonePlan,
        currentStepKey: key,
        updatedAt: new Date().toISOString(),
      };
      setMilestonePlan(nextPlan);
      await saveDebtMilestonePlan(nextPlan);
    },
    [milestonePlan]
  );

  const openMilestonesModal = useCallback(() => {
    if (milestonePlan) {
      const nextDraft = { ...targetDraftByStep };
      milestonePlan.steps.forEach((step) => {
        nextDraft[step.key] =
          typeof step.targetAmount === "number" && Number.isFinite(step.targetAmount)
            ? String(Math.round(step.targetAmount))
            : "";
      });
      setTargetDraftByStep(nextDraft);
    }
    if (milestonePlan) {
      setExpandedMilestones({
        starter_cushion: milestonePlan.currentStepKey === "starter_cushion",
        non_mortgage_debt: milestonePlan.currentStepKey === "non_mortgage_debt",
        core_emergency_fund: milestonePlan.currentStepKey === "core_emergency_fund",
        retirement_momentum: milestonePlan.currentStepKey === "retirement_momentum",
        home_vehicle_paydown: milestonePlan.currentStepKey === "home_vehicle_paydown",
        wealth_building: milestonePlan.currentStepKey === "wealth_building",
      });
    }
    setShowMilestonesModal(true);
  }, [milestonePlan, targetDraftByStep]);

  const toggleMilestoneExpanded = useCallback((key: DebtMilestoneKey) => {
    setExpandedMilestones((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const setMilestoneTargetDraft = useCallback(
    (key: DebtMilestoneKey, value: string) => {
      const sanitized = value.replace(/[^0-9.]/g, "");
      setTargetDraftByStep((current) => ({ ...current, [key]: sanitized }));
    },
    []
  );

  const bumpMilestoneTargetDraft = useCallback(
    (key: DebtMilestoneKey, amount: number) => {
      setTargetDraftByStep((current) => {
        const base = parseFloat(current[key] || "0");
        const next = Math.max(0, (Number.isFinite(base) ? base : 0) + amount);
        return { ...current, [key]: String(Math.round(next)) };
      });
    },
    []
  );

  const handleSaveMilestoneTarget = useCallback(
    async (key: DebtMilestoneKey) => {
      const raw = targetDraftByStep[key];
      const parsed = parseFloat(raw);
      if (Number.isNaN(parsed) || parsed <= 0) return;
      const nextPlan = await updateDebtMilestoneStep(key, {
        targetAmount: parsed,
      });
      setMilestonePlan(nextPlan);
      setTargetDraftByStep((current) => ({
        ...current,
        [key]: String(Math.round(parsed)),
      }));
    },
    [targetDraftByStep]
  );

  /** Sort debts based on payoff strategy */
  const sortedDebts = React.useMemo(() => {
    const active = filteredDebts.filter((d) => d.balance > 0);
    const paidOff = filteredDebts.filter((d) => d.balance <= 0);
    if (strategy === "avalanche") {
      active.sort((a, b) => b.rate - a.rate);
    } else if (strategy === "snowball") {
      active.sort((a, b) => {
        const priorityDiff = getSnowballPriority(a) - getSnowballPriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        return a.balance - b.balance;
      });
    }
    return [...active, ...paidOff];
  }, [filteredDebts, strategy]);

  const keyExtractor = useCallback((item: Debt) => item.id, []);

  const renderDebtCard = useCallback(
    ({ item }: { item: Debt }) => (
      <DebtCard debt={item} onPayment={handlePayment} onDelete={handleDelete} onEdit={handleEdit} />
    ),
    [handlePayment, handleDelete, handleEdit]
  );

  /** Summary + section header rendered above the debt list */
  const listHeader = (
    <View>
      <View style={styles.titleSection}>
        <Text style={styles.appLabel}>BudgetArk</Text>
        <Text style={styles.screenTitle}>Debt Tracker</Text>
        <Text style={styles.screenSubtitle}>
          Track your progress. Crush your debt.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>TOTAL REMAINING</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(totalDebt)}</Text>
            <Text style={styles.paidText}>{formatCurrency(totalPaid)} paid off</Text>
          </View>
          <View style={styles.summaryRingWrap}>
            <ProgressRing
              percent={overallPercent}
              size={80}
              strokeWidth={6}
              color={overallPercent >= 60 ? colors.success : colors.accent}
            />
            <Text
              style={[
                styles.summaryRingLabel,
                { color: overallPercent >= 60 ? colors.success : colors.accent },
              ]}
            >
              {overallPercent}%
            </Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: `${colors.accent}20` }]}>
            <Text style={[styles.badgeText, { color: colors.accent }]}>
              {filteredDebts.length} in view
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.successDim }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}> 
              {filteredDebts.filter((d) => d.balance === 0).length} paid off
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.badge, { backgroundColor: colors.tealDim }]}
            onPress={() => setShowHistory(true)}
          >
            <Text style={[styles.badgeText, { color: colors.teal }]}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ownerSummaryRow}>
          <View style={[styles.ownerSummaryCard, { backgroundColor: colors.bg }]}> 
            <Text style={styles.ownerSummaryLabel}>Mine</Text>
            <Text style={styles.ownerSummaryValue}>{formatCurrency(totalMine)}</Text>
          </View>
          <View style={[styles.ownerSummaryCard, { backgroundColor: colors.bg }]}> 
            <Text style={styles.ownerSummaryLabel}>Partner</Text>
            <Text style={styles.ownerSummaryValue}>{formatCurrency(totalPartner)}</Text>
          </View>
          <View style={[styles.ownerSummaryCard, { backgroundColor: colors.bg }]}> 
            <Text style={styles.ownerSummaryLabel}>Joint</Text>
            <Text style={styles.ownerSummaryValue}>{formatCurrency(totalJoint)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.milestonesCard, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
          onPress={openMilestonesModal}
        >
          <View>
            <Text style={styles.ownerSummaryLabel}>Debt Milestones</Text>
            <Text style={styles.milestonesTitle}>
              {completedMilestones}/{computedMilestones.length || 6} completed
            </Text>
            <Text style={styles.milestonesSubtext}>
              Current: {computedMilestones.find((step) => step.key === milestonePlan?.currentStepKey)?.title || "Starter Cushion"}
            </Text>
          </View>
          <Text style={styles.milestoneArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Debts</Text>
        <View style={styles.sectionActions}>
          <TouchableOpacity onPress={openClassifyModal} style={[styles.secondaryBtn, { borderColor: colors.cardBorder }]}>
            <Text style={[styles.secondaryBtnText, { color: colors.textDim }]}>Classify</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add Debt</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.ownerFilterRow}>
        {([
          { id: "all", label: "All" },
          ...DEBT_OWNER_OPTIONS,
        ] as const).map((item) => {
          const isSelected = ownerFilter === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.ownerFilterBtn,
                {
                  borderColor: isSelected ? colors.accent : colors.cardBorder,
                  backgroundColor: isSelected ? `${colors.accent}20` : colors.card,
                },
              ]}
              onPress={() => setOwnerFilter(item.id)}
            >
              <Text
                style={[
                  styles.ownerFilterText,
                  { color: isSelected ? colors.accent : colors.textDim },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Payoff Strategy Picker */}
      {sortedDebts.filter((d) => d.balance > 0).length > 1 && (
        <View style={styles.strategyRow}>
          <Text style={styles.strategyLabel}>PAYOFF ORDER</Text>
          <View style={styles.strategyButtons}>
            {([
              ["custom", "Custom"],
              ["avalanche", "Avalanche"],
              ["snowball", "Snowball"],
            ] as const).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.strategyButton,
                  strategy === key && styles.strategyButtonActive,
                ]}
                onPress={() => setStrategy(key)}
              >
                <Text
                  style={[
                    styles.strategyButtonText,
                    strategy === key && styles.strategyButtonTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.strategyHint}>
            {strategy === "avalanche"
              ? "Highest interest rate first — saves the most money"
              : strategy === "snowball"
              ? "Credit/Personal debts first, then Car/House debts, with smallest balance first inside each group"
              : "Your original order"}
          </Text>
        </View>
      )}
    </View>
  );

  /** Empty state when user has no debts */
  const emptyState = (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>🎉</Text>
      <Text style={styles.emptyTitle}>Debt Free!</Text>
      <Text style={styles.emptySub}>
        Add a debt to start tracking your payoff journey.
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <FlatList
        data={sortedDebts}
        keyExtractor={keyExtractor}
        renderItem={renderDebtCard}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      <AddDebtModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditingDebt(null); }}
        onAdd={handleAddDebt}
        editDebt={editingDebt}
        onEdit={handleSaveEdit}
      />

      <PaymentHistoryModal
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        debts={debts}
      />

      <Modal
        visible={showMilestonesModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMilestonesModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Debt Milestones</Text>
            <Text style={styles.dialogMessage}>
              Follow a Milestone plan to stay focused and track progress.
            </Text>
            <ScrollView style={styles.classifyList} contentContainerStyle={styles.classifyListContent}>
              {computedMilestones.map((step) => {
                const isCurrent = milestonePlan?.currentStepKey === step.key;
                if (step.isCompleted) {
                  return (
                    <View key={step.key} style={[styles.classifyRow, { borderColor: colors.success }]}> 
                      <View style={styles.classifyHeaderRow}>
                        <Text style={styles.classifyDebtName}>{step.title}</Text>
                        <View style={[styles.classifyInferredBadge, { backgroundColor: `${colors.success}20` }]}> 
                          <Text style={[styles.classifyInferredText, { color: colors.success }]}>Completed</Text>
                        </View>
                      </View>
                      <Text style={styles.milestoneDescription}>{getMilestoneCongratsMessage(step.key)}</Text>
                      <View style={styles.classifyOptionRow}>
                        <TouchableOpacity
                          style={[styles.classifyOptionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
                          onPress={() => handleSetCurrentMilestone(step.key)}
                        >
                          <Text style={styles.classifyOptionText}>Set Current</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.classifyOptionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
                          onPress={() => handleToggleMilestoneComplete(step)}
                        >
                          <Text style={styles.classifyOptionText}>Reopen Step</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                const isExpanded = isCurrent || expandedMilestones[step.key];
                if (!isExpanded) {
                  return (
                    <TouchableOpacity
                      key={step.key}
                      style={[styles.classifyRow, { borderColor: colors.cardBorder }]}
                      onPress={() => toggleMilestoneExpanded(step.key)}
                    >
                      <View style={styles.classifyHeaderRow}>
                        <Text style={styles.classifyDebtName}>{step.title}</Text>
                        <Text style={styles.milestoneArrow}>+</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }

                return (
                  <View key={step.key} style={[styles.classifyRow, { borderColor: colors.cardBorder }]}> 
                    <View style={styles.classifyHeaderRow}>
                      <Text style={styles.classifyDebtName}>{step.title}</Text>
                      {isCurrent && (
                        <View style={[styles.classifyInferredBadge, { backgroundColor: `${colors.accent}20` }]}> 
                          <Text style={[styles.classifyInferredText, { color: colors.accent }]}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.milestoneDescription}>{step.description}</Text>
                    <Text style={styles.milestoneMetric}>{step.metricLabel}</Text>
                    {typeof step.targetAmount === "number" ? (
                      <View style={styles.targetEditorRow}>
                        <TextInput
                          style={styles.targetInput}
                          placeholder="Target"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="decimal-pad"
                          value={targetDraftByStep[step.key] || ""}
                          onChangeText={(value) => setMilestoneTargetDraft(step.key, value)}
                        />
                        <TouchableOpacity
                          style={[styles.targetSaveBtn, { backgroundColor: colors.bg }]}
                          onPress={() => handleSaveMilestoneTarget(step.key)}
                        >
                          <Text style={styles.targetSaveText}>Save Target</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    {typeof step.targetAmount === "number" ? (
                      <View style={styles.targetQuickRow}>
                        {[100, 250, 500].map((amount) => (
                          <TouchableOpacity
                            key={amount}
                            style={[styles.targetQuickBtn, { borderColor: colors.cardBorder }]}
                            onPress={() => bumpMilestoneTargetDraft(step.key, amount)}
                          >
                            <Text style={styles.targetQuickText}>+{amount}</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          style={[styles.targetQuickBtn, { borderColor: colors.cardBorder }]}
                          onPress={() => bumpMilestoneTargetDraft(step.key, -100)}
                        >
                          <Text style={styles.targetQuickText}>-100</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.round(step.progress * 100)}%`,
                            backgroundColor: step.isCompleted ? colors.success : colors.accent,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.strategyHint}>{step.nextAction}</Text>
                    <View style={styles.classifyOptionRow}>
                      {!isCurrent ? (
                        <TouchableOpacity
                          style={[styles.classifyOptionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
                          onPress={() => toggleMilestoneExpanded(step.key)}
                        >
                          <Text style={styles.classifyOptionText}>Collapse</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        style={[styles.classifyOptionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
                        onPress={() => handleSetCurrentMilestone(step.key)}
                      >
                        <Text style={styles.classifyOptionText}>Set Current</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.classifyOptionBtn,
                          {
                            borderColor: step.isCompleted ? colors.success : colors.accent,
                            backgroundColor: step.isCompleted ? `${colors.success}20` : `${colors.accent}20`,
                          },
                        ]}
                        onPress={() => handleToggleMilestoneComplete(step)}
                      >
                        <Text
                          style={[
                            styles.classifyOptionText,
                            { color: step.isCompleted ? colors.success : colors.accent },
                          ]}
                        >
                          {step.isCompleted ? "Mark In Progress" : "Mark Complete"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.dialogButton, styles.dialogCancelButton]}
              onPress={() => setShowMilestonesModal(false)}
            >
              <Text style={styles.dialogCancelText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showClassifyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowClassifyModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Debt Type Classification</Text>
            <Text style={styles.dialogMessage}>
              Choose whether each debt should be treated as Credit/Personal or Car/House for Snowball ordering.
            </Text>
            <ScrollView style={styles.classifyList} contentContainerStyle={styles.classifyListContent}>
              {debts.map((debt) => {
                const selectedClass = classDraftByDebtId[debt.id] || debt.debtClass;
                return (
                  <View key={debt.id} style={[styles.classifyRow, { borderColor: colors.cardBorder }]}>
                    <View style={styles.classifyHeaderRow}>
                      <Text style={styles.classifyDebtName}>{debt.name}</Text>
                      {debt.debtClassSource !== "manual" && (
                        <View style={[styles.classifyInferredBadge, { backgroundColor: colors.warningDim || `${colors.warning || colors.accent}20` }]}>
                          <Text style={[styles.classifyInferredText, { color: colors.warning || colors.accent }]}>Inferred</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.classifyOptionRow}>
                      {DEBT_CLASS_OPTIONS.map((option) => {
                        const selected = selectedClass === option.id;
                        return (
                          <TouchableOpacity
                            key={option.id}
                            style={[
                              styles.classifyOptionBtn,
                              {
                                borderColor: selected ? colors.accent : colors.cardBorder,
                                backgroundColor: selected ? `${colors.accent}20` : colors.bg,
                              },
                            ]}
                            onPress={() => setDebtClassDraft(debt.id, option.id)}
                          >
                            <Text
                              style={[
                                styles.classifyOptionText,
                                { color: selected ? colors.accent : colors.textDim },
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogCancelButton]}
                onPress={() => setShowClassifyModal(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, { backgroundColor: colors.accent }]}
                onPress={saveClassifications}
              >
                <Text style={styles.dialogDeleteText}>Save Types</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={pendingDeleteDebt !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPendingDeleteDebt(null)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Delete Debt</Text>
            <Text style={styles.dialogMessage}>
              Delete {pendingDeleteDebt?.name}? This cannot be undone.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogCancelButton]}
                onPress={() => setPendingDeleteDebt(null)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogDeleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.dialogDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },

    titleSection: { paddingTop: 56, paddingBottom: 20 },
    appLabel: { fontSize: 12, color: colors.textDim, letterSpacing: 2, marginBottom: 4 },
    screenTitle: { fontSize: 28, fontWeight: "700", color: colors.text, marginBottom: 4 },
    screenSubtitle: { fontSize: 14, color: colors.textMuted },

    summaryCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
    },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLeft: { flex: 1 },
  summaryLabel: { fontSize: 11, color: colors.textDim, letterSpacing: 1, marginBottom: 4 },
  summaryAmount: { fontSize: 32, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  paidText: { fontSize: 14, color: colors.success, fontWeight: "600", marginTop: 4 },
  summaryRingWrap: { width: 80, height: 80, justifyContent: "center", alignItems: "center" },
  summaryRingLabel: { position: "absolute", fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },

   badgeRow: { flexDirection: "row", gap: 8, marginTop: 14 },
   badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
   badgeText: { fontSize: 11, fontWeight: "600" },
   ownerSummaryRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
   },
   ownerSummaryCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
   },
   ownerSummaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
   },
   ownerSummaryValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
   },
   milestonesCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
   },
   milestonesTitle: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "700",
   },
   milestonesSubtext: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 2,
   },
   milestoneArrow: {
    color: colors.textDim,
    fontSize: 18,
    fontWeight: "600",
   },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  sectionActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { color: "#000000", fontSize: 13, fontWeight: "600" },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  ownerFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  ownerFilterBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ownerFilterText: {
    fontSize: 12,
    fontWeight: "600",
  },

  strategyRow: {
    marginBottom: 14,
  },
  strategyLabel: {
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 1,
    marginBottom: 8,
  },
  strategyButtons: {
    flexDirection: "row",
    gap: 8,
  },
  strategyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  strategyButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  strategyButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textDim,
  },
  strategyButtonTextActive: {
    color: "#000000",
  },
  strategyHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
  milestoneDescription: {
    fontSize: 12,
    color: colors.textDim,
  },
  milestoneMetric: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  targetEditorRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  targetInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "600",
  },
  targetSaveBtn: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  targetSaveText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textDim,
  },
  targetQuickRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  targetQuickBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.bg,
  },
  targetQuickText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textDim,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.cardBorder,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    minWidth: 2,
  },

  emptyWrap: { alignItems: "center", paddingVertical: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 4 },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: "center" },

  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  dialogBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    padding: 24,
    backgroundColor: colors.card,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textDim,
    textAlign: "center",
    marginBottom: 18,
  },
  dialogActions: {
    gap: 10,
  },
  dialogButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  classifyList: {
    maxHeight: 320,
    marginBottom: 14,
  },
  classifyListContent: {
    gap: 10,
  },
  classifyRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    backgroundColor: colors.bg,
  },
  classifyDebtName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  classifyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  classifyInferredBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  classifyInferredText: {
    fontSize: 10,
    fontWeight: "700",
  },
  classifyOptionRow: {
    flexDirection: "row",
    gap: 8,
  },
  classifyOptionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  classifyOptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dialogCancelButton: {
    backgroundColor: colors.bg,
  },
  dialogDeleteButton: {
    backgroundColor: colors.danger,
  },
  dialogCancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  dialogDeleteText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});

export default DebtTrackerScreen;
