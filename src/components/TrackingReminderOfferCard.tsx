/**
 * BudgetArk - Tracking Reminder Offer Card
 * File: src/components/TrackingReminderOfferCard.tsx
 *
 * The one-time "want a nudge to keep tracking?" card at the top of the
 * Budget tab for phones that never answered the question (installs that
 * predate onboarding's reminders step, or skipped setup). Self-contained:
 * it decides on focus whether it applies (utils/trackingReminderOffer),
 * asks the OS for permission on "Turn on", and retires itself on any
 * answer. Same visual family as the reminder banners around it. Copy
 * keeps the rule-11 promise explicit: a reminder never carries an amount.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { triggerHaptic } from "../utils/haptics";
import { DEFAULT_TRACKING_REMINDER_SETTINGS } from "../utils/trackingReminderPlanner";
import { shouldOfferTrackingReminders } from "../utils/trackingReminderOffer";
import {
  getTrackingReminderOfferDismissed,
  getTrackingReminderSettings,
  hasStoredTrackingReminderSettings,
  markTrackingReminderOfferDismissed,
  setTrackingReminderSettings,
} from "../storage/trackingReminderSettingsStorage";
import {
  ensureTrackingReminderPermissions,
  rescheduleTrackingReminders,
} from "../notifications/trackingReminders";

interface TrackingReminderOfferCardProps {
  style?: StyleProp<ViewStyle>;
}

const TrackingReminderOfferCard: React.FC<TrackingReminderOfferCardProps> = ({ style }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  // Re-evaluated on every focus so enabling from Profile retires the card
  // without a remount.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        getTrackingReminderSettings(),
        hasStoredTrackingReminderSettings(),
        getTrackingReminderOfferDismissed(),
      ])
        .then(([settings, hasStoredSettings, offerDismissed]) => {
          if (cancelled) return;
          setVisible(
            shouldOfferTrackingReminders({
              enabled: settings.enabled,
              hasStoredSettings,
              offerDismissed,
            })
          );
        })
        .catch(() => {
          // Unreadable preference: don't nag on a guess.
          if (!cancelled) setVisible(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleDismiss = useCallback(() => {
    triggerHaptic("selection");
    setVisible(false);
    void markTrackingReminderOfferDismissed().catch(() => {});
  }, []);

  /**
   * Mirrors the onboarding step: the OS prompt first, and only a grant
   * writes `enabled: true`. Either answer retires the card.
   */
  const handleEnable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    triggerHaptic("selection");
    try {
      const permitted = await ensureTrackingReminderPermissions();
      if (permitted) {
        await setTrackingReminderSettings({
          ...DEFAULT_TRACKING_REMINDER_SETTINGS,
          enabled: true,
        });
        void rescheduleTrackingReminders();
        triggerHaptic("success");
      } else {
        Alert.alert(
          t("budget.cards.reminderOffer.permissionTitle"),
          t("budget.cards.reminderOffer.permissionMessage"),
          [
            { text: t("budget.cards.reminderOffer.notNow"), style: "cancel" },
            {
              text: t("budget.cards.reminderOffer.openSettings"),
              onPress: () => void Linking.openSettings(),
            },
          ]
        );
      }
    } catch {
      Alert.alert(
        t("budget.cards.reminderOffer.failedTitle"),
        t("budget.cards.reminderOffer.failedMessage")
      );
    } finally {
      setBusy(false);
      setVisible(false);
      void markTrackingReminderOfferDismissed().catch(() => {});
    }
  }, [busy, t]);

  if (!visible) return null;

  return (
    <View style={[styles.card, style]} accessibilityRole="summary">
      <Text style={styles.eyebrow}>{t("budget.cards.reminderOffer.eyebrow")}</Text>
      <Text style={styles.title}>{t("budget.cards.reminderOffer.title")}</Text>
      <Text style={styles.body}>{t("budget.cards.reminderOffer.body")}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primary, busy && styles.disabled]}
          onPress={() => void handleEnable()}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>
            {busy ? t("budget.cards.reminderOffer.asking") : t("budget.cards.reminderOffer.turnOn")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDismiss}
          disabled={busy}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>{t("budget.cards.reminderOffer.noThanks")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${colors.accent}35`,
      backgroundColor: `${colors.accent}12`,
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 6,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: colors.accent,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 20,
    },
    body: {
      fontSize: 13,
      color: colors.textDim,
      lineHeight: 18,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
      marginTop: 6,
    },
    primary: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 9,
      paddingHorizontal: 16,
    },
    primaryText: {
      color: colors.accentButtonText,
      fontSize: 13,
      fontWeight: "700",
    },
    disabled: {
      opacity: 0.6,
    },
    dismissText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
  });

export default React.memo(TrackingReminderOfferCard);
