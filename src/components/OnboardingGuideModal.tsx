/**
 * BudgetArk - Onboarding guide modal.
 *
 * The single reference surface for "how do I use this and where is it":
 * the same content the guided onboarding tour shows (COACHMARKS), presented
 * as a browsable per-tab accordion with a keyword search on top. Searching
 * "receipt" or "credit card" jumps straight to the relevant steps with
 * their where-to-find breadcrumbs. Also hosts the Redo onboarding action,
 * so onboarding is one thing with one home (Profile → Help → Onboarding).
 *
 * Rendered as a slide-up sheet (AddDebtModal skeleton) rather than a
 * centered dialog: the search field needs the keyboard, and a centered
 * card + keyboard don't share a small screen well.
 */

import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  COACHMARK_TAB_IDS,
  COACHMARKS,
  type CoachmarkStep,
} from "../data/coachmarkContent";
import { searchGuide } from "../utils/guideSearch";
import { sanitizeTextInput } from "../utils/sanitize";
import { triggerHaptic } from "../utils/haptics";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";

interface OnboardingGuideModalProps {
  onClose: () => void;
  /** "Redo onboarding" - the parent owns closing this sheet first, then
   * resetting + restarting the flow (modal must finish dismissing before
   * the onboarding gate flips). */
  onRedoOnboarding: () => void;
}

const StepContent: React.FC<{
  step: CoachmarkStep;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
  titlePrefix?: string;
}> = ({ step, styles, colors, titlePrefix }) => (
  <View style={styles.stepBlock}>
    <Text style={styles.stepTitle}>
      {titlePrefix ? `${titlePrefix} ` : ""}
      {step.emoji ? `${step.emoji} ` : ""}
      {step.title}
    </Text>
    {step.location ? (
      <Text style={[styles.stepLocation, { color: colors.accent }]}>
        📍 {step.location}
      </Text>
    ) : null}
    <Text style={styles.stepDetail}>{step.detail ?? step.body}</Text>
  </View>
);

