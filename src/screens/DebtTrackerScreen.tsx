/**
 * BudgetArk - Debt Tracker Screen
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

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  InteractionManager,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fabBottomOffset, TAB_BAR_BASE_HEIGHT } from "../navigation/tabBarLayout";
import { useUndo } from "../undo/UndoProvider";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { generateUUID } from "../utils/uuid";
import {
  Debt,
  DebtMilestoneKey,
  DebtMilestonePlan,
  DebtOwner,
  BudgetEntry,
  NewDebtInput,
  Payment,
  RootTabParamList,
  SavingsGoal,
} from "../types";
import {
  getDebts,
  getPayments,
  saveDebts,
  deleteDebt,
  restoreDebt,
  recordPayment,
  updateDebt,
  getPayoffStrategyPreference,
  savePayoffStrategyPreference,
} from "../storage/debtStorage";
import {
  dismissDebtDueForMonth,
  getDebtDueDismissals,
  type DebtDueDismissals,
} from "../storage/debtDueReminderStorage";
import {
  debtsDueOrOverdueNeedingPrompt,
  getMonthKey,
  upcomingDebtDuesWithin,
} from "../utils/debtDueCalendar";
import { minimumDuePaymentId } from "../utils/debtPaymentDedupe";
import DebtDueReminderBanner from "../components/DebtDueReminderBanner";
import DebtDuePaymentPromptModal from "../components/DebtDuePaymentPromptModal";
import CardKeepAliveBanner from "../components/CardKeepAliveBanner";
import {
  dismissCardKeepAliveForMonth,
  getCardKeepAliveDismissals,
  type CardKeepAliveDismissals,
} from "../storage/cardKeepAliveDismissalStorage";
import { rescheduleCardKeepAliveReminders } from "../notifications/cardKeepAliveReminders";
import { getSavingsGoals } from "../storage/savingsGoalStorage";
import { getBudgetEntries, addBudgetEntry } from "../storage/budgetStorage";
import { syncNetWorthSnapshot } from "../storage/netWorthSnapshotStorage";
import {
  getDebtMilestonePlan,
  saveDebtMilestonePlan,
  updateDebtMilestoneStep,
} from "../storage/debtMilestoneStorage";
import { consumeArkSetupPromptRequest } from "../storage/arkSetupStorage";
import DebtCard from "../components/DebtCard";
import AddDebtModal, { type DebtKeepAliveExtras } from "../components/AddDebtModal";
import { getLinks, updateLink } from "../storage/externalAccountLinksStorage";
import ProgressRing from "../components/ProgressRing";
import PaymentHistoryModal from "../components/PaymentHistoryModal";
import DebtPayoffCelebrationModal from "../components/DebtPayoffCelebrationModal";
import DebtPaymentCelebrationModal from "../components/DebtPaymentCelebrationModal";
import { triggerHaptic } from "../utils/haptics";
import { useAchievements } from "../achievements/AchievementsProvider";
import { simulatePayoffPlan } from "../utils/calculations";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import { useTabCoachmark } from "../onboarding/useTabCoachmark";
import { useCoachmarkAnchor } from "../onboarding/CoachmarkAnchorContext";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";

/**
 * FAB layout constants. The vertical offset derives from the live bottom
 * safe-area inset via fabBottomOffset() so the FAB always clears the tab
 * bar (whose height also grows with that inset). Keep RIGHT/SIZE in sync
 * with styles.fab below.
 */
const FAB_RIGHT = 20;
const FAB_SIZE = 52;


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

const KEEL_MAX_TARGET = 2000;

/**
 * Tier ordering for the debt list. Lower tier = listed first.
 *
 * Default: credit cards / personal loans first, then car loans, then house.
 *
 * Promotion gate: car and mortgage only move to the top of the list once
 * (a) the Hull milestone is marked complete and (b) every credit /
 * personal-loan debt has a zero balance. Both checks are required - Hull
 * being marked complete while credit still carries a balance shouldn't
 * bury those entries behind the mortgage. When the gate opens, car comes
 * before house (smaller balance, naturally tackled first).
 */
const getDebtTier = (
  debt: Debt,
  promoteSecured: boolean
): number => {
  if (promoteSecured) {
    if (debt.debtClass === "car") return 0;
    if (debt.debtClass === "house") return 1;
    return 2; // personal_credit (paid off in this state, but ordered last)
  }
  if (debt.debtClass === "personal_credit") return 0;
  if (debt.debtClass === "car") return 1;
  return 2; // house
};

const formatPayoffMonths = (months: number): string => {
  if (!Number.isFinite(months)) return "Not solvable";
  if (months <= 0) return "0 months";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years <= 0) return `${remainingMonths} mo`;
  if (remainingMonths <= 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
};

const getMilestoneCongratsMessage = (key: DebtMilestoneKey): string => {
  if (key === "keel") return "Great start. Your foundation is in place.";
  if (key === "hull") return "Strong work. All non-mortgage debt is cleared.";
  if (key === "deck") return "Excellent discipline. Your emergency fund is fully funded.";
  if (key === "supplies") return "Nice consistency. Your retirement investing is on track.";
  if (key === "gather_animals") return "Well done. Your children's future is being built.";
  if (key === "moorings") return "Incredible. Your home is paid off.";
  if (key === "sail") return "You did it. Your Ark is complete. Build wealth and give generously.";
  return "Congratulations! Another milestone complete. Keep going.";
};

const getMilestoneBuildActionLabel = (key: DebtMilestoneKey): string => {
  if (key === "supplies") return "Invest";
  if (key === "gather_animals") return "Gather";
  if (key === "moorings") return "Secure";
  if (key === "sail") return "Launch";
  return "Build";
};

const getNewlyPaidOffDebt = (
  previousDebts: Debt[],
  nextDebts: Debt[]
): Debt | null => {
  const previousById = new Map(previousDebts.map((debt) => [debt.id, debt]));

  for (const nextDebt of nextDebts) {
    const previousDebt = previousById.get(nextDebt.id);
    if (!previousDebt) continue;
    if (previousDebt.balance > 0 && nextDebt.balance <= 0) {
      return nextDebt;
    }
  }

  return null;
};

