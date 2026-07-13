/**
 * BudgetArk - Deep Sea ambient background
 * File: src/components/DeepSeaBackground.tsx
 *
 * Underwater scene for the Deep Sea theme: light rays filtering down from
 * the surface, drifting bioluminescent plankton motes, and an abyssal
 * vignette at the bottom. Static seeded SVG (no animation), same approach
 * as ForestBackground/SpaceBackground - rendered once behind the navigator
 * when Ambient Backgrounds are enabled.
 */

import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

type Mote = {
  x: number;
  y: number;
  r: number;
  opacity: number;
  tint: string;
};

const makeRng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Bioluminescent plankton tints: cyan, blue, green. */
const MOTE_TINTS = [
  "rgb(110, 232, 216)",
  "rgb(93, 184, 232)",
  "rgb(142, 232, 168)",
];

const DeepSeaBackground: React.FC = () => {
  const { width, height } = useWindowDimensions();

  const motes = useMemo<Mote[]>(() => {
    const rng = makeRng(0x0cea11);
    const count = Math.min(80, Math.round((width * height) / 16000));
    const out: Mote[] = [];
    for (let i = 0; i < count; i++) {
      const depth = rng();
      out.push({
        x: rng() * width,
        // Slight bias toward the upper two-thirds, where the light reaches.
        y: Math.pow(rng(), 1.25) * height,
        r: 0.7 + depth * 2.2,
        opacity: 0.06 + depth * 0.26,
        tint: MOTE_TINTS[Math.floor(rng() * MOTE_TINTS.length)],
      });
    }
    return out;
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="seaBase" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0d2e36" />
            <Stop offset="0.45" stopColor="#06181f" />
            <Stop offset="1" stopColor="#010609" />
          </LinearGradient>
          <RadialGradient id="surfaceGlow" cx="42%" cy="0%" rx="78%" ry="42%">
            <Stop offset="0" stopColor="#2e7a80" stopOpacity={0.26} />
            <Stop offset="0.55" stopColor="#164a52" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#06181f" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="lightShaft" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7fd8d0" stopOpacity={0.13} />
            <Stop offset="0.6" stopColor="#5db8b8" stopOpacity={0.045} />
            <Stop offset="1" stopColor="#5db8b8" stopOpacity={0} />
          </LinearGradient>
          <RadialGradient id="biolumeBloom" cx="80%" cy="78%" rx="52%" ry="34%">
            <Stop offset="0" stopColor="#1a6a56" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#04121a" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="abyssFloor" cx="50%" cy="100%" rx="90%" ry="42%">
            <Stop offset="0" stopColor="#000305" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#000305" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={height} fill="url(#seaBase)" />

        <Ellipse
          cx={width * 0.42}
          cy={0}
          rx={width * 0.82}
          ry={height * 0.4}
          fill="url(#surfaceGlow)"
        />

        {/* Light rays angling down from the surface */}
        <Polygon
          points={`${width * 0.16},0 ${width * 0.27},0 ${width * 0.14},${height * 0.62} ${width * 0.02},${height * 0.62}`}
          fill="url(#lightShaft)"
        />
        <Polygon
          points={`${width * 0.44},0 ${width * 0.52},0 ${width * 0.4},${height * 0.5} ${width * 0.31},${height * 0.5}`}
          fill="url(#lightShaft)"
          opacity={0.8}
        />
        <Polygon
          points={`${width * 0.72},0 ${width * 0.86},0 ${width * 0.76},${height * 0.56} ${width * 0.6},${height * 0.56}`}
          fill="url(#lightShaft)"
          opacity={0.6}
        />

        <Ellipse
          cx={width * 0.8}
          cy={height * 0.78}
          rx={width * 0.52}
          ry={height * 0.3}
          fill="url(#biolumeBloom)"
        />
        <Ellipse
          cx={width * 0.5}
          cy={height}
          rx={width * 0.95}
          ry={height * 0.34}
          fill="url(#abyssFloor)"
        />

        {motes.map((m, i) => (
          <Circle
            key={i}
            cx={m.x}
            cy={m.y}
            r={m.r}
            fill={m.tint}
            opacity={m.opacity}
          />
        ))}
      </Svg>
    </View>
  );
};

export default React.memo(DeepSeaBackground);
