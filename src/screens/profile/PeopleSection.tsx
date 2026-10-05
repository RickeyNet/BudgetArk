/**
 * BudgetArk - People Section
 * File: src/screens/profile/PeopleSection.tsx
 *
 * The People, Person Spending Report and Owed to You rows and their modals
 * - where the user maintains the list of household members spending can be
 * assigned to (BudgetEntry.personId), views who spent what, and tracks
 * money lent out (BudgetEntry.lentTo). The manage modal's
 * visibility stays in ProfileScreen because the feature spotlight deep
 * link (openSection: "people") opens it from there - same pattern as
 * BusinessSection; the report modal is purely local.
 */

import React, { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import ManagePeopleModal from "../../components/ManagePeopleModal";
import PersonReportModal from "../../components/PersonReportModal";
import LoansModal from "../../components/LoansModal";
import NewFeatureBadge from "../../components/NewFeatureBadge";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

type PeopleSectionProps = {
  newFeatureIds: ReadonlySet<string>;
  onDismissNewBadge: (featureId: string) => void;
  showManagePeople: boolean;
  onOpenManagePeople: () => void;
  onCloseManagePeople: () => void;
};

/** Imperative surface for ProfileScreen's spotlight deep link (openSection: "owedToYou"). */
export type PeopleSectionHandle = {
  openOwedToYou: () => void;
};

const PeopleSection = forwardRef<PeopleSectionHandle, PeopleSectionProps>(function PeopleSection(
  { newFeatureIds, onDismissNewBadge, showManagePeople, onOpenManagePeople, onCloseManagePeople },
  ref,
) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  const [showPersonReport, setShowPersonReport] = useState(false);
  const [showLoans, setShowLoans] = useState(false);

  // The deep link arrives through ProfileScreen's runAfterInteractions
  // effect, so presenting here is already deferred past the tab switch.
  const openOwedToYou = useCallback(() => setShowLoans(true), []);
  useImperativeHandle(ref, () => ({ openOwedToYou }), [openOwedToYou]);

  return (
    <>
      {/* ── People ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          {t("profile.connections.people.sectionTitle")}
        </Text>

        <View
          style={[
            styles.groupedCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => {
              triggerHaptic("selection");
              onDismissNewBadge("people-assignment");
              onOpenManagePeople();
            }}
            accessibilityRole="button"
            accessibilityLabel={t("profile.connections.people.manageA11y")}
          >
            <View style={styles.rowTextWrap}>
              <View style={styles.rowTitleWithBadge}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  {t("profile.connections.people.people")}
                </Text>
                {newFeatureIds.has("people-assignment") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {t("profile.connections.people.peopleSubtext")}
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
              setShowPersonReport(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t("profile.connections.people.reportA11y")}
          >
            <View style={styles.rowTextWrap}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.connections.people.report")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {t("profile.connections.people.reportSubtext")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => {
              triggerHaptic("selection");
              onDismissNewBadge("owed-to-you");
              setShowLoans(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t("profile.connections.people.owedA11y")}
          >
            <View style={styles.rowTextWrap}>
              <View style={styles.rowTitleWithBadge}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  {t("profile.connections.people.owed")}
                </Text>
                {newFeatureIds.has("owed-to-you") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {t("profile.connections.people.owedSubtext")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ManagePeopleModal
        visible={showManagePeople}
        onClose={onCloseManagePeople}
      />
      <PersonReportModal
        visible={showPersonReport}
        onClose={() => setShowPersonReport(false)}
      />
      <LoansModal visible={showLoans} onClose={() => setShowLoans(false)} />
    </>
  );
});

export default PeopleSection;
