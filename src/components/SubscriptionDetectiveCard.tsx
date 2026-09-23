/**
 * BudgetArk - Subscription Detective Card
 * File: src/components/SubscriptionDetectiveCard.tsx
 *
 * Charts-tab tool listing bank-imported merchants that charge like a
 * subscription (utils/subscriptionDetective) with no recurring bill on
 * file: the yearly total at the top, one row per merchant with "Make it a
 * bill" (a recurring expense dated this month on its usual day, merchant
 * remembered) and "Not a subscription" (device-local ignore list). The
 * screen passes the entries it already loads on focus; the card owns the
 * ignore list and its open/closed state.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import { categoryLabel } from "../i18n/categoryLabel";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useToolStyles } from "../theme/toolStyles";
import { useCurrency } from "../currency/CurrencyProvider";
import {
  detectSubscriptions,
  subscriptionBillFields,
  type DetectedSubscription,
} from "../utils/subscriptionDetective";
import { getMonthKey } from "../utils/budgetMonths";
import { lastDayOfYearMonth } from "../utils/entryDate";
import { addBudgetEntry } from "../storage/budgetStorage";
import {
  getIgnoredSubscriptionMerchants,
  ignoreSubscriptionMerchant,
} from "../storage/subscriptionIgnoreStorage";
import { generateUUID } from "../utils/uuid";
import { triggerHaptic } from "../utils/haptics";
import { describeError } from "../utils/errorMessage";
import type { BudgetEntry } from "../types";

interface SubscriptionDetectiveCardProps {
  /** Live budget entries (the screen's focus load). */
  entries: BudgetEntry[];
  /** Called after a bill is created so the screen reloads its entries. */
  onEntriesChanged: () => void | Promise<void>;
}

