/**
 * BudgetArk - Charts Screen
 * File: src/screens/ChartsScreen.tsx
 *
 * Learning hub + financial-tools surface. Renders the Captain's Course
 * (chapter list w/ progress), the Topics browse strip, and the existing
 * calculators grouped under a TOOLS section.
 *
 * Route key stays `Utilities` for backward compatibility with sync state
 * and saved navigation params; only the display label, icon, and screen
 * composition changed.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useFocusEffect , useNavigation } from "@react-navigation/native";
import Svg, { Defs, LinearGradient, Stop, Path, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_BASE_HEIGHT } from "../navigation/tabBarLayout";
import { describeError } from "../utils/errorMessage";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useTabCoachmark } from "../onboarding/useTabCoachmark";
import { useCoachmarkAnchor } from "../onboarding/CoachmarkAnchorContext";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  calcInvestmentTimeline,
} from "../utils/calculations";
import {
  calcAutoFillYearsRemaining,
  calcAvgMonthlyExpenses,
  calcBalanceWeightedRate,
  calcEmergencyFundPlan,
  calcRefiComparison,
  calcRuleOf72Years,
  resolveEmergencyFundExpenses,
  sumRefinanceBalance,
} from "../utils/chartCalculators";
import {
  buildCategorySpendOptions,
} from "../utils/whatIfSpending";
import type { CategorySpendOption } from "../utils/whatIfSpending";
import { useCurrency } from "../currency/CurrencyProvider";
import { getBudgetEntries } from "../storage/budgetStorage";
import { getSavingsGoals } from "../storage/savingsGoalStorage";
import { getAssetAccounts } from "../storage/assetAccountStorage";
import { resolveEmergencyFundAmount } from "../utils/emergencyFund";
import { getDebts } from "../storage/debtStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import { calcMonthlyCashFlow } from "../utils/purchasePlanner";
import type { MonthlyCashFlow } from "../utils/purchasePlanner";
import PurchasePlannerCard from "../components/PurchasePlannerCard";
import LoanCalculatorCard from "../components/LoanCalculatorCard";
import CurrencyExchangeCard from "../components/CurrencyExchangeCard";
import WhatIfSpendingCard from "../components/WhatIfSpendingCard";
import { useCustomCategories } from "../categories/CustomCategoriesProvider";
import TaxCalculatorCard from "../components/TaxCalculatorCard";
import type {
  AssetAccount,
  ChapterId,
  Debt,
  DebtMilestonePlan,
  LearningProgress,
  LessonStub,
  LessonTopic,
  RootTabParamList,
  SavingsGoal,
} from "../types";
import { LESSON_TOPICS } from "../types";
import SliderRow from "../components/SliderRow";
import { useToolStyles } from "../theme/toolStyles";
import { CHAPTERS } from "../data/lessonChapters";
import { LEARNING_DISCLAIMER } from "../data/learningDisclaimer";
import {
  getChapterProgress,
  getOverallProgress,
  getTopicChapterProgress,
  hasLessonBody,
  pickResumeLesson,
} from "../data/lessonIndex";
import { getLearningProgress } from "../storage/learningProgressStorage";
import LessonScreen from "../lessons/LessonScreen";

import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useValueChanged } from "../hooks/useValueChanged";
import { useAndroidKeyboardInputScroll } from "../hooks/useAndroidKeyboardInputScroll";
import { useSliderValueEditor } from "../hooks/useSliderValueEditor";

/* Enable LayoutAnimation on Android */
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ── Topic display metadata ──
 * Glyph + human-readable label per lesson topic, used in the Topics chip
 * row. Kept in this file so the topic taxonomy in `types/index.ts` stays
 * pure data (no UI strings leaking down into the type layer).
 */
const TOPIC_GLYPHS: Record<LessonTopic, string> = {
  budgeting: "💰",
  debt: "🔨",
  saving: "🍞",
  investing: "📈",
  taxes: "🧾",
  insurance: "🛡️",
  real_estate: "🏠",
  retirement: "⏳",
  mindset: "🧠",
};

const TOPIC_LABELS: Record<LessonTopic, string> = {
  budgeting: "Budgeting",
  debt: "Debt",
  saving: "Saving",
  investing: "Investing",
  taxes: "Taxes",
  insurance: "Insurance",
  real_estate: "Real Estate",
  retirement: "Retirement",
  mindset: "Mindset",
};

/* ── Slider Config ── */

type SliderConfig = {
  label: string;
  min: number;
  max: number;
  step: number;
};

const SLIDERS: Record<"contribution" | "returnRate" | "years", SliderConfig> = {
  contribution: { label: "Monthly Contribution", min: 50, max: 50000, step: 50 },
  returnRate: { label: "Annual Return", min: 1, max: 30, step: 0.5 },
  years: { label: "Time Horizon", min: 1, max: 50, step: 1 },
};

const YEAR_PRESETS = [10, 20, 30] as const;

/* ── Refinance Break-Even Config ── */

type RefiKey =
  | "refiCurrentTerm"
  | "refiNewRate"
  | "refiNewTerm"
  | "refiClosingCosts";

const REFI_SLIDERS: Record<RefiKey, SliderConfig> = {
  refiCurrentTerm: { label: "Years Remaining", min: 1, max: 30, step: 1 },
  refiNewRate: { label: "New Rate (APR)", min: 0.5, max: 30, step: 0.125 },
  refiNewTerm: { label: "New Term (years)", min: 1, max: 30, step: 1 },
  refiClosingCosts: { label: "Closing Costs", min: 0, max: 30_000, step: 100 },
};

/* ── Return Rate Presets ── */

const RATE_PRESETS = [
  { label: "Savings", rate: 2, hint: "High-yield savings account" },
  { label: "Bonds", rate: 4, hint: "US Treasury / bond funds" },
  { label: "S&P 500", rate: 7, hint: "Historical avg, inflation-adjusted" },
  { label: "Aggressive", rate: 10, hint: "S&P 500 nominal (before inflation)" },
] as const;

/* ── Mini Area Chart ── */

interface AreaChartProps {
  data: { year: number; total: number; contributed: number }[];
  accentColor: string;
  successColor: string;
  textDim: string;
  textMuted: string;
  formatCompactCurrency: (amount: number) => string;
}

