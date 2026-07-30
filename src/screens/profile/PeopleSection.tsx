/**
 * BudgetArk - People Section
 * File: src/screens/profile/PeopleSection.tsx
 *
 * The People row and its manage modal - where the user maintains the list
 * of household members spending can be assigned to (BudgetEntry.personId).
 * Modal visibility is purely local (no feature-spotlight deep link targets
 * it, unlike BusinessSection).
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import ManagePeopleModal from "../../components/ManagePeopleModal";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

const PeopleSection: React.FC = () => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens);

  const [showManagePeople, setShowManagePeople] = useState(false);

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
              setShowManagePeople(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Manage people"
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                People 👤
              </Text>
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
        onClose={() => setShowManagePeople(false)}
      />
    </>
  );
};

export default PeopleSection;
