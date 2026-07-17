/**
 * BudgetArk - Profile Card
 * File: src/screens/profile/ProfileCard.tsx
 *
 * The avatar + editable display-name card. Owns the edit-mode and draft-name
 * state so typing a new name re-renders only this card; the saved account
 * still lives in ProfileScreen (reset and currency flows update it too) and
 * is reported back through onUserUpdated.
 */

import React, { useCallback, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import type { UserAccount } from "../../types";
import { updateDisplayName } from "../../storage/userStorage";
import { sanitizeTextInput } from "../../utils/sanitize";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

type ProfileCardProps = {
  user: UserAccount;
  onUserUpdated: (user: UserAccount) => void;
};

const ProfileCard: React.FC<ProfileCardProps> = ({ user, onUserUpdated }) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens);

  /** Editable display name (local state before saving) */
  const [editName, setEditName] = useState("");

  /** Whether the name input is in edit mode */
  const [isEditing, setIsEditing] = useState(false);

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
                  Save
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
                {user.id.slice(0, 8)}... · Tap name to edit
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default ProfileCard;
