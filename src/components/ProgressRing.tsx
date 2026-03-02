/**
 * BudgetBuddy — ProgressRing Component (Static Version)
 * File: src/components/ProgressRing.tsx
 *
 * Renders a circular progress indicator using SVG.
 * This version uses no animation library for maximum compatibility.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  percent,
  size = 64,
  strokeWidth = 5,
  color = "#323233",
  trackColor = "#504c35",
}) => {
  const safePercent = Number.isFinite(percent) ? percent : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default React.memo(ProgressRing);