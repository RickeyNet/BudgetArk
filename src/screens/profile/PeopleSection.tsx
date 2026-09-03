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
          PEOPLE
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
            accessibilityLabel="Manage people"
          >
            <View style={styles.rowTextWrap}>
              <View style={styles.rowTitleWithBadge}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  People 👤
                </Text>
                {newFeatureIds.has("people-assignment") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                Assign spending to household members
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
            accessibilityLabel="Open person spending report"
          >
            <View style={styles.rowTextWrap}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                Person Spending Report
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                Per-person totals by year, with CSV export
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
            accessibilityLabel="Open owed to you"
          >
            <View style={styles.rowTextWrap}>
              <View style={styles.rowTitleWithBadge}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Owed to You 🤝
                </Text>
                {newFeatureIds.has("owed-to-you") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                Money you've lent out, and what's been paid back
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
