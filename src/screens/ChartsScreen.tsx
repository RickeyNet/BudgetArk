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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { File as ExpoFile, Paths } from "expo-file-system";
import { shareLocalFileThenDelete } from "../utils/shareTempFile";
import { useFocusEffect , useNavigation } from "@react-navigation/native";
import Svg, { Defs, LinearGradient, Stop, Path, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_BASE_HEIGHT } from "../navigation/tabBarLayout";
import { describeError } from "../utils/errorMessage";
import CodeChipGrid, { type CodeChipStyles } from "../components/CodeChipGrid";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useTabCoachmark } from "../onboarding/useTabCoachmark";
import { useCoachmarkAnchor } from "../onboarding/CoachmarkAnchorContext";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  calcInvestmentTimeline,
  calcPaymentForGoalDate,
  generatePayoffSchedule,
} from "../utils/calculations";
import {
  buildLoanScheduleCsv,
  buildLoanScheduleFilename,
  buildLoanYearlySummary,
  calcAutoFillYearsRemaining,
  calcAvgMonthlyExpenses,
  calcBalanceWeightedRate,
  calcEmergencyFundPlan,
  calcRefiComparison,
  calcRuleOf72Years,
  resolveEmergencyFundExpenses,
  sumRefinanceBalance,
  summarizeLoanCosts,
} from "../utils/chartCalculators";
import type { LoanScheduleRow } from "../utils/chartCalculators";
import {
  buildCategorySpendOptions,
  buildSavingsGrowthMarks,
  calcDebtRedirectImpact,
  calcRedirectSliderMax,
  formatWhatIfMonths,
  WHAT_IF_DEFAULT_RETURN_RATE,
  WHAT_IF_LOOKBACK_MONTHS,
} from "../utils/whatIfSpending";
import type { CategorySpendOption } from "../utils/whatIfSpending";
import type { PayoffMethod } from "../utils/calculations";
import { getCategoryIcon } from "../data/categoryIcons";
import { useCurrency } from "../currency/CurrencyProvider";
import { convertAmount, USD_EXCHANGE_RATES } from "../utils/currencyConversion";
import { getConverterRates } from "../utils/exchangeRates";
import type { RatesSnapshot } from "../utils/exchangeRates";
import {
  crossRate,
  describeRatesSnapshot,
  EXCHANGE_CURRENCIES,
  formatAmountInCurrency,
  formatCrossRate,
  parseAmountInput,
} from "../utils/exchangeCalculator";
import { getBudgetEntries } from "../storage/budgetStorage";
import { getSavingsGoals } from "../storage/savingsGoalStorage";
import { getAssetAccounts } from "../storage/assetAccountStorage";
import { resolveEmergencyFundAmount } from "../utils/emergencyFund";
import { getDebts } from "../storage/debtStorage";
import { getCustomCategories } from "../storage/customCategoriesStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import { calcMonthlyCashFlow } from "../utils/purchasePlanner";
import type { MonthlyCashFlow } from "../utils/purchasePlanner";
import PurchasePlannerCard from "../components/PurchasePlannerCard";
import TaxCalculatorCard from "../components/TaxCalculatorCard";
import type {
  AssetAccount,
  ChapterId,
  CustomCategory,
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

/* ── Loan Calculator Config ── */

const LOAN_SLIDERS: Record<"loanAmount" | "loanRate" | "loanTerm", SliderConfig> = {
  loanAmount: { label: "Loan Amount", min: 1000, max: 1000000, step: 1000 },
  loanRate: { label: "Interest Rate (APR)", min: 0.5, max: 30, step: 0.25 },
  loanTerm: { label: "Loan Term", min: 1, max: 30, step: 1 },
};

const LOAN_TERM_PRESETS = [15, 20, 30] as const;
const LOAN_SCHEDULE_PAGE_SIZE = 12;

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
  const { formatCurrency, formatCompactCurrency, preference } = useCurrency();
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

  /* Loan calculator state */
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState(300000);
  const [loanRate, setLoanRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const loanEditor = useSliderValueEditor({
    loanAmount: { ...LOAN_SLIDERS.loanAmount, set: setLoanAmount, commitMode: "round-int" },
    loanRate: {
      ...LOAN_SLIDERS.loanRate,
      set: setLoanRate,
      decimal: true,
      commitMode: "snap-step-2dp",
    },
    loanTerm: { ...LOAN_SLIDERS.loanTerm, set: setLoanTerm, commitMode: "round-int" },
  });
  const [loanYearlySummaryOpen, setLoanYearlySummaryOpen] = useState(true);
  const [loanScheduleVisibleRows, setLoanScheduleVisibleRows] = useState(LOAN_SCHEDULE_PAGE_SIZE);
  const [isLoanExporting, setIsLoanExporting] = useState(false);
  const [loanExportMessage, setLoanExportMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  /* "What If I Stopped Spending on X" state */
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfOptions, setWhatIfOptions] = useState<CategorySpendOption[]>([]);
  const [whatIfCategory, setWhatIfCategory] = useState<string | null>(null);
  const [whatIfAmount, setWhatIfAmount] = useState(0);
  const [whatIfMethod, setWhatIfMethod] = useState<PayoffMethod>("avalanche");
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  /* Currency exchange calculator state. From/To start as null ("not chosen
   * yet"): From follows the user's display currency and To its natural
   * counterpart until a chip is tapped, so the tool opens ready to use. */
  const [fxOpen, setFxOpen] = useState(false);
  const [fxAmountText, setFxAmountText] = useState("100");
  const [fxFrom, setFxFrom] = useState<string | null>(null);
  const [fxTo, setFxTo] = useState<string | null>(null);
  const [fxSnapshot, setFxSnapshot] = useState<RatesSnapshot | null>(null);
  /* "Rates updated X ago" - stamped when a snapshot lands (render must stay
   * pure, so the age is not computed inline). Re-stamped on every open. */
  const [fxRatesLabel, setFxRatesLabel] = useState<string | null>(null);
  const [fxRefreshing, setFxRefreshing] = useState(false);

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

  /* ── Loan calculator logic ── */

  const toggleLoan = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoanOpen((prev) => !prev);
  }, []);

  const loanMonthlyPayment = useMemo(
    () => calcPaymentForGoalDate(loanAmount, loanRate, loanTerm * 12),
    [loanAmount, loanRate, loanTerm]
  );
  const loanSchedule = useMemo<LoanScheduleRow[]>(
    () =>
      isFinite(loanMonthlyPayment)
        ? generatePayoffSchedule(loanAmount, loanRate, loanMonthlyPayment)
        : [],
    [loanAmount, loanMonthlyPayment, loanRate]
  );
  const loanYearlySummary = useMemo(
    () => buildLoanYearlySummary(loanSchedule),
    [loanSchedule]
  );
  const {
    totalPaid: loanTotalPaid,
    totalInterest: loanTotalInterest,
    interestFirstFiveYears: loanInterestFirstFiveYears,
    principalFirstFiveYears: loanPrincipalFirstFiveYears,
    interestFirstFiveYearsShare: loanInterestFirstFiveYearsShare,
  } = useMemo(() => summarizeLoanCosts(loanSchedule), [loanSchedule]);
  const visibleLoanSchedule = useMemo(
    () => loanSchedule.slice(0, loanScheduleVisibleRows),
    [loanSchedule, loanScheduleVisibleRows]
  );
  const hasMoreLoanScheduleRows = loanScheduleVisibleRows < loanSchedule.length;
  const canCollapseLoanSchedule = loanSchedule.length > LOAN_SCHEDULE_PAGE_SIZE;

  // Any change to the loan inputs collapses the schedule pagination and
  // clears the stale export blurb. Render-time adjustment (see
  // useValueChanged) so the reset lands in the same pass instead of
  // rendering the full stale schedule first.
  if (useValueChanged(`${loanAmount}|${loanRate}|${loanTerm}`)) {
    setLoanScheduleVisibleRows(LOAN_SCHEDULE_PAGE_SIZE);
    setLoanExportMessage(null);
  }

  const renderLoanSlider = (key: "loanAmount" | "loanRate" | "loanTerm", value: number) => {
    const cfg = LOAN_SLIDERS[key];
    const displayValue =
      key === "loanAmount"
        ? formatCurrency(value)
        : key === "loanRate"
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
        onValueChange={(val) => loanEditor.setValue(key, val)}
        onAdjust={(delta) => loanEditor.adjustBy(key, delta)}
        editor={{
          active: loanEditor.editingKey === key,
          text: loanEditor.editingText,
          decimal: key === "loanRate",
          onBegin: () => loanEditor.beginEditing(key, value),
          onChangeText: (text) => loanEditor.changeEditingText(key, text),
          onCommit: () => loanEditor.commitEditing(key),
        }}
      />
    );
  };

  const handleShowMoreLoanSchedule = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoanScheduleVisibleRows((prev) => Math.min(prev + LOAN_SCHEDULE_PAGE_SIZE, loanSchedule.length));
  }, [loanSchedule.length]);

  const handleShowLessLoanSchedule = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoanScheduleVisibleRows(LOAN_SCHEDULE_PAGE_SIZE);
  }, []);

  const toggleLoanYearlySummary = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoanYearlySummaryOpen((prev) => !prev);
  }, []);

  const handleExportLoanSchedule = useCallback(async () => {
    if (loanSchedule.length === 0 || isLoanExporting) return;

    try {
      setIsLoanExporting(true);
      setLoanExportMessage(null);

      const fileDir = Platform.OS === "ios" ? Paths.document : Paths.cache;
      const file = new ExpoFile(fileDir, buildLoanScheduleFilename());
      file.create({ overwrite: true });
      file.write(buildLoanScheduleCsv(loanSchedule), { encoding: "utf8" });

      // Deleted once the share sheet closes - no export file lingers on disk.
      await shareLocalFileThenDelete(file, {
        mimeType: "text/csv",
        dialogTitle: "Export Amortization Schedule",
        UTI: "public.comma-separated-values-text",
      });

      setLoanExportMessage({
        type: "success",
        text: "CSV export opened. Save or share it from the sheet.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Loan schedule export failed.";
      setLoanExportMessage({ type: "error", text: message });
    } finally {
      setIsLoanExporting(false);
    }
  }, [isLoanExporting, loanSchedule]);

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
          const [entries, goals, debts, customCats, storedMilestones, accounts] =
            await Promise.all([
              getBudgetEntries(),
              getSavingsGoals(),
              getDebts(),
              getCustomCategories(),
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
          setCustomCategories(customCats);
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

  /* ── What-if spending logic ── */

  const toggleWhatIf = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWhatIfOpen((prev) => !prev);
  }, []);

  const handleSelectWhatIfCategory = useCallback(
    (option: CategorySpendOption) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setWhatIfCategory(option.category);
      setWhatIfAmount(option.monthlyAverage);
    },
    []
  );

  // A category can vanish from the options after a focus reload (entries
  // deleted / aged out of the lookback window); treat that as no selection.
  const selectedWhatIfOption = useMemo(
    () => whatIfOptions.find((o) => o.category === whatIfCategory) ?? null,
    [whatIfOptions, whatIfCategory]
  );

  const whatIfSliderMax = calcRedirectSliderMax(
    selectedWhatIfOption?.monthlyAverage ?? 0
  );

  const whatIfActiveDebts = useMemo(
    () =>
      refiDebts
        .filter((d) => d.balance > 0)
        .map((d) => ({
          id: d.id,
          balance: d.balance,
          rate: d.rate,
          minPayment: d.minPayment,
          debtClass: d.debtClass,
        })),
    [refiDebts]
  );

  const whatIfDebtImpact = useMemo(
    () =>
      selectedWhatIfOption && whatIfActiveDebts.length > 0 && whatIfAmount > 0
        ? calcDebtRedirectImpact(whatIfActiveDebts, whatIfMethod, whatIfAmount)
        : null,
    [selectedWhatIfOption, whatIfActiveDebts, whatIfMethod, whatIfAmount]
  );

  const whatIfSavingsMarks = useMemo(
    () =>
      selectedWhatIfOption && whatIfAmount > 0
        ? buildSavingsGrowthMarks(whatIfAmount)
        : [],
    [selectedWhatIfOption, whatIfAmount]
  );

  /* ── Currency exchange logic ── */

  const toggleFx = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFxOpen((prev) => !prev);
  }, []);

  const applyFxSnapshot = useCallback((snapshot: RatesSnapshot) => {
    setFxSnapshot(snapshot);
    setFxRatesLabel(describeRatesSnapshot(snapshot, Date.now()));
  }, []);

  // Resolve rates when the tool opens. Cache-first: with a fresh converter
  // cache this is a pure storage read, so reopening the tool costs no
  // network call. The converter cache is deliberately separate from the
  // pinned display snapshot (see exchangeRates.ts), so nothing here can
  // move converted balances shown elsewhere in the app.
  useEffect(() => {
    if (!fxOpen) return;
    let active = true;
    void getConverterRates()
      .then((snapshot) => {
        if (active) applyFxSnapshot(snapshot);
      })
      .catch(() => {
        if (active) setFxRatesLabel("Couldn't load rates - tap Refresh to try again.");
      });
    return () => {
      active = false;
    };
  }, [fxOpen, applyFxSnapshot]);

  const handleFxRefresh = useCallback(() => {
    setFxRefreshing(true);
    void getConverterRates({ forceRefresh: true })
      .then(applyFxSnapshot)
      .catch(() =>
        setFxRatesLabel("Couldn't refresh rates - showing the last saved rates."),
      )
      .finally(() => setFxRefreshing(false));
  }, [applyFxSnapshot]);

  const fxFromCode = fxFrom ?? preference.currencyCode;
  const fxToCode = fxTo ?? (fxFromCode === "USD" ? "EUR" : "USD");

  // Memoized so the two currency grids skip re-rendering on every keystroke
  // in the amount field (see CodeChipGrid).
  const fxChipStyles = useMemo<CodeChipStyles>(
    () => ({
      wrap: tool.chipWrap,
      chip: tool.chip,
      chipActive: tool.chipActive,
      text: tool.chipText,
      textActive: tool.chipTextActive,
    }),
    [tool],
  );

  const handleFxSelectFrom = useCallback(
    (code: string) => {
      // Picking the other side's currency swaps the pair instead of
      // producing a same-to-same conversion.
      if (code === fxToCode && code !== fxFromCode) setFxTo(fxFromCode);
      setFxFrom(code);
    },
    [fxFromCode, fxToCode]
  );

  const handleFxSelectTo = useCallback(
    (code: string) => {
      if (code === fxFromCode && code !== fxToCode) setFxFrom(fxToCode);
      setFxTo(code);
    },
    [fxFromCode, fxToCode]
  );

  const handleFxSwap = useCallback(() => {
    setFxFrom(fxToCode);
    setFxTo(fxFromCode);
  }, [fxFromCode, fxToCode]);

  const fxAmount = useMemo(() => parseAmountInput(fxAmountText), [fxAmountText]);
  const fxRates = fxSnapshot?.rates ?? USD_EXCHANGE_RATES;
  const fxToCurrency =
    EXCHANGE_CURRENCIES.find((c) => c.code === fxToCode) ?? EXCHANGE_CURRENCIES[0];
  const fxConverted =
    fxAmount !== null ? convertAmount(fxAmount, fxFromCode, fxToCode, fxRates) : null;
  const fxRate = crossRate(fxFromCode, fxToCode, fxRates);

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
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>PROJECTED VALUE</Text>
              <Text style={styles.resultValue}>{formatCurrency(totalValue)}</Text>
              <Text style={styles.resultSub}>
                in today's dollars · after {years} years at {returnRate}%
              </Text>
            </View>

            {/* Rule of 72 insight */}
            {returnRate > 0 && (
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
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
              <View style={styles.presetRow}>
                {YEAR_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetBtn, years === preset && styles.presetBtnActive]}
                    onPress={() => setYears(preset)}
                  >
                    <Text style={[styles.presetBtnText, years === preset && styles.presetBtnTextActive]}>
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
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Breakdown</Text>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.success }]}>
                    {formatCurrency(totalContributed)}
                  </Text>
                  <Text style={styles.breakdownLabel}>You Contribute</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.accent }]}>
                    {formatCurrency(totalInterest)}
                  </Text>
                  <Text style={styles.breakdownLabel}>Interest Earned</Text>
                </View>
              </View>
              {totalContributed > 0 && (
                <View style={styles.ratioBar}>
                  <View
                    style={[
                      styles.ratioFillContrib,
                      { width: `${(totalContributed / totalValue) * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.ratioFillInterest,
                      { width: `${(totalInterest / totalValue) * 100}%` },
                    ]}
                  />
                </View>
              )}
              {totalContributed > 0 && (
                <Text style={styles.ratioText}>
                  Your money earned {((totalInterest / totalContributed) * 100).toFixed(0)}% more
                  through compound interest
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── Loan / Mortgage Calculator Tool ── */}
        <TouchableOpacity style={tool.toolHeader} onPress={toggleLoan} activeOpacity={0.7}>
          <View>
            <Text style={tool.toolTitle}>Loan / Mortgage Calculator</Text>
            <Text style={tool.toolHint}>See your monthly payment and total interest</Text>
          </View>
          <Text style={tool.toolChevron}>{loanOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {loanOpen && (
          <View style={tool.toolBody}>
            {/* Result */}
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>MONTHLY PAYMENT</Text>
              <Text style={styles.resultValue}>
                {isFinite(loanMonthlyPayment) ? formatCurrency(loanMonthlyPayment) : "--"}
              </Text>
              <Text style={styles.resultSub}>
                {formatCurrency(loanAmount)} loan · {loanRate}% APR · {loanTerm} years
              </Text>
            </View>

            {/* Sliders */}
            <View style={tool.slidersCard}>
              {renderLoanSlider("loanAmount", loanAmount)}
              {renderLoanSlider("loanRate", loanRate)}
              {renderLoanSlider("loanTerm", loanTerm)}

              <View style={styles.presetRow}>
                {LOAN_TERM_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetBtn, loanTerm === preset && styles.presetBtnActive]}
                    onPress={() => setLoanTerm(preset)}
                  >
                    <Text style={[styles.presetBtnText, loanTerm === preset && styles.presetBtnTextActive]}>
                      {preset}yr
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Breakdown */}
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Cost Breakdown</Text>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.success }]}>
                    {formatCurrency(loanAmount)}
                  </Text>
                  <Text style={styles.breakdownLabel}>Principal</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.danger }]}>
                    {formatCurrency(loanTotalInterest)}
                  </Text>
                  <Text style={styles.breakdownLabel}>Total Interest</Text>
                </View>
              </View>
              {loanTotalPaid > 0 && (
                <View style={styles.ratioBar}>
                  <View
                    style={[
                      styles.ratioFillContrib,
                      { width: `${(loanAmount / loanTotalPaid) * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.ratioFillInterest,
                      { width: `${(loanTotalInterest / loanTotalPaid) * 100}%`, backgroundColor: colors.danger },
                    ]}
                  />
                </View>
              )}
              {loanTotalPaid > 0 && (
                <Text style={styles.ratioText}>
                  You'll pay {formatCurrency(loanTotalPaid)} total over {loanTerm} years
                </Text>
              )}
            </View>

            {/* First-5-years highlight */}
            <View style={styles.loanHighlightCard}>
              <Text style={styles.resultLabel}>INTEREST IN FIRST 5 YEARS</Text>
              <Text style={[styles.loanHighlightValue, { color: colors.danger }]}>
                {formatCurrency(loanInterestFirstFiveYears)}
              </Text>
              <Text style={styles.loanHighlightText}>
                {loanSchedule.length >= 60
                  ? `${(loanInterestFirstFiveYearsShare * 100).toFixed(0)}% of your total interest is paid in the first 60 months.`
                  : "This loan ends before year 5, so this reflects the full-term interest cost."}
              </Text>
              <Text style={styles.loanHighlightSubtext}>
                Principal paid in that span: {formatCurrency(loanPrincipalFirstFiveYears)}
              </Text>
            </View>

            {/* Yearly summary */}
            <View style={styles.scheduleCard}>
              <TouchableOpacity
                style={styles.scheduleHeader}
                onPress={toggleLoanYearlySummary}
                activeOpacity={0.7}
              >
                <View style={styles.scheduleHeaderTextWrap}>
                  <Text style={styles.breakdownTitle}>Yearly Summary</Text>
                  <Text style={styles.scheduleHint}>
                    Groups every 12 payments from the loan start. Final year may be shorter.
                  </Text>
                </View>
                <View style={styles.scheduleHeaderActions}>
                  <Text style={styles.scheduleMeta}>{loanYearlySummary.length} yr</Text>
                  <Text style={styles.scheduleChevron}>{loanYearlySummaryOpen ? "▾" : "›"}</Text>
                </View>
              </TouchableOpacity>

              {loanYearlySummaryOpen && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.scheduleTable}>
                    <View style={[styles.scheduleRow, styles.scheduleHeaderRow]}>
                      <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleMonthCell]}>
                        Year
                      </Text>
                      <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                        Payments
                      </Text>
                      <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                        Principal
                      </Text>
                      <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                        Interest
                      </Text>
                      <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleBalanceCell]}>
                        End Balance
                      </Text>
                    </View>

                    {loanYearlySummary.map((row, index) => {
                      const isLastRow = index === loanYearlySummary.length - 1;
                      return (
                        <View key={row.year} style={[styles.scheduleRow, isLastRow && styles.scheduleRowLast]}>
                          <Text style={[styles.scheduleCell, styles.scheduleMonthCell]}>{row.year}</Text>
                          <Text style={[styles.scheduleCell, styles.scheduleValueCell]}>
                            {formatCurrency(row.payment)}
                          </Text>
                          <Text style={[styles.scheduleCell, styles.scheduleValueCell, { color: colors.success }]}>
                            {formatCurrency(row.principal)}
                          </Text>
                          <Text style={[styles.scheduleCell, styles.scheduleValueCell, { color: colors.danger }]}>
                            {formatCurrency(row.interest)}
                          </Text>
                          <Text style={[styles.scheduleCell, styles.scheduleBalanceCell]}>
                            {formatCurrency(row.endingBalance)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Amortization schedule */}
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <View style={styles.scheduleHeaderTextWrap}>
                  <Text style={styles.breakdownTitle}>Amortization Schedule</Text>
                  <Text style={styles.scheduleHint}>
                    Month-by-month payment, principal, interest, and remaining balance.
                  </Text>
                </View>
                <Text style={styles.scheduleMeta}>{loanSchedule.length} mo</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.scheduleTable}>
                  <View style={[styles.scheduleRow, styles.scheduleHeaderRow]}>
                    <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleMonthCell]}>
                      Month
                    </Text>
                    <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                      Payment
                    </Text>
                    <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                      Principal
                    </Text>
                    <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleValueCell]}>
                      Interest
                    </Text>
                    <Text style={[styles.scheduleCell, styles.scheduleHeaderCell, styles.scheduleBalanceCell]}>
                      Balance
                    </Text>
                  </View>

                  {visibleLoanSchedule.map((row, index) => {
                    const payment = row.principalPaid + row.interestPaid;
                    const isLastVisibleRow = index === visibleLoanSchedule.length - 1;
                    return (
                      <View
                        key={row.month}
                        style={[styles.scheduleRow, isLastVisibleRow && styles.scheduleRowLast]}
                      >
                        <Text style={[styles.scheduleCell, styles.scheduleMonthCell]}>{row.month}</Text>
                        <Text style={[styles.scheduleCell, styles.scheduleValueCell]}>
                          {formatCurrency(payment)}
                        </Text>
                        <Text style={[styles.scheduleCell, styles.scheduleValueCell, { color: colors.success }]}>
                          {formatCurrency(row.principalPaid)}
                        </Text>
                        <Text style={[styles.scheduleCell, styles.scheduleValueCell, { color: colors.danger }]}>
                          {formatCurrency(row.interestPaid)}
                        </Text>
                        <Text style={[styles.scheduleCell, styles.scheduleBalanceCell]}>
                          {formatCurrency(row.balance)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.scheduleFooter}>
                <Text style={styles.scheduleFooterText}>
                  Showing {visibleLoanSchedule.length} of {loanSchedule.length} months
                </Text>
                <View style={styles.scheduleActions}>
                  <TouchableOpacity
                    style={styles.scheduleMoreBtn}
                    onPress={handleExportLoanSchedule}
                    disabled={isLoanExporting || loanSchedule.length === 0}
                  >
                    <Text style={styles.scheduleMoreBtnText}>
                      {isLoanExporting ? "Preparing CSV..." : "Export CSV"}
                    </Text>
                  </TouchableOpacity>
                  {hasMoreLoanScheduleRows ? (
                    <TouchableOpacity style={styles.scheduleMoreBtn} onPress={handleShowMoreLoanSchedule}>
                      <Text style={styles.scheduleMoreBtnText}>
                        Show {Math.min(LOAN_SCHEDULE_PAGE_SIZE, loanSchedule.length - loanScheduleVisibleRows)} more
                      </Text>
                    </TouchableOpacity>
                  ) : canCollapseLoanSchedule ? (
                    <TouchableOpacity style={styles.scheduleMoreBtn} onPress={handleShowLessLoanSchedule}>
                      <Text style={styles.scheduleMoreBtnText}>Show less</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              {loanExportMessage && (
                <Text
                  style={[
                    styles.scheduleStatus,
                    { color: loanExportMessage.type === "error" ? colors.danger : colors.success },
                  ]}
                >
                  {loanExportMessage.text}
                </Text>
              )}
            </View>
          </View>
        )}

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
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>BREAK-EVEN</Text>
              {!hasRefiSelection ? (
                <>
                  <Text style={[styles.resultValue, { color: colors.textDim }]}>
                    --
                  </Text>
                  <Text style={styles.resultSub}>
                    Pick at least one debt below to see the comparison.
                  </Text>
                </>
              ) : refiBreakEvenMonths !== null && isFinite(refiBreakEvenMonths) ? (
                <>
                  <Text style={styles.resultValue}>
                    {Math.ceil(refiBreakEvenMonths)} mo
                  </Text>
                  <Text style={styles.resultSub}>
                    {refiBreakEvenMonths >= 12
                      ? `~${(refiBreakEvenMonths / 12).toFixed(1)} years to recover ${formatCurrency(refiClosingCosts)} in closing costs`
                      : `${formatCurrency(refiClosingCosts)} in closing costs recovered in under a year`}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.resultValue, { color: colors.danger }]}>--</Text>
                  <Text style={styles.resultSub}>
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
                <Text style={styles.refiEmptyText}>
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
                <View style={styles.refiSummaryRow}>
                  <View style={styles.refiSummaryItem}>
                    <Text style={styles.refiSummaryLabel}>Combined balance</Text>
                    <Text style={styles.refiSummaryValue}>
                      {formatCurrency(refiBalance)}
                    </Text>
                  </View>
                  <View style={styles.breakdownDivider} />
                  <View style={styles.refiSummaryItem}>
                    <Text style={styles.refiSummaryLabel}>
                      {selectedRefiDebts.length > 1 ? "Weighted APR" : "APR"}
                    </Text>
                    <Text style={styles.refiSummaryValue}>
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
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Monthly Payment</Text>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.textDim }]}>
                    {isFinite(refiCurrentMonthlyPayment)
                      ? formatCurrency(refiCurrentMonthlyPayment)
                      : "--"}
                  </Text>
                  <Text style={styles.breakdownLabel}>Current</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.accent }]}>
                    {isFinite(refiNewMonthlyPayment)
                      ? formatCurrency(refiNewMonthlyPayment)
                      : "--"}
                  </Text>
                  <Text style={styles.breakdownLabel}>New</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.ratioText,
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
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Lifetime Interest</Text>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.textDim }]}>
                    {formatCurrency(refiCurrentTotalInterest)}
                  </Text>
                  <Text style={styles.breakdownLabel}>Keep current</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.accent }]}>
                    {formatCurrency(refiNewTotalInterest)}
                  </Text>
                  <Text style={styles.breakdownLabel}>Refinance</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.ratioText,
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
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
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
                  styles.insightCard,
                  { backgroundColor: `${colors.warning}15` },
                ]}
              >
                <Text style={styles.insightText}>
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
                    <Text style={styles.efTimeEstimate}>
                      ~{efMonthsToThree} {efMonthsToThree === 1 ? "month" : "months"} to reach at {formatCurrency(efMonthlySavings)}/mo
                    </Text>
                  )}
                  {efThreeProgress >= 1 && (
                    <Text style={[styles.efTimeEstimate, { color: colors.success }]}>
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
                    <Text style={styles.efTimeEstimate}>
                      ~{efMonthsToSix} {efMonthsToSix === 1 ? "month" : "months"} to reach at {formatCurrency(efMonthlySavings)}/mo
                    </Text>
                  )}
                  {efSixProgress >= 1 && (
                    <Text style={[styles.efTimeEstimate, { color: colors.success }]}>
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
                <View style={styles.insightCard}>
                  <Text style={styles.insightText}>
                    A common target is 3-6 months of living expenses in cash. That can cover job loss, medical emergencies, or unexpected repairs without new debt. Your situation may differ.
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Currency Exchange Tool ── */}
        <TouchableOpacity style={tool.toolHeader} onPress={toggleFx} activeOpacity={0.7}>
          <View>
            <Text style={tool.toolTitle}>Currency Exchange</Text>
            <Text style={tool.toolHint}>Convert an amount between currencies</Text>
          </View>
          <Text style={tool.toolChevron}>{fxOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {fxOpen && (
          <View style={tool.toolBody}>
            {/* Result */}
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>CONVERTED VALUE</Text>
              <Text style={styles.resultValue}>
                {fxConverted !== null
                  ? formatAmountInCurrency(fxConverted, fxToCurrency)
                  : "--"}
              </Text>
              <Text style={styles.resultSub}>
                1 {fxFromCode} = {formatCrossRate(fxRate)} {fxToCode}
              </Text>
            </View>

            {/* Amount + currency pickers */}
            <View style={tool.efCard}>
              <Text style={tool.efSectionTitle}>Amount</Text>
              <TextInput
                style={tool.input}
                placeholder="Amount to convert"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={fxAmountText}
                onChangeText={setFxAmountText}
              />

              <Text style={tool.efSectionTitle}>From</Text>
              <CodeChipGrid
                options={EXCHANGE_CURRENCIES}
                selected={fxFromCode}
                onSelect={handleFxSelectFrom}
                styles={fxChipStyles}
                keyPrefix="fx-from-"
              />

              <TouchableOpacity
                style={styles.fxSwapBtn}
                onPress={handleFxSwap}
                activeOpacity={0.7}
              >
                <Text style={styles.fxSwapBtnText}>⇅ Swap</Text>
              </TouchableOpacity>

              <Text style={tool.efSectionTitle}>To</Text>
              <CodeChipGrid
                options={EXCHANGE_CURRENCIES}
                selected={fxToCode}
                onSelect={handleFxSelectTo}
                styles={fxChipStyles}
                keyPrefix="fx-to-"
              />
            </View>

            {/* Rates freshness + manual refresh */}
            {fxRatesLabel !== null && (
              <View style={styles.fxRatesRow}>
                <Text style={tool.efAutoHint}>{fxRatesLabel}</Text>
                <TouchableOpacity
                  onPress={handleFxRefresh}
                  disabled={fxRefreshing}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.fxRefreshText, fxRefreshing && styles.fxRefreshDisabled]}
                  >
                    {fxRefreshing ? "Refreshing…" : "↻ Refresh rates"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Privacy note */}
            <View style={styles.insightCard}>
              <Text style={styles.insightText}>
                Rates come from a free public exchange-rate service, typically updated once a day. Only the request for the day's rate table leaves your phone - never your amounts.
              </Text>
            </View>
          </View>
        )}

        {/* ── "What If I Stopped Spending on X" Tool ── */}
        <TouchableOpacity style={tool.toolHeader} onPress={toggleWhatIf} activeOpacity={0.7}>
          <View>
            <Text style={tool.toolTitle}>What If I Stopped Spending on…</Text>
            <Text style={tool.toolHint}>Redirect a category toward debt or savings</Text>
          </View>
          <Text style={tool.toolChevron}>{whatIfOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {whatIfOpen && (
          <View style={tool.toolBody}>
            {whatIfOptions.length === 0 ? (
              <View style={tool.efCard}>
                <Text style={styles.refiEmptyText}>
                  Log a few months of expenses in the Budget tab, then come back to see what redirecting a category could do.
                </Text>
              </View>
            ) : (
              <>
                {/* Category picker */}
                <View style={tool.efCard}>
                  <Text style={tool.efSectionTitle}>Pick a category</Text>
                  <Text style={tool.efAutoHint}>
                    Monthly averages from your last {WHAT_IF_LOOKBACK_MONTHS} months of entries
                  </Text>
                  <View style={tool.chipWrap}>
                    {whatIfOptions.map((option) => {
                      const isSelected = option.category === whatIfCategory;
                      return (
                        <TouchableOpacity
                          key={option.category}
                          style={[tool.chip, isSelected && tool.chipActive]}
                          onPress={() => handleSelectWhatIfCategory(option)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              tool.chipText,
                              isSelected && tool.chipTextActive,
                            ]}
                          >
                            {getCategoryIcon(option.category, customCategories)} {option.category}
                          </Text>
                          <Text
                            style={[
                              styles.whatIfChipAmount,
                              isSelected && tool.chipTextActive,
                            ]}
                          >
                            {formatCurrency(option.monthlyAverage)}/mo
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {selectedWhatIfOption && (
                  <>
                    {/* Redirect amount */}
                    <View style={tool.slidersCard}>
                      <SliderRow
                        label="Monthly Amount to Redirect"
                        value={whatIfAmount}
                        min={0}
                        max={whatIfSliderMax}
                        step={5}
                        displayValue={formatCurrency(whatIfAmount)}
                        onValueChange={setWhatIfAmount}
                        onAdjust={(delta) =>
                          setWhatIfAmount((p) =>
                            Math.max(0, Math.min(whatIfSliderMax, p + delta * 25)),
                          )
                        }
                      >
                        <Text style={tool.efAutoHint}>
                          You average {formatCurrency(selectedWhatIfOption.monthlyAverage)}/mo on {selectedWhatIfOption.category}
                        </Text>
                      </SliderRow>
                    </View>

                    {/* Debt payoff impact */}
                    {whatIfDebtImpact && (
                      <View style={tool.efCard}>
                        <Text style={tool.efSectionTitle}>Put it toward debt</Text>
                        <View style={styles.whatIfMethodRow}>
                          {(["avalanche", "snowball"] as const).map((method) => (
                            <TouchableOpacity
                              key={method}
                              style={[
                                styles.whatIfMethodBtn,
                                whatIfMethod === method && styles.whatIfMethodBtnActive,
                              ]}
                              onPress={() => setWhatIfMethod(method)}
                            >
                              <Text
                                style={[
                                  styles.whatIfMethodBtnText,
                                  whatIfMethod === method && styles.whatIfMethodBtnTextActive,
                                ]}
                              >
                                {method === "avalanche" ? "Avalanche" : "Snowball"}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={styles.refiSummaryRow}>
                          <View style={styles.refiSummaryItem}>
                            <Text style={styles.refiSummaryLabel}>Current plan</Text>
                            <Text style={styles.refiSummaryValue}>
                              {formatWhatIfMonths(whatIfDebtImpact.baseline.monthsToPayoff)}
                            </Text>
                          </View>
                          <View style={styles.refiSummaryItem}>
                            <Text style={styles.refiSummaryLabel}>Redirecting</Text>
                            <Text style={[styles.refiSummaryValue, { color: colors.accent }]}>
                              {formatWhatIfMonths(whatIfDebtImpact.redirect.monthsToPayoff)}
                            </Text>
                          </View>
                        </View>
                        {whatIfDebtImpact.monthsSaved === Infinity ? (
                          <Text style={[styles.efTimeEstimate, { color: colors.success }]}>
                            This extra payment turns an unpayable plan into a real payoff date.
                          </Text>
                        ) : !whatIfDebtImpact.redirect.isPayoffPossible ? (
                          <Text style={styles.efTimeEstimate}>
                            Minimums plus this extra still don&apos;t cover the interest - try a larger amount.
                          </Text>
                        ) : whatIfDebtImpact.monthsSaved > 0 ? (
                          <Text style={[styles.efTimeEstimate, { color: colors.success }]}>
                            Debt-free {formatWhatIfMonths(whatIfDebtImpact.monthsSaved)} sooner
                            {whatIfDebtImpact.interestSaved >= 1
                              ? ` · saves ${formatCurrency(Math.round(whatIfDebtImpact.interestSaved))} in interest`
                              : ""}
                          </Text>
                        ) : null}
                      </View>
                    )}

                    {/* Savings growth */}
                    <View style={tool.efCard}>
                      <Text style={tool.efSectionTitle}>
                        {whatIfDebtImpact ? "…or grow it in savings" : "Grow it in savings"}
                      </Text>
                      {whatIfActiveDebts.length === 0 && (
                        <Text style={tool.efAutoHint}>
                          No active debts to pay down - showing savings growth only.
                        </Text>
                      )}
                      {whatIfSavingsMarks.map((mark) => (
                        <View key={mark.years} style={styles.whatIfGrowthRow}>
                          <Text style={styles.whatIfGrowthLabel}>
                            In {mark.years} {mark.years === 1 ? "year" : "years"}
                          </Text>
                          <View style={styles.whatIfGrowthValueWrap}>
                            <Text style={styles.whatIfGrowthValue}>
                              {formatCurrency(mark.futureValue)}
                            </Text>
                            {mark.growth > 0 && (
                              <Text style={styles.whatIfGrowthSub}>
                                +{formatCurrency(mark.growth)} from returns
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                      <Text style={tool.efAutoHint}>
                        Assumes a {WHAT_IF_DEFAULT_RETURN_RATE}% average annual return, compounded monthly.
                      </Text>
                    </View>

                    {/* Educational note */}
                    <View style={styles.insightCard}>
                      <Text style={styles.insightText}>
                        These are estimates, not guarantees - spending rarely drops to zero, and market returns vary. Even redirecting half a category can move your timeline meaningfully.
                      </Text>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        )}

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
    resultCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: tokens.radius + 4,
      padding: tokens.padLg,
      alignItems: "center",
    },
    resultLabel: {
      fontSize: scale(10),
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    resultValue: {
      fontSize: scale(32),
      fontWeight: "700",
      color: colors.accent,
      fontVariant: ["tabular-nums"],
      marginBottom: 4,
    },
    resultSub: {
      fontSize: 13,
      color: colors.textDim,
      textAlign: "center",
    },

    /* Rule of 72 insight */
    insightCard: {
      backgroundColor: `${colors.accent}10`,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    insightText: {
      fontSize: 13,
      color: colors.textDim,
      textAlign: "center",
      lineHeight: 18,
    },

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

    /* Sliders */

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
    presetRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    presetBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    presetBtnActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    presetBtnText: {
      fontSize: 13,
      color: colors.textDim,
      fontWeight: "600",
    },
    presetBtnTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },

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
    breakdownCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 18,
    },
    breakdownTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 14,
    },
    breakdownRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    breakdownItem: {
      flex: 1,
      alignItems: "center",
    },
    breakdownValue: {
      fontSize: 18,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      marginBottom: 4,
    },
    breakdownLabel: {
      fontSize: 12,
      color: colors.textDim,
    },
    breakdownDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.cardBorder,
    },
    ratioBar: {
      flexDirection: "row",
      height: 8,
      borderRadius: tokens.radiusPill,
      overflow: "hidden",
      marginTop: 16,
    },
    ratioFillContrib: {
      height: "100%",
      backgroundColor: colors.success,
    },
    ratioFillInterest: {
      height: "100%",
      backgroundColor: colors.accent,
    },
    ratioText: {
      fontSize: 12,
      color: colors.textDim,
      textAlign: "center",
      marginTop: 10,
    },

    /* Loan highlights + schedule */
    loanHighlightCard: {
      backgroundColor: `${colors.danger}12`,
      borderWidth: 1,
      borderColor: `${colors.danger}35`,
      borderRadius: 16,
      padding: 18,
      alignItems: "center",
      gap: 6,
    },
    loanHighlightValue: {
      fontSize: scale(28),
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      textAlign: "center",
    },
    loanHighlightText: {
      fontSize: 13,
      color: colors.textDim,
      lineHeight: 18,
      textAlign: "center",
    },
    loanHighlightSubtext: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
    },
    scheduleCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 18,
      gap: 12,
    },
    scheduleHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    scheduleHeaderTextWrap: {
      flex: 1,
    },
    scheduleHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 2,
    },
    scheduleHint: {
      fontSize: 12,
      color: colors.textDim,
      lineHeight: 17,
      marginTop: -6,
    },
    scheduleMeta: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      marginTop: 2,
    },
    scheduleChevron: {
      fontSize: 16,
      color: colors.textDim,
      fontWeight: "700",
      lineHeight: 18,
    },
    scheduleTable: {
      minWidth: 560,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      overflow: "hidden",
    },
    scheduleRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    scheduleHeaderRow: {
      backgroundColor: colors.bg,
    },
    scheduleRowLast: {
      borderBottomWidth: 0,
    },
    scheduleCell: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 12,
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    scheduleHeaderCell: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    scheduleMonthCell: {
      width: 64,
    },
    scheduleValueCell: {
      width: 120,
      textAlign: "right",
    },
    scheduleBalanceCell: {
      width: 136,
      textAlign: "right",
    },
    scheduleFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    scheduleFooterText: {
      fontSize: 12,
      color: colors.textDim,
    },
    scheduleActions: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },
    scheduleMoreBtn: {
      borderWidth: 1,
      borderColor: `${colors.accent}40`,
      backgroundColor: `${colors.accent}12`,
      borderRadius: tokens.radiusPill,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    scheduleMoreBtnText: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: "700",
    },
    scheduleStatus: {
      fontSize: 12,
      lineHeight: 17,
    },

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
    refiEmptyText: {
      fontSize: 13,
      color: colors.textMuted,
      paddingVertical: 8,
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
    refiSummaryRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    refiSummaryItem: {
      flex: 1,
      alignItems: "center",
    },
    refiSummaryLabel: {
      fontSize: 11,
      color: colors.textDim,
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    refiSummaryValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
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
    efTimeEstimate: {
      fontSize: scale(12),
      color: colors.textMuted,
      textAlign: "center",
    },

    /* Currency Exchange */
    fxSwapBtn: {
      alignSelf: "center",
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginVertical: 2,
    },
    fxSwapBtnText: {
      fontSize: scale(13),
      color: colors.accent,
      fontWeight: "600",
    },
    fxRatesRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 4,
    },
    fxRefreshText: {
      fontSize: scale(12),
      color: colors.accent,
      fontWeight: "600",
    },
    fxRefreshDisabled: {
      opacity: 0.5,
    },

    /* "What If I Stopped Spending on X" */
    whatIfChipAmount: {
      fontSize: scale(11),
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
      marginTop: 2,
    },
    whatIfMethodRow: {
      flexDirection: "row",
      gap: 8,
    },
    whatIfMethodBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: "center",
    },
    whatIfMethodBtnActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}15`,
    },
    whatIfMethodBtnText: {
      fontSize: scale(12),
      color: colors.textDim,
      fontWeight: "600",
    },
    whatIfMethodBtnTextActive: {
      color: colors.accent,
    },
    whatIfGrowthRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    whatIfGrowthLabel: {
      fontSize: scale(13),
      color: colors.textDim,
    },
    whatIfGrowthValueWrap: {
      alignItems: "flex-end",
    },
    whatIfGrowthValue: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    whatIfGrowthSub: {
      fontSize: scale(11),
      color: colors.success,
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