const AreaChart: React.FC<AreaChartProps> = React.memo(
  ({ data, accentColor, successColor, textDim, textMuted, formatCompactCurrency }) => {
    const W = 340;
    const H = 180;
    const padL = 50;
    const padR = 10;
    const padT = 10;
    const padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    if (data.length < 2) {
      return (
        <View style={{ width: W, height: H, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: textMuted, fontSize: 13 }}>
            Adjust the sliders to see a projection chart.
          </Text>
        </View>
      );
    }

    const maxVal = Math.max(...data.map((d) => d.total), 1);
    const maxYears = data[data.length - 1].year;

    const toX = (year: number) => padL + (year / maxYears) * chartW;
    const toY = (val: number) => padT + chartH - (val / maxVal) * chartH;

    const totalPath =
      data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(d.year)},${toY(d.total)}`).join(" ");
    const totalAreaPath = `${totalPath} L${toX(maxYears)},${toY(0)} L${toX(0)},${toY(0)} Z`;

    const contribPath =
      data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(d.year)},${toY(d.contributed)}`).join(" ");
    const contribAreaPath = `${contribPath} L${toX(maxYears)},${toY(0)} L${toX(0)},${toY(0)} Z`;

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));
    const xStep = maxYears <= 10 ? 2 : maxYears <= 20 ? 5 : 10;
    const xTicks: number[] = [];
    for (let x = 0; x <= maxYears; x += xStep) xTicks.push(x);
    if (xTicks[xTicks.length - 1] !== maxYears) xTicks.push(maxYears);

    return (
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accentColor} stopOpacity={0.35} />
            <Stop offset="1" stopColor={accentColor} stopOpacity={0.05} />
          </LinearGradient>
          <LinearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={successColor} stopOpacity={0.3} />
            <Stop offset="1" stopColor={successColor} stopOpacity={0.05} />
          </LinearGradient>
        </Defs>

        {yTicks.map((tick) => (
          <React.Fragment key={`y-${tick}`}>
            <Path
              d={`M${padL},${toY(tick)} L${W - padR},${toY(tick)}`}
              stroke={textMuted}
              strokeWidth={0.5}
              opacity={0.3}
            />
          </React.Fragment>
        ))}

        <Path d={totalAreaPath} fill="url(#totalGrad)" />
        <Path d={contribAreaPath} fill="url(#contribGrad)" />

        <Path d={totalPath} stroke={accentColor} strokeWidth={2} fill="none" />
        <Path d={contribPath} stroke={successColor} strokeWidth={1.5} fill="none" strokeDasharray="4,3" />

        {yTicks.map((tick) => (
          <SvgText
            key={`yl-${tick}`}
            x={padL - 6}
            y={toY(tick) + 3}
            fill={textDim}
            fontSize={9}
            textAnchor="end"
          >
            {formatCompactCurrency(tick)}
          </SvgText>
        ))}

        {xTicks.map((tick) => (
          <SvgText
            key={`xl-${tick}`}
            x={toX(tick)}
            y={H - 4}
            fill={textDim}
            fontSize={9}
            textAnchor="middle"
          >
            {tick}yr
          </SvgText>
        ))}
      </Svg>
    );
  }
);
AreaChart.displayName = "AreaChart";

/* ── Main Screen ── */

