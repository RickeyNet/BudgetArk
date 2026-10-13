/**
 * BudgetArk - Categories Row
 * File: src/screens/profile/CategoriesSection.tsx
 *
 * The Custom Categories row and its manage modal, rendered inside the
 * ORGANIZE card (OrganizeSection) alongside People and Businesses - the
 * three rows all answer "how do I tag entries?", so they share one card
 * instead of owning a section header each. Reads the category list from
 * the CustomCategories provider and owns the modal's visibility.
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import ManageCategoriesModal from "../../components/ManageCategoriesModal";
import { useCustomCategories } from "../../categories/CustomCategoriesProvider";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

const CategoriesSection: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  const { customCategories } = useCustomCategories();
  /** Whether the manage-custom-categories modal is visible */
  const [showManageCategories, setShowManageCategories] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.groupedRow}
        onPress={() => {
          triggerHaptic("selection");
          setShowManageCategories(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={t("profile.info.categories.custom.a11yLabel")}
      >
        <View style={styles.rowTextWrap}>
          <Text style={[styles.settingsRowText, { color: colors.text }]}>
            {t("profile.info.categories.custom.label")}
          </Text>
          <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
            {customCategories.length === 0
              ? t("profile.info.categories.custom.empty")
              : t("profile.info.categories.custom.count", {
                  count: customCategories.length,
                })}
          </Text>
        </View>
        <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
          →
        </Text>
      </TouchableOpacity>

      <ManageCategoriesModal
        visible={showManageCategories}
        onClose={() => setShowManageCategories(false)}
      />
    </>
  );
};

export default CategoriesSection;
