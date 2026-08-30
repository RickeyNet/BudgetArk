/**
 * BudgetArk - New Feature Badge
 * File: src/components/NewFeatureBadge.tsx
 *
 * The small "NEW" pill shown next to a settings row for a recently-arrived
 * feature (see featureSpotlightStorage). It's the second touch after the
 * debut carousel: the carousel gets dismissed reflexively, the badge catches
 * the user at the point of use. Cleared when the row is first opened.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

const NewFeatureBadge: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.accent }]}>
      <Text
        style={[styles.text, { color: colors.accentButtonText ?? colors.white }]}
      >
        NEW
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  text: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
});

export default NewFeatureBadge;
