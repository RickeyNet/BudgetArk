/**
 * BudgetArk - People Section
 * File: src/screens/profile/PeopleSection.tsx
 *
 * The People + Person Spending Report rows and their modals - where the
 * user maintains the list of household members spending can be assigned to
 * (BudgetEntry.personId) and views who spent what. The manage modal's
 * visibility stays in ProfileScreen because the feature spotlight deep
 * link (openSection: "people") opens it from there - same pattern as
 * BusinessSection; the report modal is purely local.
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import ManagePeopleModal from "../../components/ManagePeopleModal";
import PersonReportModal from "../../components/PersonReportModal";
import SettleUpModal from "../../components/SettleUpModal";
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

const PeopleSection: React.FC<PeopleSectionProps> = ({
  newFeatureIds,
  onDismissNewBadge,
  showManagePeople,
  onOpenManagePeople,
  onCloseManagePeople,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  const [showPersonReport, setShowPersonReport] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

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
              setShowSettleUp(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Open settle up"
          >
            <View style={styles.rowTextWrap}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                Settle Up
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                Who owes you what this month, and mark it paid back
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
      <SettleUpModal visible={showSettleUp} onClose={() => setShowSettleUp(false)} />
    </>
  );
};

export default PeopleSection;
