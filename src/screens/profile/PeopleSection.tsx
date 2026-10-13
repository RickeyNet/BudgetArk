/**
 * BudgetArk - People Section
 * File: src/screens/profile/PeopleSection.tsx
 *
 * One "People" row and the three sheets behind it - the manage sheet where
 * the user maintains the household members spending can be assigned to
 * (BudgetEntry.personId), the person spending report, and Owed to You
 * (BudgetEntry.lentTo). The report and loans used to be their own Profile
 * rows; they are now shortcut rows at the top of the manage sheet, so the
 * Profile tab shows one row per subject. The manage sheet's visibility
 * stays in ProfileScreen because the feature spotlight deep link
 * (openSection: "people") opens it from there - same pattern as
 * BusinessSection; the report and loans sheets are local.
 *
 * A shortcut closes the manage sheet first and opens its target after the
 * dismiss animation - presenting a second Modal over a still-visible one is
 * the iOS silent-present failure family this codebase avoids.
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

/** Sheet dismiss animation allowance before presenting the next Modal. */
const SHEET_DISMISS_MS = 350;

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

  const openReportFromSheet = useCallback(() => {
    onCloseManagePeople();
    setTimeout(() => setShowPersonReport(true), SHEET_DISMISS_MS);
  }, [onCloseManagePeople]);

  const openOwedFromSheet = useCallback(() => {
    onDismissNewBadge("owed-to-you");
    onCloseManagePeople();
    setTimeout(() => setShowLoans(true), SHEET_DISMISS_MS);
  }, [onCloseManagePeople, onDismissNewBadge]);

  const isNew = newFeatureIds.has("people-assignment") || newFeatureIds.has("owed-to-you");

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
                {isNew && <NewFeatureBadge />}
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
        </View>
      </View>

      <ManagePeopleModal
        visible={showManagePeople}
        onClose={onCloseManagePeople}
        onOpenReport={openReportFromSheet}
        onOpenOwed={openOwedFromSheet}
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
