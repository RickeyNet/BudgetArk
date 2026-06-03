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
import { shareLocalFile } from "../utils/iosNativeShare";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Defs, LinearGradient, Stop, Path, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_BASE_HEIGHT } from "../navigation/tabBarLayout";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useTabCoachmark } from "../onboarding/useTabCoachmark";
import { useCoachmarkAnchor } from "../onboarding/CoachmarkAnchorContext";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  calcInvestmentTimeline,
  calcMonthsUntilDate,
  calcPaymentForGoalDate,
  generatePayoffSchedule,
} from "../utils/calculations";
import { useCurrency } from "../currency/CurrencyProvider";
import { getBudgetEntries } from "../storage/budgetStorage";
import { getSavingsGoals } from "../storage/savingsGoalStorage";
import { getDebts } from "../storage/debtStorage";
import type {
  BudgetEntry,
  ChapterId,
  Debt,
  LearningProgress,
  LessonStub,
  LessonTopic,
  RootTabParamList,
} from "../types";
import { LESSON_TOPICS } from "../types";
import { isEntryActiveInMonth } from "../utils/recurrence";
import SmoothSlider from "../components/SmoothSlider";
import { CHAPTERS } from "../data/lessonChapters";
import { LEARNING_DISCLAIMER } from "../data/learningDisclaimer";
import {
  getChapterProgress,
  getOverallProgress,
  hasLessonBody,
  pickResumeLesson,
} from "../data/lessonIndex";
import { getLearningProgress } from "../storage/learningProgressStorage";
import LessonScreen from "../lessons/LessonScreen";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

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

type LoanScheduleRow = {
  month: number;
  balance: number;
  interestPaid: number;
  principalPaid: number;
};

