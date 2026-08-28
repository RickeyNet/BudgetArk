/**
 * BudgetArk - Coachmark Spotlight
 * File: src/onboarding/Spotlight.tsx
 *
 * The highlight + tooltip overlay behind the first-launch walkthrough and
 * tab tours. Deliberately a plain in-tree absolute overlay rather than a
 * Modal: chaining Modals step-to-step raced iOS's present/dismiss and froze
 * the app (see useTabCoachmark). Anchor rects come from the target's
 * measureInWindow, translated into this overlay's own coordinate space.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useAnimatedValue,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type { CoachmarkStep } from "../data/coachmarkContent";
import { useMeasureAnchor, type AnchorRect } from "./CoachmarkAnchorContext";
import { useValueChanged } from "../hooks/useValueChanged";

type SpotlightProps = {
  visible: boolean;
  step: CoachmarkStep | null;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  /** Step back within this tab's steps; button hidden on the first step. */
  onBack?: () => void;
  onSkipAll: () => void;
};

/**
 * Padding around the spotlight cutout. Set generously so drop-shadows on
 * elevated elements (FABs especially) sit inside the highlight ring instead
 * of looking like the button extends below the highlight.
 */
const CUTOUT_PADDING = 14;
/** Min height the tooltip card needs - used to choose above/below placement.
 * Sized for the spotlight-style hero emoji + centered title the card now
 * carries (see the feature-debut carousel it mirrors). */
const TOOLTIP_MIN_HEIGHT = 240;
/** Margin between the cutout and the tooltip card. */
const TOOLTIP_GAP = 16;
/**
 * Wait long enough after the overlay appears that layout and any
 * scroll-into-view motion have settled before we measure. 80 ms wasn't
 * always enough on iOS, so the ring landed slightly off the anchor.
 */
const INITIAL_MEASURE_DELAY_MS = 200;

