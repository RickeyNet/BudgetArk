/**
 * BudgetArk - Profile Card
 * File: src/screens/profile/ProfileCard.tsx
 *
 * The avatar + editable display-name card, with the Ship's Log
 * (achievements) line as its footer. Owns the edit-mode and draft-name
 * state so typing a new name re-renders only this card; the saved account
 * still lives in ProfileScreen (reset and currency flows update it too) and
 * is reported back through onUserUpdated. The Ship's Log used to be a
 * one-row PROGRESS card of its own; achievements are about the person, so
 * the line belongs under their name, and the tab loses a section header.
 */

import React, { useCallback, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import type { UserAccount } from "../../types";
import { updateDisplayName } from "../../storage/userStorage";
import { sanitizeTextInput } from "../../utils/sanitize";
import { useAchievements } from "../../achievements/AchievementsProvider";
import AchievementsScreen from "../AchievementsScreen";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

type ProfileCardProps = {
  user: UserAccount;
  onUserUpdated: (user: UserAccount) => void;
};

const ProfileCard: React.FC<ProfileCardProps> = ({ user, onUserUpdated }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  const { unlocked: achievementUnlocked, totalCount: totalAchievements } =
    useAchievements();

  /** Editable display name (local state before saving) */
  const [editName, setEditName] = useState("");

  /** Whether the name input is in edit mode */
  const [isEditing, setIsEditing] = useState(false);

  /** Whether the Ship's Log (achievements) screen is visible */
  const [showAchievements, setShowAchievements] = useState(false);

  /**
   * Saves the updated display name to storage.
   * Trims whitespace and falls back to "Buddy" if empty.
   */
  const handleSaveName = useCallback(async () => {
    const updated = await updateDisplayName(editName);
    onUserUpdated(updated);
    setIsEditing(false);
  }, [editName, onUserUpdated]);

  return (
    <>
      <View
        style={[
          styles.profileCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.profileRow}>
          {/* Avatar circle */}
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarText, { color: colors.white }]}>
              {user.displayName[0].toUpperCase()}
            </Text>
          </View>

          {/* Display name - tap to edit */}
          <View style={styles.profileInfo}>
            {isEditing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.cardBorder,
                      color: colors.text,
                    },
                  ]}
                  value={editName}
                  onChangeText={(text) => setEditName(sanitizeTextInput(text))}
                  autoFocus
                  maxLength={20}
                />
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.success }]}
                  onPress={handleSaveName}
                >
                  <Text style={[styles.saveBtnText, { color: colors.bg }]}>
                    {t("common.save")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  // Seed the draft from the current name each time editing
                  // starts (the monolithic screen seeded it on load / reset).
                  setEditName(user.displayName);
                  setIsEditing(true);
                }}
              >
                <Text style={[styles.displayName, { color: colors.text }]}>
                  {user.displayName}
                </Text>
                <Text style={[styles.editHint, { color: colors.textMuted }]}>
                  {t("profile.main.card.editHint", { idPrefix: user.id.slice(0, 8) })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Ship's Log footer line */}
        <TouchableOpacity
          style={[styles.profileFooterRow, { borderTopColor: colors.cardBorder }]}
          onPress={() => {
            triggerHaptic("selection");
            setShowAchievements(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t("profile.main.progress.shipsLogA11y")}
        >
          <View style={styles.rowTextWrap}>
            <Text style={[styles.settingsRowText, { color: colors.text }]}>
              {t("profile.main.progress.shipsLog")}
            </Text>
            <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
              {t("profile.main.progress.earned", {
                unlocked: Object.keys(achievementUnlocked).length,
                total: totalAchievements,
              })}
            </Text>
          </View>
          <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
            →
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Ship's Log (achievements) ── */}
      <AchievementsScreen
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
      />
    </>
  );
};

export default ProfileCard;