const DebtTrackerScreen: React.FC = () => {
  const { runCheck: notifyAchievementCheck } = useAchievements();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [pendingDeleteDebt, setPendingDeleteDebt] = useState<Debt | null>(null);
  const [strategy, setStrategy] = useState<PayoffStrategy>("custom");
  const [showHistory, setShowHistory] = useState(false);
  const [hullExtraDraft, setHullExtraDraft] = useState("100");
  const [ownerFilter, setOwnerFilter] = useState<DebtOwnerFilter>("all");
  const [milestonePlan, setMilestonePlan] = useState<DebtMilestonePlan | null>(null);
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);
  const [savingsReserve, setSavingsReserve] = useState(0);
  const [retirementInvestingMonthly, setRetirementInvestingMonthly] = useState(0);
  const [monthlyEssentialsEstimate, setMonthlyEssentialsEstimate] = useState(3000);
  const [expandedMilestones, setExpandedMilestones] = useState<
    Record<DebtMilestoneKey, boolean>
  >({
    keel: false,
    hull: false,
    deck: false,
    supplies: false,
    gather_animals: false,
    moorings: false,
    sail: false,
  });
  const [targetDraftByStep, setTargetDraftByStep] = useState<Record<DebtMilestoneKey, string>>({
    keel: "",
    hull: "",
    deck: "",
    supplies: "",
    gather_animals: "",
    moorings: "",
    sail: "",
  });
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsDraft, setSavingsDraft] = useState("");
  const [celebrationDebt, setCelebrationDebt] = useState<Debt | null>(null);
  // Lighter "payment logged" confetti for a confirmed reminder payment that
  // didn't clear the debt (a full payoff uses celebrationDebt instead).
  const [paymentCelebration, setPaymentCelebration] = useState<{
    debt: Debt;
    amount: number;
  } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dueDismissals, setDueDismissals] = useState<DebtDueDismissals>({});
  const [duePromptDebt, setDuePromptDebt] = useState<Debt | null>(null);
  const [keepAliveDismissals, setKeepAliveDismissals] =
    useState<CardKeepAliveDismissals>({});

  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const route = useRoute<RouteProp<RootTabParamList, "DebtTracker">>();

  const { colors, showAmbientBackground } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const { pushUndo } = useUndo();
  const coachmark = useTabCoachmark("DebtTracker");
  const listRef = useRef<FlatList<Debt>>(null);
  const anchorSummary = useCoachmarkAnchor("debts-summary-card", { scrollRef: listRef });
  const anchorMilestones = useCoachmarkAnchor("debts-milestones-card", { scrollRef: listRef });
  // FAB anchor is a phantom View rendered alongside the FAB at the exact same
  // layout position. The earlier computed-rect approach drifted on Android
  // when window-inset assumptions diverged from the screen's coordinate
  // space; using a real ref + measureInWindow means the spotlight lands
  // wherever the FAB actually paints, by definition.
  const anchorDebtsFab = useCoachmarkAnchor("debts-fab");

  const styles = React.useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const primeMilestonesModal = useCallback((plan: DebtMilestonePlan) => {
    setTargetDraftByStep((prev) => {
      const nextDraft = { ...prev };
      plan.steps.forEach((step) => {
        nextDraft[step.key] =
          typeof step.targetAmount === "number" && Number.isFinite(step.targetAmount)
            ? String(Math.round(step.targetAmount))
            : "";
      });
      return nextDraft;
    });
    const currentStep = plan.steps.find((step) => step.key === plan.currentStepKey);
    const shouldExpandCurrent = !!currentStep && !currentStep.isCompleted;
    setExpandedMilestones({
      keel: shouldExpandCurrent && plan.currentStepKey === "keel",
      hull: shouldExpandCurrent && plan.currentStepKey === "hull",
      deck: shouldExpandCurrent && plan.currentStepKey === "deck",
      supplies: shouldExpandCurrent && plan.currentStepKey === "supplies",
      gather_animals: shouldExpandCurrent && plan.currentStepKey === "gather_animals",
      moorings: shouldExpandCurrent && plan.currentStepKey === "moorings",
      sail: shouldExpandCurrent && plan.currentStepKey === "sail",
    });
  }, []);

  /** Load debts from device storage whenever this tab is focused */
  useFocusEffect(
    useCallback(() => {
      // Cancellation flag - guards every setState after an await so a stale
      // load can't overwrite a newer one's state on rapid tab thrash.
      let cancelled = false;
      const loadDebts = async () => {
        try {
          const [
            stored,
            storedPayments,
            storedDismissals,
            budgetEntries,
            storedMilestones,
            savedStrategy,
            storedGoals,
            shouldOpenArkSetup,
            storedKeepAliveDismissals,
          ] = await Promise.all([
            getDebts(),
            getPayments(),
            getDebtDueDismissals(),
            getBudgetEntries(),
            getDebtMilestonePlan(),
            getPayoffStrategyPreference(),
            getSavingsGoals(),
            consumeArkSetupPromptRequest(),
            getCardKeepAliveDismissals(),
          ]);
          if (cancelled) return;
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
          if (cancelled) return;
          setDebts(valid);
          setPayments(storedPayments);
          setDueDismissals(storedDismissals);
          setKeepAliveDismissals(storedKeepAliveDismissals);
          // The "minimum due today" prompt is now opened on app launch by the
          // app-root DebtDueReminderHost (so it fires regardless of the active
          // tab). Auto-opening it here too would stack a second copy when the
          // Debts tab is focused. The in-tab reminder banner below still opens
          // this screen's own prompt on demand.
          setMilestonePlan(storedMilestones);
          if (shouldOpenArkSetup) {
            primeMilestonesModal(storedMilestones);
            setShowMilestonesModal(true);
          }
          if (savedStrategy) {
            setStrategy(savedStrategy);
          }
          setSavingsGoals(storedGoals);

          // Emergency-fund / keel reserve. Only the "Savings" category
          // counts here - Retirement and Investing flow into the
          // gather_animals milestone via retirementInvestingMonthly below
          // because those funds aren't liquid emergency money.
          const savings = budgetEntries
            .filter(
              (entry) =>
                entry.type === "expense" && entry.category === "Savings"
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
          if (cancelled) return;
          if (__DEV__) console.error("Failed to load debts:", error);
          setDebts([]);
        }
      };
      loadDebts();
      return () => {
        cancelled = true;
      };
    }, [primeMilestonesModal])
  );

  // A keep-alive notification tap (or the Bridge banner) navigates here with
  // openKeepAlive set. The banner sits at the top of the list, so the only
  // action is scrolling it into view. Deferred past the tab-switch
  // transition, matching the openInbox pattern on BudgetScreen.
  React.useEffect(() => {
    if (!route.params?.openKeepAlive) return;
    const task = InteractionManager.runAfterInteractions(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      navigation.setParams({ openKeepAlive: undefined });
    });
    return () => task.cancel();
  }, [navigation, route.params?.openKeepAlive]);

  /** "I used it" on a card's keep-alive tracker: stamp now, replan nudges. */
  const handleKeepAliveUse = useCallback(async (debtId: string) => {
    const updated = await updateDebt(debtId, {
      keepAliveLastUsedAt: new Date().toISOString(),
    });
    setDebts(updated);
    void rescheduleCardKeepAliveReminders();
    triggerHaptic("success");
  }, []);

  /** "Later" on the keep-alive banner: mute that card for this month. */
  const handleKeepAliveDismiss = useCallback(async (debt: Debt) => {
    await dismissCardKeepAliveForMonth(debt.id);
    setKeepAliveDismissals(await getCardKeepAliveDismissals());
  }, []);

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

  // Hull (Build Your Ark step "Clear Non-Mortgage Debt") covers credit cards,
  // personal loans, and car loans - anything that isn't the mortgage.
  const nonMortgageDebts = debts.filter((debt) => debt.debtClass !== "house");
  const nonMortgageRemaining = nonMortgageDebts.reduce(
    (sum, debt) => sum + debt.balance,
    0
  );
  const nonMortgageOriginal = nonMortgageDebts.reduce(
    (sum, debt) => sum + debt.originalBalance,
    0
  );

  // Moorings (pay down the house) is keyed only on house debts.
  const mortgageDebts = debts.filter((debt) => debt.debtClass === "house");
  const mortgageRemaining = mortgageDebts.reduce((sum, debt) => sum + debt.balance, 0);
  const mortgageOriginal = mortgageDebts.reduce(
    (sum, debt) => sum + debt.originalBalance,
    0
  );

  const computedMilestones = React.useMemo<ComputedMilestone[]>(() => {
    if (!milestonePlan) return [];

    return milestonePlan.steps.map((step) => {
      if (step.key === "keel") {
        const target = step.targetAmount || 1200;
        const progress = target > 0 ? Math.min(savingsReserve / target, 1) : 0;
        return {
          ...step,
          progress,
          metricLabel: `${formatCurrency(savingsReserve)} / ${formatCurrency(target)}`,
          nextAction: "Set aside your first cushion target before pushing harder elsewhere.",
        };
      }

      if (step.key === "hull") {
        const progress =
          nonMortgageOriginal > 0
            ? Math.min((nonMortgageOriginal - nonMortgageRemaining) / nonMortgageOriginal, 1)
            : 0;
        return {
          ...step,
          progress,
          metricLabel: `${formatCurrency(nonMortgageRemaining)} remaining`,
          nextAction: "Apply your next extra payment to the first debt in your chosen payoff order.",
        };
      }

      if (step.key === "deck") {
        const target = step.targetAmount || monthlyEssentialsEstimate * 3;
        const progress = target > 0 ? Math.min(savingsReserve / target, 1) : 0;
        return {
          ...step,
          progress,
          metricLabel: `${formatCurrency(savingsReserve)} / ${formatCurrency(target)}`,
          nextAction: "Grow your reserves toward 3-6 months of essentials for stability.",
        };
      }

      if (step.key === "supplies") {
        const target = step.targetAmount || 500;
        const progress = target > 0 ? Math.min(retirementInvestingMonthly / target, 1) : 0;
        return {
          ...step,
          progress,
          metricLabel: `${formatCurrency(retirementInvestingMonthly)} / ${formatCurrency(target)} /mo`,
          nextAction: "Increase retirement contributions toward 15% of household income.",
        };
      }

      if (step.key === "gather_animals") {
        const educationGoals = savingsGoals.filter((g) => g.category === "education");
        const totalSaved = educationGoals.reduce((sum, g) => sum + g.currentAmount, 0);
        const totalGoalTarget = educationGoals.reduce((sum, g) => sum + g.targetAmount, 0);
        const target = step.targetAmount || totalGoalTarget || 10000;
        const progress = target > 0 ? Math.min(totalSaved / target, 1) : 0;
        return {
          ...step,
          progress,
          metricLabel: educationGoals.length > 0
            ? `${formatCurrency(totalSaved)} / ${formatCurrency(target)}`
            : "Add an education savings goal to track",
          nextAction: "Open or contribute to a 529 plan or education savings account.",
        };
      }

      if (step.key === "moorings") {
        const progress =
          mortgageOriginal > 0
            ? Math.min((mortgageOriginal - mortgageRemaining) / mortgageOriginal, 1)
            : 0;
        return {
          ...step,
          progress,
          metricLabel: mortgageRemaining > 0
            ? `${formatCurrency(mortgageRemaining)} remaining`
            : "No mortgage debt tracked",
          nextAction: "Make extra principal payments on your mortgage when possible.",
        };
      }

      if (step.key === "sail") {
        const target = step.targetAmount || 1000;
        return {
          ...step,
          progress: step.isCompleted ? 1 : 0,
          metricLabel: step.isCompleted ? "Completed" : `Target: ${formatCurrency(target)} /mo`,
          nextAction: "Live generously, invest beyond retirement, and build lasting wealth.",
        };
      }

      return {
        ...step,
        progress: step.isCompleted ? 1 : 0,
        metricLabel: step.isCompleted ? "Completed" : "Not started",
        nextAction: "",
      };
    });
  }, [
    formatCurrency,
    milestonePlan,
    monthlyEssentialsEstimate,
    nonMortgageOriginal,
    nonMortgageRemaining,
    retirementInvestingMonthly,
    savingsGoals,
    savingsReserve,
    mortgageOriginal,
    mortgageRemaining,
  ]);

  const currentMilestone =
    computedMilestones.find((step) => step.key === milestonePlan?.currentStepKey) ||
    computedMilestones[0] ||
    null;
  const orderedMilestones = React.useMemo(() => {
    const completed = computedMilestones.filter((step) => step.isCompleted);
    const inProgress = computedMilestones.filter((step) => !step.isCompleted);
    return [...completed, ...inProgress];
  }, [computedMilestones]);
  const currentMilestoneKey = currentMilestone?.key;
  const currentMilestoneIndex = currentMilestone
    ? computedMilestones.findIndex((step) => step.key === currentMilestone.key)
    : 0;
  const allMilestonesCompleted =
    computedMilestones.length > 0 && computedMilestones.every((step) => step.isCompleted);
  const runwayMonths = monthlyEssentialsEstimate > 0 ? savingsReserve / monthlyEssentialsEstimate : 0;
  const activeSavingsGoal = React.useMemo(() => {
    const openGoals = savingsGoals.filter((goal) => goal.currentAmount < goal.targetAmount);
    if (openGoals.length === 0) return null;
    const emergencyGoal = openGoals.find((goal) => goal.category === "emergency_fund");
    return emergencyGoal || openGoals[0];
  }, [savingsGoals]);

  // Payoff comparison calculations for Hull step.
  // Hull covers non-mortgage debt (credit + car), so the simulator should
  // not roll the mortgage into the projection - feeding it the house would
  // make the months-to-payoff and total-interest numbers reflect a full
  // mortgage payoff instead of the Hull goal.
  const payoffActiveDebts = React.useMemo(
    () => debts.filter((d) => d.balance > 0 && d.debtClass !== "house"),
    [debts]
  );
  const hullExtraAmount = React.useMemo(() => {
    const parsed = parseFloat(hullExtraDraft);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }, [hullExtraDraft]);
  const avalancheBase = React.useMemo(() => simulatePayoffPlan(payoffActiveDebts, "avalanche", 0), [payoffActiveDebts]);
  const avalancheWhatIf = React.useMemo(() => simulatePayoffPlan(payoffActiveDebts, "avalanche", hullExtraAmount), [payoffActiveDebts, hullExtraAmount]);
  const snowballBase = React.useMemo(() => simulatePayoffPlan(payoffActiveDebts, "snowball", 0), [payoffActiveDebts]);
  const snowballWhatIf = React.useMemo(() => simulatePayoffPlan(payoffActiveDebts, "snowball", hullExtraAmount), [payoffActiveDebts, hullExtraAmount]);
  /**
   * "Save $X • N mo faster" line under each method card. An unsolvable base
   * plan reports monthsToPayoff: Infinity (and ~1 month of accrued interest),
   * so raw subtraction renders "Infinity mo faster" / "NaN mo faster" with a
   * meaningless dollar figure - describe the outcome instead.
   */
  const formatPlanSavings = useCallback(
    (
      base: { monthsToPayoff: number; totalInterestPaid: number },
      whatIf: { monthsToPayoff: number; totalInterestPaid: number }
    ): string => {
      if (!Number.isFinite(base.monthsToPayoff)) {
        return Number.isFinite(whatIf.monthsToPayoff)
          ? "Makes payoff possible"
          : "Still not enough to pay off";
      }
      const saved = Math.max(0, base.totalInterestPaid - whatIf.totalInterestPaid);
      const faster = Math.max(0, base.monthsToPayoff - whatIf.monthsToPayoff);
      return `Save ${formatCurrency(saved)} • ${faster} mo faster`;
    },
    [formatCurrency]
  );

  const payoffRecommendation = React.useMemo(() => {
    if (!avalancheWhatIf.isPayoffPossible || !snowballWhatIf.isPayoffPossible) {
      return "Increase payments until both plans are solvable.";
    }
    if (avalancheWhatIf.totalInterestPaid < snowballWhatIf.totalInterestPaid) {
      return "Lowest interest: Avalanche.";
    }
    if (snowballWhatIf.totalInterestPaid < avalancheWhatIf.totalInterestPaid) {
      return "Lowest interest: Snowball.";
    }
    return "Tie - both methods cost the same interest.";
  }, [avalancheWhatIf, snowballWhatIf]);

  /** Add a new debt */
  /**
   * Points the chosen connected-account link at this debt (keep-alive
   * auto-stamping source) and clears any other link that fed it - one
   * account per card. Best-effort: the debt save must not fail on a link
   * hiccup. No-op when extras are undefined (not a credit card).
   */
  const applyKeepAliveLink = useCallback(
    async (debtId: string, extras?: DebtKeepAliveExtras) => {
      if (!extras) return;
      try {
        const links = await getLinks();
        for (const link of links) {
          if (link.id === extras.linkId) {
            if (link.debtId !== debtId) await updateLink(link.id, { debtId });
          } else if (link.debtId === debtId) {
            await updateLink(link.id, { debtId: null });
          }
        }
      } catch (error) {
        if (__DEV__) console.error("Keep-alive link update failed:", error);
      }
    },
    []
  );

  const handleAddDebt = useCallback(async (
    input: NewDebtInput,
    keepAlive?: DebtKeepAliveExtras
  ) => {
    const now = new Date().toISOString();
    const newDebt: Debt = {
      ...input,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...debts, newDebt];
    setDebts(updated);
    await saveDebts(updated);
    await applyKeepAliveLink(newDebt.id, keepAlive);
    void rescheduleCardKeepAliveReminders();
    await syncNetWorthSnapshot();
    setShowModal(false);
    void notifyAchievementCheck();
  }, [applyKeepAliveLink, debts, notifyAchievementCheck]);

  const advanceDuePrompt = useCallback(
    (
      debtList: Debt[],
      paymentList: Payment[],
      dismissals: DebtDueDismissals,
      skipDebtId?: string
    ) => {
      const due = debtsDueOrOverdueNeedingPrompt(
        debtList,
        paymentList,
        dismissals
      );
      const next = due.find((debt) => debt.id !== skipDebtId);
      setDuePromptDebt(next ?? null);
    },
    []
  );

  /** Record a payment against a debt */
  const handlePayment = useCallback(async (
    debtId: string,
    amount: number,
    opts?: { suppressCelebration?: boolean; paymentId?: string }
  ) => {
    const paymentNow = new Date().toISOString();
    // Manual payments get a random id; the due prompt passes a
    // deterministic one so the same month's minimum logged on both paired
    // phones merges to a single record instead of double-counting.
    const result = await recordPayment({
      id: opts?.paymentId ?? generateUUID(),
      debtId,
      amount,
      date: paymentNow,
      updatedAt: paymentNow,
    });
    const paidOffDebt = getNewlyPaidOffDebt(debts, result.debts);
    setDebts(result.debts);
    const freshPayments = await getPayments();
    setPayments(freshPayments);
    if (paidOffDebt) {
      // Callers with their own Modal open (the due prompt) suppress this
      // and present the celebration themselves after their dismiss
      // animation - presenting while another Modal is dismissing leaves
      // one of the two hidden on iOS.
      if (!opts?.suppressCelebration) setCelebrationDebt(paidOffDebt);
    } else {
      triggerHaptic("success");
    }
    await syncNetWorthSnapshot(paymentNow);
    void notifyAchievementCheck();
    return { debts: result.debts, payments: freshPayments, paidOffDebt };
  }, [debts, notifyAchievementCheck]);

  const duePromptSubmittingRef = useRef(false);
  const handleDuePromptLogPayment = useCallback(
    async (debtId: string, amount: number) => {
      // The button stays mounted through several awaits; without this guard
      // a double-tap records the minimum payment twice (the serialized
      // storage queue applies both writes cleanly).
      if (duePromptSubmittingRef.current) return;
      duePromptSubmittingRef.current = true;
      try {
        const result = await handlePayment(debtId, amount, {
          suppressCelebration: true,
          paymentId: minimumDuePaymentId(debtId, getMonthKey()),
        });
        setDuePromptDebt(null);
        if (result.paidOffDebt) {
          // Let the prompt finish dismissing before the celebration
          // presents. Any remaining due debts re-prompt on next focus -
          // advancing now would pop the prompt over the celebration.
          const paidOff = result.paidOffDebt;
          setTimeout(() => setCelebrationDebt(paidOff), 250);
        } else {
          // Celebrate the logged payment, then advance to the next due debt
          // once that confetti is dismissed (see the modal's onClose below).
          const updatedDebt = result.debts.find((d) => d.id === debtId) ?? null;
          if (updatedDebt) {
            setTimeout(
              () => setPaymentCelebration({ debt: updatedDebt, amount }),
              250
            );
          } else {
            advanceDuePrompt(result.debts, result.payments, dueDismissals, debtId);
          }
        }
      } finally {
        duePromptSubmittingRef.current = false;
      }
    },
    [advanceDuePrompt, dueDismissals, handlePayment]
  );

  const handleDuePromptDismissMonth = useCallback(
    async (debtId: string) => {
      await dismissDebtDueForMonth(debtId);
      const dismissals = await getDebtDueDismissals();
      setDueDismissals(dismissals);
      setDuePromptDebt(null);
      advanceDuePrompt(debts, payments, dismissals, debtId);
    },
    [advanceDuePrompt, debts, payments]
  );

  /** Open edit modal for a debt */
  const handleEdit = useCallback((debt: Debt) => {
    setEditingDebt(debt);
    setShowModal(true);
  }, []);

  /** Save edits to an existing debt */
  const handleSaveEdit = useCallback(async (
    debtId: string,
    updates: Partial<Debt>,
    keepAlive?: DebtKeepAliveExtras
  ) => {
    // Snapshot the full prior record so undo can write every field back,
    // not just the keys this edit touched.
    const prior = debts.find((d) => d.id === debtId) ?? null;
    const updated = await updateDebt(debtId, updates);
    const paidOffDebt = getNewlyPaidOffDebt(debts, updated);
    setDebts(updated);
    await applyKeepAliveLink(debtId, keepAlive);
    void rescheduleCardKeepAliveReminders();
    await syncNetWorthSnapshot();
    setShowModal(false);
    setEditingDebt(null);
    if (prior) {
      pushUndo({
        message: `Edited "${prior.name}"`,
        onUndo: async () => {
          const reverted = await updateDebt(debtId, prior);
          setDebts(reverted);
          await syncNetWorthSnapshot();
          void notifyAchievementCheck();
        },
      });
    }
    if (paidOffDebt) {
      // Defer the celebration Modal so the edit Modal's close animation
      // finishes first - RN can't stack two Modal presentations in the
      // same frame on iOS without one being queued or visually clipped.
      setTimeout(() => setCelebrationDebt(paidOffDebt), 250);
    } else {
      triggerHaptic("success");
    }
    void notifyAchievementCheck();
  }, [applyKeepAliveLink, debts, notifyAchievementCheck, pushUndo]);

  /** Delete a debt */
  const handleDelete = useCallback(async (debtId: string) => {
    const target = debts.find((d) => d.id === debtId) ?? null;
    setPendingDeleteDebt(target);
  }, [debts]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteDebt) return;
    const debtId = pendingDeleteDebt.id;
    // Soft-delete via the storage helper so a tombstone gets persisted -
    // a paired partner needs that to remove the debt locally on next sync,
    // otherwise their stale upsert would resurrect this deletion.
    const deletedName = pendingDeleteDebt.name;
    const updated = await deleteDebt(debtId);
    setDebts(updated);
    await syncNetWorthSnapshot();
    setPendingDeleteDebt(null);
    triggerHaptic("warning");
    pushUndo({
      message: `Deleted "${deletedName}"`,
      onUndo: async () => {
        const restored = await restoreDebt(debtId);
        setDebts(restored);
        await syncNetWorthSnapshot();
        void notifyAchievementCheck();
      },
    });
  }, [pendingDeleteDebt, pushUndo, notifyAchievementCheck]);

  // Payment bulk-delete/undo (inside PaymentHistoryModal) re-adjusts debt
  // balances, so pull fresh debts + resnapshot net worth when it reports a
  // change.
  const handlePaymentsChanged = useCallback(async () => {
    const [fresh, freshPayments, dismissals] = await Promise.all([
      getDebts(),
      getPayments(),
      getDebtDueDismissals(),
    ]);
    setDebts(fresh);
    setPayments(freshPayments);
    setDueDismissals(dismissals);
    // Deliberately no due-prompt re-evaluation here: this callback fires
    // from inside the open Payment History sheet, and presenting the prompt
    // now would stack it over the sheet (covering its undo bar). The prompt
    // is re-evaluated when the sheet closes.
    await syncNetWorthSnapshot();
    void notifyAchievementCheck();
  }, [notifyAchievementCheck]);

  const handleToggleMilestoneComplete = useCallback(
    async (step: ComputedMilestone) => {
      const markingComplete = !step.isCompleted;
      const nextPlan = await updateDebtMilestoneStep(step.key, {
        isCompleted: markingComplete,
      });

      if (markingComplete && nextPlan) {
        const stepOrder: DebtMilestoneKey[] = ["keel", "hull", "deck", "supplies", "gather_animals", "moorings", "sail"];
        const currentIndex = stepOrder.indexOf(step.key);
        const nextKey = stepOrder[currentIndex + 1];
        if (nextKey) {
          nextPlan.currentStepKey = nextKey;
          nextPlan.updatedAt = new Date().toISOString();
          await saveDebtMilestonePlan(nextPlan);
          setExpandedMilestones((current) => ({
            ...current,
            [step.key]: false,
            [nextKey]: true,
          }));
        } else {
          setExpandedMilestones((current) => ({ ...current, [step.key]: false }));
        }
      }

      setMilestonePlan(nextPlan);
      void notifyAchievementCheck();
    },
    [notifyAchievementCheck]
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
      void notifyAchievementCheck();
    },
    [milestonePlan, notifyAchievementCheck]
  );

  const openMilestonesModal = useCallback(() => {
    if (milestonePlan) {
      primeMilestonesModal(milestonePlan);
    }
    setShowMilestonesModal(true);
  }, [milestonePlan, primeMilestonesModal]);

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
        const unclamped = Math.max(0, (Number.isFinite(base) ? base : 0) + amount);
        const next = key === "keel" ? Math.min(unclamped, KEEL_MAX_TARGET) : unclamped;
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
      const normalized = key === "keel" ? Math.min(parsed, KEEL_MAX_TARGET) : parsed;
      const nextPlan = await updateDebtMilestoneStep(key, {
        targetAmount: normalized,
      });
      setMilestonePlan(nextPlan);
      setTargetDraftByStep((current) => ({
        ...current,
        [key]: String(Math.round(normalized)),
      }));
      void notifyAchievementCheck();
    },
    [notifyAchievementCheck, targetDraftByStep]
  );

  const handleSetSavingsReserve = useCallback(
    async (targetAmount: number) => {
      if (!Number.isFinite(targetAmount) || targetAmount < 0) return;
      const delta = targetAmount - savingsReserve;
      if (delta === 0) { setSavingsDraft(""); return; }
      const now = new Date();
      const entry: BudgetEntry = {
        id: generateUUID(),
        type: "expense",
        category: "Savings",
        amount: delta,
        description: delta > 0 ? "Logged from Build Your Ark" : "Correction from Build Your Ark",
        date: now.toISOString().slice(0, 10),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await addBudgetEntry(entry);
      await syncNetWorthSnapshot();
      setSavingsReserve(targetAmount);
      setSavingsDraft("");
      void notifyAchievementCheck();
    },
    [notifyAchievementCheck, savingsReserve]
  );

  /** Sort debts based on payoff strategy.
   *
   * Tier order is applied first (credit/personal → car → house). Car and
   * mortgage only promote above credit once Hull is complete AND every
   * credit / personal-loan debt has a zero balance. Within each tier the
   * chosen strategy decides ordering: avalanche by APR desc, snowball by
   * balance asc, custom by creation order. */
  const hullCompleted =
    milestonePlan?.steps.find((step) => step.key === "hull")?.isCompleted === true;
  const allCreditCleared = !debts.some(
    (debt) => debt.debtClass === "personal_credit" && debt.balance > 0
  );
  const promoteSecured = hullCompleted && allCreditCleared;

  const sortedDebts = React.useMemo(() => {
    const active = filteredDebts.filter((d) => d.balance > 0);
    const paidOff = filteredDebts.filter((d) => d.balance <= 0);
    active.sort((a, b) => {
      const tierDiff = getDebtTier(a, promoteSecured) - getDebtTier(b, promoteSecured);
      if (tierDiff !== 0) return tierDiff;
      if (strategy === "avalanche") return b.rate - a.rate;
      if (strategy === "snowball") return a.balance - b.balance;
      return 0;
    });
    return [...active, ...paidOff];
  }, [filteredDebts, strategy, promoteSecured]);

  const handleChangeStrategy = useCallback(async (nextStrategy: PayoffStrategy) => {
    setStrategy(nextStrategy);
    await savePayoffStrategyPreference(nextStrategy);
  }, []);


  const keyExtractor = useCallback((item: Debt) => item.id, []);

  /** The first active debt in sortedDebts is the priority payoff target */
  const focusDebtId = sortedDebts.find((d) => d.balance > 0)?.id ?? null;

  const renderDebtCard = useCallback(
    ({ item }: { item: Debt }) => (
      <DebtCard
        debt={item}
        onPayment={handlePayment}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onKeepAliveUse={handleKeepAliveUse}
        isFocusDebt={item.id === focusDebtId}
      />
    ),
    [handlePayment, handleDelete, handleEdit, handleKeepAliveUse, focusDebtId]
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

      <View ref={anchorSummary} collapsable={false} style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>TOTAL REMAINING</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(totalDebt)}</Text>
            <Text style={styles.paidText}>{formatCurrency(totalPaid)} paid off</Text>
          </View>
          {/* Tap ring → payment history */}
          <TouchableOpacity
            style={styles.summaryRingWrap}
            onPress={() => setShowHistory(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Payoff ${overallPercent} percent. Tap to view payment history.`}
          >
            <View style={styles.summaryRingInner}>
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
            <View style={[styles.summaryRingHint, { backgroundColor: `${colors.accent}20` }]}>
              <Text style={[styles.summaryRingHintText, { color: colors.accent }]}>
                🕐 View history
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Owner summary row doubles as filter - tap to filter */}
        <View style={styles.ownerSummaryRow}>
          {([
            { id: "all" as DebtOwnerFilter, label: "All", value: totalMine + totalPartner + totalJoint },
            { id: "mine" as DebtOwnerFilter, label: "Mine", value: totalMine },
            { id: "partner" as DebtOwnerFilter, label: "Partner", value: totalPartner },
            { id: "joint" as DebtOwnerFilter, label: "Joint", value: totalJoint },
          ]).map((item) => {
            const isSelected = ownerFilter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.ownerSummaryCard,
                  {
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.accent : "transparent",
                  },
                ]}
                onPress={() => setOwnerFilter(item.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.ownerSummaryLabel, isSelected && { color: colors.accent }]}>{item.label}</Text>
                <Text style={styles.ownerSummaryValue}>{formatCurrency(item.value)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Milestone bar - tap opens milestones */}
        <TouchableOpacity
          ref={anchorMilestones}
          style={[styles.milestonesCard, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
          onPress={openMilestonesModal}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.milestonesInlineText}>
              Step {Math.max(currentMilestoneIndex + 1, 1)}/{computedMilestones.length || 7} • {(currentMilestone?.title || "Keel").toUpperCase()}
              {currentMilestoneKey === "deck" ? ` • ${runwayMonths.toFixed(1)} mo runway` : ""}
              {currentMilestoneKey === "supplies" && activeSavingsGoal
                ? ` • ${activeSavingsGoal.name} ${Math.round(Math.min(activeSavingsGoal.currentAmount / Math.max(activeSavingsGoal.targetAmount, 1), 1) * 100)}%`
                : ""}
            </Text>
            <Text style={styles.milestonesSubText}>
              {strategy === "custom" ? "Custom order" : strategy === "avalanche" ? "Avalanche" : "Snowball"} • Tap to plan
            </Text>
          </View>
          <Text style={styles.milestoneArkLabel}>Build Your Ark →</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: tokens.gap }}>
        <DebtDueReminderBanner
          debts={debts}
          payments={payments}
          dismissals={dueDismissals}
          onOpen={() => {
            const due = debtsDueOrOverdueNeedingPrompt(
              debts,
              payments,
              dueDismissals
            );
            if (due[0]) {
              setDuePromptDebt(due[0]);
              return;
            }
            const upcoming = upcomingDebtDuesWithin(
              debts,
              payments,
              7,
              dueDismissals
            );
            if (upcoming[0]) {
              setEditingDebt(upcoming[0].debt);
              setShowModal(true);
            }
          }}
          daysAhead={7}
        />
      </View>

      <View style={{ marginBottom: tokens.gap }}>
        <CardKeepAliveBanner
          debts={debts}
          dismissals={keepAliveDismissals}
          onOpen={(debt) => {
            setEditingDebt(debt);
            setShowModal(true);
          }}
          onDismiss={handleKeepAliveDismiss}
        />
      </View>

      {/* Section header - just title + sort hint */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Debts</Text>
        <Text style={[styles.strategyHint, { marginBottom: 0 }]}>
          {strategy === "avalanche"
            ? "Avalanche order"
            : strategy === "snowball"
            ? "Snowball order"
            : "Custom order"}
        </Text>
      </View>
    </View>
  );

  /** Empty state when user has no debts */
  const emptyState = (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>🧭</Text>
      <Text style={styles.emptyTitle}>Build Your Ark</Text>
      <Text style={styles.emptySub}>
        Add debt accounts when you are ready, or map your milestone targets first.
      </Text>
      <TouchableOpacity
        style={[styles.emptyActionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
        onPress={openMilestonesModal}
      >
        <Text style={[styles.emptyActionText, { color: colors.text }]}>Set Up Milestones</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      style={[
        styles.screen,
        showAmbientBackground && { backgroundColor: "transparent" },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <FlatList
        ref={listRef}
        data={sortedDebts}
        keyExtractor={keyExtractor}
        renderItem={renderDebtCard}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      />
      {/* Phantom anchor for the coachmark spotlight. Rendered at the FAB's
          exact layout position (same styles, invisible and non-interactive)
          so measureInWindow returns the real on-screen rect regardless of
          platform inset quirks. */}
      <View
        ref={anchorDebtsFab}
        collapsable={false}
        pointerEvents="none"
        style={[
          styles.fab,
          { bottom: fabBottomOffset(insets.bottom), opacity: 0 },
        ]}
      />

      {/* FAB - Add Debt. */}
      <TouchableOpacity
        style={[styles.fab, { bottom: fabBottomOffset(insets.bottom) }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddDebtModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditingDebt(null); }}
        onAdd={handleAddDebt}
        editDebt={editingDebt}
        onEdit={handleSaveEdit}
      />

      <PaymentHistoryModal
        visible={showHistory}
        onClose={() => {
          setShowHistory(false);
          // Deleting this month's payment can re-arm today's due prompt;
          // present it only after the sheet's dismiss animation finishes.
          setTimeout(
            () => advanceDuePrompt(debts, payments, dueDismissals),
            250
          );
        }}
        debts={debts}
        onPaymentsChanged={handlePaymentsChanged}
      />

      <DebtPayoffCelebrationModal
        visible={celebrationDebt !== null}
        debt={celebrationDebt}
        onClose={() => setCelebrationDebt(null)}
        onViewHistory={() => {
          // Wait for the celebration Modal close animation before presenting
          // the history Modal - iOS doesn't reliably handle dismiss-then-
          // present in the same frame and one of the two ends up hidden.
          setCelebrationDebt(null);
          setTimeout(() => setShowHistory(true), 250);
        }}
      />

      <DebtDuePaymentPromptModal
        visible={duePromptDebt !== null}
        debt={duePromptDebt}
        onLogPayment={handleDuePromptLogPayment}
        onDismissForMonth={handleDuePromptDismissMonth}
        onClose={() => setDuePromptDebt(null)}
      />

      <DebtPaymentCelebrationModal
        visible={paymentCelebration !== null}
        debt={paymentCelebration?.debt ?? null}
        amount={paymentCelebration?.amount ?? 0}
        onClose={() => {
          setPaymentCelebration(null);
          // Advance to the next due debt after the confetti dismisses; reads
          // current state so it reflects the payment just recorded.
          setTimeout(
            () => advanceDuePrompt(debts, payments, dueDismissals),
            250
          );
        }}
      />

      <Modal
        visible={showMilestonesModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMilestonesModal(false)}
      >
        <View style={styles.msFullOverlay}>
          <View style={[styles.msFullBox, { paddingTop: Math.max(insets.top, 20) + 12, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={styles.msFullTitle}>Build Your Ark Milestones</Text>
            <Text style={styles.msFullMessage}>
              Keel to Hull to Deck to Supplies to Sail. Follow each stage at your pace.
            </Text>
            <ScrollView style={styles.msFullList} contentContainerStyle={styles.msFullListContent}>
              {orderedMilestones.map((step) => {
                const isCurrent = milestonePlan?.currentStepKey === step.key;
                const isExpanded = step.isCompleted
                  ? !!expandedMilestones[step.key]
                  : isCurrent || expandedMilestones[step.key];
                if (step.isCompleted) {
                  if (!isExpanded) {
                    return (
                      <TouchableOpacity
                        key={step.key}
                        style={[styles.msStepCard, { borderColor: colors.success }]}
                        onPress={() => toggleMilestoneExpanded(step.key)}
                      >
                        <View style={styles.msStepHeaderRow}>
                          <Text style={styles.msStepName}>{step.title}</Text>
                          <View style={[styles.msStepBadge, { backgroundColor: `${colors.success}20` }]}> 
                            <Text style={[styles.msStepBadgeText, { color: colors.success }]}>Complete</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <View key={step.key} style={[styles.msStepCard, { borderColor: colors.success }]}> 
                      <View style={styles.msStepHeaderRow}>
                        <Text style={styles.msStepName}>{step.title}</Text>
                        <View style={[styles.msStepBadge, { backgroundColor: `${colors.success}20` }]}> 
                          <Text style={[styles.msStepBadgeText, { color: colors.success }]}>Completed</Text>
                        </View>
                      </View>
                      <Text style={styles.msStepDescription}>{getMilestoneCongratsMessage(step.key)}</Text>
                      <View style={styles.msStepActionRow}>
                        <TouchableOpacity
                          style={[styles.msStepActionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
                          onPress={() => handleToggleMilestoneComplete(step)}
                        >
                          <Text style={styles.msStepActionText}>Rebuild</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                if (!isExpanded) {
                  return (
                    <TouchableOpacity
                      key={step.key}
                      style={[styles.msStepCard, { borderColor: colors.cardBorder }]}
                      onPress={() => toggleMilestoneExpanded(step.key)}
                    >
                      <View style={styles.msStepHeaderRow}>
                        <Text style={styles.msStepName}>{step.title}</Text>
                        <Text style={styles.msStepExpandIcon}>+</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }

                return (
                  <View key={step.key} style={[styles.msStepCard, { borderColor: colors.cardBorder }]}> 
                    <View style={styles.msStepHeaderRow}>
                      <Text style={styles.msStepName}>{step.title}</Text>
                      {isCurrent && (
                        <View style={[styles.msStepBadge, { backgroundColor: `${colors.accent}20` }]}> 
                          <Text style={[styles.msStepBadgeText, { color: colors.accent }]}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.msStepDescription}>{step.description}</Text>
                    <Text style={styles.msStepMetric}>{step.metricLabel}</Text>
                    {typeof step.targetAmount === "number" ? (
                      <View style={styles.msTargetEditorRow}>
                        <TextInput
                          style={styles.msTargetInput}
                          placeholder="Target"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="decimal-pad"
                          value={targetDraftByStep[step.key] || ""}
                          onChangeText={(value) => setMilestoneTargetDraft(step.key, value)}
                        />
                        <TouchableOpacity
                          style={[styles.msTargetSaveBtn, { backgroundColor: colors.bg }]}
                          onPress={() => handleSaveMilestoneTarget(step.key)}
                        >
                          <Text style={styles.msTargetSaveText}>Save Target</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    {typeof step.targetAmount === "number" ? (
                      <View style={styles.msTargetQuickRow}>
                        {(step.key === "keel" ? [50, 100] : [100, 250, 500]).map((amount) => (
                          <TouchableOpacity
                            key={amount}
                            style={[styles.msTargetQuickBtn, { borderColor: colors.cardBorder }]}
                            onPress={() => bumpMilestoneTargetDraft(step.key, amount)}
                          >
                            <Text style={styles.msTargetQuickText}>+{amount}</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          style={[styles.msTargetQuickBtn, { borderColor: colors.cardBorder }]}
                          onPress={() => bumpMilestoneTargetDraft(step.key, -100)}
                        >
                          <Text style={styles.msTargetQuickText}>-100</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    <View style={styles.msProgressTrack}>
                      <View
                        style={[
                          styles.msProgressFill,
                          {
                            width: `${Math.round(step.progress * 100)}%`,
                            backgroundColor: step.isCompleted ? colors.success : colors.accent,
                          },
                        ]}
                      />
                    </View>
                    {step.key === "hull" && payoffActiveDebts.length > 0 && !step.isCompleted ? (
                      <View style={styles.msPayoffSection}>
                        <Text style={styles.msPayoffTitle}>Compare Payoff Strategies</Text>
                        <Text style={styles.msPayoffLabel}>EXTRA MONTHLY PAYMENT</Text>
                        <TextInput
                          style={styles.msPayoffInput}
                          keyboardType="decimal-pad"
                          value={hullExtraDraft}
                          onChangeText={(v) => setHullExtraDraft(v.replace(/[^0-9.]/g, ""))}
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                        />
                        <View style={styles.msPayoffChips}>
                          {[50, 100, 250, 500].map((amt) => (
                            <TouchableOpacity
                              key={amt}
                              style={[styles.msPayoffChip, { borderColor: colors.cardBorder }]}
                              onPress={() => setHullExtraDraft(String(amt))}
                            >
                              <Text style={styles.msPayoffChipText}>+{formatCurrency(amt)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={[styles.msPayoffRecBox, { borderColor: colors.cardBorder }]}>
                          <Text style={styles.msPayoffRecText}>{payoffRecommendation}</Text>
                        </View>
                        {/* Avalanche */}
                        <View style={[styles.msPayoffCard, { borderColor: strategy === "avalanche" ? colors.accent : colors.cardBorder }]}>
                          <Text style={styles.msPayoffCardTitle}>Avalanche</Text>
                          <Text style={styles.msPayoffCardHint}>Highest APR first</Text>
                          <View style={styles.msPayoffMetricRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.msPayoffMetricLabel}>Current</Text>
                              <Text style={styles.msPayoffMetricValue}>{formatPayoffMonths(avalancheBase.monthsToPayoff)}</Text>
                              <Text style={styles.msPayoffMetricValue}>{formatCurrency(avalancheBase.totalInterestPaid)} int.</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.msPayoffMetricLabel}>+{formatCurrency(hullExtraAmount)}/mo</Text>
                              <Text style={styles.msPayoffMetricValue}>{formatPayoffMonths(avalancheWhatIf.monthsToPayoff)}</Text>
                              <Text style={styles.msPayoffMetricValue}>{formatCurrency(avalancheWhatIf.totalInterestPaid)} int.</Text>
                            </View>
                          </View>
                          <Text style={[styles.msPayoffSaved, { color: colors.success }]}>
                            {formatPlanSavings(avalancheBase, avalancheWhatIf)}
                          </Text>
                          <TouchableOpacity
                            style={[styles.msPayoffUseBtn, strategy === "avalanche" && { borderColor: colors.accent, backgroundColor: `${colors.accent}20` }]}
                            onPress={() => handleChangeStrategy("avalanche")}
                          >
                            <Text style={[styles.msPayoffUseBtnText, strategy === "avalanche" && { color: colors.accent }]}>
                              {strategy === "avalanche" ? "Current Method" : "Use Avalanche"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {/* Snowball */}
                        <View style={[styles.msPayoffCard, { borderColor: strategy === "snowball" ? colors.accent : colors.cardBorder }]}>
                          <Text style={styles.msPayoffCardTitle}>Snowball</Text>
                          <Text style={styles.msPayoffCardHint}>Smallest balance first</Text>
                          <View style={styles.msPayoffMetricRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.msPayoffMetricLabel}>Current</Text>
                              <Text style={styles.msPayoffMetricValue}>{formatPayoffMonths(snowballBase.monthsToPayoff)}</Text>
                              <Text style={styles.msPayoffMetricValue}>{formatCurrency(snowballBase.totalInterestPaid)} int.</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.msPayoffMetricLabel}>+{formatCurrency(hullExtraAmount)}/mo</Text>
                              <Text style={styles.msPayoffMetricValue}>{formatPayoffMonths(snowballWhatIf.monthsToPayoff)}</Text>
                              <Text style={styles.msPayoffMetricValue}>{formatCurrency(snowballWhatIf.totalInterestPaid)} int.</Text>
                            </View>
                          </View>
                          <Text style={[styles.msPayoffSaved, { color: colors.success }]}>
                            {formatPlanSavings(snowballBase, snowballWhatIf)}
                          </Text>
                          <TouchableOpacity
                            style={[styles.msPayoffUseBtn, strategy === "snowball" && { borderColor: colors.accent, backgroundColor: `${colors.accent}20` }]}
                            onPress={() => handleChangeStrategy("snowball")}
                          >
                            <Text style={[styles.msPayoffUseBtnText, strategy === "snowball" && { color: colors.accent }]}>
                              {strategy === "snowball" ? "Current Method" : "Use Snowball"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                    {(step.key === "keel" || step.key === "deck") && !step.isCompleted ? (
                      <View style={styles.msSavingsLogSection}>
                        <Text style={styles.msSavingsLogLabel}>Set Savings</Text>
                        <Text style={[styles.msPayoffMetricLabel, { marginBottom: 4 }]}>
                          Current: {formatCurrency(savingsReserve)}
                        </Text>
                        <View style={styles.msSavingsLogRow}>
                          <TextInput
                            style={styles.msSavingsLogInput}
                            placeholder={String(Math.round(savingsReserve))}
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                            value={savingsDraft}
                            onChangeText={setSavingsDraft}
                          />
                          <TouchableOpacity
                            style={[styles.msSavingsLogBtn, { backgroundColor: colors.accent }]}
                            onPress={() => {
                              const parsed = parseFloat(savingsDraft);
                              if (Number.isFinite(parsed) && parsed >= 0) {
                                handleSetSavingsReserve(parsed);
                              }
                            }}
                          >
                            <Text style={[styles.msSavingsLogBtnText, { color: colors.white }]}>Set</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.msTargetQuickRow}>
                          {[-100, -50, 50, 100].map((amount) => (
                            <TouchableOpacity
                              key={amount}
                              style={[styles.msTargetQuickBtn, { borderColor: colors.cardBorder }]}
                              onPress={() => handleSetSavingsReserve(Math.max(0, savingsReserve + amount))}
                            >
                              <Text style={styles.msTargetQuickText}>{amount > 0 ? "+" : ""}{formatCurrency(amount)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ) : null}
                    <Text style={styles.msNextAction}>{step.nextAction}</Text>
                    <View style={styles.msStepActionRow}>
                      {!isCurrent ? (
                        <TouchableOpacity
                          style={[styles.msStepActionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
                          onPress={() => toggleMilestoneExpanded(step.key)}
                        >
                          <Text style={styles.msStepActionText}>Collapse</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        style={[styles.msStepActionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
                        onPress={() => handleSetCurrentMilestone(step.key)}
                      >
                        <Text style={styles.msStepActionText}>{getMilestoneBuildActionLabel(step.key)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.msStepActionBtn,
                          {
                            borderColor: step.isCompleted ? colors.success : colors.accent,
                            backgroundColor: step.isCompleted ? `${colors.success}20` : `${colors.accent}20`,
                          },
                        ]}
                        onPress={() => handleToggleMilestoneComplete(step)}
                      >
                        <Text
                          style={[
                            styles.msStepActionText,
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
              {allMilestonesCompleted ? (
                <View style={[styles.msJourneyCompleteCard, { borderColor: colors.success, backgroundColor: `${colors.success}12` }]}>
                  <Text style={[styles.msJourneyCompleteTitle, { color: colors.success }]}>Ark Complete</Text>
                  <Text style={styles.msJourneyCompleteMessage}>
                    You have finished your Ark. Now set sail and find new lands.
                  </Text>
                </View>
              ) : null}
            </ScrollView>
            <TouchableOpacity
              style={styles.msFullDoneBtn}
              onPress={() => setShowMilestonesModal(false)}
            >
              <Text style={styles.msFullDoneText}>Done</Text>
            </TouchableOpacity>
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
      {coachmark}
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    listContent: { paddingHorizontal: tokens.pad },

    titleSection: { paddingTop: 56, paddingBottom: tokens.gap, alignItems: "center" as const },
    appLabel: { fontSize: scale(12), color: colors.textDim, letterSpacing: 2, marginBottom: 4, textAlign: "center" as const },
    screenTitle: { fontSize: scale(28), fontWeight: "700" as const, color: colors.text, marginBottom: 4, textAlign: "center" as const },
    screenSubtitle: { fontSize: scale(14), color: colors.textMuted, textAlign: "center" as const },

    summaryCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: tokens.radius + 4,
      padding: tokens.padLg,
      marginBottom: tokens.gapLg,
    },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLeft: { flex: 1 },
  summaryLabel: { fontSize: scale(11), color: colors.textDim, letterSpacing: 1, marginBottom: 4 },
  summaryAmount: { fontSize: scale(32), fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  paidText: { fontSize: scale(14), color: colors.success, fontWeight: "600", marginTop: 4 },
  summaryRingWrap: { alignItems: "center", justifyContent: "center" },
  summaryRingInner: { width: 80, height: 80, justifyContent: "center", alignItems: "center" },
  summaryRingLabel: { position: "absolute", fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  summaryRingHint: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  summaryRingHintText: { fontSize: scale(10), fontWeight: "700", letterSpacing: 0.2 },

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
   smartPlanChipRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
   },
   smartPlanChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
   },
   smartPlanChipLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 3,
   },
   smartPlanChipValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
   },
    milestonesCard: {
      marginTop: tokens.gapSm,
      borderWidth: 1,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.padSm,
      paddingVertical: 7,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    milestonesInlineText: {
      fontSize: 10,
      color: colors.textDim,
      fontWeight: "600",
      maxWidth: "95%",
    },
    milestonesSubText: {
      fontSize: 9,
      color: colors.textMuted,
      marginTop: 2,
    },
    milestoneArrow: {
      color: colors.textDim,
      fontSize: 18,
      fontWeight: "600",
    },
    milestoneArkLabel: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.3,
    },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.gap },
  sectionTitle: { fontSize: scale(16), fontWeight: "600", color: colors.text },
  sectionActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: tokens.radiusSm,
    paddingHorizontal: tokens.pad,
    paddingVertical: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { color: colors.accentButtonText, fontSize: 13, fontWeight: "600" },
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
    marginBottom: tokens.gapSm,
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
    marginBottom: tokens.gap,
  },
  strategyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  strategyLabel: {
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 1,
  },
  strategyPlannerBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.card,
  },
  strategyPlannerBtnText: {
    fontSize: 11,
    fontWeight: "700",
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
    color: colors.accentButtonText,
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

  /* ── Full-screen milestones modal ── */
  msFullOverlay: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  msFullBox: {
    flex: 1,
    paddingHorizontal: 20,
  },
  msFullTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  msFullMessage: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textDim,
    marginBottom: 20,
  },
  msFullList: {
    flex: 1,
  },
  msFullListContent: {
    gap: 14,
    paddingBottom: 12,
  },
  msFullDoneBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 8,
  },
  msFullDoneText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },

  /* ── Milestone step cards (full-screen) ── */
  msStepCard: {
    borderWidth: 1,
    borderRadius: tokens.radius - 2,
    padding: tokens.padSm,
    gap: tokens.gapSm,
    backgroundColor: colors.card,
  },
  msStepHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  msStepName: {
    color: colors.text,
    fontSize: scale(17),
    fontWeight: "700",
    flexShrink: 1,
  },
  msStepBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  msStepBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  msStepExpandIcon: {
    color: colors.textDim,
    fontSize: 22,
    fontWeight: "600",
  },
  msStepDescription: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textDim,
  },
  msStepMetric: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  msTargetEditorRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  msTargetInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "600",
  },
  msTargetSaveBtn: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  msTargetSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textDim,
  },
  msTargetQuickRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  msTargetQuickBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.bg,
  },
  msTargetQuickText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textDim,
  },
  msProgressTrack: {
    height: 10,
    backgroundColor: colors.cardBorder,
    borderRadius: 999,
    overflow: "hidden",
  },
  msProgressFill: {
    height: "100%",
    borderRadius: 999,
    minWidth: 2,
  },
  msNextAction: {
    fontSize: 13,
    color: colors.textMuted,
  },
  msSavingsLogSection: {
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  msSavingsLogLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  msSavingsLogRow: {
    flexDirection: "row" as const,
    gap: 10,
    alignItems: "center" as const,
  },
  msSavingsLogInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  msSavingsLogBtn: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  msSavingsLogBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  msStepActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  msStepActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  msStepActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textDim,
  },
  msJourneyCompleteCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  msJourneyCompleteTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  msJourneyCompleteMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },

  /* ── Hull payoff comparison (inside milestone modal) ── */
  msPayoffSection: {
    marginTop: 6,
    gap: 8,
  },
  msPayoffTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 2,
  },
  msPayoffLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
    color: colors.textDim,
  },
  msPayoffInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  msPayoffChips: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  msPayoffChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.bg,
  },
  msPayoffChipText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.textDim,
  },
  msPayoffRecBox: {
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  msPayoffRecText: {
    fontSize: 12,
    color: colors.textDim,
    lineHeight: 18,
  },
  msPayoffCard: {
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.card,
    padding: 12,
    gap: 6,
  },
  msPayoffCardTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
  },
  msPayoffCardHint: {
    fontSize: 12,
    color: colors.textDim,
  },
  msPayoffMetricRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  msPayoffMetricLabel: {
    fontSize: 11,
    color: colors.textDim,
    marginBottom: 2,
  },
  msPayoffMetricValue: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.text,
    fontVariant: ["tabular-nums"] as const,
  },
  msPayoffSaved: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  msPayoffUseBtn: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center" as const,
    backgroundColor: colors.bg,
  },
  msPayoffUseBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.textDim,
  },

  emptyWrap: { alignItems: "center", paddingVertical: 48 },
  emptyEmoji: { fontSize: scale(40), marginBottom: 12 },
  emptyTitle: { fontSize: scale(16), fontWeight: "600", color: colors.text, marginBottom: 4 },
  emptySub: { fontSize: scale(13), color: colors.textMuted, textAlign: "center" },
  emptyActionBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: "600",
  },

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
    borderRadius: tokens.radius + 4,
    padding: tokens.padLg,
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

  /* FAB */
  fab: {
    position: "absolute",
    // `bottom` is applied inline at the call site from the live safe-area
    // inset (fabBottomOffset) so the FAB always clears the tab bar.
    right: FAB_RIGHT,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: tokens.radius,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: scale(26),
    fontWeight: "300",
    color: colors.accentButtonText || colors.bg,
    lineHeight: 28,
  },
});
};

export default DebtTrackerScreen;