const SubscriptionDetectiveCard: React.FC<SubscriptionDetectiveCardProps> = ({
  entries,
  onEntriesChanged,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const tool = useToolStyles();

  const [open, setOpen] = useState(false);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [busyMerchant, setBusyMerchant] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loaded on mount, not on open: the collapsed header's count and yearly
  // total come from the same scan, so a hidden merchant must be excluded
  // before the card is ever expanded (one small encrypted read).
  useEffect(() => {
    let cancelled = false;
    void getIgnoredSubscriptionMerchants()
      .then((list) => {
        if (!cancelled) setIgnored(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const nowKey = getMonthKey();
  const scan = useMemo(
    () => detectSubscriptions(entries, { nowKey, ignoredMerchants: ignored }),
    [entries, ignored, nowKey],
  );
  const hasBankHistory = useMemo(
    () => entries.some((entry) => !!entry.merchant && !entry.deletedAt),
    [entries],
  );

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  }, []);

  const handleMakeBill = useCallback(
    async (subscription: DetectedSubscription) => {
      if (busyMerchant) return;
      setBusyMerchant(subscription.merchant);
      setError(null);
      try {
        const now = new Date().toISOString();
        const bill: BudgetEntry = {
          id: generateUUID(),
          ...subscriptionBillFields(subscription, nowKey, lastDayOfYearMonth(nowKey)),
          createdAt: now,
          updatedAt: now,
        };
        await addBudgetEntry(bill);
        await onEntriesChanged();
        triggerHaptic("success");
      } catch (err) {
        triggerHaptic("error");
        setError(describeError(err, t("charts.insights.subscriptions.errors.createBill")));
      } finally {
        setBusyMerchant(null);
      }
    },
    [busyMerchant, nowKey, onEntriesChanged, t],
  );

  const handleIgnore = useCallback(
    async (subscription: DetectedSubscription) => {
      if (busyMerchant) return;
      setBusyMerchant(subscription.merchant);
      setError(null);
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIgnored(await ignoreSubscriptionMerchant(subscription.merchant));
        triggerHaptic("selection");
      } catch (err) {
        setError(describeError(err, t("charts.insights.subscriptions.errors.hideMerchant")));
      } finally {
        setBusyMerchant(null);
      }
    },
    [busyMerchant, t],
  );

  const count = scan.subscriptions.length;
  // The summary spans every row, so name the cadence the rows actually have.
  const cadenceWord = scan.subscriptions.every((s) => s.cadence === "yearly")
    ? t("charts.insights.subscriptions.cadenceWord.year")
    : scan.subscriptions.every((s) => s.cadence === "monthly")
      ? t("charts.insights.subscriptions.cadenceWord.month")
      : t("charts.insights.subscriptions.cadenceWord.mixed");

  return (
    <>
      <TouchableOpacity
        style={tool.toolHeader}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t("charts.insights.subscriptions.title")}
      >
        <View>
          <Text style={tool.toolTitle}>{t("charts.insights.subscriptions.title")}</Text>
          <Text style={tool.toolHint}>
            {count > 0
              ? t("charts.insights.subscriptions.hintCount", {
                  count,
                  amount: formatCurrency(scan.annualTotal),
                })
              : t("charts.insights.subscriptions.hintIdle")}
          </Text>
        </View>
        <Text style={tool.toolChevron}>{open ? "▾" : "›"}</Text>
      </TouchableOpacity>

      {open ? (
        <View style={tool.toolBody}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {!hasBankHistory ? (
            <View style={tool.efCard}>
              <Text style={tool.refiEmptyText}>{t("charts.insights.subscriptions.noBankHistory")}</Text>
            </View>
          ) : count === 0 ? (
            <View style={tool.efCard}>
              <Text style={tool.refiEmptyText}>{t("charts.insights.subscriptions.nothingHiding")}</Text>
            </View>
          ) : (
            <>
              <View style={tool.resultCard}>
                <Text style={tool.resultLabel}>{t("charts.insights.subscriptions.resultLabel")}</Text>
                <Text style={tool.resultValue}>
                  {t("charts.insights.subscriptions.perYear", { amount: formatCurrency(scan.annualTotal) })}
                </Text>
                <Text style={tool.resultSub}>
                  {t("charts.insights.subscriptions.summary", {
                    count,
                    monthly: formatCurrency(scan.monthlyTotal),
                    cadence: cadenceWord,
                  })}
                </Text>
              </View>
              {scan.subscriptions.map((subscription) => {
                const busy = busyMerchant === subscription.merchant;
                return (
                  <View key={subscription.merchant} style={tool.efCard}>
                    <View style={styles.rowHeader}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {subscription.label}
                      </Text>
                      <Text style={styles.rowAnnual}>
                        {t("charts.insights.subscriptions.perYear", {
                          amount: formatCurrency(subscription.annualCost),
                        })}
                      </Text>
                    </View>
                    <Text style={styles.rowMeta}>
                      {t("charts.insights.subscriptions.rowMeta", {
                        amount: formatCurrency(subscription.averageAmount),
                        cadence: t(`charts.insights.subscriptions.cadence.${subscription.cadence}`),
                        charges: t("charts.insights.subscriptions.charges", {
                          count: subscription.occurrences,
                        }),
                        category: categoryLabel(t, subscription.category),
                      })}
                    </Text>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.primaryButton, busy && styles.buttonDisabled]}
                        onPress={() => void handleMakeBill(subscription)}
                        disabled={busyMerchant !== null}
                        accessibilityRole="button"
                        accessibilityLabel={t("charts.insights.subscriptions.a11yMakeBill", {
                          merchant: subscription.label,
                        })}
                      >
                        <Text style={styles.primaryButtonText}>
                          {busy
                            ? t("charts.insights.subscriptions.saving")
                            : t("charts.insights.subscriptions.makeBill")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.secondaryButton, busy && styles.buttonDisabled]}
                        onPress={() => void handleIgnore(subscription)}
                        disabled={busyMerchant !== null}
                        accessibilityRole="button"
                        accessibilityLabel={t("charts.insights.subscriptions.a11yNotSubscription", {
                          merchant: subscription.label,
                        })}
                      >
                        <Text style={styles.secondaryButtonText}>
                          {t("charts.insights.subscriptions.notSubscription")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      ) : null}
    </>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) =>
  StyleSheet.create({
    errorText: {
      color: colors.danger,
      fontSize: 13,
      marginBottom: tokens.gapSm,
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.gapSm,
    },
    rowTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    rowAnnual: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.warning,
    },
    rowMeta: {
      fontSize: 12,
      color: colors.textDim,
      marginTop: 2,
    },
    actionRow: {
      flexDirection: "row",
      gap: tokens.gapSm,
      marginTop: tokens.gapSm + 2,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusSm + 2,
      paddingVertical: tokens.padSm,
      alignItems: "center",
    },
    primaryButtonText: {
      color: colors.accentButtonText,
      fontWeight: "700",
      fontSize: 13,
    },
    secondaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm + 2,
      paddingVertical: tokens.padSm,
      alignItems: "center",
    },
    secondaryButtonText: {
      color: colors.textDim,
      fontWeight: "600",
      fontSize: 13,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });

export default React.memo(SubscriptionDetectiveCard);
