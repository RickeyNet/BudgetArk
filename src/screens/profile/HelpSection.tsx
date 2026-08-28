/**
 * BudgetArk - Help Section
 * File: src/screens/profile/HelpSection.tsx
 *
 * The HELP card: an "Onboarding" row opening the searchable onboarding
 * guide (OnboardingGuideModal) which also hosts Redo onboarding, and a
 * "Feature tour" row replaying the feature-debut carousel on demand. This
 * section owns the redo sequence - close the sheet, then reset the
 * onboarding flag + coachmark state and flip the app gate - and registers
 * the help-card coachmark anchor.
 */

import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useCoachmarks } from "../../onboarding/CoachmarksProvider";
import { useCoachmarkAnchor } from "../../onboarding/CoachmarkAnchorContext";
import { useOnboardingGate } from "../../onboarding/OnboardingGateContext";
import { useFeatureTour } from "../../components/FeatureTourContext";
import { resetOnboardingStatus } from "../../storage/userStorage";
import OnboardingGuideModal from "../../components/OnboardingGuideModal";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

type HelpSectionProps = {
  scrollRef: React.RefObject<ScrollView | null>;
};

const HelpSection: React.FC<HelpSectionProps> = ({ scrollRef }) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens);
  const { replay: replayCoachmarks } = useCoachmarks();
  const { restartOnboarding } = useOnboardingGate();
  const { replayFeatureTour } = useFeatureTour();
  const anchorHelp = useCoachmarkAnchor("profile-help-card", { scrollRef });

  const [showGuide, setShowGuide] = useState(false);

  /**
   * Redo onboarding, triggered from inside the guide sheet. Close the
   * sheet first and let its dismiss animation finish before flipping the
   * onboarding gate - unmounting the profile stack under a still-visible
   * Modal is the iOS silent-present failure family this codebase avoids.
   */
  const handleRedoOnboarding = useCallback(() => {
    setShowGuide(false);
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
    }, 350);
  }, [replayCoachmarks, restartOnboarding]);

  return (
    <>
      {/* ── Help (onboarding guide) ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          HELP
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
              setShowGuide(true);
            }}
          >
            <View style={styles.rowTextWrap}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                Onboarding
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                Searchable guide to everything, or redo the first-launch setup
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => {
              triggerHaptic("selection");
              replayFeatureTour();
            }}
            accessibilityLabel="Replay the feature tour"
          >
            <View style={styles.rowTextWrap}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                Feature tour
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                Rewatch the what's-new tour of recent features
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showGuide ? (
        <OnboardingGuideModal
          onClose={() => setShowGuide(false)}
          onRedoOnboarding={handleRedoOnboarding}
        />
      ) : null}
    </>
  );
};

export default HelpSection;
