import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";

/** Fixed seed positions/timings so the fall looks scattered but deterministic. */
const CONFETTI_SEEDS = [
  { left: 0.05, delay: 0, rotate: "-24deg" },
  { left: 0.13, delay: 300, rotate: "18deg" },
  { left: 0.22, delay: 1200, rotate: "-10deg" },
  { left: 0.31, delay: 700, rotate: "28deg" },
  { left: 0.4, delay: 1500, rotate: "-30deg" },
  { left: 0.5, delay: 500, rotate: "12deg" },
  { left: 0.6, delay: 1000, rotate: "-18deg" },
  { left: 0.69, delay: 200, rotate: "24deg" },
  { left: 0.78, delay: 1300, rotate: "-14deg" },
  { left: 0.87, delay: 900, rotate: "16deg" },
  { left: 0.94, delay: 1600, rotate: "-22deg" },
] as const;

interface ConfettiBurstProps {
  /** Drives the loop - pass the host modal's `visible` so it stops when hidden. */
  active: boolean;
}

/**
 * Full-bleed falling-confetti layer. Absolutely positioned and
 * non-interactive, so it overlays whatever celebration card sits beneath it.
 * Shared by the payoff and per-payment celebrations.
 */
const ConfettiBurst: React.FC<ConfettiBurstProps> = ({ active }) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [active, progress]);

  return (
    <View pointerEvents="none" style={styles.layer}>
      {CONFETTI_SEEDS.map((seed, index) => {
        const travel = height * 0.75 + 140;
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-100 - seed.delay * 0.08, travel - seed.delay * 0.03],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.08, 0.9, 1],
          outputRange: [0, 1, 1, 0],
        });

        return (
          <Animated.View
            key={`${seed.left}-${index}`}
            style={[
              styles.piece,
              {
                left: width * seed.left,
                backgroundColor:
                  index % 3 === 0
                    ? colors.accent
                    : index % 3 === 1
                      ? colors.success
                      : colors.warning,
                opacity,
                transform: [{ translateY }, { rotate: seed.rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  piece: {
    position: "absolute",
    top: 0,
    width: 10,
    height: 18,
    borderRadius: 3,
  },
});

export default React.memo(ConfettiBurst);
