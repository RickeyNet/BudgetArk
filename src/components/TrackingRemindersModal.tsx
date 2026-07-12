/**
 * BudgetArk - Tracking Reminders settings sheet
 * File: src/components/TrackingRemindersModal.tsx
 *
 * Opt-in check-in notifications that nudge the user to keep logging their
 * spending. Nudges are anchored to the last logged entry, so an active
 * tracker never hears from them - only someone who has gone quiet for the
 * chosen cadence. Everything is planned and scheduled on-device - no push
 * token, no server, nothing leaves the phone.
 *
 * Mount only while open (like TipJarModal):
 *   {showReminders ? <TrackingRemindersModal onClose={...} /> : null}
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { triggerHaptic } from "../utils/haptics";
import {
  DEFAULT_TRACKING_REMINDER_SETTINGS,
  type ReminderCadenceDays,
  type ReminderHour,
  type TrackingReminderSettings,
} from "../utils/trackingReminderPlanner";
import {
  getTrackingReminderSettings,
  setTrackingReminderSettings,
} from "../storage/trackingReminderSettingsStorage";
import {
  ensureTrackingReminderPermissions,
  rescheduleTrackingReminders,
} from "../notifications/trackingReminders";

interface TrackingRemindersModalProps {
  onClose: () => void;
}

const CADENCE_OPTIONS: { cadenceDays: ReminderCadenceDays; label: string }[] = [
  { cadenceDays: 1, label: "Daily" },
  { cadenceDays: 3, label: "Every 3 days" },
  { cadenceDays: 7, label: "Weekly" },
];

const HOUR_OPTIONS: { hour: ReminderHour; label: string }[] = [
  { hour: 9, label: "Morning" },
  { hour: 13, label: "Afternoon" },
  { hour: 19, label: "Evening" },
];

const TrackingRemindersModal: React.FC<TrackingRemindersModalProps> = ({
  onClose,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.bottom),
    [colors, insets.bottom]
  );

  const [settings, setSettings] = useState<TrackingReminderSettings | null>(
    null
  );

  useEffect(() => {
    let active = true;
    void getTrackingReminderSettings().then((loaded) => {
      if (active) setSettings(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  /** Persists + reschedules; state updates optimistically. */
  const apply = useCallback(async (next: TrackingReminderSettings) => {
    setSettings(next);
    try {
      await setTrackingReminderSettings(next);
    } catch {
      // Persist failed - reload so the UI shows what's actually stored.
      setSettings(await getTrackingReminderSettings());
      return;
    }
    void rescheduleTrackingReminders();
  }, []);

  const handleToggleEnabled = useCallback(async () => {
    const current = settings ?? DEFAULT_TRACKING_REMINDER_SETTINGS;
    triggerHaptic("selection");
    if (current.enabled) {
      await apply({ ...current, enabled: false });
      return;
    }
    const permitted = await ensureTrackingReminderPermissions();
    if (!permitted) {
      Alert.alert(
        "Notifications are off",
        "BudgetArk needs notification permission to send check-in reminders. You can turn it on in your phone's Settings.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ]
      );
      return;
    }
    await apply({ ...current, enabled: true });
  }, [apply, settings]);

  const updateSetting = useCallback(
    (patch: Partial<TrackingReminderSettings>) => {
      if (!settings) return;
      triggerHaptic("selection");
      void apply({ ...settings, ...patch });
    },
    [apply, settings]
  );

  const enabled = settings?.enabled === true;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.card}>
            <Text style={styles.title}>Tracking Reminders</Text>
            <Text style={styles.subtitle}>
              Gentle nudges that keep your budget honest - a check-in when
              you've gone quiet, and a fresh-month reminder to plan ahead.
            </Text>

            <TouchableOpacity
              style={styles.row}
              onPress={handleToggleEnabled}
              disabled={settings === null}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Enable reminders</Text>
                <Text style={styles.rowSubtext}>
                  {enabled
                    ? "Scheduled on this device from your own activity"
                    : "No reminders scheduled"}
                </Text>
              </View>
              <Text style={styles.rowValue}>{enabled ? "On" : "Off"}</Text>
            </TouchableOpacity>

            {enabled && settings ? (
              <>
                <Text style={styles.sectionLabel}>REMIND ME ABOUT</Text>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() =>
                    updateSetting({
                      checkInsEnabled: !settings.checkInsEnabled,
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>Logging expenses</Text>
                    <Text style={styles.rowSubtext}>
                      When you haven't tracked for a while - logging an entry
                      resets the timer
                    </Text>
                  </View>
                  <Text style={styles.rowValue}>
                    {settings.checkInsEnabled ? "On" : "Off"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() =>
                    updateSetting({
                      monthStartEnabled: !settings.monthStartEnabled,
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>Month-start planning</Text>
                    <Text style={styles.rowSubtext}>
                      On the 1st: set this month's goals & review last month
                    </Text>
                  </View>
                  <Text style={styles.rowValue}>
                    {settings.monthStartEnabled ? "On" : "Off"}
                  </Text>
                </TouchableOpacity>

                {settings.checkInsEnabled ? (
                  <>
                    <Text style={styles.sectionLabel}>
                      AFTER NOT TRACKING FOR
                    </Text>
                    <View style={styles.chipRow}>
                      {CADENCE_OPTIONS.map((option) => {
                        const selected =
                          settings.cadenceDays === option.cadenceDays;
                        return (
                          <TouchableOpacity
                            key={option.cadenceDays}
                            style={[
                              styles.chip,
                              selected && styles.chipSelected,
                            ]}
                            onPress={() =>
                              updateSetting({ cadenceDays: option.cadenceDays })
                            }
                          >
                            <Text
                              style={[
                                styles.chipText,
                                selected && styles.chipTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                <Text style={styles.sectionLabel}>TIME OF DAY</Text>
                <View style={styles.chipRow}>
                  {HOUR_OPTIONS.map((option) => {
                    const selected = settings.hour === option.hour;
                    return (
                      <TouchableOpacity
                        key={option.hour}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => updateSetting({ hour: option.hour })}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={styles.privacyText}>
              Check-ins are scheduled entirely on this device and contain no
              amounts or account details. Nothing is sent anywhere - BudgetArk
              has no server.
            </Text>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, bottomInset: number) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    card: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      padding: 24,
      paddingBottom: Math.max(24, bottomInset),
      gap: 14,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textDim,
      lineHeight: 20,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1,
      color: colors.textMuted,
      marginTop: 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    rowSubtext: {
      fontSize: 12,
      color: colors.textDim,
      marginTop: 2,
    },
    rowValue: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.accent,
    },
    chipRow: {
      flexDirection: "row",
      gap: 8,
    },
    chip: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    chipSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textDim,
    },
    chipTextSelected: {
      color: colors.white,
    },
    privacyText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 17,
    },
    closeButton: {
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    closeText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },
  });

export default React.memo(TrackingRemindersModal);
