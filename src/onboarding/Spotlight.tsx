import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type { CoachmarkStep } from "../data/coachmarkContent";
import { useMeasureAnchor, type AnchorRect } from "./CoachmarkAnchorContext";

type SpotlightProps = {
  visible: boolean;
  step: CoachmarkStep | null;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkipAll: () => void;
};

/**
 * Padding around the spotlight cutout. Set generously so drop-shadows on
 * elevated elements (FABs especially) sit inside the highlight ring instead
 * of looking like the button extends below the highlight.
 */
const CUTOUT_PADDING = 14;
/** Min height the tooltip card needs — used to choose above/below placement. */
const TOOLTIP_MIN_HEIGHT = 180;
/** Margin between the cutout and the tooltip card. */
const TOOLTIP_GAP = 16;
/**
 * Wait long enough after the Modal opens that its fade animation has settled
 * and the underlying view has stopped moving before we measure. 80 ms wasn't
 * always enough on iOS, so the ring landed slightly off the anchor.
 */
const INITIAL_MEASURE_DELAY_MS = 200;

const Spotlight: React.FC<SpotlightProps> = ({
  visible,
  step,
  stepIndex,
  totalSteps,
  onNext,
  onSkipAll,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const measure = useMeasureAnchor();
  const [rect, setRect] = useState<AnchorRect | null>(null);
  const [measureToken, setMeasureToken] = useState(0);

  // Re-measure whenever the step changes or visibility flips on. Clear the
  // previous rect first so the old highlight doesn't linger over the new
  // step's text while we wait for scroll-into-view + measure to settle.
  useEffect(() => {
    setRect(null);
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

  const placement = useMemo(() => {
    if (!rect) return { mode: "centered" as const };
    const cutoutTop = rect.y - CUTOUT_PADDING;
    const cutoutBottom = rect.y + rect.height + CUTOUT_PADDING;
    const spaceAbove = cutoutTop;
    const spaceBelow = screen.height - cutoutBottom;
    if (spaceBelow >= TOOLTIP_MIN_HEIGHT || spaceBelow >= spaceAbove) {
      return { mode: "below" as const, top: cutoutBottom + TOOLTIP_GAP };
    }
    return { mode: "above" as const, bottom: screen.height - cutoutTop + TOOLTIP_GAP };
  }, [rect, screen.height]);

  const handleNext = useCallback(() => {
    onNext();
    // Force re-measure on the next step's anchor.
    setMeasureToken((n) => n + 1);
  }, [onNext]);

  const handleSkip = useCallback(() => {
    onSkipAll();
  }, [onSkipAll]);

  if (!step) return null;

  const isLast = stepIndex >= totalSteps - 1;
  const counterText = `${stepIndex + 1} of ${totalSteps}`;
  const nextLabel = isLast ? "Got it" : "Next";

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleNext}>
      <View style={styles.root} pointerEvents="box-none">
        {rect ? (
          <>
            {/* Top dim strip */}
            <View
              style={[
                styles.dim,
                {
                  top: 0,
                  left: 0,
                  right: 0,
                  height: Math.max(0, rect.y - CUTOUT_PADDING),
                },
              ]}
            />
            {/* Bottom dim strip */}
            <View
              style={[
                styles.dim,
                {
                  top: rect.y + rect.height + CUTOUT_PADDING,
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
                  top: Math.max(0, rect.y - CUTOUT_PADDING),
                  left: 0,
                  width: Math.max(0, rect.x - CUTOUT_PADDING),
                  height: rect.height + CUTOUT_PADDING * 2,
                },
              ]}
            />
            {/* Right dim strip */}
            <View
              style={[
                styles.dim,
                {
                  top: Math.max(0, rect.y - CUTOUT_PADDING),
                  left: rect.x + rect.width + CUTOUT_PADDING,
                  right: 0,
                  height: rect.height + CUTOUT_PADDING * 2,
                },
              ]}
            />
            {/* Highlight ring around the anchor */}
            <View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  top: rect.y - CUTOUT_PADDING,
                  left: rect.x - CUTOUT_PADDING,
                  width: rect.width + CUTOUT_PADDING * 2,
                  height: rect.height + CUTOUT_PADDING * 2,
                  borderRadius: tokens.radius + 4,
                  borderColor: colors.accent,
                },
              ]}
            />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFillObject]} />
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
              <Text style={styles.eyebrow}>WALKTHROUGH</Text>
              <Text style={styles.counter}>{counterText}</Text>
            </View>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>Skip all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>{nextLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    root: { flex: 1 },
    dim: {
      position: "absolute",
      backgroundColor: "rgba(0,0,0,0.78)",
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
    title: {
      fontSize: scale(20),
      fontWeight: "700",
      color: colors.text,
    },
    body: {
      fontSize: scale(14),
      lineHeight: scale(20),
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
