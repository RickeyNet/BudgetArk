/**
 * BudgetBuddy — Smooth Slider Component
 * File: src/components/SmoothSlider.tsx
 *
 * A performant slider built on react-native-gesture-handler (Pan gesture)
 * and react-native-reanimated (shared values). The thumb and fill bar are
 * driven by shared values on the UI thread so they track the finger at
 * 60 fps without waiting for JS re-renders.
 *
 * React state is updated via runOnJS so the parent can read the snapped
 * value for display / calculations, but any lag on the JS thread does
 * NOT affect the visual smoothness of the slider.
 *
 * ScrollView interop:
 * - activeOffsetX  → gesture activates after 5 px horizontal movement
 * - failOffsetY    → gesture fails (lets ScrollView scroll) on 10 px vertical
 */

import React, { useCallback } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

/* ── Constants ── */
const THUMB_SIZE = 18;
const TRACK_HEIGHT = 8;
const TOUCH_HEIGHT = 32;

/* ── Props ── */
interface SmoothSliderProps {
  /** Current value (controlled) */
  value: number;
  min: number;
  max: number;
  step: number;
  /** Called with the snapped value on every gesture change */
  onValueChange: (value: number) => void;
  /** Colors — passed from the theme so the slider stays theme-aware */
  trackColor: string;
  fillColor: string;
  thumbColor: string;
  thumbBorderColor: string;
}

const SmoothSlider: React.FC<SmoothSliderProps> = React.memo(
  ({
    value,
    min,
    max,
    step,
    onValueChange,
    trackColor,
    fillColor,
    thumbColor,
    thumbBorderColor,
  }) => {
    /* Shared values — live on the UI thread */
    const trackWidth = useSharedValue(0);
    const progress = useSharedValue((value - min) / (max - min));

    /*
     * Keep the shared value in sync when the parent changes the value
     * externally (e.g. +/- buttons, preset buttons, text input).
     */
    React.useEffect(() => {
      progress.value = Math.max(0, Math.min(1, (value - min) / (max - min)));
    }, [value, min, max]);

    /**
     * Snap a raw value to the configured step and clamp to [min, max].
     * Runs on the JS thread (called via runOnJS).
     */
    const commitValue = useCallback(
      (pct: number) => {
        const raw = min + pct * (max - min);
        const snapped = Math.round(raw / step) * step;
        const clamped = Math.max(
          min,
          Math.min(max, Math.round(snapped * 100) / 100)
        );
        onValueChange(clamped);
      },
      [min, max, step, onValueChange]
    );

    /* ── Gesture ── */
    const gesture = Gesture.Pan()
      .onBegin((e) => {
        "worklet";
        if (trackWidth.value <= 0) return;
        const pct = Math.max(0, Math.min(1, e.x / trackWidth.value));
        progress.value = pct;
        runOnJS(commitValue)(pct);
      })
      .onUpdate((e) => {
        "worklet";
        if (trackWidth.value <= 0) return;
        const pct = Math.max(0, Math.min(1, e.x / trackWidth.value));
        progress.value = pct;
        runOnJS(commitValue)(pct);
      })
      .activeOffsetX([-5, 5])
      .failOffsetY([-10, 10])
      .hitSlop({ top: 10, bottom: 10 });

    /* ── Layout ── */
    const handleLayout = useCallback(
      (e: LayoutChangeEvent) => {
        trackWidth.value = e.nativeEvent.layout.width;
      },
      [trackWidth]
    );

    /* ── Animated styles (run on UI thread) ── */
    const fillStyle = useAnimatedStyle(() => ({
      width:
        trackWidth.value > 0
          ? Math.max(4, progress.value * trackWidth.value)
          : 4,
    }));

    const thumbStyle = useAnimatedStyle(() => ({
      transform: [
        {
          translateX:
            trackWidth.value > 0
              ? progress.value * trackWidth.value - THUMB_SIZE / 2
              : -(THUMB_SIZE / 2),
        },
      ],
    }));

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={styles.touchArea} onLayout={handleLayout}>
          <View style={[styles.track, { backgroundColor: trackColor }]}>
            <Animated.View
              style={[styles.fill, { backgroundColor: fillColor }, fillStyle]}
            />
          </View>
          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: thumbColor, borderColor: thumbBorderColor },
              thumbStyle,
            ]}
          />
        </Animated.View>
      </GestureDetector>
    );
  }
);

const styles = StyleSheet.create({
  touchArea: {
    flex: 1,
    height: TOUCH_HEIGHT,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    minWidth: 4,
  },
  thumb: {
    position: "absolute",
    top: (TOUCH_HEIGHT - THUMB_SIZE) / 2,
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
  },
});

export default SmoothSlider;
