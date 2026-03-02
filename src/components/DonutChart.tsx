/**
 * BudgetBuddy — DonutChart Component
 * File: src/components/DonutChart.tsx
 *
 * Simple SVG-based donut chart that works in Expo Go.
 * No native modules beyond react-native-svg (included in Expo).
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
}

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 200,
  strokeWidth = 32,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) return null;

  let cumulativeOffset = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          {data.map((slice) => {
            const sliceLength = (slice.value / total) * circumference;
            const gapLength = circumference - sliceLength;
            const offset = cumulativeOffset;
            cumulativeOffset += sliceLength;

            return (
              <Circle
                key={slice.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${sliceLength} ${gapLength}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
  },
});

export default React.memo(DonutChart);
