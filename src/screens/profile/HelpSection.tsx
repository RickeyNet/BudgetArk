/**
 * BudgetArk - Help Section
 * File: src/screens/profile/HelpSection.tsx
 *
 * The HELP card (per-tab how-to reference + replay walkthrough) and the
 * How-To modal. Owns the modal and accordion state, drives the coachmark
 * replay/guided-tour, and registers the help-card coachmark anchor.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { useCoachmarks } from "../../onboarding/CoachmarksProvider";
import { useCoachmarkAnchor } from "../../onboarding/CoachmarkAnchorContext";
import { COACHMARK_TAB_IDS, COACHMARKS } from "../../data/coachmarkContent";
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
  const { replay: replayCoachmarks, startGuidedTour } = useCoachmarks();
  const anchorHelp = useCoachmarkAnchor("profile-help-card", { scrollRef });

  /** How-To reference modal */
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [expandedHowTo, setExpandedHowTo] = useState<string | null>(null);

  return (
    <>
      {/* ── Help (how-to + replay walkthrough) ── */}
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
              setExpandedHowTo(null);
              setShowHowToModal(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                How to use BudgetArk
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                Per-tab quick reference
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
            onPress={async () => {
              triggerHaptic("selection");
              await replayCoachmarks();
              // Profile fires its own tour on focus; queue the rest so each
              // tab auto-navigates after "Got it" on its last step. User
              // gets a single chained walkthrough across all five tabs.
              startGuidedTour([
                "DebtTracker",
                "Budget",
                "Bridge",
                "Utilities",
              ]);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                Replay walkthrough
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                Show the first-launch tour again
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              ↺
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── How-To Reference Modal ── */}
      <Modal
        visible={showHowToModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHowToModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                maxHeight: "85%",
              },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              How to use BudgetArk
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              Tap a tab to see how it works.
            </Text>

            <ScrollView
              contentContainerStyle={styles.faqList}
              showsVerticalScrollIndicator={false}
            >
              {COACHMARK_TAB_IDS.map((tabId) => {
                const tour = COACHMARKS[tabId];
                const isExpanded = expandedHowTo === tabId;
                return (
                  <TouchableOpacity
                    key={tabId}
                    style={[
                      styles.faqItem,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    onPress={() => {
                      triggerHaptic("selection");
                      setExpandedHowTo(isExpanded ? null : tabId);
                    }}
                  >
                    <View style={styles.faqHeader}>
                      <Text style={[styles.faqQuestion, { color: colors.text }]}>
                        {tour.intro}
                      </Text>
                      <Text style={[styles.faqArrow, { color: colors.textMuted }]}>
                        {isExpanded ? "v" : ">"}
                      </Text>
                    </View>
                    {isExpanded
                      ? tour.steps.map((step, idx) => (
                          <View
                            key={step.id}
                            style={{ marginTop: idx === 0 ? 8 : 6 }}
                          >
                            <Text
                              style={[
                                styles.faqAnswer,
                                { color: colors.text, fontWeight: "700" },
                              ]}
                            >
                              {idx + 1}. {step.title}
                            </Text>
                            <Text
                              style={[
                                styles.faqAnswer,
                                { color: colors.textDim },
                              ]}
                            >
                              {step.body}
                            </Text>
                          </View>
                        ))
                      : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                gap: tokens.gapSm,
                marginTop: tokens.gapSm,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.dialogBtn,
                  {
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    flex: 1,
                  },
                ]}
                onPress={() => {
                  triggerHaptic("selection");
                  setShowHowToModal(false);
                  // Wait for the How-To Modal close animation before resetting
                  // the coachmark state. Otherwise RN tries to present the
                  // Spotlight Modal on top of the still-dismissing How-To
                  // Modal and queues/hides one of them.
                  setTimeout(() => {
                    void replayCoachmarks().then(() => {
                      startGuidedTour([
                        "DebtTracker",
                        "Budget",
                        "Bridge",
                        "Utilities",
                      ]);
                    });
                  }, 350);
                }}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Replay tour
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dialogBtn,
                  { backgroundColor: colors.accent, flex: 1 },
                ]}
                onPress={() => setShowHowToModal(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default HelpSection;
