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
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useTabCoachmark } from "../onboarding/useTabCoachmark";
import { useCoachmarkAnchor } from "../onboarding/CoachmarkAnchorContext";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  calcInvestmentTimeline,
  compareInvestmentScenarios,
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
import SubscriptionDetectiveCard from "../components/SubscriptionDetectiveCard";
import PersonalInflationCard from "../components/PersonalInflationCard";
import QuarterlyTaxCard from "../components/QuarterlyTaxCard";
import type {
  AssetAccount,
  BudgetEntry,
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

/* ── Slider Config ── */

type SliderConfig = {
  min: number;
  max: number;
  step: number;
};

type CalcSliderKey = "lumpSum" | "contribution" | "returnRate" | "years";

const SLIDERS: Record<CalcSliderKey, SliderConfig> = {
  // Starting lump sum: what you already have, invested once and left alone.
  // 0 keeps the classic contributions-only projection.
  lumpSum: { min: 0, max: 500000, step: 1000 },
  // Contribution may be 0 so a lump sum can be viewed on its own.
  contribution: { min: 0, max: 50000, step: 50 },
  returnRate: { min: 1, max: 30, step: 0.5 },
  years: { min: 1, max: 50, step: 1 },
};

const YEAR_PRESETS = [10, 20, 30] as const;

/* ── Refinance Break-Even Config ── */

type RefiKey =
  | "refiCurrentTerm"
  | "refiNewRate"
  | "refiNewTerm"
  | "refiClosingCosts";

const REFI_SLIDERS: Record<RefiKey, SliderConfig> = {
  refiCurrentTerm: { min: 1, max: 30, step: 1 },
  refiNewRate: { min: 0.5, max: 30, step: 0.125 },
  refiNewTerm: { min: 1, max: 30, step: 1 },
  refiClosingCosts: { min: 0, max: 30_000, step: 100 },
};

/* ── Return Rate Presets ── */

// Labels live at charts.screen.compound.presets.<id>.
const RATE_PRESETS = [
  { id: "savings", rate: 2 }, // high-yield savings account
  { id: "bonds", rate: 4 }, // US Treasury / bond funds
  { id: "sp500", rate: 7 }, // historical avg, inflation-adjusted
  { id: "aggressive", rate: 10 }, // S&P 500 nominal (before inflation)
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
    const { t } = useTranslation();
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
            {t("charts.screen.compound.chart.axisYear", { count: tick })}
          </SvgText>
        ))}
      </Svg>
    );
  }
);
AreaChart.displayName = "AreaChart";

/* ── Main Screen ── */

