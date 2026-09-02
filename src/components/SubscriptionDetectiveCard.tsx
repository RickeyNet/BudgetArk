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
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useToolStyles } from "../theme/toolStyles";
import { useCurrency } from "../currency/CurrencyProvider";
import {
  describeCadence,
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
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const tool = useToolStyles();

  const [open, setOpen] = useState(false);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [busyMerchant, setBusyMerchant] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getIgnoredSubscriptionMerchants()
      .then((list) => {
        if (!cancelled) setIgnored(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

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
        setError(describeError(err, "Couldn't create the recurring bill."));
      } finally {
        setBusyMerchant(null);
      }
    },
    [busyMerchant, nowKey, onEntriesChanged],
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
        setError(describeError(err, "Couldn't hide that merchant."));
      } finally {
        setBusyMerchant(null);
      }
    },
    [busyMerchant],
  );

  const count = scan.subscriptions.length;

  return (
    <>
      <TouchableOpacity style={tool.toolHeader} onPress={toggle} activeOpacity={0.7}>
        <View>
          <Text style={tool.toolTitle}>Subscription Detective</Text>
          <Text style={tool.toolHint}>
            {count > 0
              ? `${count} without a bill on file · ~${formatCurrency(scan.annualTotal)}/yr`
              : "Find repeat charges with no bill on file"}
          </Text>
        </View>
        <Text style={tool.toolChevron}>{open ? "▾" : "›"}</Text>
      </TouchableOpacity>

      {open ? (
        <View style={tool.toolBody}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {!hasBankHistory ? (
            <View style={tool.efCard}>
              <Text style={tool.refiEmptyText}>
                Subscriptions are found in bank-imported expenses. Connect a bank
                under Profile → Connections and approve a few months of charges,
                then come back.
              </Text>
            </View>
          ) : count === 0 ? (
            <View style={tool.efCard}>
              <Text style={tool.refiEmptyText}>
                Nothing hiding right now: every repeat charge already has a
                recurring bill, or you've marked it as not a subscription.
              </Text>
            </View>
          ) : (
            <>
              <View style={tool.resultCard}>
                <Text style={tool.resultLabel}>WITHOUT A BILL ON FILE</Text>
                <Text style={tool.resultValue}>{formatCurrency(scan.annualTotal)}/yr</Text>
                <Text style={tool.resultSub}>
                  about {formatCurrency(scan.monthlyTotal)} a month across {count}{" "}
                  {count === 1 ? "subscription" : "subscriptions"}. Make each one a
                  bill and the budget expects it every {"month"} - or hide the
                  ones that aren't subscriptions.
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
                        {formatCurrency(subscription.annualCost)}/yr
                      </Text>
                    </View>
                    <Text style={styles.rowMeta}>
                      {formatCurrency(subscription.averageAmount)}{" "}
                      {describeCadence(subscription.cadence)} · {subscription.occurrences}{" "}
                      charges · {subscription.category}
                    </Text>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.primaryButton, busy && styles.buttonDisabled]}
                        onPress={() => void handleMakeBill(subscription)}
                        disabled={busyMerchant !== null}
                        accessibilityRole="button"
                        accessibilityLabel={`Make ${subscription.label} a recurring bill`}
                      >
                        <Text style={styles.primaryButtonText}>
                          {busy ? "Saving..." : "Make it a bill"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.secondaryButton, busy && styles.buttonDisabled]}
                        onPress={() => void handleIgnore(subscription)}
                        disabled={busyMerchant !== null}
                        accessibilityRole="button"
                        accessibilityLabel={`${subscription.label} is not a subscription`}
                      >
                        <Text style={styles.secondaryButtonText}>Not a subscription</Text>
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
