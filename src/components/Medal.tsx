/**
 * BudgetArk - Medal Component
 * File: src/components/Medal.tsx
 *
 * Renders a single achievement badge: a tier-colored ring drawn with
 * react-native-svg + a centered emoji glyph. Locked badges render with a
 * dim ring and a lock glyph so the grid still shows the slot.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import type { AchievementTier } from "../types";

interface MedalProps {
  tier: AchievementTier;
  glyph: string;
  locked?: boolean;
  size?: number;
}

const TIER_COLORS: Record<AchievementTier, { ring: string; track: string }> = {
  bronze: { ring: "#A87445", track: "#3a2a1a" },
  silver: { ring: "#C7CBD1", track: "#33363b" },
  gold: { ring: "#E8C66E", track: "#3a3220" },
  // Legendary uses a gradient stroke defined inline below.
  legendary: { ring: "url(#legendaryStroke)", track: "#3a2540" },
};

const Medal: React.FC<MedalProps> = ({ tier, glyph, locked = false, size = 72 }) => {
  const strokeWidth = Math.max(3, Math.round(size * 0.07));
  const radius = (size - strokeWidth) / 2;
  const palette = TIER_COLORS[tier];

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, opacity: locked ? 0.45 : 1 },
      ]}
    >
      <Svg width={size} height={size}>
        {tier === "legendary" && (
          <Defs>
            <LinearGradient id="legendaryStroke" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FF6B9D" />
              <Stop offset="50%" stopColor="#E8C66E" />
              <Stop offset="100%" stopColor="#6BC9FF" />
            </LinearGradient>
          </Defs>
        )}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={palette.track}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={palette.ring}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </Svg>
      <Text
        style={[styles.glyph, { fontSize: Math.round(size * 0.45) }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {locked ? "🔒" : glyph}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  glyph: {
    position: "absolute",
    textAlign: "center",
    includeFontPadding: false,
  },
});

export default React.memo(Medal);
