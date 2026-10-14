/**
 * BudgetArk - Help Section
 * File: src/screens/profile/HelpSection.tsx
 *
 * The HELP card: "Feature guide" and "Send Feedback". The guide row opens
 * the searchable directory of every feature (FeatureGuideModal), which also
 * hosts the tab-by-tab coachmark tour, the "Update spotlight" replay link
 * and the Redo onboarding button - three rows (Onboarding, Update
 * spotlight, Feature guide) used to split that one subject. Feedback used
 * to share a SUPPORT card with the Tip Jar near the top of the tab; it is
 * help-adjacent, and the in-app language note already told users to look
 * under Help → Send Feedback, so it lives here now. The Tip Jar stays at
 * the top of the tab as its own card (TipJarSection) - user request.
 *
 * This section owns the sequences that must wait for the guide sheet to
 * dismiss first - replaying the carousel (another Modal) and redoing
 * onboarding (reset the onboarding flag + coachmark state, then flip the
 * app gate) - and registers the help-card coachmark anchor. Feedback modal
 * state is local. The imperative handle lets the `openSection:
 * "featureGuide"` deep link open the guide from ProfileScreen's deferred
 * effect.
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useCoachmarks } from "../../onboarding/CoachmarksProvider";
import { useCoachmarkAnchor } from "../../onboarding/CoachmarkAnchorContext";
import { useOnboardingGate } from "../../onboarding/OnboardingGateContext";
import { useFeatureTour } from "../../components/FeatureTourContext";
import { resetOnboardingStatus } from "../../storage/userStorage";
import FeatureGuideModal from "../../components/FeatureGuideModal";
import FeedbackModal from "../../components/FeedbackModal";
import type { FeatureSpotlight } from "../../data/featureSpotlights";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

/** Sheet dismiss animation allowance before presenting the next Modal. */
const SHEET_DISMISS_MS = 350;

export type HelpSectionHandle = {
  /** Open the feature guide sheet (openSection deep link). */
  openFeatureGuide: () => void;
};

type HelpSectionProps = {
  scrollRef: React.RefObject<ScrollView | null>;
  /** Ids still wearing a NEW badge; the guide shows the pill on their rows. */
  newFeatureIds: ReadonlySet<string>;
  /** Opening a feature in the guide counts as seeing it - clears its badge. */
  onFeatureOpened: (featureId: string) => void;
  showInfo: (info: { title: string; message: string }) => void;
};

const HelpSection = forwardRef<HelpSectionHandle, HelpSectionProps>(({
  scrollRef,
  newFeatureIds,
  onFeatureOpened,
  showInfo,
}, ref) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);
  const { replay: replayCoachmarks } = useCoachmarks();
  const { restartOnboarding } = useOnboardingGate();
  const { replayFeatureTour, openSpotlightCta } = useFeatureTour();
  const anchorHelp = useCoachmarkAnchor("profile-help-card", { scrollRef });

  const [showFeatureGuide, setShowFeatureGuide] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useImperativeHandle(
    ref,
    () => ({ openFeatureGuide: () => setShowFeatureGuide(true) }),
    []
  );

  /**
   * "Try it" inside the feature guide: close the sheet and let its dismiss
   * animation finish before following the CTA, which may present another
   * Modal (the iOS silent-present rule, same as handleRedoOnboarding).
   */
  const handleTryFeature = useCallback(
    (spotlight: FeatureSpotlight) => {
      setShowFeatureGuide(false);
      setTimeout(() => openSpotlightCta(spotlight), SHEET_DISMISS_MS);
    },
    [openSpotlightCta]
  );

  /** "Update spotlight" inside the guide: the carousel is its own Modal, so dismiss first. */
  const handleReplaySpotlight = useCallback(() => {
    setShowFeatureGuide(false);
    setTimeout(() => replayFeatureTour(), SHEET_DISMISS_MS);
  }, [replayFeatureTour]);

  /**
   * Redo onboarding, triggered from inside the guide sheet. Close the
   * sheet first and let its dismiss animation finish before flipping the
   * onboarding gate - unmounting the profile stack under a still-visible
   * Modal is the iOS silent-present failure family this codebase avoids.
   */
  const handleRedoOnboarding = useCallback(() => {
    setShowFeatureGuide(false);
    setTimeout(() => {
      void (async () => {
        try {
          // Persist first so killing the app mid-onboarding still
          // relaunches into the flow rather than half-done.
          await resetOnboardingStatus();
          // Onboarding flows into the guided tips, so redoing it resets
          // those too - finishing setup replays them across every tab.
          await replayCoachmarks();
        } catch (error) {
          if (__DEV__)
            console.error("Failed to reset onboarding flag:", error);
        }
        restartOnboarding();
      })();
    }, SHEET_DISMISS_MS);
  }, [replayCoachmarks, restartOnboarding]);

  const divider = (
    <View
      style={[styles.groupedDivider, { backgroundColor: colors.cardBorder }]}
    />
  );

  return (
    <>
      {/* ── Help (feature guide, feedback) ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          {t("profile.info.help.sectionTitle")}
        </Text>

        <View
          ref={anchorHelp}
          collapsable={false}
          style={[
            styles.groupedCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => {
              triggerHaptic("selection");
              setShowFeatureGuide(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t("profile.info.help.featureGuide.a11yLabel")}
          >
            <View style={styles.rowTextWrap}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.info.help.featureGuide.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {t("profile.info.help.featureGuide.description")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>

          {divider}

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => setShowFeedbackModal(true)}
            accessibilityRole="button"
            accessibilityLabel={t("profile.info.help.feedback.label")}
          >
            <View style={styles.rowTextWrap}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.info.help.feedback.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {t("profile.info.help.feedback.description")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showFeatureGuide ? (
        <FeatureGuideModal
          onClose={() => setShowFeatureGuide(false)}
          onTryFeature={handleTryFeature}
          onReplaySpotlight={handleReplaySpotlight}
          onRedoOnboarding={handleRedoOnboarding}
          newFeatureIds={newFeatureIds}
          onFeatureOpened={onFeatureOpened}
        />
      ) : null}

      {/* ── Feedback Modal ── */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onResult={(result) => {
          setShowFeedbackModal(false);
          showInfo(result);
        }}
      />
    </>
  );
});

HelpSection.displayName = "HelpSection";

export default HelpSection;
