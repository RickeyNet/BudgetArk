/**
 * BudgetArk - Feature Spotlight Modal
 * File: src/components/FeatureSpotlightModal.tsx
 *
 * The "debut" carousel for newly-arrived features: one swipeable slide per
 * marquee feature (hero emoji, headline, two-sentence blurb) with a
 * call-to-action that deep-links straight into the feature. Shown once by
 * App.tsx in place of the plain release-notes prompt; the last slide links
 * to the full release notes for everything the carousel doesn't cover.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useAnimatedValue,
} from "react-native";
import type { FeatureSpotlight } from "../data/featureSpotlights";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";

interface FeatureSpotlightModalProps {
  visible: boolean;
  spotlights: readonly FeatureSpotlight[];
  /** Skip or Done - the whole queue counts as seen either way. */
  onDone: () => void;
  /** "Try it now" on a slide - close and deep-link into the feature. */
  onCtaPress: (spotlight: FeatureSpotlight) => void;
  /** "Full release notes" link on the last slide. */
  onOpenReleaseNotes: () => void;
}

const FeatureSpotlightModal: React.FC<FeatureSpotlightModalProps> = ({
  visible,
  spotlights,
  onDone,
  onCtaPress,
  onOpenReleaseNotes,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  // Springs the active slide's hero icon in on every page change - the
  // small entrance beat that separates a debut from a changelog.
  const heroPop = useAnimatedValue(0);

  // Rewind on every presentation so a fresh queue starts at slide one.
  // Done in onShow (an event handler) rather than a visibility effect,
  // which would trip lint's set-state-in-effect rule.
  const handleShow = () => {
    setPage(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  };

  useEffect(() => {
    if (!visible) {
      heroPop.setValue(0);
      return;
    }
    heroPop.setValue(0);
    const spring = Animated.spring(heroPop, {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    });
    spring.start();
    return () => spring.stop();
  }, [visible, page, heroPop]);

  if (spotlights.length === 0) return null;

  const lastIndex = spotlights.length - 1;
  const clampedPage = Math.min(page, lastIndex);
  const isLastPage = clampedPage >= lastIndex;

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    if (pageWidth <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setPage(Math.max(0, Math.min(next, lastIndex)));
  };

  const goToPage = (index: number) => {
    const target = Math.max(0, Math.min(index, lastIndex));
    scrollRef.current?.scrollTo({ x: target * pageWidth, animated: true });
    // Set immediately too - Android doesn't reliably fire momentum-end for
    // programmatic scrolls, and a stale page would mislabel the buttons.
    setPage(target);
  };

  const heroScale = heroPop.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onShow={handleShow}
      onRequestClose={onDone}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumEnd}
            onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}
          >
            {pageWidth > 0 &&
              spotlights.map((spotlight, index) => (
                <View
                  key={spotlight.id}
                  style={[styles.slide, { width: pageWidth }]}
                >
                  <View style={styles.versionPill}>
                    <Text style={styles.versionPillText}>
                      NEW IN {spotlight.sinceVersion}
                    </Text>
                  </View>
                  {index === clampedPage ? (
                    <Animated.Text
                      style={[
                        styles.heroIcon,
                        { transform: [{ scale: heroScale }] },
                      ]}
                    >
                      {spotlight.icon}
                    </Animated.Text>
                  ) : (
                    <Text style={styles.heroIcon}>{spotlight.icon}</Text>
                  )}
                  <Text style={styles.slideTitle}>{spotlight.title}</Text>
                  <Text style={styles.slideBlurb}>{spotlight.blurb}</Text>
                  {spotlight.cta && (
                    <TouchableOpacity
                      style={styles.ctaButton}
                      onPress={() => onCtaPress(spotlight)}
                      accessibilityRole="button"
                      accessibilityLabel={spotlight.cta.label}
                    >
                      <Text style={styles.ctaButtonText}>
                        {spotlight.cta.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
          </ScrollView>

          {spotlights.length > 1 && (
            <View style={styles.dotsRow}>
              {spotlights.map((spotlight, index) => (
                <View
                  key={spotlight.id}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        index === clampedPage
                          ? colors.accent
                          : colors.cardBorder,
                    },
                  ]}
                />
              ))}
            </View>
          )}

          <View style={styles.actionsRow}>
            {isLastPage ? (
              <TouchableOpacity
                onPress={onOpenReleaseNotes}
                accessibilityRole="button"
                accessibilityLabel="Open full release notes"
              >
                <Text style={styles.linkText}>Full release notes</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onDone}
                accessibilityRole="button"
                accessibilityLabel="Skip the feature tour"
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={isLastPage ? onDone : () => goToPage(clampedPage + 1)}
              accessibilityRole="button"
              accessibilityLabel={isLastPage ? "Done" : "Next feature"}
            >
              <Text style={styles.primaryButtonText}>
                {isLastPage ? "Done" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 28,
    },
    box: {
      width: "100%",
      maxHeight: "85%",
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: 20,
      paddingVertical: 24,
      overflow: "hidden",
    },
    slide: {
      paddingHorizontal: 24,
      alignItems: "center",
    },
    versionPill: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginBottom: 18,
    },
    versionPillText: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.2,
      color: colors.accentButtonText ?? colors.white,
    },
    heroIcon: {
      fontSize: 56,
      lineHeight: 68,
      marginBottom: 14,
    },
    slideTitle: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 10,
    },
    slideBlurb: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textDim,
      textAlign: "center",
      marginBottom: 18,
    },
    ctaButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 28,
      alignItems: "center",
    },
    ctaButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.accentButtonText ?? colors.white,
    },
    dotsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 7,
      marginTop: 18,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 24,
      marginTop: 18,
    },
    skipText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
      paddingVertical: 8,
    },
    linkText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.accent,
      paddingVertical: 8,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 32,
      alignItems: "center",
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.accentButtonText ?? colors.white,
    },
  });

export default FeatureSpotlightModal;
