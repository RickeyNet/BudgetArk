/**
 * BudgetArk - Tip Jar Provider
 * File: src/tipjar/TipJarProvider.tsx
 *
 * One app-root owner for the Tip Jar sheet and the occasional post-win
 * nudge, so any tab or root host can reach both without mounting its own
 * copy of TipJarModal (whose useIAP opens a store connection per mount).
 *
 *   noteWin(win)        counts a win (utils/tipJarNudge cadence: one nudge
 *                       per few wins, at most weekly, user switch) and
 *                       resolves the card copy when THIS win earns a nudge,
 *                       else null. Callers with a sheet already open render
 *                       the copy inline (TipJarNudgeCard); everyone else
 *                       hands it to showNudgeToast.
 *   showNudgeToast(copy) slides a floating card up above the tab bar; it
 *                       auto-dismisses. Not a Modal - it sits under any
 *                       real Modal, which is why sheet hosts go inline.
 *   openTipJar()        mounts TipJarModal after the current interaction
 *                       and the caller's own Modal dismiss settle (the iOS
 *                       dismiss-then-present rule, usePresentAfterDismiss).
 *
 * Profile's own Tip Jar row keeps its local mount (the feature-spotlight
 * deep link opens it there); this provider serves everything else.
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
import { Animated, InteractionManager, StyleSheet, useAnimatedValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fabBottomOffset } from "../navigation/tabBarLayout";
import { usePresentAfterDismiss } from "../hooks/usePresentAfterDismiss";
import { recordTipJarWin } from "../storage/tipJarNudgeStorage";
import { tipNudgeCopyFor, type TipNudgeCopy, type WinEvent } from "../utils/tipJarNudge";
import TipJarModal from "../components/TipJarModal";
import TipJarNudgeCard from "../components/TipJarNudgeCard";

type TipJarContextValue = Readonly<{
  noteWin: (win: WinEvent) => Promise<TipNudgeCopy | null>;
  showNudgeToast: (copy: TipNudgeCopy) => void;
  openTipJar: () => void;
}>;

const TipJarContext = createContext<TipJarContextValue | null>(null);

/** Long enough to read two short lines; the card is dismissable sooner. */
const TOAST_DURATION_MS = 12_000;

type ActiveToast = { copy: TipNudgeCopy; key: number };

export const TipJarProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const presentAfterDismiss = usePresentAfterDismiss();
  const [showTipJar, setShowTipJar] = useState(false);
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyRef = useRef(0);
  const opacity = useAnimatedValue(0);
  const translateY = useAnimatedValue(20);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const animateOut = useCallback(() => {
    const keyAtStart = keyRef.current;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 20, duration: 160, useNativeDriver: true }),
    ]).start(({ finished }) => {
      // A newer toast replaced this one mid-exit; leave it alone.
      if (finished && keyRef.current === keyAtStart) setToast(null);
    });
  }, [opacity, translateY]);

  const dismissToast = useCallback(() => {
    clearTimer();
    animateOut();
  }, [animateOut, clearTimer]);

  const showNudgeToast = useCallback(
    (copy: TipNudgeCopy) => {
      clearTimer();
      keyRef.current += 1;
      setToast({ copy, key: keyRef.current });
    },
    [clearTimer]
  );

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    translateY.setValue(20);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(animateOut, TOAST_DURATION_MS);
    return clearTimer;
    // Keyed on the toast instance, like UndoProvider's snackbar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.key]);

  const noteWin = useCallback(async (win: WinEvent): Promise<TipNudgeCopy | null> => {
    try {
      return (await recordTipJarWin()) ? tipNudgeCopyFor(win) : null;
    } catch {
      // A storage hiccup must never turn a win into an error - just no nudge.
      return null;
    }
  }, []);

  // Deferred twice on purpose: past the tap's interaction, then past the
  // caller's Modal dismiss animation (no-op on Android).
  const pendingOpen = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  const openTipJar = useCallback(() => {
    dismissToast();
    pendingOpen.current?.cancel();
    pendingOpen.current = InteractionManager.runAfterInteractions(() => {
      pendingOpen.current = null;
      presentAfterDismiss(() => setShowTipJar(true));
    });
  }, [dismissToast, presentAfterDismiss]);

  useEffect(() => () => pendingOpen.current?.cancel(), []);

  const value = useMemo<TipJarContextValue>(
    () => ({ noteWin, showNudgeToast, openTipJar }),
    [noteWin, showNudgeToast, openTipJar]
  );

  return (
    <TipJarContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastWrap,
            { bottom: fabBottomOffset(insets.bottom), opacity, transform: [{ translateY }] },
          ]}
        >
          <TipJarNudgeCard
            variant="floating"
            copy={toast.copy}
            onTip={openTipJar}
            onDismiss={dismissToast}
          />
        </Animated.View>
      ) : null}
      {/* Mounted on demand: useIAP inside opens the billing connection on
          mount and closes it on unmount. */}
      {showTipJar ? <TipJarModal onClose={() => setShowTipJar(false)} /> : null}
    </TipJarContext.Provider>
  );
};

export const useTipJar = (): TipJarContextValue => {
  const ctx = useContext(TipJarContext);
  if (!ctx) throw new Error("useTipJar() must be used inside <TipJarProvider>.");
  return ctx;
};

const styles = StyleSheet.create({
  toastWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "stretch",
  },
});
