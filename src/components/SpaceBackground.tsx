/**
 * BudgetArk - SpaceBackground
 * File: src/components/SpaceBackground.tsx
 *
 * Full-screen deep-space backdrop for the "Deep Space" theme: a radial
 * gradient base, a few soft nebula glows, and a static starfield.
 *
 * Static by design - a continuously animating canvas on a finance screen
 * burns battery for little gain. Stars are generated once via a seeded PRNG
 * so the field is stable across re-renders (no twinkle-on-every-render).
 *
 * Renders nothing unless mounted; the caller (AppNavigator) gates it on the
 * active theme id so other themes pay zero cost.
 */

import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

type Star = {
  x: number;
  y: number;
  r: number;
  opacity: number;
  tint: string;
};

/** Tiny deterministic PRNG (mulberry32) so the field never reshuffles. */
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

const STAR_TINTS = [
  "rgb(200, 210, 230)",
  "rgb(200, 210, 230)",
  "rgb(200, 210, 230)",
  "rgb(140, 180, 255)",
  "rgb(255, 200, 150)",
];

const SpaceBackground: React.FC = () => {
  const { width, height } = useWindowDimensions();

  const stars = useMemo<Star[]>(() => {
    const rng = makeRng(0x5bace);
    // Density scales with screen area; capped so big tablets stay cheap.
    const count = Math.min(160, Math.round((width * height) / 6500));
    const out: Star[] = [];
    for (let i = 0; i < count; i++) {
      const depth = rng();
      out.push({
        x: rng() * width,
        y: rng() * height,
        r: 0.3 + depth * 1.3,
        opacity: 0.15 + depth * 0.55,
        tint: STAR_TINTS[Math.floor(rng() * STAR_TINTS.length)],
      });
    }
    return out;
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="space" cx="30%" cy="18%" rx="90%" ry="90%">
            <Stop offset="0" stopColor="#0a0e24" />
            <Stop offset="0.5" stopColor="#020408" />
            <Stop offset="1" stopColor="#000000" />
          </RadialGradient>
          <RadialGradient id="nebulaBlue" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#1a3a6a" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#0a1830" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="nebulaViolet" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#2a1a4a" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#10082a" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="nebulaTeal" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#0a3a3a" stopOpacity={0.14} />
            <Stop offset="1" stopColor="#041818" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={height} fill="url(#space)" />

        <Ellipse
          cx={width * 0.12}
          cy={height * 0.08}
          rx={width * 0.7}
          ry={height * 0.32}
          fill="url(#nebulaBlue)"
        />
        <Ellipse
          cx={width * 0.95}
          cy={height * 0.92}
          rx={width * 0.6}
          ry={height * 0.38}
          fill="url(#nebulaViolet)"
        />
        <Ellipse
          cx={width * 0.6}
          cy={height * 0.55}
          rx={width * 0.45}
          ry={height * 0.2}
          fill="url(#nebulaTeal)"
        />

        {stars.map((s, i) => (
          <Circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={s.tint}
            opacity={s.opacity}
          />
        ))}
      </Svg>
    </View>
  );
};

export default React.memo(SpaceBackground);
