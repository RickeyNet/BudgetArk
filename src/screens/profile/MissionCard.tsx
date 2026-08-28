/**
 * BudgetArk - Mission Statement Card
 * File: src/screens/profile/MissionCard.tsx
 *
 * The expandable privacy-mission card near the top of the Profile screen.
 * Owns its expanded/collapsed state so toggling it re-renders only this card,
 * not the whole screen.
 */

import React, { useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import { MISSION_STATEMENT } from "../../data/missionStatement";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

const MissionCard: React.FC = () => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  /** Whether the mission statement body is expanded */
  const [missionExpanded, setMissionExpanded] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setMissionExpanded((v) => !v)}
      accessibilityRole="button"
      accessibilityState={{ expanded: missionExpanded }}
      accessibilityLabel={`Mission statement, ${
        missionExpanded ? "expanded" : "collapsed"
      }`}
      style={[
        styles.missionCard,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <Text style={[styles.missionEyebrow, { color: colors.accent }]}>
        {MISSION_STATEMENT.eyebrow}
      </Text>
      <Text style={[styles.missionTitle, { color: colors.text }]}>
        {MISSION_STATEMENT.title}
      </Text>
      {missionExpanded && (
        <Text style={[styles.missionBody, { color: colors.textDim }]}>
          {MISSION_STATEMENT.body}
        </Text>
      )}
      <Text style={[styles.missionChevron, { color: colors.textMuted }]}>
        {missionExpanded ? "▴" : "▾"}
      </Text>
    </TouchableOpacity>
  );
};

export default MissionCard;
