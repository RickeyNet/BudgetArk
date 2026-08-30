/**
 * BudgetArk - Forest Background
 * File: src/components/ForestBackground.tsx
 *
 * Ambient background for the Forest theme: layered SVG canopy, mist and
 * fireflies. Rendered by AppNavigator's ambient switch (see
 * AMBIENT_BACKGROUND_THEMES) and hidden when background effects are off.
 */

import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

type Firefly = {
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

const FIREFLY_TINTS = [
  "rgb(164, 214, 161)",
  "rgb(120, 196, 178)",
  "rgb(212, 188, 112)",
];

const ForestBackground: React.FC = () => {
  const { width, height } = useWindowDimensions();

  const fireflies = useMemo<Firefly[]>(() => {
    const rng = makeRng(0xf09e57);
    const count = Math.min(72, Math.round((width * height) / 18000));
    const out: Firefly[] = [];
    for (let i = 0; i < count; i++) {
      const depth = rng();
      out.push({
        x: rng() * width,
        y: rng() * height,
        r: 0.8 + depth * 2.1,
        opacity: 0.08 + depth * 0.24,
        tint: FIREFLY_TINTS[Math.floor(rng() * FIREFLY_TINTS.length)],
      });
    }
    return out;
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="forestBase" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0c1714" />
            <Stop offset="0.42" stopColor="#07100d" />
            <Stop offset="1" stopColor="#020503" />
          </LinearGradient>
          <RadialGradient id="moonMist" cx="28%" cy="10%" rx="72%" ry="52%">
            <Stop offset="0" stopColor="#335449" stopOpacity={0.22} />
            <Stop offset="0.5" stopColor="#173126" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#08110d" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="canopyGlow" cx="78%" cy="22%" rx="64%" ry="46%">
            <Stop offset="0" stopColor="#1e6a5d" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#0b1b16" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="forestFloor" cx="50%" cy="84%" rx="82%" ry="40%">
            <Stop offset="0" stopColor="#102219" stopOpacity={0.48} />
            <Stop offset="1" stopColor="#04100a" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="mistBand" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#9dc8b1" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#9dc8b1" stopOpacity={0.07} />
            <Stop offset="1" stopColor="#9dc8b1" stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={height} fill="url(#forestBase)" />

        <Ellipse
          cx={width * 0.22}
          cy={height * 0.1}
          rx={width * 0.72}
          ry={height * 0.28}
          fill="url(#moonMist)"
        />
        <Ellipse
          cx={width * 0.82}
          cy={height * 0.2}
          rx={width * 0.58}
          ry={height * 0.22}
          fill="url(#canopyGlow)"
        />
        <Ellipse
          cx={width * 0.5}
          cy={height * 0.88}
          rx={width * 0.85}
          ry={height * 0.24}
          fill="url(#forestFloor)"
        />

        <Rect
          x={width * 0.04}
          y={height * 0.34}
          width={width * 0.92}
          height={height * 0.08}
          rx={height * 0.04}
          fill="url(#mistBand)"
        />
        <Rect
          x={width * 0.08}
          y={height * 0.52}
          width={width * 0.84}
          height={height * 0.06}
          rx={height * 0.03}
          fill="url(#mistBand)"
          opacity={0.72}
        />

        {fireflies.map((f, i) => (
          <Circle
            key={i}
            cx={f.x}
            cy={f.y}
            r={f.r}
            fill={f.tint}
            opacity={f.opacity}
          />
        ))}
      </Svg>
    </View>
  );
};

export default React.memo(ForestBackground);