const csvEscape = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const buildLoanScheduleCsv = (
  schedule: ReadonlyArray<LoanScheduleRow>
): string => {
  const lines = [
    ["Year", "Month", "Payment", "Principal", "Interest", "RemainingBalance"].join(","),
    ...schedule.map((row) =>
      [
        Math.ceil(row.month / 12),
        row.month,
        (row.principalPaid + row.interestPaid).toFixed(2),
        row.principalPaid.toFixed(2),
        row.interestPaid.toFixed(2),
        row.balance.toFixed(2),
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];

  return lines.join("\n");
};

const buildLoanScheduleFilename = (): string => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `budgetark-amortization-${stamp}.csv`;
};

/* ── Emergency Fund Helpers ── */

const getMonthKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

const calcAvgMonthlyExpenses = (entries: BudgetEntry[]): number => {
  const now = new Date();
  const monthTotals: Record<string, number> = {};
  const monthsTracked = new Set<string>();

  // Look at the last 6 months (excluding current since it may be incomplete)
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthTotals[getMonthKey(d)] = 0;
  }

  // A month with *any* entry (expense or income, recurring or not) is a
  // month the user was actively tracking. We previously only counted
  // months with expense > 0, which biased the average upward - a month
  // where the user paid $0 in expenses but logged income still says "I
  // was tracking, my expenses really were zero," and dropping it from
  // the denominator made historical EF targets larger than necessary.
  for (const entry of entries) {
    for (const mk of Object.keys(monthTotals)) {
      if (!isEntryActiveInMonth(entry, mk)) continue;
      monthsTracked.add(mk);
      if (entry.type === "expense") monthTotals[mk] += entry.amount;
    }
  }

  if (monthsTracked.size === 0) return 0;
  const sum = Array.from(monthsTracked).reduce(
    (acc, mk) => acc + (monthTotals[mk] ?? 0),
    0
  );
  return Math.round(sum / monthsTracked.size);
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

/* ── Main Screen ── */

const ChartsScreen: React.FC = () => {
  const { colors, showAmbientBackground } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const coachmark = useTabCoachmark("Utilities");
  const scrollRef = useRef<ScrollView>(null);
  const anchorUtilitiesTool = useCoachmarkAnchor("utilities-tool-header", { scrollRef });
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  /* Compound interest calculator state */
  const [calcOpen, setCalcOpen] = useState(false);
  const [contribution, setContribution] = useState(500);
  const [returnRate, setReturnRate] = useState(7);
  const [years, setYears] = useState(20);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showWhyCard, setShowWhyCard] = useState(false);

  /* Loan calculator state */
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState(300000);
  const [loanRate, setLoanRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [loanEditingKey, setLoanEditingKey] = useState<string | null>(null);
  const [loanEditingText, setLoanEditingText] = useState("");
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
  const [refiEditingKey, setRefiEditingKey] = useState<RefiKey | null>(null);
  const [refiEditingText, setRefiEditingText] = useState("");
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
  const [efTargetAmount, setEfTargetAmount] = useState(0);
  const [efDataLoaded, setEfDataLoaded] = useState(false);

  /* Learning progress (Captain's Course card). Refreshes on focus so
   * completion progress and the Resume pointer update after a user finishes
   * a lesson and returns to the Charts tab. Also refreshed on lesson-modal
   * close since the modal sits on top of this screen (no focus event fires). */
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [openLessonStub, setOpenLessonStub] = useState<LessonStub | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<ChapterId>>(
    () => new Set()
  );
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

  const completedLessonsMap = learningProgress?.completedLessons ?? {};
  const overallProgress = useMemo(
    () => getOverallProgress(completedLessonsMap),
    [completedLessonsMap]
  );
  const chapterProgressRows = useMemo(
    () => getChapterProgress(completedLessonsMap),
    [completedLessonsMap]
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
  const doublingYears = returnRate > 0 ? Math.round(72 / returnRate) : 0;

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
    () =>
      Array.from({ length: Math.ceil(loanSchedule.length / 12) }, (_, index) => {
        const start = index * 12;
        const chunk = loanSchedule.slice(start, start + 12);
        const payment = chunk.reduce(
          (sum, row) => sum + row.principalPaid + row.interestPaid,
          0
        );
        const principal = chunk.reduce((sum, row) => sum + row.principalPaid, 0);
        const interest = chunk.reduce((sum, row) => sum + row.interestPaid, 0);
        return {
          year: index + 1,
          payment,
          principal,
          interest,
          endingBalance: chunk[chunk.length - 1]?.balance ?? 0,
        };
      }),
    [loanSchedule]
  );
  const loanTotalPaid = useMemo(
    () =>
      loanSchedule.reduce(
        (sum, row) => sum + row.principalPaid + row.interestPaid,
        0
      ),
    [loanSchedule]
  );
  const loanTotalInterest = useMemo(
    () => loanSchedule.reduce((sum, row) => sum + row.interestPaid, 0),
    [loanSchedule]
  );
  const loanFirstFiveYearsMonths = Math.min(60, loanSchedule.length);
  const loanInterestFirstFiveYears = useMemo(
    () =>
      loanSchedule
        .slice(0, loanFirstFiveYearsMonths)
        .reduce((sum, row) => sum + row.interestPaid, 0),
    [loanFirstFiveYearsMonths, loanSchedule]
  );
  const loanPrincipalFirstFiveYears = useMemo(
    () =>
      loanSchedule
        .slice(0, loanFirstFiveYearsMonths)
        .reduce((sum, row) => sum + row.principalPaid, 0),
    [loanFirstFiveYearsMonths, loanSchedule]
  );
  const loanInterestFirstFiveYearsShare =
    loanTotalInterest > 0 ? loanInterestFirstFiveYears / loanTotalInterest : 0;
  const visibleLoanSchedule = useMemo(
    () => loanSchedule.slice(0, loanScheduleVisibleRows),
    [loanSchedule, loanScheduleVisibleRows]
  );
  const hasMoreLoanScheduleRows = loanScheduleVisibleRows < loanSchedule.length;
  const canCollapseLoanSchedule = loanSchedule.length > LOAN_SCHEDULE_PAGE_SIZE;

  useEffect(() => {
    setLoanScheduleVisibleRows(LOAN_SCHEDULE_PAGE_SIZE);
    setLoanExportMessage(null);
  }, [loanAmount, loanRate, loanTerm]);

  const adjustLoan = useCallback(
    (key: "loanAmount" | "loanRate" | "loanTerm", delta: number) => {
      const cfg = LOAN_SLIDERS[key];
      const setter =
        key === "loanAmount" ? setLoanAmount : key === "loanRate" ? setLoanRate : setLoanTerm;
      setter((prev) => {
        const next = Math.round((prev + delta * cfg.step) * 100) / 100;
        return Math.max(cfg.min, Math.min(cfg.max, next));
      });
    },
    []
  );

  const handleLoanValueFocus = useCallback(
    (key: "loanAmount" | "loanRate" | "loanTerm", value: number) => {
      setLoanEditingKey(key);
      setLoanEditingText(String(value));
    },
    []
  );

  const handleLoanValueChange = useCallback(
    (key: "loanAmount" | "loanRate" | "loanTerm", text: string) => {
      if (key === "loanRate") {
        setLoanEditingText(text.replace(/[^0-9.]/g, ""));
      } else {
        setLoanEditingText(text.replace(/[^0-9]/g, ""));
      }
    },
    []
  );

  const handleLoanValueSubmit = useCallback(
    (key: "loanAmount" | "loanRate" | "loanTerm") => {
      const cfg = LOAN_SLIDERS[key];
      const parsed = parseFloat(loanEditingText);
      if (!isNaN(parsed) && parsed >= cfg.min) {
        const setter =
          key === "loanAmount" ? setLoanAmount : key === "loanRate" ? setLoanRate : setLoanTerm;
        if (key === "loanRate") {
          const snapped = Math.round(parsed / cfg.step) * cfg.step;
          setter(Math.max(cfg.min, Math.round(snapped * 100) / 100));
        } else {
          setter(Math.max(cfg.min, Math.round(parsed)));
        }
      }
      setLoanEditingKey(null);
    },
    [loanEditingText]
  );

  const handleLoanSliderChange = useCallback(
    (key: "loanAmount" | "loanRate" | "loanTerm", val: number) => {
      const setter =
        key === "loanAmount" ? setLoanAmount : key === "loanRate" ? setLoanRate : setLoanTerm;
      setter(val);
    },
    []
  );

  const renderLoanSlider = (key: "loanAmount" | "loanRate" | "loanTerm", value: number) => {
    const cfg = LOAN_SLIDERS[key];
    const displayValue =
      key === "loanAmount"
        ? formatCurrency(value)
        : key === "loanRate"
          ? `${value}%`
          : `${value} yr`;

    return (
      <View key={key} style={styles.sliderGroup}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>{cfg.label}</Text>
          {loanEditingKey === key ? (
            <TextInput
              style={[styles.sliderValue, styles.sliderValueInput, styles.sliderValueInputActive]}
              value={loanEditingText}
              onChangeText={(text) => handleLoanValueChange(key, text)}
              onBlur={() => handleLoanValueSubmit(key)}
              onSubmitEditing={() => handleLoanValueSubmit(key)}
              keyboardType={key === "loanRate" ? "decimal-pad" : "numeric"}
              returnKeyType="done"
              selectTextOnFocus
              autoFocus
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TouchableOpacity
              style={styles.sliderValueDisplay}
              onPress={() => handleLoanValueFocus(key, value)}
            >
              <Text style={styles.sliderValue}>{displayValue}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sliderRow}>
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => adjustLoan(key, -1)}
            disabled={value <= cfg.min}
          >
            <Text style={[styles.sliderBtnText, value <= cfg.min && styles.sliderBtnDisabled]}>-</Text>
          </TouchableOpacity>
          <SmoothSlider
            value={value}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            onValueChange={(val) => handleLoanSliderChange(key, val)}
            trackColor={colors.bg}
            fillColor={colors.accent}
            thumbColor={colors.accent}
            thumbBorderColor={colors.card}
          />
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => adjustLoan(key, 1)}
            disabled={value >= cfg.max}
          >
            <Text style={[styles.sliderBtnText, value >= cfg.max && styles.sliderBtnDisabled]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
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

      await shareLocalFile(file.uri, {
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

  const refiSetters: Record<RefiKey, React.Dispatch<React.SetStateAction<number>>> = {
    refiCurrentTerm: setRefiCurrentTerm,
    refiNewRate: setRefiNewRate,
    refiNewTerm: setRefiNewTerm,
    refiClosingCosts: setRefiClosingCosts,
  };

  const adjustRefi = useCallback((key: RefiKey, delta: number) => {
    const cfg = REFI_SLIDERS[key];
    refiSetters[key]((prev) => {
      const next = Math.round((prev + delta * cfg.step) * 1000) / 1000;
      return Math.max(cfg.min, Math.min(cfg.max, next));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefiSliderChange = useCallback((key: RefiKey, val: number) => {
    refiSetters[key](val);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefiValueFocus = useCallback((key: RefiKey, value: number) => {
    setRefiEditingKey(key);
    setRefiEditingText(String(value));
  }, []);

  const handleRefiValueChange = useCallback((key: RefiKey, text: string) => {
    const isDecimal = key === "refiNewRate";
    setRefiEditingText(
      isDecimal ? text.replace(/[^0-9.]/g, "") : text.replace(/[^0-9]/g, "")
    );
  }, []);

  const handleRefiValueSubmit = useCallback(
    (key: RefiKey) => {
      const cfg = REFI_SLIDERS[key];
      const parsed = parseFloat(refiEditingText);
      if (!isNaN(parsed) && parsed >= cfg.min) {
        const clamped = Math.max(cfg.min, Math.min(cfg.max, parsed));
        const snapped =
          cfg.step >= 1
            ? Math.round(clamped)
            : Math.round(clamped / cfg.step) * cfg.step;
        refiSetters[key](Math.round(snapped * 1000) / 1000);
      }
      setRefiEditingKey(null);
    },
    [refiEditingText] // eslint-disable-line react-hooks/exhaustive-deps
  );

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
    () =>
      selectedRefiDebts.reduce((s, d) => s + Math.max(0, d.balance), 0),
    [selectedRefiDebts]
  );

  const refiCurrentRate = useMemo(() => {
    if (refiBalance <= 0) return 0;
    const weighted = selectedRefiDebts.reduce(
      (s, d) => s + Math.max(0, d.balance) * d.rate,
      0
    );
    return weighted / refiBalance;
  }, [selectedRefiDebts, refiBalance]);

  // Auto-fill years remaining when every selected debt has a goal date
  // (weighted by balance). Leaves the user's manual value alone otherwise.
  useEffect(() => {
    if (selectedRefiDebts.length === 0) return;
    if (!selectedRefiDebts.every((d) => Boolean(d.goalDate))) return;
    if (refiBalance <= 0) return;
    const weightedMonths =
      selectedRefiDebts.reduce(
        (s, d) =>
          s + Math.max(0, d.balance) * calcMonthsUntilDate(d.goalDate as string),
        0
      ) / refiBalance;
    const years = Math.max(1, Math.min(30, Math.round(weightedMonths / 12)));
    setRefiCurrentTerm(years);
  }, [selectedRefiDebts, refiBalance]);

  /* Refi math */
  const refiCurrentMonths = refiCurrentTerm * 12;
  const refiNewMonths = refiNewTerm * 12;
  const hasRefiSelection = selectedRefiDebts.length > 0 && refiBalance > 0;

  const refiCurrentMonthlyPayment = useMemo(
    () =>
      hasRefiSelection
        ? calcPaymentForGoalDate(refiBalance, refiCurrentRate, refiCurrentMonths)
        : 0,
    [hasRefiSelection, refiBalance, refiCurrentRate, refiCurrentMonths]
  );
  const refiNewMonthlyPayment = useMemo(
    () =>
      hasRefiSelection
        ? calcPaymentForGoalDate(refiBalance, refiNewRate, refiNewMonths)
        : 0,
    [hasRefiSelection, refiBalance, refiNewRate, refiNewMonths]
  );

  const refiCurrentTotalInterest = useMemo(() => {
    if (!hasRefiSelection || !isFinite(refiCurrentMonthlyPayment)) return 0;
    return generatePayoffSchedule(
      refiBalance,
      refiCurrentRate,
      refiCurrentMonthlyPayment
    ).reduce((sum, row) => sum + row.interestPaid, 0);
  }, [hasRefiSelection, refiBalance, refiCurrentRate, refiCurrentMonthlyPayment]);

  const refiNewTotalInterest = useMemo(() => {
    if (!hasRefiSelection || !isFinite(refiNewMonthlyPayment)) return 0;
    return generatePayoffSchedule(
      refiBalance,
      refiNewRate,
      refiNewMonthlyPayment
    ).reduce((sum, row) => sum + row.interestPaid, 0);
  }, [hasRefiSelection, refiBalance, refiNewRate, refiNewMonthlyPayment]);

  const refiMonthlyDelta = refiCurrentMonthlyPayment - refiNewMonthlyPayment;
  const refiInterestDelta = refiCurrentTotalInterest - refiNewTotalInterest;
  const refiBreakEvenMonths =
    hasRefiSelection && refiMonthlyDelta > 0
      ? refiClosingCosts / refiMonthlyDelta
      : null;
  const refiNetSavingsOverNewTerm =
    refiMonthlyDelta * refiNewMonths - refiClosingCosts;
  const refiExtendsTerm = refiNewMonths > refiCurrentMonths;
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
        const [entries, goals, debts] = await Promise.all([
          getBudgetEntries(),
          getSavingsGoals(),
          getDebts(),
        ]);
        if (cancelled) return;

        const avg = calcAvgMonthlyExpenses(entries);
        setAvgExpenses(avg);

        const efGoal = goals.find((g) => g.category === "emergency_fund");
        setCurrentEfAmount(efGoal?.currentAmount ?? 0);
        setEfTargetAmount(efGoal?.targetAmount ?? 0);
        setEfDataLoaded(true);

        setRefiDebts(debts);
      };
      loadEfData();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const efMonthlyExpenses = efExpenseOverride
    ? parseFloat(efExpenseOverride) || 0
    : avgExpenses;
  const efThreeMonth = efMonthlyExpenses * 3;
  const efSixMonth = efMonthlyExpenses * 6;
  const efThreeProgress = efThreeMonth > 0 ? Math.min(1, currentEfAmount / efThreeMonth) : 0;
  const efSixProgress = efSixMonth > 0 ? Math.min(1, currentEfAmount / efSixMonth) : 0;
  const efThreeRemaining = Math.max(0, efThreeMonth - currentEfAmount);
  const efSixRemaining = Math.max(0, efSixMonth - currentEfAmount);
  const efMonthsToThree = efMonthlySavings > 0 && efThreeRemaining > 0
    ? Math.ceil(efThreeRemaining / efMonthlySavings)
    : 0;
  const efMonthsToSix = efMonthlySavings > 0 && efSixRemaining > 0
    ? Math.ceil(efSixRemaining / efMonthlySavings)
    : 0;

  const adjust = useCallback(
    (key: "contribution" | "returnRate" | "years", delta: number) => {
      const cfg = SLIDERS[key];
      const setter =
        key === "contribution" ? setContribution : key === "returnRate" ? setReturnRate : setYears;
      setter((prev) => {
        const next = Math.round((prev + delta * cfg.step) * 100) / 100;
        return Math.max(cfg.min, Math.min(cfg.max, next));
      });
    },
    []
  );

  const handleValueFocus = useCallback(
    (key: "contribution" | "returnRate" | "years", value: number) => {
      setEditingKey(key);
      setEditingText(String(value));
    },
    []
  );

  const handleValueChange = useCallback(
    (key: "contribution" | "returnRate" | "years", text: string) => {
      if (key === "returnRate") {
        setEditingText(text.replace(/[^0-9.]/g, ""));
      } else {
        setEditingText(text.replace(/[^0-9]/g, ""));
      }
    },
    []
  );

  const handleValueSubmit = useCallback(
    (key: "contribution" | "returnRate" | "years") => {
      const cfg = SLIDERS[key];
      const parsed = parseFloat(editingText);
      if (!isNaN(parsed) && parsed >= cfg.min) {
        const setter =
          key === "contribution" ? setContribution : key === "returnRate" ? setReturnRate : setYears;
        if (key === "years") {
          setter(Math.max(cfg.min, Math.round(parsed)));
        } else if (key === "returnRate") {
          const snapped = Math.round(parsed / cfg.step) * cfg.step;
          setter(Math.max(cfg.min, Math.round(snapped * 100) / 100));
        } else {
          setter(Math.max(cfg.min, parsed));
        }
      }
      setEditingKey(null);
    },
    [editingText]
  );

  const handleSliderChange = useCallback(
    (key: "contribution" | "returnRate" | "years", val: number) => {
      const setter =
        key === "contribution" ? setContribution : key === "returnRate" ? setReturnRate : setYears;
      setter(val);
    },
    []
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
      <View key={key} style={styles.sliderGroup}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>{cfg.label}</Text>
          {refiEditingKey === key ? (
            <TextInput
              style={[styles.sliderValue, styles.sliderValueInput, styles.sliderValueInputActive]}
              value={refiEditingText}
              onChangeText={(text) => handleRefiValueChange(key, text)}
              onBlur={() => handleRefiValueSubmit(key)}
              onSubmitEditing={() => handleRefiValueSubmit(key)}
              keyboardType={isRate ? "decimal-pad" : "numeric"}
              returnKeyType="done"
              selectTextOnFocus
              autoFocus
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TouchableOpacity
              style={styles.sliderValueDisplay}
              onPress={() => handleRefiValueFocus(key, value)}
            >
              <Text style={styles.sliderValue}>{displayValue}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sliderRow}>
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => adjustRefi(key, -1)}
            disabled={value <= cfg.min}
          >
            <Text style={[styles.sliderBtnText, value <= cfg.min && styles.sliderBtnDisabled]}>-</Text>
          </TouchableOpacity>
          <SmoothSlider
            value={value}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            onValueChange={(val) => handleRefiSliderChange(key, val)}
            trackColor={colors.bg}
            fillColor={colors.accent}
            thumbColor={colors.accent}
            thumbBorderColor={colors.card}
          />
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => adjustRefi(key, 1)}
            disabled={value >= cfg.max}
          >
            <Text style={[styles.sliderBtnText, value >= cfg.max && styles.sliderBtnDisabled]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
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
      <View key={key} style={styles.sliderGroup}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>{cfg.label}</Text>
          {editingKey === key ? (
            <TextInput
              style={[styles.sliderValue, styles.sliderValueInput, styles.sliderValueInputActive]}
              value={editingText}
              onChangeText={(text) => handleValueChange(key, text)}
              onBlur={() => handleValueSubmit(key)}
              onSubmitEditing={() => handleValueSubmit(key)}
              keyboardType={key === "returnRate" ? "decimal-pad" : "numeric"}
              returnKeyType="done"
              selectTextOnFocus
              autoFocus
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TouchableOpacity
              style={styles.sliderValueDisplay}
              onPress={() => handleValueFocus(key, value)}
            >
              <Text style={styles.sliderValue}>{displayValue}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sliderRow}>
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => adjust(key, -1)}
            disabled={value <= cfg.min}
          >
            <Text style={[styles.sliderBtnText, value <= cfg.min && styles.sliderBtnDisabled]}>-</Text>
          </TouchableOpacity>
          <SmoothSlider
            value={value}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            onValueChange={(val) => handleSliderChange(key, val)}
            trackColor={colors.bg}
            fillColor={colors.accent}
            thumbColor={colors.accent}
            thumbBorderColor={colors.card}
          />
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => adjust(key, 1)}
            disabled={value >= cfg.max}
          >
            <Text style={[styles.sliderBtnText, value >= cfg.max && styles.sliderBtnDisabled]}>+</Text>
          </TouchableOpacity>
        </View>

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
      </View>
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
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
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
         * Visual-only in this step. Chapter rows + Resume strip render but
         * taps are inert; LessonScreen + navigation wire up in the next
         * build pass.
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

          <View style={styles.chapterList}>
            {chapterProgressRows.map(({ chapter, completed, total }) => {
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
         * Horizontal-scrolling chip row. Inert in this step - taps will
         * filter the lesson grid in a follow-up pass.
         */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>TOPICS</Text>
          <Text style={styles.sectionHeaderHint}>Browse by subject</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicChipRow}
        >
          {LESSON_TOPICS.map((topic) => (
            <View key={topic} style={styles.topicChip}>
              <Text style={styles.topicChipGlyph}>{TOPIC_GLYPHS[topic]}</Text>
              <Text style={styles.topicChipLabel}>{TOPIC_LABELS[topic]}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Tools ── existing calculators */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>TOOLS</Text>
          <Text style={styles.sectionHeaderHint}>Calculators & utilities</Text>
        </View>

        {/* ── Compound Interest Calculator Tool ── */}
        <TouchableOpacity ref={anchorUtilitiesTool} style={styles.toolHeader} onPress={toggleCalc} activeOpacity={0.7}>
          <View>
            <Text style={styles.toolTitle}>Compound Interest Calculator</Text>
            <Text style={styles.toolHint}>Project your investment growth over time</Text>
          </View>
          <Text style={styles.toolChevron}>{calcOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {calcOpen && (
          <View style={styles.toolBody}>
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
            <View style={styles.slidersCard}>
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
        <TouchableOpacity style={styles.toolHeader} onPress={toggleLoan} activeOpacity={0.7}>
          <View>
            <Text style={styles.toolTitle}>Loan / Mortgage Calculator</Text>
            <Text style={styles.toolHint}>See your monthly payment and total interest</Text>
          </View>
          <Text style={styles.toolChevron}>{loanOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {loanOpen && (
          <View style={styles.toolBody}>
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
            <View style={styles.slidersCard}>
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
        <TouchableOpacity style={styles.toolHeader} onPress={toggleRefi} activeOpacity={0.7}>
          <View>
            <Text style={styles.toolTitle}>Refinance Break-Even Calculator</Text>
            <Text style={styles.toolHint}>
              See if refinancing actually saves you money
            </Text>
          </View>
          <Text style={styles.toolChevron}>{refiOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {refiOpen && (
          <View style={styles.toolBody}>
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
              <View style={styles.slidersCard}>
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
              <View style={styles.slidersCard}>
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
        <TouchableOpacity style={styles.toolHeader} onPress={toggleEf} activeOpacity={0.7}>
          <View>
            <Text style={styles.toolTitle}>Emergency Fund Calculator</Text>
            <Text style={styles.toolHint}>Track your safety net progress</Text>
          </View>
          <Text style={styles.toolChevron}>{efOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>

        {efOpen && (
          <View style={styles.toolBody}>
            {/* Monthly expenses */}
            <View style={styles.efCard}>
              <Text style={styles.efSectionTitle}>Your Monthly Expenses</Text>
              {efDataLoaded && avgExpenses > 0 ? (
                <Text style={styles.efAutoHint}>
                  Based on your budget: {formatCurrency(avgExpenses)}/mo average
                </Text>
              ) : efDataLoaded ? (
                <Text style={styles.efAutoHint}>
                  No budget data yet - enter your monthly expenses below
                </Text>
              ) : null}
              <TextInput
                style={styles.efInput}
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
                <View style={styles.efCard}>
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
                <View style={styles.efCard}>
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
                <View style={styles.slidersCard}>
                  <View style={styles.sliderGroup}>
                    <View style={styles.sliderHeader}>
                      <Text style={styles.sliderLabel}>Monthly Savings</Text>
                      <Text style={styles.sliderValue}>{formatCurrency(efMonthlySavings)}</Text>
                    </View>
                    <View style={styles.sliderRow}>
                      <TouchableOpacity
                        style={styles.sliderBtn}
                        onPress={() => setEfMonthlySavings((p) => Math.max(50, p - 50))}
                        disabled={efMonthlySavings <= 50}
                      >
                        <Text style={[styles.sliderBtnText, efMonthlySavings <= 50 && styles.sliderBtnDisabled]}>-</Text>
                      </TouchableOpacity>
                      <SmoothSlider
                        value={efMonthlySavings}
                        min={50}
                        max={10000}
                        step={50}
                        onValueChange={setEfMonthlySavings}
                        trackColor={colors.bg}
                        fillColor={colors.accent}
                        thumbColor={colors.accent}
                        thumbBorderColor={colors.card}
                      />
                      <TouchableOpacity
                        style={styles.sliderBtn}
                        onPress={() => setEfMonthlySavings((p) => Math.min(10000, p + 50))}
                        disabled={efMonthlySavings >= 10000}
                      >
                        <Text style={[styles.sliderBtnText, efMonthlySavings >= 10000 && styles.sliderBtnDisabled]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
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
      </ScrollView>
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
    toolHeader: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: tokens.radius,
      paddingVertical: tokens.pad,
      paddingHorizontal: tokens.pad + 2,
      marginBottom: tokens.gapSm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    toolTitle: {
      fontSize: scale(16),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    toolHint: {
      fontSize: 12,
      color: colors.textMuted,
    },
    toolChevron: {
      fontSize: 18,
      color: colors.textMuted,
      fontWeight: "600",
      marginLeft: 12,
    },
    toolBody: {
      gap: tokens.gapSm,
    },

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
    slidersCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad + 2,
      gap: tokens.gapLg,
    },
    sliderGroup: {
      gap: 8,
    },
    sliderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sliderLabel: {
      fontSize: 13,
      color: colors.textDim,
      fontWeight: "500",
    },
    sliderValue: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    sliderValueDisplay: {
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minWidth: 90,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    sliderValueInput: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minWidth: 90,
      textAlign: "right",
      textAlignVertical: "center",
    },
    sliderValueInputActive: {
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.bg,
    },
    sliderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sliderBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    sliderBtnText: {
      fontSize: 20,
      color: colors.text,
      fontWeight: "600",
      lineHeight: 22,
    },
    sliderBtnDisabled: {
      opacity: 0.2,
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
      borderRadius: 999,
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
      borderRadius: 999,
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
      color: colors.white ?? "#fff",
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
    efCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 16,
      gap: 8,
    },
    efSectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    efAutoHint: {
      fontSize: 12,
      color: colors.textDim,
    },
    efInput: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
    },
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
      borderRadius: 999,
      overflow: "hidden",
    },
    efProgressFill: {
      height: "100%",
      borderRadius: 999,
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
      borderRadius: 999,
      overflow: "hidden",
    },
    courseProgressFill: {
      height: "100%",
      backgroundColor: colors.accent,
      borderRadius: 999,
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
      borderRadius: 999,
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
  });
};

export default ChartsScreen;