const ChartsScreen: React.FC = () => {
  const { colors, showAmbientBackground } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const coachmark = useTabCoachmark("Utilities");
  const scrollRef = useRef<ScrollView>(null);
  const anchorUtilitiesTool = useCoachmarkAnchor("utilities-tool-header", { scrollRef });
  // Keeps the tool inputs (slider editors, EF, converter, embedded cards)
  // visible above the keyboard on Android; iOS uses the ScrollView's
  // automaticallyAdjustKeyboardInsets. See the hook's header for the split.
  const onKeyboardInputScroll = useAndroidKeyboardInputScroll(scrollRef);
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const tool = useToolStyles();

  /* Compound interest calculator state */
  const [calcOpen, setCalcOpen] = useState(false);
  const [contribution, setContribution] = useState(500);
  const [returnRate, setReturnRate] = useState(7);
  const [years, setYears] = useState(20);
  const [showWhyCard, setShowWhyCard] = useState(false);
  const calcEditor = useSliderValueEditor({
    contribution: { ...SLIDERS.contribution, set: setContribution, commitMode: "raw-min" },
    returnRate: {
      ...SLIDERS.returnRate,
      set: setReturnRate,
      decimal: true,
      commitMode: "snap-step-2dp",
    },
    years: { ...SLIDERS.years, set: setYears, commitMode: "round-int" },
  });


  /* Refinance break-even calculator state */
  const [refiOpen, setRefiOpen] = useState(false);
  const [refiCurrentTerm, setRefiCurrentTerm] = useState(28);
  const [refiNewRate, setRefiNewRate] = useState(5.5);
  const [refiNewTerm, setRefiNewTerm] = useState(30);
  const [refiClosingCosts, setRefiClosingCosts] = useState(4000);
  const refiEditor = useSliderValueEditor<RefiKey>({
    refiCurrentTerm: {
      ...REFI_SLIDERS.refiCurrentTerm,
      set: setRefiCurrentTerm,
      commitMode: "clamp-snap-3dp",
      adjustDecimals: 3,
    },
    refiNewRate: {
      ...REFI_SLIDERS.refiNewRate,
      set: setRefiNewRate,
      decimal: true,
      commitMode: "clamp-snap-3dp",
      adjustDecimals: 3,
    },
    refiNewTerm: {
      ...REFI_SLIDERS.refiNewTerm,
      set: setRefiNewTerm,
      commitMode: "clamp-snap-3dp",
      adjustDecimals: 3,
    },
    refiClosingCosts: {
      ...REFI_SLIDERS.refiClosingCosts,
      set: setRefiClosingCosts,
      commitMode: "clamp-snap-3dp",
      adjustDecimals: 3,
    },
  });
  const [refiDebts, setRefiDebts] = useState<Debt[]>([]);
  const [refiSelectedDebtIds, setRefiSelectedDebtIds] = useState<Set<string>>(
    () => new Set()
  );

  /* Emergency fund calculator state */
  const [efOpen, setEfOpen] = useState(false);
  const [avgExpenses, setAvgExpenses] = useState(0);
  const [efExpenseOverride, setEfExpenseOverride] = useState("");
  const [efMonthlySavings, setEfMonthlySavings] = useState(500);
  const [currentEfAmount, setCurrentEfAmount] = useState(0);
  // Kept only to re-resolve the EF amount when purchase-plan mutations hand
  // back a fresh goals array (EF-designated accounts win over the goal).
  const [efAccounts, setEfAccounts] = useState<AssetAccount[]>([]);
  const [efDataLoaded, setEfDataLoaded] = useState(false);
  /** Focus-time tools load failed (storage error) - shown in the EF card. */
  const [toolsLoadError, setToolsLoadError] = useState<string | null>(null);



  /* "What If I Stopped Spending on X" - the card owns its UI; the category
   * averages come from the focus-time loader below so the storage read
   * happens once alongside the other tools. */
  const [whatIfOptions, setWhatIfOptions] = useState<CategorySpendOption[]>([]);
  const { customCategories } = useCustomCategories();

  /* "Plan a Purchase" state (the card owns its UI; this is the shared data
   * loaded alongside the other tools so the storage reads happen once) */
  const [purchaseCashFlow, setPurchaseCashFlow] = useState<MonthlyCashFlow>({
    avgIncome: 0,
    avgExpenses: 0,
    freeCashFlow: 0,
    monthsTracked: 0,
  });
  const [savingsGoalsAll, setSavingsGoalsAll] = useState<SavingsGoal[]>([]);
  const [milestonePlan, setMilestonePlan] = useState<DebtMilestonePlan | null>(null);

  /* Learning progress (Captain's Course card). Refreshes on focus so
   * completion progress and the Resume pointer update after a user finishes
   * a lesson and returns to the Charts tab. Also refreshed on lesson-modal
   * close since the modal sits on top of this screen (no focus event fires). */
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [openLessonStub, setOpenLessonStub] = useState<LessonStub | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<ChapterId>>(
    () => new Set()
  );
  /* Topics chip filter. Non-null = the Captain's Course list shows only
   * chapters/lessons tagged with this topic. */
  const [topicFilter, setTopicFilter] = useState<LessonTopic | null>(null);
  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const refreshLearningProgress = useCallback(async () => {
    try {
      const progress = await getLearningProgress();
      setLearningProgress(progress);
    } catch (err) {
      if (__DEV__) console.warn("[Charts] load learning progress", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const progress = await getLearningProgress();
          if (!cancelled) setLearningProgress(progress);
        } catch (err) {
          if (__DEV__) console.warn("[Charts] load learning progress", err);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleOpenLesson = useCallback((stub: LessonStub) => {
    setOpenLessonStub(stub);
  }, []);

  const handleCloseLesson = useCallback(() => {
    setOpenLessonStub(null);
    /* Re-read so completed counts + Resume pointer reflect what happened
     * inside the modal. */
    void refreshLearningProgress();
  }, [refreshLearningProgress]);

  const handleToggleChapter = useCallback((chapterId: ChapterId) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  }, []);

  /* Tapping a Topics chip toggles the course filter. Selecting a topic also
   * expands every matching chapter so the filtered lessons are immediately
   * visible without a second tap; chapter rows still collapse/expand
   * normally while the filter is active. */
  const handleToggleTopic = useCallback(
    (topic: LessonTopic) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const next = topicFilter === topic ? null : topic;
      setTopicFilter(next);
      if (next) {
        setExpandedChapters(
          new Set(
            CHAPTERS.filter((chapter) =>
              chapter.lessons.some((stub) => stub.topics.includes(next))
            ).map((chapter) => chapter.id)
          )
        );
      }
    },
    [topicFilter]
  );

  const handleClearTopicFilter = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTopicFilter(null);
  }, []);

  /**
   * Resolves a lesson action / tool route to a navigation effect. Routes
   * starting with "charts/tools" close the modal and stay on this tab;
   * the user can scroll to the matching calculator. Inter-tab routes
   * (debts/.., budget/.., bridge/..) jump to the target tab. Unknown
   * routes are inert (with a __DEV__ warning) so missing wiring never
   * crashes a lesson.
   */
  const handleLessonRoute = useCallback(
    (route: string) => {
      setOpenLessonStub(null);
      const [head] = route.split("/");
      switch (head) {
        case "debts":
          navigation.navigate("DebtTracker");
          return;
        case "budget":
          navigation.navigate("Budget");
          return;
        case "bridge":
          navigation.navigate("Bridge");
          return;
        case "profile":
          navigation.navigate("Profile");
          return;
        case "charts":
          /* Already on this tab. Future work: scroll the Charts content to
           * the matching calculator card. */
          return;
        default:
          if (__DEV__) console.warn("[Charts] unknown lesson route", route);
      }
    },
    [navigation]
  );

  // Memoized so the `?? {}` fallback doesn't mint a fresh object every
  // render and defeat the downstream progress memos.
  const completedLessonsMap = useMemo(
    () => learningProgress?.completedLessons ?? {},
    [learningProgress?.completedLessons]
  );
  const overallProgress = useMemo(
    () => getOverallProgress(completedLessonsMap),
    [completedLessonsMap]
  );
  const chapterProgressRows = useMemo(
    () => getChapterProgress(completedLessonsMap),
    [completedLessonsMap]
  );
  const visibleChapterRows = useMemo(
    () =>
      topicFilter
        ? getTopicChapterProgress(completedLessonsMap, topicFilter)
        : chapterProgressRows,
    [topicFilter, completedLessonsMap, chapterProgressRows]
  );
  const resumeStub = useMemo(
    () =>
      pickResumeLesson(completedLessonsMap, learningProgress?.currentLessonId),
    [completedLessonsMap, learningProgress?.currentLessonId]
  );
  const resumeChapter = resumeStub
    ? CHAPTERS.find((c) => c.id === resumeStub.chapterId)
    : undefined;
  const overallPct =
    overallProgress.total > 0
      ? Math.round((overallProgress.completed / overallProgress.total) * 100)
      : 0;

  const timeline = useMemo(
    () => calcInvestmentTimeline(contribution, returnRate, years),
    [contribution, returnRate, years]
  );

  const finalData = timeline[timeline.length - 1];
  const totalValue = finalData?.total ?? 0;
  const totalContributed = finalData?.contributed ?? 0;
  const totalInterest = finalData?.interest ?? 0;

  /* Rule of 72 */
  const doublingYears = calcRuleOf72Years(returnRate);

  const toggleCalc = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCalcOpen((prev) => !prev);
  }, []);

  const toggleWhyCard = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowWhyCard((prev) => !prev);
  }, []);

  /* ── Refinance break-even logic ── */

  const toggleRefi = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRefiOpen((prev) => !prev);
  }, []);

  const toggleRefiDebt = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRefiSelectedDebtIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* Derived current-loan numbers from the selected debts */
  const selectedRefiDebts = useMemo(
    () => refiDebts.filter((d) => refiSelectedDebtIds.has(d.id)),
    [refiDebts, refiSelectedDebtIds]
  );

  const refiBalance = useMemo(
    () => sumRefinanceBalance(selectedRefiDebts),
    [selectedRefiDebts]
  );

  const refiCurrentRate = useMemo(
    () => calcBalanceWeightedRate(selectedRefiDebts, refiBalance),
    [selectedRefiDebts, refiBalance]
  );

  // Auto-fill years remaining when every selected debt has a goal date
  // (weighted by balance). Leaves the user's manual value alone otherwise.
  // Render-time adjustment (see useValueChanged): it fires only when the
  // selection/balance actually changes, so a manual edit to the term is
  // never fought on unrelated re-renders. fireOnMount matches the deleted
  // effect, which also auto-filled on first mount.
  const refiDebtsChanged = useValueChanged(selectedRefiDebts, true);
  const refiBalanceChanged = useValueChanged(refiBalance, true);
  if (refiDebtsChanged || refiBalanceChanged) {
    const autoFillYears = calcAutoFillYearsRemaining(selectedRefiDebts, refiBalance);
    if (autoFillYears !== null) setRefiCurrentTerm(autoFillYears);
  }

  /* Refi math */
  const hasRefiSelection = selectedRefiDebts.length > 0 && refiBalance > 0;

  const {
    currentMonthlyPayment: refiCurrentMonthlyPayment,
    newMonthlyPayment: refiNewMonthlyPayment,
    currentTotalInterest: refiCurrentTotalInterest,
    newTotalInterest: refiNewTotalInterest,
    monthlyDelta: refiMonthlyDelta,
    interestDelta: refiInterestDelta,
    breakEvenMonths: refiBreakEvenMonths,
    netSavingsOverNewTerm: refiNetSavingsOverNewTerm,
    extendsTerm: refiExtendsTerm,
  } = useMemo(
    () =>
      calcRefiComparison({
        balance: refiBalance,
        currentRate: refiCurrentRate,
        currentTermYears: refiCurrentTerm,
        newRate: refiNewRate,
        newTermYears: refiNewTerm,
        closingCosts: refiClosingCosts,
      }),
    [
      refiBalance,
      refiCurrentRate,
      refiCurrentTerm,
      refiNewRate,
      refiNewTerm,
      refiClosingCosts,
    ]
  );
  const refiAllSelectedHaveGoalDate =
    selectedRefiDebts.length > 0 &&
    selectedRefiDebts.every((d) => Boolean(d.goalDate));

  /* ── Emergency fund logic ── */

  const toggleEf = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEfOpen((prev) => !prev);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadEfData = async () => {
        try {
          const [entries, goals, debts, storedMilestones, accounts] =
            await Promise.all([
              getBudgetEntries(),
              getSavingsGoals(),
              getDebts(),
              getDebtMilestonePlan(),
              getAssetAccounts(),
            ]);
          if (cancelled) return;
          setToolsLoadError(null);

          const avg = calcAvgMonthlyExpenses(entries);
          setAvgExpenses(avg);

          // EF-designated savings accounts (Bridge account editor) take
          // precedence over the goal's stored amount - same resolution as the
          // Bridge/Budget cards.
          setEfAccounts(accounts);
          setCurrentEfAmount(resolveEmergencyFundAmount(goals, accounts));
          setEfDataLoaded(true);

          setRefiDebts(debts);
          setWhatIfOptions(buildCategorySpendOptions(entries));
          setPurchaseCashFlow(calcMonthlyCashFlow(entries));
          setSavingsGoalsAll(goals);
          setMilestonePlan(storedMilestones);
        } catch (error) {
          if (cancelled) return;
          if (__DEV__) console.error("Failed to load Charts tool data:", error);
          setToolsLoadError(
            describeError(error, "Couldn't load your data. Reopen this tab to try again."),
          );
        }
      };
      loadEfData();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const efMonthlyExpenses = resolveEmergencyFundExpenses(
    efExpenseOverride,
    avgExpenses
  );
  const {
    threeMonthTarget: efThreeMonth,
    sixMonthTarget: efSixMonth,
    threeMonthProgress: efThreeProgress,
    sixMonthProgress: efSixProgress,
    monthsToThree: efMonthsToThree,
    monthsToSix: efMonthsToSix,
  } = calcEmergencyFundPlan(efMonthlyExpenses, currentEfAmount, efMonthlySavings);

  /* ── Plan a Purchase logic ── */

  // The purchase card mutates savings goals (create/contribute/delete);
  // mirror the fresh array into every local consumer so the EF calculator
  // never shows a stale balance next to the plan list.
  const handlePurchaseGoalsChanged = useCallback(
    (goals: SavingsGoal[]) => {
      setSavingsGoalsAll(goals);
      setCurrentEfAmount(resolveEmergencyFundAmount(goals, efAccounts));
    },
    [efAccounts]
  );

  const renderRefiSlider = (key: RefiKey, value: number) => {
    const cfg = REFI_SLIDERS[key];
    const isCurrency = key === "refiClosingCosts";
    const isRate = key === "refiNewRate";
    const displayValue = isCurrency
      ? formatCurrency(value)
      : isRate
        ? `${value}%`
        : `${value} yr`;

    return (
      <SliderRow
        key={key}
        label={cfg.label}
        value={value}
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        displayValue={displayValue}
        onValueChange={(val) => refiEditor.setValue(key, val)}
        onAdjust={(delta) => refiEditor.adjustBy(key, delta)}
        editor={{
          active: refiEditor.editingKey === key,
          text: refiEditor.editingText,
          decimal: isRate,
          onBegin: () => refiEditor.beginEditing(key, value),
          onChangeText: (text) => refiEditor.changeEditingText(key, text),
          onCommit: () => refiEditor.commitEditing(key),
        }}
      />
    );
  };

  const renderSlider = (key: "contribution" | "returnRate" | "years", value: number) => {
    const cfg = SLIDERS[key];
    const displayValue =
      key === "contribution"
        ? formatCurrency(value)
        : key === "returnRate"
          ? `${value}%`
          : `${value} yr`;

    return (
      <SliderRow
        key={key}
        label={cfg.label}
        value={value}
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        displayValue={displayValue}
        onValueChange={(val) => calcEditor.setValue(key, val)}
        onAdjust={(delta) => calcEditor.adjustBy(key, delta)}
        editor={{
          active: calcEditor.editingKey === key,
          text: calcEditor.editingText,
          decimal: key === "returnRate",
          onBegin: () => calcEditor.beginEditing(key, value),
          onChangeText: (text) => calcEditor.changeEditingText(key, text),
          onCommit: () => calcEditor.commitEditing(key),
        }}
      >
        {/* Return rate presets - shown only for the returnRate slider */}
        {key === "returnRate" && (
          <View style={styles.ratePresetRow}>
            {RATE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.ratePresetBtn,
                  returnRate === preset.rate && styles.ratePresetBtnActive,
                ]}
                onPress={() => setReturnRate(preset.rate)}
              >
                <Text
                  style={[
                    styles.ratePresetLabel,
                    returnRate === preset.rate && styles.ratePresetLabelActive,
                  ]}
                >
                  {preset.label}
                </Text>
                <Text
                  style={[
                    styles.ratePresetRate,
                    returnRate === preset.rate && styles.ratePresetRateActive,
                  ]}
                >
                  {preset.rate}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </SliderRow>
    );
  };

  return (
    <View
      style={[
        styles.screen,
        showAmbientBackground && { backgroundColor: "transparent" },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "padding" : undefined}
        style={styles.keyboardAvoider}
      >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        onScroll={onKeyboardInputScroll}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={styles.titleSection}>
          <Text style={styles.appLabel}>BudgetArk</Text>
          <Text style={styles.screenTitle}>Charts</Text>
          <Text style={styles.screenSubtitle}>
            Learn the seas. Plot your course.
          </Text>
        </View>

        {/* ── Captain's Course ──
         * Chapter rows expand to lesson lists, Resume strip + lesson taps
         * open LessonScreen, and the Topics chips below filter this list.
         */}
        <View style={styles.courseCard}>
          <View style={styles.courseHeaderRow}>
            <Text style={styles.courseEyebrow}>⭐ CAPTAIN'S COURSE</Text>
            <Text style={styles.courseProgressLabel}>
              {overallProgress.completed} / {overallProgress.total}
            </Text>
          </View>
          <View style={styles.courseProgressTrack}>
            <View
              style={[
                styles.courseProgressFill,
                { width: `${overallPct}%` },
              ]}
            />
          </View>
          <Text style={styles.courseDisclaimer}>{LEARNING_DISCLAIMER}</Text>

          {resumeStub && resumeChapter && (
            <TouchableOpacity
              style={styles.resumeStrip}
              onPress={() => handleOpenLesson(resumeStub)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.resumeLabel}>
                  {overallProgress.completed === 0 ? "START HERE" : "RESUME"}
                </Text>
                <Text style={styles.resumeTitle} numberOfLines={2}>
                  {resumeChapter.number}.{resumeStub.number} {resumeStub.title}
                </Text>
                <Text style={styles.resumeSub}>
                  Ch {resumeChapter.number} · {resumeChapter.title}
                  {resumeStub.readMin ? ` · ${resumeStub.readMin} min` : ""}
                </Text>
              </View>
              <Text style={styles.resumeChevron}>›</Text>
            </TouchableOpacity>
          )}

          {topicFilter && (
            <TouchableOpacity
              style={styles.topicFilterStrip}
              onPress={handleClearTopicFilter}
              activeOpacity={0.7}
            >
              <Text style={styles.topicFilterStripText} numberOfLines={1}>
                {TOPIC_GLYPHS[topicFilter]} {TOPIC_LABELS[topicFilter]} lessons
                only
              </Text>
              <Text style={styles.topicFilterStripClear}>Show all ✕</Text>
            </TouchableOpacity>
          )}

          <View style={styles.chapterList}>
            {visibleChapterRows.map(({ chapter, completed, total }) => {
              const isComingSoon = chapter.status === "coming-soon";
              const isExpanded = expandedChapters.has(chapter.id);
              return (
                <View key={chapter.id}>
                  <TouchableOpacity
                    style={styles.chapterRow}
                    onPress={() => handleToggleChapter(chapter.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chapterGlyph}>{chapter.glyph}</Text>
                    <View style={styles.chapterBody}>
                      <Text style={styles.chapterTitle}>
                        Ch {chapter.number} · {chapter.title}
                      </Text>
                      <Text style={styles.chapterSubtitle}>{chapter.subtitle}</Text>
                    </View>
                    {isComingSoon ? (
                      <Text style={styles.chapterComingSoon}>Coming soon</Text>
                    ) : (
                      <Text style={styles.chapterCount}>
                        {completed}/{total}
                      </Text>
                    )}
                    <Text style={styles.chapterChevron}>
                      {isExpanded ? "▾" : "›"}
                    </Text>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.lessonList}>
                      {chapter.lessons.map((stub) => {
                        const stubHasBody = hasLessonBody(stub.id);
                        const lessonCompleted = !!completedLessonsMap[stub.id];
                        return (
                          <TouchableOpacity
                            key={stub.id}
                            style={styles.lessonRow}
                            onPress={() => handleOpenLesson(stub)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.lessonNumber}>
                              {chapter.number}.{stub.number}
                            </Text>
                            <View style={styles.lessonBody}>
                              <Text
                                style={[
                                  styles.lessonTitle,
                                  !stubHasBody && styles.lessonTitleDim,
                                ]}
                                numberOfLines={2}
                              >
                                {stub.title}
                              </Text>
                              <Text style={styles.lessonMeta}>
                                {stub.readMin
                                  ? `${stub.readMin} min`
                                  : "Coming soon"}
                              </Text>
                            </View>
                            {lessonCompleted ? (
                              <Text style={styles.lessonCompletedDot}>✓</Text>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Topics ──
         * Horizontal-scrolling chip row. Tapping a chip filters the
         * Captain's Course list above to lessons tagged with that topic;
         * tapping the active chip (or the "Show all" strip) clears it.
         */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>TOPICS</Text>
          <Text style={styles.sectionHeaderHint}>
            Tap to filter the course by subject
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicChipRow}
        >
          {LESSON_TOPICS.map((topic) => {
            const isActive = topicFilter === topic;
            return (
              <TouchableOpacity
                key={topic}
                style={[styles.topicChip, isActive && styles.topicChipActive]}
                onPress={() => handleToggleTopic(topic)}
                activeOpacity={0.7}
              >
                <Text style={styles.topicChipGlyph}>{TOPIC_GLYPHS[topic]}</Text>
                <Text
                  style={[
                    styles.topicChipLabel,
                    isActive && styles.topicChipLabelActive,
                  ]}
                >
                  {TOPIC_LABELS[topic]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Tools ── existing calculators */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>TOOLS</Text>
          <Text style={styles.sectionHeaderHint}>Calculators & utilities</Text>
        </View>

        {/* ── Compound Interest Calculator Tool ── */}
        <TouchableOpacity ref={anchorUtilitiesTool} style={tool.toolHeader} onPress={toggleCalc} activeOpacity={0.7}>
          <View>
            <Text style={tool.toolTitle}>Compound Interest Calculator</Text>
            <Text style={tool.toolHint}>Project your investment growth over time</Text>
          </View>
          <Text style={tool.toolChevron}>{calcOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {calcOpen && (
          <View style={tool.toolBody}>
            {/* Result Card */}
            <View style={tool.resultCard}>
              <Text style={tool.resultLabel}>PROJECTED VALUE</Text>
              <Text style={tool.resultValue}>{formatCurrency(totalValue)}</Text>
              <Text style={tool.resultSub}>
                in today's dollars · after {years} years at {returnRate}%
              </Text>
            </View>

            {/* Rule of 72 insight */}
            {returnRate > 0 && (
              <View style={tool.insightCard}>
                <Text style={tool.insightText}>
                  At {returnRate}%, your money doubles roughly every ~{doublingYears} years (Rule of 72)
                </Text>
              </View>
            )}

            {/* "Why 7%?" educational card */}
            <TouchableOpacity
              style={styles.whyCardToggle}
              onPress={toggleWhyCard}
              activeOpacity={0.7}
            >
              <Text style={[styles.whyCardToggleText, { color: colors.accent }]}>
                {showWhyCard ? "Hide: Why 7%?" : "Why 7%?"}
              </Text>
            </TouchableOpacity>

            {showWhyCard && (
              <View style={styles.whyCard}>
                <Text style={styles.whyCardTitle}>S&P 500 and Inflation</Text>
                <Text style={styles.whyCardBody}>
                  The S&P 500 is an index of the 500 largest US companies. It has returned an average of ~10% per year since 1926.
                </Text>
                <Text style={styles.whyCardBody}>
                  However, inflation (the rising cost of goods) historically averages ~3% per year. That means $100 today buys less in the future.
                </Text>
                <Text style={styles.whyCardBody}>
                  When we subtract inflation (10% - 3%), the real return is about 7%. This calculator uses inflation-adjusted returns by default, so the projected value represents what your money can actually buy in today's dollars.
                </Text>
                <View style={styles.whyCardDivider} />
                <Text style={styles.whyCardFooter}>
                  Past performance does not guarantee future results. Actual returns vary year to year.
                </Text>
              </View>
            )}

            {/* Sliders */}
            <View style={tool.slidersCard}>
              {renderSlider("contribution", contribution)}
              {renderSlider("returnRate", returnRate)}
              {renderSlider("years", years)}

              {/* Timeline Presets */}
              <View style={tool.presetRow}>
                {YEAR_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[tool.presetBtn, years === preset && tool.presetBtnActive]}
                    onPress={() => setYears(preset)}
                  >
                    <Text style={[tool.presetBtnText, years === preset && tool.presetBtnTextActive]}>
                      {preset}yr
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Growth Over Time</Text>
              <View style={styles.chartWrap}>
                <AreaChart
                  data={timeline}
                  accentColor={colors.accent}
                  successColor={colors.success}
                  textDim={colors.textDim}
                  textMuted={colors.textMuted}
                  formatCompactCurrency={formatCompactCurrency}
                />
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                  <Text style={styles.legendText}>Total Value</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.success, borderRadius: 2 }]} />
                  <Text style={styles.legendText}>Contributions</Text>
                </View>
              </View>
            </View>

            {/* Breakdown */}
            <View style={tool.breakdownCard}>
              <Text style={tool.breakdownTitle}>Breakdown</Text>
              <View style={tool.breakdownRow}>
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.success }]}>
                    {formatCurrency(totalContributed)}
                  </Text>
                  <Text style={tool.breakdownLabel}>You Contribute</Text>
                </View>
                <View style={tool.breakdownDivider} />
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.accent }]}>
                    {formatCurrency(totalInterest)}
                  </Text>
                  <Text style={tool.breakdownLabel}>Interest Earned</Text>
                </View>
              </View>
              {totalContributed > 0 && (
                <View style={tool.ratioBar}>
                  <View
                    style={[
                      tool.ratioFillContrib,
                      { width: `${(totalContributed / totalValue) * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      tool.ratioFillInterest,
                      { width: `${(totalInterest / totalValue) * 100}%` },
                    ]}
                  />
                </View>
              )}
              {totalContributed > 0 && (
                <Text style={tool.ratioText}>
                  Your money earned {((totalInterest / totalContributed) * 100).toFixed(0)}% more
                  through compound interest
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── Loan / Mortgage Calculator Tool ── */}
        <LoanCalculatorCard />

        {/* ── Refinance Break-Even Calculator Tool ── */}
        <TouchableOpacity style={tool.toolHeader} onPress={toggleRefi} activeOpacity={0.7}>
          <View>
            <Text style={tool.toolTitle}>Refinance Break-Even Calculator</Text>
            <Text style={tool.toolHint}>
              See if refinancing actually saves you money
            </Text>
          </View>
          <Text style={tool.toolChevron}>{refiOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {refiOpen && (
          <View style={tool.toolBody}>
            {/* Result card - break-even */}
            <View style={tool.resultCard}>
              <Text style={tool.resultLabel}>BREAK-EVEN</Text>
              {!hasRefiSelection ? (
                <>
                  <Text style={[tool.resultValue, { color: colors.textDim }]}>
                    --
                  </Text>
                  <Text style={tool.resultSub}>
                    Pick at least one debt below to see the comparison.
                  </Text>
                </>
              ) : refiBreakEvenMonths !== null && isFinite(refiBreakEvenMonths) ? (
                <>
                  <Text style={tool.resultValue}>
                    {Math.ceil(refiBreakEvenMonths)} mo
                  </Text>
                  <Text style={tool.resultSub}>
                    {refiBreakEvenMonths >= 12
                      ? `~${(refiBreakEvenMonths / 12).toFixed(1)} years to recover ${formatCurrency(refiClosingCosts)} in closing costs`
                      : `${formatCurrency(refiClosingCosts)} in closing costs recovered in under a year`}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[tool.resultValue, { color: colors.danger }]}>--</Text>
                  <Text style={tool.resultSub}>
                    New payment isn't lower than current - no break-even.
                  </Text>
                </>
              )}
            </View>

            {/* Current loan - debt multi-select */}
            <View style={styles.refiPrefillCard}>
              <Text style={styles.refiSectionLabel}>CURRENT LOAN</Text>
              <Text style={styles.refiPrefillTitle}>
                Pick the debts you want to refinance
              </Text>
              {refiDebts.length === 0 ? (
                <Text style={tool.refiEmptyText}>
                  Add a debt in the Debt Tracker to use this calculator.
                </Text>
              ) : (
                refiDebts.map((debt) => {
                  const isSelected = refiSelectedDebtIds.has(debt.id);
                  return (
                    <TouchableOpacity
                      key={debt.id}
                      style={[
                        styles.refiDebtRow,
                        isSelected && styles.refiDebtRowActive,
                      ]}
                      onPress={() => toggleRefiDebt(debt.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.refiDebtCheckbox,
                          isSelected && styles.refiDebtCheckboxActive,
                        ]}
                      >
                        {isSelected && (
                          <Text style={styles.refiDebtCheckboxMark}>✓</Text>
                        )}
                      </View>
                      <View style={styles.refiDebtRowText}>
                        <Text
                          style={[
                            styles.refiDebtName,
                            isSelected && styles.refiDebtNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {debt.name}
                        </Text>
                        <Text style={styles.refiDebtMeta}>
                          {formatCurrency(debt.balance)} · {debt.rate}% APR
                          {debt.goalDate ? " · goal set" : ""}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Current loan derived summary + years-remaining slider */}
            {hasRefiSelection && (
              <View style={tool.slidersCard}>
                <Text style={styles.refiSectionLabel}>CURRENT LOAN SUMMARY</Text>
                <View style={tool.refiSummaryRow}>
                  <View style={tool.refiSummaryItem}>
                    <Text style={tool.refiSummaryLabel}>Combined balance</Text>
                    <Text style={tool.refiSummaryValue}>
                      {formatCurrency(refiBalance)}
                    </Text>
                  </View>
                  <View style={tool.breakdownDivider} />
                  <View style={tool.refiSummaryItem}>
                    <Text style={tool.refiSummaryLabel}>
                      {selectedRefiDebts.length > 1 ? "Weighted APR" : "APR"}
                    </Text>
                    <Text style={tool.refiSummaryValue}>
                      {refiCurrentRate.toFixed(2)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.refiSummaryHint}>
                  {selectedRefiDebts.length} of {refiDebts.length} debts selected
                  {selectedRefiDebts.length > 1
                    ? " · weighted by balance"
                    : ""}
                </Text>
                {renderRefiSlider("refiCurrentTerm", refiCurrentTerm)}
                <Text style={styles.refiPrefillHint}>
                  {refiAllSelectedHaveGoalDate
                    ? "Years remaining auto-filled from each debt's goal date. Adjust freely if the goal dates aren't exact."
                    : "Set a goal date on each debt in the tracker to auto-fill years remaining."}
                </Text>
              </View>
            )}

            {/* New loan sliders */}
            {hasRefiSelection && (
              <View style={tool.slidersCard}>
                <Text style={styles.refiSectionLabel}>NEW LOAN</Text>
                {renderRefiSlider("refiNewRate", refiNewRate)}
                {renderRefiSlider("refiNewTerm", refiNewTerm)}
                {renderRefiSlider("refiClosingCosts", refiClosingCosts)}
              </View>
            )}

            {/* Monthly payment breakdown */}
            {hasRefiSelection && (<>
            <View style={tool.breakdownCard}>
              <Text style={tool.breakdownTitle}>Monthly Payment</Text>
              <View style={tool.breakdownRow}>
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.textDim }]}>
                    {isFinite(refiCurrentMonthlyPayment)
                      ? formatCurrency(refiCurrentMonthlyPayment)
                      : "--"}
                  </Text>
                  <Text style={tool.breakdownLabel}>Current</Text>
                </View>
                <View style={tool.breakdownDivider} />
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.accent }]}>
                    {isFinite(refiNewMonthlyPayment)
                      ? formatCurrency(refiNewMonthlyPayment)
                      : "--"}
                  </Text>
                  <Text style={tool.breakdownLabel}>New</Text>
                </View>
              </View>
              <Text
                style={[
                  tool.ratioText,
                  {
                    color:
                      refiMonthlyDelta > 0
                        ? colors.success
                        : refiMonthlyDelta < 0
                          ? colors.danger
                          : colors.textDim,
                    fontWeight: "700",
                    marginTop: 12,
                  },
                ]}
              >
                {refiMonthlyDelta > 0
                  ? `Saves ${formatCurrency(refiMonthlyDelta)}/mo`
                  : refiMonthlyDelta < 0
                    ? `Costs ${formatCurrency(Math.abs(refiMonthlyDelta))}/mo more`
                    : "Same monthly payment"}
              </Text>
            </View>

            {/* Lifetime interest comparison */}
            <View style={tool.breakdownCard}>
              <Text style={tool.breakdownTitle}>Lifetime Interest</Text>
              <View style={tool.breakdownRow}>
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.textDim }]}>
                    {formatCurrency(refiCurrentTotalInterest)}
                  </Text>
                  <Text style={tool.breakdownLabel}>Keep current</Text>
                </View>
                <View style={tool.breakdownDivider} />
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.accent }]}>
                    {formatCurrency(refiNewTotalInterest)}
                  </Text>
                  <Text style={tool.breakdownLabel}>Refinance</Text>
                </View>
              </View>
              <Text
                style={[
                  tool.ratioText,
                  {
                    color:
                      refiInterestDelta > 0
                        ? colors.success
                        : refiInterestDelta < 0
                          ? colors.danger
                          : colors.textDim,
                    fontWeight: "700",
                    marginTop: 12,
                  },
                ]}
              >
                {refiInterestDelta > 0
                  ? `Saves ${formatCurrency(refiInterestDelta)} over the life of the loan`
                  : refiInterestDelta < 0
                    ? `Pays ${formatCurrency(Math.abs(refiInterestDelta))} more in interest overall`
                    : "Same lifetime interest"}
              </Text>
            </View>

            {/* Net savings + warnings */}
            {refiBreakEvenMonths !== null && (
              <View style={tool.insightCard}>
                <Text style={tool.insightText}>
                  Net savings over the new {refiNewTerm}-year term:{" "}
                  <Text
                    style={{
                      color:
                        refiNetSavingsOverNewTerm > 0
                          ? colors.success
                          : colors.danger,
                      fontWeight: "700",
                    }}
                  >
                    {refiNetSavingsOverNewTerm >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(refiNetSavingsOverNewTerm))}
                  </Text>
                </Text>
              </View>
            )}

            {refiExtendsTerm && refiMonthlyDelta > 0 && (
              <View
                style={[
                  tool.insightCard,
                  { backgroundColor: `${colors.warning}15` },
                ]}
              >
                <Text style={tool.insightText}>
                  Heads up: the new term is longer than what's left on your current loan. Lower monthly payments here partly come from spreading the balance over more months - check the lifetime interest above to see if that trade-off is worth it.
                </Text>
              </View>
            )}
            </>)}
          </View>
        )}

        {/* ── Emergency Fund Calculator Tool ── */}
        <TouchableOpacity style={tool.toolHeader} onPress={toggleEf} activeOpacity={0.7}>
          <View>
            <Text style={tool.toolTitle}>Emergency Fund Calculator</Text>
            <Text style={tool.toolHint}>Track your safety net progress</Text>
          </View>
          <Text style={tool.toolChevron}>{efOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {efOpen && (
          <View style={tool.toolBody}>
            {/* Monthly expenses */}
            <View style={tool.efCard}>
              <Text style={tool.efSectionTitle}>Your Monthly Expenses</Text>
              {toolsLoadError ? (
                <Text style={[tool.efAutoHint, { color: colors.danger }]}>
                  {toolsLoadError}
                </Text>
              ) : null}
              {efDataLoaded && avgExpenses > 0 ? (
                <Text style={tool.efAutoHint}>
                  Based on your budget: {formatCurrency(avgExpenses)}/mo average
                </Text>
              ) : efDataLoaded ? (
                <Text style={tool.efAutoHint}>
                  No budget data yet - enter your monthly expenses below
                </Text>
              ) : null}
              <TextInput
                style={tool.input}
                placeholder={avgExpenses > 0 ? String(avgExpenses) : "Monthly expenses"}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={efExpenseOverride}
                onChangeText={setEfExpenseOverride}
              />
            </View>

            {efMonthlyExpenses > 0 && (
              <>
                {/* 3-month target */}
                <View style={tool.efCard}>
                  <View style={styles.efTargetHeader}>
                    <Text style={styles.efTargetTitle}>3-Month Fund</Text>
                    <Text style={[styles.efTargetAmount, { color: colors.accent }]}>
                      {formatCurrency(efThreeMonth)}
                    </Text>
                  </View>
                  <View style={styles.efProgressTrack}>
                    <View
                      style={[
                        styles.efProgressFill,
                        {
                          width: `${efThreeProgress * 100}%`,
                          backgroundColor: efThreeProgress >= 1 ? colors.success : colors.accent,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.efProgressRow}>
                    <Text style={styles.efProgressLabel}>
                      {formatCurrency(currentEfAmount)} saved
                    </Text>
                    <Text style={styles.efProgressLabel}>
                      {Math.round(efThreeProgress * 100)}%
                    </Text>
                  </View>
                  {efThreeProgress < 1 && efMonthsToThree > 0 && (
                    <Text style={tool.efTimeEstimate}>
                      ~{efMonthsToThree} {efMonthsToThree === 1 ? "month" : "months"} to reach at {formatCurrency(efMonthlySavings)}/mo
                    </Text>
                  )}
                  {efThreeProgress >= 1 && (
                    <Text style={[tool.efTimeEstimate, { color: colors.success }]}>
                      3-month fund reached!
                    </Text>
                  )}
                </View>

                {/* 6-month target */}
                <View style={tool.efCard}>
                  <View style={styles.efTargetHeader}>
                    <Text style={styles.efTargetTitle}>6-Month Fund</Text>
                    <Text style={[styles.efTargetAmount, { color: colors.accent }]}>
                      {formatCurrency(efSixMonth)}
                    </Text>
                  </View>
                  <View style={styles.efProgressTrack}>
                    <View
                      style={[
                        styles.efProgressFill,
                        {
                          width: `${efSixProgress * 100}%`,
                          backgroundColor: efSixProgress >= 1 ? colors.success : colors.teal,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.efProgressRow}>
                    <Text style={styles.efProgressLabel}>
                      {formatCurrency(currentEfAmount)} saved
                    </Text>
                    <Text style={styles.efProgressLabel}>
                      {Math.round(efSixProgress * 100)}%
                    </Text>
                  </View>
                  {efSixProgress < 1 && efMonthsToSix > 0 && (
                    <Text style={tool.efTimeEstimate}>
                      ~{efMonthsToSix} {efMonthsToSix === 1 ? "month" : "months"} to reach at {formatCurrency(efMonthlySavings)}/mo
                    </Text>
                  )}
                  {efSixProgress >= 1 && (
                    <Text style={[tool.efTimeEstimate, { color: colors.success }]}>
                      6-month fund reached!
                    </Text>
                  )}
                </View>

                {/* Monthly savings slider */}
                <View style={tool.slidersCard}>
                  <SliderRow
                    label="Monthly Savings"
                    value={efMonthlySavings}
                    min={50}
                    max={10000}
                    step={50}
                    displayValue={formatCurrency(efMonthlySavings)}
                    onValueChange={setEfMonthlySavings}
                    onAdjust={(delta) =>
                      setEfMonthlySavings((p) => Math.max(50, Math.min(10000, p + delta * 50)))
                    }
                  />
                </View>

                {/* Educational note */}
                <View style={tool.insightCard}>
                  <Text style={tool.insightText}>
                    A common target is 3-6 months of living expenses in cash. That can cover job loss, medical emergencies, or unexpected repairs without new debt. Your situation may differ.
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Currency Exchange Tool ── */}
        <CurrencyExchangeCard />

        {/* ── "What If I Stopped Spending on X" Tool ── */}
        <WhatIfSpendingCard
          options={whatIfOptions}
          debts={refiDebts}
          customCategories={customCategories}
        />

        {/* ── Plan a Purchase (sinking funds) ── */}
        <PurchasePlannerCard
          cashFlow={purchaseCashFlow}
          debts={refiDebts}
          savingsGoals={savingsGoalsAll}
          milestonePlan={milestonePlan}
          onGoalsChanged={handlePurchaseGoalsChanged}
        />

        {/* ── Take-Home Pay (US income tax estimator) ── */}
        <TaxCalculatorCard />
      </ScrollView>
      </KeyboardAvoidingView>
      {coachmark}
      <LessonScreen
        visible={openLessonStub !== null}
        stub={openLessonStub}
        onClose={handleCloseLesson}
        onNavigateTo={handleOpenLesson}
        onOpenAction={handleLessonRoute}
        onOpenTool={handleLessonRoute}
      />
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
    keyboardAvoider: {
      flex: 1,
    },
    content: {
      paddingHorizontal: tokens.pad,
    },
    titleSection: {
      paddingTop: 56,
      paddingBottom: tokens.gap,
      alignItems: "center",
    },
    appLabel: {
      fontSize: scale(12),
      color: colors.textDim,
      letterSpacing: 2,
      marginBottom: 4,
      textAlign: "center",
    },
    screenTitle: {
      fontSize: scale(28),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
      textAlign: "center",
    },
    screenSubtitle: {
      fontSize: scale(14),
      color: colors.textMuted,
      textAlign: "center",
    },

    /* Tool header - collapsible */

    /* Result Card */

    /* Rule of 72 insight */

    /* "Why 7%?" toggle + card */
    whyCardToggle: {
      alignSelf: "center",
      paddingVertical: 4,
    },
    whyCardToggleText: {
      fontSize: 14,
      fontWeight: "700",
    },
    whyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius - 2,
      padding: tokens.pad,
      gap: tokens.gapSm,
    },
    whyCardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    whyCardBody: {
      fontSize: 13,
      color: colors.textDim,
      lineHeight: 19,
    },
    whyCardDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
    },
    whyCardFooter: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: "italic",
    },


    /* Return rate presets */
    ratePresetRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: 4,
    },
    ratePresetBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    ratePresetBtnActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    ratePresetLabel: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
    },
    ratePresetLabelActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    ratePresetRate: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      marginTop: 1,
    },
    ratePresetRateActive: {
      color: colors.accent,
    },

    /* Year presets */

    /* Chart */
    chartCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 16,
    },
    chartTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    chartWrap: {
      alignItems: "center",
    },
    legendRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 20,
      marginTop: 12,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 12,
      color: colors.textDim,
    },

    /* Breakdown */


    /* Refinance break-even */
    refiPrefillCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      gap: 10,
    },
    refiPrefillTitle: {
      fontSize: 13,
      color: colors.textDim,
      fontWeight: "600",
    },
    refiPrefillHint: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    refiSectionLabel: {
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 1.5,
      fontWeight: "700",
      marginBottom: -4,
    },
    refiDebtRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
    },
    refiDebtRowActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}15`,
    },
    refiDebtRowText: {
      flex: 1,
    },
    refiDebtCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    refiDebtCheckboxActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    refiDebtCheckboxMark: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 16,
    },
    refiDebtName: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "600",
    },
    refiDebtNameActive: {
      color: colors.accent,
    },
    refiDebtMeta: {
      fontSize: 11,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
      marginTop: 2,
    },
    refiSummaryHint: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: "center",
    },

    /* Emergency Fund */
    efTargetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    efTargetTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    efTargetAmount: {
      fontSize: 16,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    efProgressTrack: {
      height: 10,
      backgroundColor: colors.bg,
      borderRadius: tokens.radiusPill,
      overflow: "hidden",
    },
    efProgressFill: {
      height: "100%",
      borderRadius: tokens.radiusPill,
      minWidth: 2,
    },
    efProgressRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    efProgressLabel: {
      fontSize: 12,
      color: colors.textDim,
      fontVariant: ["tabular-nums"],
    },



    /* Captain's Course card */
    courseCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: tokens.radius + 4,
      padding: tokens.pad,
      marginBottom: tokens.gap,
      gap: tokens.gapSm,
    },
    courseHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    courseEyebrow: {
      fontSize: scale(11),
      color: colors.accent,
      letterSpacing: 1.5,
      fontWeight: "700",
    },
    courseProgressLabel: {
      fontSize: scale(12),
      color: colors.textDim,
      fontVariant: ["tabular-nums"],
    },
    courseProgressTrack: {
      height: 6,
      backgroundColor: `${colors.accent}20`,
      borderRadius: tokens.radiusPill,
      overflow: "hidden",
    },
    courseProgressFill: {
      height: "100%",
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusPill,
      minWidth: 2,
    },
    courseDisclaimer: {
      fontSize: scale(10),
      lineHeight: scale(14),
      color: colors.textMuted,
      marginTop: 8,
    },
    resumeStrip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${colors.accent}12`,
      borderWidth: 1,
      borderColor: `${colors.accent}40`,
      borderRadius: tokens.radius,
      paddingVertical: tokens.padSm,
      paddingHorizontal: tokens.pad,
      marginTop: 4,
    },
    resumeLabel: {
      fontSize: scale(10),
      color: colors.accent,
      letterSpacing: 1.5,
      fontWeight: "700",
      marginBottom: 2,
    },
    resumeTitle: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
    },
    resumeSub: {
      fontSize: scale(12),
      color: colors.textMuted,
      marginTop: 2,
    },
    resumeChevron: {
      fontSize: scale(22),
      color: colors.accent,
      fontWeight: "600",
      marginLeft: 10,
    },
    chapterList: {
      marginTop: 4,
      gap: 2,
    },
    chapterRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.cardBorder,
    },
    chapterGlyph: {
      fontSize: scale(18),
      width: 28,
      textAlign: "center",
    },
    chapterBody: {
      flex: 1,
      marginLeft: 6,
    },
    chapterTitle: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    chapterSubtitle: {
      fontSize: scale(12),
      color: colors.textMuted,
      marginTop: 1,
    },
    chapterCount: {
      fontSize: scale(13),
      color: colors.textDim,
      fontVariant: ["tabular-nums"],
      fontWeight: "600",
    },
    chapterComingSoon: {
      fontSize: scale(11),
      color: colors.textMuted,
      letterSpacing: 0.8,
      fontStyle: "italic",
    },
    chapterChevron: {
      fontSize: scale(18),
      color: colors.textMuted,
      fontWeight: "600",
      marginLeft: 8,
      minWidth: 14,
      textAlign: "right",
    },

    /* Expanded lesson list inside a chapter */
    lessonList: {
      paddingLeft: 34,
      paddingBottom: 6,
      gap: 4,
    },
    lessonRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: tokens.radius - 2,
      backgroundColor: `${colors.accent}08`,
    },
    lessonNumber: {
      fontSize: scale(11),
      color: colors.textMuted,
      fontWeight: "700",
      width: 32,
      fontVariant: ["tabular-nums"],
    },
    lessonBody: {
      flex: 1,
    },
    lessonTitle: {
      fontSize: scale(13),
      color: colors.text,
      fontWeight: "500",
    },
    lessonTitleDim: {
      color: colors.textMuted,
    },
    lessonMeta: {
      fontSize: scale(11),
      color: colors.textMuted,
      marginTop: 1,
    },
    lessonCompletedDot: {
      fontSize: scale(13),
      color: colors.success,
      fontWeight: "700",
      marginLeft: 6,
    },

    /* Section header (TOPICS / TOOLS) */
    sectionHeader: {
      marginTop: tokens.gap,
      marginBottom: tokens.gapSm,
      paddingHorizontal: 2,
    },
    sectionHeaderTitle: {
      fontSize: scale(12),
      color: colors.accent,
      letterSpacing: 2,
      fontWeight: "700",
    },
    sectionHeaderHint: {
      fontSize: scale(12),
      color: colors.textMuted,
      marginTop: 2,
    },

    /* Topic chips */
    topicChipRow: {
      gap: 8,
      paddingVertical: 4,
      paddingRight: tokens.pad,
    },
    topicChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusPill,
      paddingVertical: 6,
      paddingHorizontal: 12,
      gap: 6,
    },
    topicChipGlyph: {
      fontSize: scale(14),
    },
    topicChipLabel: {
      fontSize: scale(13),
      color: colors.text,
      fontWeight: "600",
    },
    topicChipActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    topicChipLabelActive: {
      color: colors.accent,
      fontWeight: "700",
    },

    /* Active-topic strip inside the Captain's Course card */
    topicFilterStrip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: `${colors.accent}12`,
      borderWidth: 1,
      borderColor: `${colors.accent}40`,
      borderRadius: tokens.radius,
      paddingVertical: tokens.padSm,
      paddingHorizontal: tokens.padSm,
      marginTop: tokens.gapSm,
      gap: 8,
    },
    topicFilterStripText: {
      flex: 1,
      fontSize: scale(13),
      color: colors.text,
      fontWeight: "600",
    },
    topicFilterStripClear: {
      fontSize: scale(12),
      color: colors.accent,
      fontWeight: "700",
    },
  });
};

export default ChartsScreen;