const OnboardingGuideModal: React.FC<OnboardingGuideModalProps> = ({
  onClose,
  onRedoOnboarding,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [query, setQuery] = useState("");
  const [expandedTab, setExpandedTab] = useState<string | null>(null);

  const trimmed = query.trim();
  const results = useMemo(() => searchGuide(trimmed), [trimmed]);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <SheetKeyboardAvoider style={styles.overlay}>
        <View style={styles.modalSheet}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <Text style={styles.title}>Onboarding</Text>
            <Text style={styles.subtitle}>
              Everything in BudgetArk - browse by tab, or search for what you
              want to do.
            </Text>

            {/* ── Search ── */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder={'Search - try "receipt" or "credit card"'}
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={(text) => setQuery(sanitizeTextInput(text))}
                autoCorrect={false}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => setQuery("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {trimmed.length > 0 ? (
              /* ── Search results ── */
              results.length > 0 ? (
                <View style={styles.resultList}>
                  {results.map(({ tabId, tabLabel, step }) => (
                    <View key={`${tabId}-${step.id}`} style={styles.resultItem}>
                      <Text style={[styles.resultTab, { color: colors.accent }]}>
                        {COACHMARKS[tabId].emoji} {tabLabel.toUpperCase()}
                      </Text>
                      <StepContent step={step} styles={styles} colors={colors} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No matches</Text>
                  <Text style={styles.emptyBody}>
                    Try a different word - like "backup", "notification",
                    "recurring", or the name of a tab.
                  </Text>
                </View>
              )
            ) : (
              /* ── Browse by tab (accordion) ── */
              <View style={styles.resultList}>
                {COACHMARK_TAB_IDS.map((tabId) => {
                  const tour = COACHMARKS[tabId];
                  const expanded = expandedTab === tabId;
                  return (
                    <View key={tabId} style={styles.resultItem}>
                      <TouchableOpacity
                        style={styles.accordionHeader}
                        onPress={() => {
                          triggerHaptic("selection");
                          setExpandedTab(expanded ? null : tabId);
                        }}
                      >
                        <Text style={styles.accordionTitle}>
                          {tour.emoji}  {tour.intro}
                        </Text>
                        <Text style={styles.accordionArrow}>
                          {expanded ? "▾" : "▸"}
                        </Text>
                      </TouchableOpacity>
                      {expanded &&
                        tour.steps.map((step, idx) => (
                          <StepContent
                            key={step.id}
                            step={step}
                            styles={styles}
                            colors={colors}
                            titlePrefix={`${idx + 1}.`}
                          />
                        ))}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* ── Pinned footer ── */}
          <View
            style={[
              styles.buttonRow,
              Platform.OS === "android" && insets.bottom > 0
                ? { paddingBottom: insets.bottom + 12 }
                : null,
            ]}
          >
            <TouchableOpacity
              style={styles.redoButton}
              onPress={() => {
                triggerHaptic("selection");
                onRedoOnboarding();
              }}
            >
              <Text style={styles.redoText}>Redo onboarding</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SheetKeyboardAvoider>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlayStrong,
      justifyContent: "flex-end",
    },
    modalSheet: {
      flex: 1,
      marginTop: Platform.OS === "ios" ? 44 : 32,
      backgroundColor: colors.card,
      borderTopLeftRadius: tokens.radius,
      borderTopRightRadius: tokens.radius,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      overflow: "hidden",
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      padding: tokens.padLg,
      paddingBottom: 40,
    },
    title: {
      fontSize: scale(22),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: scale(14),
      color: colors.textDim,
      marginBottom: tokens.gap,
    },

    /* Search */
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: tokens.gap,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.padSm,
      paddingVertical: tokens.padSm,
      paddingRight: 38,
      color: colors.text,
      fontSize: scale(15),
    },
    clearBtn: {
      position: "absolute",
      right: tokens.padSm,
    },
    clearBtnText: {
      fontSize: scale(14),
      color: colors.textMuted,
      fontWeight: "600",
    },

    /* Result / accordion cards */
    resultList: {
      gap: tokens.gapSm,
    },
    resultItem: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      backgroundColor: colors.bg,
    },
    resultTab: {
      fontSize: scale(10),
      fontWeight: "700",
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    accordionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: tokens.gap,
    },
    accordionTitle: {
      flex: 1,
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    accordionArrow: {
      fontSize: scale(14),
      color: colors.textDim,
    },
    stepBlock: {
      marginTop: tokens.gapSm,
    },
    stepTitle: {
      fontSize: scale(13),
      fontWeight: "700",
      color: colors.text,
    },
    stepLocation: {
      fontSize: scale(12),
      fontWeight: "600",
      marginTop: 2,
    },
    stepDetail: {
      fontSize: scale(13),
      lineHeight: scale(19),
      color: colors.textDim,
      marginTop: 4,
    },

    /* Empty state */
    emptyState: {
      alignItems: "center",
      paddingVertical: tokens.padLg,
      gap: tokens.gapSm,
    },
    emptyTitle: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
    },
    emptyBody: {
      fontSize: scale(13),
      lineHeight: scale(19),
      color: colors.textDim,
      textAlign: "center",
    },

    /* Pinned footer */
    buttonRow: {
      flexDirection: "row",
      gap: tokens.gap,
      paddingHorizontal: tokens.padLg,
      paddingTop: tokens.padSm,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    redoButton: {
      flex: 1,
      paddingVertical: tokens.pad,
      borderRadius: tokens.radius,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    redoText: {
      color: colors.textDim,
      fontSize: scale(15),
      fontWeight: "600",
    },
    doneButton: {
      flex: 1,
      paddingVertical: tokens.pad,
      borderRadius: tokens.radius,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    doneText: {
      color: colors.accentButtonText,
      fontSize: scale(15),
      fontWeight: "700",
    },
  });
};

export default React.memo(OnboardingGuideModal);
