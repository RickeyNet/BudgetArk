/**
 * BudgetArk - Support Section
 * File: src/screens/profile/SupportSection.tsx
 *
 * The Send Feedback + Tip Jar rows and their modals: a header-less card
 * right under the name card. During the Profile-tab merges both rows were
 * briefly folded into the HELP card; the user wants them back at the top of
 * the tab, so this card deliberately stays where it is - don't move it into
 * Help again. Feedback modal state is local; Tip Jar visibility stays in
 * ProfileScreen because the feature spotlight deep link
 * (openSection: "tipJar") has to open it from there.
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import FeedbackModal from "../../components/FeedbackModal";
import TipJarModal from "../../components/TipJarModal";
import NewFeatureBadge from "../../components/NewFeatureBadge";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

type SupportSectionProps = {
  newFeatureIds: ReadonlySet<string>;
  onDismissNewBadge: (featureId: string) => void;
  showTipJar: boolean;
  onOpenTipJar: () => void;
  onCloseTipJar: () => void;
  showInfo: (info: { title: string; message: string }) => void;
};

const SupportSection: React.FC<SupportSectionProps> = ({
  newFeatureIds,
  onDismissNewBadge,
  showTipJar,
  onOpenTipJar,
  onCloseTipJar,
  showInfo,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  return (
    <>
      {/* ── Send Feedback + Tip Jar ── */}
      <View style={styles.settingsSection}>
        <View
          style={[
            styles.groupedCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => setShowFeedbackModal(true)}
            accessibilityRole="button"
            accessibilityLabel={t("profile.info.support.feedback.label")}
          >
            <View style={styles.rowTextWrap}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.info.support.feedback.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {t("profile.info.support.feedback.description")}
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
              onDismissNewBadge("tip-jar");
              onOpenTipJar();
            }}
            accessibilityRole="button"
            accessibilityLabel={t("profile.info.support.tipJar.label")}
          >
            <View style={styles.rowTextWrap}>
              <View style={styles.rowTitleWithBadge}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  {t("profile.info.support.tipJar.label")}
                </Text>
                {newFeatureIds.has("tip-jar") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {t("profile.info.support.tipJar.description")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Feedback Modal ── */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onResult={(result) => {
          setShowFeedbackModal(false);
          showInfo(result);
        }}
      />

      {/* ── Tip Jar Modal ── */}
      {/* Mounted on demand: useIAP inside opens the billing connection on
          mount and closes it on unmount. */}
      {showTipJar ? <TipJarModal onClose={onCloseTipJar} /> : null}
    </>
  );
};

export default SupportSection;
