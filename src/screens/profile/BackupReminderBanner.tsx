/**
 * BudgetArk - Backup Reminder Banner
 * File: src/screens/profile/BackupReminderBanner.tsx
 *
 * The "back up now" banner at the top of the Profile screen, shown when the
 * user has never exported or last exported on an older app version. Renders
 * nothing when the reminder shouldn't show. The export itself is owned by
 * DataSection, so the "Back up now" tap is delegated to the parent.
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { CURRENT_APP_VERSION } from "../../data/releaseNotes";
import {
  dismissBackupReminder,
  shouldShowBackupReminder,
  type BackupReminderState,
} from "../../storage/backupReminderStorage";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

type BackupReminderBannerProps = {
  backupState: BackupReminderState;
  /** Opens the export flow (owned by DataSection). */
  onBackUpNow: () => void;
  /** Re-reads the persisted reminder state after a dismiss. */
  onRefreshBackupState: () => Promise<void>;
};

const BackupReminderBanner: React.FC<BackupReminderBannerProps> = ({
  backupState,
  onBackUpNow,
  onRefreshBackupState,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  if (!shouldShowBackupReminder(backupState, CURRENT_APP_VERSION)) {
    return null;
  }

  return (
    <View
      style={[
        styles.backupBanner,
        { backgroundColor: colors.card, borderColor: colors.accent },
      ]}
    >
      <Text style={[styles.backupBannerTitle, { color: colors.text }]}>
        {backupState.lastBackupVersion
          ? t("profile.main.backupBanner.upgradedTitle", { version: CURRENT_APP_VERSION })
          : t("profile.main.backupBanner.noBackupTitle")}
      </Text>
      <Text style={[styles.backupBannerBody, { color: colors.textDim }]}>
        {backupState.lastBackupVersion
          ? t("profile.main.backupBanner.upgradedBody", {
              lastVersion: backupState.lastBackupVersion,
            })
          : t("profile.main.backupBanner.noBackupBody")}
      </Text>
      <View style={styles.backupBannerActions}>
        <TouchableOpacity
          style={[
            styles.backupBannerPrimary,
            { backgroundColor: colors.accent },
          ]}
          onPress={onBackUpNow}
        >
          <Text
            style={[
              styles.backupBannerPrimaryText,
              { color: colors.white },
            ]}
          >
            {t("profile.main.backupBanner.backUpNow")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backupBannerSecondary}
          onPress={async () => {
            await dismissBackupReminder(CURRENT_APP_VERSION);
            await onRefreshBackupState();
          }}
        >
          <Text
            style={[
              styles.backupBannerSecondaryText,
              { color: colors.textDim },
            ]}
          >
            {t("profile.main.backupBanner.dismiss")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BackupReminderBanner;
