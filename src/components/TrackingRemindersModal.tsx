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
import { useTranslation } from "react-i18next";
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

/** Labels live at `modals.engage.reminders.cadence.<days>` / `.hour.<hour>`. */
const CADENCE_OPTIONS: ReminderCadenceDays[] = [1, 3, 7];
const HOUR_OPTIONS: ReminderHour[] = [9, 13, 19];

const TrackingRemindersModal: React.FC<TrackingRemindersModalProps> = ({
  onClose,
}) => {
  const { t } = useTranslation();
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
        t("modals.engage.reminders.permission.title"),
        t("modals.engage.reminders.permission.body"),
        [
          { text: t("modals.engage.reminders.permission.notNow"), style: "cancel" },
          {
            text: t("modals.engage.reminders.permission.openSettings"),
            onPress: () => void Linking.openSettings(),
          },
        ]
      );
      return;
    }
    await apply({ ...current, enabled: true });
  }, [apply, settings, t]);

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
            <Text style={styles.title}>
              {t("modals.engage.reminders.title")}
            </Text>
            <Text style={styles.subtitle}>
              {t("modals.engage.reminders.intro")}
            </Text>

            <TouchableOpacity
              style={styles.row}
              onPress={handleToggleEnabled}
              disabled={settings === null}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>
                  {t("modals.engage.reminders.enable.label")}
                </Text>
                <Text style={styles.rowSubtext}>
                  {enabled
                    ? t("modals.engage.reminders.enable.on")
                    : t("modals.engage.reminders.enable.off")}
                </Text>
              </View>
              <Text style={styles.rowValue}>
                {enabled ? t("common.on") : t("common.off")}
              </Text>
            </TouchableOpacity>

            {enabled && settings ? (
              <>
                <Text style={styles.sectionLabel}>
                  {t("modals.engage.reminders.sections.remindAbout")}
                </Text>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() =>
                    updateSetting({
                      checkInsEnabled: !settings.checkInsEnabled,
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>
                      {t("modals.engage.reminders.checkIns.label")}
                    </Text>
                    <Text style={styles.rowSubtext}>
                      {t("modals.engage.reminders.checkIns.description")}
                    </Text>
                  </View>
                  <Text style={styles.rowValue}>
                    {settings.checkInsEnabled ? t("common.on") : t("common.off")}
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
                    <Text style={styles.rowLabel}>
                      {t("modals.engage.reminders.monthStart.label")}
                    </Text>
                    <Text style={styles.rowSubtext}>
                      {t("modals.engage.reminders.monthStart.description")}
                    </Text>
                  </View>
                  <Text style={styles.rowValue}>
                    {settings.monthStartEnabled ? t("common.on") : t("common.off")}
                  </Text>
                </TouchableOpacity>

                {settings.checkInsEnabled ? (
                  <>
                    <Text style={styles.sectionLabel}>
                      {t("modals.engage.reminders.sections.afterQuietFor")}
                    </Text>
                    <View style={styles.chipRow}>
                      {CADENCE_OPTIONS.map((cadenceDays) => {
                        const selected = settings.cadenceDays === cadenceDays;
                        return (
                          <TouchableOpacity
                            key={cadenceDays}
                            style={[
                              styles.chip,
                              selected && styles.chipSelected,
                            ]}
                            onPress={() => updateSetting({ cadenceDays })}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                selected && styles.chipTextSelected,
                              ]}
                            >
                              {t(`modals.engage.reminders.cadence.${cadenceDays}`)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                <Text style={styles.sectionLabel}>
                  {t("modals.engage.reminders.sections.timeOfDay")}
                </Text>
                <View style={styles.chipRow}>
                  {HOUR_OPTIONS.map((hour) => {
                    const selected = settings.hour === hour;
                    return (
                      <TouchableOpacity
                        key={hour}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => updateSetting({ hour })}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {t(`modals.engage.reminders.hour.${hour}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={styles.privacyText}>
              {t("modals.engage.reminders.privacy")}
            </Text>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>{t("common.done")}</Text>
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
      backgroundColor: colors.overlayStrong,
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
