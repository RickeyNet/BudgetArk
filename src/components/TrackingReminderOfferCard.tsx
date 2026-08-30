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
          "Notifications are off",
          "BudgetArk needs notification permission to send check-in reminders. You can turn it on in your phone's Settings, then enable reminders from Profile → Tracking Reminders.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => void Linking.openSettings() },
          ]
        );
      }
    } catch {
      Alert.alert(
        "Couldn't turn on reminders",
        "Something went wrong saving the setting. You can try again from Profile → Tracking Reminders."
      );
    } finally {
      setBusy(false);
      setVisible(false);
      void markTrackingReminderOfferDismissed().catch(() => {});
    }
  }, [busy]);

  if (!visible) return null;

  return (
    <View style={[styles.card, style]} accessibilityRole="summary">
      <Text style={styles.eyebrow}>TRACKING REMINDERS</Text>
      <Text style={styles.title}>🔔 Want a nudge to keep tracking?</Text>
      <Text style={styles.body}>
        A short check-in if a few days pass without an entry, and a heads-up
        on the 1st. Never an amount, balance, account, or bill - just a tap
        back into the app. Adjust or turn off any time in Profile → Tracking
        Reminders.
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primary, busy && styles.disabled]}
          onPress={() => void handleEnable()}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>
            {busy ? "Asking your phone..." : "Turn on"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDismiss}
          disabled={busy}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>No thanks</Text>
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
