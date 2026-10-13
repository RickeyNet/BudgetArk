/**
 * BudgetArk - Businesses Row
 * File: src/screens/profile/BusinessSection.tsx
 *
 * One "Businesses" row (inside the ORGANIZE card, see OrganizeSection) and
 * the two sheets behind it: the manage sheet and the Business Expense
 * Report, which used to be its own Profile row and is now a shortcut row
 * at the top of the manage sheet. The manage sheet's visibility stays in
 * ProfileScreen because the feature spotlight deep link
 * (openSection: "businesses") opens it from there; the report sheet is
 * local. The shortcut closes the manage sheet first and opens the report
 * after the dismiss animation (never two Modals at once - the iOS
 * silent-present rule).
 */

import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import ManageBusinessesModal from "../../components/ManageBusinessesModal";
import BusinessReportModal from "../../components/BusinessReportModal";
import NewFeatureBadge from "../../components/NewFeatureBadge";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

/** Sheet dismiss animation allowance before presenting the next Modal. */
const SHEET_DISMISS_MS = 350;

type BusinessSectionProps = {
  newFeatureIds: ReadonlySet<string>;
  onDismissNewBadge: (featureId: string) => void;
  showManageBusinesses: boolean;
  onOpenManageBusinesses: () => void;
  onCloseManageBusinesses: () => void;
};

const BusinessSection: React.FC<BusinessSectionProps> = ({
  newFeatureIds,
  onDismissNewBadge,
  showManageBusinesses,
  onOpenManageBusinesses,
  onCloseManageBusinesses,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  const [showBusinessReport, setShowBusinessReport] = useState(false);

  const openReportFromSheet = useCallback(() => {
    onCloseManageBusinesses();
    setTimeout(() => setShowBusinessReport(true), SHEET_DISMISS_MS);
  }, [onCloseManageBusinesses]);

  return (
    <>
      <TouchableOpacity
        style={styles.groupedRow}
        onPress={() => {
          triggerHaptic("selection");
          onDismissNewBadge("business-expenses");
          onOpenManageBusinesses();
        }}
        accessibilityRole="button"
        accessibilityLabel={t("profile.info.business.businesses.a11yLabel")}
      >
        <View style={styles.rowTextWrap}>
          <View style={styles.rowTitleWithBadge}>
            <Text style={[styles.settingsRowText, { color: colors.text }]}>
              {t("profile.info.business.businesses.label")}
            </Text>
            {newFeatureIds.has("business-expenses") && <NewFeatureBadge />}
          </View>
          <Text style={[styles.settingsRowSubtext, { color: colors.textDim }]}>
            {t("profile.info.business.businesses.description")}
          </Text>
        </View>
        <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
          →
        </Text>
      </TouchableOpacity>

      <ManageBusinessesModal
        visible={showManageBusinesses}
        onClose={onCloseManageBusinesses}
        onOpenReport={openReportFromSheet}
      />
      <BusinessReportModal
        visible={showBusinessReport}
        onClose={() => setShowBusinessReport(false)}
      />
    </>
  );
};

export default BusinessSection;
