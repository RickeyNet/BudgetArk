/**
 * BudgetArk - Categories Section
 * File: src/screens/profile/CategoriesSection.tsx
 *
 * The Custom Categories row and its manage modal. Reads the category list
 * from the CustomCategories provider and owns the modal's visibility.
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import ManageCategoriesModal from "../../components/ManageCategoriesModal";
import { useCustomCategories } from "../../categories/CustomCategoriesProvider";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

const CategoriesSection: React.FC = () => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens);

  const { customCategories } = useCustomCategories();
  /** Whether the manage-custom-categories modal is visible */
  const [showManageCategories, setShowManageCategories] = useState(false);

  return (
    <>
      {/* ── Categories ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          CATEGORIES
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
              setShowManageCategories(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Manage custom categories"
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                Custom Categories
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {customCategories.length === 0
                  ? "Add your own budget categories"
                  : `${customCategories.length} custom`}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ManageCategoriesModal
        visible={showManageCategories}
        onClose={() => setShowManageCategories(false)}
      />
    </>
  );
};

export default CategoriesSection;