const Spotlight: React.FC<SpotlightProps> = ({
  visible,
  step,
  stepIndex,
  totalSteps,
  onNext,
  onBack,
  onSkipAll,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const measure = useMeasureAnchor();
  const [rect, setRect] = useState<AnchorRect | null>(null);
  const [measureToken, setMeasureToken] = useState(0);
  // Anchor rects are window-relative (measureInWindow), but this overlay is
  // rendered in the screen's own tree, so its origin may not be the window
  // origin. Measure the overlay's window frame and subtract it to translate
  // rects into local coordinates - this also makes the math immune to the
  // Android status/nav-bar inset drift the old Modal needed
  // statusBarTranslucent/navigationBarTranslucent to compensate for.
  const rootRef = useRef<View>(null);
  const [overlayFrame, setOverlayFrame] = useState<AnchorRect | null>(null);
  const handleRootLayout = useCallback(() => {
    rootRef.current?.measureInWindow((x, y, width, height) => {
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        setOverlayFrame({ x, y, width, height });
      }
    });
  }, []);
  // "Learn more" expander for the step's long-form detail. Collapses on
  // every step change (see the useValueChanged below) so a reader's choice
  // on one card never leaves the next card pre-expanded.
  const [detailExpanded, setDetailExpanded] = useState(false);

  // Springs the hero emoji in on every step change - same flair as the
  // feature-debut carousel this card's look mirrors.
  const heroPop = useAnimatedValue(0);
  useEffect(() => {
    if (!visible) return;
    heroPop.setValue(0);
    const spring = Animated.spring(heroPop, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    });
    spring.start();
    return () => spring.stop();
  }, [visible, stepIndex, heroPop]);
  const heroScale = heroPop.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  // Clear the previous rect the moment the measurement target changes, so
  // the old highlight doesn't linger over the new step's text while we wait
  // for scroll-into-view + measure to settle. Render-time adjustment (see
  // useValueChanged) instead of a synchronous setState in the measure effect
  // below.
  const measureKey = `${visible ? 1 : 0}|${stepIndex}|${step?.anchorId ?? ""}|${measureToken}`;
  if (useValueChanged(measureKey)) {
    setRect(null);
  }

  // Separate key from measureKey on purpose: measureToken changes (a Next
  // tap re-measuring the SAME step after a failed anchor read) must not
  // collapse an open detail, but an actual step change must.
  if (useValueChanged(`${visible ? 1 : 0}|${step?.id ?? ""}`) && detailExpanded) {
    setDetailExpanded(false);
  }

  // Re-measure whenever the step changes or visibility flips on.
  useEffect(() => {
    if (!visible || !step?.anchorId) return;
    let cancelled = false;
    const id = step.anchorId;
    const tick = setTimeout(async () => {
      const measured = await measure(id);
      if (!cancelled) setRect(measured);
    }, INITIAL_MEASURE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(tick);
    };
  }, [visible, step, measure, measureToken]);

  const screen = Dimensions.get("window");

  /** Anchor rect translated into the overlay's local coordinate space. */
  const localRect = useMemo(() => {
    if (!rect) return null;
    if (!overlayFrame) return rect;
    return { ...rect, x: rect.x - overlayFrame.x, y: rect.y - overlayFrame.y };
  }, [rect, overlayFrame]);

  const overlayHeight = overlayFrame?.height ?? screen.height;

  const placement = useMemo(() => {
    if (!localRect) return { mode: "centered" as const };
    const cutoutTop = localRect.y - CUTOUT_PADDING;
    const cutoutBottom = localRect.y + localRect.height + CUTOUT_PADDING;
    const spaceAbove = cutoutTop;
    const spaceBelow = overlayHeight - cutoutBottom;
    if (spaceBelow >= TOOLTIP_MIN_HEIGHT || spaceBelow >= spaceAbove) {
      return { mode: "below" as const, top: cutoutBottom + TOOLTIP_GAP };
    }
    return { mode: "above" as const, bottom: overlayHeight - cutoutTop + TOOLTIP_GAP };
  }, [localRect, overlayHeight]);

  const handleNext = useCallback(() => {
    onNext();
    // Force re-measure on the next step's anchor.
    setMeasureToken((n) => n + 1);
  }, [onNext]);

  const handleBack = useCallback(() => {
    onBack?.();
    // Same re-measure as forward: the previous step's anchor may have moved.
    setMeasureToken((n) => n + 1);
  }, [onBack]);

  const handleSkip = useCallback(() => {
    onSkipAll();
  }, [onSkipAll]);

  // The old Modal's onRequestClose advanced the tour on Android back; keep
  // that behavior now that there's no Modal to intercept the button.
  useEffect(() => {
    if (!visible || !step) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleNext();
      return true;
    });
    return () => sub.remove();
  }, [visible, step, handleNext]);

  if (!visible || !step) return null;

  const isLast = stepIndex >= totalSteps - 1;
  const counterText = `${stepIndex + 1} of ${totalSteps}`;
  const nextLabel = isLast ? "Got it" : "Next";

  return (
    // Deliberately NOT a <Modal>: the guided tour chains one spotlight per
    // tab, and presenting the next tab's Modal while the previous one was
    // still dismissing hit the iOS concurrent present/dismiss race - a stuck
    // transparent modal window that froze all touches after every step
    // (reported on iPhone 13). An in-tree absolutely-positioned overlay never
    // touches UIKit presentation, so there is nothing to race. The screen
    // renders this as the last child of its root, and zIndex keeps it above
    // screen content; the tab bar (a later sibling at the navigator level)
    // stays above and tappable - switching tabs mid-tour is already handled
    // by the focus-loss guard in useTabCoachmark. No pointerEvents="box-none"
    // on the root: it must swallow touches everywhere (including the cutout)
    // exactly like the Modal window did.
    <View
      ref={rootRef}
      onLayout={handleRootLayout}
      style={styles.root}
      accessibilityViewIsModal
    >
        {localRect ? (
          <>
            {/* Top dim strip */}
            <View
              style={[
                styles.dim,
                {
                  top: 0,
                  left: 0,
                  right: 0,
                  height: Math.max(0, localRect.y - CUTOUT_PADDING),
                },
              ]}
            />
            {/* Bottom dim strip */}
            <View
              style={[
                styles.dim,
                {
                  top: localRect.y + localRect.height + CUTOUT_PADDING,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            />
            {/* Left dim strip */}
            <View
              style={[
                styles.dim,
                {
                  top: Math.max(0, localRect.y - CUTOUT_PADDING),
                  left: 0,
                  width: Math.max(0, localRect.x - CUTOUT_PADDING),
                  height: localRect.height + CUTOUT_PADDING * 2,
                },
              ]}
            />
            {/* Right dim strip */}
            <View
              style={[
                styles.dim,
                {
                  top: Math.max(0, localRect.y - CUTOUT_PADDING),
                  left: localRect.x + localRect.width + CUTOUT_PADDING,
                  right: 0,
                  height: localRect.height + CUTOUT_PADDING * 2,
                },
              ]}
            />
            {/* Highlight ring around the anchor */}
            <View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  top: localRect.y - CUTOUT_PADDING,
                  left: localRect.x - CUTOUT_PADDING,
                  width: localRect.width + CUTOUT_PADDING * 2,
                  height: localRect.height + CUTOUT_PADDING * 2,
                  borderRadius: tokens.radius + 4,
                  borderColor: colors.accent,
                },
              ]}
            />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFill]} />
        )}

        {/* Tooltip card */}
        <View
          style={[
            styles.tooltipWrap,
            placement.mode === "below"
              ? { top: placement.top, left: 16, right: 16 }
              : placement.mode === "above"
              ? { bottom: placement.bottom, left: 16, right: 16 }
              : { top: 0, bottom: 0, left: 16, right: 16, justifyContent: "center" },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.eyebrow}>ONBOARDING</Text>
              <Text style={styles.counter}>{counterText}</Text>
            </View>
            {step.emoji ? (
              <Animated.Text
                style={[styles.heroEmoji, { transform: [{ scale: heroScale }] }]}
              >
                {step.emoji}
              </Animated.Text>
            ) : null}
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
            {step.detail ? (
              detailExpanded ? (
                <ScrollView
                  style={styles.detailScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                >
                  <Text style={styles.detailText}>{step.detail}</Text>
                </ScrollView>
              ) : (
                <TouchableOpacity
                  onPress={() => setDetailExpanded(true)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[styles.learnMore, { color: colors.accent }]}>
                    Learn more
                  </Text>
                </TouchableOpacity>
              )
            ) : null}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>Skip all</Text>
              </TouchableOpacity>
              {onBack && stepIndex > 0 && (
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>{nextLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    root: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      // Above everything in the screen's own tree (FABs, banners). The tab
      // bar lives at the navigator level and still stacks above this.
      zIndex: 1000,
      elevation: 1000,
    },
    dim: {
      position: "absolute",
      backgroundColor: colors.overlay,
    },
    ring: {
      position: "absolute",
      borderWidth: 2,
    },
    tooltipWrap: {
      position: "absolute",
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}40`,
      borderRadius: tokens.radius + 4,
      padding: tokens.padLg,
      gap: tokens.gapSm,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    eyebrow: {
      fontSize: scale(11),
      fontWeight: "700",
      letterSpacing: 1.5,
      color: colors.accent,
    },
    counter: {
      fontSize: scale(11),
      fontWeight: "600",
      color: colors.textMuted,
      letterSpacing: 1,
    },
    heroEmoji: {
      fontSize: scale(48),
      lineHeight: scale(58),
      textAlign: "center",
      marginTop: 2,
    },
    title: {
      fontSize: scale(21),
      lineHeight: scale(27),
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    body: {
      fontSize: scale(14),
      lineHeight: scale(20),
      color: colors.textDim,
      textAlign: "center",
    },
    learnMore: {
      fontSize: scale(13),
      fontWeight: "700",
      textAlign: "center",
    },
    detailScroll: {
      // Cap the expanded detail so a long entry can never push the
      // Next/Back buttons off-screen; the text scrolls inside instead.
      maxHeight: 180,
    },
    detailText: {
      fontSize: scale(13),
      lineHeight: scale(19),
      color: colors.textDim,
    },
    buttonRow: {
      flexDirection: "row",
      gap: tokens.gapSm,
      marginTop: tokens.gapSm,
    },
    skipBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    skipBtnText: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.textDim,
    },
    backBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: `${colors.accent}40`,
      borderRadius: tokens.radiusSm,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    backBtnText: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.accent,
    },
    nextBtn: {
      flex: 2,
      borderRadius: tokens.radiusSm,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.accent,
    },
    nextBtnText: {
      fontSize: scale(14),
      fontWeight: "700",
      color: colors.accentButtonText,
    },
  });
};

export default Spotlight;