const ChartsScreen: React.FC = () => {
  const { t } = useTranslation();
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
  const [lumpSum, setLumpSum] = useState(0);
  const [contribution, setContribution] = useState(500);
  const [returnRate, setReturnRate] = useState(7);
  const [years, setYears] = useState(20);
  const [showWhyCard, setShowWhyCard] = useState(false);
  const calcEditor = useSliderValueEditor({
    lumpSum: { ...SLIDERS.lumpSum, set: setLumpSum, commitMode: "round-int" },
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
  /** Live entries for the tools that read raw history (Subscription Detective). */
  const [toolEntries, setToolEntries] = useState<BudgetEntry[]>([]);
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
    () => calcInvestmentTimeline(contribution, returnRate, years, lumpSum),
    [contribution, returnRate, years, lumpSum]
  );

  /* Lump sum vs. monthly: shown when both inputs are in play */
  const comparison = useMemo(
    () => compareInvestmentScenarios(lumpSum, contribution, returnRate, years),
    [lumpSum, contribution, returnRate, years]
  );
  const showComparison = lumpSum > 0 && contribution > 0;

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
          setToolEntries(entries);
          setSavingsGoalsAll(goals);
          setMilestonePlan(storedMilestones);
        } catch (error) {
          if (cancelled) return;
          if (__DEV__) console.error("Failed to load Charts tool data:", error);
          setToolsLoadError(
            describeError(error, t("charts.screen.errors.loadFailed")),
          );
        }
      };
      loadEfData();
      return () => {
        cancelled = true;
      };
    }, [t])
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
  const handleToolEntriesChanged = useCallback(async () => {
    try {
      const entries = await getBudgetEntries();
      setToolEntries(entries);
      setWhatIfOptions(buildCategorySpendOptions(entries));
      setPurchaseCashFlow(calcMonthlyCashFlow(entries));
    } catch (error) {
      if (__DEV__) console.error("Failed to reload Charts tool entries:", error);
    }
  }, []);

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
        ? t("charts.screen.units.percent", { value })
        : t("charts.screen.units.years", { value });

    return (
      <SliderRow
        key={key}
        label={t(`charts.screen.refi.sliders.${key}`)}
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

  const renderSlider = (key: CalcSliderKey, value: number) => {
    const cfg = SLIDERS[key];
    const displayValue =
      key === "contribution" || key === "lumpSum"
        ? formatCurrency(value)
        : key === "returnRate"
          ? t("charts.screen.units.percent", { value })
          : t("charts.screen.units.years", { value });

    return (
      <SliderRow
        key={key}
        label={t(`charts.screen.compound.sliders.${key}`)}
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
                key={preset.id}
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
                  {t(`charts.screen.compound.presets.${preset.id}`)}
                </Text>
                <Text
                  style={[
                    styles.ratePresetRate,
                    returnRate === preset.rate && styles.ratePresetRateActive,
                  ]}
                >
                  {t("charts.screen.units.percent", { value: preset.rate })}
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
      <StatusBar barStyle="light-content" />
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
          <Text style={styles.screenTitle}>{t("charts.screen.header.title")}</Text>
          <Text style={styles.screenSubtitle}>{t("charts.screen.header.subtitle")}</Text>
        </View>

        {/* ── Captain's Course ──
         * Chapter rows expand to lesson lists, Resume strip + lesson taps
         * open LessonScreen, and the Topics chips below filter this list.
         */}
        <View style={styles.courseCard}>
          <View style={styles.courseHeaderRow}>
            <Text style={styles.courseEyebrow}>{t("charts.screen.course.eyebrow")}</Text>
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
                  {overallProgress.completed === 0
                    ? t("charts.screen.course.startHere")
                    : t("charts.screen.course.resume")}
                </Text>
                <Text style={styles.resumeTitle} numberOfLines={2}>
                  {resumeChapter.number}.{resumeStub.number} {resumeStub.title}
                </Text>
                <Text style={styles.resumeSub}>
                  {t("charts.screen.course.chapterRef", {
                    number: resumeChapter.number,
                    title: resumeChapter.title,
                  })}
                  {resumeStub.readMin
                    ? t("charts.screen.course.readMin", { count: resumeStub.readMin })
                    : ""}
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
                {t("charts.screen.course.filterOnly", {
                  glyph: TOPIC_GLYPHS[topicFilter],
                  topic: t(`charts.screen.topics.labels.${topicFilter}`),
                })}
              </Text>
              <Text style={styles.topicFilterStripClear}>{t("charts.screen.course.showAll")}</Text>
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
                        {t("charts.screen.course.chapterRef", {
                          number: chapter.number,
                          title: chapter.title,
                        })}
                      </Text>
                      <Text style={styles.chapterSubtitle}>{chapter.subtitle}</Text>
                    </View>
                    {isComingSoon ? (
                      <Text style={styles.chapterComingSoon}>{t("charts.screen.course.comingSoon")}</Text>
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
                                  ? t("charts.screen.course.lessonReadMin", { count: stub.readMin })
                                  : t("charts.screen.course.comingSoon")}
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
          <Text style={styles.sectionHeaderTitle}>{t("charts.screen.topics.sectionTitle")}</Text>
          <Text style={styles.sectionHeaderHint}>{t("charts.screen.topics.hint")}</Text>
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
                  {t(`charts.screen.topics.labels.${topic}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Tools ── existing calculators */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>{t("charts.screen.tools.sectionTitle")}</Text>
          <Text style={styles.sectionHeaderHint}>{t("charts.screen.tools.hint")}</Text>
        </View>

        {/* ── Compound Interest Calculator Tool ── */}
        <TouchableOpacity ref={anchorUtilitiesTool} style={tool.toolHeader} onPress={toggleCalc} activeOpacity={0.7}>
          <View>
            <Text style={tool.toolTitle}>{t("charts.screen.compound.title")}</Text>
            <Text style={tool.toolHint}>{t("charts.screen.compound.hint")}</Text>
          </View>
          <Text style={tool.toolChevron}>{calcOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {calcOpen && (
          <View style={tool.toolBody}>
            {/* Result Card */}
            <View style={tool.resultCard}>
              <Text style={tool.resultLabel}>{t("charts.screen.compound.projectedValue")}</Text>
              <Text style={tool.resultValue}>{formatCurrency(totalValue)}</Text>
              <Text style={[tool.resultSub, styles.calcResultSub]} numberOfLines={2}>
                {lumpSum > 0
                  ? t("charts.screen.compound.subLump", {
                      lump: formatCurrency(lumpSum),
                      monthly: formatCurrency(contribution),
                      years,
                      rate: returnRate,
                    })
                  : t("charts.screen.compound.subPlain", { years, rate: returnRate })}
              </Text>
            </View>

            {/* Sliders sit directly under the result card, and everything
                that mounts/unmounts or rewraps as the values change (the
                comparison card, Rule of 72, Why 7%) is deliberately placed
                BELOW them. Anything above the sliders that changes height
                mid-drag shifts the track under the finger and makes the
                page jump. */}
            {/* Sliders */}
            <View style={tool.slidersCard}>
              {renderSlider("lumpSum", lumpSum)}
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
                      {t("charts.screen.units.yearPreset", { count: preset })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Lump sum vs. monthly comparison */}
            {showComparison && (
              <View style={tool.breakdownCard}>
                <Text style={tool.breakdownTitle}>{t("charts.screen.compound.comparison.title")}</Text>
                <View style={tool.refiSummaryRow}>
                  <View style={tool.refiSummaryItem}>
                    <Text style={tool.refiSummaryLabel}>
                      {t("charts.screen.compound.comparison.once", { amount: formatCurrency(lumpSum) })}
                    </Text>
                    <Text style={[tool.refiSummaryValue, { color: colors.accent }]}>
                      {formatCurrency(comparison.lumpOnly.endValue)}
                    </Text>
                  </View>
                  <View style={tool.refiSummaryItem}>
                    <Text style={tool.refiSummaryLabel}>
                      {t("charts.screen.compound.comparison.perMonth", { amount: formatCurrency(contribution) })}
                    </Text>
                    <Text style={[tool.refiSummaryValue, { color: colors.success }]}>
                      {formatCurrency(comparison.monthlyOnly.endValue)}
                    </Text>
                  </View>
                  <View style={tool.refiSummaryItem}>
                    <Text style={tool.refiSummaryLabel}>{t("charts.screen.compound.comparison.both")}</Text>
                    <Text style={tool.refiSummaryValue}>
                      {formatCurrency(comparison.both.endValue)}
                    </Text>
                  </View>
                </View>
                <Text style={tool.ratioText}>
                  {comparison.crossoverYear !== null
                    ? t("charts.screen.compound.comparison.crossover", {
                        year: comparison.crossoverYear,
                        putIn: formatCurrency(comparison.monthlyOnly.putIn),
                        lump: formatCurrency(lumpSum),
                      })
                    : t("charts.screen.compound.comparison.noCrossover", { years })}
                </Text>
              </View>
            )}

            {/* Rule of 72 insight */}
            {returnRate > 0 && (
              <View style={tool.insightCard}>
                <Text style={tool.insightText}>
                  {t("charts.screen.compound.rule72", { rate: returnRate, years: doublingYears })}
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
                {showWhyCard ? t("charts.screen.compound.whyHide") : t("charts.screen.compound.whyShow")}
              </Text>
            </TouchableOpacity>

            {showWhyCard && (
              <View style={styles.whyCard}>
                <Text style={styles.whyCardTitle}>{t("charts.screen.compound.why.title")}</Text>
                <Text style={styles.whyCardBody}>{t("charts.screen.compound.why.p1")}</Text>
                <Text style={styles.whyCardBody}>{t("charts.screen.compound.why.p2")}</Text>
                <Text style={styles.whyCardBody}>{t("charts.screen.compound.why.p3")}</Text>
                <View style={styles.whyCardDivider} />
                <Text style={styles.whyCardFooter}>{t("charts.screen.compound.why.footer")}</Text>
              </View>
            )}

            {/* Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t("charts.screen.compound.chart.title")}</Text>
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
                  <Text style={styles.legendText}>{t("charts.screen.compound.chart.totalValue")}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.success, borderRadius: 2 }]} />
                  <Text style={styles.legendText}>{t("charts.screen.compound.chart.contributions")}</Text>
                </View>
              </View>
            </View>

            {/* Breakdown */}
            <View style={tool.breakdownCard}>
              <Text style={tool.breakdownTitle}>{t("charts.screen.compound.breakdown.title")}</Text>
              <View style={tool.breakdownRow}>
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.success }]}>
                    {formatCurrency(totalContributed)}
                  </Text>
                  <Text style={tool.breakdownLabel}>
                    {lumpSum > 0
                      ? t("charts.screen.compound.breakdown.putIn")
                      : t("charts.screen.compound.breakdown.contribute")}
                  </Text>
                </View>
                <View style={tool.breakdownDivider} />
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.accent }]}>
                    {formatCurrency(totalInterest)}
                  </Text>
                  <Text style={tool.breakdownLabel}>{t("charts.screen.compound.breakdown.interest")}</Text>
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
                  {t("charts.screen.compound.breakdown.ratio", {
                    percent: ((totalInterest / totalContributed) * 100).toFixed(0),
                  })}
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
            <Text style={tool.toolTitle}>{t("charts.screen.refi.title")}</Text>
            <Text style={tool.toolHint}>{t("charts.screen.refi.hint")}</Text>
          </View>
          <Text style={tool.toolChevron}>{refiOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {refiOpen && (
          <View style={tool.toolBody}>
            {/* Result card - break-even */}
            <View style={tool.resultCard}>
              <Text style={tool.resultLabel}>{t("charts.screen.refi.breakEven")}</Text>
              {!hasRefiSelection ? (
                <>
                  <Text style={[tool.resultValue, { color: colors.textDim }]}>
                    --
                  </Text>
                  <Text style={tool.resultSub}>{t("charts.screen.refi.pickOne")}</Text>
                </>
              ) : refiBreakEvenMonths !== null && isFinite(refiBreakEvenMonths) ? (
                <>
                  <Text style={tool.resultValue}>
                    {t("charts.screen.refi.months", { count: Math.ceil(refiBreakEvenMonths) })}
                  </Text>
                  <Text style={tool.resultSub}>
                    {refiBreakEvenMonths >= 12
                      ? t("charts.screen.refi.recoverYears", {
                          years: (refiBreakEvenMonths / 12).toFixed(1),
                          amount: formatCurrency(refiClosingCosts),
                        })
                      : t("charts.screen.refi.recoverUnderYear", {
                          amount: formatCurrency(refiClosingCosts),
                        })}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[tool.resultValue, { color: colors.danger }]}>--</Text>
                  <Text style={tool.resultSub}>{t("charts.screen.refi.noBreakEven")}</Text>
                </>
              )}
            </View>

            {/* Current loan - debt multi-select */}
            <View style={styles.refiPrefillCard}>
              <Text style={styles.refiSectionLabel}>{t("charts.screen.refi.currentLoan")}</Text>
              <Text style={styles.refiPrefillTitle}>{t("charts.screen.refi.pickDebts")}</Text>
              {refiDebts.length === 0 ? (
                <Text style={tool.refiEmptyText}>{t("charts.screen.refi.noDebts")}</Text>
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
                          {t("charts.screen.refi.debtMeta", {
                            balance: formatCurrency(debt.balance),
                            rate: debt.rate,
                          })}
                          {debt.goalDate ? t("charts.screen.refi.goalSet") : ""}
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
                <Text style={styles.refiSectionLabel}>{t("charts.screen.refi.summaryTitle")}</Text>
                <View style={tool.refiSummaryRow}>
                  <View style={tool.refiSummaryItem}>
                    <Text style={tool.refiSummaryLabel}>{t("charts.screen.refi.combinedBalance")}</Text>
                    <Text style={tool.refiSummaryValue}>
                      {formatCurrency(refiBalance)}
                    </Text>
                  </View>
                  <View style={tool.breakdownDivider} />
                  <View style={tool.refiSummaryItem}>
                    <Text style={tool.refiSummaryLabel}>
                      {selectedRefiDebts.length > 1
                        ? t("charts.screen.refi.weightedApr")
                        : t("charts.screen.refi.apr")}
                    </Text>
                    <Text style={tool.refiSummaryValue}>
                      {t("charts.screen.units.percent", { value: refiCurrentRate.toFixed(2) })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.refiSummaryHint}>
                  {t("charts.screen.refi.selected", {
                    selected: selectedRefiDebts.length,
                    total: refiDebts.length,
                  })}
                  {selectedRefiDebts.length > 1 ? t("charts.screen.refi.weightedByBalance") : ""}
                </Text>
                {renderRefiSlider("refiCurrentTerm", refiCurrentTerm)}
                <Text style={styles.refiPrefillHint}>
                  {refiAllSelectedHaveGoalDate
                    ? t("charts.screen.refi.autoFilledHint")
                    : t("charts.screen.refi.setGoalHint")}
                </Text>
              </View>
            )}

            {/* New loan sliders */}
            {hasRefiSelection && (
              <View style={tool.slidersCard}>
                <Text style={styles.refiSectionLabel}>{t("charts.screen.refi.newLoan")}</Text>
                {renderRefiSlider("refiNewRate", refiNewRate)}
                {renderRefiSlider("refiNewTerm", refiNewTerm)}
                {renderRefiSlider("refiClosingCosts", refiClosingCosts)}
              </View>
            )}

            {/* Monthly payment breakdown */}
            {hasRefiSelection && (<>
            <View style={tool.breakdownCard}>
              <Text style={tool.breakdownTitle}>{t("charts.screen.refi.monthlyPayment")}</Text>
              <View style={tool.breakdownRow}>
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.textDim }]}>
                    {isFinite(refiCurrentMonthlyPayment)
                      ? formatCurrency(refiCurrentMonthlyPayment)
                      : "--"}
                  </Text>
                  <Text style={tool.breakdownLabel}>{t("charts.screen.refi.current")}</Text>
                </View>
                <View style={tool.breakdownDivider} />
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.accent }]}>
                    {isFinite(refiNewMonthlyPayment)
                      ? formatCurrency(refiNewMonthlyPayment)
                      : "--"}
                  </Text>
                  <Text style={tool.breakdownLabel}>{t("charts.screen.refi.new")}</Text>
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
                  ? t("charts.screen.refi.savesPerMonth", { amount: formatCurrency(refiMonthlyDelta) })
                  : refiMonthlyDelta < 0
                    ? t("charts.screen.refi.costsPerMonth", {
                        amount: formatCurrency(Math.abs(refiMonthlyDelta)),
                      })
                    : t("charts.screen.refi.samePayment")}
              </Text>
            </View>

            {/* Lifetime interest comparison */}
            <View style={tool.breakdownCard}>
              <Text style={tool.breakdownTitle}>{t("charts.screen.refi.lifetimeInterest")}</Text>
              <View style={tool.breakdownRow}>
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.textDim }]}>
                    {formatCurrency(refiCurrentTotalInterest)}
                  </Text>
                  <Text style={tool.breakdownLabel}>{t("charts.screen.refi.keepCurrent")}</Text>
                </View>
                <View style={tool.breakdownDivider} />
                <View style={tool.breakdownItem}>
                  <Text style={[tool.breakdownValue, { color: colors.accent }]}>
                    {formatCurrency(refiNewTotalInterest)}
                  </Text>
                  <Text style={tool.breakdownLabel}>{t("charts.screen.refi.refinance")}</Text>
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
                  ? t("charts.screen.refi.savesLifetime", { amount: formatCurrency(refiInterestDelta) })
                  : refiInterestDelta < 0
                    ? t("charts.screen.refi.paysMore", {
                        amount: formatCurrency(Math.abs(refiInterestDelta)),
                      })
                    : t("charts.screen.refi.sameLifetime")}
              </Text>
            </View>

            {/* Net savings + warnings */}
            {refiBreakEvenMonths !== null && (
              <View style={tool.insightCard}>
                <Text style={tool.insightText}>
                  {t("charts.screen.refi.netSavings", { years: refiNewTerm })}
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
                <Text style={tool.insightText}>{t("charts.screen.refi.extendsWarning")}</Text>
              </View>
            )}
            </>)}
          </View>
        )}

        {/* ── Emergency Fund Calculator Tool ── */}
        <TouchableOpacity style={tool.toolHeader} onPress={toggleEf} activeOpacity={0.7}>
          <View>
            <Text style={tool.toolTitle}>{t("charts.screen.ef.title")}</Text>
            <Text style={tool.toolHint}>{t("charts.screen.ef.hint")}</Text>
          </View>
          <Text style={tool.toolChevron}>{efOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {efOpen && (
          <View style={tool.toolBody}>
            {/* Monthly expenses */}
            <View style={tool.efCard}>
              <Text style={tool.efSectionTitle}>{t("charts.screen.ef.expensesTitle")}</Text>
              {toolsLoadError ? (
                <Text style={[tool.efAutoHint, { color: colors.danger }]}>
                  {toolsLoadError}
                </Text>
              ) : null}
              {efDataLoaded && avgExpenses > 0 ? (
                <Text style={tool.efAutoHint}>
                  {t("charts.screen.ef.basedOn", { amount: formatCurrency(avgExpenses) })}
                </Text>
              ) : efDataLoaded ? (
                <Text style={tool.efAutoHint}>{t("charts.screen.ef.noData")}</Text>
              ) : null}
              <TextInput
                style={tool.input}
                placeholder={avgExpenses > 0 ? String(avgExpenses) : t("charts.screen.ef.placeholder")}
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
                    <Text style={styles.efTargetTitle}>{t("charts.screen.ef.threeMonth")}</Text>
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
                      {t("charts.screen.ef.saved", { amount: formatCurrency(currentEfAmount) })}
                    </Text>
                    <Text style={styles.efProgressLabel}>
                      {Math.round(efThreeProgress * 100)}%
                    </Text>
                  </View>
                  {efThreeProgress < 1 && efMonthsToThree > 0 && (
                    <Text style={tool.efTimeEstimate}>
                      {t("charts.screen.ef.monthsToReach", {
                        count: efMonthsToThree,
                        amount: formatCurrency(efMonthlySavings),
                      })}
                    </Text>
                  )}
                  {efThreeProgress >= 1 && (
                    <Text style={[tool.efTimeEstimate, { color: colors.success }]}>
                      {t("charts.screen.ef.threeReached")}
                    </Text>
                  )}
                </View>

                {/* 6-month target */}
                <View style={tool.efCard}>
                  <View style={styles.efTargetHeader}>
                    <Text style={styles.efTargetTitle}>{t("charts.screen.ef.sixMonth")}</Text>
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
                      {t("charts.screen.ef.saved", { amount: formatCurrency(currentEfAmount) })}
                    </Text>
                    <Text style={styles.efProgressLabel}>
                      {Math.round(efSixProgress * 100)}%
                    </Text>
                  </View>
                  {efSixProgress < 1 && efMonthsToSix > 0 && (
                    <Text style={tool.efTimeEstimate}>
                      {t("charts.screen.ef.monthsToReach", {
                        count: efMonthsToSix,
                        amount: formatCurrency(efMonthlySavings),
                      })}
                    </Text>
                  )}
                  {efSixProgress >= 1 && (
                    <Text style={[tool.efTimeEstimate, { color: colors.success }]}>
                      {t("charts.screen.ef.sixReached")}
                    </Text>
                  )}
                </View>

                {/* Monthly savings slider */}
                <View style={tool.slidersCard}>
                  <SliderRow
                    label={t("charts.screen.ef.monthlySavings")}
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
                  <Text style={tool.insightText}>{t("charts.screen.ef.note")}</Text>
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

        {/* ── Subscription Detective (repeat charges with no bill) ── */}
        <SubscriptionDetectiveCard
          entries={toolEntries}
          onEntriesChanged={handleToolEntriesChanged}
        />

        {/* ── Personal Inflation Rate (your basket vs headline CPI) ── */}
        <PersonalInflationCard entries={toolEntries} customCategories={customCategories} />

        {/* ── Take-Home Pay (US income tax estimator) ── */}
        <TaxCalculatorCard />

        {/* ── Quarterly Taxes (1099 estimated payments) ── */}
        <QuarterlyTaxCard entries={toolEntries} />
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
    // Reserve two lines so the subtext rewrapping mid-drag never changes the
    // result card's height (the sliders live directly beneath it).
    calcResultSub: {
      lineHeight: 18,
      minHeight: 36,
    },
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
