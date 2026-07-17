/**
 * BudgetArk - Progress Section
 * File: src/screens/profile/ProgressSection.tsx
 *
 * The Ship's Log (achievements) row and its full-screen achievements view.
 * Owns its own visibility state and reads unlock counts straight from the
 * achievements provider.
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAchievements } from "../../achievements/AchievementsProvider";
import AchievementsScreen from "../AchievementsScreen";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

const ProgressSection: React.FC = () => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens);

  const { unlocked: achievementUnlocked, totalCount: totalAchievements } =
    useAchievements();

  /** Whether the Ship's Log (achievements) screen is visible */
  const [showAchievements, setShowAchievements] = useState(false);

  return (
    <>
      {/* ── Progress (Ship's Log achievements) ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          PROGRESS
        </Text>

        <View
          style={[
            styles.groupedCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => {
              triggerHaptic("selection");
              setShowAchievements(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Open Ship's Log achievements"
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                Ship's Log
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {`${Object.keys(achievementUnlocked).length}/${totalAchievements} achievements earned`}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Ship's Log (achievements) ── */}
      <AchievementsScreen
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
      />
    </>
  );
};

export default ProgressSection;
