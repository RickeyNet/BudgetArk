/**
 * BudgetArk - Undo Provider
 * File: src/undo/UndoProvider.tsx
 *
 * Global, single-slot undo affordance. After a destructive or mutating
 * action a screen calls `pushUndo({ message, onUndo })`; a transient
 * snackbar slides up above the tab bar with an UNDO button. If the user
 * taps UNDO before it auto-dismisses, `onUndo` runs (the screen is
 * responsible for actually reverting + refreshing its state). Otherwise
 * the bar fades out and the action stands.
 *
 * Single-slot by design: a new push replaces any visible bar (the prior
 * action simply loses its undo window - it was already applied). This
 * mirrors Material's snackbar behavior and keeps the surface predictable
 * for bulk flows that emit one undo for a whole batch.
 *
 * Mounted once near the app root (see App.tsx) so any screen can use it
 * via `useUndo()`. Theme/density/safe-area aware; sits clear of the tab
 * bar using the shared fabBottomOffset().
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { fabBottomOffset } from "../navigation/tabBarLayout";
import { triggerHaptic } from "../utils/haptics";

type PushUndoOptions = {
  /** Short past-tense message, e.g. "Deleted 3 entries". */
  message: string;
  /** Reverts the action + refreshes screen state. May be async. */
  onUndo: () => void | Promise<void>;
  /** How long the bar stays before auto-dismissing. Default 5000ms. */
  durationMs?: number;
};

type UndoContextValue = Readonly<{
  pushUndo: (options: PushUndoOptions) => void;
}>;

const UndoContext = createContext<UndoContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;

type ActiveUndo = PushUndoOptions & { key: number };

export const UndoProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<ActiveUndo | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  // Monotonic key so a rapid replace re-triggers the enter animation and
  // the dismiss timer is unambiguously tied to the latest bar.
  const keyRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const animateOut = useCallback(
    (after?: () => void) => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setActive(null);
          after?.();
        }
      });
    },
    [opacity, translateY]
  );

  const dismiss = useCallback(() => {
    clearTimer();
    animateOut();
  }, [clearTimer, animateOut]);

  const pushUndo = useCallback(
    (options: PushUndoOptions) => {
      clearTimer();
      keyRef.current += 1;
      setActive({ ...options, key: keyRef.current });
    },
    [clearTimer]
  );

  const handleUndoPress = useCallback(() => {
    if (!active) return;
    const { onUndo } = active;
    clearTimer();
    triggerHaptic("success");
    // Run the revert; let the screen own any async/storage work + state
    // refresh. Snackbar dismisses immediately so the UI feels responsive.
    void Promise.resolve(onUndo()).catch(() => {
      /* Screen-side revert failures are surfaced by the screen itself. */
    });
    animateOut();
  }, [active, clearTimer, animateOut]);

  // Drive enter animation + auto-dismiss whenever a new bar becomes active.
  useEffect(() => {
    if (!active) return;
    opacity.setValue(0);
    translateY.setValue(20);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      animateOut();
    }, active.durationMs ?? DEFAULT_DURATION_MS);

    return clearTimer;
    // `active.key` changing is what we key the effect on (new bar instance).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.key]);

  const value = useMemo<UndoContextValue>(() => ({ pushUndo }), [pushUndo]);

  return (
    <UndoContext.Provider value={value}>
      {children}
      {active && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              bottom: fabBottomOffset(insets.bottom),
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            style={[
              styles.bar,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                borderRadius: tokens.radius,
              },
            ]}
          >
            <Text
              style={[styles.message, { color: colors.text }]}
              numberOfLines={2}
            >
              {active.message}
            </Text>
            <TouchableOpacity
              onPress={handleUndoPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Undo last action"
            >
              <Text style={[styles.undo, { color: colors.accent }]}>UNDO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={dismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <Text style={[styles.close, { color: colors.textMuted }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </UndoContext.Provider>
  );
};

export const useUndo = (): UndoContextValue => {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndo() must be used inside <UndoProvider>.");
  return ctx;
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "stretch",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    // Float it above content with a soft shadow on both platforms.
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  undo: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  close: {
    fontSize: 13,
    fontWeight: "700",
  },
});
