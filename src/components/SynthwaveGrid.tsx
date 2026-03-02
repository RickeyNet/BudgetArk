import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";

interface SynthwaveGridProps {
  color?: string;
}

/**
 * Retro synthwave floor grid with perspective convergence.
 * Square tiles that recede toward a horizon vanishing point.
 * No gradient overlay — just the lines.
 */
const SynthwaveGrid: React.FC<SynthwaveGridProps> = ({
  color = "#c44a90",
}) => {
  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    const W = 600;
    const H = 350;
    const vanishX = W / 2;
    const vanishY = 0;
    const opacity = 0.2;

    // Vertical lines converging to vanishing point
    const vCount = 20;
    const spacing = W / vCount;
    for (let i = 0; i <= vCount; i++) {
      const bottomX = i * spacing;
      const topX = vanishX + (bottomX - vanishX) * 0.05;
      lines.push(
        <Line
          key={`v-${i}`}
          x1={topX}
          y1={vanishY}
          x2={bottomX}
          y2={H}
          stroke={color}
          strokeWidth={0.8}
          opacity={opacity * 0.7}
        />
      );
    }

    // Horizontal lines with perspective spacing (quadratic)
    const rows = 14;
    for (let i = 1; i <= rows; i++) {
      const t = i / rows;
      const y = vanishY + t * t * H;
      const rowOpacity = opacity * (0.2 + 0.8 * t);
      lines.push(
        <Line
          key={`h-${i}`}
          x1={0}
          y1={y}
          x2={W}
          y2={y}
          stroke={color}
          strokeWidth={0.8}
          opacity={rowOpacity}
        />
      );
    }

    return lines;
  }, [color]);

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 600 350" preserveAspectRatio="xMidYMax slice">
        {gridLines}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "45%",
  },
});

export default React.memo(SynthwaveGrid);
