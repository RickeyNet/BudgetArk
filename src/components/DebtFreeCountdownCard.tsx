/**
 * BudgetArk - Debt-Free Countdown Card
 * File: src/components/DebtFreeCountdownCard.tsx
 *
 * The countdown on the Debt Tracker: projected debt-free date at the user's
 * demonstrated payment pace, broken into years / months / days boxes. All
 * math lives in utils/debtFreeCountdown (pure, unit-tested); this component
 * only renders the projection. `now` arrives as a prop - stamped by the
 * screen when its data loads - so render stays pure (react-hooks/purity)
 * and the countdown refreshes on every focus and every recorded payment.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Debt, Payment } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { diffCalendarYMD, projectDebtFree } from "../utils/debtFreeCountdown";
import type { PayoffMethod } from "../utils/calculations";

interface DebtFreeCountdownCardProps {
  debts: readonly Debt[];
  payments: readonly Payment[];
  /** The screen's sort preference; "custom" projects as avalanche. */
  strategy: "custom" | "avalanche" | "snowball";
  /** Stamped at data load by the screen - never created during render. */
  now: Date;
}

const DebtFreeCountdownCard: React.FC<DebtFreeCountdownCardProps> = ({
  debts,
  payments,
  strategy,
  now,
}) => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const method: PayoffMethod = strategy === "snowball" ? "snowball" : "avalanche";

  const projection = useMemo(
    () => projectDebtFree([...debts], [...payments], method, now),
    [debts, payments, method, now]
  );

  const countdown = useMemo(
    () =>
      projection.projectedDate
        ? diffCalendarYMD(now, projection.projectedDate)
        : null,
    [now, projection.projectedDate]
  );

  const paceLine = useMemo(() => {
    const pace = t("debts.moments.countdown.pace.perMonth", {
      amount: formatCurrency(projection.paceMonthly),
    });
    switch (projection.velocity.basis) {
      case "history":
        return t("debts.moments.countdown.pace.history", {
          pace,
          count: projection.velocity.monthsSampled,
        });
      case "current-month":
        return t("debts.moments.countdown.pace.currentMonth", { pace });
      default:
        return t("debts.moments.countdown.pace.minimums", { pace });
    }
  }, [formatCurrency, projection.paceMonthly, projection.velocity, t]);

  if (projection.status === "no-debts") return null;

  if (projection.status === "debt-free") {
    return (
      <View style={[styles.card, styles.cardCelebrate]}>
        <Text style={[styles.eyebrow, { color: colors.success }]}>
          {t("debts.moments.countdown.eyebrow")}
        </Text>
        <Text style={styles.celebrateText}>{t("debts.moments.countdown.debtFree")}</Text>
      </View>
    );
  }

  if (projection.status === "not-solvable" || countdown === null) {
    return (
      <View style={styles.card}>
        <Text style={[styles.eyebrow, { color: colors.warning }]}>
          {t("debts.moments.countdown.eyebrow")}
        </Text>
        <Text style={styles.notSolvableTitle}>
          {t("debts.moments.countdown.notSolvableTitle")}
        </Text>
        <Text style={styles.noteText}>{t("debts.moments.countdown.notSolvableBody")}</Text>
      </View>
    );
  }

  const { years, months, days } = countdown;
  const boxes: { value: number; label: string }[] = [];
  if (years > 0) {
    boxes.push({ value: years, label: t("debts.moments.countdown.units.year", { count: years }) });
  }
  if (years > 0 || months > 0) {
    boxes.push({ value: months, label: t("debts.moments.countdown.units.month", { count: months }) });
  }
  boxes.push({ value: days, label: t("debts.moments.countdown.units.day", { count: days }) });

  const target = projection.projectedDate as Date;
  // Month name in the app language ("September 2027" / "September 2027");
  // the projection date itself is untouched.
  let targetLabel: string;
  try {
    targetLabel = target.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });
  } catch {
    targetLabel = target.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  return (
    <View style={styles.card}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>
        {t("debts.moments.countdown.eyebrow")}
      </Text>

      <View style={styles.boxRow}>
        {boxes.map((box) => (
          <View key={box.label} style={styles.box}>
            <Text style={styles.boxValue}>{box.value}</Text>
            <Text style={styles.boxLabel}>{box.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.targetLine}>
        {t("debts.moments.countdown.target", { month: targetLabel })}
      </Text>
      <Text style={styles.paceLine}>{paceLine}</Text>

      {projection.velocityBelowMinimums && (
        <Text style={styles.noteText}>
          {t("debts.moments.countdown.belowMinimums", {
            pace: t("debts.moments.countdown.pace.perMonth", {
              amount: formatCurrency(projection.velocity.monthlyAverage),
            }),
          })}
        </Text>
      )}
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: tokens.radius,
      paddingVertical: tokens.pad,
      paddingHorizontal: tokens.pad + 2,
      gap: tokens.gapSm,
    },
    cardCelebrate: {
      borderColor: `${colors.success}35`,
      backgroundColor: `${colors.success}10`,
    },
    eyebrow: {
      fontSize: scale(10),
      fontWeight: "700",
      letterSpacing: 1,
    },
    boxRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: tokens.gapSm,
    },
    box: {
      minWidth: 72,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      paddingVertical: tokens.padSm,
      paddingHorizontal: tokens.pad,
      alignItems: "center",
    },
    boxValue: {
      fontSize: scale(26),
      fontWeight: "800",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    boxLabel: {
      fontSize: scale(10),
      fontWeight: "700",
      letterSpacing: 0.5,
      color: colors.textMuted,
      marginTop: 2,
    },
    targetLine: {
      fontSize: scale(14),
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    paceLine: {
      fontSize: scale(12),
      color: colors.textDim,
      textAlign: "center",
    },
    celebrateText: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
    },
    notSolvableTitle: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
    },
    noteText: {
      fontSize: scale(12),
      color: colors.textMuted,
      lineHeight: scale(17),
    },
  });
};

export default React.memo(DebtFreeCountdownCard);
