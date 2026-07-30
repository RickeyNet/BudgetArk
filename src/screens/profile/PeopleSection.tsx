/**
 * BudgetArk - People Section
 * File: src/screens/profile/PeopleSection.tsx
 *
 * The People row and its manage modal - where the user maintains the list
 * of household members spending can be assigned to (BudgetEntry.personId).
 * The manage modal's visibility stays in ProfileScreen because the feature
 * spotlight deep link (openSection: "people") opens it from there - same
 * pattern as BusinessSection.
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import ManagePeopleModal from "../../components/ManagePeopleModal";
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
  const styles = useProfileStyles(tokens);

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
            <View style={{ flex: 1 }}>
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
        </View>
      </View>

      <ManagePeopleModal
        visible={showManagePeople}
        onClose={onCloseManagePeople}
      />
    </>
  );
};

export default PeopleSection;
